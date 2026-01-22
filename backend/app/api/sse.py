# ABOUTME: Server-Sent Events (SSE) endpoints for real-time streaming.
# ABOUTME: Includes heartbeat endpoint to keep connections alive on Cloud Run.

import asyncio

from fastapi import APIRouter
from sse_starlette import EventSourceResponse

router = APIRouter()


async def heartbeat_generator():
    """Generate heartbeat events to keep connection alive."""
    while True:
        yield {"event": "heartbeat", "data": "ping"}
        await asyncio.sleep(15)  # 15 second heartbeat per REQ-INF-004


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
