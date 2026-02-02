# ABOUTME: File upload and management API endpoints for case evidence.
# ABOUTME: Handles multipart uploads, GCS storage, and file metadata CRUD.

import logging
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import CurrentUser
from app.api.sse import publish_file_event
from app.database import get_db
from app.models import Case, CaseFile
from app.models.file import FileCategory, FileStatus
from app.schemas.common import ErrorResponse
from app.schemas.file import DownloadUrlResponse, FileListResponse, FileResponse
from app.services.file_service import (
    ALLOWED_MIME_TYPES,
    delete_from_gcs,
    detect_category,
    generate_signed_url,
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


async def get_user_file(
    db: AsyncSession,
    case_id: UUID,
    file_id: UUID,
    user_id: str,
) -> CaseFile | None:
    """
    Fetch a file ensuring case ownership and not deleted.

    Args:
        db: Database session
        case_id: UUID of the case
        file_id: UUID of the file
        user_id: ID of the current user

    Returns:
        CaseFile if found and case is owned by user, None otherwise
    """
    result = await db.execute(
        select(CaseFile)
        .join(Case, CaseFile.case_id == Case.id)
        .where(
            CaseFile.id == file_id,
            CaseFile.case_id == case_id,
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

    # Publish SSE event for real-time updates
    await publish_file_event(
        str(case_id),
        "file-uploaded",
        {
            "file_id": str(case_file.id),
            "filename": case_file.original_filename,
            "status": case_file.status.value,
            "duplicate_of": str(duplicate_of) if duplicate_of else None,
        },
    )

    return FileResponse.from_orm_with_name(case_file, duplicate_of=duplicate_of)


@router.get(
    "",
    response_model=FileListResponse,
    summary="List files in a case",
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        404: {"model": ErrorResponse, "description": "Case not found"},
    },
)
async def list_files(
    case_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
    file_status: Annotated[FileStatus | None, Query(alias="status")] = None,
    category: Annotated[FileCategory | None, Query()] = None,
) -> FileListResponse:
    """
    List all files in a case with optional filtering.

    Returns a paginated list of files ordered by creation date (newest first).
    Files can be filtered by status or category.
    """
    # Validate case ownership
    case = await get_user_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    # Build base query
    base_query = select(CaseFile).where(CaseFile.case_id == case_id)

    # Apply filters
    if file_status is not None:
        base_query = base_query.where(CaseFile.status == file_status)
    if category is not None:
        base_query = base_query.where(CaseFile.category == category)

    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination and ordering
    offset = (page - 1) * per_page
    paginated_query = (
        base_query.order_by(CaseFile.created_at.desc()).offset(offset).limit(per_page)
    )

    result = await db.execute(paginated_query)
    files = result.scalars().all()

    return FileListResponse(
        files=[FileResponse.from_orm_with_name(f) for f in files],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get(
    "/{file_id}/download",
    response_model=DownloadUrlResponse,
    summary="Get a signed URL to download a file",
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        404: {"model": ErrorResponse, "description": "File not found"},
        500: {"model": ErrorResponse, "description": "Failed to generate download URL"},
    },
)
async def get_download_url(
    case_id: UUID,
    file_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DownloadUrlResponse:
    """
    Generate a signed URL for downloading a file.

    The URL is valid for 24 hours and includes the original filename
    in the Content-Disposition header for proper download naming.
    """
    # Validate file ownership
    case_file = await get_user_file(db, case_id, file_id, current_user.id)
    if not case_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    # Generate signed URL with 24h expiration
    expiration_seconds = 86400  # 24 hours
    try:
        download_url = generate_signed_url(
            storage_path=case_file.storage_path,
            original_filename=case_file.original_filename,
            expiration_seconds=expiration_seconds,
        )
    except Exception as e:
        logger.error("Failed to generate signed URL: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL",
        ) from None

    return DownloadUrlResponse(
        download_url=download_url,
        expires_in=expiration_seconds,
    )


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a file from a case",
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        404: {"model": ErrorResponse, "description": "File not found"},
    },
)
async def delete_file(
    case_id: UUID,
    file_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """
    Delete a file from a case.

    This performs a hard delete, removing the file from both GCS storage
    and the database. The operation cannot be undone.
    """
    # Validate file ownership
    case_file = await get_user_file(db, case_id, file_id, current_user.id)
    if not case_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    # Get the case to update file count
    case = await get_user_case(db, case_id, current_user.id)

    # Delete from GCS (log error but proceed with DB delete if GCS fails)
    try:
        await delete_from_gcs(case_file.storage_path)
    except Exception as e:
        # Log but don't fail - orphan cleanup can happen later
        logger.warning(
            "Failed to delete file from GCS (will proceed with DB delete): "
            "path=%s, error=%s",
            case_file.storage_path,
            e,
        )

    # Store filename before delete for logging and SSE
    original_filename = case_file.original_filename

    # Delete from database
    await db.delete(case_file)

    # Decrement case file count
    if case and case.file_count and case.file_count > 0:
        case.file_count -= 1

    await db.commit()

    logger.info(
        "File deleted: case=%s, file=%s, name=%s",
        case_id,
        file_id,
        original_filename,
    )

    # Publish SSE event for real-time updates
    await publish_file_event(
        str(case_id),
        "file-deleted",
        {"file_id": str(file_id)},
    )
