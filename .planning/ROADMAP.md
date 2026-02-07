# Holmes Development Roadmap

**Version:** 1.0
**Created:** 2026-01-18
**Status:** DRAFT

## Milestone: M1 - Holmes v1.0

**Goal:** Production-ready legal intelligence platform with full agentic pipeline, transparency visualization, and knowledge graph capabilities for fraud investigation demo.

**Success Criteria:**
- End-to-end demo: Upload fraud case files → Agentic analysis → Knowledge Graph → Chat with citations
- Agent Flow shows full reasoning transparency
- Contradictions and gaps detected and displayed
- All findings have source citations
- Deployed and accessible via public URL

---

## Phase Overview

| Phase | Name | Focus | Requirements Covered | Status |
|-------|------|-------|---------------------|--------|
| 1 | Foundation Infrastructure | CI/CD, Database, Storage, SSE skeleton | REQ-INF-* | ✅ COMPLETE |
| 1.1 | Frontend Design Foundation (INSERTED) | Design system, Liquid Glass, Landing page | UX quality (foundational) | ✅ COMPLETE |
| 2 | Authentication & Case Shell | Auth system, Case CRUD, basic UI shell | REQ-AUTH-*, REQ-CASE-001/002/003 | ✅ COMPLETE |
| 3 | File Ingestion | Upload, storage, file management | REQ-CASE-004/005, REQ-SOURCE-* (basic) | ✅ COMPLETE |
| 4 | Core Agent System | ADK setup, Triage Agent, Orchestrator, Research/Discovery stubs | REQ-AGENT-001/002/007/007a/007b/007e | ✅ COMPLETE |
| 4.1 | Agent Decision Tree Revamp (INSERTED) | Replace D3 Command Center with @xyflow/react + dagre decision tree | REQ-VIS-001 (visual quality) | ✅ COMPLETE |
| 5 | Agent Flow | Real-time visualization, SSE streaming, HITL dialogs | REQ-VIS-001/001a/002, REQ-INF-004 | ✅ COMPLETE |
| 6 | Domain Agents | Financial, Legal, Strategy, Evidence agents, Entity taxonomy, Hypothesis evaluation | REQ-AGENT-003/004/005/006/007c/007d/007h, REQ-HYPO-002/003 | ✅ COMPLETE |
| 7 | Knowledge Storage & Domain Agent Enrichment | DB schema, enriched citations, KG Builder, findings storage, KG API | REQ-AGENT-009, REQ-STORE-001/002, REQ-AGENT-003-006 (enrichment) | ⏳ NOT_STARTED |
| 7.1 | Knowledge Graph Frontend (vis-network) | Premium graph visualization with clustering, physics, relationship-based layout | REQ-VIS-003 | ⏳ NOT_STARTED |
| 8 | Synthesis Agent & Intelligence Layer | Cross-referencing, hypotheses, contradictions, gaps, timeline, case summary/verdict | REQ-AGENT-008, REQ-HYPO-*, REQ-WOW-*, REQ-VIS-004/005/006, REQ-TASK-001/002 | ⏳ NOT_STARTED |
| 8.1 | Geospatial Agent & Map View | Location intelligence, geocoding, movement patterns, Earth Engine | REQ-GEO-* | ⏳ NOT_STARTED |
| 9 | Chat Interface & Research | Multi-source tool-based Q&A, research/discovery, context caching | REQ-CHAT-*, REQ-RESEARCH-*, REQ-HYPO-007/008 | 🟡 FRONTEND_DONE |
| 10 | Source Panel & Agent Flow Polish | Source viewers, citation navigation, task panel, narrative generation | REQ-SOURCE-*, REQ-VIS-*, REQ-TASK-003-007 | 🟡 FRONTEND_DONE |
| 11 | Corrections & Refinement | Error flagging, Verification, Regeneration | REQ-CORR-* | ⏳ NOT_STARTED |
| 12 | Demo Preparation | Demo case showcasing all integration features | Demo readiness, REQ-RESEARCH-004, REQ-AGENT-007i | ⏳ NOT_STARTED |

> **Status Legend:** ✅ COMPLETE | 🟡 FRONTEND_DONE (backend pending) | ⏳ NOT_STARTED | ⏳ PLANNED
> **Note:** Phase 6 complete (2026-02-06, 35 commits). Architecture redesigned 2026-02-07: Phases 7-9 restructured with KG-as-Memory pattern, hybrid storage (PG + Vector), programmatic KG Builder, Synthesis Agent, vis-network frontend, and tool-based Chat Agent.

**Post-MVP:**
| Phase | Name | Focus | Requirements |
|-------|------|-------|--------------|
| 13 | Memory Service | Cross-case learning, pattern recognition | REQ-MEM-001 |


> NOTE: Use the design guide in DOCS/UI/DESIGN-SYSTEM.md to align yourself for the UI.
---

## Phase 1: Foundation Infrastructure

**Goal:** Establish deployment pipeline and core infrastructure that all other phases depend on.

**Requirements:** REQ-INF-001, REQ-INF-002, REQ-INF-003, REQ-INF-004 (partial)

**Plans:** 6 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — Monorepo scaffolding (workspaces, tooling, Docker Compose)
- [x] 01-02-PLAN.md — Terraform infrastructure (Cloud SQL, GCS, Cloud Run, WIF)
- [x] 01-03-PLAN.md — Type generation pipeline (Pydantic to TypeScript)
- [x] 01-04-PLAN.md — Backend skeleton (FastAPI, health, SSE, Alembic)
- [x] 01-05-PLAN.md — Frontend skeleton (Next.js, home page, Dockerfile)
- [x] 01-06-PLAN.md — CI/CD pipeline (GitHub Actions, deployment verification)

**Deliverables:**
- GitHub Actions CI/CD pipeline deploying to Cloud Run
- PostgreSQL on Cloud SQL with initial schema
- Cloud Storage bucket configured
- FastAPI skeleton with health endpoint
- Next.js skeleton with home page
- SSE endpoint skeleton (heartbeat only)
- Monorepo structure: `/backend`, `/frontend`

**Technical Notes:**
- Use Workload Identity Federation for GitHub → GCP auth
- Separate Cloud Run services for frontend and backend
- Environment variables managed via Secret Manager
- Database migrations via Alembic from CI

**Exit Criteria:**
- Push to main triggers successful deployment
- `/health` endpoint returns 200 from Cloud Run URL
- Database connection verified
- GCS bucket accessible from backend

---

## Phase 1.1: Frontend Design Foundation (INSERTED)

**Goal:** Establish frontend design system and create an impressive landing page before building upon the frontend in subsequent phases.

**Requirements:** None (foundational work for UX quality)

**Plans:** 5 plans in 3 waves

Plans:
- [x] 01.1-01-PLAN.md — Design tokens, typography, Motion library setup
- [x] 01.1-02-PLAN.md — UI primitives (GlassCard, AnimatedSection) and animation utilities
- [x] 01.1-03-PLAN.md — Above-the-fold sections (Navigation, Hero, Problem)
- [x] 01.1-04-PLAN.md — Core content sections (Solution, How It Works, Feature Highlights)
- [x] 01.1-05-PLAN.md — Final sections (Trust, CTA, Footer) and page assembly

**Deliverables:** ✓ COMPLETE
- Design system and component library foundation
- Liquid Glass design language implementation (premium cream palette)
- Dark theme with professional aesthetic
- Impressive landing page with all 9 sections from LANDING-INIT.md
- Motion animations and scroll interactions
- Responsive design (desktop-first, mobile-optimized)
- Inline video player with play/pause controls
- Ethereal shadow background effect
- Logo with scroll-based letter fade animation
- Hero video hosted on GCS bucket for production

**Technical Notes:**
- Reference: DOCS/UI/LANDING-INIT.md for landing page requirements
- Motion library (v12+) for animations, not framer-motion
- Fraunces font via next/font for distinctive typography
- Tailwind CSS v4 with @theme directive for design tokens
- Detective noir meets modern AI aesthetic
- Video loaded via NEXT_PUBLIC_VIDEO_URL env var (GCS in production)

**Exit Criteria:** ✓ ALL MET
- Landing page implemented with all sections from LANDING-INIT.md
- Liquid Glass design elements functional
- Scroll-triggered animations working
- Responsive across desktop and mobile
- Dark theme polished and consistent

---

## Phase 2: Authentication & Case Shell

**Goal:** Implement auth system and basic case management shell.

**Requirements:** REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-003, REQ-AUTH-004, REQ-CASE-001, REQ-CASE-002, REQ-CASE-003

**Plans:** 7 plans in 5 waves

Plans:
- [x] 02-01-PLAN.md — Backend auth infrastructure (models, session validation, migration)
- [x] 02-02-PLAN.md — Backend case CRUD endpoints
- [x] 02-03-PLAN.md — Frontend Better Auth setup (config, middleware, client)
- [x] 02-04-PLAN.md — Auth UI (login/signup page with forms)
- [x] 02-05-PLAN.md — App shell (sidebar, layout, user menu)
- [x] 02-06-PLAN.md — Case list and creation UI
- [x] 02-07-PLAN.md — Infrastructure deployment updates (secrets, Cloud SQL, CI/CD)

