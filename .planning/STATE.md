# Holmes Project State

**Last Updated:** 2026-01-22
**Current Phase:** 1 of 12 (Foundation Infrastructure)
**Current Plan:** 01-04 complete, 01-06 next
**Current Milestone:** M1 - Holmes v1.0

## Progress Overview

| Phase | Name | Status | Started | Completed |
|-------|------|--------|---------|-----------|
| 1 | Foundation Infrastructure | IN_PROGRESS | 2026-01-21 | - |
| 2 | Authentication & Case Shell | NOT_STARTED | - | - |
| 3 | File Ingestion | NOT_STARTED | - | - |
| 4 | Core Agent System | NOT_STARTED | - | - |
| 5 | Agent Trace Theater | NOT_STARTED | - | - |
| 6 | Domain Agents | NOT_STARTED | - | - |
| 7 | Synthesis & Knowledge Graph | NOT_STARTED | - | - |
| 8 | Intelligence Layer & Geospatial | NOT_STARTED | - | - |
| 9 | Chat Interface & Research | NOT_STARTED | - | - |
| 10 | Agent Trace Theater & Source Panel | NOT_STARTED | - | - |
| 11 | Corrections & Refinement | NOT_STARTED | - | - |
| 12 | Demo Preparation | NOT_STARTED | - | - |

## Current Context

**What was just completed:**
- **01-04-PLAN.md executed** (2026-01-22)
  - Verified FastAPI backend with health endpoints
  - Alembic async migrations configured
  - Production Dockerfile with uv
  - Fixed greenlet dependency for async SQLAlchemy

**Previous completions:**
- 01-01: Monorepo structure with Bun workspaces
- 01-02: Terraform GCP infrastructure
- 01-03: Type generation pipeline (pydantic2ts)
- 01-05: Next.js frontend with home page and Dockerfile

**What's next:**
- Execute 01-06-PLAN.md (GitHub Actions CI/CD)
- Complete Phase 1 Foundation Infrastructure

## Active Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Multimodal processing | Separate OCR/transcription pipelines vs Gemini native | Gemini native | Gemini 3 directly processes all modalities; eliminates pipeline complexity |
| Agent architecture | File-type agents vs Domain agents | Domain agents | Leverages Gemini multimodal; aligns with investigation workflows |
| Database | PostgreSQL vs Firestore | PostgreSQL | ADK DatabaseSessionService requires it; hybrid schema flexibility |
| Streaming | WebSocket vs SSE | SSE | Simpler, sufficient for unidirectional updates, auto-reconnect |
| Auth | NextAuth vs Better Auth | Better Auth | Modern, TypeScript-first, good PostgreSQL integration |
| Hypothesis system | Integrated in KG vs Separate view | Separate view | Cleaner UX, fullscreen capability, complements contradiction/gap detection |
| Graph library | D3.js vs vis-network | Evaluate during Phase 7 | Both viable; decision deferred to implementation |
| Map API | Mapbox vs alternatives | Mapbox (tentative) | Evaluate alternatives during implementation |
| Geospatial agent | Part of pipeline vs Post-synthesis | Post-synthesis utility | Autonomous when location data exists, on-demand via chat |
| Entity taxonomy | Core types only vs Full domain-specific | Full adoption | Better knowledge graph quality, domain-appropriate metadata |
| Research sources | Curated list vs Dynamic discovery | Dynamic discovery | Gemini web search more flexible, no maintenance overhead |
| Task UI | Sidebar vs Bottom drawer | Bottom drawer | Non-intrusive, always accessible |
| Hypothesis creation | User-driven vs Agent-driven | Agents propose, users curate | Better initial hypotheses, user maintains control |
| Hypothesis lifecycle | 6-state vs 3-state | 3-state (PENDING/SUPPORTED/REFUTED) | Simpler, user marks resolved; avoids over-engineering |
| Access classification | Multiple levels vs Binary | Binary (ACCESSIBLE/REQUIRES_ACTION) | Simpler, actionable |
| Confidence calculation | Deterministic vs AI-only | Deterministic (user override) | Simpler; sum(supporting)/sum(all), user can override |
| Research invocation | Chat-only vs Orchestrator-triggered | Both | Orchestrator suggests when gaps detected; user confirms |
| Task deduplication | Complex coordination vs Context injection | Context injection | Task list in agent context; simple approach |
| Cloud SQL tier | db-f1-micro vs db-g1-small | db-g1-small | Better cost/performance, 1.7GB RAM vs 0.6GB |
| Cloud Run initial images | Wait for CI/CD vs Placeholder | Placeholder hello image | Bypasses chicken-and-egg; CI/CD replaces |
| Cloud SQL networking | Private vs Public IP | Public IP | Hackathon simplicity; would use private in prod |
| Frontend Docker build | Bun runtime vs Node runtime | Bun build + Node runtime | Bun faster for build, Node slim more stable for production |
| SQLAlchemy async | Implicit vs Explicit greenlet | Explicit greenlet dependency | Required for async operations, must be explicit in pyproject.toml |

## Blockers

None currently.

## Notes

- **Git commits:** User handles all commits manually (NEVER auto-commit)
- **Execution mode:** YOLO except for invasive commands and git commits
- **Depth:** Comprehensive - each phase gets detailed planning file

---

*State file auto-updated during GSD workflow*
