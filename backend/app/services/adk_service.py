# ABOUTME: ADK service layer for Runner, session, and artifact management.
# ABOUTME: Provides stage-isolated sessions, file preparation, and service singletons.

import asyncio
import hashlib
import logging
import os
import tempfile
from typing import TYPE_CHECKING
from uuid import UUID

from google.adk.artifacts import GcsArtifactService
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService, Session

# google-cloud-storage doesn't ship type stubs (no py.typed marker)
# See: https://github.com/googleapis/python-storage/issues/393
from google.cloud import storage  # type: ignore[import-untyped,attr-defined]
from google.genai import types

if TYPE_CHECKING:
    from google.adk.agents.base_agent import BaseAgent

from app.config import get_settings
from app.models.file import CaseFile

logger = logging.getLogger(__name__)

# Singleton service instances (lazily initialized)
_session_service: DatabaseSessionService | None = None
_artifact_service: GcsArtifactService | None = None


def get_session_service() -> DatabaseSessionService:
    """Get or create the singleton DatabaseSessionService.

    Uses postgresql+asyncpg:// URL for async operations.
    Note: For schema migrations, run separately with sync driver:
        adk migrate session --db-url="postgresql+psycopg2://..."
    """
    global _session_service
    if _session_service is None:
        settings = get_settings()
        if not settings.database_url:
            raise RuntimeError(
                "DATABASE_URL is required to initialize ADK session service"
            )
        _session_service = DatabaseSessionService(db_url=settings.database_url)
        logger.info("Initialized ADK DatabaseSessionService")
    return _session_service


def get_artifact_service() -> GcsArtifactService:
    """Get or create the singleton GcsArtifactService.

    Uses adk_artifacts_bucket setting, falling back to gcs_bucket.
    The bucket must already exist (ADK does not create it).
    """
    global _artifact_service
    if _artifact_service is None:
        settings = get_settings()
        bucket_name = settings.adk_artifacts_bucket or settings.gcs_bucket
        if not bucket_name:
            raise RuntimeError(
                "ADK_ARTIFACTS_BUCKET or GCS_BUCKET is required "
                "to initialize ADK artifact service"
            )
        _artifact_service = GcsArtifactService(bucket_name=bucket_name)
        logger.info("Initialized ADK GcsArtifactService with bucket=%s", bucket_name)
    return _artifact_service


def create_stage_runner(
    agent: "BaseAgent",
) -> Runner:
    """Create a Runner for a single pipeline stage.

    Each pipeline stage (triage, orchestrator, domain, synthesis) gets its own
    Runner invocation. This enables stage-isolated sessions where each agent
    gets a fresh context window without inherited multimodal file content.

    Args:
        agent: The root agent for this pipeline stage.

    Returns:
        Configured Runner with session and artifact services.
    """
    settings = get_settings()
    return Runner(
        agent=agent,
        session_service=get_session_service(),
        artifact_service=get_artifact_service(),
        app_name=settings.adk_app_name,
    )


def create_session_id(case_id: UUID, workflow_id: UUID, stage: str) -> str:
    """Create a deterministic session ID for a pipeline stage.

    Each stage gets a FRESH session to prevent context window bloat from
    multimodal file content propagating across stages.

    Args:
        case_id: The investigation case UUID.
        workflow_id: The analysis workflow UUID.
        stage: Pipeline stage name (e.g. "triage", "orchestrator", "financial").

    Returns:
        SHA-256 hex digest (64 chars) as session ID.
    """
    composite = f"{case_id}:{workflow_id}:{stage}"
    return hashlib.sha256(composite.encode()).hexdigest()


async def get_or_create_stage_session(
    user_id: str,
    case_id: UUID,
    workflow_id: UUID,
    stage: str,
    initial_state: dict[str, object] | None = None,
) -> Session:
    """Idempotent session creation for a pipeline stage.

    Each stage gets a clean session with only the data it needs.
    Inter-stage data flows via the database (agent_executions table),
    NOT via shared session state.

    Args:
        user_id: The user running the analysis.
        case_id: The investigation case UUID.
        workflow_id: The analysis workflow UUID.
        stage: Pipeline stage name.
        initial_state: Optional state to seed the session with.

    Returns:
        An ADK Session (existing or newly created).
    """
    settings = get_settings()
    session_service = get_session_service()
    session_id = create_session_id(case_id, workflow_id, stage)

    existing = await session_service.get_session(
        app_name=settings.adk_app_name,
        user_id=user_id,
        session_id=session_id,
    )
    if existing:
        return existing

    return await session_service.create_session(
        app_name=settings.adk_app_name,
        user_id=user_id,
        session_id=session_id,
        state={
            "case_id": str(case_id),
            "workflow_id": str(workflow_id),
            "stage": stage,
            **(initial_state or {}),
        },
    )


# ---------------------------------------------------------------------------
# File preparation utilities
# ---------------------------------------------------------------------------


