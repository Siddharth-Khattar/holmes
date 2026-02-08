# ABOUTME: API endpoints for case notes (Sherlock's Diary).
# ABOUTME: Handles note CRUD, audio uploads, AI metadata generation, and evidence export.

import hashlib
import io
import logging
from datetime import timedelta
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import CurrentUser
from app.database import get_db
from app.models.case import Case
from app.models.file import CaseFile, FileCategory, FileStatus
from app.models.note import CaseNote, NoteType as ModelNoteType
from app.schemas.notes import (
    AudioDownloadResponse,
    GenerateMetadataResponse,
    NoteCreate,
    NoteExportRequest,
    NoteExportResponse,
    NoteListResponse,
    NoteResponse,
    NoteType,
    NoteUpdate,
)
from app.services.file_service import (
    CHUNK_SIZE,
    MAX_FILE_SIZE,
    generate_signed_url,
    upload_to_gcs,
)
from app.storage import get_bucket

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cases/{case_id}/notes", tags=["notes"])

# Allowed audio MIME types
ALLOWED_AUDIO_TYPES = frozenset([
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "audio/mp4",
    "audio/ogg",
])


async def get_user_case(
    db: AsyncSession,
    case_id: UUID,
    user_id: str,
) -> Case | None:
    """Fetch a case ensuring ownership."""
    result = await db.execute(
        select(Case).where(
            Case.id == case_id,
            Case.user_id == user_id,
            Case.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def get_user_note(
    db: AsyncSession,
    case_id: UUID,
    note_id: UUID,
    user_id: str,
) -> CaseNote | None:
    """Fetch a note ensuring case ownership."""
    result = await db.execute(
        select(CaseNote)
        .join(Case)
        .where(
            CaseNote.id == note_id,
            CaseNote.case_id == case_id,
            Case.user_id == user_id,
            Case.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    case_id: UUID,
    note_data: NoteCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CaseNote:
    """
    Create a new text note.

    For audio notes, use the audio upload endpoint first, then create the note
    with the returned storage path.
    """
    case = await get_user_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if note_data.type == NoteType.AUDIO:
        raise HTTPException(
            status_code=400,
            detail="Audio notes must be created via the audio upload endpoint",
        )

    note = CaseNote(
        case_id=case_id,
        user_id=current_user.id,
        type=ModelNoteType.TEXT,
        content=note_data.content,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    logger.info("Created text note: id=%s, case_id=%s", note.id, case_id)
    return note


@router.post("/audio", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_audio_note(
    case_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    duration_seconds: Annotated[int | None, Form()] = None,
) -> CaseNote:
    """
    Upload an audio recording and create an audio note.

    The audio file is stored in GCS and a note record is created.
    """
    case = await get_user_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Validate MIME type
    content_type = file.content_type or "application/octet-stream"
    # Handle mime types with parameters (e.g. audio/webm;codecs=opus)
    base_content_type = content_type.split(";")[0].strip()
    
    if base_content_type not in ALLOWED_AUDIO_TYPES:
        logger.warning(f"Rejected audio upload with content_type: {content_type} (base: {base_content_type})")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {content_type}. Allowed: {', '.join(ALLOWED_AUDIO_TYPES)}",
        )

    # Generate unique ID for the note
    note_id = uuid4()

    # Extract extension
    original_filename = file.filename or "audio"
    ext = "mp3"  # Default
    if "." in original_filename:
        ext = original_filename.rsplit(".", 1)[1].lower()

    # Construct storage path for audio notes
    storage_path = f"cases/{case_id}/notes/{note_id}.{ext}"

    # Upload to GCS
    bucket = get_bucket()
    blob = bucket.blob(storage_path)

    # Stream upload with hash computation
    sha256_hash = hashlib.sha256()
    total_bytes = 0
    chunks: list[bytes] = []

    try:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024 * 1024)}MB",
                )
            sha256_hash.update(chunk)
            chunks.append(chunk)

        file_content = b"".join(chunks)
        blob.upload_from_string(file_content, content_type=content_type)

        logger.info("Uploaded audio to GCS: path=%s, size=%d", storage_path, total_bytes)

    except HTTPException:
        raise
    except Exception as e:
        # Clean up on error
        try:
            if blob.exists():
                blob.delete()
        except Exception:
            pass
        logger.error("Audio upload failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to upload audio")

    # Create the note record
    note = CaseNote(
        id=note_id,
        case_id=case_id,
        user_id=current_user.id,
        type=ModelNoteType.AUDIO,
        audio_storage_path=storage_path,
        audio_duration_seconds=duration_seconds,
        audio_mime_type=content_type,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    logger.info("Created audio note: id=%s, case_id=%s", note.id, case_id)
    return note


@router.get("", response_model=NoteListResponse)
async def list_notes(
    case_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
    note_type: Annotated[NoteType | None, Query(alias="type")] = None,
) -> dict:
    """
    List all notes for a case.

    Notes are ordered by creation date (newest first).
    """
    case = await get_user_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Build query
    query = select(CaseNote).where(CaseNote.case_id == case_id)
    count_query = select(func.count()).select_from(CaseNote).where(CaseNote.case_id == case_id)

    if note_type:
        query = query.where(CaseNote.type == note_type)
        count_query = count_query.where(CaseNote.type == note_type)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination and ordering
    query = query.order_by(CaseNote.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    notes = result.scalars().all()

    return {
        "notes": notes,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    case_id: UUID,
    note_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CaseNote:
    """Get a single note by ID."""
    note = await get_user_note(db, case_id, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    case_id: UUID,
    note_id: UUID,
    note_data: NoteUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CaseNote:
    """Update a note's content or metadata."""
    note = await get_user_note(db, case_id, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Update fields if provided
    if note_data.content is not None and note.type == ModelNoteType.TEXT:
        note.content = note_data.content
    if note_data.title is not None:
        note.title = note_data.title
    if note_data.subtitle is not None:
        note.subtitle = note_data.subtitle

    await db.commit()
    await db.refresh(note)

    logger.info("Updated note: id=%s", note_id)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    case_id: UUID,
    note_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete a note and its associated audio file if applicable."""
    note = await get_user_note(db, case_id, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Delete audio file from GCS if exists
    if note.audio_storage_path:
        try:
            bucket = get_bucket()
            blob = bucket.blob(note.audio_storage_path)
            if blob.exists():
                blob.delete()
                logger.info("Deleted audio from GCS: %s", note.audio_storage_path)
        except Exception as e:
            logger.warning("Failed to delete audio from GCS: %s", e)

    await db.delete(note)
    await db.commit()

    logger.info("Deleted note: id=%s", note_id)


@router.get("/{note_id}/audio", response_model=AudioDownloadResponse)
async def get_audio_url(
    case_id: UUID,
    note_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    inline: Annotated[bool, Query()] = True,
) -> dict:
    """Get a signed URL for streaming/downloading the audio file."""
    note = await get_user_note(db, case_id, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if note.type != ModelNoteType.AUDIO or not note.audio_storage_path:
        raise HTTPException(status_code=400, detail="Note is not an audio note")

    # Generate filename for download
    filename = f"note_{note_id}.mp3"
    if note.title:
        # Sanitize title for filename
        safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in note.title)
        filename = f"{safe_title[:50]}.mp3"

    url = generate_signed_url(
        storage_path=note.audio_storage_path,
        original_filename=filename,
        expiration_seconds=3600,  # 1 hour
        inline=inline,
    )

    return {
        "download_url": url,
        "expires_in": 3600,
    }


@router.post("/{note_id}/generate-metadata", response_model=GenerateMetadataResponse)
async def generate_note_metadata(
    case_id: UUID,
    note_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """
    Generate AI-powered title and subtitle for a note using Gemini.

    For text notes, uses the content directly.
    For audio notes, transcribes the audio using Gemini STT and generates title from transcription.
    """
    import os
    import json
    from datetime import datetime
    from google import genai
    from google.genai import types
    from app.config import settings

    note = await get_user_note(db, case_id, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Get API key - prefer GEMINI_API_KEY
    api_key = os.environ.get("GEMINI_API_KEY") or settings.google_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    client = genai.Client(api_key=api_key)

    # For audio notes, transcribe first
    if note.type == ModelNoteType.AUDIO:
        if not note.audio_storage_path:
            raise HTTPException(status_code=400, detail="Audio note has no audio file")
        
        try:
            # Download audio from GCS
            bucket = get_bucket()
            blob = bucket.blob(note.audio_storage_path)
            
            if not blob.exists():
                raise HTTPException(status_code=404, detail="Audio file not found in storage")
            
            audio_data = blob.download_as_bytes()
            logger.info("Downloaded audio for transcription: %d bytes", len(audio_data))
            
            # Get MIME type
            mime_type = note.audio_mime_type or "audio/mpeg"
            
            # Transcribe using Gemini
            transcription_prompt = """Please transcribe this audio recording accurately. 
Return ONLY the transcribed text, nothing else. If the audio is empty or inaudible, return "[No speech detected]"."""
            
            contents = [
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(
                            data=audio_data,
                            mime_type=mime_type,
                        ),
                        types.Part.from_text(text=transcription_prompt),
                    ],
                )
            ]
            
            # Stream the response
            full_transcript = ""
            for chunk in client.models.generate_content_stream(
                model=settings.gemini_flash_model,
                contents=contents,
            ):
                if chunk.text:
                    full_transcript += chunk.text
            
            full_transcript = full_transcript.strip()
            logger.info("Transcribed audio: %s", full_transcript[:100] + "..." if len(full_transcript) > 100 else full_transcript)
            
            # If transcription is empty or failed, use timestamp-based title
            if not full_transcript or full_transcript == "[No speech detected]":
                created = note.created_at
                if isinstance(created, str):
                    created = datetime.fromisoformat(created.replace("Z", "+00:00"))
                
                date_str = created.strftime("%B %d, %Y")
                time_str = created.strftime("%I:%M %p")
                
                if note.audio_duration_seconds:
                    mins = note.audio_duration_seconds // 60
                    secs = note.audio_duration_seconds % 60
                    duration_str = f"{mins}:{secs:02d}" if mins > 0 else f"{secs}s"
                    title = f"Voice Note ({duration_str})"
                else:
                    title = "Voice Note"
                subtitle = f"Recorded on {date_str} at {time_str}"
            else:
                # Save transcription to note content
                note.content = full_transcript
                
                # Generate title from transcript - use the transcript as content
                content = full_transcript
                
                # Now generate title/subtitle from the transcription
                title_prompt = f"""You are helping an investigator organize their voice notes. This is a TRANSCRIPTION of an audio recording.

Analyze this transcription and generate:
1. A concise title (max 50 characters) that captures the main topic or key finding
2. A brief subtitle/summary (max 120 characters) highlighting the key points

Transcription:
{content[:2000]}

IMPORTANT: Generate a title that reflects what was SAID in the recording. Create something descriptive and useful.

Respond ONLY with valid JSON in this exact format:
{{"title": "Your Title Here", "subtitle": "Your subtitle here"}}"""

                response = client.models.generate_content(
                    model=settings.gemini_flash_model,
                    contents=title_prompt,
                )
                
                # Parse response
                response_text = response.text.strip()
                # Remove markdown code blocks if present
                if response_text.startswith("```"):
                    lines = response_text.split("\n")
                    json_lines = []
                    in_block = False
                    for line in lines:
                        if line.startswith("```"):
                            in_block = not in_block
                            continue
                        if in_block:
                            json_lines.append(line)
                    response_text = "\n".join(json_lines).strip()
                
                try:
                    metadata = json.loads(response_text)
                    title = metadata.get("title", "Voice Note")[:255]
                    subtitle = metadata.get("subtitle", "")
                except json.JSONDecodeError:
                    # Fallback - use first part of transcript
                    title = (content[:47] + "...") if len(content) > 50 else content
                    subtitle = ""
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Failed to transcribe audio: %s", e)
            # Fallback to timestamp-based title
            created = note.created_at
            if isinstance(created, str):
                created = datetime.fromisoformat(created.replace("Z", "+00:00"))
            
            date_str = created.strftime("%B %d, %Y")
            time_str = created.strftime("%I:%M %p")
            
            if note.audio_duration_seconds:
                mins = note.audio_duration_seconds // 60
                secs = note.audio_duration_seconds % 60
                duration_str = f"{mins}:{secs:02d}" if mins > 0 else f"{secs}s"
                title = f"Voice Note ({duration_str})"
            else:
                title = "Voice Note"
            subtitle = f"Recording from {date_str}"
        
        # Update note with generated metadata
        note.title = title
        note.subtitle = subtitle
        await db.commit()
        
        logger.info("Generated metadata for audio note: id=%s, title=%s", note_id, title)
        return {
            "note_id": note_id,
            "title": title,
            "subtitle": subtitle,
            "content": note.content,
        }

    # For text notes, use AI to generate title
    if not note.content:
        raise HTTPException(status_code=400, detail="Note has no content to analyze")
    
    content = note.content

    # Generate metadata using Gemini
    try:
        prompt = f"""You are helping an investigator organize their notes. Analyze this investigative note and generate:
1. A concise title (max 50 characters) that captures the main topic or key finding
2. A brief subtitle/summary (max 120 characters) highlighting the key points

Note content:
{content[:2000]}

IMPORTANT: Generate a title that reflects the ACTUAL content of the note.

Respond ONLY with valid JSON in this exact format:
{{"title": "Your Title Here", "subtitle": "Your subtitle here"}}"""

        response = client.models.generate_content(
            model=settings.gemini_flash_model,
            contents=prompt,
        )

        # Parse response
        response_text = response.text.strip()
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Find the JSON content between the code blocks
            json_lines = []
            in_block = False
            for line in lines:
                if line.startswith("```"):
                    in_block = not in_block
                    continue
                if in_block:
                    json_lines.append(line)
            response_text = "\n".join(json_lines).strip()

        metadata = json.loads(response_text)
        title = metadata.get("title", "Untitled Note")[:255]
        subtitle = metadata.get("subtitle", "")

    except Exception as e:
        logger.error("Failed to generate metadata: %s", e)
        # Fallback to simple extraction from content
        # Take first sentence or first 50 chars as title
        first_line = content.split("\n")[0].strip()
        if len(first_line) > 50:
            title = first_line[:47] + "..."
        else:
            title = first_line or "Untitled Note"
        subtitle = ""

    # Update note with generated metadata
    note.title = title
    note.subtitle = subtitle
    await db.commit()

    logger.info("Generated metadata for note: id=%s, title=%s", note_id, title)

    return {
        "note_id": note_id,
        "title": title,
        "subtitle": subtitle,
        "content": note.content,
    }


@router.post("/{note_id}/export", response_model=NoteExportResponse)
async def export_note_as_evidence(
    case_id: UUID,
    note_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    export_data: NoteExportRequest | None = None,
) -> dict:
    """
    Export a note as evidence to the case's file library.

    - Text notes are converted to PDF
    - Audio notes are copied directly as MP3

    The exported file appears in the Evidence Library like any other uploaded file.
    """
    note = await get_user_note(db, case_id, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if note.is_exported and note.exported_file_id:
        raise HTTPException(status_code=400, detail="Note has already been exported")

    description = export_data.description if export_data else None
    file_id = uuid4()

    if note.type == ModelNoteType.TEXT:
        # Convert text to PDF
        if not note.content:
            raise HTTPException(status_code=400, detail="Note has no content to export")

        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib.units import inch

            # Create PDF in memory
            pdf_buffer = io.BytesIO()
            doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)
            styles = getSampleStyleSheet()

            # Add custom style for body text
            body_style = ParagraphStyle(
                'BodyText',
                parent=styles['Normal'],
                fontSize=11,
                leading=14,
                spaceAfter=12,
            )

            story = []

            # Add title if available
            if note.title:
                title_style = styles['Heading1']
                story.append(Paragraph(note.title, title_style))
                story.append(Spacer(1, 0.2 * inch))

            # Add subtitle if available
            if note.subtitle:
                subtitle_style = styles['Italic']
                story.append(Paragraph(note.subtitle, subtitle_style))
                story.append(Spacer(1, 0.3 * inch))

            # Add content
            # Handle line breaks
            content_paragraphs = note.content.split('\n')
            for para in content_paragraphs:
                if para.strip():
                    story.append(Paragraph(para, body_style))
                else:
                    story.append(Spacer(1, 0.1 * inch))

            # Add metadata footer
            story.append(Spacer(1, 0.5 * inch))
            footer_text = f"Exported from Sherlock's Diary on {note.created_at.strftime('%Y-%m-%d %H:%M')}"
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=8,
                textColor='gray',
            )
            story.append(Paragraph(footer_text, footer_style))

            doc.build(story)
            pdf_content = pdf_buffer.getvalue()
            pdf_buffer.close()

            # Filename for the PDF
            filename = f"note_{note_id}.pdf"
            if note.title:
                safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in note.title)
                filename = f"{safe_title[:50]}.pdf"

            # Upload to GCS
            storage_path = f"cases/{case_id}/files/{file_id}.pdf"
            bucket = get_bucket()
            blob = bucket.blob(storage_path)
            blob.upload_from_string(pdf_content, content_type="application/pdf")

            # Compute hash
            content_hash = hashlib.sha256(pdf_content).hexdigest()
            size_bytes = len(pdf_content)
            mime_type = "application/pdf"

        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="PDF generation not available. Please install reportlab.",
            )
        except Exception as e:
            logger.error("Failed to create PDF: %s", e)
            raise HTTPException(status_code=500, detail="Failed to create PDF")

    else:
        # Audio note - copy the file to evidence storage
        if not note.audio_storage_path:
            raise HTTPException(status_code=400, detail="Audio note has no audio file")

        try:
            bucket = get_bucket()
            source_blob = bucket.blob(note.audio_storage_path)

            if not source_blob.exists():
                raise HTTPException(status_code=500, detail="Audio file not found in storage")

            # Determine extension
            ext = "mp3"
            if note.audio_mime_type:
                ext_map = {
                    "audio/mpeg": "mp3",
                    "audio/mp3": "mp3",
                    "audio/wav": "wav",
                    "audio/webm": "webm",
                    "audio/mp4": "m4a",
                    "audio/x-m4a": "m4a",
                }
                ext = ext_map.get(note.audio_mime_type, "mp3")

            filename = f"note_{note_id}.{ext}"
            if note.title:
                safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in note.title)
                filename = f"{safe_title[:50]}.{ext}"

            # Copy to evidence location
            storage_path = f"cases/{case_id}/files/{file_id}.{ext}"
            dest_blob = bucket.blob(storage_path)
            bucket.copy_blob(source_blob, bucket, storage_path)

            # Get file metadata
            source_blob.reload()
            size_bytes = source_blob.size or 0
            content_hash = source_blob.md5_hash or hashlib.md5(b"audio").hexdigest()
            mime_type = note.audio_mime_type or "audio/mpeg"

        except Exception as e:
            logger.error("Failed to copy audio: %s", e)
            raise HTTPException(status_code=500, detail="Failed to export audio")

    # Create file record in evidence library
    case_file = CaseFile(
        id=file_id,
        case_id=case_id,
        original_filename=filename,
        storage_path=storage_path,
        mime_type=mime_type,
        size_bytes=size_bytes,
        category=FileCategory.DOCUMENT if note.type == ModelNoteType.TEXT else FileCategory.AUDIO,
        status=FileStatus.UPLOADED,
        content_hash=content_hash,
        description=description or f"Exported from Sherlock's Diary: {note.title or 'Untitled'}",
    )
    db.add(case_file)

    # Update case file count
    case = await get_user_case(db, case_id, current_user.id)
    if case:
        case.file_count += 1

    # Mark note as exported
    note.is_exported = True
    note.exported_file_id = file_id

    await db.commit()

    logger.info("Exported note as evidence: note_id=%s, file_id=%s", note_id, file_id)

    return {
        "note_id": note_id,
        "file_id": file_id,
        "file_name": filename,
        "message": f"Successfully exported note as {filename}",
    }
