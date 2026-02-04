# ABOUTME: Agent event publishing service for SSE Command Center updates.
# ABOUTME: Manages pub/sub subscriptions and emits typed agent lifecycle events to connected clients.

import asyncio
import json
import logging
from collections import defaultdict
from enum import Enum
from typing import Any, TypedDict

logger = logging.getLogger(__name__)


class SSEEvent(TypedDict):
    """Type-safe SSE event structure sent to subscribers."""

    event: str  # Event type (e.g., "agent-started")
    data: str  # JSON-serialized payload


class AgentEventType(str, Enum):
    """Agent lifecycle event types matching frontend CommandCenterSSEEvent."""

    AGENT_STARTED = "agent-started"
    AGENT_COMPLETE = "agent-complete"
    AGENT_ERROR = "agent-error"
    THINKING_UPDATE = "thinking-update"
    TOOL_CALLED = "tool-called"
    PROCESSING_COMPLETE = "processing-complete"
    STATE_SNAPSHOT = "state-snapshot"
    CONFIRMATION_REQUIRED = "confirmation-required"
    CONFIRMATION_RESOLVED = "confirmation-resolved"


# ---------------------------------------------------------------------------
# Subscriber management (in-memory pub/sub, suitable for single-instance)
# ---------------------------------------------------------------------------

# Maps case_id -> list of subscriber queues
_agent_subscribers: dict[str, list[asyncio.Queue[SSEEvent]]] = defaultdict(list)


def subscribe_to_agent_events(case_id: str) -> asyncio.Queue[SSEEvent]:
    """Subscribe to agent events for a case.

    Returns an asyncio.Queue that will receive events as they are published.
    The caller is responsible for calling unsubscribe_from_agent_events when done.

    Args:
        case_id: UUID string of the case to subscribe to.

    Returns:
        Queue that receives SSEEvent dicts with 'event' and 'data' keys.
    """
    queue: asyncio.Queue[SSEEvent] = asyncio.Queue(maxsize=100)
    _agent_subscribers[case_id].append(queue)
    logger.debug(
        "Agent event subscriber added for case=%s (total=%d)",
        case_id,
        len(_agent_subscribers[case_id]),
    )
    return queue


def unsubscribe_from_agent_events(case_id: str, queue: asyncio.Queue[SSEEvent]) -> None:
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
    # Copy dict to avoid mutating caller's data (prevents side effects)
    data_to_send = data.copy()

    # Ensure `type` is always present in the payload so the frontend
    # validation switch (which dispatches on `data.type`) never sees
    # `undefined`.  Direct emitters already include it, but callback-
    # sourced events from create_sse_publish_fn() may not.
    if "type" not in data_to_send:
        data_to_send["type"] = event_type.value

    event: SSEEvent = {"event": event_type.value, "data": json.dumps(data_to_send)}
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
    total_duration_ms: int | None = None,
    total_input_tokens: int | None = None,
    total_output_tokens: int | None = None,
) -> None:
    """Emit a processing-complete event when all agents finish.

    Args:
        case_id: UUID string of the case.
        files_processed: Number of files that were analyzed.
        entities_created: Number of entities extracted.
        relationships_created: Number of relationships discovered.
        total_duration_ms: Total pipeline duration in milliseconds.
        total_input_tokens: Sum of input tokens across all agents.
        total_output_tokens: Sum of output tokens across all agents.
    """
    data: dict[str, Any] = {
        "type": AgentEventType.PROCESSING_COMPLETE.value,
        "caseId": case_id,
        "filesProcessed": files_processed,
        "entitiesCreated": entities_created,
        "relationshipsCreated": relationships_created,
    }
    if total_duration_ms is not None:
        data["totalDurationMs"] = total_duration_ms
    if total_input_tokens is not None:
        data["totalInputTokens"] = total_input_tokens
    if total_output_tokens is not None:
        data["totalOutputTokens"] = total_output_tokens
    await publish_agent_event(
        case_id,
        AgentEventType.PROCESSING_COMPLETE,
        data,
    )


async def emit_thinking_update(
    case_id: str,
    agent_type: str,
    thought: str,
    token_delta: dict[str, int] | None = None,
) -> None:
    """Emit a thinking-update event with real-time thinking trace text.

    Fires during agent execution as each model turn produces thinking parts,
    providing a live feed of agent reasoning to the Command Center.

    Args:
        case_id: UUID string of the case.
        agent_type: Agent type (triage, orchestrator, financial, etc.).
        thought: Full untruncated thinking text from the model.
        token_delta: Optional per-turn token usage delta with keys
            inputTokens, outputTokens, thoughtsTokens.
    """
    data: dict[str, Any] = {
        "type": AgentEventType.THINKING_UPDATE.value,
        "agentType": agent_type,
        "thought": thought,
    }
    if token_delta is not None:
        data["tokenDelta"] = token_delta
    await publish_agent_event(
        case_id,
        AgentEventType.THINKING_UPDATE,
        data,
    )


async def emit_confirmation_required(
    case_id: str,
    agent_type: str,
    task_id: str,
    action_description: str,
    context: dict[str, Any] | None = None,
) -> None:
    """Emit a confirmation-required event for HITL approval workflows.

    Fires when an agent needs human approval before proceeding with
    a sensitive or destructive action.

    Args:
        case_id: UUID string of the case.
        agent_type: Agent type requesting confirmation.
        task_id: Unique identifier for this agent task.
        action_description: Human-readable description of the pending action.
        context: Optional additional context about the action.
    """
    data: dict[str, Any] = {
        "type": AgentEventType.CONFIRMATION_REQUIRED.value,
        "agentType": agent_type,
        "taskId": task_id,
        "actionDescription": action_description,
    }
    if context is not None:
        data["context"] = context
    await publish_agent_event(
        case_id,
        AgentEventType.CONFIRMATION_REQUIRED,
        data,
    )


async def emit_confirmation_resolved(
    case_id: str,
    agent_type: str,
    task_id: str,
    approved: bool,
    reason: str | None = None,
) -> None:
    """Emit a confirmation-resolved event when a HITL decision is made.

    Fires when the user approves or rejects a pending confirmation request,
    allowing the agent to proceed or abort.

    Args:
        case_id: UUID string of the case.
        agent_type: Agent type whose confirmation was resolved.
        task_id: Unique identifier for this agent task.
        approved: Whether the action was approved.
        reason: Optional user-provided reason for the decision.
    """
    data: dict[str, Any] = {
        "type": AgentEventType.CONFIRMATION_RESOLVED.value,
        "agentType": agent_type,
        "taskId": task_id,
        "approved": approved,
    }
    if reason is not None:
        data["reason"] = reason
    await publish_agent_event(
        case_id,
        AgentEventType.CONFIRMATION_RESOLVED,
        data,
    )
