# ABOUTME: Legal Strategy Agent for case approach planning and investigation priorities.
# ABOUTME: Runs after parallel domain agents, consuming their findings as text summaries.

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
from app.schemas.agent import StrategyOutput
from app.services.adk_service import (
    build_domain_agent_content,
    create_stage_runner,
    get_or_create_stage_session,
)

logger = logging.getLogger(__name__)

# Maximum retries when LLM output fails to parse (1 retry = 2 total attempts)
MAX_PARSE_RETRIES = 1


class StrategyAgent:
    """Legal Strategy Agent for case approach planning and investigation priorities.

    Wraps ADK LlmAgent creation with case-specific configuration.
    Each instance is intended for a single workflow execution.

    Unlike other domain agents (Financial, Legal, Evidence) which analyze
    raw evidence files in parallel, the Strategy agent runs SEQUENTIALLY
    after them and consumes their text summaries alongside its own files.
    """

    def __init__(
        self,
        case_id: str,
        model: str = MODEL_PRO,
        publish_fn: PublishFn | None = None,
    ) -> None:
        self.case_id = case_id
        self._agent = AgentFactory.create_strategy_agent(
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


def parse_strategy_output(events: list[Event]) -> StrategyOutput | None:
    """Parse StrategyOutput from ADK events.

    Scans events in reverse to find the final agent response containing
    the structured JSON output.

    Args:
        events: List of ADK events from runner execution.

    Returns:
        Parsed StrategyOutput, or None if parsing fails.
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
                        return StrategyOutput.model_validate(data)
                    except (json.JSONDecodeError, ValueError) as exc:
                        logger.warning(
                            "Failed to parse strategy output JSON: %s",
                            exc,
                        )
                        continue

    logger.error("No valid strategy output found in agent events")
    return None


# ---------------------------------------------------------------------------
# Content preparation
# ---------------------------------------------------------------------------


async def _prepare_strategy_content(
    files: list[CaseFile],
    gcs_bucket: str,
    domain_summaries: str,
    hypotheses_text: str,
    context_injection: str | None = None,
) -> types.Content:
    """Build content for Strategy Agent.

    Unlike other domain agents, Strategy receives:
    1. Its own strategy-relevant files (playbooks, internal docs)
    2. TEXT summaries from Financial, Legal, Evidence agents
    3. Existing hypotheses to evaluate
    4. Optional case-specific context injection

    Per RESEARCH.md Pitfall 4: Strategy receives text summaries of
    domain findings, NOT the raw multimodal content, to avoid
    context window bloat.

    Args:
        files: Strategy-relevant case files (may be empty).
        gcs_bucket: GCS bucket name for file downloads.
        domain_summaries: Text summaries from other domain agents.
        hypotheses_text: Formatted hypotheses for evaluation.
        context_injection: Case-specific framing from orchestrator.

    Returns:
        Content object with prompt (and file parts when files exist).
    """
    prompt_parts: list[str] = []

    if context_injection:
        prompt_parts.append(f"--- CASE CONTEXT ---\n{context_injection}\n---\n")

    prompt_parts.append("Analyze the following for legal strategy insights.")

    if domain_summaries:
        prompt_parts.append(
            "\n\n--- DOMAIN AGENT FINDINGS SUMMARIES ---\n" + domain_summaries
        )

    if hypotheses_text:
        prompt_parts.append(
            "\n\n--- EXISTING HYPOTHESES TO EVALUATE ---\n" + hypotheses_text
        )

    prompt = "\n".join(prompt_parts)

    if files:
        # Strategy has its own files -- use build_domain_agent_content
        return await build_domain_agent_content(
            files=files,
            gcs_bucket=gcs_bucket,
            prompt=prompt,
        )
    else:
        # Strategy may have NO files of its own (only summaries)
        return types.Content(
            role="user",
            parts=[types.Part(text=prompt)],
        )


# ---------------------------------------------------------------------------
# Main execution function
# ---------------------------------------------------------------------------


async def run_strategy(
    case_id: str,
    workflow_id: str,
    user_id: str,
    files: list[CaseFile],
    domain_summaries: str,
    hypotheses: list[dict[str, object]],
    db_session: AsyncSession,
    publish_event: PublishFn | None = None,
    parent_execution_id: UUID | None = None,
    context_injection: str | None = None,
    stage_suffix: str = "",
) -> StrategyOutput | None:
    """Run legal strategy analysis on files and domain agent summaries.

    Creates a FRESH ADK session for the strategy stage (stage-isolated).
    Implements inline Pro-to-Flash fallback (REQ-AGENT-007h resilience).

    The Strategy agent is unique in the pipeline because it runs AFTER the
    parallel domain agents (Financial, Legal, Evidence) and consumes their
    text summaries as primary input alongside any strategy-specific files.

    Args:
        case_id: UUID string of the case.
        workflow_id: UUID string of the analysis workflow.
        user_id: UUID string of the authenticated user.
        files: Strategy-relevant files (playbooks, internal docs). May be empty.
        domain_summaries: Text summaries from build_strategy_context().
        hypotheses: Existing hypotheses for evaluation context.
        db_session: Database session for execution logging.
        publish_event: Optional callback for SSE events.
        parent_execution_id: Optional orchestrator execution ID for audit chain.
        context_injection: Case-specific framing from orchestrator.
        stage_suffix: Appended to stage name for session isolation.

    Returns:
        StrategyOutput with findings and entities, or None on failure.
    """
    # Edge case: no files AND no domain summaries -- nothing to analyze
    if not files and not domain_summaries:
        logger.info(
            "Strategy agent skipped for case=%s: no files and no domain summaries",
            case_id,
        )
        return None

    settings = get_settings()
    file_ids = [str(f.id) for f in files]

    # ---- Create execution record (PENDING) ----
    input_data: dict[str, object] = {
        "file_ids": file_ids,
        "file_count": len(files),
        "domain_summaries_length": len(domain_summaries),
        "has_own_files": len(files) > 0,
    }
    if stage_suffix:
        input_data["stage_suffix"] = stage_suffix

    execution = AgentExecution(
        case_id=UUID(case_id),
        workflow_id=UUID(workflow_id),
        agent_name="strategy",
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

        # ---- Build hypotheses text ----
        hypotheses_text = json.dumps(hypotheses, indent=2) if hypotheses else ""

        # ---- Build content (shared across retries) ----
        content = await _prepare_strategy_content(
            files,
            settings.gcs_bucket or "",
            domain_summaries,
            hypotheses_text,
            context_injection,
        )

        # ---- Attempt 1: Pro model ----
        strategy_output: StrategyOutput | None = None
        total_input_tokens = 0
        total_output_tokens = 0
        all_thinking_traces: list[dict[str, object]] = []
        fallback_used = False

        for attempt in range(1 + MAX_PARSE_RETRIES):
            agent = StrategyAgent(
                case_id=case_id,
                model=MODEL_PRO,
                publish_fn=publish_event,
            )
            runner = create_stage_runner(agent.agent)

            stage = f"strategy{stage_suffix}"
            if attempt > 0:
                stage = f"strategy{stage_suffix}_retry_{attempt}"
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

            strategy_output = parse_strategy_output(attempt_events)
            if strategy_output is not None:
                break

            if attempt < MAX_PARSE_RETRIES:
                logger.warning(
                    "Strategy parse failed on attempt %d/%d for case=%s, "
                    "retrying with fresh session...",
                    attempt + 1,
                    1 + MAX_PARSE_RETRIES,
                    case_id,
                )

        # ---- Attempt 2: Flash fallback if Pro failed ----
        if strategy_output is None:
            logger.warning(
                "Strategy Pro model failed for case=%s, falling back to Flash",
                case_id,
            )
            fallback_used = True

            for attempt in range(1 + MAX_PARSE_RETRIES):
                agent = StrategyAgent(
                    case_id=case_id,
                    model=MODEL_FLASH,
                    publish_fn=publish_event,
                )
                runner = create_stage_runner(agent.agent)

                stage = f"strategy{stage_suffix}_fallback"
                if attempt > 0:
                    stage = f"strategy{stage_suffix}_fallback_retry_{attempt}"
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

                strategy_output = parse_strategy_output(attempt_events)
                if strategy_output is not None:
                    break

                if attempt < MAX_PARSE_RETRIES:
                    logger.warning(
                        "Strategy Flash fallback parse failed on attempt %d/%d "
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
                    "agent_name": "strategy",
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
            if strategy_output
            else AgentExecutionStatus.FAILED
        )

        output_data_record: dict[str, object] | None = None
        if strategy_output:
            output_data_record = strategy_output.model_dump(mode="json")
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

        if not strategy_output:
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
            "Strategy completed case=%s workflow=%s execution=%s status=%s "
            "duration_s=%.2f model=%s fallback=%s input_tokens=%s "
            "output_tokens=%s files=%d domain_summaries_len=%d stage_suffix=%s",
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
            len(domain_summaries),
            stage_suffix,
        )
        return strategy_output

    except Exception as exc:
        logger.exception(
            "Strategy failed for case=%s workflow=%s: %s",
            case_id,
            workflow_id,
            exc,
        )
        execution.status = AgentExecutionStatus.FAILED
        execution.error_message = str(exc)[:2000]
        execution.completed_at = datetime.now(tz=UTC)
        await db_session.flush()
        return None
