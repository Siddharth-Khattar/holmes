# ABOUTME: Server-Sent Events (SSE) endpoints for real-time streaming.
# ABOUTME: Includes file status streaming, command center agent events, and heartbeat for Cloud Run connections.

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.models.agent_execution import AgentExecution

from fastapi import APIRouter
from sqlalchemy import select
from sse_starlette import EventSourceResponse

from app.config import get_settings
from app.services.agent_events import (
    AgentEventType,
    subscribe_to_agent_events,
    unsubscribe_from_agent_events,
)

logger = logging.getLogger(__name__)
_settings = get_settings()

router = APIRouter()

# In-memory pubsub for file events (single instance, suitable for hackathon)
# Maps case_id -> list of subscriber queues
_file_subscribers: dict[str, list[asyncio.Queue[dict[str, str]]]] = defaultdict(list)


async def publish_file_event(
    case_id: str, event_type: str, data: dict[str, Any]
) -> None:
    """
    Publish a file event to all subscribers for a case.

    Args:
        case_id: UUID string of the case
        event_type: Event type (file-uploaded, file-status, file-deleted, file-error)
        data: Event payload to send as JSON
    """
    event = {"event": event_type, "data": json.dumps(data)}
    subscribers = _file_subscribers.get(case_id, [])
    for queue in subscribers:
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            # Skip if queue is full (slow consumer)
            pass


async def heartbeat_generator():
    """Generate heartbeat events to keep connection alive."""
    while True:
        yield {"event": "heartbeat", "data": "ping"}
        await asyncio.sleep(_settings.sse_heartbeat_interval_seconds)


async def file_status_generator(case_id: str):
    """
    Generate file status events for a case with heartbeat.

    Yields events when files are uploaded, status changes, or files are deleted.
    Sends heartbeat every 15 seconds to keep connection alive.
    """
    queue: asyncio.Queue[dict[str, str]] = asyncio.Queue(maxsize=100)
    _file_subscribers[case_id].append(queue)

    try:
        while True:
            try:
                # Wait for event with timeout for heartbeat
                event = await asyncio.wait_for(
                    queue.get(), timeout=_settings.sse_heartbeat_interval_seconds
                )
                yield event
            except TimeoutError:
                # Send heartbeat on timeout
                yield {"event": "heartbeat", "data": "ping"}
    finally:
        # Clean up subscriber on disconnect
        try:
            _file_subscribers[case_id].remove(queue)
        except ValueError:
            pass
        # Clean up empty subscriber lists
        if not _file_subscribers[case_id]:
            del _file_subscribers[case_id]


@router.get("/sse/heartbeat")
async def sse_heartbeat():
    """SSE endpoint skeleton with heartbeat only."""
    return EventSourceResponse(
        heartbeat_generator(),
        headers={
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Cache-Control": "no-cache, no-transform",
        },
    )


@router.get("/sse/cases/{case_id}/files")
async def file_status_stream(case_id: str):
    """
    SSE endpoint for file status updates.

    Streams events when:
    - A file is uploaded (file-uploaded)
    - A file's processing status changes (file-status)
    - A file is deleted (file-deleted)
    - An error occurs during processing (file-error)

    Heartbeat events are sent every 15 seconds to keep the connection alive.
    """
    return EventSourceResponse(
        file_status_generator(case_id),
        headers={
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Cache-Control": "no-cache, no-transform",
        },
    )


# ---------------------------------------------------------------------------
# Command Center SSE (agent lifecycle events)
# ---------------------------------------------------------------------------


