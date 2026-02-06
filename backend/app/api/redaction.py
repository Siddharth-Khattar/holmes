# ABOUTME: API endpoints for PDF redaction functionality.
# ABOUTME: Provides both file-ID based and direct upload redaction endpoints.

import base64
import logging
import os
import tempfile
from pathlib import Path

import requests
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["redaction"])

# Supported image MIME types
SUPPORTED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}

# Supported video MIME types
SUPPORTED_VIDEO_TYPES = {
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
}


@router.post("/redact/pdf", status_code=status.HTTP_200_OK)
async def redact_pdf_direct(
    file: UploadFile = File(..., description="PDF file to redact"),
    prompt: str = Form(..., description="Natural language redaction instructions"),
    permanent: bool = Form(False, description="If true, permanently removes text"),
):
    """Redact sensitive information from a PDF file.

    This endpoint:
    1. Accepts a PDF file upload and redaction prompt
    2. Uses Gemini to identify content matching redaction criteria
    3. Applies black box redactions to the PDF
    4. Returns the redacted PDF as base64 encoded data

    Args:
        file: PDF file to redact
        prompt: Natural language description of what to redact
        permanent: If true, permanently removes text. If false, draws black boxes.

    Returns:
        JSON with:
        - redacted_pdf: base64 encoded redacted PDF
        - redaction_count: number of redactions applied
        - targets: list of redacted items
        - reasoning: explanation of redaction decisions
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported for redaction"
        )

    if file.content_type and file.content_type != "application/pdf":
        # Be lenient - some browsers send different content types
        logger.warning(f"Unexpected content type: {file.content_type}")

    # Check for API key (support both GOOGLE_API_KEY and GEMINI_API_KEY)
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Redaction service unavailable: GOOGLE_API_KEY or GEMINI_API_KEY not configured"
        )

    temp_input = None
    temp_output = None

    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            temp_input = tmp.name

        logger.info(f"Processing redaction for: {file.filename}")
        logger.info(f"Prompt: {prompt}")
        logger.info(f"File size: {len(content)} bytes")

        # Import agent here to avoid startup issues if dependencies missing
        from app.agents.redaction import PDFRedactionAgent

        # Create agent and process
        agent = PDFRedactionAgent(api_key=api_key)

        # Generate output path
        output_path = temp_input.replace('.pdf', '_redacted.pdf')
        temp_output = output_path

        # Run redaction
        output_file, response = agent.redact_pdf(
            pdf_path=temp_input,
            redaction_prompt=prompt,
            output_path=output_path,
            permanent=permanent,
        )

        # Read redacted PDF
        with open(output_file, 'rb') as f:
            redacted_content = f.read()

        # Encode as base64
        redacted_base64 = base64.b64encode(redacted_content).decode('utf-8')

        logger.info(f"Redaction complete: {len(response.targets)} items redacted")

        return {
            "redacted_pdf": redacted_base64,
            "redaction_count": len(response.targets),
            "targets": [
                {
                    "text": t.text[:100] + "..." if len(t.text) > 100 else t.text,
                    "page": t.page,
                    "context": t.context[:100] + "..." if t.context and len(t.context) > 100 else t.context,
                }
                for t in response.targets
            ],
            "reasoning": response.reasoning,
            "permanent": permanent,
        }

    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Redaction service unavailable: missing dependency ({str(e)})"
        ) from e
    except Exception as e:
        logger.error(f"Redaction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Redaction failed: {str(e)}"
        ) from e
    finally:
        # Cleanup temp files
        if temp_input and Path(temp_input).exists():
            try:
                Path(temp_input).unlink()
            except Exception:
                pass
        if temp_output and Path(temp_output).exists():
            try:
                Path(temp_output).unlink()
            except Exception:
                pass


@router.post("/redact/pdf/download", status_code=status.HTTP_200_OK)
async def redact_pdf_download(
    file: UploadFile = File(..., description="PDF file to redact"),
    prompt: str = Form(..., description="Natural language redaction instructions"),
    permanent: bool = Form(False, description="If true, permanently removes text"),
):
    """Redact a PDF and return it as a downloadable file.

    Same as /redact/pdf but returns the PDF directly for download
    instead of base64 encoded JSON.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported for redaction"
        )

    # Check for API key (support both GOOGLE_API_KEY and GEMINI_API_KEY)
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Redaction service unavailable: GOOGLE_API_KEY or GEMINI_API_KEY not configured"
        )

    temp_input = None
    temp_output = None

    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            temp_input = tmp.name

        # Import agent
        from app.agents.redaction import PDFRedactionAgent

        # Create agent and process
        agent = PDFRedactionAgent(api_key=api_key)

        # Generate output path
        output_path = temp_input.replace('.pdf', '_redacted.pdf')
        temp_output = output_path

        # Run redaction
        output_file, response = agent.redact_pdf(
            pdf_path=temp_input,
            redaction_prompt=prompt,
            output_path=output_path,
            permanent=permanent,
        )

        # Read redacted PDF
        with open(output_file, 'rb') as f:
            redacted_content = f.read()

        # Generate output filename
        original_name = file.filename or "document.pdf"
        output_name = original_name.replace('.pdf', '_redacted.pdf')

        return Response(
            content=redacted_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{output_name}"'
            }
        )

    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Redaction service unavailable: missing dependency ({str(e)})"
        ) from e
    except Exception as e:
        logger.error(f"Redaction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Redaction failed: {str(e)}"
        ) from e
    finally:
        # Cleanup temp files
        if temp_input and Path(temp_input).exists():
            try:
                Path(temp_input).unlink()
            except Exception:
                pass
        if temp_output and Path(temp_output).exists():
            try:
                Path(temp_output).unlink()
            except Exception:
                pass