async def prepare_file_inline(
    gcs_bucket: str,
    storage_path: str,
    mime_type: str,
) -> types.Part:
    """Download file from GCS and encode as inline_data.

    Works with both AI Studio (API key) and Vertex AI backends.
    Suitable for files up to ~100 MB.
    """
    client = storage.Client()
    bucket = client.bucket(gcs_bucket)
    blob = bucket.blob(storage_path)
    file_bytes = await asyncio.to_thread(blob.download_as_bytes)

    return types.Part(
        inline_data=types.Blob(
            data=file_bytes,
            mime_type=mime_type,
        )
    )


async def prepare_file_via_api(
    gcs_bucket: str,
    storage_path: str,
    mime_type: str,
    original_filename: str,
) -> types.Part:
    """Upload large file to Gemini File API and return a URI reference.

    File API supports up to 2 GB per file, 20 GB per project.
    Files are retained for 48 hours and reusable across multiple calls.
    """
    from google import genai

    # Download from GCS to a temp file
    gcs_client = storage.Client()
    bucket = gcs_client.bucket(gcs_bucket)
    blob = bucket.blob(storage_path)

    ext = ""
    if "." in original_filename:
        ext = "." + original_filename.rsplit(".", 1)[1].lower()

    fd, tmp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)

    try:
        await asyncio.to_thread(blob.download_to_filename, tmp_path)

        # Upload to Gemini File API
        genai_client = genai.Client()
        uploaded = genai_client.files.upload(
            file=tmp_path,
            config={"mime_type": mime_type, "display_name": original_filename},
        )

        # Wait for processing with timeout and backoff (needed for video/audio)
        max_file_api_wait_s = 300  # 5 min
        elapsed = 0.0
        poll_interval = 2.0
        while uploaded.state and uploaded.state.name == "PROCESSING":
            if elapsed >= max_file_api_wait_s:
                raise RuntimeError(
                    f"File API timed out after {max_file_api_wait_s}s: {uploaded.name}"
                )
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
            poll_interval = min(poll_interval * 1.5, 15.0)
            # Type narrowing: uploaded.name is guaranteed non-None after successful upload
            file_name = uploaded.name
            if file_name is None:
                raise RuntimeError(
                    "File API returned file without name - upload may have failed"
                )
            uploaded = genai_client.files.get(name=file_name)

        if uploaded.state and uploaded.state.name == "FAILED":
            raise RuntimeError(f"File API processing failed: {uploaded.name}")

        return types.Part(
            file_data=types.FileData(
                file_uri=uploaded.uri,
                mime_type=uploaded.mime_type,
            )
        )
    finally:
        os.unlink(tmp_path)


async def prepare_file_for_agent(
    file: CaseFile,
    gcs_bucket: str,
) -> types.Part:
    """Prepare a file for Gemini using the appropriate method based on size.

    Files <= file_api_threshold (default 100 MB) are sent as inline data.
    Larger files are uploaded to the Gemini File API for a URI reference.
    """
    settings = get_settings()

    if file.size_bytes <= settings.file_api_threshold:
        return await prepare_file_inline(gcs_bucket, file.storage_path, file.mime_type)

    return await prepare_file_via_api(
        gcs_bucket,
        file.storage_path,
        file.mime_type,
        file.original_filename,
    )


async def build_agent_content(
    files: list[CaseFile],
    gcs_bucket: str,
    prompt: str,
) -> types.Content:
    """Build multimodal content with file parts and a text prompt.

    Used to construct the user message sent to any pipeline-stage agent.
    Each file is preceded by a label part with filename and ID.
    """
    parts: list[types.Part] = [types.Part(text=prompt)]

    for f in files:
        parts.append(
            types.Part(text=f"\n\n--- File: {f.original_filename} (ID: {f.id}) ---")
        )
        file_part = await prepare_file_for_agent(f, gcs_bucket)
        parts.append(file_part)

    return types.Content(role="user", parts=parts)


async def build_domain_agent_content(
    files: list[CaseFile],
    gcs_bucket: str,
    prompt: str,
) -> types.Content:
    """Build multimodal content for domain agents.

    Unlike build_agent_content (used by triage), this function forces
    video and audio files through the File API regardless of size.
    VideoMetadata is more reliable with File API URI references than
    with inline data (known Gemini API issue -- see RESEARCH.md Pitfall 6).

    Args:
        files: Case files to include as multimodal parts.
        gcs_bucket: GCS bucket name for file downloads.
        prompt: Text prompt to prepend before file parts.

    Returns:
        A Content object with role="user" containing the prompt and file parts.
    """
    parts: list[types.Part] = [types.Part(text=prompt)]

    for f in files:
        parts.append(
            types.Part(text=f"\n\n--- File: {f.original_filename} (ID: {f.id}) ---")
        )
        # Force File API for video/audio regardless of size to avoid
        # VideoMetadata + inline data 500 error
        if f.mime_type.startswith(("video/", "audio/")):
            file_part = await prepare_file_via_api(
                gcs_bucket, f.storage_path, f.mime_type, f.original_filename
            )
        else:
            file_part = await prepare_file_for_agent(f, gcs_bucket)
        parts.append(file_part)

    return types.Content(role="user", parts=parts)