def _build_snapshot_last_result(
    execution: AgentExecution,
    metadata_dict: dict[str, Any],
) -> dict[str, Any] | None:
    """Construct a frontend-compatible AgentResult dict from DB output_data.

    Mirrors the live SSE agent-complete payload structure so that the frontend
    `handleStateSnapshot` receives the same shape as live events.

    Args:
        execution: AgentExecution record with output_data populated.
        metadata_dict: Pre-built metadata dict (tokens, duration, model, etc.).

    Returns:
        AgentResult-compatible dict, or None if no output_data exists.
    """
    output = execution.output_data
    if not output or not isinstance(output, dict):
        return None

    agent_name = execution.agent_name
    result: dict[str, Any] = {
        "taskId": "",
        "agentType": agent_name,
        "outputs": [],
        "metadata": metadata_dict,
    }

    if agent_name == "triage":
        file_results = output.get("file_results", [])
        groupings = output.get("suggested_groupings", [])
        result["outputs"] = [
            {
                "type": "triage-results",
                "data": {
                    "fileCount": len(file_results)
                    if isinstance(file_results, list)
                    else 0,
                    "groupings": len(groupings) if isinstance(groupings, list) else 0,
                },
            }
        ]

    elif agent_name == "orchestrator":
        decisions = output.get("routing_decisions", [])
        result["outputs"] = [
            {
                "type": "routing-decisions",
                "data": {
                    "routingCount": len(decisions)
                    if isinstance(decisions, list)
                    else 0,
                    "parallelAgents": output.get("parallel_agents", []),
                    "researchTriggered": (output.get("research_trigger") or {}).get(
                        "should_trigger", False
                    ),
                },
            }
        ]
        # Convert snake_case routing decisions to camelCase for frontend
        if isinstance(decisions, list):
            routing_decisions_camel: list[dict[str, Any]] = []
            for rd in decisions:
                if not isinstance(rd, dict):
                    continue
                target_agents = rd.get("target_agents", [])
                domain_scores = rd.get("domain_scores", {})
                score_values = [
                    domain_scores.get(k, 0)
                    for k in ("financial", "legal", "strategy", "evidence")
                    if isinstance(domain_scores.get(k, 0), (int, float))
                ]
                routing_decisions_camel.append(
                    {
                        "fileId": rd.get("file_id", ""),
                        "targetAgent": target_agents[0] if target_agents else "unknown",
                        "reason": rd.get("reasoning", ""),
                        "domainScore": max(score_values) if score_values else 0,
                    }
                )
            result["routingDecisions"] = routing_decisions_camel

    elif agent_name == "strategy":
        findings = output.get("findings", [])
        result["outputs"] = [
            {
                "type": "strategy-findings",
                "data": {
                    "findingCount": len(findings) if isinstance(findings, list) else 0,
                },
            }
        ]

    else:
        # Domain agents (financial, legal, evidence)
        findings = output.get("findings", [])
        entities = output.get("entities", [])
        # Extract group label from input_data stage_suffix
        group_label = "default"
        if execution.input_data and isinstance(execution.input_data, dict):
            raw_suffix = execution.input_data.get("stage_suffix", "")
            group_label = (
                raw_suffix.lstrip("_") if isinstance(raw_suffix, str) else "default"
            ) or "default"

        result["baseAgentType"] = agent_name
        result["groupLabel"] = group_label
        result["outputs"] = [
            {
                "type": f"{agent_name}-findings",
                "data": {
                    "findingCount": len(findings) if isinstance(findings, list) else 0,
                    "entityCount": len(entities) if isinstance(entities, list) else 0,
                    "groupLabel": group_label,
                },
            }
        ]

    return result


