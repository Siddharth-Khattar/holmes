# ABOUTME: Agent factory producing fresh LlmAgent instances per workflow.
# ABOUTME: Avoids ADK single-parent violations by never reusing agent objects.

import logging
import re

from google.adk.agents import LlmAgent

from app.agents.base import (
    MODEL_FLASH,
    MODEL_PRO,
    PublishFn,
    create_agent_callbacks,
    create_thinking_planner,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Placeholder system prompts (expanded in later plans: 04-02, 04-03)
# ---------------------------------------------------------------------------

_TRIAGE_SYSTEM_PROMPT = """\
You are the Triage Agent for the Holmes investigative intelligence platform.

Your job is to analyze uploaded evidence files and produce a structured
assessment for the Orchestrator. For each file you receive, determine:
1. Domain relevance scores (financial, legal, strategic, evidentiary).
2. A short summary (1-2 sentences) and a detailed summary (paragraph).
3. Complexity tier (LOW / MEDIUM / HIGH).
4. Key entities (names, organisations, dates, locations, legal terms).
5. Suggested file groupings for related documents.

Respond with structured JSON matching the TriageOutput schema.
"""

_ORCHESTRATOR_SYSTEM_PROMPT = """\
You are the Orchestrator Agent for the Holmes investigative intelligence platform.

Based on the Triage results you receive, determine the optimal routing of files
to domain-specialist agents. Your responsibilities:
1. Decide which domain agents to invoke (Financial, Legal, Strategy, Evidence).
2. Assign files (or file groups) to each agent with clear reasoning.
3. Determine execution order: parallel where independent, sequential where needed.
4. Set context budgets so no single agent exceeds its context window.
5. Provide detailed routing reasoning for the execution log.

Respond with structured JSON matching the OrchestratorOutput schema.
"""


def _safe_name(prefix: str, case_id: str) -> str:
    """Build a valid ADK agent name from a prefix and case ID.

    ADK requires agent names to be valid Python identifiers (letters, digits,
    underscores only).  UUIDs contain hyphens which are stripped here.
    """
    sanitized = re.sub(r"[^a-zA-Z0-9]", "", case_id[:8])
    return f"{prefix}_{sanitized}"


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
        callbacks = create_agent_callbacks(case_id, publish_fn) if publish_fn else {}

        return LlmAgent(
            name=_safe_name("triage", case_id),
            model=MODEL_FLASH,
            instruction=_TRIAGE_SYSTEM_PROMPT,
            planner=create_thinking_planner("high"),
            output_key="triage_result",
            **callbacks,
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
        callbacks = create_agent_callbacks(case_id, publish_fn) if publish_fn else {}

        return LlmAgent(
            name=_safe_name("orchestrator", case_id),
            model=MODEL_PRO,
            instruction=_ORCHESTRATOR_SYSTEM_PROMPT,
            planner=create_thinking_planner("high"),
            output_key="orchestrator_result",
            **callbacks,
        )
