# ABOUTME: Image Redaction Agent using external censorship API.
# ABOUTME: Processes images and applies blur/pixelate redactions based on prompts.

import base64
import logging
from typing import Literal

import requests
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ImageRedactionResponse(BaseModel):
    """Structured response from the censorship API."""

    censored_image: str = Field(description="Base64 encoded censored image")
    visualization_image: str = Field(
        description="Base64 encoded visualization with masks"
    )
    categories_selected: list[str] = Field(description="Categories detected")
    segments_found: int = Field(description="Number of segments found")
    segments_censored: int = Field(description="Number of segments censored")
    processing_time_seconds: float = Field(description="Processing time in seconds")


class ImageRedactionAgent:
    """Image redaction agent powered by external censorship API.

    This agent:
    1. Accepts an image and natural language prompt
    2. Sends to external censorship API
    3. Returns censored image and visualization
    """

    def __init__(
        self,
        api_url: str = "https://vasub0723--censorship-pipeline-complete-fastapi-app.modal.run",
    ):
        """Initialize the image redaction agent.

        Args:
            api_url: URL of the censorship API endpoint
        """
        self.api_url = api_url

    def redact_image(
        self,
        image_data: bytes,
        prompt: str,
        method: Literal["blur", "pixelate"] = "blur",
        timeout: int = 300,
    ) -> ImageRedactionResponse:
        """Redact/censor an image based on natural language instructions.

        Args:
            image_data: Raw image bytes
            prompt: Natural language description of what to censor
            method: Censorship method - "blur" or "pixelate"
            timeout: Request timeout in seconds (default: 300)

        Returns:
            ImageRedactionResponse with censored image and metadata

        Raises:
            requests.RequestException: If API call fails
            ValueError: If response is invalid
        """
        logger.info(f"Starting image redaction with prompt: {prompt}")
        logger.info(f"Method: {method}")

        # Encode image to base64
        image_base64 = base64.b64encode(image_data).decode("utf-8")

        # Prepare request payload
        payload = {
            "image": image_base64,
            "prompt": prompt,
            "method": method,
        }

        # Call the censorship API
        try:
            response = requests.post(
                f"{self.api_url}/censor",
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()
        except requests.RequestException as e:
            logger.error(f"API request failed: {e}")
            raise

        # Parse response
        try:
            result = response.json()
            redaction_response = ImageRedactionResponse(**result)
            logger.info(
                f"✅ Redaction complete: {redaction_response.segments_censored} segments censored"
            )
            logger.info(f"Categories: {redaction_response.categories_selected}")
            logger.info(
                f"Processing time: {redaction_response.processing_time_seconds}s"
            )
            return redaction_response
        except (ValueError, KeyError) as e:
            logger.error(f"Failed to parse API response: {e}")
            logger.error(f"Raw response: {response.text}")
            raise ValueError(f"Invalid API response: {e}") from e


# Convenience function for simple usage
def redact_image_file(
    image_data: bytes,
    prompt: str,
    method: Literal["blur", "pixelate"] = "blur",
    api_url: str | None = None,
) -> dict:
    """Redact an image based on natural language instructions.

    Args:
        image_data: Raw image bytes
        prompt: Natural language description of what to censor
        method: Censorship method - "blur" or "pixelate"
        api_url: Optional custom API URL

    Returns:
        Dictionary with censored_image, visualization_image, and metadata

    Example:
        >>> with open("photo.jpg", "rb") as f:
        ...     image_data = f.read()
        >>> result = redact_image_file(
        ...     image_data,
        ...     "Blur the whole body of the woman with the shortest hair"
        ... )
        >>> print(f"Censored {result['segments_censored']} segments")
    """
    kwargs = {}
    if api_url:
        kwargs["api_url"] = api_url

    agent = ImageRedactionAgent(**kwargs)
    response = agent.redact_image(image_data, prompt, method)

    return {
        "censored_image": response.censored_image,
        "visualization_image": response.visualization_image,
        "categories_selected": response.categories_selected,
        "segments_found": response.segments_found,
        "segments_censored": response.segments_censored,
        "processing_time_seconds": response.processing_time_seconds,
    }