**Deliverables:** ✓ COMPLETE
- Better Auth integration in Next.js
- Email/password signup and login
- Google OAuth login
- Session persistence with JWT
- Protected routes
- Case creation form
- Case list view with status
- Case deletion with confirmation
- FastAPI middleware for session validation

**Technical Notes:**
- Better Auth stores sessions in shared PostgreSQL
- FastAPI reads auth tables, doesn't write
- User ID from session used for all case queries
- Database schema: users, sessions, accounts, cases tables

**Exit Criteria:** ✓ ALL MET
- User can register, login, logout
- Google OAuth works
- Session persists across refresh
- Cases visible only to owner
- Case CRUD operations work

---

## Phase 3: File Ingestion

**Goal:** Enable evidence file upload and management.

**Requirements:** REQ-CASE-004, REQ-CASE-005, REQ-SOURCE-001 (basic), REQ-SOURCE-002 (basic), REQ-SOURCE-003 (basic), REQ-SOURCE-004 (basic)

**Status:** ✅ COMPLETE

**Plans:** 3 plans in 3 waves

Plans:
- [x] 03-01-PLAN.md — Database model (CaseFile), migration, Pydantic schemas
- [x] 03-02-PLAN.md — File upload endpoint with GCS chunked streaming
- [x] 03-03-PLAN.md — List/download/delete APIs, SSE events, frontend integration

**Verification:** `.planning/phases/03-file-ingestion/03-VERIFICATION.md` — 6/6 observable truths verified

**Deliverables:** ✓ COMPLETE
- Drag-and-drop file upload UI (`CaseLibrary.tsx`)
- Multiple file upload with progress tracking
- Files stored in GCS (`cases/{case_id}/files/{file_uuid}.{ext}`)
- File metadata in PostgreSQL (`case_files` table with 18 fields)
- Case Library view with list layout
- File type icons and category badges
- File status indicators (UPLOADING, UPLOADED, QUEUED, PROCESSING, ANALYZED, ERROR)
- Duplicate detection via SHA-256 content hash
- Conflict resolution UI (View Original, Keep Both, Remove Duplicate)
- Multi-select with bulk delete
- Download via 24h signed URLs
- Real-time SSE status updates
- Basic file viewers deferred to Phase 10

**Technical Notes:**
- Chunked upload with 8MB chunks, 500MB max file size
- SHA-256 content hash computed during upload for duplicate detection
- Signed URLs with service account impersonation for local development
- File status: UPLOADING, UPLOADED, QUEUED, PROCESSING, ANALYZED, ERROR
- SSE pubsub via in-memory for single-instance deployment
- **Key files:**
  - Backend: `backend/app/api/files.py`, `backend/app/services/file_service.py`, `backend/app/models/file.py`
  - Frontend: `frontend/src/components/library/CaseLibrary.tsx`, `frontend/src/hooks/useFileUpload.ts`, `frontend/src/lib/api/files.ts`

**Exit Criteria:** ✓ ALL MET
- ✅ Upload multiple files to a case
- ✅ View files in Case Library
- ✅ Download files via signed URLs
- ✅ Delete individual and bulk files
- ✅ Duplicate detection with conflict resolution
- ✅ Real-time status updates via SSE
- Basic preview for all file types (deferred to Phase 10)

---

## Phase 4: Core Agent System

**Goal:** Establish ADK infrastructure and first agents (Triage + Orchestrator).

**Requirements:** REQ-AGENT-007, REQ-AGENT-007a, REQ-AGENT-007b, REQ-AGENT-007e, REQ-AGENT-001, REQ-AGENT-002 (partial)

**Plans:** 5 plans in 3 waves

Plans:
- [x] 04-01-PLAN.md — ADK infrastructure (dependencies, config, services, factory pattern)
- [x] 04-02-PLAN.md — Database models and schemas (agent execution logging, triage output)
- [x] 04-03-PLAN.md — Triage Agent implementation (prompts, processing, output parsing)
- [x] 04-04-PLAN.md — Orchestrator Agent skeleton (routing logic, research triggers)
- [x] 04-05-PLAN.md — API endpoints and SSE integration (start analysis, command center stream)

**Deliverables:**
- Google ADK 1.23.x integration
- DatabaseSessionService with PostgreSQL
- GcsArtifactService for versioned storage
- Agent factory pattern (fresh instances per workflow)
- State scope prefix usage (none, user:, app:, temp:)
- Triage Agent implementation with `thinking_level="low"`
- Triage outputs: domain scores, complexity, summary, entities
- Orchestrator Agent skeleton with `thinking_level="high"`
- **Orchestrator routing stubs for Research/Discovery agents** (future phases)
- **Orchestrator → Research trigger logic** (autonomous when gaps detected)
- Agent execution logging to database
- Callback-to-SSE mapping for visualization
- ADK limitations documented and mitigated

**Technical Notes:**
- ADK constraint: single parent per agent instance
- State namespacing: `{user_id}_{case_id}_{workflow_id}`
- Gemini Flash for Triage (speed), Pro for Orchestrator (reasoning)
- Store agent outputs in JSONB columns
- Configure `include_thoughts=True` for all agents
- Implement all 6 ADK callbacks for real-time visualization
- Tool confirmation NOT available with DatabaseSessionService (use frontend)
- Orchestrator routing logic prepared for Research/Discovery invocation

**Status:** ✅ COMPLETE

**Verification:** `.planning/phases/04-core-agent-system/04-VERIFICATION.md` — 6/6 must-haves verified

**Exit Criteria:** ✓ ALL MET
- ✅ Triage Agent processes uploaded files
- ✅ Domain scores and entities extracted
- ✅ Orchestrator receives triage output
- ✅ Agent execution logged to database
- ✅ SSE events fire for agent lifecycle (AGENT_SPAWNED, THINKING_UPDATE, AGENT_COMPLETED)
- ✅ Thinking traces captured and available for display

---

## Phase 4.1: Agent Decision Tree Revamp (INSERTED)

**Goal:** Completely revamp the Command Center agent visualization from the current D3-based static node layout to a @xyflow/react + dagre-powered decision tree with rich animations, chosen-path highlighting, smoothstep edges, portal tooltips, and a spring-animated details sidebar — matching the reference implementation from the agent-decision-tree-guide.

**Depends on:** Phase 4

**Requirements:** REQ-VIS-001 (visual quality improvement)

**Plans:** 4 plans in 3 waves

Plans:
- [x] 04.1-01-PLAN.md — Dependencies, scoped CSS variables, config update, DecisionNode component
- [x] 04.1-02-PLAN.md — NodeDetailsSidebar with spring animation and color-coded sections
- [x] 04.1-03-PLAN.md — ReactFlow canvas with dagre layout, CommandCenter integration, state hooks, layout engine
- [x] 04.1-04 (unplanned refinement) — Muted color palette, FileRoutingEdge, page-level sidebar lift

**Deliverables:** ✓ COMPLETE
- Replace D3 SVG canvas with `@xyflow/react` + dagre auto-layout
- Custom `DecisionNode` with motion entrance/hover animations, muted glow (no text shadow)
- Muted per-agent color palette (~50% saturation reduction, hues preserved for identity)
- Gray neutral edge tiers (processing/chosen/inactive) replacing cyan glow
- Custom `FileRoutingEdge` with click-to-expand file list popup on edges
- `FileGroupNode` intermediate layer between orchestrator and domain agents
- Dagre top-to-bottom hierarchical layout (`rankdir: TB`)
- Portal-rendered tooltip ("Click for more details") via `getBoundingClientRect()`
- `NodeDetailsSidebar` as page-level 30% screen-width panel (not overlay)
- Color-coded sidebar sections with compact badge styling
- Dark canvas background with dot grid via ReactFlow `<Background>`
- Auto-fit viewport with 1.5s smooth animation
- State lifted to page level: `useAgentStates` + `selectedAgent` owned by page
- Extracted `command-center-graph.ts` (node/edge builder) and `command-center-layout.ts` (dagre layout engine)
- `useAgentFlowGraph` hook composing graph building + layout in a single useMemo
- `mock-command-center-data.ts` for demo mode fallback
- All existing SSE integration, types, and hooks preserved

**Technical Notes:**
- Install `@xyflow/react` and `@dagrejs/dagre` as dependencies (no separate @types needed)
- `motion` (v12+) already installed — use for node animations
- Map existing `AgentType` (triage, orchestrator, financial, legal, strategy, knowledge-graph) to decision tree nodes
- Map existing `DEFAULT_CONNECTIONS` to ReactFlow edges
- Chosen path = agent with status `processing` or `complete`; unchosen = `idle`
- Agent pipeline is a fixed tree: triage → orchestrator → [financial, legal, strategy] → knowledge-graph
- Node dimensions: 300px wide, 100px tall, `rounded-lg` (~8px radius)
- Color system: Use existing Holmes design tokens where possible, add accent variables for chosen-path highlighting
- Sidebar replaces current `AgentDetailsPanel` with spring animation and color-coded sections
- Wrap parent page in `<ReactFlowProvider>`
- Import `@xyflow/react/dist/style.css`
- **Reference: `DOCS/UI/agent-decision-tree-guide.md`** — READ THIS FIRST for pixel-level visual spec, data model, component breakdown, color system, animation specs, and layout geometry

