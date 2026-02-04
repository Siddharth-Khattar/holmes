# ABOUTME: REST API endpoints for HITL confirmation responses.
# ABOUTME: Frontend calls these to approve/reject pending agent actions.

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.confirmation import (
    ConfirmationRequest,
    get_pending_confirmations,
    resolve_confirmation,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["confirmations"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class ConfirmationResponseBody(BaseModel):
    """Request body for responding to a pending confirmation."""

    approved: bool = Field(..., description="Whether to approve the pending action")
    reason: str | None = Field(
        default=None, description="Optional reason for the decision"
    )


class ConfirmationResolveResponse(BaseModel):
    """Response after resolving a confirmation."""

    status: str = Field(..., description="Resolution status")
    approved: bool = Field(..., description="Whether the action was approved")


class ConfirmationListResponse(BaseModel):
    """Response listing pending confirmations for a case."""

    confirmations: list[ConfirmationRequest] = Field(
        ..., description="List of pending confirmation requests"
    )
    count: int = Field(..., description="Total number of pending confirmations")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/api/cases/{case_id}/confirmations/{request_id}",
    response_model=ConfirmationResolveResponse,
    summary="Respond to a pending confirmation",
    responses={
        404: {"description": "Confirmation not found or already resolved"},
    },
)
async def respond_to_confirmation(
    case_id: UUID,
    request_id: str,
    body: ConfirmationResponseBody,
) -> ConfirmationResolveResponse:
    """Approve or reject a pending agent confirmation request.

    This unblocks the waiting pipeline coroutine, allowing the agent to
    proceed (if approved) or abort/skip (if rejected).

    No auth required for hackathon simplicity -- the SSE event is already
    scoped to the case.
    """
    resolved = resolve_confirmation(
        request_id=request_id,
        approved=body.approved,
        reason=body.reason,
    )

    if not resolved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Confirmation {request_id} not found or already resolved",
        )

    logger.info(
        "Confirmation responded via API: case=%s request_id=%s approved=%s",
        case_id,
        request_id,
        body.approved,
    )

    return ConfirmationResolveResponse(
        status="resolved",
        approved=body.approved,
    )


@router.get(
    "/api/cases/{case_id}/confirmations/pending",
    response_model=ConfirmationListResponse,
    summary="List pending confirmations for a case",
)
async def list_pending_confirmations(
    case_id: UUID,
) -> ConfirmationListResponse:
    """Return all pending confirmations for a case.

    Used by the frontend to display confirmation dialogs and notification
    badges when the user navigates to the Command Center.
    """
    pending = get_pending_confirmations(str(case_id))
    return ConfirmationListResponse(
        confirmations=pending,
        count=len(pending),
    )
