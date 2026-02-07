# ABOUTME: Findings storage service for persisting and searching domain agent findings.
# ABOUTME: Provides save, update, full-text search (tsvector), paginated listing, and single lookup.

# NOTE: v1 search uses PG tsvector. Vertex AI vector search (gemini-embedding-001) deferred to Phase 9.

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.findings import CaseFinding
from app.schemas.agent import DomainAgentOutput

logger = logging.getLogger(__name__)


async def save_findings_from_output(
    output: DomainAgentOutput,
    agent_type: str,
    execution_id: UUID | None,
    case_id: UUID,
    workflow_id: UUID,
    file_group_label: str,
    db: AsyncSession,
) -> list[CaseFinding]:
    """Save findings from a domain agent output to the case_findings table.

    Receives a DomainAgentOutput-conforming object directly from domain_results.
    Each finding in output.findings becomes a CaseFinding row with citations
    stored as JSONB.

    Args:
        output: Parsed domain agent output satisfying DomainAgentOutput protocol.
        agent_type: Domain agent type (financial, legal, evidence, strategy).
        execution_id: AgentExecution record ID for traceability.
        case_id: Case UUID.
        workflow_id: Analysis workflow UUID.
        file_group_label: Group label for multi-file agent runs.
        db: Async database session.

    Returns:
        List of created CaseFinding ORM objects.
    """
    if not output.findings:
        logger.info(
            "No findings to save from %s output (case=%s, execution=%s)",
            agent_type,
            case_id,
            execution_id,
        )
        return []

    created_findings: list[CaseFinding] = []

    for finding in output.findings:
        finding_text = finding.description

        # Serialize citations to JSONB-compatible dicts
        citations_json: list[dict[str, object]] | None = None
        if finding.citations:
            citations_json = [c.model_dump(mode="json") for c in finding.citations]

        case_finding = CaseFinding(
            case_id=case_id,
            workflow_id=workflow_id,
            agent_type=agent_type,
            agent_execution_id=execution_id,
            file_group_label=file_group_label,
            category=finding.category,
            title=finding.title,
            finding_text=finding_text,
            confidence=finding.confidence,
            citations=citations_json,
            entity_ids=[],  # Populated later via update_finding_entity_ids
        )
        db.add(case_finding)
        created_findings.append(case_finding)

    await db.flush()

    logger.info(
        "Saved %d findings from %s output (case=%s, workflow=%s, execution=%s)",
        len(created_findings),
        agent_type,
        case_id,
        workflow_id,
        execution_id,
    )
    return created_findings


async def update_finding_entity_ids(
    finding_id: UUID,
    entity_ids: list[str],
    db: AsyncSession,
) -> None:
    """Update entity_ids JSONB on a CaseFinding after KG entities are created.

    Called from the pipeline after build_knowledge_graph completes, to
    backfill finding-to-entity links.

    Args:
        finding_id: CaseFinding UUID.
        entity_ids: List of KgEntity UUID strings to link.
        db: Async database session.
    """
    result = await db.execute(select(CaseFinding).where(CaseFinding.id == finding_id))
    finding = result.scalar_one_or_none()
    if finding is None:
        logger.warning("Cannot update entity_ids: finding %s not found", finding_id)
        return

    finding.entity_ids = entity_ids
    await db.flush()


async def search_findings(
    db: AsyncSession,
    case_id: UUID,
    query: str,
    limit: int = 20,
) -> list[tuple[CaseFinding, float]]:
    """Full-text search on case_findings using PostgreSQL tsvector.

    Uses plainto_tsquery for safe query parsing and ts_rank for relevance
    scoring. The search_vector column is a generated tsvector column
    created in the Alembic migration.

    Args:
        db: Async database session.
        case_id: Case UUID to scope the search.
        query: Search query string.
        limit: Maximum number of results.

    Returns:
        List of (CaseFinding, relevance_score) tuples ordered by relevance.
    """
    tsquery = func.plainto_tsquery("english", query)

    stmt = (
        select(
            CaseFinding,
            func.ts_rank(
                literal_column("search_vector"),
                tsquery,
            ).label("rank"),
        )
        .where(
            CaseFinding.case_id == case_id,
            literal_column("search_vector").op("@@")(tsquery),
        )
        .order_by(literal_column("rank").desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [(row[0], row[1]) for row in rows]


async def list_findings(
    db: AsyncSession,
    case_id: UUID,
    agent_type: str | None = None,
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[CaseFinding], int]:
    """Paginated listing of findings with optional filters.

    Args:
        db: Async database session.
        case_id: Case UUID.
        agent_type: Optional filter by agent type.
        category: Optional filter by finding category.
        limit: Page size.
        offset: Page offset.

    Returns:
        Tuple of (findings_list, total_count).
    """
    # Build base where clause
    conditions = [CaseFinding.case_id == case_id]
    if agent_type is not None:
        conditions.append(CaseFinding.agent_type == agent_type)
    if category is not None:
        conditions.append(CaseFinding.category == category)

    # Count total matching
    count_stmt = select(func.count()).select_from(CaseFinding).where(*conditions)
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0

    # Fetch page
    stmt = (
        select(CaseFinding)
        .where(*conditions)
        .order_by(CaseFinding.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    findings = list(result.scalars().all())

    return (findings, total_count)


async def get_finding_by_id(
    db: AsyncSession,
    finding_id: UUID,
    case_id: UUID,
) -> CaseFinding | None:
    """Look up a single finding by ID, scoped to a case.

    Args:
        db: Async database session.
        finding_id: CaseFinding UUID.
        case_id: Case UUID for scope validation.

    Returns:
        CaseFinding or None if not found.
    """
    result = await db.execute(
        select(CaseFinding).where(
            CaseFinding.id == finding_id,
            CaseFinding.case_id == case_id,
        )
    )
    return result.scalar_one_or_none()
