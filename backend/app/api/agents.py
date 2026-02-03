# ABOUTME: Agent execution API endpoints for starting and tracking analysis workflows.
# ABOUTME: Provides POST to start analysis, GET for status, and background task orchestration.

import logging
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import CurrentUser
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
        -> Store TriageOutput in agent_executions table
    3. Stage 2: Run Orchestrator Agent (fresh session, text-only input)
        -> Store RoutingDecisions in agent_executions table
    4. (Future) Stage 3: Run Domain Agents (parallel fresh sessions)
    5. (Future) Stage 4: Run Synthesis Agent (fresh session)
    6. Update file statuses to ANALYZED
    7. Emit processing-complete event

    SSE events emitted at each stage transition:
    - agent-started: When an agent within a stage starts
    - agent-complete: When an agent finishes
    - agent-error: When an agent encounters an error
    - processing-complete: When entire pipeline is done
    """
    # Import here to avoid circular dependency (agents -> services -> agents)
    from app.agents.orchestrator import run_orchestrator
    from app.agents.triage import run_triage
    from app.database import _get_sessionmaker

    session_factory = _get_sessionmaker()

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
                },
            )

            # ---- Stage 2: Orchestrator ----
            # Find triage execution record for parent chain
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
                parent_execution_id=triage_execution.id if triage_execution else None,
            )

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
                    },
                )

            # ---- Step 6: Update file statuses to ANALYZED ----
            await db.execute(
                update(CaseFile)
                .where(CaseFile.id.in_([UUID(fid) for fid in file_ids]))
                .values(status=FileStatus.ANALYZED)
            )
            await db.commit()

            # ---- Step 7: Emit processing-complete ----
            # Count entities from triage output
            total_entities = sum(len(fr.entities) for fr in triage_output.file_results)
            await emit_processing_complete(
                case_id=case_id,
                files_processed=len(files),
                entities_created=total_entities,
                relationships_created=0,  # Relationships created by domain agents in Phase 6
            )

            logger.info(
                "Analysis workflow complete: case=%s workflow=%s files=%d",
                case_id,
                workflow_id,
                len(files),
            )

        except Exception as exc:
            logger.exception(
                "Analysis workflow failed: case=%s workflow=%s error=%s",
                case_id,
                workflow_id,
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
    3. (Future) Domain agents based on routing
    4. (Future) Synthesis agent for final output

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
    triage_exec = None
    orchestrator_exec = None
    for exec_record in executions:
        if exec_record.agent_name == "triage":
            triage_exec = exec_record
        elif exec_record.agent_name == "orchestrator":
            orchestrator_exec = exec_record

    # Determine pipeline status
    pipeline_status: Literal[
        "pending", "triage", "orchestrating", "domain_analysis", "complete", "error"
    ]
    error_msg: str | None = None
    completed_at: datetime | None = None

    if any(e.status == AgentExecutionStatus.FAILED for e in executions):
        pipeline_status = "error"
        failed = [e for e in executions if e.status == AgentExecutionStatus.FAILED]
        error_msg = failed[0].error_message if failed else "Unknown error"
    elif (
        orchestrator_exec and orchestrator_exec.status == AgentExecutionStatus.COMPLETED
    ):
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
        except Exception:
            logger.warning(
                "Failed to parse stored triage output for workflow=%s", workflow_id
            )

    if orchestrator_exec and orchestrator_exec.output_data:
        try:
            orchestrator_result = OrchestratorOutput.model_validate(
                orchestrator_exec.output_data
            )
        except Exception:
            logger.warning(
                "Failed to parse stored orchestrator output for workflow=%s",
                workflow_id,
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
    )
