# Holmes Project State

**Last Updated:** 2026-01-21
**Current Phase:** Not started
**Current Milestone:** M1 - Holmes v1.0

## Progress Overview

| Phase | Name | Status | Started | Completed |
|-------|------|--------|---------|-----------|
| 1 | Foundation Infrastructure | NOT_STARTED | - | - |
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
- Project initialization via /gsd:new-project
- Research phase completed (STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md)
- Requirements scoping completed (REQUIREMENTS.md with 100 requirements)
- Roadmap created (ROADMAP.md with 12 phases)
- **INTEGRATION.md features incorporated** (2026-01-21)
  - Hypothesis-driven investigation system
  - Geospatial intelligence with Earth Engine
  - Research/Discovery agent pipeline
  - Investigation task system

**What's next:**
- Plan Phase 1 (Foundation Infrastructure) in detail
- Execute Phase 1

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

## Blockers

None currently.

## Notes

- **Git commits:** User handles all commits manually (NEVER auto-commit)
- **Execution mode:** YOLO except for invasive commands and git commits
- **Depth:** Comprehensive - each phase gets detailed planning file

---

*State file auto-updated during GSD workflow*
