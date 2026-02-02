# ABOUTME: File upload and management API endpoints for case evidence.
# ABOUTME: Handles multipart uploads, GCS storage, and file metadata CRUD.

import logging
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import CurrentUser
from app.database import get_db
from app.models import Case, CaseFile
from app.models.file import FileCategory, FileStatus
from app.schemas.common import ErrorResponse
from app.schemas.file import FileResponse
from app.services.file_service import (
    ALLOWED_MIME_TYPES,
    detect_category,
    upload_to_gcs,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cases/{case_id}/files", tags=["files"])


async def get_user_case(
    db: AsyncSession,
    case_id: UUID,
    user_id: str,
) -> Case | None:
    """
    Fetch a case ensuring ownership and not deleted.

    Args:
        db: Database session
        case_id: UUID of the case
        user_id: ID of the current user

    Returns:
        Case if found and owned by user, None otherwise
    """
    result = await db.execute(
        select(Case).where(
            Case.id == case_id,
            Case.user_id == user_id,
            Case.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


@router.post(
    "",
    response_model=FileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file to a case",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file type or size"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        404: {"model": ErrorResponse, "description": "Case not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def upload_file(
    case_id: UUID,
    file: UploadFile,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    description: Annotated[str | None, Form()] = None,
    latitude: Annotated[float | None, Form(ge=-90, le=90)] = None,
    longitude: Annotated[float | None, Form(ge=-180, le=180)] = None,
) -> FileResponse:
    """
    Upload an evidence file to a case.

    The file is streamed to GCS in chunks to handle large files (up to 500MB).
    A SHA-256 content hash is computed during upload for duplicate detection.

    Supported file types:
    - Documents: PDF, DOCX, XLSX, PPTX
    - Images: JPEG, PNG, GIF, WebP
    - Video: MP4, MOV, WebM
    - Audio: MP3, WAV, M4A
    """
    # Validate case ownership
    case = await get_user_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    # Validate MIME type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{content_type}' is not allowed. Supported types: PDF, images, video, audio, Office documents.",
        )

    # Generate file UUID
    file_uuid = uuid4()

    # Upload to GCS
    try:
        storage_path, size_bytes, content_hash = await upload_to_gcs(
            file, case_id, file_uuid
        )
    except ValueError as e:
        # File size exceeded
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from None
    except Exception as e:
        logger.error("GCS upload failed for case %s: %s", case_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file. Please try again.",
        ) from None

    # Check for duplicate content within the same case
    duplicate_of: UUID | None = None
    result = await db.execute(
        select(CaseFile).where(
            CaseFile.case_id == case_id,
            CaseFile.content_hash == content_hash,
        )
    )
    existing_file = result.scalar_one_or_none()
    if existing_file:
        duplicate_of = existing_file.id
        logger.info(
            "Duplicate file detected: new=%s, existing=%s, hash=%s",
            file_uuid,
            existing_file.id,
            content_hash,
        )

    # Detect category from MIME type
    category: FileCategory = detect_category(content_type)

    # Create database record
    case_file = CaseFile(
        id=file_uuid,
        case_id=case_id,
        original_filename=file.filename or "unnamed",
        storage_path=storage_path,
        mime_type=content_type,
        size_bytes=size_bytes,
        category=category,
        status=FileStatus.UPLOADED,
        content_hash=content_hash,
        description=description,
        latitude=latitude,
        longitude=longitude,
    )
    db.add(case_file)

    # Increment case file count
    case.file_count = (case.file_count or 0) + 1

    await db.commit()
    await db.refresh(case_file)

    logger.info(
        "File uploaded: case=%s, file=%s, name=%s, size=%d",
        case_id,
        file_uuid,
        file.filename,
        size_bytes,
    )

    return FileResponse.from_orm_with_name(case_file, duplicate_of=duplicate_of)
