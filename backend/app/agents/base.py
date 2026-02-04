# ABOUTME: Base agent configurations, model constants, and callback factories.
# ABOUTME: Provides thinking planner setup and SSE callback wiring for all agents.

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import TYPE_CHECKING, TypeAlias

if TYPE_CHECKING:
    from app.services.agent_events import AgentEventType

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.planners import BuiltInPlanner
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from google.genai.types import Content, ThinkingConfig, ThinkingLevel

from app.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model constants (configurable via GEMINI_FLASH_MODEL / GEMINI_PRO_MODEL)
# ---------------------------------------------------------------------------

_settings = get_settings()
MODEL_FLASH: str = _settings.gemini_flash_model
MODEL_PRO: str = _settings.gemini_pro_model


# ---------------------------------------------------------------------------
# Thinking planner factory
# ---------------------------------------------------------------------------


def create_thinking_planner(level: str = "high") -> BuiltInPlanner:
    """Create a BuiltInPlanner with Gemini 3 thinking configuration.

    Valid levels for Gemini 3:
    - "minimal": Minimizes latency; thinking likely off except complex coding
    - "low": Simple tasks, reduced cost
    - "medium": Balanced (Flash only)
    - "high": Maximum reasoning (DEFAULT -- user requested HIGH for all agents)

    Note: Gemini 3 uses ``thinking_level``, NOT ``thinking_budget``
    (which is for Gemini 2.5 only).
    """
    # Map string level to ThinkingLevel enum
    level_map: dict[str, ThinkingLevel] = {
        "minimal": ThinkingLevel.MINIMAL,
        "low": ThinkingLevel.LOW,
        "medium": ThinkingLevel.MEDIUM,
        "high": ThinkingLevel.HIGH,
    }
    thinking_level = level_map.get(level.lower(), ThinkingLevel.HIGH)

    return BuiltInPlanner(
        thinking_config=ThinkingConfig(
            thinking_level=thinking_level,
            include_thoughts=True,
        )
    )


# ---------------------------------------------------------------------------
# Legacy thinking config (kept for backward compatibility)
# ---------------------------------------------------------------------------

# Prefer create_thinking_planner() for new code.
THINKING_CONFIG_HIGH: dict[str, object] = {
    "thinking_level": "high",
    "include_thoughts": True,
}


# ---------------------------------------------------------------------------
# Callback types (aliases for readability)
# ---------------------------------------------------------------------------

PublishFn: TypeAlias = Callable[[str, dict[str, object]], Awaitable[None] | None]  # noqa: UP040


# ---------------------------------------------------------------------------
# Callback factory
# ---------------------------------------------------------------------------


