# ABOUTME: Chat service layer for session management and context loading.
# ABOUTME: Assembles chat agent with tools and synthesis context for case Q&A.

from __future__ import annotations

import hashlib
import logging
import re
from uuid import UUID

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import Session
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import MODEL_FLASH
from app.agents.chat_tools import (
    make_get_findings_tool,
    make_get_synthesis_tool,
    make_query_knowledge_graph_tool,
    make_search_findings_tool,
)
from app.agents.prompts.chat import build_chat_system_prompt
from app.models import (
    Case,
    CaseContradiction,
    CaseFinding,
    CaseGap,
    CaseHypothesis,
    CaseSynthesis,
    InvestigationTask,
    KgEntity,
    Location,
    TimelineEvent,
)
from app.services.adk_service import create_stage_runner, get_session_service

logger = logging.getLogger(__name__)


async def load_chat_context(db: AsyncSession, case_id: UUID) -> dict[str, object]:
    """Load full case context for chat agent system prompt injection.

    Queries the Case record, latest CaseSynthesis, and counts from all
    analysis tables. Returns a dict suitable for build_chat_system_prompt().

    Args:
        db: Async database session.
        case_id: The investigation case UUID.

    Returns:
        Dict with case metadata, synthesis fields, and data counts.
        Includes 'analysis_available' boolean indicating whether synthesis
        data exists.

    Raises:
        ValueError: If the case is not found.
    """
    # Load case record
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case = case_result.scalar_one_or_none()
    if case is None:
        raise ValueError(f"Case {case_id} not found")

    context: dict[str, object] = {
        "case_name": case.name,
        "case_description": case.description or "",
        "case_type": case.type.value if case.type else "",
        "case_status": case.status.value if case.status else "",
        "verdict_label": case.verdict_label or "",
        "verdict_summary": case.verdict_summary or "",
    }

    # Load latest synthesis
    synth_result = await db.execute(
        select(CaseSynthesis)
        .where(CaseSynthesis.case_id == case_id)
        .order_by(CaseSynthesis.created_at.desc())
        .limit(1)
    )
    synthesis = synth_result.scalar_one_or_none()

    if synthesis:
        context["analysis_available"] = True
        context["case_summary"] = synthesis.case_summary or ""
        context["case_verdict"] = synthesis.case_verdict or {}
        context["key_findings_summary"] = synthesis.key_findings_summary or ""
        context["risk_assessment"] = synthesis.risk_assessment or ""
        context["cross_domain_conclusions"] = synthesis.cross_domain_conclusions or []
    else:
        context["analysis_available"] = False
        context["case_summary"] = ""
        context["case_verdict"] = {}
        context["key_findings_summary"] = ""
        context["risk_assessment"] = ""
        context["cross_domain_conclusions"] = []

    # Count all data types
    findings_count = await db.execute(
        select(func.count())
        .select_from(CaseFinding)
        .where(CaseFinding.case_id == case_id)
    )
    context["findings_count"] = findings_count.scalar() or 0

    entity_count = await db.execute(
        select(func.count())
        .select_from(KgEntity)
        .where(
            KgEntity.case_id == case_id,
            KgEntity.merged_into_id.is_(None),
        )
    )
    context["entity_count"] = entity_count.scalar() or 0

    hypothesis_count = await db.execute(
        select(func.count())
        .select_from(CaseHypothesis)
        .where(CaseHypothesis.case_id == case_id)
    )
    context["hypothesis_count"] = hypothesis_count.scalar() or 0

    contradiction_count = await db.execute(
        select(func.count())
        .select_from(CaseContradiction)
        .where(CaseContradiction.case_id == case_id)
    )
    context["contradiction_count"] = contradiction_count.scalar() or 0

    gap_count = await db.execute(
        select(func.count()).select_from(CaseGap).where(CaseGap.case_id == case_id)
    )
    context["gap_count"] = gap_count.scalar() or 0

    timeline_count = await db.execute(
        select(func.count())
        .select_from(TimelineEvent)
        .where(TimelineEvent.case_id == case_id)
    )
    context["timeline_count"] = timeline_count.scalar() or 0

    location_count = await db.execute(
        select(func.count()).select_from(Location).where(Location.case_id == case_id)
    )
    context["location_count"] = location_count.scalar() or 0

    task_count = await db.execute(
        select(func.count())
        .select_from(InvestigationTask)
        .where(InvestigationTask.case_id == case_id)
    )
    context["task_count"] = task_count.scalar() or 0

    return context


async def create_chat_agent_and_runner(
    case_id: str,
    user_id: str,
    context: dict[str, object],
    session_id: str | None = None,
) -> tuple[Runner, Session]:
    """Create a chat agent with tools and an ADK runner/session.

    Builds the system prompt from context, creates 4 closure-based tools,
    instantiates a lightweight LlmAgent (Flash model, no planner, no
    output_schema), and sets up an ADK session for conversation history.

    Args:
        case_id: The investigation case UUID string.
        user_id: The authenticated user's ID.
        context: Dict from load_chat_context with case metadata and synthesis.
        session_id: Optional session ID for conversation continuity. When
            None, creates a deterministic session ID from case_id + user_id.

    Returns:
        Tuple of (Runner, Session) ready for run_async().
    """
    from app.config import get_settings

    settings = get_settings()

    # Build system prompt with full context
    system_prompt = build_chat_system_prompt(context)

    # Create closure-based tools with case_id baked in
    query_knowledge_graph = make_query_knowledge_graph_tool(case_id)
    get_findings = make_get_findings_tool(case_id)
    get_synthesis = make_get_synthesis_tool(case_id)
    search_findings = make_search_findings_tool(case_id)

    # Inline agent naming (self-contained, not imported from factory.py)
    sanitized = re.sub(r"[^a-zA-Z0-9]", "", case_id[:8])
    agent_name = f"chat_{sanitized}"

    # Create LlmAgent directly (NOT via AgentFactory -- chat has different config)
    # NO output_schema: free-form text with inline citations
    # NO planner: chat doesn't need thinking budget overhead -- speed matters
    # NO temperature override: Gemini 3 requires default temperature (1.0)
    agent = LlmAgent(
        name=agent_name,
        model=MODEL_FLASH,
        instruction=system_prompt,
        tools=[query_knowledge_graph, get_findings, get_synthesis, search_findings],
    )

    # Create Runner
    runner = create_stage_runner(agent)

    # Session management via ADK session_service directly
    session_service = get_session_service()

    # Determine session ID
    if session_id is None:
        # Deterministic session for persistent conversations
        session_id = hashlib.sha256(f"{case_id}:{user_id}:chat".encode()).hexdigest()

    # Try to get existing session
    existing = await session_service.get_session(
        app_name=settings.adk_app_name,
        user_id=user_id,
        session_id=session_id,
    )

    if existing:
        return (runner, existing)

    # Create new session
    session = await session_service.create_session(
        app_name=settings.adk_app_name,
        user_id=user_id,
        session_id=session_id,
        state={"case_id": case_id},
    )

    return (runner, session)
