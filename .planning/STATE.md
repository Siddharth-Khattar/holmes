# Holmes Project State

**Last Updated:** 2026-02-08
**Current Phase:** 7.2 of 12 (D3.js KG Frontend Enhancement) — ✅ COMPLETE (5/5 plans + 28 polish commits)
**Next Phase:** 8 (Synthesis Agent & Intelligence Layer)
**Current Milestone:** M1 - Holmes v1.0

## Progress Overview

| Phase | Name | Status | Started | Completed | Notes |
|-------|------|--------|---------|-----------|-------|
| 1 | Foundation Infrastructure | COMPLETE | 2026-01-21 | 2026-01-22 | |
| 1.1 | Frontend Design Foundation | COMPLETE | 2026-01-23 | 2026-01-24 | |
| 2 | Authentication & Case Shell | COMPLETE | 2026-01-24 | 2026-01-25 | |
| 3 | File Ingestion | COMPLETE | 2026-02-02 | 2026-02-02 | Verified 6/6 truths |
| 4 | Core Agent System | COMPLETE | 2026-02-03 | 2026-02-03 | Verified 6/6 must-haves |
| 4.1 | Agent Decision Tree Revamp | COMPLETE | 2026-02-04 | 2026-02-04 | 4 plans (18 commits): deps/config, DecisionNode/Sidebar, ReactFlow canvas, muted palette/FileRoutingEdge/page-level sidebar |
| 5 | Agent Flow | COMPLETE | 2026-02-04 | 2026-02-05 | SSE pipeline complete; HITL infra built but verification deferred to Phase 6+ |
| 6 | Domain Agents | COMPLETE | 2026-02-06 | 2026-02-06 | 5 plans (14 commits) + 21 post-plan commits (35 total): refactoring, routing HITL, production hardening, live-testing bugfixes |
| 7 | Knowledge Storage & Domain Agent Enrichment | COMPLETE | 2026-02-07 | 2026-02-07 | 6 plans (11 commits), 8/8 verified: 9 DB models + migration, KG/findings schemas, KG Builder + findings service, prompt enrichment, 10 API endpoints, pipeline wiring |
| 7.1 | LLM-Based KG Builder Agent | COMPLETE | 2026-02-08 | 2026-02-08 | 2 plans (4 commits): schema evolution, Pydantic schemas, agent runner/prompt/factory, pipeline wiring |
| 7.2 | KG Frontend (D3.js Enhancement) | COMPLETE | 2026-02-08 | 2026-02-08 | 5 plans (46 commits): types/config/API, source viewer system, GraphSvg D3 force canvas, FilterPanel/EntityTimeline, page integration + 4 rounds visual polish. Source viewer wiring deferred to Phase 10. |
| 7.3 | KG Frontend (vis-network) | DEFERRED | - | - | Optional; only if D3.js proves insufficient |
| 8 | Synthesis Agent & Intelligence Layer | NOT_STARTED | - | - | |
| 8.1 | Geospatial Agent & Map View | NOT_STARTED | - | - | |
| 9 | Chat Interface & Research | FRONTEND_DONE | - | - | Backend API needed |
| 10 | Agent Flow & Source Panel | FRONTEND_DONE | - | - | Timeline done, Source viewers pending |
| 11 | Corrections & Refinement | NOT_STARTED | - | - | |
| 12 | Demo Preparation | NOT_STARTED | - | - | |

**Status Legend:** COMPLETE | FRONTEND_DONE (backend pending and its connection to the frontend must also be made) | NOT_STARTED

---

## Current Context

**What was just completed:**
- **Phase 7 Complete** (2026-02-07): Knowledge Storage & Domain Agent Enrichment — 6 plans, 11 commits, 8/8 verified
  - Plan 01: 9 SQLAlchemy models (KgEntity, KgRelationship, CaseFinding, CaseHypothesis, CaseContradiction, CaseGap, CaseSynthesis, TimelineEvent, Location) + Alembic migration with tsvector GIN indexes
  - Plan 02: 15 Pydantic API schemas (KG + findings) + findings_text added to all 4 domain output models
  - Plan 03: KG Builder service (entity extraction, co-occurrence relationships, exact+fuzzy dedup, degree computation) + Findings service (storage, tsvector search, pagination)
  - Plan 04: Citation enrichment in all 4 domain agent prompts (exact excerpts, timestamp locators, findings_text narrative)
  - Plan 05: 10 API endpoints (7 KG CRUD + 3 findings) registered in main.py
  - Plan 06: 3 SSE event types + pipeline wiring (Save Findings → Build KG → Backfill Entity IDs)
  - Full pipeline: Triage → Orchestrator → Domain → Strategy → HITL → Save Findings → Build KG → Backfill Entity IDs → Final

