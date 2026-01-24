# ABOUTME: Case CRUD API endpoints with user ownership enforcement.
# ABOUTME: All case operations are scoped to the authenticated user.

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import CurrentUser
from app.database import get_db
from app.models import Case, CaseStatus
from app.schemas.case import (
    CaseCreate,
    CaseListResponse,
    CaseResponse,
)

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.post(
    "",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new case",
)
async def create_case(
    case_data: CaseCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Case:
    """Create a new investigation case for the authenticated user."""
    case = Case(
        user_id=current_user.id,
        name=case_data.name,
        description=case_data.description,
        type=case_data.type,
        status=CaseStatus.DRAFT,
        file_count=0,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


@router.get(
    "",
    response_model=CaseListResponse,
    summary="List user's cases",
)
async def list_cases(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    per_page: Annotated[int, Query(ge=1, le=100, description="Cases per page")] = 20,
    sort_by: Annotated[str, Query(description="Sort field")] = "updated_at",
    sort_order: Annotated[str, Query(description="Sort direction")] = "desc",
) -> CaseListResponse:
    """List all cases belonging to the authenticated user."""
    # Base query: user's non-deleted cases
    base_query = select(Case).where(
        Case.user_id == current_user.id,
        Case.deleted_at.is_(None),
    )

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = getattr(Case, sort_by, Case.updated_at)
    if sort_order == "desc":
        base_query = base_query.order_by(sort_column.desc())
    else:
        base_query = base_query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * per_page
    base_query = base_query.offset(offset).limit(per_page)

    # Execute
    result = await db.execute(base_query)
    cases = list(result.scalars().all())

    return CaseListResponse(
        cases=cases,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get(
    "/{case_id}",
    response_model=CaseResponse,
    summary="Get a single case",
)
async def get_case(
    case_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Case:
    """Get a single case by ID if owned by the authenticated user."""
    result = await db.execute(
        select(Case).where(
            Case.id == case_id,
            Case.user_id == current_user.id,
            Case.deleted_at.is_(None),
        )
    )
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    return case


@router.delete(
    "/{case_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a case",
)
async def delete_case(
    case_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Soft delete a case by setting deleted_at timestamp."""
    result = await db.execute(
        select(Case).where(
            Case.id == case_id,
            Case.user_id == current_user.id,
            Case.deleted_at.is_(None),
        )
    )
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    case.deleted_at = datetime.now(UTC)
    await db.commit()
