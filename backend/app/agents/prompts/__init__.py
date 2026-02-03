# ABOUTME: Package for agent system prompts, exporting prompts used by the agent factory.
# ABOUTME: Each agent type has its own prompt module; this init re-exports for convenience.

from app.agents.prompts.triage import TRIAGE_SYSTEM_PROMPT

__all__ = [
    "TRIAGE_SYSTEM_PROMPT",
]
