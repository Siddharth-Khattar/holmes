# ABOUTME: Human-in-the-loop confirmation service for pipeline pause/resume.
# ABOUTME: Uses asyncio.Event to block pipeline coroutines while waiting for user decisions.

import asyncio
import logging
from datetime import UTC, datetime
from uuid import uuid4

from pydantic import BaseModel, Field

from app.services.agent_events import (
    emit_confirmation_required,
    emit_confirmation_resolved,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class ConfirmationRequest(BaseModel):
    """Data describing a pending confirmation request."""

    request_id: str = Field(..., description="Unique ID for this confirmation request")
    case_id: str = Field(..., description="Case this confirmation belongs to")
    agent_type: str = Field(
        ..., description="Agent type requesting confirmation (e.g. financial, legal)"
    )
    action_description: str = Field(
        ..., description="Human-readable description of the pending action"
    )
    affected_items: list[str] = Field(
        default_factory=list,
        description="List of items (file names, entity IDs) affected by the action",
    )
    context: dict[str, object] = Field(
        default_factory=dict,
        description="Additional context about the action for frontend display",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="When the confirmation was requested",
    )


class ConfirmationResult(BaseModel):
    """User's response to a confirmation request."""

    approved: bool = Field(..., description="Whether the action was approved")
    reason: str | None = Field(
        default=None, description="Optional user-provided reason for the decision"
    )
    responded_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="When the user responded",
    )


# ---------------------------------------------------------------------------
# In-memory stores (suitable for single-instance hackathon deployment)
# ---------------------------------------------------------------------------

# Maps request_id -> asyncio.Event for pause/resume signaling
_pending_confirmations: dict[str, asyncio.Event] = {}

# Maps request_id -> user's response once they approve/reject
_confirmation_results: dict[str, ConfirmationResult] = {}

# Maps request_id -> original request data (for listing and frontend display)
_confirmation_requests: dict[str, ConfirmationRequest] = {}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def request_confirmation(
    case_id: str,
    agent_type: str,
    action_description: str,
    affected_items: list[str],
    context: dict[str, object] | None = None,
) -> ConfirmationResult:
    """Request human confirmation before proceeding with an agent action.

    Creates an asyncio.Event, emits an SSE event to notify the frontend, then
    blocks the calling coroutine via ``await event.wait()`` until the user
    responds through the REST API. The event loop remains free to handle other
    requests while the pipeline coroutine is suspended.

    No timeout -- the pipeline waits indefinitely per CONTEXT.md.

    Args:
        case_id: UUID string of the case.
        agent_type: Agent type requesting confirmation (e.g. ``"financial"``).
        action_description: Human-readable description of the pending action.
        affected_items: List of affected items (file names, entity IDs, etc.).
        context: Optional additional context for the frontend.

    Returns:
        ConfirmationResult with the user's approval decision.
    """
    request_id = str(uuid4())
    event = asyncio.Event()

    # Store the event and request data
    _pending_confirmations[request_id] = event
    _confirmation_requests[request_id] = ConfirmationRequest(
        request_id=request_id,
        case_id=case_id,
        agent_type=agent_type,
        action_description=action_description,
        affected_items=affected_items,
        context=context or {},
    )

    logger.info(
        "Confirmation requested: request_id=%s case=%s agent=%s action=%s",
        request_id,
        case_id,
        agent_type,
        action_description,
    )

    # Notify connected SSE clients about the pending confirmation
    await emit_confirmation_required(
        case_id=case_id,
        agent_type=agent_type,
        task_id=request_id,
        action_description=action_description,
        context={"affectedItems": affected_items, **(context or {})},
    )

    # Block this coroutine until user responds (does NOT block the event loop)
    await event.wait()

    # Retrieve and clean up
    result = _confirmation_results.pop(request_id)
    _pending_confirmations.pop(request_id, None)
    _confirmation_requests.pop(request_id, None)

    logger.info(
        "Confirmation resolved: request_id=%s approved=%s reason=%s",
        request_id,
        result.approved,
        result.reason,
    )

    return result


def resolve_confirmation(
    request_id: str,
    approved: bool,
    reason: str | None = None,
) -> bool:
    """Resolve a pending confirmation request, unblocking the waiting pipeline.

    Called by the REST API when a user approves or rejects a confirmation.

    Args:
        request_id: The confirmation request ID to resolve.
        approved: Whether the action was approved.
        reason: Optional user-provided reason for the decision.

    Returns:
        True if the confirmation was found and resolved, False if not found.
    """
    event = _pending_confirmations.get(request_id)
    if event is None:
        logger.warning(
            "Confirmation not found: request_id=%s (already resolved or invalid)",
            request_id,
        )
        return False

    # Store the result before signaling, so the waiting coroutine can read it
    _confirmation_results[request_id] = ConfirmationResult(
        approved=approved,
        reason=reason,
    )

    # Look up the original request for SSE event emission
    original = _confirmation_requests.get(request_id)
    case_id = original.case_id if original else ""
    agent_type = original.agent_type if original else "unknown"

    # Unblock the waiting pipeline coroutine
    event.set()

    logger.info(
        "Confirmation resolved via API: request_id=%s approved=%s",
        request_id,
        approved,
    )

    # Emit SSE event asynchronously (best-effort from sync context)
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            emit_confirmation_resolved(
                case_id=case_id,
                agent_type=agent_type,
                task_id=request_id,
                approved=approved,
                reason=reason,
            )
        )
    except RuntimeError:
        # No running event loop -- skip SSE emission (unlikely in FastAPI)
        logger.debug(
            "No event loop for SSE emission of confirmation-resolved: request_id=%s",
            request_id,
        )

    return True


def get_pending_confirmations(case_id: str) -> list[ConfirmationRequest]:
    """Return all pending confirmations for a case.

    Args:
        case_id: UUID string of the case.

    Returns:
        List of ConfirmationRequest objects with pending status.
    """
    return [req for req in _confirmation_requests.values() if req.case_id == case_id]


def get_pending_confirmation_count(case_id: str) -> int:
    """Return the number of pending confirmations for a case.

    Useful for notification badge counts in the frontend.

    Args:
        case_id: UUID string of the case.

    Returns:
        Count of pending confirmations.
    """
    return sum(1 for req in _confirmation_requests.values() if req.case_id == case_id)
