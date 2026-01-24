# Holmes Project State

**Last Updated:** 2026-01-24
**Current Phase:** 2 of 12 (Authentication & Case Shell)
**Current Plan:** 7 of 7 in Phase 2 (Auth Deployment Infrastructure)
**Current Milestone:** M1 - Holmes v1.0

## Progress Overview

| Phase | Name | Status | Started | Completed |
|-------|------|--------|---------|-----------|
| 1 | Foundation Infrastructure | COMPLETE | 2026-01-21 | 2026-01-22 |
| 1.1 | Frontend Design Foundation (INSERTED) | COMPLETE | 2026-01-23 | 2026-01-24 |
| 2 | Authentication & Case Shell | IN_PROGRESS | 2026-01-24 | - |
| 3 | File Ingestion | NOT_STARTED | - | - |
| 4 | Core Agent System | NOT_STARTED | - | - |
| 5 | Agent Flow | NOT_STARTED | - | - |
| 6 | Domain Agents | NOT_STARTED | - | - |
| 7 | Synthesis & Knowledge Graph | NOT_STARTED | - | - |
| 8 | Intelligence Layer & Geospatial | NOT_STARTED | - | - |
| 9 | Chat Interface & Research | NOT_STARTED | - | - |
| 10 | Agent Flow & Source Panel | NOT_STARTED | - | - |
| 11 | Corrections & Refinement | NOT_STARTED | - | - |
| 12 | Demo Preparation | NOT_STARTED | - | - |

## Current Context

**What was just completed:**
- **Phase 2 Plan 07: Auth Deployment Infrastructure** (2026-01-24)
  - Secret Manager resources for Better Auth secrets
  - Frontend Cloud Run with Cloud SQL access and secret injection
  - Backend FRONTEND_URL for JWKS verification
  - CI/CD Alembic migrations via Cloud SQL Proxy

**What's next:**
- Phase 2 Plans 01-06: Better Auth implementation, auth pages, app shell, case management

## Roadmap Evolution

- **Phase 1.1 inserted after Phase 1:** Frontend Design Foundation (URGENT)
  - Reason: Establish robust frontend design foundation before subsequent phases build upon it
  - Reference: DOCS/UI/LANDING-INIT.md for landing page requirements
  - Note: Use frontend-design skill during planning for design refinement

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
| Design tokens approach | CSS variables vs Tailwind @theme | Tailwind v4 @theme | Native utility generation, cleaner integration |
| Animation library | framer-motion vs motion | motion@12 | Canonical package name for v12+, React 19 compatible |
| Variable font control | Preset weights vs Axis utilities | Axis utilities | Fine-grained WONK/SOFT control for Fraunces |
| CI/CD migrations | Cloud Run job vs Cloud SQL Proxy | Cloud SQL Proxy | More reliable, no separate job infrastructure needed |
| Secret management | Values in terraform vs References only | References only | Security best practice; values added manually via GCP Console |
| Cross-service URLs | Build-time vs Post-deploy update | Post-deploy update | Solves chicken-and-egg URL problem with update-env job |

## Blockers

None currently.

## Notes

- **Git commits:** User handles all commits manually (NEVER auto-commit)
- **Execution mode:** YOLO except for invasive commands and git commits
- **Depth:** Comprehensive - each phase gets detailed planning file

---

*State file auto-updated during GSD workflow*