@router.post(
    "/cases/{case_id}/files/{file_id}/redact",
    status_code=status.HTTP_200_OK,
)
async def redact_case_file(
    case_id: str,
    file_id: str,
    prompt: str = Form(..., description="Natural language redaction instructions"),
    permanent: bool = Form(False, description="If true, permanently removes text"),
    db: AsyncSession = Depends(get_db),
):
    """Redact sensitive information from a case file PDF.

    This endpoint redacts a file that's already uploaded to a case.
    It downloads from GCS, applies redactions, and uploads the result.

    NOTE: This endpoint requires GCS integration to be configured.
    For direct file uploads, use /api/redact/pdf instead.
    """
    # Check for API key (support both GOOGLE_API_KEY and GEMINI_API_KEY)
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Redaction service unavailable: GOOGLE_API_KEY or GEMINI_API_KEY not configured"
        )

    logger.info(f"Redaction requested for case={case_id}, file={file_id}")

    # This requires GCS integration which may not be configured
    # For now, return a helpful error message
    raise HTTPException(
        status_code=501,
        detail=(
            "Case file redaction requires GCS integration. "
            "Use /api/redact/pdf for direct file upload redaction instead."
        )
    )



@router.post("/redact/image", status_code=status.HTTP_200_OK)
async def redact_image_direct(
    file: UploadFile = File(..., description="Image file to redact"),
    prompt: str = Form(..., description="Natural language redaction instructions"),
    method: str = Form("blur", description="Censorship method: blur or pixelate"),
):
    """Redact/censor sensitive information from an image file.

    This endpoint:
    1. Accepts an image file upload and redaction prompt
    2. Sends to external censorship API for processing
    3. Returns the censored image and visualization

    Args:
        file: Image file to redact (JPEG, PNG, WebP, GIF)
        prompt: Natural language description of what to censor
        method: Censorship method - "blur" or "pixelate" (default: blur)

    Returns:
        JSON with:
        - censored_image: base64 encoded censored image
        - visualization_image: base64 encoded visualization with masks
        - segments_censored: number of segments censored
        - categories_selected: list of detected categories
        - processing_time_seconds: processing time
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )

    # Check file extension
    file_ext = file.filename.lower().split(".")[-1]
    if file_ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{file_ext}. Supported: jpg, jpeg, png, webp, gif"
        )

    # Validate content type if provided
    if file.content_type and file.content_type not in SUPPORTED_IMAGE_TYPES:
        logger.warning(f"Unexpected content type: {file.content_type}")

    # Validate method
    if method not in {"blur", "pixelate"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid method: {method}. Must be 'blur' or 'pixelate'"
        )

    try:
        # Read image content
        content = await file.read()

        logger.info(f"Processing image redaction for: {file.filename}")
        logger.info(f"Prompt: {prompt}")
        logger.info(f"Method: {method}")
        logger.info(f"File size: {len(content)} bytes")

        # Import agent
        from app.agents.image_redaction import ImageRedactionAgent

        # Create agent and process
        agent = ImageRedactionAgent()

        # Run redaction
        response = agent.redact_image(
            image_data=content,
            prompt=prompt,
            method=method,  # type: ignore
        )

        logger.info(f"Image redaction complete: {response.segments_censored} segments censored")

        return {
            "censored_image": response.censored_image,
            "visualization_image": response.visualization_image,
            "segments_censored": response.segments_censored,
            "segments_found": response.segments_found,
            "categories_selected": response.categories_selected,
            "processing_time_seconds": response.processing_time_seconds,
            "method": method,
        }

    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Image redaction service unavailable: missing dependency ({str(e)})"
        ) from e
    except Exception as e:
        logger.error(f"Image redaction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Image redaction failed: {str(e)}"
        ) from e


@router.post("/redact/image/download", status_code=status.HTTP_200_OK)
async def redact_image_download(
    file: UploadFile = File(..., description="Image file to redact"),
    prompt: str = Form(..., description="Natural language redaction instructions"),
    method: str = Form("blur", description="Censorship method: blur or pixelate"),
):
    """Redact an image and return it as a downloadable file.

    Same as /redact/image but returns the image directly for download
    instead of base64 encoded JSON.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )

    file_ext = file.filename.lower().split(".")[-1]
    if file_ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{file_ext}"
        )

    if method not in {"blur", "pixelate"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid method: {method}. Must be 'blur' or 'pixelate'"
        )

    try:
        # Read image content
        content = await file.read()

        # Import agent
        from app.agents.image_redaction import ImageRedactionAgent

        # Create agent and process
        agent = ImageRedactionAgent()

        # Run redaction
        response = agent.redact_image(
            image_data=content,
            prompt=prompt,
            method=method,  # type: ignore
        )

        # Decode base64 image
        censored_image_bytes = base64.b64decode(response.censored_image)

        # Generate output filename
        original_name = file.filename
        name_parts = original_name.rsplit(".", 1)
        if len(name_parts) == 2:
            output_name = f"{name_parts[0]}_censored.{name_parts[1]}"
        else:
            output_name = f"{original_name}_censored.jpg"

        # Determine content type
        content_type = "image/jpeg"  # Default
        if file_ext in {"png"}:
            content_type = "image/png"
        elif file_ext in {"webp"}:
            content_type = "image/webp"
        elif file_ext in {"gif"}:
            content_type = "image/gif"

        return Response(
            content=censored_image_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{output_name}"'
            }
        )

    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Image redaction service unavailable: missing dependency ({str(e)})"
        ) from e
    except Exception as e:
        logger.error(f"Image redaction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Image redaction failed: {str(e)}"
        ) from e



