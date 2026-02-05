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
| 6 | Domain Agents | Financial, Legal, Strategy, Evidence agents, Entity taxonomy, Hypothesis evaluation | REQ-AGENT-003/004/005/006/007c/007d/007h, REQ-HYPO-002/003 | ⏳ NOT_STARTED |
| 7 | Synthesis & Knowledge Graph | Synthesis Agent, KG Agent, Hypothesis system, Task generation, 5-layer KG | REQ-AGENT-008/009, REQ-VIS-003, REQ-HYPO-001/004/005/006, REQ-TASK-001/002 | 🟡 FRONTEND_DONE |
| 8 | Intelligence Layer & Geospatial | Contradictions, Gaps, Geospatial Agent, Map View, Earth Engine | REQ-WOW-*, REQ-VIS-005/006, REQ-GEO-* | ⏳ NOT_STARTED |
| 9 | Chat Interface & Research | Chat UI, Research/Discovery (Chat + Orchestrator-triggered), Hypothesis View, Context caching | REQ-CHAT-*, REQ-RESEARCH-*, REQ-HYPO-007/008 | 🟡 FRONTEND_DONE |
| 10 | Agent Flow & Source Panel | Full source viewers, Task Panel, Timeline | REQ-SOURCE-*, REQ-VIS-*, REQ-TASK-003/004/005/006/007 | 🟡 FRONTEND_DONE |
| 11 | Corrections & Refinement | Error flagging, Verification, Regeneration | REQ-CORR-* | ⏳ NOT_STARTED |
| 12 | Demo Preparation | Demo case showcasing all integration features | Demo readiness, REQ-RESEARCH-004, REQ-AGENT-007i | ⏳ NOT_STARTED |

> **Status Legend:** ✅ COMPLETE | 🟡 FRONTEND_DONE (backend pending) | ⏳ NOT_STARTED | ⏳ PLANNED
> **Note:** Phase 5 complete (2026-02-05, full SSE pipeline + HITL). Phases 7, 9, 10 have frontend UI implemented by Yatharth (2026-02-02). Backend integration remains for those phases.

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

**Requirements:** REQ-AGENT-003, REQ-AGENT-004, REQ-AGENT-005, REQ-AGENT-006, REQ-AGENT-007b, REQ-AGENT-007c, REQ-AGENT-007d, REQ-AGENT-007h, REQ-AGENT-002 (complete), REQ-HYPO-002, REQ-HYPO-003

**Deliverables:**
- Financial Analysis Agent (`thinking_level="medium"`, `media_resolution="high"`)
  - **Full entity taxonomy for financial domain** (monetary_amount, account, transaction, asset)
- Legal Analysis Agent (`thinking_level="high"`, `media_resolution="high"`)
  - **Full entity taxonomy for legal domain** (statute, case_citation, contract, legal_term, court)
- Strategy Analysis Agent (`thinking_level="medium"`)
- Evidence Analysis Agent (`thinking_level="high"`, `media_resolution="high"`)
  - Authenticity analysis (manipulation detection, metadata consistency)
  - Chain of custody documentation
  - Corroboration scoring
  - Quality assessment output schema
  - **Full entity taxonomy for evidence domain** (communication, alias, vehicle, property, timestamp)
- **Hypothesis evaluation in all domain agent prompts**
  - Agents evaluate findings against existing hypotheses
  - Output includes hypothesis_evaluations and new_hypotheses
- Parallel execution via ADK ParallelAgent
- ResilientAgentWrapper for each domain agent (Pro → Flash fallback)
- Domain-specific tool definitions
- Video/audio processing with VideoMetadata for timestamps
- Structured output schemas per agent
- Span-level citation extraction
- Agent output aggregation for Synthesis
- **HITL E2E verification** (deferred from Phase 5): Domain agents trigger confirmations for sensitive operations

**Technical Notes:**
- Each agent has unique output_key to avoid race conditions
- All agents receive file content directly (Gemini multimodal)
- Citation format: `{file_id}#{locator}` where locator is page/timestamp/region
- Domain agents run in parallel after Orchestrator routing
- Use `media_resolution="high"` for dense document processing
- Video segments: use `VideoMetadata(start_offset, end_offset)`
- Audio: request speaker diarization in prompts
- ResilientAgentWrapper catches failures and falls back to Flash model
- **Domain agent prompts include: "Evaluate findings against existing hypotheses"**

**Exit Criteria:**
- All four domain agents process files
- Parallel execution verified
- Thinking traces captured for all agents
- Video/audio processed with timestamp extraction
- Graceful degradation works (fallback to Flash)
- Structured findings with citations output
- **Hypothesis evaluations included in agent output**
- **Domain-specific entity taxonomy extracted**
- Outputs aggregated for next phase
- **HITL confirmation flow verified E2E** (agent triggers → modal appears → user responds → agent continues)

---