**Key files created:**
- `frontend/src/components/CommandCenter/DecisionNode.tsx` — Custom ReactFlow node with motion animations
- `frontend/src/components/CommandCenter/NodeDetailsSidebar.tsx` — Spring-animated sidebar with agent-type sections
- `frontend/src/components/CommandCenter/FileGroupNode.tsx` — Intermediate file group layer node
- `frontend/src/components/CommandCenter/FileRoutingEdge.tsx` — Custom edge with click-to-expand file list popup
- `frontend/src/hooks/useAgentStates.ts` — Agent state management extracted from CommandCenter
- `frontend/src/hooks/useAgentFlowGraph.ts` — Composing graph building + dagre layout
- `frontend/src/lib/command-center-graph.ts` — Node/edge construction from agent states
- `frontend/src/lib/command-center-layout.ts` — Dagre layout engine with progressive visibility
- `frontend/src/lib/mock-command-center-data.ts` — Mock data for demo mode fallback

**Key files modified:**
- `frontend/src/components/CommandCenter/AgentFlowCanvas.tsx` — Rewritten with ReactFlow (simplified thin wrapper)
- `frontend/src/components/CommandCenter/CommandCenter.tsx` — Rewritten with ReactFlowProvider, uses extracted hooks
- `frontend/src/lib/command-center-config.ts` — Muted palette, AGENT_TYPE_TINTS, removed manual positions
- `frontend/src/app/globals.css` — Scoped .command-center-scope CSS variables
- `frontend/src/app/(app)/cases/[id]/command-center/page.tsx` — Sidebar lifted to page level
- `frontend/src/app/(app)/cases/[id]/command-center-demo/page.tsx` — Same sidebar lift

**Files preserved (no changes):**
- `frontend/src/types/command-center.ts` — All types remain
- `frontend/src/hooks/useCommandCenterSSE.ts` — SSE hook remains
- `frontend/src/lib/command-center-validation.ts` — Validation remains

**Dead code (not deleted, superseded):**
- `frontend/src/components/CommandCenter/AgentNode.tsx` — Replaced by DecisionNode
- `frontend/src/components/CommandCenter/AgentDetailsPanel.tsx` — Replaced by NodeDetailsSidebar

**Exit Criteria:**
- Agent decision tree renders with hierarchical dagre layout (top-to-bottom)
- Active/chosen agents have accent-colored nodes with glow, floating animation, pulsing border
- Inactive agents are muted dark gray with hover effects
- Smoothstep edges animate along chosen path with glowing trail
- Clicking any node opens spring-animated sidebar with color-coded sections
- Portal tooltip appears on hover above each node
- Canvas has dark background with dot grid pattern
- Viewport auto-fits all nodes on mount
- Pan/zoom works, nodes are not draggable
- All existing SSE events and agent state management still functional

---

## Phase 5: Agent Flow

**Goal:** Real-time visualization of agent execution with full transparency.

**Requirements:** REQ-VIS-001, REQ-VIS-001a, REQ-VIS-002, REQ-INF-004 (complete)

**Plans:** 4 plans in 3 waves

Plans:
- [x] 05-01-PLAN.md — Backend SSE enrichment (thinking traces, tokens, timing, state snapshots)
- [x] 05-02-PLAN.md — Backend HITL confirmation system (asyncio.Event pause/resume)
- [x] 05-03-PLAN.md — Frontend SSE wiring (URL fix, new event types, thinking trace accumulation)
- [x] 05-04-PLAN.md — Frontend HITL modal, token display, duration badges, execution timeline

**Status:** ✅ COMPLETE (2026-02-05) — 4 plans + 15 post-plan commits

### Frontend Completed
The Command Center frontend was built in three stages:

**Stage 1 — Yatharth's initial implementation (2026-02-02):**
- Original D3-based canvas and agent nodes (fully superseded by Phase 4.1)
- SSE hook (`useCommandCenterSSE.ts`) and connection status indicator (still in use)

**Stage 2 — Phase 4.1: Decision Tree Revamp (2026-02-04, 19 commits):**
- ✅ @xyflow/react + dagre hierarchical decision tree (replaced D3 canvas)
- ✅ Custom `DecisionNode` with motion entrance/hover animations, muted glow
- ✅ Custom `FileGroupNode` intermediate layer between orchestrator and domain agents
- ✅ Custom `FileRoutingEdge` with click-to-expand file list popup
- ✅ Muted per-agent color palette (~50% saturation, hues preserved for identity)
- ✅ Gray neutral edge tiers (processing/chosen/inactive)
- ✅ `NodeDetailsSidebar` as page-level 30% screen-width panel with spring animation
- ✅ Color-coded sidebar sections with compact badge styling
- ✅ Portal-rendered tooltip ("Click for more details") via `getBoundingClientRect()`
- ✅ Dagre top-to-bottom auto-layout with auto-fit viewport (1.5s smooth animation)
- ✅ State management hooks: `useAgentStates`, `useAgentFlowGraph`
- ✅ Utility modules: `command-center-graph.ts` (node/edge builder), `command-center-layout.ts` (dagre engine)
- ✅ Mock data for demo mode fallback (`mock-command-center-data.ts`)
- ✅ Dark canvas background with dot grid via ReactFlow `<Background>`

**Stage 3 — Post-4.1 cleanup (2026-02-04, 1 commit):**
- ✅ Shared `CanvasZoomControls` component extracted to `ui/canvas-zoom-controls.tsx` (used by both Command Center and Knowledge Graph)

### Backend Work Completed (2026-02-05)
- ✅ Real-time updates via SSE with ADK callback mapping (THINKING_UPDATE, TOOL_CALLED events)
- ✅ Thinking traces integration (full untruncated text via after_model_callback)
- ✅ Token usage display (inputTokens, outputTokens, durationMs in metadata)
- ✅ Execution timeline (Gantt chart with agent timing overlap)
- ⏳ Human-in-the-loop confirmation dialogs — **infra built** (asyncio.Event, REST API, frontend modal); **E2E verification deferred to Phase 6+** when domain agents can trigger confirmations

**Deliverables:** ✓ COMPLETE (HITL infra only)
- ~~ReactFlow canvas for agent visualization~~ ✅ (@xyflow/react + dagre, Phase 4.1)
- ~~Agent nodes with type-based styling~~ ✅ (DecisionNode, 7 agent types including evidence)
- ~~Animated edges during data flow~~ ✅ (FileRoutingEdge, gray tier system)
- ~~Click-to-expand agent detail sidebar~~ ✅ (NodeDetailsSidebar, page-level 30% panel)
- ~~Detail view: model, input, tools, output, duration, thinking traces~~ ✅ (complete with real data)
- ~~SSE hook with reconnection~~ ✅ (useCommandCenterSSE.ts with state-snapshot on reconnect)
- ~~Connection status indicator~~ ✅ (Connected/Reconnecting/Demo Mode)
- ~~Zoom controls~~ ✅ (shared CanvasZoomControls component)
- ~~Real-time updates via SSE with callback mapping~~ ✅ (THINKING_UPDATE, TOOL_CALLED, state-snapshot)
- ~~Token usage display~~ ✅ (CollapsibleSection in sidebar with input/output tokens, model)
- ~~Execution timeline~~ ✅ (Gantt chart showing agent timing overlap)
- Human-in-the-loop confirmation dialogs ⏳ **infra built** (ConfirmationModal, REST API, asyncio.Event) — **E2E verification deferred to Phase 6+**

**Technical Notes:**
- @xyflow/react 12 + @dagrejs/dagre for hierarchical layout
- motion (v12+) for node entrance/hover animations
- Memoization via useMemo in useAgentFlowGraph hook
- Async queue for callback → SSE event translation (backend)
- Thinking traces from `include_thoughts=True` configuration (backend)
- Frontend confirmation dialogs needed (ADK limitation: require_confirmation only works with InMemorySessionService)
- **Frontend files:**
  - Components: `frontend/src/components/CommandCenter/` (DecisionNode, FileGroupNode, FileRoutingEdge, NodeDetailsSidebar, AgentFlowCanvas, CommandCenter)
  - Shared UI: `frontend/src/components/ui/canvas-zoom-controls.tsx`
  - Hooks: `frontend/src/hooks/useCommandCenterSSE.ts`, `frontend/src/hooks/useAgentStates.ts`, `frontend/src/hooks/useAgentFlowGraph.ts`
  - Utilities: `frontend/src/lib/command-center-graph.ts`, `frontend/src/lib/command-center-layout.ts`, `frontend/src/lib/command-center-config.ts`
  - Types: `frontend/src/types/command-center.ts`
  - Pages: `frontend/src/app/(app)/cases/[id]/command-center/page.tsx`, `frontend/src/app/(app)/cases/[id]/command-center-demo/page.tsx`
  - Dead code (superseded): `AgentNode.tsx`, `AgentDetailsPanel.tsx`

**Exit Criteria:** ✓ MET (HITL deferred)
- ✅ Real-time agent flow visible during processing (SSE events fire for all lifecycle stages)
- ✅ Click any node for full details in sidebar (token usage, timing, thinking traces)
- ✅ Thinking traces displayed correctly (full untruncated text from after_model_callback)
- ✅ SSE connection stable with reconnection (state-snapshot on reconnect, exponential backoff)
- ⏳ Confirmation dialogs work for sensitive operations — **infra built, E2E verification deferred to Phase 6+**

---

## Phase 6: Domain Agents

**Goal:** Implement all four domain analysis agents with proper thinking configuration.

