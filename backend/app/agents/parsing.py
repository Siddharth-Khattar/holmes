# ABOUTME: Shared parsing helpers for extracting structured data from ADK events.
# ABOUTME: Used by all pipeline agents for JSON extraction, token usage, thinking traces, and structured output parsing.

import json
import logging

from google.adk.events import Event
from pydantic import BaseModel

logger = logging.getLogger(__name__)


def extract_json_from_text(text: str) -> str | None:
    """Extract JSON from model response text, handling markdown code fences.

    Tolerates missing closing fences — if the model opens a code block
    but never closes it, everything after the opening fence is used.
    """
    # Try ```json fence first, then bare ``` fence
    for fence in ("```json", "```"):
        pos = text.find(fence)
        if pos == -1:
            continue
        start = pos + len(fence)
        end = text.find("```", start)
        # No closing fence — take everything after the opening fence
        candidate = text[start:end].strip() if end != -1 else text[start:].strip()
        if candidate:
            return candidate

    # Try the whole text as JSON
    text = text.strip()
    if text.startswith("{"):
        return text

    return None


def extract_token_usage(events: list[Event]) -> tuple[int, int]:
    """Accumulate token usage across all events.

    Returns:
        Tuple of (input_tokens, output_tokens).
    """
    input_tokens = 0
    output_tokens = 0
    for event in events:
        if event.usage_metadata:
            if event.usage_metadata.prompt_token_count:
                input_tokens += event.usage_metadata.prompt_token_count
            if event.usage_metadata.candidates_token_count:
                output_tokens += event.usage_metadata.candidates_token_count
    return input_tokens, output_tokens


def extract_thinking_traces(events: list[Event]) -> list[dict[str, object]]:
    """Extract thinking traces from events for audit logging."""
    traces: list[dict[str, object]] = []
    for event in events:
        if not event.content or not event.content.parts:
            continue
        for part in event.content.parts:
            if part.thought and part.text:
                traces.append(
                    {
                        "agent": event.author,
                        "thought": part.text[:2000],  # Cap individual thoughts
                        "timestamp": event.timestamp,
                    }
                )
    return traces


def extract_structured_json[OutputT: BaseModel](
    events: list[Event],
    output_type: type[OutputT],
    agent_name: str,
) -> OutputT | None:
    """Parse structured output from ADK events into a Pydantic model.

    Generic replacement for per-agent parse functions (parse_financial_output,
    parse_legal_output, etc.). Scans events in reverse to find the final agent
    response containing structured JSON output.

    Args:
        events: List of ADK events from runner execution.
        output_type: Pydantic model class to validate against.
        agent_name: Agent name for log messages.

    Returns:
        Parsed output model instance, or None if parsing fails.
    """
    for event in reversed(events):
        if not event.is_final_response():
            continue

        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    json_str = extract_json_from_text(part.text)
                    if json_str is None:
                        continue
                    try:
                        data = json.loads(json_str)
                        return output_type.model_validate(data)
                    except (json.JSONDecodeError, ValueError) as exc:
                        logger.warning(
                            "Failed to parse %s output JSON: %s",
                            agent_name,
                            exc,
                        )
                        continue

    logger.error("No valid %s output found in agent events", agent_name)
    return None