## Phase 7: Synthesis & Knowledge Graph

**Goal:** Cross-reference findings, build entity-relationship graph, and implement hypothesis system.

**Requirements:** REQ-AGENT-008, REQ-AGENT-009, REQ-AGENT-010, REQ-VIS-003 (basic), REQ-HYPO-001, REQ-HYPO-004, REQ-HYPO-005, REQ-HYPO-006, REQ-TASK-001, REQ-TASK-002

**Status:** 🟡 FRONTEND_DONE (KG Visualization) — Backend agents + API required

### Frontend Completed (Yatharth, 2026-02-02)
- ✅ **D3.js chosen** for Knowledge Graph visualization
- ✅ Force-directed graph with zoom/pan (`knowledge-graph.tsx`)
- ✅ Entity nodes (circles) with 6 types: person, organization, location, event, document, evidence
- ✅ Evidence nodes (squares) with 5 types: text, image, video, audio, document
- ✅ Manual relationship creation UI (click-to-connect)
- ✅ Node details panel with entity info
- ✅ Legend showing node types and colors
- ✅ Evidence source panel (`evidence-source-panel.tsx`)
- ✅ Hooks ready (`use-case-graph.ts`)

### Backend Work Remaining
- ⏳ Synthesis Agent implementation
- ⏳ Knowledge Graph Agent implementation
- ⏳ Cross-referencing logic for links, contradictions, gaps
- ⏳ Hypothesis system integration (database tables, SSE)
- ⏳ Investigation task generation
- ⏳ Full entity taxonomy extraction (domain-specific types)
- ⏳ Entity resolution: auto-merge with >85% similarity
- ⏳ PostgreSQL schema for graph (nodes, edges tables)
- ⏳ 5-layer system (current: 6 entity types, not 5 investigation layers)
- ⏳ Graph query APIs
- ⏳ Incremental graph updates

**Deliverables:**
- Synthesis Agent implementation
- Cross-referencing logic for links, contradictions, gaps
- **Hypothesis system integration** (database tables pending)
- **Investigation task generation from synthesis** (pending)
- Knowledge Graph Agent implementation
- **Full entity taxonomy extraction** (domain-specific types)
- **Entity resolution: auto-merge with flag for >85% matches**
- Relationship extraction with types
- PostgreSQL schema for graph (nodes, edges tables)
- **5-layer Knowledge Graph:** Evidence (red), Legal (blue), Strategy (green), Temporal (amber), Hypothesis (pink)
- Graph query APIs
- ~~**Evaluate graph library: vis-network vs D3.js**~~ → **D3.js chosen** ✅
- ~~Basic force-directed visualization~~ ✅
- Incremental graph updates

**Technical Notes:**
- Graph stored relationally (nodes table, edges table with foreign keys)
- Entity resolution via fuzzy string matching + LLM confirmation
- Graph layers stored as node properties
- Synthesis outputs feed KG Agent
- **Simplified hypothesis lifecycle: PENDING → SUPPORTED/REFUTED (user marks RESOLVED)**
- **Task types: resolve_contradiction, obtain_evidence, verify_hypothesis, etc.**
- **Task list injected into agent context for deduplication (no complex coordination)**
- ~~vis-network offers ForceAtlas2 physics, better interactivity; D3.js offers more customization~~
- **Frontend files:** `frontend/src/components/app/knowledge-graph.tsx`, `frontend/src/hooks/use-case-graph.ts`, `frontend/src/types/knowledge-graph.ts`

**Exit Criteria:**
- Synthesis Agent produces unified findings
- Contradictions and gaps identified
- **Hypothesis system functional with status updates via SSE**
- **Investigation tasks generated from synthesis**
- Knowledge Graph populated with entities and relationships
- **5 layers toggleable in visualization**
- **Entity resolution auto-merges >85% matches**
- ~~Basic graph visualization works~~ ✅
- New files update graph incrementally


---

## Phase 8: Intelligence Layer & Geospatial

**Goal:** Implement WOW capabilities and Geospatial Agent.

**Requirements:** REQ-WOW-001, REQ-WOW-002, REQ-WOW-003, REQ-VIS-005, REQ-VIS-006, REQ-GEO-001, REQ-GEO-002, REQ-GEO-003, REQ-GEO-004, REQ-GEO-005, REQ-GEO-006, REQ-GEO-007, REQ-GEO-008, REQ-GEO-009, REQ-GEO-011

**Deliverables:**
- Cross-modal linking logic (video timestamp ↔ document date)
- Contradiction detection refinement
- Contradiction severity classification
- Evidence gap identification refinement
- Gap priority ranking
- Contradictions Panel UI
- Evidence Gaps Panel UI
- Cross-modal links visible in KG view
- Confidence scores for all intelligence outputs
- **Geospatial Agent implementation:**
  - Location extraction and enrichment
  - Geocoding via mapping API (Mapbox tentative, evaluate alternatives)
  - Movement pattern detection
  - `locations` database table
  - ResilientAgentWrapper (Pro → Flash fallback)
