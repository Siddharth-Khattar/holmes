# ABOUTME: Triage Agent implementation for initial file classification and entity extraction.
# ABOUTME: Processes files via Gemini Flash and outputs structured TriageOutput with domain scores.

import json
import logging
from collections.abc import Callable, Coroutine
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from google.adk.events import Event
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import PublishFn
from app.agents.factory import AgentFactory
from app.config import get_settings
from app.models.agent_execution import AgentExecution, AgentExecutionStatus
from app.models.file import CaseFile
from app.schemas.agent import TriageOutput
from app.services.adk_service import (
    build_agent_content,
    create_stage_runner,
    get_or_create_stage_session,
)

logger = logging.getLogger(__name__)

# Type alias for the optional SSE publish callback
PublishEventFn = Callable[[str, dict[str, object]], Coroutine[Any, Any, None] | None]


class TriageAgent:
    """Triage Agent for initial file classification and entity extraction.

    Wraps ADK LlmAgent creation with case-specific configuration.
    Each instance is intended for a single workflow execution.
    """

    def __init__(
        self,
        case_id: str,
        file_ids: list[str],
        publish_fn: PublishFn | None = None,
    ) -> None:
        self.case_id = case_id
        self.file_ids = file_ids
        self._agent = AgentFactory.create_triage_agent(
            case_id=case_id,
            file_ids=file_ids,
            publish_fn=publish_fn,
        )

    @property
    def agent(self):
        """Access the underlying ADK LlmAgent."""
        return self._agent


# ---------------------------------------------------------------------------
# Output parsing
# ---------------------------------------------------------------------------


def _extract_json_from_text(text: str) -> str | None:
    """Extract JSON from model response text, handling markdown code fences."""
    # Try to find JSON in code fences first
    if "```json" in text:
        start = text.index("```json") + len("```json")
        end = text.index("```", start)
        return text[start:end].strip()

    if "```" in text:
        start = text.index("```") + len("```")
        end = text.index("```", start)
        return text[start:end].strip()

    # Try the whole text as JSON
    text = text.strip()
    if text.startswith("{"):
        return text

    return None


def parse_triage_output(events: list[Event]) -> TriageOutput | None:
    """Parse TriageOutput from ADK events.

    Scans events in reverse to find the final agent response containing
    the structured JSON output.

    Args:
        events: List of ADK events from runner execution.

    Returns:
        Parsed TriageOutput, or None if parsing fails.
    """
    # Collect all text from the final response event(s)
    for event in reversed(events):
        if not event.is_final_response():
            continue

        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    json_str = _extract_json_from_text(part.text)
                    if json_str is None:
                        continue
                    try:
                        data = json.loads(json_str)
                        return TriageOutput.model_validate(data)
                    except (json.JSONDecodeError, ValueError) as exc:
                        logger.warning(
                            "Failed to parse triage output JSON: %s",
                            exc,
                        )
                        continue

    logger.error("No valid triage output found in agent events")
    return None


def _extract_token_usage(events: list[Event]) -> tuple[int, int]:
    """Accumulate token usage across all events.

    Returns:
        Tuple of (input_tokens, output_tokens).
    """
    input_tokens = 0
    output_tokens = 0
    for event in events:
        if event.usage_metadata:
            if event.usage_metadata.prompt_token_count:
                input_tokens += event.usage_metadata.prompt_token_count
            if event.usage_metadata.candidates_token_count:
                output_tokens += event.usage_metadata.candidates_token_count
    return input_tokens, output_tokens


def _extract_thinking_traces(events: list[Event]) -> list[dict[str, object]]:
    """Extract thinking traces from events for audit logging."""
    traces: list[dict[str, object]] = []
    for event in events:
        if not event.content or not event.content.parts:
            continue
        for part in event.content.parts:
            if part.thought and part.text:
                traces.append(
                    {
                        "agent": event.author,
                        "thought": part.text[:2000],  # Cap individual thoughts
                        "timestamp": event.timestamp,
                    }
                )
    return traces


# ---------------------------------------------------------------------------
# Content preparation
# ---------------------------------------------------------------------------