async def build_state_snapshot(case_id: str) -> dict[str, Any]:
    """Build a state snapshot of all agent executions for reconnection.

    Queries the most recent workflow for this case and returns each agent's
    current status, metadata (tokens, duration, thinking traces), and
    lastResult for refresh resilience.

    Args:
        case_id: UUID string of the case.

    Returns:
        Dict with "agents" key mapping agent names to their status, metadata,
        and lastResult.
    """
    from app.database import _get_sessionmaker
    from app.models.agent_execution import AgentExecution

    session_factory = _get_sessionmaker()
    agents: dict[str, Any] = {}

    try:
        async with session_factory() as db:
            # Find the most recent workflow for this case
            from uuid import UUID as PyUUID

            latest_result = await db.execute(
                select(AgentExecution)
                .where(AgentExecution.case_id == PyUUID(case_id))
                .order_by(AgentExecution.created_at.desc())
                .limit(1)
            )
            latest = latest_result.scalar_one_or_none()
            if latest is None:
                return {"agents": agents}

            # Get all executions for this workflow
            workflow_result = await db.execute(
                select(AgentExecution)
                .where(AgentExecution.workflow_id == latest.workflow_id)
                .order_by(AgentExecution.created_at.asc())
            )
            executions = list(workflow_result.scalars().all())

            for execution in executions:
                duration_ms: int | None = None
                if execution.started_at and execution.completed_at:
                    delta = execution.completed_at - execution.started_at
                    duration_ms = int(delta.total_seconds() * 1000)

                thinking_text = ""
                if execution.thinking_traces:
                    thinking_text = "\n".join(
                        trace.get("thought", "")
                        if isinstance(trace, dict)
                        else str(trace)
                        for trace in execution.thinking_traces
                    )

                metadata_dict: dict[str, Any] = {
                    "inputTokens": execution.input_tokens or 0,
                    "outputTokens": execution.output_tokens or 0,
                    "durationMs": duration_ms or 0,
                    "startedAt": (
                        execution.started_at.isoformat()
                        if execution.started_at
                        else None
                    ),
                    "completedAt": (
                        execution.completed_at.isoformat()
                        if execution.completed_at
                        else None
                    ),
                    "model": execution.model_name,
                    "thinkingTraces": thinking_text,
                }

                agent_entry: dict[str, Any] = {
                    "status": execution.status.value.lower(),
                    "metadata": metadata_dict,
                }

                last_result = _build_snapshot_last_result(execution, metadata_dict)
                if last_result is not None:
                    agent_entry["lastResult"] = last_result

                agents[execution.agent_name] = agent_entry

    except Exception:
        logger.exception("Failed to build state snapshot for case=%s", case_id)

    return {"agents": agents}


async def command_center_generator(case_id: str):
    """Generate agent lifecycle events for Command Center visualization.

    Sends a state snapshot immediately on connect for reconnection resilience,
    then streams live events.

    Events:
    - state-snapshot: Full agent state on connect (reconnection support)
    - agent-started: Agent begins processing a file/task
    - agent-complete: Agent finishes with results
    - agent-error: Agent encountered an error
    - thinking-update: Agent reasoning trace (real-time)
    - tool-called: Agent invoked a tool
    - processing-complete: All agents finished for this case

    Heartbeat every 15 seconds per REQ-INF-004.
    """
    # Send state snapshot immediately on connect.
    # Include `type` so the frontend validation switch dispatches correctly.
    snapshot = await build_state_snapshot(case_id)
    snapshot["type"] = AgentEventType.STATE_SNAPSHOT.value
    yield {
        "event": AgentEventType.STATE_SNAPSHOT.value,
        "data": json.dumps(snapshot),
    }

    queue = subscribe_to_agent_events(case_id)

    try:
        while True:
            try:
                event = await asyncio.wait_for(
                    queue.get(), timeout=_settings.sse_heartbeat_interval_seconds
                )
                yield event
            except TimeoutError:
                yield {"event": "heartbeat", "data": "ping"}
    finally:
        unsubscribe_from_agent_events(case_id, queue)


@router.get("/sse/cases/{case_id}/command-center/stream")
async def command_center_stream(case_id: str):
    """SSE endpoint for Command Center agent visualization.

    Streams agent lifecycle events for real-time display in the
    Command Center Agent Flow canvas:
    - agent-started: When an agent begins processing
    - agent-complete: When an agent finishes with results
    - agent-error: When an agent encounters an error
    - processing-complete: When all processing is done

    Heartbeat every 15 seconds to keep connection alive on Cloud Run.
    """
    return EventSourceResponse(
        command_center_generator(case_id),
        headers={
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Cache-Control": "no-cache, no-transform",
        },
    )