**Status:** ✅ COMPLETE (2026-02-06) — 5 plans (14 commits) + 21 post-plan commits (35 total)

**Verification:** `.planning/phases/06-domain-agents/06-VERIFICATION.md` — 10/10 must-haves verified + post-plan addendum

**Requirements:** REQ-AGENT-003, REQ-AGENT-004, REQ-AGENT-005, REQ-AGENT-006, REQ-AGENT-007b, REQ-AGENT-007c, REQ-AGENT-007d, REQ-AGENT-007h, REQ-AGENT-002 (complete), REQ-HYPO-002, REQ-HYPO-003

**Plans:** 5 plans in 3 waves

Plans:
- [x] 06-01-PLAN.md — Domain output schemas, factory extension, infrastructure updates
- [x] 06-02-PLAN.md — Domain agent prompts (Financial, Legal, Evidence, Strategy)
- [x] 06-03-PLAN.md — Financial, Legal, Evidence agent modules + parallel runner
- [x] 06-04-PLAN.md — Strategy agent module (sequential, receives domain summaries)
- [x] 06-05-PLAN.md — Pipeline wiring, SSE events, HITL confirmation integration


**Deliverables:**
- Financial Analysis Agent (`thinking_level="high"`, `media_resolution="high"`)
  - **Full entity taxonomy for financial domain** (monetary_amount, account, transaction, asset)
- Legal Analysis Agent (`thinking_level="high"`, `media_resolution="high"`)
  - **Full entity taxonomy for legal domain** (statute, case_citation, contract, legal_term, court)
- Strategy Analysis Agent (`thinking_level="high"`, `media_resolution="medium"`)
- Evidence Analysis Agent (`thinking_level="high"`, `media_resolution="high"`)
  - Authenticity analysis (manipulation detection, metadata consistency)
  - Chain of custody documentation
  - Corroboration scoring
  - Quality assessment output schema
  - **Full entity taxonomy for evidence domain** (communication, alias, vehicle, property, timestamp)
- **Hypothesis evaluation in all domain agent prompts**
  - Agents evaluate findings against existing hypotheses
  - Output includes hypothesis_evaluations
- Parallel execution via asyncio.gather (not ADK ParallelAgent)
- Inline Pro-to-Flash fallback for each domain agent
- Video/audio processing via Gemini File API
- Structured output schemas per agent (Pydantic models)
- Span-level citation extraction
- Agent output aggregation for Synthesis
- **HITL E2E verification** (deferred from Phase 5): Domain agents trigger confirmations for sensitive operations
- **DomainAgentRunner Template Method base class** (post-plan refactoring)
  - All 4 domain agents migrated to subclasses (~800 lines of duplication eliminated)
  - `extract_structured_json` generic parser replaces per-agent parse functions
- **Per-agent routing HITL system** (post-plan feature)
  - Routing confidence scoring with per-agent-type thresholds
  - Batch confirmation modal with per-agent rejection
  - Strategy agent standalone execution with HITL
- **Production hardening** (post-plan)
  - State snapshot refresh resilience (lastResult preservation)
  - Exception handling in domain agent runner for SSE error emission
  - Orchestrator execution committed to DB before domain agent launch
  - JSON thinking trace normalization for Gemini multimodal output
- **Pipeline bugfixes from live testing** (post-plan)
  - compute_agent_tasks covered-pairs tracking for per-file multi-agent routing
  - Strategy gated on orchestrator routing decision
  - Routing decisions flattened to one card per (file, agent) pair
  - Thought parts excluded from JSON parsing

**Technical Notes:**
- All agents receive file content directly (Gemini multimodal)
- Citation format: `{file_id}#{locator}` where locator is page/timestamp/region
- Domain agents run in parallel via asyncio.gather after Orchestrator routing
- Use `media_resolution="high"` for dense document processing
- Video/audio forced through Gemini File API regardless of size
- Audio: request speaker diarization in prompts (best-effort)
- Inline Pro-to-Flash fallback pattern (not separate ResilientAgentWrapper class)
- **DomainAgentRunner** Template Method base class: subclasses override agent_type, output_type, _create_agent
- **extract_structured_json** generic parser: filters thought parts, handles code fences, validates via Pydantic
- **format_thinking_traces**: normalizes JSON-structured thinking (common with multimodal) to readable text
- **compute_agent_tasks** uses covered_pairs set[tuple[str, str]] to track (file_id, agent_type) coverage
- **Per-agent routing HITL**: ROUTING_CONFIDENCE_THRESHOLDS per agent type, batch confirmation modal
- **Strategy gating**: only runs when explicitly requested by orchestrator (parallel_agents/sequential_agents/routing_decisions)
- **Domain agent prompts include: "Evaluate findings against existing hypotheses"**
- **Key architecture files:**
  - `backend/app/agents/domain_agent_runner.py` — DomainAgentRunner Template Method base class
  - `backend/app/agents/domain_runner.py` — compute_agent_tasks, run_domain_agents_parallel, build_strategy_context
  - `backend/app/agents/parsing.py` — extract_structured_json, extract_response_texts, format_thinking_traces
  - `backend/app/api/agents.py` — Pipeline wiring, strategy gating, routing HITL, SSE emission
  - `backend/app/api/sse.py` — State snapshots, thinking trace normalization, routing decision flattening

**Exit Criteria:** ✓ ALL MET (10/10 + post-plan hardening)
- ✅ All four domain agents process files (migrated to DomainAgentRunner base class)
- ✅ Parallel execution via asyncio.gather with independent DB sessions
- ✅ Thinking traces captured for all agents (JSON normalized for multimodal)
- ✅ Video/audio forced through File API for reliable processing
- ✅ Graceful degradation works (inline Pro-to-Flash fallback)
- ✅ Structured findings with span-level citations output
- ✅ Hypothesis evaluations included in agent output
- ✅ Domain-specific entity taxonomy extracted
- ✅ Outputs aggregated for next phase (build_strategy_context + domain_results dict)
- ✅ HITL confirmation flow verified E2E (agent triggers → modal appears → user responds → agent continues)
- ✅ Per-agent routing HITL with batch confirmation (post-plan)
- ✅ Strategy agent gated on orchestrator routing decision (post-plan)
- ✅ Routing decisions display all target agents per file (post-plan)
- ✅ State snapshot refresh resilience with lastResult preservation (post-plan)

---

## Phase 7: Knowledge Storage & Domain Agent Enrichment

**Goal:** Create the knowledge storage foundation and enrich domain agent outputs with exhaustive exact-source citations for downstream consumption by KG Builder, Synthesis, and Chat.

**Requirements:** REQ-AGENT-009 (partial — programmatic KG Builder), REQ-STORE-001, REQ-STORE-002, REQ-AGENT-003/004/005/006 (citation enrichment)

**Depends on:** Phase 6 (Domain Agents)

**Status:** ⏳ NOT_STARTED

**Plans:** 5 plans in 3 waves

Plans:
- [ ] 07-01-PLAN.md — DB schema: 9 new tables (KG, findings, synthesis) + Alembic migration + tsvector search
- [ ] 07-02-PLAN.md — Pydantic schemas for KG/findings APIs + domain agent findings_text enrichment
- [ ] 07-03-PLAN.md — KG Builder service (entity extraction, relationships, deduplication) + findings service (storage, full-text search)
- [ ] 07-04-PLAN.md — Domain agent prompt enrichment (exhaustive citations, findings_text instructions)
- [ ] 07-05-PLAN.md — API endpoints (KG + findings), SSE events, pipeline wiring

### Frontend Available (Yatharth, 2026-02-02)
- ✅ D3.js Knowledge Graph visualization (to be replaced by vis-network in Phase 7.1)
- ✅ Entity detail panel, legend, zoom/pan controls
- ✅ Evidence source panel (`evidence-source-panel.tsx`)
- ✅ Hooks ready (`use-case-graph.ts`)

### Backend Work
**Deliverables:**
- New database tables + Alembic migrations:
  - `kg_entities` (id, case_id, name, entity_type, domain, metadata JSONB, source_execution_id, source_finding_index, merged_into_id, created_at)
  - `kg_relationships` (id, case_id, source_entity_id, target_entity_id, type, label, strength, source_execution_id, metadata JSONB, created_at)
  - `case_findings` (id, case_id, workflow_id, agent_type, agent_execution_id, file_group_label, category, title, finding_text, confidence, citations JSONB, entity_ids JSONB, created_at)
  - `case_hypotheses` (id, case_id, workflow_id, claim, status, confidence, supporting_evidence JSONB, contradicting_evidence JSONB, source_agent, reasoning, created_at)
  - `case_contradictions` (id, case_id, workflow_id, claim_a, claim_b, source_a JSONB, source_b JSONB, severity, domain, resolution_status, created_at)
  - `case_gaps` (id, case_id, workflow_id, description, what_is_missing, why_needed, priority, related_entity_ids JSONB, suggested_actions, created_at)
  - `case_synthesis` (id, case_id, workflow_id, case_summary, case_verdict JSONB, cross_modal_links JSONB, cross_domain_conclusions JSONB, key_findings_summary, risk_assessment, timeline_event_count, created_at)
  - `timeline_events` (id, case_id, workflow_id, title, description, event_date, event_end_date, event_type, layer, source_entity_ids JSONB, citations JSONB, created_at)
  - `locations` (id, case_id, workflow_id, name, coordinates JSONB, location_type, source_entity_ids JSONB, temporal_associations JSONB, created_at) — populated later by Geospatial Agent (Phase 8.1)
