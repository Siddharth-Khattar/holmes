# ABOUTME: Video Redaction Agent using external censorship API.
# ABOUTME: Processes videos and applies blur/pixelate/blackbox redactions based on prompts.

import base64
import logging
from typing import Literal

import requests
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class VideoRedactionResponse(BaseModel):
    """Structured response from the video censorship API."""

    censored_video: str = Field(description="Base64 encoded censored video")
    visualization_image: str = Field(
        default="", description="Base64 encoded visualization frame"
    )
    categories_selected: list[str] = Field(
        default_factory=list, description="Categories detected"
    )
    agent1_reasoning: str = Field(
        default="", description="AI reasoning for category selection"
    )
    segments_found: int = Field(default=0, description="Number of segments found")
    segments_censored: int = Field(default=0, description="Number of segments censored")
    frames_processed: int = Field(default=0, description="Number of frames processed")
    video_duration_seconds: float = Field(
        default=0.0, description="Video duration in seconds"
    )
    processing_time_seconds: float = Field(
        default=0.0, description="Processing time in seconds"
    )
    logs: list[str] = Field(
        default_factory=list, description="Pipeline processing logs"
    )


class VideoRedactionAgent:
    """Video redaction agent powered by external censorship API.

    This agent:
    1. Accepts a video and natural language prompt
    2. Sends to external censorship API
    3. Returns censored video and visualization
    """

    def __init__(
        self,
        api_url: str = "https://vasub0723--video-censorship-pipeline-fastapi-app.modal.run",
    ):
        """Initialize the video redaction agent.

        Args:
            api_url: URL of the video censorship API endpoint
        """
        self.api_url = api_url

    def check_health(self) -> dict:
        """Check if the API is healthy and reachable.

        Returns:
            Dictionary with health status information

        Raises:
            requests.RequestException: If health check fails
        """
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Health check failed: {e}")
            raise

    def get_limits(self) -> dict:
        """Get API limits and constraints.

        Returns:
            Dictionary with max_duration_seconds, max_size_mb, supported_methods

        Raises:
            requests.RequestException: If request fails
        """
        try:
            response = requests.get(f"{self.api_url}/limits", timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.warning(f"Could not fetch limits: {e}")
            return {
                "max_duration_seconds": 300,
                "max_size_mb": 100,
                "supported_methods": ["blur", "pixelate", "blackbox"],
            }

    def redact_video(
        self,
        video_data: bytes,
        prompt: str,
        method: Literal["blur", "pixelate", "blackbox"] = "blur",
        timeout: int = 900,
    ) -> VideoRedactionResponse:
        """Redact/censor a video based on natural language instructions.

        Args:
            video_data: Raw video bytes
            prompt: Natural language description of what to censor
            method: Censorship method - "blur", "pixelate", or "blackbox"
            timeout: Request timeout in seconds (default: 900 = 15 minutes)

        Returns:
            VideoRedactionResponse with censored video and metadata

        Raises:
            requests.RequestException: If API call fails
            ValueError: If response is invalid
        """
        logger.info(f"Starting video redaction with prompt: {prompt}")
        logger.info(f"Method: {method}")
        logger.info(f"Video size: {len(video_data) / (1024 * 1024):.2f} MB")

        # Encode video to base64
        video_base64 = base64.b64encode(video_data).decode("utf-8")

        # Prepare request payload
        payload = {
            "video": video_base64,
            "prompt": prompt,
            "method": method,
        }

        # Call the censorship API
        try:
            logger.info(f"Sending request to API (timeout: {timeout}s)...")
            response = requests.post(
                f"{self.api_url}/censor",
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()
        except requests.Timeout as e:
            logger.error(f"Request timed out after {timeout}s")
            raise requests.RequestException(
                f"Request timed out after {timeout}s"
            ) from e
        except requests.RequestException as e:
            logger.error(f"API request failed: {e}")
            raise

        # Parse response
        try:
            result = response.json()

            # Check for error in response
            if result.get("error"):
                error_msg = result.get("error", "Unknown error")
                error_type = result.get("error_type", "UnknownError")
                logger.error(f"API returned error: {error_type} - {error_msg}")
                raise ValueError(f"{error_type}: {error_msg}")

            redaction_response = VideoRedactionResponse(**result)
            logger.info(
                f"✅ Redaction complete: {redaction_response.segments_censored} segments censored"
            )
            logger.info(f"Categories: {redaction_response.categories_selected}")
            logger.info(f"Frames processed: {redaction_response.frames_processed}")
            logger.info(
                f"Processing time: {redaction_response.processing_time_seconds:.1f}s"
            )
            return redaction_response
        except (ValueError, KeyError) as e:
            logger.error(f"Failed to parse API response: {e}")
            logger.error(f"Raw response: {response.text[:500]}")
            raise ValueError(f"Invalid API response: {e}") from e


# Convenience function for simple usage
def redact_video_file(
    video_data: bytes,
    prompt: str,
    method: Literal["blur", "pixelate", "blackbox"] = "blur",
    api_url: str | None = None,
    timeout: int = 900,
) -> dict:
    """Redact a video based on natural language instructions.

    Args:
        video_data: Raw video bytes
        prompt: Natural language description of what to censor
        method: Censorship method - "blur", "pixelate", or "blackbox"
        api_url: Optional custom API URL
        timeout: Request timeout in seconds (default: 900 = 15 minutes)

    Returns:
        Dictionary with censored_video, visualization_image, and metadata

    Example:
        >>> with open("video.mp4", "rb") as f:
        ...     video_data = f.read()
        >>> result = redact_video_file(
        ...     video_data,
        ...     "Blur the person wearing black clothes"
        ... )
        >>> print(f"Censored {result['segments_censored']} segments")
    """
    kwargs = {}
    if api_url:
        kwargs["api_url"] = api_url

    agent = VideoRedactionAgent(**kwargs)
    response = agent.redact_video(video_data, prompt, method, timeout)

    return {
        "censored_video": response.censored_video,
        "visualization_image": response.visualization_image,
        "categories_selected": response.categories_selected,
        "agent1_reasoning": response.agent1_reasoning,
        "segments_found": response.segments_found,
        "segments_censored": response.segments_censored,
        "frames_processed": response.frames_processed,
        "video_duration_seconds": response.video_duration_seconds,
        "processing_time_seconds": response.processing_time_seconds,
        "logs": response.logs,
    }