- **Google Earth Engine integration:**
  - Historical imagery retrieval
  - Side-by-side change detection comparison
  - Location verification workflow
- **Map View tab:**
  - Interactive map component
  - Location markers styled by type
  - Route visualization for movement patterns
  - Fullscreen capability
- Evidence Agent coordination with Geospatial Agent for verification

**Technical Notes:**
- Cross-modal links from temporal/entity alignment
- Contradictions from Synthesis Agent, refined here
- Gaps from comparing case requirements vs available evidence
- Intelligence outputs stored in dedicated tables
- **Geospatial Agent triggered post-synthesis when location data exists**
- **Earth Engine API approval may take days/weeks — start early**

**Exit Criteria:**
- Cross-modal links detected and displayed
- Contradictions with severity shown
- Evidence gaps with priorities shown
- All linked to source evidence
- **Geospatial Agent working with Earth Engine**
- **Map View displays locations with movement patterns**
- **Location verification workflow functional**

---

## Phase 9: Chat Interface & Research

**Goal:** Contextual chat with knowledge-first querying, Research/Discovery on-demand, and hypothesis view.

**Requirements:** REQ-CHAT-001, REQ-CHAT-002, REQ-CHAT-003, REQ-CHAT-004, REQ-CHAT-005, REQ-AGENT-007f, REQ-AGENT-007g, REQ-SOURCE-005 (complete), REQ-RESEARCH-001, REQ-RESEARCH-002, REQ-RESEARCH-003, REQ-RESEARCH-005, REQ-RESEARCH-006, REQ-RESEARCH-007, REQ-RESEARCH-008, REQ-RESEARCH-009, REQ-HYPO-007, REQ-HYPO-008, REQ-GEO-010

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

### Backend Work Remaining
- ⏳ Chat API endpoint (`POST /api/chat`)
- ⏳ Knowledge-first query pattern (KG lookup first)
- ⏳ Agent escalation for novel questions
- ⏳ Chat Agent implementation
- ⏳ Research/Discovery invocation (all sub-items)
- ⏳ Hypothesis View
- ⏳ Context caching for cost optimization
- ⏳ Context compaction for long sessions
- ⏳ Inline citations in responses
- ⏳ Citation hover preview
- ⏳ Citation click to Source Panel
- ⏳ Chat history persistence (database)

**Deliverables:**
- ~~Chat UI with message history~~ ✅
- ~~Streaming responses~~ ✅ (UI ready)
- Knowledge-first query pattern (KG lookup first)
- Agent escalation for novel questions
- Chat Agent implementation with `thinking_level="medium"`
- **Research/Discovery invocation** (all pending)
- **Hypothesis View** (pending)
- **Optional temporal sync between Map View and Timeline**
- **Context caching for cost optimization** (pending)
- **Context compaction for long sessions** (pending)
- Inline citations in responses
- Citation hover preview
- Citation click to Source Panel
- Chat history persistence

**Frontend Files:** `frontend/src/components/app/chatbot.tsx`, `frontend/src/hooks/useChatbot.ts`, `frontend/src/types/chatbot.ts`

**Technical Notes:**
- KG queries via SQL for fast responses
- Novel question detection: if KG returns <0.7 confidence
- Agent escalation shows "Analyzing..." indicator
- Citations formatted as [1], [2] with footer list
- Context cache created via `client.caches.create()`
- Cached queries use `cached_content=cache.name`
- **Research Agent uses Gemini web search for source discovery**
- **Dynamic source discovery (no curated source list)**

**Exit Criteria:**
- Chat answers questions about case
- Simple questions answered from KG (fast)
- Complex questions escalate to agents
- **Research/Discovery invocable from chat**
- **Hypothesis View functional with fullscreen**
- Context caching working (verify cost reduction)
- Long sessions don't exhaust context
- All responses have citations
- Chat history persists

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
    │               │
    │               └── Phase 4 (Core Agent System)
    │                       │
    │                       └── Phase 5 (Domain Agents)
    │                               │
    │                               └── Phase 6 (Synthesis & KG)
    │                                       │
    │                                       ├── Phase 7 (Agent Flow)
    │                                       │
    │                                       ├── Phase 8 (Intelligence Layer)
    │                                       │
    │                                       └── Phase 9 (Chat Interface)
    │                                               │
    │                                               └── Phase 10 (Source Panel)
    │                                                       │
    │                                                       └── Phase 11 (Corrections)
    │                                                               │
    │                                                               └── Phase 12 (Demo Prep)
```

Note: Phases 7, 8, 9 can run in parallel after Phase 6 completes.

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

*Roadmap Version: 2.2*
*Updated: 2026-02-05 (Phase 5 complete)*
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
