# ABOUTME: PDF Redaction Agent using Gemini 3 Flash for intelligent content identification.
# ABOUTME: Processes PDF files and redacts specified information with black boxes.

import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class RedactionTarget(BaseModel):
    """A single piece of content to redact from the PDF."""

    text: str = Field(description="Exact text to redact")
    page: int = Field(description="Page number (1-indexed)")
    context: str | None = Field(
        default=None, description="Surrounding context for disambiguation"
    )


class RedactionResponse(BaseModel):
    """Structured response from Gemini identifying content to redact."""

    targets: list[RedactionTarget] = Field(
        description="List of text segments to redact with page numbers"
    )
    reasoning: str | None = Field(
        default=None, description="Explanation of redaction decisions"
    )


class PDFRedactionAgent:
    """Independent PDF redaction agent powered by Gemini 3 Flash.

    This agent:
    1. Extracts text from PDF with page numbers
    2. Uses Gemini to identify content matching redaction criteria
    3. Returns structured JSON with exact text and page locations
    4. Applies black box redactions to the PDF
    """

    def __init__(self, api_key: str | None = None, model: str = "gemini-2.0-flash"):
        """Initialize the redaction agent.

        Args:
            api_key: Gemini API key (defaults to GOOGLE_API_KEY or GEMINI_API_KEY env var)
            model: Gemini model to use (default: gemini-2.0-flash)
        """
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "GOOGLE_API_KEY or GEMINI_API_KEY must be provided or set in environment"
            )
        self.model = model
        self.client = genai.Client(api_key=self.api_key)

    def extract_pdf_text(self, pdf_path: str) -> dict[int, str]:
        """Extract text from PDF with page numbers.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            Dictionary mapping page numbers (1-indexed) to text content
        """
        doc = fitz.open(pdf_path)
        pages: dict[int, str] = {}

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            pages[page_num + 1] = text  # 1-indexed for user clarity

        doc.close()
        return pages

    def identify_redactions(
        self, pdf_text: dict[int, str], redaction_prompt: str
    ) -> RedactionResponse:
        """Use Gemini to identify content that should be redacted.

        Args:
            pdf_text: Dictionary of page numbers to text content
            redaction_prompt: User's instructions for what to redact

        Returns:
            RedactionResponse with structured targets
        """
        # Build the full context for Gemini
        pdf_content = "\n\n".join(
            [f"=== PAGE {page} ===\n{text}" for page, text in pdf_text.items()]
        )

        system_instruction = """You are a precise document redaction assistant. Your task is to identify EXACT text segments that should be redacted based on user instructions.

CRITICAL REQUIREMENTS:
1. Return EXACT text as it appears in the document (word-for-word)
2. Include the correct page number (1-indexed)
3. For ambiguous cases, include surrounding context
4. Be conservative - only redact what clearly matches the criteria
5. Return valid JSON matching the RedactionResponse schema

Example output format:
{
  "targets": [
    {
      "text": "John Smith",
      "page": 1,
      "context": "Plaintiff John Smith filed a complaint"
    },
    {
      "text": "555-1234",
      "page": 2,
      "context": "Contact at 555-1234 for further"
    }
  ],
  "reasoning": "Redacted personal names and phone numbers as requested"
}"""

        user_message = f"""DOCUMENT CONTENT:
{pdf_content}

REDACTION INSTRUCTIONS:
{redaction_prompt}

Identify all text segments that match the redaction criteria. Return a JSON object with:
- targets: array of {{text, page, context}} objects
- reasoning: brief explanation of your decisions"""

        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_message)],
            )
        ]

        # Note: Cannot use Google Search tool with JSON response mode (controlled generation)
        generate_content_config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
        )

        # Stream response and collect full output
        full_response = ""
        for chunk in self.client.models.generate_content_stream(
            model=self.model,
            contents=contents,
            config=generate_content_config,
        ):
            if chunk.text:
                full_response += chunk.text
                logger.debug(f"Gemini chunk: {chunk.text}")

        logger.info(f"Full Gemini response: {full_response}")

        # Parse JSON response
        try:
            response_data = json.loads(full_response)
            return RedactionResponse(**response_data)
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            logger.error(f"Raw response: {full_response}")
            # Return empty response on parse failure
            return RedactionResponse(
                targets=[],
                reasoning=f"Failed to parse response: {str(e)}"
            )

    def apply_redactions(
        self,
        pdf_path: str,
        redaction_targets: list[RedactionTarget],
        output_path: str | None = None,
        permanent: bool = False,
    ) -> str:
        """Apply black box redactions to the PDF.

        Args:
            pdf_path: Path to input PDF
            redaction_targets: List of RedactionTarget objects
            output_path: Path for output PDF (defaults to input_redacted.pdf)
            permanent: If True, permanently removes text. If False (default),
                      draws black rectangles over text (visual covering only)

        Returns:
            Path to the redacted PDF file
        """
        if output_path is None:
            base = Path(pdf_path)
            output_path = str(base.parent / f"{base.stem}_redacted{base.suffix}")

        doc = fitz.open(pdf_path)

        # Group targets by page for efficient processing
        targets_by_page: dict[int, list[RedactionTarget]] = {}
        for target in redaction_targets:
            page_idx = target.page - 1  # Convert to 0-indexed
            if page_idx < 0 or page_idx >= len(doc):
                logger.warning(
                    f"Page {target.page} out of range for target: {target.text[:50]}"
                )
                continue
            if page_idx not in targets_by_page:
                targets_by_page[page_idx] = []
            targets_by_page[page_idx].append(target)

        # Process each page with redactions
        for page_idx, targets in targets_by_page.items():
            page = doc[page_idx]

            if permanent:
                # Method 1: Permanent removal using redaction annotations
                for target in targets:
                    text_instances = page.search_for(target.text)
                    if not text_instances:
                        logger.warning(
                            f"Text not found on page {target.page}: {target.text[:50]}"
                        )
                        continue

                    for rect in text_instances:
                        page.add_redact_annot(rect, fill=(0, 0, 0))
                        logger.info(
                            f"Permanently redacting text on page {target.page}: {target.text[:30]}..."
                        )

                # Apply all redactions for this page at once
                page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
            else:
                # Method 2: Visual covering using black rectangles (default)
                for target in targets:
                    text_instances = page.search_for(target.text)
                    if not text_instances:
                        logger.warning(
                            f"Text not found on page {target.page}: {target.text[:50]}"
                        )
                        continue

                    for rect in text_instances:
                        # Draw a filled black rectangle over the text
                        page.draw_rect(
                            rect,
                            color=(0, 0, 0),  # Black border
                            fill=(0, 0, 0),   # Black fill
                            width=0,          # No border (just fill)
                        )
                        logger.info(
                            f"Visually redacting text on page {target.page}: {target.text[:30]}..."
                        )

        # Save the redacted PDF
        doc.save(
            output_path,
            garbage=4,      # Maximum garbage collection
            deflate=True,   # Compress
            clean=True,     # Clean up
        )
        doc.close()

        logger.info(f"Redacted PDF saved to: {output_path}")
        return output_path

    def redact_pdf(
        self,
        pdf_path: str,
        redaction_prompt: str,
        output_path: str | None = None,
        permanent: bool = False,
    ) -> tuple[str, RedactionResponse]:
        """Complete redaction workflow: identify and apply redactions.

        Args:
            pdf_path: Path to input PDF
            redaction_prompt: Instructions for what to redact
            output_path: Optional path for output PDF
            permanent: If True, permanently removes text. If False (default),
                      draws black rectangles (visual covering only)

        Returns:
            Tuple of (output_path, redaction_response)
        """
        logger.info(f"Starting redaction for: {pdf_path}")
        logger.info(f"Redaction prompt: {redaction_prompt}")
        logger.info(f"Permanent removal: {permanent}")

        # Step 1: Extract text from PDF
        pdf_text = self.extract_pdf_text(pdf_path)
        logger.info(f"Extracted text from {len(pdf_text)} pages")

        # Step 2: Identify redaction targets using Gemini
        redaction_response = self.identify_redactions(pdf_text, redaction_prompt)
        logger.info(f"Identified {len(redaction_response.targets)} redaction targets")

        if redaction_response.reasoning:
            logger.info(f"Reasoning: {redaction_response.reasoning}")

        # Step 3: Apply redactions to PDF
        output_file = self.apply_redactions(
            pdf_path, redaction_response.targets, output_path, permanent
        )

        return output_file, redaction_response


