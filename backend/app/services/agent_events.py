# ABOUTME: Agent event publishing service for SSE Command Center updates.
# ABOUTME: Manages pub/sub subscriptions and emits typed agent lifecycle events to connected clients.

import asyncio
import json
import logging
from collections import defaultdict
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class AgentEventType(str, Enum):
    """Agent lifecycle event types matching frontend CommandCenterSSEEvent."""

    AGENT_STARTED = "agent-started"
    AGENT_COMPLETE = "agent-complete"
    AGENT_ERROR = "agent-error"
    THINKING_UPDATE = "thinking-update"
    TOOL_CALLED = "tool-called"
    PROCESSING_COMPLETE = "processing-complete"


# ---------------------------------------------------------------------------
# Subscriber management (in-memory pub/sub, suitable for single-instance)
# ---------------------------------------------------------------------------

# Maps case_id -> list of subscriber queues
_agent_subscribers: dict[str, list[asyncio.Queue[dict[str, str]]]] = defaultdict(list)


def subscribe_to_agent_events(case_id: str) -> asyncio.Queue[dict[str, str]]:
    """Subscribe to agent events for a case.

    Returns an asyncio.Queue that will receive events as they are published.
    The caller is responsible for calling unsubscribe_from_agent_events when done.

    Args:
        case_id: UUID string of the case to subscribe to.

    Returns:
        Queue that receives event dicts with 'event' and 'data' keys.
    """
    queue: asyncio.Queue[dict[str, str]] = asyncio.Queue(maxsize=100)
    _agent_subscribers[case_id].append(queue)
    logger.debug(
        "Agent event subscriber added for case=%s (total=%d)",
        case_id,
        len(_agent_subscribers[case_id]),
    )
    return queue


def unsubscribe_from_agent_events(
    case_id: str, queue: asyncio.Queue[dict[str, str]]
) -> None:
    """Unsubscribe from agent events for a case.

    Removes the queue from the subscriber list and cleans up empty lists.

    Args:
        case_id: UUID string of the case.
        queue: The queue returned by subscribe_to_agent_events.
    """
    try:
        _agent_subscribers[case_id].remove(queue)
    except ValueError:
        pass
    # Clean up empty subscriber lists
    if not _agent_subscribers[case_id]:
        del _agent_subscribers[case_id]
    logger.debug("Agent event subscriber removed for case=%s", case_id)


# ---------------------------------------------------------------------------
# Event publishing
# ---------------------------------------------------------------------------


async def publish_agent_event(
    case_id: str,
    event_type: AgentEventType,
    data: dict[str, Any],
) -> None:
    """Publish agent event to all subscribers for a case.

    Events are sent as dicts with 'event' (type string) and 'data' (JSON string)
    keys, matching the SSE format expected by EventSourceResponse.

    Args:
        case_id: UUID string of the case.
        event_type: Type of agent lifecycle event.
        data: Event payload to serialize as JSON.
    """
    event = {"event": event_type.value, "data": json.dumps(data)}
    subscribers = _agent_subscribers.get(case_id, [])
    for queue in subscribers:
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            # Skip slow consumers to avoid backpressure
            logger.warning(
                "Agent event queue full for case=%s, dropping event=%s",
                case_id,
                event_type.value,
            )


# ---------------------------------------------------------------------------
# Convenience emitters for common events
# ---------------------------------------------------------------------------


async def emit_agent_started(
    case_id: str,
    agent_type: str,
    task_id: str,
    file_id: str,
    file_name: str,
) -> None:
    """Emit an agent-started event.

    Args:
        case_id: UUID string of the case.
        agent_type: Agent type (triage, orchestrator, financial, etc.).
        task_id: Unique identifier for this agent task.
        file_id: ID of the file being processed.
        file_name: Original filename for display.
    """
    await publish_agent_event(
        case_id,
        AgentEventType.AGENT_STARTED,
        {
            "type": AgentEventType.AGENT_STARTED.value,
            "agentType": agent_type,
            "taskId": task_id,
            "fileId": file_id,
            "fileName": file_name,
        },
    )


async def emit_agent_complete(
    case_id: str,
    agent_type: str,
    task_id: str,
    result: dict[str, Any],
) -> None:
    """Emit an agent-complete event.

    Args:
        case_id: UUID string of the case.
        agent_type: Agent type (triage, orchestrator, financial, etc.).
        task_id: Unique identifier for this agent task.
        result: AgentResult-compatible dict with outputs and metadata.
    """
    await publish_agent_event(
        case_id,
        AgentEventType.AGENT_COMPLETE,
        {
            "type": AgentEventType.AGENT_COMPLETE.value,
            "agentType": agent_type,
            "taskId": task_id,
            "result": result,
        },
    )


async def emit_agent_error(
    case_id: str,
    agent_type: str,
    task_id: str,
    error: str,
) -> None:
    """Emit an agent-error event.

    Args:
        case_id: UUID string of the case.
        agent_type: Agent type (triage, orchestrator, financial, etc.).
        task_id: Unique identifier for this agent task.
        error: Human-readable error description.
    """
    await publish_agent_event(
        case_id,
        AgentEventType.AGENT_ERROR,
        {
            "type": AgentEventType.AGENT_ERROR.value,
            "agentType": agent_type,
            "taskId": task_id,
            "error": error,
        },
    )


async def emit_processing_complete(
    case_id: str,
    files_processed: int,
    entities_created: int,
    relationships_created: int,
) -> None:
    """Emit a processing-complete event when all agents finish.

    Args:
        case_id: UUID string of the case.
        files_processed: Number of files that were analyzed.
        entities_created: Number of entities extracted.
        relationships_created: Number of relationships discovered.
    """
    await publish_agent_event(
        case_id,
        AgentEventType.PROCESSING_COMPLETE,
        {
            "type": AgentEventType.PROCESSING_COMPLETE.value,
            "caseId": case_id,
            "filesProcessed": files_processed,
            "entitiesCreated": entities_created,
            "relationshipsCreated": relationships_created,
        },
    )