- Domain agent prompt enrichment:
  - Exhaustive span-level citations for EVERY statement (exact excerpts, page numbers, timestamps)
  - Rich markdown `findings_text` field: detailed analysis paragraphs per finding with inline source references
  - Instruction reinforcement: "Every factual claim must reference the exact source excerpt"
- Domain agent output schema enhancements:
  - Add `findings_text: str` field (markdown format, extensive analysis with inline citations)
  - Ensure `Citation` model captures exact excerpts and page/timestamp locators
- Programmatic KG Builder service (Python, NOT an LLM agent):
  - Reads domain agent structured output (`agent_executions.output_data`)
  - Extracts ALL entities from `DomainEntity` lists across all domain agents
  - Creates relationship edges (entity A mentioned with entity B in same finding)
  - Entity deduplication: exact name+type match → auto-merge; fuzzy >85% → flag for LLM resolution in Phase 8
  - Degree computation (connection counts for node sizing)
  - Additive-only: NEVER filters or discards entities/relationships
- case_findings storage service:
  - Saves each finding to `case_findings` table after domain agent completes
  - Links to agent_execution via agent_execution_id for audit trail
- KG API endpoints:
  - `GET /api/cases/:caseId/graph` — Full graph data (nodes + edges for frontend)
  - `GET /api/cases/:caseId/entities` — Entity list with search/filter
  - `GET /api/cases/:caseId/relationships` — Relationship list
  - `POST /api/cases/:caseId/entities` — Create entity (manual user addition)
  - `PATCH /api/cases/:caseId/entities/:entityId` — Update entity
  - `DELETE /api/cases/:caseId/entities/:entityId` — Delete entity
  - `POST /api/cases/:caseId/relationships` — Create relationship (manual)
- Findings API endpoints:
  - `GET /api/cases/:caseId/findings` — List findings by agent/category
  - `GET /api/cases/:caseId/findings/:findingId` — Get finding with full citations
- SSE events:
  - `FINDING_COMMITTED` — Finding saved, available for sidebar display
  - `KG_ENTITY_ADDED` — Entity added to KG
  - `KG_RELATIONSHIP_ADDED` — Relationship added to KG
- Vector store setup (v1 = PG full-text search via tsvector; Vertex AI RAG upgrade path in Phase 9):
  - Raw finding text indexed for semantic/keyword search by Chat Agent
  - Full-text search index on case_findings.finding_text
- Pipeline wiring update in agents.py:
  - After each domain agent completes: save findings → extract entities → build relationships → emit SSE
  - After ALL domain agents complete: run entity deduplication pass
  - SSE events fire as data is committed

**Technical Notes:**
- KG Builder is a Python service (NOT an LLM agent) — reads structured Pydantic output, writes to DB tables
- Entity deduplication: exact name+type match for easy cases (95%+), fuzzy matching for harder cases (Levenshtein distance)
- Domain agents produce dual output: structured entities (for KG) + rich markdown text (for display + vector/full-text search)
- All citation fields must include: file_id, locator (page/timestamp), exact_excerpt, surrounding_context
- case_findings rows link to agent_executions via agent_execution_id for full audit trail
- Pipeline remains: Triage → Orchestrator → Domain Agents (parallel) → [KG Builder + findings storage]
- Vector store is optional for Phase 7 (PG full-text search sufficient); Vertex AI RAG can be added in Phase 9
- **Key architecture files to create:**
  - `backend/app/services/kg_builder.py` — Programmatic KG Builder
  - `backend/app/services/findings_service.py` — case_findings storage
  - `backend/app/models/knowledge_graph.py` — KgEntity, KgRelationship models
  - `backend/app/models/findings.py` — CaseFinding model
  - `backend/app/models/synthesis.py` — Hypothesis, Contradiction, Gap, Synthesis, TimelineEvent models
  - `backend/app/api/knowledge_graph.py` — KG API endpoints
  - `backend/app/api/findings.py` — Findings API endpoints

**Exit Criteria:**
- Domain agents produce enriched findings with exhaustive exact-source citations for every statement
- All findings stored in case_findings table and accessible via API
- All entities and relationships extracted and stored in KG tables
- KG API returns valid graph data for frontend consumption
- SSE events fire for findings + KG updates
- Entity deduplication produces clean, non-redundant entity set
- No entity or relationship from domain agents is lost in the programmatic extraction
- Full-text search operational on case_findings

---

## Phase 7.1: Knowledge Graph Frontend (vis-network)

**Goal:** Premium knowledge graph visualization with intelligent clustering, physics-based layout, and relationship-aware spacing — replacing the D3.js implementation with vis-network.

**Requirements:** REQ-VIS-003 (complete)

**Depends on:** Phase 7 (KG API must exist with real data)

**Status:** ⏳ NOT_STARTED

**Plans:** 5 plans in 3 waves

Plans:
- [ ] 07-01-PLAN.md — DB schema: 9 new tables (KG, findings, synthesis) + Alembic migration + tsvector search
- [ ] 07-02-PLAN.md — Pydantic schemas for KG/findings APIs + domain agent findings_text enrichment
- [ ] 07-03-PLAN.md — KG Builder service (entity extraction, relationships, deduplication) + findings service (storage, full-text search)
- [ ] 07-04-PLAN.md — Domain agent prompt enrichment (exhaustive citations, findings_text instructions)
- [ ] 07-05-PLAN.md — API endpoints (KG + findings), SSE events, pipeline wiring

**Deliverables:**
- Replace D3.js force-directed graph with vis-network (direct integration via `useRef`/`useEffect` for full control and TypeScript safety — not via stale React wrapper packages)
- Group-based entity type clustering:
  - Nodes assigned to groups by entity type (person, organization, location, event, document, evidence)
  - Each group has distinct visual properties (shape, color, size, icon)
  - Group definitions in vis-network `groups` option with per-group styling
  - Natural spatial clustering — related entities gravitate together, unrelated push apart
- ForceAtlas2-based physics simulation:
  - Solver: `forceAtlas2Based` (superior clustering for investigative graphs vs barnesHut)
  - `gravitationalConstant`: tuned per graph density (default -50, adjustable)
  - `springLength` and `springConstant`: varied by relationship type (stronger relationships = shorter springs)
  - `centralGravity`: low (0.01-0.05) to allow natural clustering
  - `avoidOverlap`: enabled to prevent node collision
  - Stabilization: 200-500 iterations with fit-after-stabilize
- Relationship-type-based edge configuration:
  - Edge length varies by relationship type (e.g., EMPLOYED_BY shorter than MENTIONED_IN)
  - Edge width indicates relationship strength
  - Edge color indicates relationship category (financial=blue, legal=purple, evidence=red)
  - Labeled edges with relationship type
  - Smooth curves for overlapping edges
- Entity detail panel:
  - Click node → detail panel with entity metadata
  - Full citation chain (which finding, which file, exact excerpt)
  - Connected entities list with relationship labels
  - Source agent type badge
- 5 toggleable layers: Evidence (red), Legal (blue), Strategy (green), Temporal (amber), Hypothesis (pink)
- Search and highlight (find entity by name, highlight connections)
- Fullscreen capability
- Node scaling by degree (connection count)
- Zoom/pan controls
- Connected to real KG API from Phase 7 (not mock data)
- Lazy clustering for graphs with >200 nodes (vis-network clustering API)

**Technical Notes:**
- vis-network integrated directly via `useRef<HTMLDivElement>` + `useEffect` pattern (full TypeScript control)
- vis-network physics docs: https://visjs.github.io/vis-network/docs/network/physics.html
- Physics solvers: barnesHut, forceAtlas2Based, repulsion, hierarchicalRepulsion
- ForceAtlas2Based recommended: continuous gravity model, superior cluster formation for entity networks
- Edge `length` property controls per-edge spring length (relationship-type-based spacing)
- Node `group` property assigns visual cluster identity
- `physics.stabilization.fit: true` ensures viewport fits all nodes after stabilization
- Dependencies: `vis-network` and `vis-data` npm packages
- **Key frontend files (to create/modify):**
  - `frontend/src/components/KnowledgeGraph/KnowledgeGraph.tsx` — Main vis-network component (replaces D3)
  - `frontend/src/components/KnowledgeGraph/EntityDetailPanel.tsx` — Entity detail sidebar
  - `frontend/src/components/KnowledgeGraph/GraphControls.tsx` — Layer toggles, search, zoom
  - `frontend/src/components/KnowledgeGraph/GraphLegend.tsx` — Visual legend for node types
  - `frontend/src/hooks/useKnowledgeGraph.ts` — vis-network instance management + data fetching
  - `frontend/src/lib/knowledge-graph-config.ts` — Physics, groups, edge type configuration
  - `frontend/src/types/knowledge-graph.ts` — Updated types for vis-network DataSet format

**Exit Criteria:**
- KG renders with vis-network using real entity/relationship data from API
- Nodes cluster naturally by entity type group with clear spatial separation
- Connected nodes are visually closer than unconnected ones
- Relationship types influence edge length/spacing
- Entity detail panel shows full metadata + citation chain back to source files
- 5 layers toggleable
- Search highlights entities and their connections
- Fullscreen mode works
- Physics simulation stabilizes within 3 seconds for graphs up to 500 nodes
- Graph is intuitive: a first-time user can understand entity relationships at a glance

