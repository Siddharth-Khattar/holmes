# ABOUTME: Server-Sent Events (SSE) endpoints for real-time streaming.
# ABOUTME: Includes file status streaming, command center agent events, and heartbeat for Cloud Run connections.

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import APIRouter
from sqlalchemy import select
from sse_starlette import EventSourceResponse

from app.services.agent_events import (
    AgentEventType,
    subscribe_to_agent_events,
    unsubscribe_from_agent_events,
)

logger = logging.getLogger(__name__)

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
        await asyncio.sleep(15)  # 15 second heartbeat per REQ-INF-004


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
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
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


async def build_state_snapshot(case_id: str) -> dict[str, Any]:
    """Build a state snapshot of all agent executions for reconnection.

    Queries the most recent workflow for this case and returns each agent's
    current status and metadata (tokens, duration, thinking traces).

    Args:
        case_id: UUID string of the case.

    Returns:
        Dict with "agents" key mapping agent names to their status and metadata.
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

                agents[execution.agent_name] = {
                    "status": execution.status.value.lower(),
                    "metadata": {
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
                    },
                }

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
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
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
