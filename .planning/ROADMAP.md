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

| Phase | Name | Focus | Requirements Covered |
|-------|------|-------|---------------------|
| 1 | Foundation Infrastructure | CI/CD, Database, Storage, SSE skeleton | REQ-INF-* |
| 1.1 | Frontend Design Foundation (INSERTED) | Design system, Liquid Glass, Landing page | UX quality (foundational) |
| 2 | Authentication & Case Shell | Auth system, Case CRUD, basic UI shell | REQ-AUTH-*, REQ-CASE-001/002/003 |
| 3 | File Ingestion | Upload, storage, file management | REQ-CASE-004/005, REQ-SOURCE-* (basic) |
| 4 | Core Agent System | ADK setup, Triage Agent, Orchestrator, Research/Discovery stubs | REQ-AGENT-001/002/007/007a/007b/007e |
| 5 | Agent Flow | Real-time visualization, SSE streaming, HITL dialogs | REQ-VIS-001/001a/002, REQ-INF-004 |
| 6 | Domain Agents | Financial, Legal, Strategy, Evidence agents, Entity taxonomy, Hypothesis evaluation | REQ-AGENT-003/004/005/006/007c/007d/007h, REQ-HYPO-002/003 |
| 7 | Synthesis & Knowledge Graph | Synthesis Agent, KG Agent, Hypothesis system, Task generation, 5-layer KG | REQ-AGENT-008/009, REQ-VIS-003, REQ-HYPO-001/004/005/006, REQ-TASK-001/002 |
| 8 | Intelligence Layer & Geospatial | Contradictions, Gaps, Geospatial Agent, Map View, Earth Engine | REQ-WOW-*, REQ-VIS-005/006, REQ-GEO-* |
| 9 | Chat Interface & Research | Chat UI, Research/Discovery (Chat + Orchestrator-triggered), Hypothesis View, Context caching | REQ-CHAT-*, REQ-RESEARCH-*, REQ-HYPO-007/008 |
| 10 | Agent Flow & Source Panel | Full source viewers, Task Panel, Timeline | REQ-SOURCE-*, REQ-VIS-*, REQ-TASK-003/004/005/006/007 |
| 11 | Corrections & Refinement | Error flagging, Verification, Regeneration | REQ-CORR-* |
| 12 | Demo Preparation | Demo case showcasing all integration features | Demo readiness, REQ-RESEARCH-004, REQ-AGENT-007i |

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

**Plans:** 6 plans in 4 waves

Plans:
- [ ] 02-01-PLAN.md — Backend auth infrastructure (models, session validation, migration)
- [ ] 02-02-PLAN.md — Backend case CRUD endpoints
- [ ] 02-03-PLAN.md — Frontend Better Auth setup (config, middleware, client)
- [ ] 02-04-PLAN.md — Auth UI (login/signup page with forms)
- [ ] 02-05-PLAN.md — App shell (sidebar, layout, user menu)
- [ ] 02-06-PLAN.md — Case list and creation UI

**Deliverables:**
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

**Exit Criteria:**
- User can register, login, logout
- Google OAuth works
- Session persists across refresh
- Cases visible only to owner
- Case CRUD operations work

---

## Phase 3: File Ingestion

**Goal:** Enable evidence file upload and management.

**Requirements:** REQ-CASE-004, REQ-CASE-005, REQ-SOURCE-001 (basic), REQ-SOURCE-002 (basic), REQ-SOURCE-003 (basic), REQ-SOURCE-004 (basic)

**Deliverables:**
- Drag-and-drop file upload UI
- Multiple file upload with progress
- Files stored in GCS (case_id/file_id structure)
- File metadata in PostgreSQL
- Case Library view (grid/list)
- File type icons and thumbnails
- Basic file viewers (PDF, video, audio, image)
- File deletion

**Technical Notes:**
- Resumable uploads via tus protocol or chunked upload
- Generate thumbnails async (or defer to Gemini)
- Signed URLs for secure file access
- File status: UPLOADED, PROCESSING, ANALYZED, ERROR

**Exit Criteria:**
- Upload multiple files to a case
- View files in Case Library
- Basic preview for all file types
- Delete individual files

---

## Phase 4: Core Agent System

