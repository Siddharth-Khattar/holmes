# ABOUTME: Server-Sent Events (SSE) endpoints for real-time streaming.
# ABOUTME: Includes file status streaming and heartbeat for Cloud Run connections.

import asyncio
import json
from collections import defaultdict
from typing import Any

from fastapi import APIRouter
from sse_starlette import EventSourceResponse

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
