# ABOUTME: Analysis pipeline orchestrator with session-per-stage architecture.
# ABOUTME: Runs as a background task coordinating triage, orchestrator, domain agents, and strategy.

import logging
import time
from uuid import UUID, uuid4

from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import get_settings
from app.models import Case, CaseFile
from app.models.agent_execution import AgentExecution
from app.models.case import CaseStatus
from app.models.file import FileStatus
from app.services.agent_events import (
    build_execution_metadata,
    emit_agent_complete,
    emit_agent_error,
    emit_agent_started,
    emit_processing_complete,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Session-scoped status helpers
# ---------------------------------------------------------------------------


async def _update_case_status(
    session_factory: async_sessionmaker[AsyncSession],
    case_id: str,
    status: CaseStatus,
) -> None:
    """Update case status using a fresh, short-lived DB session."""
    async with session_factory() as db:
        await db.execute(
            update(Case).where(Case.id == UUID(case_id)).values(status=status)
        )
        await db.commit()


async def _ensure_case_not_stuck(
    session_factory: async_sessionmaker[AsyncSession],
    case_id: str,
) -> None:
    """Safety net: if case is still PROCESSING after pipeline exits, force to ERROR.

    Called from the finally block to guarantee cases never get stuck in PROCESSING.
    """
    try:
        async with session_factory() as db:
            result = await db.execute(
                select(Case.status).where(Case.id == UUID(case_id))
            )
            current = result.scalar_one_or_none()
            if current == CaseStatus.PROCESSING:
                logger.warning(
                    "Safety net: forcing case %s from PROCESSING to ERROR", case_id
                )
                await db.execute(
                    update(Case)
                    .where(Case.id == UUID(case_id))
                    .values(status=CaseStatus.ERROR)
                )
                await db.commit()
    except Exception:
        logger.exception("Safety net failed for case=%s", case_id)


async def _handle_pipeline_error(
    session_factory: async_sessionmaker[AsyncSession],
    case_id: str,
    file_ids: list[str],
    workflow_id: str,
    exc: BaseException,
) -> None:
    """Handle pipeline-level errors using a fresh DB session.

    Updates file statuses to ERROR, case status to ERROR, and emits
    an error SSE event.
    """
    try:
        async with session_factory() as db:
            await db.execute(
                update(CaseFile)
                .where(CaseFile.id.in_([UUID(fid) for fid in file_ids]))
                .values(status=FileStatus.ERROR)
            )
            await db.execute(
                update(Case)
                .where(Case.id == UUID(case_id))
                .values(status=CaseStatus.ERROR)
            )
            await db.commit()
    except Exception:
        logger.exception("Failed to update statuses to ERROR for case=%s", case_id)

    await emit_agent_error(
        case_id=case_id,
        agent_type="pipeline",
        task_id=workflow_id,
        error=str(exc)[:500],
    )


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
                build_execution_metadata(triage_execution, settings.gemini_flash_model)
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
                    build_execution_metadata(orch_execution, settings.gemini_pro_model)
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
                                "targetAgent": agent,
                                "reason": rd.reasoning,
                                "domainScore": getattr(rd.domain_scores, agent, 0),
                            }
                            for rd in orchestrator_output.routing_decisions
                            for agent in rd.target_agents
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
                                build_execution_metadata(
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

                # Bug fix: emit agent-error for expected tasks that have no results.
                # run_domain_agents_parallel may swallow BaseException, leaving
                # compound IDs with no agent-complete/agent-error event.
                covered_compound_ids: set[str] = set()
                for agent_type, result_list in domain_results.items():
                    for _, group_label in result_list:
                        covered_compound_ids.add(f"{agent_type}_{group_label}")

                for compound_id, task_id in domain_task_ids.items():
                    if compound_id not in covered_compound_ids:
                        await emit_agent_error(
                            case_id=case_id,
                            agent_type=compound_id,
                            task_id=task_id,
                            error=f"Agent {compound_id} did not return any result",
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

            # Determine whether the orchestrator requested strategy analysis.
            # Strategy only runs when explicitly routed — having domain results
            # alone is not sufficient. This prevents strategy from running on
            # cases where it was never requested (e.g., pure evidence analysis).
            strategy_requested = False
            if orchestrator_output:
                strategy_requested = (
                    bool(strategy_file_ids)
                    or "strategy" in orchestrator_output.parallel_agents
                    or "strategy" in orchestrator_output.sequential_agents
                )

            # Determine whether to run strategy and with what inputs
            run_strategy_agent = False
            domain_summaries = ""

            if strategy_requested and any_domain_ran:
                # Case 1: Strategy requested + domain agents ran → summaries path
                run_strategy_agent = True
                domain_summaries = build_strategy_context(domain_results)
            elif strategy_requested and not any_domain_ran and strategy_files:
                # Case 2: No domain agents ran but strategy has its own files.
                # Distinguish deliberate strategy-only routing from domain agent failure.
                # strategy_requested is only True when orchestrator_output is not None
                assert orchestrator_output is not None
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

            if not strategy_requested:
                logger.info(
                    "Skipping strategy agent for case=%s: not requested by orchestrator",
                    case_id,
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
                        build_execution_metadata(strat_exec, settings.gemini_pro_model)
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

            # Update case status to READY on successful completion
            await _update_case_status(session_factory, case_id, CaseStatus.READY)

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
            await _handle_pipeline_error(
                session_factory, case_id, file_ids, workflow_id, exc
            )
        finally:
            # Safety net: if case is still PROCESSING, force to ERROR.
            # Guarantees cases never get permanently stuck.
            await _ensure_case_not_stuck(session_factory, case_id)