async def _prepare_triage_content(
    files: list[CaseFile],
    gcs_bucket: str,
) -> types.Content:
    """Build multimodal content for Triage Agent.

    Uses tiered file handling:
    - Small files (<=100MB): inline base64
    - Large files (>100MB): File API upload -> URI reference
    """
    return await build_agent_content(
        files=files,
        gcs_bucket=gcs_bucket,
        prompt="Analyze the following documents:",
    )


# ---------------------------------------------------------------------------
# Main execution function
# ---------------------------------------------------------------------------


async def run_triage(
    case_id: str,
    workflow_id: str,
    user_id: str,
    files: list[CaseFile],
    db_session: AsyncSession,
    publish_event: PublishEventFn | None = None,
) -> TriageOutput | None:
    """Run triage analysis on a batch of files.

    Creates a FRESH ADK session for the triage stage (stage-isolated).
    This ensures file content does not bloat downstream agents' contexts.

    Args:
        case_id: UUID string of the case.
        workflow_id: UUID string of the analysis workflow.
        user_id: UUID string of the authenticated user.
        files: List of CaseFile records to analyze.
        db_session: Database session for execution logging.
        publish_event: Optional callback for SSE events.

    Returns:
        TriageOutput with file results and groupings, or None on failure.
    """
    settings = get_settings()
    file_ids = [str(f.id) for f in files]

    # ---- Create execution record (PENDING) ----
    execution = AgentExecution(
        case_id=UUID(case_id),
        workflow_id=UUID(workflow_id),
        agent_name="triage",
        agent_type="LlmAgent",
        model_name=settings.gemini_flash_model,
        status=AgentExecutionStatus.PENDING,
        input_data={"file_ids": file_ids, "file_count": len(files)},
    )
    db_session.add(execution)
    await db_session.flush()
    execution_id = execution.id

    try:
        # ---- Mark RUNNING ----
        execution.status = AgentExecutionStatus.RUNNING
        execution.started_at = datetime.now(tz=UTC)
        await db_session.flush()

        # ---- Create agent and runner ----
        triage = TriageAgent(
            case_id=case_id,
            file_ids=file_ids,
            publish_fn=publish_event,
        )
        runner = create_stage_runner(triage.agent)

        # ---- Create stage-isolated session ----
        session = await get_or_create_stage_session(
            user_id=user_id,
            case_id=UUID(case_id),
            workflow_id=UUID(workflow_id),
            stage="triage",
        )

        # ---- Build multimodal content ----
        content = await _prepare_triage_content(files, settings.gcs_bucket or "")

        # ---- Run agent ----
        all_events: list[Event] = []
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session.id,
            new_message=content,
        ):
            all_events.append(event)

        # ---- Parse output ----
        triage_output = parse_triage_output(all_events)

        # ---- Extract metadata ----
        input_tokens, output_tokens = _extract_token_usage(all_events)
        thinking_traces = _extract_thinking_traces(all_events)

        # ---- Update execution record ----
        execution.status = (
            AgentExecutionStatus.COMPLETED
            if triage_output
            else AgentExecutionStatus.FAILED
        )
        execution.output_data = (
            triage_output.model_dump(mode="json") if triage_output else None
        )
        execution.input_tokens = input_tokens or None
        execution.output_tokens = output_tokens or None
        execution.thinking_traces = thinking_traces or None
        execution.completed_at = datetime.now(tz=UTC)

        if not triage_output:
            execution.error_message = "Failed to parse structured output from model"

        await db_session.flush()

        duration_s = (
            (execution.completed_at - execution.started_at).total_seconds()
            if execution.completed_at and execution.started_at
            else None
        )
        logger.info(
            "Triage completed case=%s workflow=%s execution=%s status=%s "
            "duration_s=%.2f model=%s input_tokens=%s output_tokens=%s files=%d",
            case_id,
            workflow_id,
            execution_id,
            execution.status.value,
            duration_s or 0.0,
            settings.gemini_flash_model,
            input_tokens or 0,
            output_tokens or 0,
            len(files),
        )
        return triage_output

    except Exception as exc:
        logger.exception(
            "Triage failed for case=%s workflow=%s: %s",
            case_id,
            workflow_id,
            exc,
        )
        execution.status = AgentExecutionStatus.FAILED
        execution.error_message = str(exc)[:2000]
        execution.completed_at = datetime.now(tz=UTC)
        await db_session.flush()
        return None
