# ABOUTME: Evidence domain agent for assessing authenticity, chain of custody, and corroboration.
# ABOUTME: Processes files via Gemini Pro with inline Pro-to-Flash fallback and context injection.

import asyncio
import json
import logging
from datetime import UTC, datetime
from uuid import UUID

from google.adk.events import Event
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import MODEL_FLASH, MODEL_PRO, PublishFn
from app.agents.factory import AgentFactory
from app.agents.parsing import (
    extract_json_from_text,
    extract_thinking_traces,
    extract_token_usage,
)
from app.config import get_settings
from app.models.agent_execution import AgentExecution, AgentExecutionStatus
from app.models.file import CaseFile
from app.schemas.agent import EvidenceOutput
from app.services.adk_service import (
    build_domain_agent_content,
    create_stage_runner,
    get_or_create_stage_session,
)

logger = logging.getLogger(__name__)

# Maximum retries when LLM output fails to parse (1 retry = 2 total attempts)
MAX_PARSE_RETRIES = 1


class EvidenceAgent:
    """Evidence Agent for domain-specific evidence analysis.

    Wraps ADK LlmAgent creation with case-specific configuration.
    Each instance is intended for a single workflow execution.
    """

    def __init__(
        self,
        case_id: str,
        model: str = MODEL_PRO,
        publish_fn: PublishFn | None = None,
    ) -> None:
        self.case_id = case_id
        self._agent = AgentFactory.create_evidence_agent(
            case_id=case_id,
            model=model,
            publish_fn=publish_fn,
        )

    @property
    def agent(self):
        """Access the underlying ADK LlmAgent."""
        return self._agent


# ---------------------------------------------------------------------------
# Output parsing
# ---------------------------------------------------------------------------


def parse_evidence_output(events: list[Event]) -> EvidenceOutput | None:
    """Parse EvidenceOutput from ADK events.

    Scans events in reverse to find the final agent response containing
    the structured JSON output.

    Args:
        events: List of ADK events from runner execution.

    Returns:
        Parsed EvidenceOutput, or None if parsing fails.
    """
    for event in reversed(events):
        if not event.is_final_response():
            continue

        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    json_str = extract_json_from_text(part.text)
                    if json_str is None:
                        continue
                    try:
                        data = json.loads(json_str)
                        return EvidenceOutput.model_validate(data)
                    except (json.JSONDecodeError, ValueError) as exc:
                        logger.warning(
                            "Failed to parse evidence output JSON: %s",
                            exc,
                        )
                        continue

    logger.error("No valid evidence output found in agent events")
    return None


# ---------------------------------------------------------------------------
# Content preparation
# ---------------------------------------------------------------------------


async def _prepare_evidence_content(
    files: list[CaseFile],
    gcs_bucket: str,
    hypotheses: list[dict[str, object]],
    context_injection: str | None = None,
) -> types.Content:
    """Build multimodal content for Evidence Agent.

    Uses build_domain_agent_content which forces video/audio through File API.
    Prepends context injection and hypothesis context when provided.

    Args:
        files: Case files to analyze.
        gcs_bucket: GCS bucket name for file downloads.
        hypotheses: Existing hypotheses for evaluation.
        context_injection: Case-specific framing from orchestrator.

    Returns:
        Multimodal Content object with prompt and file parts.
    """
    prompt_parts: list[str] = []
    if context_injection:
        prompt_parts.append(f"--- CASE CONTEXT ---\n{context_injection}\n---\n")
    prompt_parts.append(
        "Analyze the following documents as physical/digital evidence. "
        "Assess authenticity, chain of custody, and corroboration."
    )
    if hypotheses:
        prompt_parts.append(
            "\n\n--- EXISTING HYPOTHESES TO EVALUATE ---\n"
            + json.dumps(hypotheses, indent=2)
        )

    prompt = "\n".join(prompt_parts)

    return await build_domain_agent_content(
        files=files,
        gcs_bucket=gcs_bucket,
        prompt=prompt,
    )