# Convenience function for simple usage
def redact_pdf_file(
    pdf_path: str,
    redaction_prompt: str,
    output_path: str | None = None,
    api_key: str | None = None,
    permanent: bool = False,
) -> tuple[str, dict[str, Any]]:
    """Redact a PDF file based on natural language instructions.

    Args:
        pdf_path: Path to input PDF
        redaction_prompt: Natural language description of what to redact
        output_path: Optional path for output PDF
        api_key: Optional Gemini API key (uses GEMINI_API_KEY env var if not provided)
        permanent: If True, permanently removes text. If False (default),
                  draws black rectangles (visual covering only)

    Returns:
        Tuple of (output_path, redaction_info_dict)

    Example:
        >>> # Visual covering (default - preserves page content)
        >>> output, info = redact_pdf_file(
        ...     "contract.pdf",
        ...     "Redact all personal names, phone numbers, and email addresses"
        ... )
        >>> 
        >>> # Permanent removal (use with caution)
        >>> output, info = redact_pdf_file(
        ...     "contract.pdf",
        ...     "Redact all SSN",
        ...     permanent=True
        ... )
        >>> print(f"Redacted PDF: {output}")
        >>> print(f"Redacted {len(info['targets'])} items")
    """
    agent = PDFRedactionAgent(api_key=api_key)
    output_file, response = agent.redact_pdf(
        pdf_path, redaction_prompt, output_path, permanent
    )

    return output_file, {
        "targets": [t.model_dump() for t in response.targets],
        "reasoning": response.reasoning,
        "redaction_count": len(response.targets),
        "permanent": permanent,
    }