**Architecture revision (2026-02-08):**
- Programmatic KG Builder replaced with LLM-based KG Builder Agent (Approach 4)
  - Research: Microsoft GraphRAG, KGGen (NeurIPS '25), LINK-KG, Epstein Doc Explorer all validate LLM-based KG construction
  - Root cause of poor graph quality: co-occurrence relationships + zero entity filtering + granular entity types
  - LLM agent sees ALL domain outputs holistically → cross-domain connections + semantic relationships + natural dedup
- D3.js retained as primary graph library (not replaced by vis-network)
  - Epstein Doc Explorer proves D3.js force simulation produces excellent investigative graphs
  - vis-network deferred to optional Phase 7.3
- New phase structure: 7.1 (LLM KG Builder) → 7.2 (D3.js Enhancement) → 7.3 (vis-network, optional)

**Phase 7.1 Complete** (2026-02-08): LLM-Based KG Builder Agent -- 2 plans, 4 commits
  - Plan 01: Alembic migration adding 10 new nullable columns + KgBuilderOutput Pydantic schemas with integer ID cross-referencing
  - Plan 02: KgBuilderAgentRunner with text-only input, KG_BUILDER_SYSTEM_PROMPT (8+1 entity taxonomy), AgentFactory.create_kg_builder_agent(), DB writer with clear-and-rebuild, pipeline Stage 7 replaced with LLM invocation
  - Full pipeline: Triage -> Orchestrator -> Domain -> Strategy -> HITL -> Save Findings -> LLM KG Builder -> Backfill Entity IDs -> Final

**Phase 7.2 Plan 01 Complete** (2026-02-08): Foundation types, config, and API layer -- 2 tasks, 2 commits
  - Task 1: d3-scale installed, knowledge-graph.ts rewritten with EntityResponse/RelationshipResponse/GraphResponse/ForceNode/ForceLink/GraphFilters matching backend schemas
  - Task 2: knowledge-graph-config.ts (9 entity colors, force/node/edge/SVG config), api/graph.ts (fetchGraph with auth), use-case-graph.ts refactored to real API

**Phase 7.2 Plan 02 Complete** (2026-02-08): Source viewer modal and media components -- 3 tasks, 3 commits
  - Task 1: 8 media deps (react-pdf-viewer suite, pdfjs-dist, wavesurfer.js, @wavesurfer/react), SourceViewerModal shell, PdfViewer with page-navigation + search/highlight
  - Task 2: AudioViewer (wavesurfer.js waveform + transcript), VideoViewer (HTML5 + markers), ImageViewer (zoom/pan)
  - Task 3: evidence-source-panel refactored from 462-line mock monolith to 58-line thin wrapper, detail-sidebar types updated

**Phase 7.2 Plan 03 Complete** (2026-02-08): GraphSvg D3 force canvas -- 2 tasks, 2 commits
  - Task 1: useGraphSimulation (5 forces, sqrt-scaled nodes, radial centrality, edge deduplication, D3 ref-based tick updates) + useGraphSelection (selection highlighting + search match highlighting in separate useEffects)
  - Task 2: GraphSvg component (dark SVG canvas, dot pattern, zoom/pan controls, simulation toggle, node/edge tooltips, background click deselect, searchMatchIds prop)
  - Performance pattern: zero React re-renders during simulation (D3 refs only)

**Phase 7.2 Plan 04 Complete** (2026-02-08): FilterPanel + EntityTimeline -- 2 tasks, 2 commits
  - Task 1: useGraphFilters (disabled-set pattern for lint-safe state, domain/type toggles, keyword filtering, search highlighting), FilterPanel (collapsible left panel: stats, search, keyword filter, 4 domain toggles, 9 entity type toggles)
  - Task 2: EntityTimeline (right sidebar: gradient header, date range, filter-by-entity, chronological list), EntityTimelineEntry (expandable: color-coded entities, evidence excerpt, corroboration badge, "Source not yet available" graceful degradation)

**Phase 7.2 Plan 05 Complete** (2026-02-08): KnowledgeGraphCanvas integration + 4 rounds visual polish -- 29 commits
  - Core: KnowledgeGraphCanvas 3-panel orchestrator (CanvasShell + GraphSvg + FilterPanel + SourceViewerModal), page rewrite with real API data
  - Round 1 (8 commits): CanvasShell/CollapsibleSection shared components, entity detail in app-wide DetailSidebar, floating FilterPanel, node shapes + icons, edge label disclosure, font normalization
  - Round 2 (6 commits): dot-pattern zoom scaling, tiered node sizing, composite edge weight, glassy node gradients, glass-blur tooltips, QC fixes (stale closure, tooltip overflow)
  - Round 3 (8 commits): simulation lifecycle stabilized on resize (no teardown), zoom performance (removed 100k rect), vibrant node colors, unified entity badge styling (CC + KG), sidebar text contrast, click-to-navigate connected entities, QC fix (callback ref stabilization), agent key alias (kg_builder)
  - Round 4 (6 commits): timeline text smoke colors for readability, CC-style borderless nodes with ambient glow, zoom-to-node on sidebar click, forceSelect sync for sidebar-triggered selection highlighting, date label sizing
  - **Source viewer NOT wired:** source_finding_ids → file URL chain requires backend API. Deferred to Phase 10.
  - Full summary: `.planning/phases/07.2-kg-frontend-d3-enhancement/07.2-05-SUMMARY.md`

**What's next:**
- Phase 8: Synthesis Agent & Intelligence Layer
  - Synthesis Agent reads two DB sources: (1) `case_findings` from domain agents + strategy, (2) curated `kg_entities`/`kg_relationships` from LLM KG Builder
  - Pipeline Stage 8: after LLM KG Builder + Entity Backfill → Synthesis → [Geospatial if locations]
  - Populates: case_hypotheses, case_contradictions, case_gaps, case_synthesis, timeline_events
  - Frontend integration: connect Timeline, Hypothesis, Contradictions, Gaps panels to real API data
- Phase 10 must wire KG Source Viewer: source_finding_ids → case_findings → agent_executions → case_files → signed download URL

---

## Implementation Mapping: Requirements -> Files

### REQ-VIS-001: Agent Flow — COMPLETE

| Component | File Path |
|-----------|-----------|
| Main container | `frontend/src/components/CommandCenter/CommandCenter.tsx` |
| Agent canvas (ReactFlow) | `frontend/src/components/CommandCenter/AgentFlowCanvas.tsx` |
| Decision nodes (ReactFlow) | `frontend/src/components/CommandCenter/DecisionNode.tsx` |
| File group nodes (ReactFlow) | `frontend/src/components/CommandCenter/FileGroupNode.tsx` |
| File routing edges (ReactFlow) | `frontend/src/components/CommandCenter/FileRoutingEdge.tsx` |
| Details sidebar (page-level) | `frontend/src/components/CommandCenter/NodeDetailsSidebar.tsx` |
| Agent state management hook | `frontend/src/hooks/useAgentStates.ts` |
| Graph building + layout hook | `frontend/src/hooks/useAgentFlowGraph.ts` |
| SSE hook | `frontend/src/hooks/useCommandCenterSSE.ts` |
| Node/edge construction | `frontend/src/lib/command-center-graph.ts` |
| Dagre layout engine | `frontend/src/lib/command-center-layout.ts` |
| Config (muted palette) | `frontend/src/lib/command-center-config.ts` |
| Shared zoom controls | `frontend/src/components/ui/canvas-zoom-controls.tsx` |
| Mock data (demo mode) | `frontend/src/lib/mock-command-center-data.ts` |
| Types | `frontend/src/types/command-center.ts` |
| Command center page | `frontend/src/app/(app)/cases/[id]/command-center/page.tsx` |
| Command center demo page | `frontend/src/app/(app)/cases/[id]/command-center-demo/page.tsx` |
| HITL confirmation modal | `frontend/src/components/CommandCenter/ConfirmationModal.tsx` |
| Execution timeline (Gantt) | `frontend/src/components/CommandCenter/ExecutionTimeline.tsx` |
| Confirmations API client | `frontend/src/lib/api/confirmations.ts` |
| SSE event validation | `frontend/src/lib/command-center-validation.ts` |
| Agent nodes (legacy, dead code) | `frontend/src/components/CommandCenter/AgentNode.tsx` |
| Details panel (legacy, dead code) | `frontend/src/components/CommandCenter/AgentDetailsPanel.tsx` |
| **Backend: SSE endpoint** | `backend/app/api/sse.py` |
| **Backend: Agent events pub/sub** | `backend/app/services/agent_events.py` |
| **Backend: Confirmation service** | `backend/app/services/confirmation_service.py` |
| **Backend: Confirmation API** | `backend/app/api/confirmations.py` |
| **Backend: Agent callbacks + SSE publish** | `backend/app/agents/base.py` |
| **Backend: Pipeline orchestration** | `backend/app/api/agents.py` |
| **Backend: DomainAgentRunner base** | `backend/app/agents/domain_agent_runner.py` |
| **Backend: Domain runner (parallel)** | `backend/app/agents/domain_runner.py` |
| **Backend: Shared parsing helpers** | `backend/app/agents/parsing.py` |
| **Backend: State snapshots** | `backend/app/api/sse.py` |

**Backend API:** ✅ Complete
- `SSE GET /sse/cases/:caseId/command-center/stream` (state-snapshot, thinking-update, tool-called, agent lifecycle, confirmation events)
- `POST /api/cases/:caseId/confirmations/:requestId` (approve/reject HITL confirmation)
- `GET /api/cases/:caseId/confirmations/pending` (list pending confirmations)

---

### REQ-VIS-003: Knowledge Graph — COMPLETE (Source viewer wiring deferred to Phase 10)

| Component | File Path |
|-----------|-----------|
| **Canvas orchestrator** | `frontend/src/components/knowledge-graph/KnowledgeGraphCanvas.tsx` |
| GraphSvg D3 force canvas | `frontend/src/components/knowledge-graph/GraphSvg.tsx` |
| Entity detail panel (DetailSidebar) | `frontend/src/components/knowledge-graph/KnowledgeGraphEntityPanel.tsx` |
| Force simulation hook | `frontend/src/hooks/useGraphSimulation.ts` |
| Selection/search hook | `frontend/src/hooks/useGraphSelection.ts` |
| Filter state hook | `frontend/src/hooks/useGraphFilters.ts` |
| Filter panel (floating left) | `frontend/src/components/knowledge-graph/FilterPanel.tsx` |
| Entity timeline (in DetailSidebar) | `frontend/src/components/knowledge-graph/EntityTimeline.tsx` |
| Timeline entry | `frontend/src/components/knowledge-graph/EntityTimelineEntry.tsx` |
| Canvas shell (shared UI) | `frontend/src/components/ui/canvas-shell.tsx` |
| Collapsible section (shared UI) | `frontend/src/components/ui/collapsible-section.tsx` |
| Source viewer modal | `frontend/src/components/source-viewer/SourceViewerModal.tsx` |
| PDF viewer | `frontend/src/components/source-viewer/PdfViewer.tsx` |
| Audio viewer | `frontend/src/components/source-viewer/AudioViewer.tsx` |
| Video viewer | `frontend/src/components/source-viewer/VideoViewer.tsx` |
| Image viewer | `frontend/src/components/source-viewer/ImageViewer.tsx` |
| Data hook (real API) | `frontend/src/hooks/use-case-graph.ts` |
| API client | `frontend/src/lib/api/graph.ts` |
| Visualization config + badge styles | `frontend/src/lib/knowledge-graph-config.ts` |
| Detail sidebar types | `frontend/src/types/detail-sidebar.ts` |
| Detail sidebar dispatch | `frontend/src/components/app/detail-sidebar.tsx` |
| Types (backend-matching) | `frontend/src/types/knowledge-graph.ts` |
| Main visualization (legacy, superseded) | `frontend/src/components/app/knowledge-graph.tsx` |
| Mock data (legacy, superseded) | `frontend/src/lib/mock-graph-data.ts` |

**Backend APIs:** All complete
- `GET /api/cases/:caseId/graph` - Full graph visualization data
- `GET /api/cases/:caseId/entities` - List entities with filters
- `POST /api/cases/:caseId/entities` - Create entity
- `PATCH /api/cases/:caseId/entities/:entityId` - Update entity
- `DELETE /api/cases/:caseId/entities/:entityId` - Delete entity
- `GET /api/cases/:caseId/relationships` - List relationships with filters
- `POST /api/cases/:caseId/relationships` - Create relationship

---

### REQ-VIS-004: Timeline — FRONTEND_DONE

| Component | File Path |
|-----------|-----------|
| Main container | `frontend/src/components/Timeline/Timeline.tsx` |
| Core visualization | `frontend/src/components/Timeline/TimelineCore.tsx` |
| Controls | `frontend/src/components/Timeline/TimelineControls.tsx` |
| Header | `frontend/src/components/Timeline/TimelineHeader.tsx` |
| Event card | `frontend/src/components/Timeline/TimelineEventCard.tsx` |
| Skeleton | `frontend/src/components/Timeline/TimelineSkeleton.tsx` |
| Data hook | `frontend/src/hooks/useTimelineData.ts` |
| Filter hook | `frontend/src/hooks/useTimelineFilters.ts` |
| SSE hook | `frontend/src/hooks/useTimelineSSE.ts` |
| API client | `frontend/src/lib/api/timelineApi.ts` |
| Cache | `frontend/src/lib/cache/timelineCache.ts` |
| Mock data | `frontend/src/lib/mock-timeline-data.ts` |
| Types | `frontend/src/types/timeline.types.ts` |

**Backend APIs Needed:**
- `GET /api/cases/:caseId/timeline/events`
- `POST /api/cases/:caseId/timeline/events`
- `PATCH/DELETE /api/cases/:caseId/timeline/events/:eventId`
- `SSE GET /api/cases/:caseId/timeline/stream`

---

### REQ-CHAT-001: Chat Interface — FRONTEND_DONE

| Component | File Path |
|-----------|-----------|
| Chatbot UI | `frontend/src/components/app/chatbot.tsx` |
| Chat hook | `frontend/src/hooks/useChatbot.ts` |
| Types | `frontend/src/types/chatbot.ts` |

**Backend API Needed:** `POST /api/chat`

---

### REQ-CASE-005: Case Library / Evidence Library — COMPLETE

| Component | File Path |
|-----------|-----------|
| Library UI | `frontend/src/components/library/CaseLibrary.tsx` |
| API client | `frontend/src/lib/api/files.ts` |
| Upload hook | `frontend/src/hooks/useFileUpload.ts` |

**Backend APIs:** All complete
- `GET /api/cases/:caseId/files` - List files
- `POST /api/cases/:caseId/files` - Upload file
- `DELETE /api/cases/:caseId/files/:fileId` - Delete file
- `GET /api/cases/:caseId/files/:fileId/download` - Download via signed URL
- `SSE /sse/cases/:caseId/files` - Real-time status updates

---

### Navigation / Layout — COMPLETE

| Component | File Path |
|-----------|-----------|
| Case layout | `frontend/src/app/(app)/cases/[id]/layout.tsx` |
| Tab bar | `frontend/src/components/ui/expandable-tabs.tsx` |

---

## API Contracts Summary

All frontend features need these backend endpoints:

| Feature | Endpoint | Method | Priority | Status |
|---------|----------|--------|----------|--------|
| File Ingestion | `/api/cases/:caseId/files` | GET, POST, DELETE | HIGH | DONE |
| File Download | `/api/cases/:caseId/files/:fileId/download` | GET | HIGH | DONE |
| File SSE | `/sse/cases/:caseId/files` | SSE | HIGH | DONE |
| Chat | `/api/chat` | POST | HIGH | TODO |
| Knowledge Graph | `/api/cases/:caseId/graph` | GET | HIGH | DONE |
| KG Entities | `/api/cases/:caseId/entities` | GET, POST, PATCH, DELETE | MEDIUM | DONE |
| KG Relationships | `/api/cases/:caseId/relationships` | GET, POST | MEDIUM | DONE |
| Findings | `/api/cases/:caseId/findings` | GET | HIGH | DONE |
| Findings Search | `/api/cases/:caseId/findings/search` | GET | HIGH | DONE |
| Finding Detail | `/api/cases/:caseId/findings/:findingId` | GET | HIGH | DONE |
| Timeline Events | `/api/cases/:caseId/timeline/events` | GET, POST, PATCH, DELETE | MEDIUM | TODO |
| Timeline SSE | `/api/cases/:caseId/timeline/stream` | SSE | MEDIUM | TODO |
| Command Center SSE | `/sse/cases/:caseId/command-center/stream` | SSE | HIGH | DONE |
| Start Analysis | `/api/cases/:caseId/analyze` | POST | HIGH | DONE |
| Analysis Status | `/api/cases/:caseId/analysis/:workflowId` | GET | HIGH | DONE |
| Confirmations | `/api/cases/:caseId/confirmations/:requestId` | POST | HIGH | DONE |
| Pending Confirmations | `/api/cases/:caseId/confirmations/pending` | GET | HIGH | DONE |

---

## Roadmap Evolution

- **Phase 1.1 inserted after Phase 1:** Frontend Design Foundation (URGENT)
  - Reason: Establish robust frontend design foundation before subsequent phases build upon it
  - Reference: DOCS/UI/LANDING-INIT.md for landing page requirements

- **Phase 4.1 inserted after Phase 4:** Agent Decision Tree Revamp (URGENT)
  - Reason: Current D3-based Command Center visualization is visually poor (static layout, bad colors, no animations). Revamp with @xyflow/react + dagre to match reference design from agent-decision-tree-guide.md before proceeding to Phase 5 backend work.

- **Yatharth's frontend work (2026-02-02):** Phases 3, 5, 7, 9, 10 have frontend UI complete
  - All use mock data with graceful fallbacks
  - Backend integration is the remaining work for these phases
  - See `DEVELOPMENT_DOCS/YATHARTH_WORK_SUMMARY.md` for detailed file paths and TODOs

---

## Active Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Multimodal processing | Separate OCR/transcription pipelines vs Gemini native | Gemini native | Gemini 3 directly processes all modalities; eliminates pipeline complexity |
| Agent architecture | File-type agents vs Domain agents | Domain agents | Leverages Gemini multimodal; aligns with investigation workflows |
| Database | PostgreSQL vs Firestore | PostgreSQL | ADK DatabaseSessionService requires it; hybrid schema flexibility |
| Streaming | WebSocket vs SSE | SSE | Simpler, sufficient for unidirectional updates, auto-reconnect |
| Auth | NextAuth vs Better Auth | Better Auth | Modern, TypeScript-first, good PostgreSQL integration |
| Hypothesis system | Integrated in KG vs Separate view | Separate view | Cleaner UX, fullscreen capability, complements contradiction/gap detection |
| Graph library | D3.js vs vis-network | **D3.js (enhanced)** | D3.js retained and enhanced with Epstein-inspired physics/layout; vis-network deferred to optional Phase 7.3 |
| KG Builder approach | Programmatic vs LLM-based | **LLM-based (Approach 4)** | Research validates: co-occurrence relationships are fundamentally insufficient; LLM agent sees all findings holistically for cross-domain connections + semantic relationships + natural dedup |
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
| File content hash | MD5 vs SHA-256 | SHA-256 | 64-char hex string, industry standard, collision resistant |
| File status lifecycle | 3-state vs 6-state | 6-state | UPLOADING/UPLOADED/QUEUED/PROCESSING/ANALYZED/ERROR for granular tracking |
| GCS upload chunk size | 4MB vs 8MB vs 16MB | 8MB | Balance between memory usage and network round trips |
| Services layer | Inline in routes vs Separate services/ | Separate services/ | Reusable business logic, cleaner route handlers |
| Signed URL expiration | 1h vs 24h vs 7d | 24h | Balance between security and usability |
| SSE pubsub | Redis vs In-memory | In-memory | Sufficient for single-instance hackathon deployment |
| ADK agent naming | Raw UUIDs vs Sanitized | Sanitized via regex | ADK requires valid Python identifiers; UUIDs have hyphens |
| Thinking config | generate_content_config vs BuiltInPlanner | BuiltInPlanner | ADK best practice; cleaner integration with ThinkingConfig |
| Model ID configurability | Hardcoded vs Env vars | Env vars (GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL) | Smooth preview-to-GA migration path |
| SSE callback dispatch | Synchronous vs asyncio.create_task | asyncio.create_task | Non-blocking; graceful fallback when no event loop |
| Agent I/O storage | Typed columns vs JSONB | JSONB | Flexible schema for varied agent types; supports PostgreSQL indexing |
| Agent parent tracking | Separate table vs Self-referential FK | Self-referential FK with SET NULL | Simpler schema; preserves child records |
| Migration generation | Autogenerate vs Manual | Manual | No live database required during development |
| Triage prompt location | Inline in factory vs Separate prompts/ module | Separate prompts/ | Maintainability; prompts can be iterated without touching agent logic |
| Triage output parsing | Strict JSON vs Code-fence tolerant | Code-fence tolerant | Handles model responses with or without markdown code fences |
| Thinking trace storage | Full text vs Capped at 2000 chars | Capped at 2000 chars | Prevents JSONB column bloat in execution records |
| Orchestrator model | Flash vs Pro | Gemini Pro | Complex routing reasoning needs higher capability model |
| Orchestrator input | Full file content vs Text-only triage JSON | Text-only triage JSON | Keeps context ~10-50K tokens; orchestrator reasons about metadata, not files |
| Routing threshold | Fixed score cutoff vs Dynamic reasoning | Dynamic reasoning | No fixed threshold; orchestrator considers full picture per file |
| Orchestrator prompt location | Inline in factory vs Separate prompts/ module | Separate prompts/ | Consistent with triage pattern; prompts iterable without touching agent logic |
| Agent event pub/sub | Redis vs In-memory asyncio.Queue | In-memory asyncio.Queue | Same pattern as file events; single-instance hackathon deployment |
| Pipeline status tracking | Separate workflow table vs Derived from execution records | Derived from execution records | Avoids extra table; status computed from triage/orchestrator execution states |
| Background task DB session | FastAPI dependency vs Own session factory | Own session factory | Background tasks run outside request lifecycle; need independent DB access |
| Command center SSE path | /api/ prefix vs /sse/ prefix | /sse/ prefix | Consistent with file SSE pattern; frontend proxy or update can align |
| Motion easing types | String literals vs Cubic-bezier arrays | Cubic-bezier arrays | Satisfies motion/react strict Easing type without casts |
| Node animation layering | Single motion.div vs Nested wrappers | Nested wrappers | Separates floating (infinite loop) from entrance (one-shot) to avoid prop conflicts |
| Command Center accent scope | Global CSS vars vs Scoped selector | Scoped .command-center-scope | Teal accent isolated from Holmes warm neutral palette |
| Sidebar positioning | Fixed vs Absolute within CC container | Absolute within CC container | Avoids overlapping case layout chrome; sidebar scoped to Command Center |
| Sidebar output extraction | Unsafe casts vs Generic helper | Generic extractFromOutputs<T> | Type-safe extraction from AgentOutput[] without any casts |
| Canvas layout with sidebar | Flex split vs Absolute overlay | Absolute overlay | Full-width canvas; sidebar overlays instead of shrinking canvas |
| File group click behavior | Open sidebar vs No action | No sidebar (setSelectedAgent null) | File group nodes are intermediate grouping; no detailed agent data to show |
| ReactFlow nodeTypes placement | Inside component vs Outside | Outside component body | Prevents infinite re-renders per ReactFlow best practice |
| Agent color saturation | Full saturation vs Muted | Muted (~50% reduction) | Hues preserved for identity; avoids visual noise on dark canvas |
| Edge color scheme | Teal glow vs Gray neutral | Gray neutral tiers | Processing/chosen/inactive tiers; less visual noise than cyan glow |
| Edge type | Standard smoothstep vs Custom FileRoutingEdge | Custom FileRoutingEdge | Click-to-expand file list popup; shows routing context on demand |
| Graph construction | Inline in CommandCenter vs Extracted module | Extracted command-center-graph.ts | Separation of concerns; graph building logic reusable and testable |
| Layout computation | Inline in CommandCenter vs Extracted module | Extracted command-center-layout.ts | Dagre engine isolated; progressive visibility logic separated |
| Agent state management | Inline in CommandCenter vs Custom hook | Extracted useAgentStates hook | State logic reusable across command-center and command-center-demo pages |
| Sidebar ownership | CommandCenter (absolute overlay) vs Page level (30% panel) | Page level 30% panel | Sidebar as peer to canvas, not overlay; cleaner layout, no z-index issues |
| PublishFn type alias | type keyword vs TypeAlias annotation | TypeAlias annotation | Pyright compatibility when importing across modules with from __future__ import annotations |
| SSE thinking traces | Truncated vs Full text | Full untruncated text | CONTEXT.md: "Show full unfiltered thinking output"; DB storage still capped at 2000 chars |
| SSE reconnection | Event replay vs State snapshot | State snapshot | Simpler; queries most recent workflow executions, no sequence tracking needed |
| Publish type unification | Separate PublishEventFn per module vs Shared PublishFn | Shared PublishFn from base.py | Single canonical type alias; removes duplicate definitions in triage/orchestrator |
| Confirmation timeout | Timeout vs Indefinite wait | Indefinite wait | Per CONTEXT.md: "Agent waits indefinitely for user response" |
| Confirmation storage | Database vs In-memory | In-memory dicts | Single-instance hackathon deployment; three dicts for events/results/requests |
| Confirmation auth | Full auth vs No auth | No auth | Hackathon simplicity; SSE events already scoped to case |
| Confirmation SSE emission from sync | Inline await vs loop.create_task | loop.create_task | resolve_confirmation is sync (called from FastAPI endpoint); uses create_task for non-blocking async SSE emission |
| Frontend SSE URL | Relative /api/ path vs NEXT_PUBLIC_API_URL | NEXT_PUBLIC_API_URL + /sse/ prefix | Matches backend route pattern; env var consistent with REST API client |
| Backend status mapping | Direct string passthrough vs Mapped enum | mapSnapshotStatus() translation | Backend sends pending/running/completed/failed; frontend uses idle/processing/complete/error |
| Confirmation state shape | Separate store vs In useAgentStates | In useAgentStates as pendingConfirmations array | Colocated with agent state; Plan 04 consumes directly |
| Sidebar token/timing sections | Inline variables vs IIFE scoping | IIFE pattern for CollapsibleSections | Scopes metadata extraction locally without polluting component scope |
| Sidebar cross-agent data | React context vs Optional prop | allAgentStates optional prop | Self-contained; avoids provider overhead for single consumer |
| Confirmation modal dismiss | Click-outside-to-dismiss vs Blocked | Blocked (no outside dismiss) | Important agent decisions should not be accidentally dismissed |
| Tab notification badge | New cross-page context vs Tab badge property | Tab badge property | Lightweight; rendering support in ExpandableTabs, wiring per-page |
| SSE domainScore range | Normalize to 0-1 in backend vs Accept 0-100 in frontend | Accept 0-100 in frontend | Backend schema uses 0-100 (percentage); frontend validation and display adjusted |
| Domain agent architecture | Per-agent run functions vs Template Method base class | DomainAgentRunner Template Method | Eliminates ~800 lines of duplication; subclasses override only agent_type, output_type, _create_agent |
| Domain agent parsing | Per-agent parse_X_output vs Generic extract_structured_json | Generic extract_structured_json | Single function in parsing.py replaces 4 near-identical parsers; handles code fences, thought filtering, retry |
| Routing HITL granularity | All-or-nothing vs Per-agent-type | Per-agent-type rejection | User can reject routing to one agent while keeping others; batch modal with individual checkboxes |
| Routing HITL thresholds | Global threshold vs Per-agent-type | Per-agent-type thresholds | ROUTING_CONFIDENCE_THRESHOLDS dict in agents.py: financial=50, legal=50, evidence=40, strategy=60 |
| Strategy dispatch gating | Run whenever domain agents ran vs Orchestrator-requested only | Orchestrator-requested only | Strategy only runs when explicitly in routing decisions, parallel_agents, or sequential_agents |
| compute_agent_tasks dedup | Skip grouped files vs Track (file_id, agent_type) covered pairs | Track covered pairs | Allows per-file routing to additional agents not covered by file group routing |
| DomainEntity.metadata | dict[str, str] vs list[MetadataEntry] | list[MetadataEntry] | Gemini structured output requires list of objects, not arbitrary dict; MetadataEntry has key+value fields |
| Thinking trace display | Raw text passthrough vs JSON normalization | JSON normalization via format_thinking_traces | Gemini multimodal thinking produces JSON; normalize to key-labeled text for readability |
| SSE routing decisions | One card per file (first agent) vs One card per (file, agent) | One card per (file, agent) | Flattened double loop ensures all target agents visible in frontend sidebar |
| Confirmation event field naming | requestId vs taskId | taskId | Backend sends taskId consistently; frontend types/validation aligned |
| SSE event type field | Implicit from event name vs Explicit in payload | Explicit type field in every payload | Frontend validation dispatches on data.type; ensures consistent event handling |
| Tool-called event mapping | Map TOOL_COMPLETED separately vs Same as TOOL_CALLED | Same event type | Both TOOL_CALLED and TOOL_COMPLETED mapped to tool-called SSE event |
| Thinking update timestamp | Required vs Optional | Optional in frontend, always sent by backend | Backend callbacks include timestamp; emit_thinking_update adds default; frontend validates optionally |
| Domain entity type field | Literal enum vs Free-form str | Free-form str | Supports per-domain taxonomies (monetary_amount, statute, alias, etc.) with 'other' overflow |
| Strategy media resolution | HIGH vs MEDIUM | MEDIUM | Strategy processes playbooks/docs, not dense scanned content requiring high-res OCR |
| Domain agent model default | Flash vs Pro | MODEL_PRO | Domain analysis requires complex reasoning; Pro model for all 4 agents |
| Domain factory imports | Top-level vs Lazy | Lazy imports inside factory methods | Handles parallel plan execution where prompt modules may not exist yet |
| Video/audio file preparation | Size-based routing vs Always File API | Always File API for video/audio | Avoids VideoMetadata + inline data 500 error (Gemini API issue) |
| Domain prompt structure | Freeform vs Standardized 12-section | Standardized 12-section | Consistent structure across all 4 domain agents; easier to maintain and compare |
| Strategy agent input description | Implicit vs Explicit in prompt | Explicit dual-input documentation | Prompt explicitly describes own files + domain agent summaries as two input types |
| Evidence quality_assessment | Optional vs Always required | Always required in prompt | Evidence agent must always produce quality_assessment even when no findings |
| Domain prompt JSON examples | No examples vs Full realistic examples | Full realistic domain-specific examples | Guides model toward correct output structure with domain-appropriate content |
| Resilience pattern | ResilientAgentWrapper class vs Inline fallback | Inline Pro-to-Flash fallback | Less indirection for 4-agent setup; functionally equivalent retry-with-simpler-model |
| Domain runner dispatch | Hardcoded if/elif vs Dict dispatch table | Dict dispatch table (RUN_FNS) | Clean mapping from agent_type string to run function; extensible |
| Parallel agent DB sessions | Shared caller session vs Independent per task | Independent per task via factory | Avoids SQLAlchemy shared session conflicts (RESEARCH.md Pitfall 3) |
| Fallback metadata storage | Separate field vs Nested in output_data | _metadata key in output_data JSONB | Avoids schema changes; metadata colocated with output |
| Strategy no-files content | build_domain_agent_content vs text-only Content | text-only Content when files=[] | Strategy may run with only domain summaries; text-only avoids empty file preparation |
| Strategy input_data tracking | Minimal vs Verbose | Verbose (domain_summaries_length + has_own_files) | Audit visibility into what strategy agent actually received |
| SSE compound identifiers | Single agent_type vs Compound {type}_{group} | Compound {agent_type}_{group_label} | Supports multiple instances of same agent type in Command Center |
| SSE pre-emission source | Inline file-group iteration vs compute_agent_tasks | compute_agent_tasks from domain_runner | Single source of truth; SSE events always match actual execution tasks |
| Pipeline terminal stage | Orchestrator vs Strategy | Strategy completion | Strategy runs after parallel domain agents; marks pipeline as "complete" |
| Pipeline failure scope | All failures fatal vs Pipeline-level only | Pipeline-level only (triage/orchestrator/pipeline) | Partial domain agent failures are expected and non-fatal |
| KG entity/relationship metadata column | `metadata` vs `properties` | `properties` | SQLAlchemy reserves `metadata` attribute on DeclarativeBase; renamed to `properties` for JSONB column |
| tsvector mapping | SQLAlchemy column vs Raw SQL generated column | Raw SQL in migration | Avoids Alembic autogenerate phantom diffs (Pitfall 6); queries use func.to_tsvector() directly |
| findings_text backward compat | Required vs Optional (default=None) | Optional (default=None) | Existing agent_executions.output_data records lack this field; optional avoids breaking deserialization |
| Citation excerpt enforcement | Schema-required vs Prompt-enforced | Prompt-enforced (schema stays optional) | Field type stays str|None for backward compat; description documents char-for-char requirement |
| v1 search implementation | PG tsvector vs Vertex AI vector search | PG tsvector | v1 uses built-in PG full-text search; Vertex AI vector search deferred to Phase 9 |
| Entity dedup scope | Per-domain vs Cross-domain | Cross-domain (grouped by entity_type only) | Per CONTEXT.md decision; allows merging same entity found by different agents |
| Fuzzy match handling | Auto-merge vs Flag for LLM | Flag for LLM (>=85% ratio) | Avoids incorrect merges; deferred to Phase 8 LLM resolution |
| Findings text enrichment | Description only vs Description + findings_text | Append findings_text when available | Richer searchable text without losing original description |
| Findings search route ordering | Before /{finding_id} vs After | Before /{finding_id} | Prevents FastAPI treating "search" as UUID path param |
| KG API data access | Direct model queries vs Service layer | Direct model queries | Simple CRUD doesn't need service abstraction; findings uses service for complex search |
| EntityCreateRequest metadata mapping | Direct field vs Renamed | metadata -> properties | Schema field "metadata" maps to DB column "properties" (SQLAlchemy reserved attribute) |
| KG Builder entity cross-referencing | Name matching vs Integer IDs | Integer IDs (1, 2, 3...) | Eliminates name-matching inconsistencies; LLM assigns sequential IDs, mapped to DB UUIDs during write |
| KG Builder input format | Multimodal files vs Text-only | Text-only (findings + entities + case description) | Domain agents already processed raw evidence; KG Builder only needs pre-processed text |
| KG Builder rebuild strategy | Incremental merge vs Clear-and-rebuild | Clear-and-rebuild | Clean slate every run; delete all KG data then insert curated LLM output |
| KG Builder failure handling | Block pipeline vs Non-blocking | Non-blocking (try/except, continue) | KG Builder failure emits SSE error, pipeline continues; KG page shows empty state |
| KG Builder media resolution | HIGH vs None | None (text-only input) | No generate_content_config needed; KG Builder receives text, not files |
| pdfjs-dist version | Latest (5.x) vs Compatible (3.x) | 3.11.174 | @react-pdf-viewer 3.12 requires pdfjs-dist ^2.16 or ^3.0; v5 is incompatible |
| wavesurfer.js import strategy | Static import vs Dynamic import | Dynamic import | ESM-only package; dynamic import() inside useEffect for Next.js compatibility |
| Zoom pan reset pattern | useEffect on zoom vs Inline in zoom handlers | Inline in zoom handlers | Avoids eslint react-hooks/set-state-in-effect cascading render violation |
| detail-sidebar Evidence type | Keep Evidence type vs Replace with SourceViewerContent | SourceViewerContent | Evidence type removed in Plan 01; SourceViewerContent is the production-quality replacement |
| D3 .each() ESLint pattern | this-aliasing vs select(elements[i]) | select(elements[i]) | Arrow fn with third arg of .each() avoids @typescript-eslint/no-this-alias violation |
| KG tooltip implementation | SVG foreignObject vs React fixed overlay | React fixed overlay | Avoids SVG clipping and z-index issues; positioned at mouse coordinates |
| KG search vs selection visual | Same style vs Distinct styles | Distinct: coral (#E87461) for search, white (#ffffff) for selection | Two highlighting modes must be visually distinguishable |
| KG edge label orientation | Rotated along edge vs Always horizontal | Always horizontal | Readability per CONTEXT.md specification |
| KG filter state model | Active-set vs Disabled-set | Disabled-set pattern | ESLint react-hooks rules prohibit setState in useMemo/useEffect; inverted model avoids sync entirely |
| KG source viewer wiring | Wire onViewSource vs Graceful degradation | Graceful degradation | source_finding_ids -> file URL chain requires backend API not available in Phase 7.2; show "Source not yet available" |
| KG timeline relationship input | Full list + filter in component vs Pre-filtered by parent | Pre-filtered by parent | EntityTimeline receives only relationships involving selected entity; keeps component focused on display |

---

## Blockers

None currently.

---

## Session Continuity

Last session: 2026-02-08
Stopped at: Phase 7.2 COMPLETE (all 5 plans + 28 polish commits, 46 total). Source viewer deferred to Phase 10.
Resume file: None
Next action: Begin Phase 8 (Synthesis Agent & Intelligence Layer)

---

## Notes

- **Git commits:** User handles all commits manually (NEVER auto-commit)
- **Execution mode:** YOLO except for invasive commands and git commits
- **Depth:** Comprehensive - each phase gets detailed planning file
- **Frontend reference:** `DEVELOPMENT_DOCS/YATHARTH_WORK_SUMMARY.md` for all frontend file paths and TODOs

---

*State file auto-updated during GSD workflow*