@router.post("/redact/video", status_code=status.HTTP_200_OK)
async def redact_video_direct(
    file: UploadFile = File(..., description="Video file to redact"),
    prompt: str = Form(..., description="Natural language redaction instructions"),
    method: str = Form("blur", description="Censorship method: blur, pixelate, or blackbox"),
):
    """Redact/censor sensitive information from a video file.

    This endpoint:
    1. Accepts a video file upload and redaction prompt
    2. Sends to external censorship API for processing
    3. Returns the censored video and visualization frame

    Args:
        file: Video file to redact (MP4, MPEG, MOV, AVI, WebM)
        prompt: Natural language description of what to censor
        method: Censorship method - "blur", "pixelate", or "blackbox" (default: blur)

    Returns:
        JSON with:
        - censored_video: base64 encoded censored video
        - visualization_image: base64 encoded visualization frame
        - segments_censored: number of segments censored
        - categories_selected: list of detected categories
        - processing_time_seconds: processing time
        - logs: pipeline processing logs

    Note:
        Video processing can take 2-10 minutes depending on video length.
        Maximum timeout is 15 minutes (900 seconds).
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )

    # Check file extension
    file_ext = file.filename.lower().split(".")[-1]
    if file_ext not in {"mp4", "mpeg", "mov", "avi", "webm", "m4v"}:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{file_ext}. Supported: mp4, mpeg, mov, avi, webm"
        )

    # Validate content type if provided
    if file.content_type and file.content_type not in SUPPORTED_VIDEO_TYPES:
        logger.warning(f"Unexpected content type: {file.content_type}")

    # Validate method
    if method not in {"blur", "pixelate", "blackbox"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid method: {method}. Must be 'blur', 'pixelate', or 'blackbox'"
        )

    try:
        # Read video content
        content = await file.read()

        logger.info(f"Processing video redaction for: {file.filename}")
        logger.info(f"Prompt: {prompt}")
        logger.info(f"Method: {method}")
        logger.info(f"File size: {len(content) / (1024*1024):.2f} MB")

        # Import agent
        from app.agents.video_redaction import VideoRedactionAgent

        # Create agent and process
        agent = VideoRedactionAgent()

        # Run redaction (15 minute timeout)
        response = agent.redact_video(
            video_data=content,
            prompt=prompt,
            method=method,  # type: ignore
            timeout=900,
        )

        logger.info(f"Video redaction complete: {response.segments_censored} segments censored")

        return {
            "censored_video": response.censored_video,
            "visualization_image": response.visualization_image,
            "segments_censored": response.segments_censored,
            "segments_found": response.segments_found,
            "categories_selected": response.categories_selected,
            "agent1_reasoning": response.agent1_reasoning,
            "frames_processed": response.frames_processed,
            "video_duration_seconds": response.video_duration_seconds,
            "processing_time_seconds": response.processing_time_seconds,
            "method": method,
            "logs": response.logs[-50:] if response.logs else [],  # Last 50 logs
        }

    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Video redaction service unavailable: missing dependency ({str(e)})"
        ) from e
    except ValueError as e:
        # API returned an error
        logger.error(f"Video redaction failed: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        ) from e
    except requests.RequestException as e:
        logger.error(f"Video redaction API error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Video redaction service unavailable: {str(e)}"
        ) from e
    except Exception as e:
        logger.error(f"Video redaction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Video redaction failed: {str(e)}"
        ) from e


@router.post("/redact/video/download", status_code=status.HTTP_200_OK)
async def redact_video_download(
    file: UploadFile = File(..., description="Video file to redact"),
    prompt: str = Form(..., description="Natural language redaction instructions"),
    method: str = Form("blur", description="Censorship method: blur, pixelate, or blackbox"),
):
    """Redact a video and return it as a downloadable file.

    Same as /redact/video but returns the video directly for download
    instead of base64 encoded JSON.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )

    file_ext = file.filename.lower().split(".")[-1]
    if file_ext not in {"mp4", "mpeg", "mov", "avi", "webm", "m4v"}:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{file_ext}"
        )

    if method not in {"blur", "pixelate", "blackbox"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid method: {method}. Must be 'blur', 'pixelate', or 'blackbox'"
        )

    try:
        # Read video content
        content = await file.read()

        # Import agent
        from app.agents.video_redaction import VideoRedactionAgent

        # Create agent and process
        agent = VideoRedactionAgent()

        # Run redaction
        response = agent.redact_video(
            video_data=content,
            prompt=prompt,
            method=method,  # type: ignore
            timeout=900,
        )

        # Decode base64 video
        censored_video_bytes = base64.b64decode(response.censored_video)

        # Generate output filename
        original_name = file.filename
        name_parts = original_name.rsplit(".", 1)
        if len(name_parts) == 2:
            output_name = f"{name_parts[0]}_censored.{name_parts[1]}"
        else:
            output_name = f"{original_name}_censored.mp4"

        # Determine content type
        content_type = "video/mp4"  # Default
        if file_ext in {"mpeg"}:
            content_type = "video/mpeg"
        elif file_ext in {"mov"}:
            content_type = "video/quicktime"
        elif file_ext in {"avi"}:
            content_type = "video/x-msvideo"
        elif file_ext in {"webm"}:
            content_type = "video/webm"

        return Response(
            content=censored_video_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{output_name}"'
            }
        )

    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Video redaction service unavailable: missing dependency ({str(e)})"
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        ) from e
    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Video redaction service unavailable: {str(e)}"
        ) from e
    except Exception as e:
        logger.error(f"Video redaction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Video redaction failed: {str(e)}"
        ) from e