**Goal:** Establish ADK infrastructure and first agents (Triage + Orchestrator).

**Requirements:** REQ-AGENT-007, REQ-AGENT-007a, REQ-AGENT-007b, REQ-AGENT-007e, REQ-AGENT-001, REQ-AGENT-002 (partial)

**Deliverables:**
- Google ADK 1.22.x integration
- DatabaseSessionService with PostgreSQL
- GcsArtifactService for versioned storage
- Agent factory pattern (fresh instances per workflow)
- State scope prefix usage (none, user:, app:, temp:)
- Triage Agent implementation with `thinking_level="low"`
- Triage outputs: domain scores, complexity, summary, entities
- Orchestrator Agent skeleton with `thinking_level="high"`
- **Orchestrator routing stubs for Research/Discovery agents** (future phases)
- **Orchestrator → Research trigger logic** (with user confirmation SSE event)
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

**Exit Criteria:**
- Triage Agent processes uploaded files
- Domain scores and entities extracted
- Orchestrator receives triage output
- Agent execution logged to database
- SSE events fire for agent lifecycle (AGENT_SPAWNED, THINKING_UPDATE, AGENT_COMPLETED)
- Thinking traces captured and available for display

---

## Phase 5: Agent Flow

**Goal:** Real-time visualization of agent execution with full transparency.

**Requirements:** REQ-VIS-001, REQ-VIS-001a, REQ-VIS-002, REQ-INF-004 (complete)

**Deliverables:**
- React Flow canvas for agent visualization
- Agent nodes with type-based styling
- Animated edges during data flow
- Real-time updates via SSE with callback mapping:
  - `before_agent_callback` → AGENT_SPAWNED (node appears)
  - `after_agent_callback` → AGENT_COMPLETED (node completes)
  - `before_tool_callback` → TOOL_INVOKED (tool indicator)
  - `before_model_callback` → THINKING_UPDATE (reasoning started)
  - `after_model_callback` → MODEL_RESPONSE (thinking traces available)
- Click-to-expand agent detail panel
- Detail view: model, input, tools, output, duration, thinking traces
- Token usage display
- Execution timeline
- Human-in-the-loop confirmation dialogs (frontend implementation)
  - Confirmation component with action preview
  - Operations: delete file, apply correction, regenerate, delete case
  - Timeout with auto-cancel (2 minutes)

**Technical Notes:**
- React Flow 12 (@xyflow/react)
- Memoization critical for performance
- Async queue for callback → SSE event translation
- Thinking traces from `include_thoughts=True` configuration
- Frontend confirmation dialogs (ADK limitation: require_confirmation only works with InMemorySessionService)

**Exit Criteria:**
- Real-time agent flow visible during processing
- Click any node for full details
- Thinking traces displayed correctly
- SSE connection stable with reconnection
- Confirmation dialogs work for sensitive operations

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

---

## Phase 7: Synthesis & Knowledge Graph

**Goal:** Cross-reference findings, build entity-relationship graph, and implement hypothesis system.

**Requirements:** REQ-AGENT-008, REQ-AGENT-009, REQ-AGENT-010, REQ-VIS-003 (basic), REQ-HYPO-001, REQ-HYPO-004, REQ-HYPO-005, REQ-HYPO-006, REQ-TASK-001, REQ-TASK-002

**Deliverables:**
- Synthesis Agent implementation
- Cross-referencing logic for links, contradictions, gaps
- **Hypothesis system integration:**
  - `case_hypotheses` database table
  - `hypothesis_evidence` database table
  - Hypothesis status calculation (deterministic base + AI override)
  - Hypothesis confidence scoring
  - SSE events for hypothesis updates
- **Investigation task generation from synthesis:**
  - `investigation_tasks` database table
  - Task creation for contradictions (resolve_contradiction)
  - Task creation for gaps (obtain_evidence)
  - SSE events for task creation
- Knowledge Graph Agent implementation
- **Full entity taxonomy extraction** (domain-specific types)
- **Entity resolution: auto-merge with flag for >85% matches**
- Relationship extraction with types
- PostgreSQL schema for graph (nodes, edges tables)
- **5-layer Knowledge Graph:** Evidence (red), Legal (blue), Strategy (green), Temporal (amber), Hypothesis (pink)
- Graph query APIs
- **Evaluate graph library: vis-network vs D3.js** (choose during implementation)
- Basic force-directed visualization
- Incremental graph updates

