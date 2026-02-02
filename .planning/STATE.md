# Holmes Project State

**Last Updated:** 2026-02-02
**Current Phase:** 3 of 12 (File Ingestion) — COMPLETE
**Current Plan:** Phase 3 complete, ready for Phase 4
**Current Milestone:** M1 - Holmes v1.0

## Progress Overview

| Phase | Name | Status | Started | Completed | Notes |
|-------|------|--------|---------|-----------|-------|
| 1 | Foundation Infrastructure | COMPLETE | 2026-01-21 | 2026-01-22 | |
| 1.1 | Frontend Design Foundation | COMPLETE | 2026-01-23 | 2026-01-24 | |
| 2 | Authentication & Case Shell | COMPLETE | 2026-01-24 | 2026-01-25 | |
| 3 | File Ingestion | COMPLETE | 2026-02-02 | 2026-02-02 | All 3 plans done |
| 4 | Core Agent System | NOT_STARTED | - | - | |
| 5 | Agent Flow | FRONTEND_DONE | - | - | Backend SSE needed |
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
- **Phase 3 Plan 03** (2026-02-02)
  - File list endpoint: GET /api/cases/{case_id}/files
  - File download via signed URL: GET /api/cases/{case_id}/files/{file_id}/download
  - File delete endpoint: DELETE /api/cases/{case_id}/files/{file_id}
  - SSE endpoint: /sse/cases/{case_id}/files for real-time status
  - Frontend CaseLibrary integrated with real APIs
  - Summary: `.planning/phases/03-file-ingestion/03-03-SUMMARY.md`

**What's next:**
- **Phase 4:** Core Agent System (ADK, Triage, Orchestrator)
- Then: Backend integration for all frontend-done phases

---

## Implementation Mapping: Requirements -> Files

### REQ-VIS-001: Agent Flow — FRONTEND_DONE

| Component | File Path |
|-----------|-----------|
| Main container | `frontend/src/components/CommandCenter/CommandCenter.tsx` |
| Agent canvas | `frontend/src/components/CommandCenter/AgentFlowCanvas.tsx` |
| Agent nodes | `frontend/src/components/CommandCenter/AgentNode.tsx` |
| Details panel | `frontend/src/components/CommandCenter/AgentDetailsPanel.tsx` |
| SSE hook | `frontend/src/hooks/useCommandCenterSSE.ts` |
| Config | `frontend/src/lib/command-center-config.ts` |
| Types | `frontend/src/types/command-center.ts` |

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
| Command Center SSE | `/api/cases/:caseId/command-center/stream` | SSE | HIGH | TODO |

---

## Roadmap Evolution

- **Phase 1.1 inserted after Phase 1:** Frontend Design Foundation (URGENT)
  - Reason: Establish robust frontend design foundation before subsequent phases build upon it
  - Reference: DOCS/UI/LANDING-INIT.md for landing page requirements

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

---

## Blockers

None currently.

---

## Notes

- **Git commits:** User handles all commits manually (NEVER auto-commit)
- **Execution mode:** YOLO except for invasive commands and git commits
- **Depth:** Comprehensive - each phase gets detailed planning file
- **Frontend reference:** `DEVELOPMENT_DOCS/YATHARTH_WORK_SUMMARY.md` for all frontend file paths and TODOs

---

*State file auto-updated during GSD workflow*