def create_agent_callbacks(
    case_id: str,
    publish_fn: PublishFn,
) -> dict[str, Callable[..., object]]:
    """Build all six ADK agent callback hooks wired to an SSE publish function.

    Each callback publishes a structured event via ``publish_fn`` so the
    Command Center UI can render real-time agent activity.

    Args:
        case_id: The investigation case ID (included in every event).
        publish_fn: ``async def publish(event_type, data)`` that pushes to SSE.

    Returns:
        Dict with keys matching LlmAgent callback parameter names:
        before_agent_callback, after_agent_callback,
        before_model_callback, after_model_callback,
        before_tool_callback, after_tool_callback.
    """

    def _fire(event_type: str, data: dict[str, object]) -> None:
        """Schedule an SSE publish without blocking the agent loop."""
        try:
            result = publish_fn(event_type, data)
            if result is not None:
                asyncio.ensure_future(result)
        except RuntimeError:
            # No running event loop (e.g. during tests); log instead.
            logger.debug("No event loop for SSE publish: %s %s", event_type, data)

    def _now() -> str:
        return datetime.now(tz=UTC).isoformat()

    # -- before_agent ---------------------------------------------------------

    def before_agent(
        callback_context: CallbackContext,
    ) -> Content | None:
        _fire(
            "AGENT_SPAWNED",
            {
                "case_id": case_id,
                "agent_name": callback_context.agent_name,
                "timestamp": _now(),
            },
        )
        return None  # Continue normal execution

    # -- after_agent ----------------------------------------------------------

    def after_agent(
        callback_context: CallbackContext,
    ) -> Content | None:
        _fire(
            "AGENT_COMPLETED",
            {
                "case_id": case_id,
                "agent_name": callback_context.agent_name,
                "timestamp": _now(),
            },
        )
        return None

    # -- before_model ---------------------------------------------------------

    def before_model(
        callback_context: CallbackContext,
        llm_request: LlmRequest,
    ) -> LlmResponse | None:
        _fire(
            "THINKING_UPDATE",
            {
                "case_id": case_id,
                "agent_name": callback_context.agent_name,
                "timestamp": _now(),
                "status": "reasoning",
            },
        )
        return None

    # -- after_model ----------------------------------------------------------

    def after_model(
        callback_context: CallbackContext,
        llm_response: LlmResponse,
    ) -> LlmResponse | None:
        # Extract thinking parts from model response for real-time streaming
        thinking_parts: list[str] = []
        if llm_response.content and llm_response.content.parts:
            for part in llm_response.content.parts:
                if getattr(part, "thought", False) and part.text:
                    thinking_parts.append(part.text)

        # Extract token usage delta from this model turn
        token_delta: dict[str, int] | None = None
        usage = getattr(llm_response, "usage_metadata", None)
        if usage is not None:
            delta: dict[str, int] = {}
            if getattr(usage, "prompt_token_count", None):
                delta["inputTokens"] = usage.prompt_token_count
            if getattr(usage, "candidates_token_count", None):
                delta["outputTokens"] = usage.candidates_token_count
            if getattr(usage, "thoughts_token_count", None):
                delta["thoughtsTokens"] = usage.thoughts_token_count
            if delta:
                token_delta = delta

        # Fire THINKING_UPDATE with full untruncated text if thinking parts exist
        if thinking_parts:
            _fire(
                "THINKING_UPDATE",
                {
                    "case_id": case_id,
                    "agent_name": callback_context.agent_name,
                    "timestamp": _now(),
                    "thought": "\n".join(thinking_parts),
                    **({"tokenDelta": token_delta} if token_delta else {}),
                },
            )
        else:
            # Still fire MODEL_RESPONSE for non-thinking turns
            _fire(
                "MODEL_RESPONSE",
                {
                    "case_id": case_id,
                    "agent_name": callback_context.agent_name,
                    "timestamp": _now(),
                    **({"tokenDelta": token_delta} if token_delta else {}),
                },
            )
        return None

    # -- before_tool ----------------------------------------------------------

    def before_tool(
        tool: BaseTool,
        args: dict[str, object],
        tool_context: ToolContext,
    ) -> dict[str, object] | None:
        _fire(
            "TOOL_CALLED",
            {
                "case_id": case_id,
                "agent_name": tool_context.agent_name,
                "tool_name": tool.name,
                "timestamp": _now(),
            },
        )
        return None

    # -- after_tool -----------------------------------------------------------

    def after_tool(
        tool: BaseTool,
        args: dict[str, object],
        tool_context: ToolContext,
        tool_result: dict[str, object],
    ) -> dict[str, object] | None:
        _fire(
            "TOOL_COMPLETED",
            {
                "case_id": case_id,
                "agent_name": tool_context.agent_name,
                "tool_name": tool.name,
                "timestamp": _now(),
            },
        )
        return None

    return {
        "before_agent_callback": before_agent,
        "after_agent_callback": after_agent,
        "before_model_callback": before_model,
        "after_model_callback": after_model,
        "before_tool_callback": before_tool,
        "after_tool_callback": after_tool,
    }


# ---------------------------------------------------------------------------
# SSE publish function factory
# ---------------------------------------------------------------------------

# Mapping from internal callback event names to AgentEventType enum values
_CALLBACK_TO_EVENT_TYPE: dict[str, AgentEventType] = {}


def _get_event_type_map() -> dict[str, AgentEventType]:
    """Lazily build the callback-name-to-AgentEventType mapping.

    Deferred import avoids circular dependency at module load time
    (base -> agent_events -> base).
    """
    global _CALLBACK_TO_EVENT_TYPE
    if not _CALLBACK_TO_EVENT_TYPE:
        from app.services.agent_events import AgentEventType

        _CALLBACK_TO_EVENT_TYPE = {
            "AGENT_SPAWNED": AgentEventType.AGENT_STARTED,
            "AGENT_COMPLETED": AgentEventType.AGENT_COMPLETE,
            "THINKING_UPDATE": AgentEventType.THINKING_UPDATE,
            "MODEL_RESPONSE": AgentEventType.THINKING_UPDATE,
            "TOOL_CALLED": AgentEventType.TOOL_CALLED,
            "TOOL_COMPLETED": AgentEventType.TOOL_CALLED,
        }
    return _CALLBACK_TO_EVENT_TYPE


def create_sse_publish_fn(case_id: str) -> PublishFn:
    """Create a bound publish function that maps callback event types to
    AgentEventType values and dispatches via ``publish_agent_event()``.

    The returned function is suitable as the ``publish_fn`` parameter for
    ``create_agent_callbacks()``.

    Args:
        case_id: The investigation case ID for all published events.

    Returns:
        An async callable ``(event_type, data) -> None``.
    """

    async def _publish(event_type: str, data: dict[str, object]) -> None:
        from app.services.agent_events import publish_agent_event

        event_map = _get_event_type_map()
        mapped = event_map.get(event_type)
        if mapped is None:
            logger.debug(
                "Unmapped callback event type %s for case=%s, skipping SSE publish",
                event_type,
                case_id,
            )
            return
        await publish_agent_event(case_id, mapped, data)

    return _publish