**Technical Notes:**
- Graph stored relationally (nodes table, edges table with foreign keys)
- Entity resolution via fuzzy string matching + LLM confirmation
- Graph layers stored as node properties
- Synthesis outputs feed KG Agent
- **Simplified hypothesis lifecycle: PENDING → SUPPORTED/REFUTED (user marks RESOLVED)**
- **Task types: resolve_contradiction, obtain_evidence, verify_hypothesis, etc.**
- **Task list injected into agent context for deduplication (no complex coordination)**
- vis-network offers ForceAtlas2 physics, better interactivity; D3.js offers more customization

**Exit Criteria:**
- Synthesis Agent produces unified findings
- Contradictions and gaps identified
- **Hypothesis system functional with status updates via SSE**
- **Investigation tasks generated from synthesis**
- Knowledge Graph populated with entities and relationships
- **5 layers toggleable in visualization**
- **Entity resolution auto-merges >85% matches**
- Basic graph visualization works
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

**Deliverables:**
- Chat UI with message history
- Streaming responses
- Knowledge-first query pattern (KG lookup first)
- Agent escalation for novel questions
- Chat Agent implementation with `thinking_level="medium"`
- **Research/Discovery invocation:**
  - Research Agent invocable from chat ("Research [subject]")
  - **Orchestrator-triggered Research** when evidence gaps detected (with user confirmation)
  - Discovery Agent synthesizes external research
  - Suggest-then-confirm flow for source retrieval
  - Binary access classification (ACCESSIBLE / REQUIRES_ACTION)
  - ResilientAgentWrapper for Research/Discovery
- **Hypothesis View:**
  - Dedicated hypothesis view (separate from KG)
  - Hypothesis cards with status, confidence, evidence counts
  - Fullscreen capability
- **Optional temporal sync between Map View and Timeline**
- **Context caching for cost optimization:**
  - Create evidence cache when user opens case
  - 2-hour TTL (session duration)
  - 4x cost reduction for cached queries
  - Cache invalidation on new evidence upload
- **Context compaction for long sessions:**
  - EventsCompactionConfig with 5 invocation interval
  - LlmEventSummarizer with Gemini Flash
  - Prevents context window exhaustion
- Inline citations in responses
- Citation hover preview
- Citation click to Source Panel
- Chat history persistence

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

**Deliverables:**
- PDF viewer with excerpt highlighting
- Video player with timestamp markers
- Audio player with waveform and transcript sync
- Image viewer with bounding box annotations
- Citation navigation (click → exact location)
- Timeline view with events
- Narrative generation (executive summary, detailed)
- Export as PDF/DOCX
- **Agent Flow refinements:**
  - React Flow agent pipeline visualization
  - Custom node components per agent type
  - Agent color coding (defer specific colors to design)
  - **Task count badges on agent nodes** (shows pending tasks per agent)
  - Thinking overlay with streaming thoughts
  - Interactive time-scrubbing
  - Pause/resume workflow
  - Workflow playback with speed control
  - Frontend confirmation dialogs for sensitive operations
  - Fullscreen mode
- **Investigation Task Panel:**
  - Bottom drawer UI
  - Filter/sort by priority, agent, type
  - Task completion with type-dependent rules
  - Task deduplication (agents check before creating)
  - SSE streaming for task events
  - Fullscreen capability

**Technical Notes:**
- PDF: react-pdf or pdf.js
- Audio: wavesurfer.js
- Video: native HTML5 with custom controls
- Timeline: D3.js or vis-timeline
- Narrative: Gemini generates from Synthesis output
- **Task count badges update in real-time via SSE**

**Exit Criteria:**
- All source types viewable with full features
- Citations navigate to exact locations
- Timeline shows chronological events
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

*Roadmap Version: 1.4*
*Updated: 2026-01-24 (Phase 2 planned)*
*Phase 1 planned: 2026-01-20*
*Phase 1.1 planned: 2026-01-23*
*Phase 1.1 complete: 2026-01-24*
*Phase 2 planned: 2026-01-24*
