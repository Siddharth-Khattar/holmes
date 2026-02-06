# ABOUTME: Agent execution API endpoints for starting and tracking analysis workflows.
# ABOUTME: Provides POST to start analysis, GET for status, and background task orchestration.

import logging
import time
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import CurrentUser
from app.config import get_settings
from app.database import get_db
from app.models import Case, CaseFile
from app.models.agent_execution import AgentExecution, AgentExecutionStatus
from app.models.file import FileStatus
from app.schemas.agent import OrchestratorOutput, TriageOutput
from app.schemas.common import ErrorResponse
from app.services.agent_events import (
    emit_agent_complete,
    emit_agent_error,
    emit_agent_started,
    emit_processing_complete,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["agents"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class AnalysisStartResponse(BaseModel):
    """Response returned when an analysis workflow is started."""

    workflow_id: UUID = Field(..., description="Unique ID for tracking this workflow")
    case_id: UUID = Field(..., description="ID of the case being analyzed")
    files_queued: int = Field(..., description="Number of files queued for analysis")
    message: str = Field(..., description="Human-readable status message")


class AnalysisStatusResponse(BaseModel):
    """Current status of an analysis workflow."""

    workflow_id: UUID = Field(..., description="Workflow tracking ID")
    case_id: UUID = Field(..., description="ID of the case")
    status: Literal[
        "pending", "triage", "orchestrating", "domain_analysis", "complete", "error"
    ] = Field(..., description="Current pipeline stage")
    triage_result: TriageOutput | None = Field(
        default=None, description="Triage output once complete"
    )
    orchestrator_result: OrchestratorOutput | None = Field(
        default=None, description="Orchestrator output once complete"
    )
    started_at: datetime = Field(..., description="When the workflow started")
    completed_at: datetime | None = Field(
        default=None, description="When the workflow completed"
    )
    error: str | None = Field(default=None, description="Error message if failed")
    domain_results_summary: dict[str, list[dict[str, object]]] | None = Field(
        default=None,
        description=(
            "Summary of domain agent findings per agent type. "
            "Each agent type maps to a list of execution summaries (one per file group). "
            "Each summary contains: group_label, finding_count, status."
        ),
    )


# ---------------------------------------------------------------------------
# Helper: get case with ownership check
# ---------------------------------------------------------------------------


async def _get_user_case(
    db: AsyncSession,
    case_id: UUID,
    user_id: str,
) -> Case | None:
    """Fetch a case ensuring ownership and not deleted."""
    result = await db.execute(
        select(Case).where(
            Case.id == case_id,
            Case.user_id == user_id,
            Case.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Metadata helpers
# ---------------------------------------------------------------------------


def _build_execution_metadata(
    execution: AgentExecution,
    model_name: str,
) -> dict[str, object]:
    """Build enriched metadata dict from an AgentExecution record.

    Includes token counts, timing, model identification, and thinking traces
    for inclusion in agent-complete SSE events.

    Args:
        execution: The completed AgentExecution database record.
        model_name: Gemini model ID used for this agent.

    Returns:
        Dict with inputTokens, outputTokens, durationMs, startedAt,
        completedAt, model, and thinkingTraces.
    """
    duration_ms: int | None = None
    if execution.started_at and execution.completed_at:
        delta = execution.completed_at - execution.started_at
        duration_ms = int(delta.total_seconds() * 1000)

    # Join thinking traces into a single string for the frontend sidebar
    thinking_text = ""
    if execution.thinking_traces:
        thinking_text = "\n".join(
            trace.get("thought", "") if isinstance(trace, dict) else str(trace)
            for trace in execution.thinking_traces
        )

    return {
        "inputTokens": execution.input_tokens or 0,
        "outputTokens": execution.output_tokens or 0,
        "durationMs": duration_ms or 0,
        "startedAt": execution.started_at.isoformat() if execution.started_at else None,
        "completedAt": (
            execution.completed_at.isoformat() if execution.completed_at else None
        ),
        "model": model_name,
        "thinkingTraces": thinking_text,
    }


# ---------------------------------------------------------------------------
# Background analysis task
# ---------------------------------------------------------------------------


async def run_analysis_workflow(
    case_id: str,
    workflow_id: str,
    user_id: str,
    file_ids: list[str],
) -> None:
    """Background task that orchestrates the stage-isolated analysis pipeline.

    Each stage gets a FRESH ADK session to prevent context window bloat
    from multimodal file content. Inter-stage data flows via database.

    Steps:
    1. Update file statuses to QUEUED
    2. Stage 1: Run Triage Agent (fresh session, multimodal files)
    3. Stage 2: Run Orchestrator Agent (fresh session, text-only input)
    4. Stage 3: Run Domain Agents (file-group-based parallel fresh sessions)
    5. Stage 4: Run Strategy Agent (sequential, receives domain summaries)
    6. Stage 5: HITL for low-confidence findings
    7. Update file statuses to ANALYZED
    8. Emit processing-complete event

    SSE events emitted at each stage transition:
    - agent-started: When an agent within a stage starts
    - agent-complete: When an agent finishes
    - agent-error: When an agent encounters an error
    - processing-complete: When entire pipeline is done
    """
    # Import here to avoid circular dependency (agents -> services -> agents)
    from app.agents.base import create_sse_publish_fn
    from app.agents.domain_runner import (
        build_strategy_context,
        compute_agent_tasks,
        run_domain_agents_parallel,
    )
    from app.agents.orchestrator import run_orchestrator
    from app.agents.strategy import run_strategy
    from app.agents.triage import run_triage
    from app.database import _get_sessionmaker
    from app.services.confirmation import (
        BatchConfirmationItem,
        request_batch_confirmation,
        request_confirmation,
    )

    settings = get_settings()
    session_factory = _get_sessionmaker()
    pipeline_start = time.monotonic()

    # Create a bound SSE publish function for real-time THINKING_UPDATE events
    publish_fn = create_sse_publish_fn(case_id)

    async with session_factory() as db:
        try:
            # ---- Step 1: Update file statuses to QUEUED ----
            await db.execute(
                update(CaseFile)
                .where(CaseFile.id.in_([UUID(fid) for fid in file_ids]))
                .values(status=FileStatus.QUEUED)
            )
            await db.commit()

            # ---- Step 2: Load files for triage ----
            result = await db.execute(
                select(CaseFile).where(CaseFile.id.in_([UUID(fid) for fid in file_ids]))
            )
            files = list(result.scalars().all())

            if not files:
                logger.error(
                    "No files found for workflow=%s case=%s",
                    workflow_id,
                    case_id,
                )
                return

            # Update files to PROCESSING
            await db.execute(
                update(CaseFile)
                .where(CaseFile.id.in_([UUID(fid) for fid in file_ids]))
                .values(status=FileStatus.PROCESSING)
            )
            await db.commit()

            # ---- Stage 1: Triage ----
            logger.info(
                "Pipeline starting stage=triage case=%s workflow=%s files=%d",
                case_id,
                workflow_id,
                len(files),
            )
            triage_start = time.monotonic()
            triage_task_id = str(uuid4())

            # Emit started event for first file (representing the batch)
            first_file = files[0]
            await emit_agent_started(
                case_id=case_id,
                agent_type="triage",
                task_id=triage_task_id,
                file_id=str(first_file.id),
                file_name=first_file.original_filename,
            )

            triage_output = await run_triage(
                case_id=case_id,
                workflow_id=workflow_id,
                user_id=user_id,
                files=files,
                db_session=db,
                publish_event=publish_fn,
            )

            if triage_output is None:
                await emit_agent_error(
                    case_id=case_id,
                    agent_type="triage",
                    task_id=triage_task_id,
                    error="Triage failed to produce structured output",
                )
                # Update file statuses to ERROR
                await db.execute(
                    update(CaseFile)
                    .where(CaseFile.id.in_([UUID(fid) for fid in file_ids]))
                    .values(status=FileStatus.ERROR)
                )
                await db.commit()
                return

            # Query triage execution record for metadata and parent chain
            triage_exec_result = await db.execute(
                select(AgentExecution)
                .where(
                    AgentExecution.workflow_id == UUID(workflow_id),
                    AgentExecution.agent_name == "triage",
                )
                .order_by(AgentExecution.created_at.desc())
                .limit(1)
            )
            triage_execution = triage_exec_result.scalar_one_or_none()

            # Build enriched metadata for triage completion event
            triage_metadata = (
                _build_execution_metadata(triage_execution, settings.gemini_flash_model)
                if triage_execution
                else {}
            )

            await emit_agent_complete(
                case_id=case_id,
                agent_type="triage",
                task_id=triage_task_id,
                result={
                    "taskId": triage_task_id,
                    "agentType": "triage",
                    "outputs": [
                        {
                            "type": "triage-results",
                            "data": {
                                "fileCount": len(triage_output.file_results),
                                "groupings": len(triage_output.suggested_groupings),
                            },
                        }
                    ],
                    "metadata": triage_metadata,
                },
            )

            # ---- Stage 2: Orchestrator ----
            triage_duration_s = time.monotonic() - triage_start
            logger.info(
                "Pipeline starting stage=orchestrator case=%s workflow=%s triage_duration_s=%.2f",
                case_id,
                workflow_id,
                triage_duration_s,
            )

            orchestrator_task_id = str(uuid4())
            await emit_agent_started(
                case_id=case_id,
                agent_type="orchestrator",
                task_id=orchestrator_task_id,
                file_id=str(first_file.id),
                file_name="routing-analysis",
            )

            orchestrator_output = await run_orchestrator(
                case_id=case_id,
                workflow_id=workflow_id,
                user_id=user_id,
                triage_output=triage_output,
                db_session=db,
                publish_event=publish_fn,
                parent_execution_id=triage_execution.id if triage_execution else None,
            )

            orch_execution: AgentExecution | None = None
            if orchestrator_output is None:
                await emit_agent_error(
                    case_id=case_id,
                    agent_type="orchestrator",
                    task_id=orchestrator_task_id,
                    error="Orchestrator failed to produce routing decisions",
                )
                # Files stay in PROCESSING -- partial results preserved
                await db.commit()
            else:
                # Query orchestrator execution record for metadata
                orch_exec_result = await db.execute(
                    select(AgentExecution)
                    .where(
                        AgentExecution.workflow_id == UUID(workflow_id),
                        AgentExecution.agent_name == "orchestrator",
                    )
                    .order_by(AgentExecution.created_at.desc())
                    .limit(1)
                )
                orch_execution = orch_exec_result.scalar_one_or_none()

                orch_metadata = (
                    _build_execution_metadata(orch_execution, settings.gemini_pro_model)
                    if orch_execution
                    else {}
                )

                await emit_agent_complete(
                    case_id=case_id,
                    agent_type="orchestrator",
                    task_id=orchestrator_task_id,
                    result={
                        "taskId": orchestrator_task_id,
                        "agentType": "orchestrator",
                        "outputs": [
                            {
                                "type": "routing-decisions",
                                "data": {
                                    "routingCount": len(
                                        orchestrator_output.routing_decisions
                                    ),
                                    "parallelAgents": orchestrator_output.parallel_agents,
                                    "researchTriggered": orchestrator_output.research_trigger.should_trigger,
                                },
                            }
                        ],
                        "routingDecisions": [
                            {
                                "fileId": rd.file_id,
                                "targetAgent": rd.target_agents[0]
                                if rd.target_agents
                                else "unknown",
                                "reason": rd.reasoning,
                                "domainScore": max(
                                    rd.domain_scores.financial,
                                    rd.domain_scores.legal,
                                    rd.domain_scores.strategy,
                                    rd.domain_scores.evidence,
                                ),
                            }
                            for rd in orchestrator_output.routing_decisions
                        ],
                        "metadata": orch_metadata,
                    },
                )

                # Commit so the orchestrator execution record is visible to
                # domain agent sessions (separate DB sessions via session_factory).
                await db.commit()

            # ---- Stage 3: Domain Agents (File-Group-Based Parallel) ----
            # domain_results type: dict[str, list[tuple[BaseModel | None, str]]]
            # where key=agent_type, value=list of (result, group_label) tuples
            domain_results: dict[str, list[tuple[BaseModel | None, str]]] = {}

            if orchestrator_output:
                logger.info(
                    "Pipeline starting stage=domain_agents case=%s workflow=%s",
                    case_id,
                    workflow_id,
                )

                # Use compute_agent_tasks (single source of truth) to determine what
                # agent instances will run. This is the same function that
                # run_domain_agents_parallel calls internally, ensuring SSE events
                # match exactly the tasks that will execute.
                expected_tasks = compute_agent_tasks(orchestrator_output, files)

                # ---- Routing HITL: per-agent-type confidence thresholds ----
                # Step 1: Identify (file, agent) pairs below per-agent thresholds
                skip_per_agent_hitl = True
                flagged_pairs: list[dict[str, object]] = []
                for rd in orchestrator_output.routing_decisions:
                    if rd.routing_confidence is None:
                        continue
                    for agent_type in rd.target_agents:
                        threshold = settings.get_routing_hitl_threshold(agent_type)
                        if rd.routing_confidence < threshold:
                            flagged_pairs.append(
                                {
                                    "file_name": rd.file_name or rd.file_id,
                                    "agent": agent_type,
                                    "confidence": rd.routing_confidence,
                                    "threshold": threshold,
                                }
                            )

                # Step 2: Plan-level HITL overview when flagged pairs exist
                if flagged_pairs:
                    plan_confirmation = await request_confirmation(
                        case_id=case_id,
                        agent_type="orchestrator",
                        action_description=(
                            f"Routing plan ready. {len(flagged_pairs)} agent "
                            f"assignment(s) flagged for review. Approve all or "
                            f"review individually?"
                        ),
                        affected_items=[
                            f"{p['file_name']} -> {p['agent']}" for p in flagged_pairs
                        ],
                        context={
                            "total_decisions": len(
                                orchestrator_output.routing_decisions
                            ),
                            "flagged_count": len(flagged_pairs),
                            "flagged_pairs": flagged_pairs,
                            "routing_summary": orchestrator_output.routing_summary,
                        },
                    )
                    skip_per_agent_hitl = plan_confirmation.approved

                # Step 3: Per-agent HITL (only if user chose to review individually)
                # Sends ONE batch SSE event so the frontend renders a single
                # multi-item review dialog. Pipeline blocks on one await.
                if not skip_per_agent_hitl:
                    batch_items: list[BatchConfirmationItem] = []
                    # Map item_id -> (file_id, agent_type) for processing results
                    item_mapping: dict[str, tuple[str, str]] = {}

                    for rd in orchestrator_output.routing_decisions:
                        if rd.routing_confidence is None:
                            continue
                        for agent_type in rd.target_agents:
                            threshold = settings.get_routing_hitl_threshold(agent_type)
                            if rd.routing_confidence < threshold:
                                item_id = str(uuid4())
                                item_mapping[item_id] = (rd.file_id, agent_type)
                                batch_items.append(
                                    BatchConfirmationItem(
                                        item_id=item_id,
                                        action_description=(
                                            f"Deploy {agent_type} agent on "
                                            f"'{rd.file_name or rd.file_id}'? "
                                            f"(confidence: "
                                            f"{rd.routing_confidence:.0f}/100)"
                                        ),
                                        affected_items=[rd.file_id],
                                        context={
                                            "file_id": rd.file_id,
                                            "file_name": rd.file_name,
                                            "agent_under_review": agent_type,
                                            "all_target_agents": rd.target_agents,
                                            "routing_confidence": (
                                                rd.routing_confidence
                                            ),
                                            "hitl_threshold": threshold,
                                            "reasoning": rd.reasoning,
                                            "domain_scores": (
                                                rd.domain_scores.model_dump()
                                            ),
                                        },
                                    )
                                )

                    if batch_items:
                        batch_result = await request_batch_confirmation(
                            case_id=case_id,
                            agent_type="orchestrator",
                            items=batch_items,
                            context={
                                "routing_summary": (
                                    orchestrator_output.routing_summary
                                ),
                            },
                        )
                        # Map rejections back to routing decisions
                        rejections: dict[str, list[str]] = {}
                        for decision in batch_result.decisions:
                            if not decision.approved:
                                file_id, rejected_agent = item_mapping[decision.item_id]
                                rejections.setdefault(file_id, []).append(
                                    rejected_agent
                                )
                        for rd in orchestrator_output.routing_decisions:
                            to_remove = rejections.get(rd.file_id, [])
                            if to_remove:
                                rd.target_agents = [
                                    a for a in rd.target_agents if a not in to_remove
                                ]

                # Step 4: Clean up empty routing decisions and file groups
                orchestrator_output.routing_decisions = [
                    rd
                    for rd in orchestrator_output.routing_decisions
                    if rd.target_agents
                ]
                for fg in orchestrator_output.file_groups:
                    valid_agents: set[str] = set()
                    for rd in orchestrator_output.routing_decisions:
                        if rd.file_id in fg.file_ids:
                            valid_agents.update(rd.target_agents)
                    fg.target_agents = [
                        a for a in fg.target_agents if a in valid_agents
                    ]
                orchestrator_output.file_groups = [
                    fg for fg in orchestrator_output.file_groups if fg.target_agents
                ]
                expected_tasks = compute_agent_tasks(orchestrator_output, files)

                # Emit agent-started for each expected (agent_type, group_label) pair
                # Use compound identifier: "{agent_type}_{group_label}"
                domain_task_ids: dict[str, str] = {}  # compound_id -> task_id
                for task in expected_tasks:
                    compound_id = f"{task.agent_type}_{task.group_label}"
                    task_id = str(uuid4())
                    domain_task_ids[compound_id] = task_id
                    await emit_agent_started(
                        case_id=case_id,
                        agent_type=compound_id,
                        task_id=task_id,
                        file_id=str(first_file.id),
                        file_name=f"{task.agent_type}-{task.group_label}",
                    )

                # Run file-group-based parallel domain agents
                # (each creates own DB session via session_factory)
                domain_results = await run_domain_agents_parallel(
                    case_id=case_id,
                    workflow_id=workflow_id,
                    user_id=user_id,
                    routing=orchestrator_output,
                    files=files,
                    hypotheses=[],  # Empty until hypothesis system exists (Phase 7)
                    db_session_factory=session_factory,
                    publish_event=publish_fn,
                    orchestrator_execution_id=orch_execution.id
                    if orch_execution
                    else None,
                )

                # Emit agent-complete/error for each agent instance
                for agent_type, result_list in domain_results.items():
                    for result, group_label in result_list:
                        compound_id = f"{agent_type}_{group_label}"
                        task_id = domain_task_ids.get(compound_id, str(uuid4()))

                        if result is not None:
                            finding_count = (
                                len(result.findings)
                                if hasattr(result, "findings")
                                else 0
                            )
                            entity_count = (
                                len(result.entities)
                                if hasattr(result, "entities")
                                else 0
                            )

                            # Query execution record for metadata
                            exec_result = await db.execute(
                                select(AgentExecution)
                                .where(
                                    AgentExecution.workflow_id == UUID(workflow_id),
                                    AgentExecution.agent_name == agent_type,
                                )
                                .order_by(AgentExecution.created_at.desc())
                                .limit(1)
                            )
                            agent_exec = exec_result.scalar_one_or_none()
                            agent_metadata = (
                                _build_execution_metadata(
                                    agent_exec, settings.gemini_pro_model
                                )
                                if agent_exec
                                else {}
                            )

                            await emit_agent_complete(
                                case_id=case_id,
                                agent_type=compound_id,
                                task_id=task_id,
                                result={
                                    "taskId": task_id,
                                    "agentType": compound_id,
                                    "baseAgentType": agent_type,
                                    "groupLabel": group_label,
                                    "outputs": [
                                        {
                                            "type": f"{agent_type}-findings",
                                            "data": {
                                                "findingCount": finding_count,
                                                "entityCount": entity_count,
                                                "groupLabel": group_label,
                                            },
                                        }
                                    ],
                                    "metadata": agent_metadata,
                                },
                            )
                        else:
                            await emit_agent_error(
                                case_id=case_id,
                                agent_type=compound_id,
                                task_id=task_id,
                                error=f"{agent_type} agent ({group_label}) failed to produce output",
                            )

            # ---- Stage 4: Legal Strategy Agent (Sequential, after domain agents) ----
            strategy_result = None
            any_domain_ran = any(
                any(r is not None for r, _label in result_list)
                for result_list in domain_results.values()
            )

            # Identify strategy-routed files (needed for both standalone and domain-summary paths)
            strategy_file_ids: set[str] = set()
            strategy_context_injection: str | None = None
            if orchestrator_output:
                for rd in orchestrator_output.routing_decisions:
                    if "strategy" in rd.target_agents:
                        strategy_file_ids.add(rd.file_id)
                        if strategy_context_injection is None and rd.context_injection:
                            strategy_context_injection = rd.context_injection

            file_lookup = {str(f.id): f for f in files}
            strategy_files = [
                file_lookup[fid] for fid in strategy_file_ids if fid in file_lookup
            ]

            # Determine whether to run strategy and with what inputs
            run_strategy_agent = False
            domain_summaries = ""

            if orchestrator_output and any_domain_ran:
                # Case 1: Domain agents ran -- strategy gets their summaries
                run_strategy_agent = True
                domain_summaries = build_strategy_context(domain_results)
            elif orchestrator_output and not any_domain_ran and strategy_files:
                # Case 2: No domain agents ran but strategy has its own files.
                # Distinguish deliberate strategy-only routing from domain agent failure.
                domain_agent_types = frozenset({"financial", "legal", "evidence"})
                domain_routing_intended = any(
                    any(a in domain_agent_types for a in rd.target_agents)
                    for rd in orchestrator_output.routing_decisions
                )
                if domain_routing_intended:
                    # Domain agents were expected but all failed — ask user
                    standalone_confirmation = await request_confirmation(
                        case_id=case_id,
                        agent_type="strategy",
                        action_description=(
                            f"Domain agents were routed but produced no results. "
                            f"Run strategy agent standalone with "
                            f"{len(strategy_files)} file(s)?"
                        ),
                        affected_items=[str(f.id) for f in strategy_files],
                        context={
                            "strategy_file_count": len(strategy_files),
                            "strategy_file_names": [
                                f.original_filename for f in strategy_files
                            ],
                            "domain_agents_expected": True,
                        },
                    )
                    if standalone_confirmation.approved:
                        run_strategy_agent = True
                    else:
                        logger.info(
                            "Strategy standalone rejected for case=%s (reason: %s)",
                            case_id,
                            standalone_confirmation.reason,
                        )
                else:
                    # Deliberate strategy-only routing — run directly
                    run_strategy_agent = True
                    logger.info(
                        "Strategy-only routing (deliberate) for case=%s with %d files",
                        case_id,
                        len(strategy_files),
                    )

            if run_strategy_agent:
                logger.info(
                    "Pipeline starting stage=strategy case=%s workflow=%s "
                    "standalone=%s",
                    case_id,
                    workflow_id,
                    not any_domain_ran,
                )

                strategy_task_id = str(uuid4())
                await emit_agent_started(
                    case_id=case_id,
                    agent_type="strategy",
                    task_id=strategy_task_id,
                    file_id=str(first_file.id),
                    file_name="strategy-analysis",
                )

                strategy_result = await run_strategy(
                    case_id=case_id,
                    workflow_id=workflow_id,
                    user_id=user_id,
                    files=strategy_files,
                    domain_summaries=domain_summaries,
                    hypotheses=[],
                    db_session=db,
                    publish_event=publish_fn,
                    parent_execution_id=orch_execution.id if orch_execution else None,
                    context_injection=strategy_context_injection,
                )

                if strategy_result:
                    # Query strategy execution for metadata
                    strat_exec_result = await db.execute(
                        select(AgentExecution)
                        .where(
                            AgentExecution.workflow_id == UUID(workflow_id),
                            AgentExecution.agent_name == "strategy",
                        )
                        .order_by(AgentExecution.created_at.desc())
                        .limit(1)
                    )
                    strat_exec = strat_exec_result.scalar_one_or_none()
                    strat_metadata = (
                        _build_execution_metadata(strat_exec, settings.gemini_pro_model)
                        if strat_exec
                        else {}
                    )

                    await emit_agent_complete(
                        case_id=case_id,
                        agent_type="strategy",
                        task_id=strategy_task_id,
                        result={
                            "taskId": strategy_task_id,
                            "agentType": "strategy",
                            "outputs": [
                                {
                                    "type": "strategy-findings",
                                    "data": {
                                        "findingCount": len(strategy_result.findings),
                                    },
                                }
                            ],
                            "metadata": strat_metadata,
                        },
                    )
                else:
                    await emit_agent_error(
                        case_id=case_id,
                        agent_type="strategy",
                        task_id=strategy_task_id,
                        error="Strategy agent failed to produce output",
                    )

            # ---- Stage 5: HITL for Low-Confidence Findings ----
            if domain_results:
                for agent_type, result_list in domain_results.items():
                    for result, group_label in result_list:
                        if result is None or not hasattr(result, "findings"):
                            continue
                        for finding in result.findings:
                            if finding.confidence < settings.confidence_threshold:
                                logger.info(
                                    "Low-confidence finding from %s (%s): %s "
                                    "(confidence=%s), requesting HITL",
                                    agent_type,
                                    group_label,
                                    finding.title,
                                    finding.confidence,
                                )
                                confirmation_result = await request_confirmation(
                                    case_id=case_id,
                                    agent_type=agent_type,
                                    action_description=(
                                        f"Low-confidence finding "
                                        f"({finding.confidence}/100): {finding.title}"
                                    ),
                                    affected_items=[
                                        c.file_id for c in finding.citations
                                    ],
                                    context={
                                        "finding_title": finding.title,
                                        "finding_category": finding.category,
                                        "finding_description": finding.description[
                                            :500
                                        ],
                                        "confidence": finding.confidence,
                                        "agent": agent_type,
                                        "group_label": group_label,
                                    },
                                )
                                if not confirmation_result.approved:
                                    logger.info(
                                        "Finding rejected by user: %s from %s/%s "
                                        "(reason: %s)",
                                        finding.title,
                                        agent_type,
                                        group_label,
                                        confirmation_result.reason,
                                    )
                                    # Mark finding as rejected (for audit trail)
                                    # Finding remains in output but excluded from KG in Phase 7

            # Also check strategy results for HITL
            if strategy_result and hasattr(strategy_result, "findings"):
                for finding in strategy_result.findings:
                    if finding.confidence < settings.confidence_threshold:
                        logger.info(
                            "Low-confidence finding from strategy: %s "
                            "(confidence=%s), requesting HITL",
                            finding.title,
                            finding.confidence,
                        )
                        confirmation_result = await request_confirmation(
                            case_id=case_id,
                            agent_type="strategy",
                            action_description=(
                                f"Low-confidence finding "
                                f"({finding.confidence}/100): {finding.title}"
                            ),
                            affected_items=[c.file_id for c in finding.citations],
                            context={
                                "finding_title": finding.title,
                                "finding_category": finding.category,
                                "finding_description": finding.description[:500],
                                "confidence": finding.confidence,
                                "agent": "strategy",
                            },
                        )
                        if not confirmation_result.approved:
                            logger.info(
                                "Finding rejected by user: %s from strategy "
                                "(reason: %s)",
                                finding.title,
                                confirmation_result.reason,
                            )

            # ---- Final: Update file statuses to ANALYZED ----
            await db.execute(
                update(CaseFile)
                .where(CaseFile.id.in_([UUID(fid) for fid in file_ids]))
                .values(status=FileStatus.ANALYZED)
            )
            await db.commit()

            # ---- Final: Emit processing-complete ----
            # Count findings and entities across all domain agents (multi-result structure)
            total_findings = 0
            total_domain_entities = 0
            for _agent_type, result_list in domain_results.items():
                for result, _group_label in result_list:
                    if result is not None and hasattr(result, "findings"):
                        total_findings += len(result.findings)
                    if result is not None and hasattr(result, "entities"):
                        total_domain_entities += len(result.entities)

            # Also count strategy findings
            if strategy_result and hasattr(strategy_result, "findings"):
                total_findings += len(strategy_result.findings)

            total_entities = sum(len(fr.entities) for fr in triage_output.file_results)
            total_duration_s = time.monotonic() - pipeline_start
            total_duration_ms = int(total_duration_s * 1000)

            # Aggregate token usage across all executions in this workflow
            all_exec_result = await db.execute(
                select(AgentExecution).where(
                    AgentExecution.workflow_id == UUID(workflow_id),
                )
            )
            all_executions = list(all_exec_result.scalars().all())
            total_input_tokens = sum(e.input_tokens or 0 for e in all_executions)
            total_output_tokens = sum(e.output_tokens or 0 for e in all_executions)

            await emit_processing_complete(
                case_id=case_id,
                files_processed=len(files),
                entities_created=total_entities + total_domain_entities,
                relationships_created=0,  # Relationships created by KG Agent in Phase 7
                total_duration_ms=total_duration_ms,
                total_input_tokens=total_input_tokens,
                total_output_tokens=total_output_tokens,
            )
            logger.info(
                "Pipeline complete case=%s workflow=%s files=%d "
                "total_duration_s=%.2f entities=%d findings=%d",
                case_id,
                workflow_id,
                len(files),
                total_duration_s,
                total_entities + total_domain_entities,
                total_findings,
            )

        except Exception as exc:
            pipeline_duration_s = time.monotonic() - pipeline_start
            logger.exception(
                "Pipeline failed case=%s workflow=%s duration_s=%.2f error=%s",
                case_id,
                workflow_id,
                pipeline_duration_s,
                exc,
            )
            # Update file statuses to ERROR
            try:
                await db.execute(
                    update(CaseFile)
                    .where(CaseFile.id.in_([UUID(fid) for fid in file_ids]))
                    .values(status=FileStatus.ERROR)
                )
                await db.commit()
            except Exception:
                logger.exception("Failed to update file statuses to ERROR")

            # Emit error event
            await emit_agent_error(
                case_id=case_id,
                agent_type="pipeline",
                task_id=workflow_id,
                error=str(exc)[:500],
            )


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/api/cases/{case_id}/analyze",
    response_model=AnalysisStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start agent analysis for case files",
    responses={
        400: {"model": ErrorResponse, "description": "No files to analyze"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        404: {"model": ErrorResponse, "description": "Case not found"},
    },
)
async def start_analysis(
    case_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AnalysisStartResponse:
    """Start agent analysis for all uploaded files in a case.

    Per CONTEXT.md: "Batch after uploads -- user explicitly starts analysis"

    This triggers:
    1. Triage Agent on all UPLOADED files
    2. Orchestrator Agent with triage results
    3. Domain Agents (Financial, Legal, Evidence) based on routing
    4. Strategy Agent with domain summaries
    5. HITL confirmation for low-confidence findings
    6. (Future) Synthesis agent for final output

    Returns workflow_id for tracking progress via the status endpoint
    or the Command Center SSE stream.
    """
    # Validate case ownership
    case = await _get_user_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    # Find all UPLOADED files in this case
    result = await db.execute(
        select(CaseFile).where(
            CaseFile.case_id == case_id,
            CaseFile.status == FileStatus.UPLOADED,
        )
    )
    files = list(result.scalars().all())

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No uploaded files to analyze. Upload files first.",
        )

    # Generate workflow ID
    workflow_id = uuid4()
    file_ids = [str(f.id) for f in files]

    # Schedule background analysis
    background_tasks.add_task(
        run_analysis_workflow,
        case_id=str(case_id),
        workflow_id=str(workflow_id),
        user_id=current_user.id,
        file_ids=file_ids,
    )

    logger.info(
        "Analysis started: case=%s workflow=%s files=%d",
        case_id,
        workflow_id,
        len(files),
    )

    return AnalysisStartResponse(
        workflow_id=workflow_id,
        case_id=case_id,
        files_queued=len(files),
        message=f"Analysis started for {len(files)} file(s). Track progress via SSE.",
    )


@router.get(
    "/api/cases/{case_id}/analysis/{workflow_id}",
    response_model=AnalysisStatusResponse,
    summary="Get analysis workflow status",
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        404: {"model": ErrorResponse, "description": "Workflow or case not found"},
    },
)
async def get_analysis_status(
    case_id: UUID,
    workflow_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AnalysisStatusResponse:
    """Get current status of an analysis workflow.

    Returns the pipeline stage, triage and orchestrator results when available,
    and error information if the workflow failed.
    """
    # Validate case ownership
    case = await _get_user_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    # Get all executions for this workflow
    result = await db.execute(
        select(AgentExecution)
        .where(
            AgentExecution.case_id == case_id,
            AgentExecution.workflow_id == workflow_id,
        )
        .order_by(AgentExecution.created_at.asc())
    )
    executions = list(result.scalars().all())

    if not executions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )

    # Determine current status from executions
    domain_agent_names = frozenset({"financial", "legal", "evidence"})
    triage_exec = None
    orchestrator_exec = None
    domain_execs: dict[str, list[AgentExecution]] = {}
    strategy_exec: AgentExecution | None = None
    for exec_record in executions:
        if exec_record.agent_name == "triage":
            triage_exec = exec_record
        elif exec_record.agent_name == "orchestrator":
            orchestrator_exec = exec_record
        elif exec_record.agent_name in domain_agent_names:
            if exec_record.agent_name not in domain_execs:
                domain_execs[exec_record.agent_name] = []
            domain_execs[exec_record.agent_name].append(exec_record)
        elif exec_record.agent_name == "strategy":
            strategy_exec = exec_record

    # Determine pipeline status
    pipeline_status: Literal[
        "pending", "triage", "orchestrating", "domain_analysis", "complete", "error"
    ]
    error_msg: str | None = None
    completed_at: datetime | None = None

    # Check for fatal pipeline-level failures (not individual agent failures
    # which are expected to be partial and non-fatal)
    pipeline_failed = any(
        e.status == AgentExecutionStatus.FAILED
        and e.agent_name in ("triage", "orchestrator", "pipeline")
        for e in executions
    )

    if pipeline_failed:
        pipeline_status = "error"
        failed = [
            e
            for e in executions
            if e.status == AgentExecutionStatus.FAILED
            and e.agent_name in ("triage", "orchestrator", "pipeline")
        ]
        error_msg = failed[0].error_message if failed else "Unknown error"
    elif strategy_exec and strategy_exec.status == AgentExecutionStatus.COMPLETED:
        pipeline_status = "complete"
        completed_at = strategy_exec.completed_at
    elif (strategy_exec and strategy_exec.status == AgentExecutionStatus.RUNNING) or (
        domain_execs
        and any(
            e.status == AgentExecutionStatus.RUNNING
            for exec_list in domain_execs.values()
            for e in exec_list
        )
    ):
        pipeline_status = "domain_analysis"
    elif domain_execs and not strategy_exec:
        # All domain agents completed but strategy not started yet
        pipeline_status = "domain_analysis"
    elif (
        orchestrator_exec
        and orchestrator_exec.status == AgentExecutionStatus.COMPLETED
        and not domain_execs
    ):
        # Backward compat: orchestrator done, no domain agents -> complete
        pipeline_status = "complete"
        completed_at = orchestrator_exec.completed_at
    elif orchestrator_exec and orchestrator_exec.status == AgentExecutionStatus.RUNNING:
        pipeline_status = "orchestrating"
    elif triage_exec and triage_exec.status == AgentExecutionStatus.COMPLETED:
        pipeline_status = "orchestrating"
    elif triage_exec and triage_exec.status == AgentExecutionStatus.RUNNING:
        pipeline_status = "triage"
    else:
        pipeline_status = "pending"

    # Parse triage and orchestrator outputs
    triage_result: TriageOutput | None = None
    orchestrator_result: OrchestratorOutput | None = None

    if triage_exec and triage_exec.output_data:
        try:
            triage_result = TriageOutput.model_validate(triage_exec.output_data)
        except (ValueError, ValidationError) as exc:
            logger.warning(
                "Failed to parse stored triage output for workflow=%s: %s",
                workflow_id,
                exc,
            )

    if orchestrator_exec and orchestrator_exec.output_data:
        try:
            orchestrator_result = OrchestratorOutput.model_validate(
                orchestrator_exec.output_data
            )
        except (ValueError, ValidationError) as exc:
            logger.warning(
                "Failed to parse stored orchestrator output for workflow=%s: %s",
                workflow_id,
                exc,
            )

    # Build domain results summary (multi-execution-aware)
    domain_summary: dict[str, list[dict[str, object]]] | None = None
    if domain_execs:
        domain_summary = {}
        for agent_name, exec_list in domain_execs.items():
            domain_summary[agent_name] = []
            for exec_record in exec_list:
                finding_count = 0
                group_label: str = "unknown"
                if exec_record.input_data and isinstance(exec_record.input_data, dict):
                    raw_suffix = exec_record.input_data.get("stage_suffix", "")
                    group_label = (
                        raw_suffix.lstrip("_")
                        if isinstance(raw_suffix, str)
                        else "default"
                    ) or "default"
                if exec_record.output_data and isinstance(
                    exec_record.output_data, dict
                ):
                    findings = exec_record.output_data.get("findings", [])
                    finding_count = len(findings) if isinstance(findings, list) else 0
                domain_summary[agent_name].append(
                    {
                        "group_label": group_label,
                        "finding_count": finding_count,
                        "status": exec_record.status.value
                        if exec_record.status
                        else "unknown",
                    }
                )

    # Find earliest started_at
    started_at = min(e.started_at for e in executions)

    return AnalysisStatusResponse(
        workflow_id=workflow_id,
        case_id=case_id,
        status=pipeline_status,
        triage_result=triage_result,
        orchestrator_result=orchestrator_result,
        started_at=started_at,
        completed_at=completed_at,
        error=error_msg,
        domain_results_summary=domain_summary,
    )
