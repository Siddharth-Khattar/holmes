# ABOUTME: Agent factory producing fresh LlmAgent instances per workflow.
# ABOUTME: Avoids ADK single-parent violations by never reusing agent objects.

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner

from app.agents.base import (
    MODEL_FLASH,
    MODEL_PRO,
    AgentCallbacks,
    PublishFn,
    create_agent_callbacks,
    create_thinking_planner,
)
from app.agents.prompts.orchestrator import ORCHESTRATOR_SYSTEM_PROMPT
from app.agents.prompts.triage import TRIAGE_SYSTEM_PROMPT
from app.schemas.agent import OrchestratorOutput, TriageOutput

if TYPE_CHECKING:
    from pydantic import BaseModel

logger = logging.getLogger(__name__)


def _safe_name(prefix: str, case_id: str) -> str:
    """Build a valid ADK agent name from a prefix and case ID.

    ADK requires agent names to be valid Python identifiers (letters, digits,
    underscores only).  UUIDs contain hyphens which are stripped here.
    """
    sanitized = re.sub(r"[^a-zA-Z0-9]", "", case_id[:8])
    return f"{prefix}_{sanitized}"


def _create_llm_agent(
    *,
    name: str,
    model: str,
    instruction: str,
    planner: BuiltInPlanner,
    output_schema: type[BaseModel],
    output_key: str,
    callbacks: AgentCallbacks | None,
) -> LlmAgent:
    """Create an LlmAgent with optional callbacks.

    This helper centralizes LlmAgent instantiation to avoid code duplication
    while maintaining type safety for the callbacks TypedDict.
    """
    # Build base kwargs that all agents share
    base_kwargs: dict[str, Any] = {
        "name": name,
        "model": model,
        "instruction": instruction,
        "planner": planner,
        "output_schema": output_schema,
        "output_key": output_key,
    }

    if callbacks:
        # Merge callbacks into kwargs - TypedDict unpacks correctly here
        return LlmAgent(**base_kwargs, **callbacks)
    return LlmAgent(**base_kwargs)


class AgentFactory:
    """Creates fresh agent instances to avoid ADK single-parent violations.

    Every workflow execution MUST create new agent objects.  Reusing an agent
    that already has a parent raises ``ValueError`` in ADK.  The static methods
    on this class guarantee a fresh instance each time.
    """

    @staticmethod
    def create_triage_agent(
        case_id: str,
        file_ids: list[str],
        *,
        publish_fn: PublishFn | None = None,
    ) -> LlmAgent:
        """Create a fresh Triage Agent for a specific case.

        Uses Flash model for speed with HIGH thinking for thorough analysis.

        Args:
            case_id: Investigation case ID (used in agent name and callbacks).
            file_ids: IDs of files to triage (for logging/context).
            publish_fn: Optional SSE publish function for real-time callbacks.

        Returns:
            A new LlmAgent instance configured for triage.
        """
        callbacks: AgentCallbacks | None = (
            create_agent_callbacks(case_id, publish_fn) if publish_fn else None
        )

        return _create_llm_agent(
            name=_safe_name("triage", case_id),
            model=MODEL_FLASH,
            instruction=TRIAGE_SYSTEM_PROMPT,
            planner=create_thinking_planner("high"),
            output_schema=TriageOutput,
            output_key="triage_result",
            callbacks=callbacks,
        )

    @staticmethod
    def create_orchestrator_agent(
        case_id: str,
        triage_result: dict[str, object],
        *,
        publish_fn: PublishFn | None = None,
    ) -> LlmAgent:
        """Create a fresh Orchestrator Agent for a specific case.

        Uses Pro model for complex routing reasoning with HIGH thinking.

        Args:
            case_id: Investigation case ID.
            triage_result: Structured triage output (injected into context).
            publish_fn: Optional SSE publish function for real-time callbacks.

        Returns:
            A new LlmAgent instance configured for orchestration.
        """
        callbacks: AgentCallbacks | None = (
            create_agent_callbacks(case_id, publish_fn) if publish_fn else None
        )

        return _create_llm_agent(
            name=_safe_name("orchestrator", case_id),
            model=MODEL_PRO,
            instruction=ORCHESTRATOR_SYSTEM_PROMPT,
            planner=create_thinking_planner("high"),
            output_schema=OrchestratorOutput,
            output_key="orchestrator_result",
            callbacks=callbacks,
        )
