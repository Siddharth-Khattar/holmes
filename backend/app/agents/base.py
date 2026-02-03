# ABOUTME: Base agent configurations, model constants, and callback factories.
# ABOUTME: Provides thinking planner setup and SSE callback wiring for all agents.

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.planners import BuiltInPlanner
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from google.genai.types import Content, ThinkingConfig

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
    return BuiltInPlanner(
        thinking_config=ThinkingConfig(
            thinking_level=level,
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

PublishFn = Callable[[str, dict[str, object]], Awaitable[None] | None]


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
            loop = asyncio.get_running_loop()
            loop.create_task(publish_fn(event_type, data))
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
        _fire(
            "MODEL_RESPONSE",
            {
                "case_id": case_id,
                "agent_name": callback_context.agent_name,
                "timestamp": _now(),
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