# ---------------------------------------------------------------------------
# Main execution function
# ---------------------------------------------------------------------------


async def run_evidence(
    case_id: str,
    workflow_id: str,
    user_id: str,
    files: list[CaseFile],
    hypotheses: list[dict[str, object]],
    db_session: AsyncSession,
    publish_event: PublishFn | None = None,
    parent_execution_id: UUID | None = None,
    context_injection: str | None = None,
    stage_suffix: str = "",
) -> EvidenceOutput | None:
    """Run evidence analysis on a set of files.

    Creates a FRESH ADK session for the evidence stage (stage-isolated).
    Implements inline Pro-to-Flash fallback (REQ-AGENT-007h resilience).

    Args:
        case_id: UUID string of the case.
        workflow_id: UUID string of the analysis workflow.
        user_id: UUID string of the authenticated user.
        files: List of CaseFile records to analyze.
        hypotheses: Existing hypotheses for evaluation context.
        db_session: Database session for execution logging.
        publish_event: Optional callback for SSE events.
        parent_execution_id: Optional orchestrator execution ID for audit chain.
        context_injection: Case-specific framing from orchestrator.
        stage_suffix: Appended to stage name for concurrent instance isolation.

    Returns:
        EvidenceOutput with findings and entities, or None on failure.
    """
    settings = get_settings()
    file_ids = [str(f.id) for f in files]

    # ---- Create execution record (PENDING) ----
    input_data: dict[str, object] = {
        "file_ids": file_ids,
        "file_count": len(files),
    }
    if stage_suffix:
        input_data["stage_suffix"] = stage_suffix

    execution = AgentExecution(
        case_id=UUID(case_id),
        workflow_id=UUID(workflow_id),
        agent_name="evidence",
        agent_type="LlmAgent",
        model_name=settings.gemini_pro_model,
        status=AgentExecutionStatus.PENDING,
        input_data=input_data,
        parent_execution_id=parent_execution_id,
    )
    db_session.add(execution)
    await db_session.flush()
    execution_id = execution.id

    try:
        # ---- Mark RUNNING ----
        execution.status = AgentExecutionStatus.RUNNING
        execution.started_at = datetime.now(tz=UTC)
        await db_session.flush()

        # ---- Build multimodal content (shared across retries) ----
        content = await _prepare_evidence_content(
            files, settings.gcs_bucket or "", hypotheses, context_injection
        )

        # ---- Attempt 1: Pro model ----
        evidence_output: EvidenceOutput | None = None
        total_input_tokens = 0
        total_output_tokens = 0
        all_thinking_traces: list[dict[str, object]] = []
        fallback_used = False

        for attempt in range(1 + MAX_PARSE_RETRIES):
            agent = EvidenceAgent(
                case_id=case_id,
                model=MODEL_PRO,
                publish_fn=publish_event,
            )
            runner = create_stage_runner(agent.agent)

            stage = f"evidence{stage_suffix}"
            if attempt > 0:
                stage = f"evidence{stage_suffix}_retry_{attempt}"
            session = await get_or_create_stage_session(
                user_id=user_id,
                case_id=UUID(case_id),
                workflow_id=UUID(workflow_id),
                stage=stage,
            )

            attempt_events: list[Event] = []
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session.id,
                new_message=content,
            ):
                attempt_events.append(event)

            attempt_in, attempt_out = extract_token_usage(attempt_events)
            total_input_tokens += attempt_in
            total_output_tokens += attempt_out
            all_thinking_traces.extend(extract_thinking_traces(attempt_events))

            evidence_output = parse_evidence_output(attempt_events)
            if evidence_output is not None:
                break

            if attempt < MAX_PARSE_RETRIES:
                logger.warning(
                    "Evidence parse failed on attempt %d/%d for case=%s, "
                    "retrying with fresh session...",
                    attempt + 1,
                    1 + MAX_PARSE_RETRIES,
                    case_id,
                )

        # ---- Attempt 2: Flash fallback if Pro failed ----
        if evidence_output is None:
            logger.warning(
                "Evidence Pro model failed for case=%s, falling back to Flash",
                case_id,
            )
            fallback_used = True

            for attempt in range(1 + MAX_PARSE_RETRIES):
                agent = EvidenceAgent(
                    case_id=case_id,
                    model=MODEL_FLASH,
                    publish_fn=publish_event,
                )
                runner = create_stage_runner(agent.agent)

                stage = f"evidence{stage_suffix}_fallback"
                if attempt > 0:
                    stage = f"evidence{stage_suffix}_fallback_retry_{attempt}"
                session = await get_or_create_stage_session(
                    user_id=user_id,
                    case_id=UUID(case_id),
                    workflow_id=UUID(workflow_id),
                    stage=stage,
                )

                attempt_events = []
                async for event in runner.run_async(
                    user_id=user_id,
                    session_id=session.id,
                    new_message=content,
                ):
                    attempt_events.append(event)

                attempt_in, attempt_out = extract_token_usage(attempt_events)
                total_input_tokens += attempt_in
                total_output_tokens += attempt_out
                all_thinking_traces.extend(extract_thinking_traces(attempt_events))

                evidence_output = parse_evidence_output(attempt_events)
                if evidence_output is not None:
                    break

                if attempt < MAX_PARSE_RETRIES:
                    logger.warning(
                        "Evidence Flash fallback parse failed on attempt %d/%d "
                        "for case=%s, retrying...",
                        attempt + 1,
                        1 + MAX_PARSE_RETRIES,
                        case_id,
                    )

        # ---- Emit fallback warning SSE event ----
        if publish_event and fallback_used:
            _fire_fallback = publish_event(
                "AGENT_FALLBACK",
                {
                    "case_id": case_id,
                    "agent_name": "evidence",
                    "fallback_model": MODEL_FLASH,
                },
            )
            if _fire_fallback is not None:
                asyncio.ensure_future(_fire_fallback)

        # ---- Alias accumulated metadata ----
        input_tokens = total_input_tokens
        output_tokens = total_output_tokens
        thinking_traces = all_thinking_traces

        # ---- Update execution record ----
        execution.status = (
            AgentExecutionStatus.COMPLETED
            if evidence_output
            else AgentExecutionStatus.FAILED
        )

        output_data_record: dict[str, object] | None = None
        if evidence_output:
            output_data_record = evidence_output.model_dump(mode="json")
            if fallback_used and output_data_record is not None:
                output_data_record["_metadata"] = {
                    "fallback_used": True,
                    "fallback_model": MODEL_FLASH,
                }
        execution.output_data = output_data_record

        execution.input_tokens = input_tokens or None
        execution.output_tokens = output_tokens or None
        execution.thinking_traces = thinking_traces or None
        execution.completed_at = datetime.now(tz=UTC)

        if not evidence_output:
            execution.error_message = "Failed to parse structured output from model"

        if fallback_used:
            execution.model_name = MODEL_FLASH

        await db_session.flush()

        duration_s = (
            (execution.completed_at - execution.started_at).total_seconds()
            if execution.completed_at and execution.started_at
            else None
        )
        logger.info(
            "Evidence completed case=%s workflow=%s execution=%s status=%s "
            "duration_s=%.2f model=%s fallback=%s input_tokens=%s "
            "output_tokens=%s files=%d stage_suffix=%s",
            case_id,
            workflow_id,
            execution_id,
            execution.status.value,
            duration_s or 0.0,
            execution.model_name,
            fallback_used,
            input_tokens or 0,
            output_tokens or 0,
            len(files),
            stage_suffix,
        )
        return evidence_output

    except Exception as exc:
        logger.exception(
            "Evidence failed for case=%s workflow=%s: %s",
            case_id,
            workflow_id,
            exc,
        )
        execution.status = AgentExecutionStatus.FAILED
        execution.error_message = str(exc)[:2000]
        execution.completed_at = datetime.now(tz=UTC)
        await db_session.flush()
        return None
