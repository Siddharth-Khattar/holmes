# ABOUTME: Pydantic schemas for PDF and image redaction API endpoints.

from typing import Literal

from pydantic import BaseModel, Field


class RedactionRequest(BaseModel):
    """Request to redact content from a PDF file."""

    prompt: str = Field(
        description="Natural language description of what to redact",
        examples=["Redact all personal names and phone numbers"],
    )
    output_filename: str | None = Field(
        default=None,
        description="Optional custom filename for redacted output",
    )


class ImageRedactionRequest(BaseModel):
    """Request to redact/censor content from an image."""

    prompt: str = Field(
        description="Natural language description of what to censor",
        examples=["Blur all faces", "Pixelate license plates"],
    )
    method: Literal["blur", "pixelate"] = Field(
        default="blur",
        description="Censorship method to apply",
    )


class RedactionTargetResponse(BaseModel):
    """A single redaction target identified in the document."""

    text: str = Field(description="Exact text that was redacted")
    page: int = Field(description="Page number (1-indexed)")
    context: str | None = Field(
        default=None,
        description="Surrounding context for disambiguation",
    )


class RedactionResult(BaseModel):
    """Result of a PDF redaction operation."""

    redacted_file_id: str = Field(description="ID of the redacted file in storage")
    original_file_id: str = Field(description="ID of the original file")
    redaction_count: int = Field(description="Number of items redacted")
    targets: list[RedactionTargetResponse] = Field(
        description="List of all redacted content"
    )
    reasoning: str | None = Field(
        default=None,
        description="AI explanation of redaction decisions",
    )
    timestamp: str = Field(description="ISO timestamp of redaction")


class ImageRedactionResult(BaseModel):
    """Result of an image redaction/censorship operation."""

    censored_image: str = Field(description="Base64 encoded censored image")
    visualization_image: str = Field(description="Base64 encoded visualization with masks")
    categories_selected: list[str] = Field(description="Categories detected")
    segments_found: int = Field(description="Number of segments found")
    segments_censored: int = Field(description="Number of segments censored")
    processing_time_seconds: float = Field(description="Processing time in seconds")
    method: str = Field(description="Censorship method used")