---

## Phase 8: Synthesis Agent & Intelligence Layer

**Goal:** Cross-reference all domain findings to generate hypotheses, contradictions, evidence gaps, timeline events, cross-modal/cross-domain conclusions, and case-level summary/verdict. Connect existing frontend components to real data.

**Requirements:** REQ-AGENT-008, REQ-HYPO-001/002/003/004/005/006, REQ-WOW-001/002/003/004, REQ-VIS-004/005/006, REQ-TASK-001/002

**Depends on:** Phase 7 (case_findings + KG tables populated)

**Status:** ⏳ NOT_STARTED

**Plans:** 5 plans in 3 waves

Plans:
- [ ] 07-01-PLAN.md — DB schema: 9 new tables (KG, findings, synthesis) + Alembic migration + tsvector search
- [ ] 07-02-PLAN.md — Pydantic schemas for KG/findings APIs + domain agent findings_text enrichment
- [ ] 07-03-PLAN.md — KG Builder service (entity extraction, relationships, deduplication) + findings service (storage, full-text search)
- [ ] 07-04-PLAN.md — Domain agent prompt enrichment (exhaustive citations, findings_text instructions)
- [ ] 07-05-PLAN.md — API endpoints (KG + findings), SSE events, pipeline wiring

### Frontend Available (Yatharth, 2026-02-02)
- ✅ Timeline view with day/week/month/year zoom, layer filtering, event cards, search (`Timeline/`)
- ✅ Evidence source panel (`evidence-source-panel.tsx`)
- ✅ Timeline SSE hooks ready (`useTimelineSSE.ts`)
- ⏳ Hypothesis view (pending implementation or connection)
- ⏳ Contradictions panel (basic conflict UI in Evidence Library)
- ⏳ Evidence gaps panel (not started)

**Deliverables:**
- Synthesis Agent implementation (LLM, Gemini Pro, `thinking_level="high"`):
  - Input: ALL case_findings from PostgreSQL for the case (rich markdown findings with citations)
  - Additional context: entity summary from KG tables, file metadata, case description
  - Gemini 3 Pro with 1M context window (sufficient: ~100-150K tokens for 50-file cases)
  - Output (SynthesisOutput Pydantic model):
    a. `hypotheses: list[Hypothesis]` — Case hypotheses with initial confidence + supporting/contradicting evidence
    b. `contradictions: list[Contradiction]` — Detected contradictions with exact source pairs, severity (minor/significant/critical)
    c. `gaps: list[EvidenceGap]` — Missing evidence with priority ranking, what's needed, why
    d. `cross_modal_links: list[CrossModalLink]` — Temporal correlations across modalities (video ↔ document, audio ↔ text)
    e. `cross_domain_conclusions: list[CrossDomainConclusion]` — Insights from combining financial + legal + evidence + strategy findings
    f. `timeline_events: list[TimelineEvent]` — Chronological events extracted from findings with date/time, type, layer
    g. `case_summary: str` — Executive summary of the entire case
    h. `case_verdict: CaseVerdict` — Overall assessment with confidence, key strengths, key weaknesses
    i. `risk_assessment: str` — Risk factors and mitigation suggestions
    j. `has_location_data: bool` — Trigger flag for Geospatial Agent (Phase 8.1)
- Store results in dedicated synthesis tables (schema from Phase 7 migrations):
  - case_hypotheses, case_contradictions, case_gaps, case_synthesis, timeline_events
- Pipeline wiring:
  - Triggered after domain agents + KG Builder complete
  - Reads case_findings via SQL (not through LLM session state — fresh stage-isolated session)
  - Stores all outputs via dedicated storage services
  - Triggers Geospatial Agent (Phase 8.1) if `has_location_data == True`
- SSE events:
  - `SYNTHESIS_STARTED`, `SYNTHESIS_COMPLETE`
  - `HYPOTHESIS_CREATED` (per hypothesis)
  - `CONTRADICTION_DETECTED` (per contradiction)
  - `GAP_IDENTIFIED` (per gap)
  - `TIMELINE_EVENT_CREATED` (per event)
- Synthesis API endpoints:
  - `GET /api/cases/:caseId/synthesis` — Full synthesis results (summary, verdict, conclusions)
  - `GET /api/cases/:caseId/hypotheses` — Hypotheses with evidence links
  - `GET /api/cases/:caseId/contradictions` — Contradictions with source pairs
  - `GET /api/cases/:caseId/gaps` — Evidence gaps with priorities
  - `GET /api/cases/:caseId/timeline/events` — Timeline events
- Frontend integration (connecting existing components to real data):
  - Hypothesis view → case_hypotheses API (cards with claim, status badge, confidence meter, evidence counts)
  - Contradictions panel → case_contradictions API (claim A vs claim B, severity, source navigation)
  - Evidence gaps panel → case_gaps API (description, priority, suggestions)
  - Timeline → timeline_events API (TimelineCore.tsx, TimelineEventCard.tsx connected to real events)
  - Case summary/verdict display (in case layout or dedicated component)
- Investigation task generation:
  - Tasks from contradictions (`resolve_contradiction`)
  - Tasks from gaps (`obtain_evidence`)
  - Tasks from pending hypotheses (`verify_hypothesis`)
  - Task deduplication via existing task list injection into synthesis prompt
  - Stored in investigation_tasks table

**Technical Notes:**
- Synthesis Agent runs in fresh stage-isolated ADK session (consistent with existing pattern)
- Input is TEXT from PostgreSQL (case_findings.finding_text), NOT multimodal file content
- 1M context window handles even large cases comfortably (~100-150K tokens for 50-file case)
- Cost estimate: ~$0.10-0.15 per synthesis run at Gemini Pro rates
- Synthesis prompt: "Every contradiction must cite exact source excerpts from both sides"
- Hypothesis confidence: deterministic (sum(supporting_weights) / sum(all_weights)), user override allowed
- Timeline events are a natural byproduct of chronological cross-referencing (no separate timeline agent)
- Synthesis is a BATCH operation, runs once per analysis pipeline
- All synthesis outputs reference back to case_findings IDs and kg_entity IDs for traceability
- Pipeline becomes: Triage → Orchestrator → Domain Agents → [KG Builder + findings storage] → Synthesis → [Geospatial if locations]
- **Key files to create:**
  - `backend/app/agents/synthesis/` — Synthesis agent module (agent, prompts, schemas)
  - `backend/app/services/synthesis_service.py` — Storage service for synthesis outputs
  - `backend/app/api/synthesis.py` — Synthesis API endpoints
  - `backend/app/api/timeline.py` — Timeline API endpoints
  - `backend/app/api/hypotheses.py` — Hypothesis API endpoints

**Exit Criteria:**
- Synthesis Agent produces unified analysis from all domain findings
- Hypotheses generated with evidence links and confidence scores
- Contradictions detected with severity and exact source citations on both sides
- Evidence gaps identified with priority and actionable suggestions
- Timeline events populate the Timeline view with real data
- Cross-modal and cross-domain conclusions identified
- Case summary and verdict generated
- All results stored in appropriate tables and accessible via API
- SSE events signal data readiness for frontend
- Existing frontend components display real data (not mock)
- Investigation tasks generated from contradictions/gaps/hypotheses

---

## Phase 8.1: Geospatial Agent & Map View

**Goal:** Location intelligence: extract, enrich, geocode locations and visualize movement patterns on interactive map.

**Requirements:** REQ-GEO-001 through REQ-GEO-011

**Depends on:** Phase 8 (Synthesis triggers Geospatial when `has_location_data == True`)

**Status:** ⏳ NOT_STARTED

**Plans:** 5 plans in 3 waves

Plans:
- [ ] 07-01-PLAN.md — DB schema: 9 new tables (KG, findings, synthesis) + Alembic migration + tsvector search
- [ ] 07-02-PLAN.md — Pydantic schemas for KG/findings APIs + domain agent findings_text enrichment
- [ ] 07-03-PLAN.md — KG Builder service (entity extraction, relationships, deduplication) + findings service (storage, full-text search)
- [ ] 07-04-PLAN.md — Domain agent prompt enrichment (exhaustive citations, findings_text instructions)
- [ ] 07-05-PLAN.md — API endpoints (KG + findings), SSE events, pipeline wiring

**Deliverables:**
- Geospatial Agent implementation (LLM with tools):
  - Triggered by Synthesis Agent when `has_location_data == True`
  - Extracts and enriches location entities from synthesis findings
  - Disambiguates ambiguous place names
  - Geocodes locations to coordinates via mapping API
  - Detects movement patterns and spatial relationships
  - Flags locations needing satellite imagery analysis
  - Gemini 3 Pro with `thinking_level="medium"`
  - Inline Pro-to-Flash fallback
- Geocoding integration:
  - Mapbox or Google Maps Geocoding API
  - Address → coordinates resolution
  - Reverse geocoding for coordinate-only locations
- Movement pattern detection:
  - Connect locations showing movement over time
  - Route visualization (dashed for inferred, solid for confirmed)
  - Anomaly detection for unusual patterns
- Locations table population (schema from Phase 7):
  - name, coordinates, location_type, source entities, temporal associations
