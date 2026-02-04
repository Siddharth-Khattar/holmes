# Holmes Project State

**Last Updated:** 2026-02-04
**Current Phase:** 5 of 12 (Agent Flow) — In progress
**Current Plan:** 1 of 4 complete (05-01 SSE Event Enrichment)
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
| 5 | Agent Flow | IN_PROGRESS | 2026-02-04 | - | Plan 01 complete (SSE enrichment); Plans 02-04 pending |
| 6 | Domain Agents | NOT_STARTED | - | - | |
| 7 | Synthesis & Knowledge Graph | FRONTEND_DONE | - | - | Backend agents + APIs needed |
| 8 | Intelligence Layer & Geospatial | NOT_STARTED | - | - | |
| 9 | Chat Interface & Research | FRONTEND_DONE | - | - | Backend API needed |
| 10 | Agent Flow & Source Panel | FRONTEND_DONE | - | - | Timeline done, Source viewers pending |
| 11 | Corrections & Refinement | NOT_STARTED | - | - | |
| 12 | Demo Preparation | NOT_STARTED | - | - | |

**Status Legend:** COMPLETE | FRONTEND_DONE (backend pending and its connection to the frontend must also be made) | NOT_STARTED

---

## Current Context

**What was just completed:**
- **Phase 5 Plan 01 Complete** (2026-02-04): SSE event enrichment (2 tasks, 2 commits)
  - Task 1: after_model_callback extracts thinking parts and fires THINKING_UPDATE with full text; new event types (STATE_SNAPSHOT, CONFIRMATION_REQUIRED, CONFIRMATION_RESOLVED); create_sse_publish_fn() factory
  - Task 2: Enriched agent-complete events with metadata (tokens, duration, model, traces); pipeline-complete with totals; build_state_snapshot() for reconnection; state-snapshot sent on SSE connect
  - Unified PublishFn TypeAlias across base/triage/orchestrator

**What's next:**
- Phase 5 Plan 02: HITL confirmation dialogs
- Phase 5 Plan 03-04: Remaining agent flow backend work
- Phase 6 (Domain Agents), Phase 7 (Synthesis & KG)

---

## Implementation Mapping: Requirements -> Files

### REQ-VIS-001: Agent Flow — FRONTEND_DONE

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
| Agent nodes (legacy, dead code) | `frontend/src/components/CommandCenter/AgentNode.tsx` |
| Details panel (legacy, dead code) | `frontend/src/components/CommandCenter/AgentDetailsPanel.tsx` |

**Backend API Needed:** `SSE GET /api/cases/:caseId/command-center/stream`

---

### REQ-VIS-003: Knowledge Graph — FRONTEND_DONE

| Component | File Path |
|-----------|-----------|
| Main visualization | `frontend/src/components/app/knowledge-graph.tsx` |
| Evidence panel | `frontend/src/components/app/evidence-source-panel.tsx` |
| Data hook | `frontend/src/hooks/use-case-graph.ts` |
| Mock data | `frontend/src/lib/mock-graph-data.ts` |
| Types | `frontend/src/types/knowledge-graph.ts` |

**Backend APIs Needed:**
- `GET /api/cases/:caseId/graph`
- `POST /api/cases/:caseId/entities`
- `POST /api/cases/:caseId/relationships`
- `PATCH/DELETE /api/cases/:caseId/entities/:entityId`

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
| Knowledge Graph | `/api/cases/:caseId/graph` | GET | HIGH | TODO |
| KG Entities | `/api/cases/:caseId/entities` | POST, PATCH, DELETE | MEDIUM | TODO |
| KG Relationships | `/api/cases/:caseId/relationships` | POST | MEDIUM | TODO |
| Timeline Events | `/api/cases/:caseId/timeline/events` | GET, POST, PATCH, DELETE | MEDIUM | TODO |
| Timeline SSE | `/api/cases/:caseId/timeline/stream` | SSE | MEDIUM | TODO |
| Command Center SSE | `/sse/cases/:caseId/command-center/stream` | SSE | HIGH | DONE |
| Start Analysis | `/api/cases/:caseId/analyze` | POST | HIGH | DONE |
| Analysis Status | `/api/cases/:caseId/analysis/:workflowId` | GET | HIGH | DONE |

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
| Graph library | D3.js vs vis-network | **D3.js** | Chosen by Yatharth during implementation |
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

---

## Blockers

None currently.

---

## Session Continuity

Last session: 2026-02-04
Stopped at: Completed 05-01-PLAN.md (SSE Event Enrichment, 2 tasks, 2 commits)
Resume file: None

---

## Notes

- **Git commits:** User handles all commits manually (NEVER auto-commit)
- **Execution mode:** YOLO except for invasive commands and git commits
- **Depth:** Comprehensive - each phase gets detailed planning file
- **Frontend reference:** `DEVELOPMENT_DOCS/YATHARTH_WORK_SUMMARY.md` for all frontend file paths and TODOs

---

*State file auto-updated during GSD workflow*
