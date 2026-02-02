# ABOUTME: File service for GCS upload/download operations.
# ABOUTME: Handles chunked streaming, content hashing, and file type validation.

import hashlib
import logging
from datetime import timedelta
from urllib.parse import quote
from uuid import UUID

from fastapi import UploadFile

from app.models.file import FileCategory
from app.storage import get_bucket

logger = logging.getLogger(__name__)

# Allowed MIME types per CONTEXT.md whitelist
ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    [
        # Documents
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        # Images
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        # Video
        "video/mp4",
        "video/quicktime",
        "video/webm",
        # Audio
        "audio/mpeg",
        "audio/wav",
        "audio/x-m4a",
    ]
)

# Maximum file size: 500MB
MAX_FILE_SIZE: int = 500 * 1024 * 1024

# Chunk size for streaming uploads: 8MB
CHUNK_SIZE: int = 8 * 1024 * 1024


def detect_category(mime_type: str) -> FileCategory:
    """
    Map MIME type to FileCategory enum.

    Args:
        mime_type: The MIME type string (e.g., 'application/pdf')

    Returns:
        FileCategory enum value based on MIME type prefix
    """
    if mime_type.startswith("image/"):
        return FileCategory.IMAGE
    elif mime_type.startswith("video/"):
        return FileCategory.VIDEO
    elif mime_type.startswith("audio/"):
        return FileCategory.AUDIO
    else:
        # Default to DOCUMENT for application/* types
        return FileCategory.DOCUMENT


async def upload_to_gcs(
    file: UploadFile,
    case_id: UUID,
    file_uuid: UUID,
) -> tuple[str, int, str]:
    """
    Stream upload a file to GCS in chunks while computing SHA-256 hash.

    Args:
        file: The FastAPI UploadFile object
        case_id: UUID of the case this file belongs to
        file_uuid: UUID to use for the file in storage

    Returns:
        Tuple of (storage_path, total_bytes, content_hash)

    Raises:
        ValueError: If file exceeds MAX_FILE_SIZE
        Exception: On GCS upload errors
    """
    # Extract extension from original filename
    original_filename = file.filename or "file"
    ext = ""
    if "." in original_filename:
        ext = original_filename.rsplit(".", 1)[1].lower()

    # Construct storage path: cases/{case_id}/files/{file_uuid}.{ext}
    if ext:
        storage_path = f"cases/{case_id}/files/{file_uuid}.{ext}"
    else:
        storage_path = f"cases/{case_id}/files/{file_uuid}"

    # Get GCS bucket and blob
    bucket = get_bucket()
    blob = bucket.blob(storage_path)

    # Initialize hash computation
    sha256_hash = hashlib.sha256()
    total_bytes = 0

    # Use resumable upload for large files
    # We'll collect chunks and upload in one go since google-cloud-storage
    # doesn't have async support - we stream read but upload synchronously
    chunks: list[bytes] = []

    try:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break

            total_bytes += len(chunk)

            # Check size limit during upload
            if total_bytes > MAX_FILE_SIZE:
                # Clean up any partial data
                raise ValueError(
                    f"File exceeds maximum size of {MAX_FILE_SIZE // (1024 * 1024)}MB"
                )

            # Update hash
            sha256_hash.update(chunk)
            chunks.append(chunk)

        # Combine chunks and upload
        file_content = b"".join(chunks)

        # Set content type for proper serving
        content_type = file.content_type or "application/octet-stream"
        blob.upload_from_string(file_content, content_type=content_type)

        # Compute final hash
        content_hash = sha256_hash.hexdigest()

        logger.info(
            "Uploaded file to GCS: path=%s, size=%d, hash=%s",
            storage_path,
            total_bytes,
            content_hash,
        )

        return storage_path, total_bytes, content_hash

    except ValueError:
        # Re-raise size limit errors
        raise
    except Exception as e:
        # Try to clean up partial upload on error
        try:
            if blob.exists():
                blob.delete()
        except Exception:
            pass
        logger.error("GCS upload failed: %s", e)
        raise


async def delete_from_gcs(storage_path: str) -> bool:
    """
    Delete a file from GCS.

    Args:
        storage_path: The GCS path of the file to delete

    Returns:
        True if file was deleted, False if file was not found
    """
    try:
        bucket = get_bucket()
        blob = bucket.blob(storage_path)

        if not blob.exists():
            logger.warning("File not found in GCS: %s", storage_path)
            return False

        blob.delete()
        logger.info("Deleted file from GCS: %s", storage_path)
        return True

    except Exception as e:
        logger.error("Failed to delete file from GCS: %s - %s", storage_path, e)
        raise


def generate_signed_url(
    storage_path: str,
    original_filename: str,
    expiration_seconds: int = 86400,
) -> str:
    """
    Generate a V4 signed URL for downloading a file from GCS.

    Args:
        storage_path: The GCS path of the file
        original_filename: The original filename for Content-Disposition header
        expiration_seconds: URL validity period in seconds (default 24 hours)

    Returns:
        Signed URL string

    Raises:
        Exception: On GCS signing errors
    """
    bucket = get_bucket()
    blob = bucket.blob(storage_path)

    # RFC 5987 encoding for Content-Disposition filename
    # This handles non-ASCII characters in filenames
    encoded_filename = quote(original_filename, safe="")
    content_disposition = f"attachment; filename*=UTF-8''{encoded_filename}"

    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(seconds=expiration_seconds),
        method="GET",
        response_disposition=content_disposition,
    )

    logger.info(
        "Generated signed URL: path=%s, expires_in=%ds",
        storage_path,
        expiration_seconds,
    )

    return url