- Google Earth Engine integration (if API approved):
  - Historical imagery retrieval
  - Change detection between dates
  - Thumbnail generation
- Map View tab (frontend):
  - Interactive map component (Mapbox GL JS or alternative)
  - Location markers styled by type
  - Route visualization for movement patterns
  - Click interactions for location details
  - Fullscreen capability
- SSE events: `LOCATION_ENRICHED`, `GEOSPATIAL_COMPLETE`
- Map API endpoints:
  - `GET /api/cases/:caseId/locations` — All locations with coordinates
  - `GET /api/cases/:caseId/locations/:locationId` — Location detail with temporal data

**Technical Notes:**
- Geospatial Agent is a POST-SYNTHESIS utility, not part of the main domain analysis pipeline
- Earth Engine API approval may take days/weeks — geocoding works without it
- Map component should be lazy-loaded (heavy dependency)
- **Key files to create:**
  - `backend/app/agents/geospatial/` — Geospatial agent module
  - `backend/app/services/geocoding_service.py` — Geocoding API integration
  - `backend/app/api/locations.py` — Location API endpoints

**Exit Criteria:**
- Locations extracted and geocoded from case findings
- Movement patterns detected and visualized on map
- Map View tab functional with real location data
- Location markers clickable with detail panel
- Geospatial Agent triggered automatically when synthesis detects location data

---

## Phase 9: Chat Interface & Research

**Goal:** Interactive case Q&A via standalone Chat Agent with multi-source tool-based access to KG, findings, synthesis outputs, and on-demand domain agent escalation.

**Requirements:** REQ-CHAT-001/002/003/004/005, REQ-AGENT-007f/007g, REQ-SOURCE-005 (complete), REQ-RESEARCH-001/002/003/005/006/007/008/009, REQ-HYPO-007/008, REQ-GEO-010

**Depends on:** Phase 7 (KG tables), Phase 8 (synthesis tables)

**Status:** 🟡 FRONTEND_DONE (Chat UI) — Backend agents + API required

### Frontend Completed (Yatharth, 2026-02-02)
- ✅ Floating chat button with animations (`chatbot.tsx`)
- ✅ Draggable/resizable chat window
- ✅ Message history display with user/assistant distinction
- ✅ Typing indicator with animated dots
- ✅ Case context awareness (name, status, description)
- ✅ Minimize/maximize functionality
- ✅ Liquid glass effect styling
- ✅ Keyboard support (Enter to send, Shift+Enter newline)
- ✅ Mock fallback when backend unavailable (`useChatbot.ts`)

### Backend Work
**Deliverables:**
- Chat Agent implementation (standalone LlmAgent with tools):
  - Model: Gemini 3 Pro with `thinking_level="high"`
  - System prompt includes `case_synthesis.case_summary` (~500-1000 tokens) for immediate context
  - System prompt describes each tool, when to use it, and query strategy
  - Tools (tiered by speed):
    - **Fast lookups (SQL, <100ms):**
      - `query_knowledge_graph` — Entity/relationship lookups from kg_entities, kg_relationships
      - `get_case_hypotheses` — Hypothesis status and evidence from case_hypotheses
      - `get_contradictions` — Pre-computed contradictions from case_contradictions
      - `get_evidence_gaps` — Evidence gaps from case_gaps
      - `get_case_synthesis` — Case summary, verdict, conclusions from case_synthesis
      - `get_finding_details` — Specific finding by ID from case_findings
    - **Semantic search (~500ms):**
      - `search_findings` — Full-text search over case_findings (PG tsvector or Vertex AI RAG)
    - **Deep analysis (10-60s, on-demand):**
      - `run_domain_analysis` — Spawns domain agent for novel questions requiring raw file examination
  - Prompt strategy instructions: "Always try fast lookups first. Use search_findings for evidence discovery. Only use run_domain_analysis when existing knowledge cannot answer."
- Chat API endpoint: `POST /api/cases/:caseId/chat` (streaming SSE response)
- Chat history persistence (PostgreSQL):
  - `chat_messages` table (id, case_id, role, content, citations JSONB, tool_calls JSONB, created_at)
  - Load on case open, searchable
- Inline citations in responses:
  - Citations formatted as [1], [2] with footer list
  - Each citation links to source file + exact location
  - Hover shows source preview
  - Click opens Source Panel (Phase 10)
- Context caching for cost optimization:
  - Context cache created when user opens case for chat
  - Cache includes case evidence file references
  - TTL: 2 hours (session duration)
  - Chat queries use `cached_content` parameter
- Context compaction for long sessions:
  - `EventsCompactionConfig` for Chat Agent sessions only (not pipeline)
  - Compaction interval: every 5 invocations
  - `LlmEventSummarizer` with Gemini Flash for cost efficiency
- Research/Discovery invocation:
  - Research Agent uses Gemini web search for source discovery
  - Discovery Agent synthesizes external research
  - Triggerable from chat ("Research background on [subject]")
  - Results feed back into case findings

**Technical Notes:**
- Chat Agent self-routes based on retrieval confidence — no separate router agent needed
- The LLM's native reasoning handles tool selection and escalation decisions
- System prompt loaded with case_synthesis.case_summary on each chat session start
- KG queries via SQL for sub-100ms fast path responses
- Novel question detection: if tools return insufficient results AND user asks for analysis → escalate
- Context cache via `client.caches.create()` for 4x cheaper repeated queries
- **Key files to create:**
  - `backend/app/agents/chat/` — Chat agent module (agent, prompts, tools)
  - `backend/app/api/chat.py` — Chat API endpoint with streaming
  - `backend/app/models/chat.py` — ChatMessage model
  - `backend/app/services/chat_service.py` — Chat history + tool implementations
- **Frontend files:** `frontend/src/components/app/chatbot.tsx`, `frontend/src/hooks/useChatbot.ts`, `frontend/src/types/chatbot.ts`

**Exit Criteria:**
- Chat answers questions about case using tools
- Simple questions answered from KG/synthesis (fast path, <2 seconds)
- Complex questions escalate to domain agents via tool
- All responses have inline citations to exact source locations
- Chat history persists across sessions
- Context caching working (verify cost reduction)
- Long sessions don't exhaust context (compaction working)
- Research/Discovery invocable from chat
- Case summary available in chat context from first message

---

## Phase 10: Agent Flow & Source Panel

**Goal:** Full-featured source viewers, Agent Flow refinements, and task panel.

**Requirements:** REQ-SOURCE-001 (complete), REQ-SOURCE-002 (complete), REQ-SOURCE-003 (complete), REQ-SOURCE-004 (complete), REQ-VIS-001, REQ-VIS-001a, REQ-VIS-002, REQ-VIS-004, REQ-VIS-007, REQ-WOW-004, REQ-TASK-003, REQ-TASK-004, REQ-TASK-005, REQ-TASK-006, REQ-TASK-007

**Status:** 🟡 FRONTEND_DONE (Timeline) — Source viewers + Task Panel pending

### Frontend Completed (Yatharth, 2026-02-02)
- ✅ Timeline view with events (`Timeline/`)
  - Day/week/month/year zoom levels
  - Layer filtering (evidence/legal/strategy)
  - Event cards with click-to-detail
  - Search with debouncing
  - SSE hooks ready (`useTimelineSSE.ts`)
  - React Query with caching (`useTimelineData.ts`)
  - Skeleton loading states
  - Framer Motion animations
- ✅ Evidence source panel exists (`evidence-source-panel.tsx`)

### Backend Work Remaining
- ⏳ Timeline API endpoints (CRUD + SSE stream)
- ⏳ PDF viewer with excerpt highlighting
- ⏳ Video player with timestamp markers
- ⏳ Audio player with waveform and transcript sync
- ⏳ Image viewer with bounding box annotations
- ⏳ Citation navigation (click → exact location)
- ⏳ Narrative generation (executive summary, detailed)
- ⏳ Export as PDF/DOCX
- ⏳ Agent Flow refinements (most items)
- ⏳ Investigation Task Panel (all items)

**Deliverables:**
- PDF viewer with excerpt highlighting
- Video player with timestamp markers
- Audio player with waveform and transcript sync
- Image viewer with bounding box annotations
- Citation navigation (click → exact location)
- ~~Timeline view with events~~ ✅
- Narrative generation (executive summary, detailed)
- Export as PDF/DOCX
- **Agent Flow refinements:**
  - ~~ReactFlow agent pipeline visualization~~ ✅ (@xyflow/react + dagre, done in Phase 4.1)
  - ~~Custom node components per agent type~~ ✅ (DecisionNode, FileGroupNode, Phase 4.1)
  - ~~Agent color coding~~ ✅ (muted palette, Phase 4.1)
  - **Task count badges on agent nodes** (pending)
  - Thinking overlay with streaming thoughts
  - Interactive time-scrubbing
  - Pause/resume workflow
  - Workflow playback with speed control
  - Frontend confirmation dialogs for sensitive operations
  - Fullscreen mode
- **Investigation Task Panel:** (all pending)

