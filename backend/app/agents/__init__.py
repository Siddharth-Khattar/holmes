# ABOUTME: Agent package exposing factory, base configurations, and model constants.
# ABOUTME: All agent creation flows through AgentFactory to prevent single-parent violations.

from app.agents.base import (
    MODEL_FLASH,
    MODEL_PRO,
    THINKING_CONFIG_HIGH,
    create_agent_callbacks,
    create_thinking_planner,
)
from app.agents.factory import AgentFactory
from app.agents.prompts import TRIAGE_SYSTEM_PROMPT
from app.agents.triage import TriageAgent, run_triage

__all__ = [
    # Factory and base configs
    "AgentFactory",
    "MODEL_FLASH",
    "MODEL_PRO",
    "THINKING_CONFIG_HIGH",
    "create_agent_callbacks",
    "create_thinking_planner",
    # Triage Agent
    "TriageAgent",
    "run_triage",
    "TRIAGE_SYSTEM_PROMPT",
]
