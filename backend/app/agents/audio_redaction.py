# ABOUTME: Audio Redaction Agent using Gemini for transcription and content identification.
# ABOUTME: Processes audio files and replaces censored segments with beep sounds.

import base64
import io
import json
import logging
import os

from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from pydub import AudioSegment
from pydub.generators import Sine

logger = logging.getLogger(__name__)


class AudioCensorTarget(BaseModel):
    """A single audio segment to censor."""

    start_time: float = Field(description="Start time in seconds")
    end_time: float = Field(description="End time in seconds")
    text: str = Field(description="The transcribed text being censored")
    reason: str | None = Field(
        default=None, description="Why this segment should be censored"
    )


class AudioCensorResponse(BaseModel):
    """Structured response from Gemini identifying audio to censor."""

    targets: list[AudioCensorTarget] = Field(
        description="List of audio segments to censor with timestamps"
    )
    full_transcript: str = Field(default="", description="Full transcript of the audio")
    reasoning: str | None = Field(
        default=None, description="Explanation of censorship decisions"
    )


class AudioRedactionResponse(BaseModel):
    """Response from audio redaction processing."""

    censored_audio: str = Field(description="Base64 encoded censored audio")
    segments_censored: int = Field(default=0, description="Number of segments censored")
    segments_found: int = Field(default=0, description="Number of segments found")
    total_censored_duration: float = Field(
        default=0.0, description="Total duration censored in seconds"
    )
    audio_duration_seconds: float = Field(
        default=0.0, description="Audio duration in seconds"
    )
    processing_time_seconds: float = Field(
        default=0.0, description="Processing time in seconds"
    )
    transcript: str = Field(default="", description="Full transcript of the audio")
    reasoning: str | None = Field(
        default=None, description="AI reasoning for censorship"
    )
    targets: list[AudioCensorTarget] = Field(
        default_factory=list, description="Censored segments"
    )


class AudioRedactionAgent:
    """Audio redaction agent powered by Gemini for transcription and analysis.

    This agent:
    1. Sends audio to Gemini for transcription with timestamps
    2. Uses Gemini to identify content matching censorship criteria
    3. Replaces identified segments with beep sounds
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "gemini-2.0-flash",
        beep_frequency: int = 1000,
    ):
        """Initialize the audio redaction agent.

        Args:
            api_key: Gemini API key (defaults to GOOGLE_API_KEY or GEMINI_API_KEY env var)
            model: Gemini model to use (default: gemini-2.0-flash)
            beep_frequency: Frequency of the beep sound in Hz (default: 1000)
        """
        self.api_key = (
            api_key
            or os.environ.get("GOOGLE_API_KEY")
            or os.environ.get("GEMINI_API_KEY")
        )
        if not self.api_key:
            raise ValueError(
                "GOOGLE_API_KEY or GEMINI_API_KEY must be provided or set in environment"
            )
        self.model = model
        self.beep_frequency = beep_frequency
        self.client = genai.Client(api_key=self.api_key)

    def _get_audio_mime_type(self, file_ext: str) -> str:
        """Get MIME type from file extension."""
        mime_types = {
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "ogg": "audio/ogg",
            "m4a": "audio/mp4",
            "flac": "audio/flac",
            "aac": "audio/aac",
            "webm": "audio/webm",
        }
        return mime_types.get(file_ext.lower(), "audio/mpeg")

    def _create_beep(self, duration_ms: int, sample_rate: int = 44100) -> AudioSegment:
        """Create a beep sound of specified duration.

        Args:
            duration_ms: Duration in milliseconds
            sample_rate: Sample rate (default: 44100)

        Returns:
            AudioSegment containing the beep sound
        """
        # Generate sine wave beep
        beep = Sine(self.beep_frequency).to_audio_segment(duration=duration_ms)
        # Apply fade in/out to avoid clicking
        fade_duration = min(50, duration_ms // 4)
        beep = beep.fade_in(fade_duration).fade_out(fade_duration)
        return beep

    def identify_censor_targets(
        self,
        audio_data: bytes,
        prompt: str,
        file_ext: str = "mp3",
    ) -> AudioCensorResponse:
        """Use Gemini to transcribe audio and identify content to censor.

        Args:
            audio_data: Raw audio bytes
            prompt: User's instructions for what to censor
            file_ext: File extension to determine MIME type

        Returns:
            AudioCensorResponse with transcript and censor targets
        """
        import time

        start_time = time.time()

        mime_type = self._get_audio_mime_type(file_ext)

        system_instruction = """You are a precise audio transcription and censorship assistant. Your task is to:
1. Transcribe the audio with accurate timestamps
2. Identify segments that match the censorship criteria

CRITICAL REQUIREMENTS:
1. Provide accurate start_time and end_time in SECONDS for each segment
2. Times must be precise to at least 0.1 second accuracy
3. Only censor content that clearly matches the criteria
4. Return ONLY valid JSON - no other text before or after

Output format (return ONLY this JSON, nothing else):
{
  "targets": [
    {
      "start_time": 2.5,
      "end_time": 3.8,
      "text": "the exact words spoken",
      "reason": "why this should be censored"
    }
  ],
  "full_transcript": "Complete transcript of the audio...",
  "reasoning": "Brief explanation of censorship decisions"
}

IMPORTANT:
- Times are in seconds (e.g., 1.5 = 1.5 seconds, 65.0 = 1 minute 5 seconds)
- Ensure start_time < end_time for each target
- If no content matches the criteria, return empty targets array
- Be conservative - only censor what clearly matches
- Return ONLY the JSON object, no markdown code blocks or other text"""

        user_message = f"""Please transcribe this audio and identify any segments that should be censored based on these instructions:

CENSORSHIP CRITERIA:
{prompt}

Listen to the audio carefully, transcribe it, and identify the exact timestamps of any content that matches the censorship criteria. Return ONLY the JSON result, no other text."""

        # Create content with audio
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(
                        data=audio_data,
                        mime_type=mime_type,
                    ),
                    types.Part.from_text(text=user_message),
                ],
            )
        ]

        # Note: Cannot use response_mime_type with audio input (controlled generation not supported)
        generate_content_config = types.GenerateContentConfig(
            system_instruction=system_instruction,
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

        logger.info(f"Gemini response received in {time.time() - start_time:.1f}s")
        logger.debug(f"Full Gemini response: {full_response[:500]}...")

        # Parse JSON response - handle potential markdown code blocks
        try:
            # Strip markdown code blocks if present
            json_text = full_response.strip()
            if json_text.startswith("```json"):
                json_text = json_text[7:]
            elif json_text.startswith("```"):
                json_text = json_text[3:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
            json_text = json_text.strip()

            response_data = json.loads(json_text)
            return AudioCensorResponse(**response_data)
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            logger.error(f"Raw response: {full_response[:500]}")
            return AudioCensorResponse(
                targets=[],
                full_transcript="",
                reasoning=f"Failed to parse response: {str(e)}",
            )

    def apply_censorship(
        self,
        audio_data: bytes,
        targets: list[AudioCensorTarget],
        file_ext: str = "mp3",
        output_format: str = "mp3",
    ) -> tuple[bytes, float]:
        """Apply beep censorship to audio at specified timestamps.

        Args:
            audio_data: Raw audio bytes
            targets: List of AudioCensorTarget with timestamps
            file_ext: Input file extension
            output_format: Output format (default: mp3)

        Returns:
            Tuple of (censored audio bytes, total censored duration)
        """
        if not targets:
            logger.info("No targets to censor, returning original audio")
            return audio_data, 0.0

        # Load audio with pydub
        audio_buffer = io.BytesIO(audio_data)

        try:
            # Try to detect format from extension
            if file_ext.lower() in ["mp3", "wav", "ogg", "flac", "m4a", "aac"]:
                audio = AudioSegment.from_file(audio_buffer, format=file_ext.lower())
            else:
                # Let pydub auto-detect
                audio = AudioSegment.from_file(audio_buffer)
        except FileNotFoundError as e:
            logger.error(f"ffmpeg not found: {e}")
            raise ValueError(
                "ffmpeg is required for audio processing but was not found. "
                "Please install ffmpeg: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)"
            ) from e
        except Exception as e:
            logger.error(f"Failed to load audio: {e}")
            raise ValueError(f"Could not load audio file: {e}") from e

        audio_duration_ms = len(audio)
        logger.info(
            f"Audio loaded: {audio_duration_ms / 1000:.1f}s, {audio.channels} channels, {audio.frame_rate}Hz"
        )

        # Sort targets by start time
        sorted_targets = sorted(targets, key=lambda t: t.start_time)

        # Apply beeps to each target
        total_censored_duration = 0.0
        for target in sorted_targets:
            start_ms = int(target.start_time * 1000)
            end_ms = int(target.end_time * 1000)

            # Validate timestamps
            if start_ms < 0:
                start_ms = 0
            if end_ms > audio_duration_ms:
                end_ms = audio_duration_ms
            if start_ms >= end_ms:
                logger.warning(
                    f"Invalid target timestamps: {target.start_time} - {target.end_time}"
                )
                continue

            duration_ms = end_ms - start_ms
            total_censored_duration += duration_ms / 1000

            # Create beep with same properties as original audio
            beep = self._create_beep(duration_ms, audio.frame_rate)

            # Match audio properties
            if audio.channels == 2:
                beep = beep.set_channels(2)
            beep = beep.set_frame_rate(audio.frame_rate)
            beep = beep.set_sample_width(audio.sample_width)

            # Overlay beep (replace segment with beep)
            audio = audio[:start_ms] + beep + audio[end_ms:]

            logger.info(
                f"Censored: {target.start_time:.1f}s - {target.end_time:.1f}s ({target.text[:30]}...)"
            )

        # Export to bytes
        output_buffer = io.BytesIO()
        audio.export(output_buffer, format=output_format)
        output_buffer.seek(0)

        return output_buffer.read(), total_censored_duration

    def redact_audio(
        self,
        audio_data: bytes,
        prompt: str,
        file_ext: str = "mp3",
        output_format: str = "mp3",
    ) -> AudioRedactionResponse:
        """Complete audio redaction workflow: transcribe, identify, and censor.

        Args:
            audio_data: Raw audio bytes
            prompt: Natural language description of what to censor
            file_ext: Input file extension
            output_format: Output audio format

        Returns:
            AudioRedactionResponse with censored audio and metadata
        """
        import time

        start_time = time.time()

        logger.info("Starting audio redaction")
        logger.info(f"Prompt: {prompt}")
        logger.info(f"Audio size: {len(audio_data) / 1024:.1f} KB")

        # Get audio duration
        try:
            audio_buffer = io.BytesIO(audio_data)
            audio = AudioSegment.from_file(audio_buffer, format=file_ext.lower())
            audio_duration = len(audio) / 1000  # seconds
        except Exception:
            audio_duration = 0.0

        # Step 1: Identify censor targets using Gemini
        censor_response = self.identify_censor_targets(audio_data, prompt, file_ext)
        logger.info(f"Identified {len(censor_response.targets)} segments to censor")

        if censor_response.reasoning:
            logger.info(f"Reasoning: {censor_response.reasoning}")

        # Step 2: Apply censorship
        censored_audio, total_censored_duration = self.apply_censorship(
            audio_data,
            censor_response.targets,
            file_ext,
            output_format,
        )

        # Encode to base64
        censored_base64 = base64.b64encode(censored_audio).decode("utf-8")

        processing_time = time.time() - start_time
        logger.info(f"Audio redaction complete in {processing_time:.1f}s")

        return AudioRedactionResponse(
            censored_audio=censored_base64,
            segments_censored=len(censor_response.targets),
            segments_found=len(censor_response.targets),
            total_censored_duration=total_censored_duration,
            audio_duration_seconds=audio_duration,
            processing_time_seconds=processing_time,
            transcript=censor_response.full_transcript,
            reasoning=censor_response.reasoning,
            targets=censor_response.targets,
        )


# Convenience function for simple usage
def redact_audio_file(
    audio_data: bytes,
    prompt: str,
    file_ext: str = "mp3",
    output_format: str = "mp3",
    api_key: str | None = None,
) -> dict:
    """Redact audio based on natural language instructions.

    Args:
        audio_data: Raw audio bytes
        prompt: Natural language description of what to censor
        file_ext: Input file extension (mp3, wav, etc.)
        output_format: Output format (default: mp3)
        api_key: Optional Gemini API key

    Returns:
        Dictionary with censored_audio, transcript, and metadata

    Example:
        >>> with open("audio.mp3", "rb") as f:
        ...     audio_data = f.read()
        >>> result = redact_audio_file(
        ...     audio_data,
        ...     "Censor all mentions of names and phone numbers"
        ... )
        >>> print(f"Censored {result['segments_censored']} segments")
    """
    agent = AudioRedactionAgent(api_key=api_key)
    response = agent.redact_audio(audio_data, prompt, file_ext, output_format)

    return {
        "censored_audio": response.censored_audio,
        "segments_censored": response.segments_censored,
        "segments_found": response.segments_found,
        "total_censored_duration": response.total_censored_duration,
        "audio_duration_seconds": response.audio_duration_seconds,
        "processing_time_seconds": response.processing_time_seconds,
        "transcript": response.transcript,
        "reasoning": response.reasoning,
        "targets": [t.model_dump() for t in response.targets],
    }