**Technical Notes:**
- PDF: react-pdf or pdf.js
- Audio: wavesurfer.js
- Video: native HTML5 with custom controls
- ~~Timeline: D3.js or vis-timeline~~ → Custom React implementation ✅
- Narrative: Gemini generates from Synthesis output
- **Task count badges update in real-time via SSE**
- **Frontend files:** `frontend/src/components/Timeline/`, `frontend/src/hooks/useTimelineData.ts`, `frontend/src/hooks/useTimelineFilters.ts`, `frontend/src/hooks/useTimelineSSE.ts`

**Exit Criteria:**
- All source types viewable with full features
- Citations navigate to exact locations
- ~~Timeline shows chronological events~~ ✅
- Narrative generation works with citations
- **Task panel shows pending investigation tasks**
- **Task count badges visible on agent nodes**
- **Task completion workflow functional**

---

## Phase 11: Corrections & Refinement

**Goal:** Enable user corrections and regeneration of stale items.

**Requirements:** REQ-CORR-001, REQ-CORR-002, REQ-CORR-003, REQ-CORR-004

**Deliverables:**
- Error flagging UI on findings/nodes
- Correction input form
- Verification Agent implementation
- Correction verification flow
- Knowledge Graph update logic
- Stale item tracking
- Stale item indicators
- Regeneration triggers

**Technical Notes:**
- Verification Agent re-checks sources before accepting correction
- Corrections logged with provenance
- Downstream items marked STALE via graph traversal
- Regeneration re-runs affected portion of pipeline

**Exit Criteria:**
- User can flag errors
- Verification Agent validates corrections
- Confirmed corrections update graph
- Stale items visible and regenerable

---

## Phase 12: Demo Preparation

**Goal:** Prepare compelling demo with fraud case, showcasing all integration features.

**Requirements:** Demo readiness (non-functional), REQ-AGENT-007i (optional), REQ-RESEARCH-004

**Deliverables:**
- Fraud demo case dataset
  - Financial records (invoices, statements)
  - Video depositions (2-3 clips)
  - Audio recordings (phone calls)
  - Images (photos, scans)
  - Legal documents (contracts, filings)
  - Planted contradictions and gaps
  - **Location data for geospatial demo** (addresses, GPS coordinates)
  - **Multiple hypotheses to demonstrate lifecycle**
- **Integration features showcase:**
  - **Hypothesis system demo:** Show PENDING → SUPPORTED → CONFIRMED lifecycle
  - **Map View demo:** Location extraction, movement patterns, satellite imagery
  - **Investigation Tasks demo:** Tasks from contradictions/gaps, bottom drawer interaction
  - **Research/Discovery demo:** On-demand research via chat
- **Deep Research Agent demo (optional WOW feature):**
  - Integration with `deep-research-pro-preview-12-2025`
  - Background autonomous research on case subjects
  - Progress streaming via `thinking_summaries: "auto"`
  - Demo flow: "Research background on [demo subject]"
  - Results integrated into case context
- Demo script with talking points
- Performance optimization
  - Lazy loading
  - Query optimization
  - Context caching for demo case (pre-warmed)
- Error handling polish
- Loading states and skeleton UIs
- README with setup instructions
- API documentation

**Technical Notes:**
- Demo dataset designed to showcase all WOW features
- Pre-process demo case for faster demo (context cache pre-created)
- Deep Research runs in background while demoing other features
- **Demo flow includes: upload → analysis → hypotheses → map → tasks → chat**
- Rehearse demo flow multiple times

**Exit Criteria:**
- Demo case runs end-to-end smoothly
- All WOW features demonstrated
- **Demo showcases hypotheses with status updates**
- **Demo showcases map view with locations**
- **Demo showcases investigation tasks**
- Deep Research demo shows autonomous research capability (optional)
- No errors during demo flow
- Compelling narrative from demo

---

## Post-MVP: Memory Service

**Goal:** Enable cross-case learning and pattern recognition.

**Requirements:** REQ-MEM-001

**Deliverables:**
- VertexAiMemoryBankService integration
- Memory storage for investigation patterns
- PreloadMemoryTool for relevant memory retrieval
- Cross-case similarity search
- User opt-in controls for memory storage
- Memory isolation per user

**Technical Notes:**
- Requires migration to Agent Engine (managed service)
- Memory bank persists across sessions
- Enables "Have you seen similar patterns?" functionality

**Exit Criteria:**
- Memory service operational
- Past case patterns retrievable
- Privacy controls working

---

## Dependency Graph

```
Phase 1 (Foundation)
    │
    ├── Phase 1.1 (Frontend Design Foundation) ← INSERTED
    │
    └── Phase 2 (Auth & Case)
            │
            └── Phase 3 (File Ingestion)
                    │
                    └── Phase 4 (Core Agent System)
                            │
                            ├── Phase 4.1 (Decision Tree Revamp) ← INSERTED
                            │
                            └── Phase 5 (Agent Flow)
                                    │
                                    └── Phase 6 (Domain Agents)
                                            │
                                            └── Phase 7 (Knowledge Storage & Domain Enrichment)
                                                    │
                                                    ├── Phase 7.1 (KG Frontend / vis-network)
                                                    │
                                                    └── Phase 8 (Synthesis & Intelligence Layer)
                                                            │
                                                            ├── Phase 8.1 (Geospatial & Map View)
                                                            │
                                                            └── Phase 9 (Chat Interface)
                                                                    │
                                                                    └── Phase 10 (Source Panel)
                                                                            │
                                                                            └── Phase 11 (Corrections)
                                                                                    │
                                                                                    └── Phase 12 (Demo Prep)
```

Note: Phase 7.1 can start as soon as Phase 7 KG API is ready (may overlap with Phase 7 completion). Phase 8.1 runs after Phase 8 synthesis completes. Phase 9 depends on both Phase 7 (KG tables) and Phase 8 (synthesis tables).

---

## Risk Mitigation

| Risk | Mitigation | Phase |
|------|------------|-------|
| ADK production limitations | Fresh instances, state namespacing, test early, document limitations | 4 |
| ADK tool confirmation unavailable | Frontend confirmation dialogs (DatabaseSessionService limitation) | 7 |
| Tools + output_schema conflict | Split into tool-agent → schema-agent pipeline | 5, 6 |
| Thought signatures lost | Let SDK handle; preserve entire response metadata in storage | 4 |
| SSE fails in Cloud Run | Proper headers, heartbeat, polling fallback | 1, 7 |
| LLM hallucination | Multi-agent verification, span-level citations | 5, 6, 11 |
| Rate limiting | Tier upgrade budget, request queuing, context caching | 4, 5, 9 |
| Cloud Run timeout | Async processing, chunked responses | 3, 4, 5 |
| Entity resolution at scale | Incremental ER with blocking | 6 |
| React Flow performance | Memoization, virtualization | 7 |
| Context window exhaustion | Context compaction for long sessions | 9 |
| High Gemini costs | Context caching (4x cheaper), Flash fallbacks | 5, 9 |
| Dense document extraction | media_resolution="high" for legal documents | 5 |
| Video/audio precision | VideoMetadata with start/end offsets | 5 |

---

## Parallel Work Opportunities

For 2 developers working simultaneously:

| Dev A | Dev B |
|-------|-------|
| Phase 1: Backend infra | Phase 1: Frontend infra |
| Phase 2: Backend auth middleware | Phase 2: Frontend auth UI |
| Phase 3: Backend file APIs | Phase 3: Frontend upload/library |
| Phase 4: ADK integration | Phase 4: Agent trace data model |
| Phase 5: Financial + Legal agents | Phase 5: Strategy + Evidence agents |
| Phase 6: Synthesis Agent | Phase 6: KG Agent + visualization |
| Phase 7: SSE streaming | Phase 7: React Flow UI |
| Phase 8: Intelligence logic | Phase 8: Contradictions/Gaps UI |
| Phase 9: Chat backend | Phase 9: Chat frontend |
| Phase 10: Source APIs | Phase 10: Source viewers |

---

*Roadmap Version: 3.0*
*Updated: 2026-02-06 (Phase 6 complete — 35 commits including post-plan hardening)*
*Phase 1 planned: 2026-01-20*
*Phase 1.1 planned: 2026-01-23*
*Phase 1.1 complete: 2026-01-24*
*Phase 2 planned: 2026-01-24*
*Phase 2 complete: 2026-01-25*
*Frontend work by Yatharth: 2026-02-02 (Phases 3,5,7,9,10 frontend done)*
*Phase 3 planned: 2026-02-02*
*Phase 3 verified: 2026-02-02 (6/6 observable truths)*
*Phase 4 planned: 2026-02-02 (5 plans in 3 waves)*
*Phase 4 verified: 2026-02-03 (6/6 must-haves)*
*Phase 4.1 planned: 2026-02-04 (4 plans in 3 waves)*
*Phase 4.1 complete: 2026-02-04 (all 4 plans done, 18 commits)*
*Phase 5 planned: 2026-02-04 (4 plans in 3 waves)*
*Phase 5 complete: 2026-02-05 (all 4 plans + 15 post-plan fixes, 26 commits total)*
*Phase 6 planned: 2026-02-05 (5 plans in 3 waves)*
*Phase 6 complete: 2026-02-06 (5 plans + 21 post-plan commits = 35 total, 10/10 verified + hardening)*
*Architecture redesign: 2026-02-07 (Phases 7-9 restructured: KG-as-Memory, hybrid storage, programmatic KG Builder, vis-network, tool-based Chat)*
*Phase 7 planned: 2026-02-07 (5 plans in 3 waves)
