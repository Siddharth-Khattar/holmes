# Holmes Requirements Specification

**Version:** 1.0
**Date:** 2026-01-18
**Status:** DRAFT - Awaiting approval

## Requirements Overview

This document defines formal requirements for Holmes v1. Requirements are derived from PROJECT.md, stakeholder scoping sessions, and research findings.

---

## REQ-INF: Infrastructure & Deployment

### REQ-INF-001: CI/CD Pipeline
**Priority:** CRITICAL
**Description:** Automated deployment pipeline that deploys every push to main branch.
**Acceptance Criteria:**
- GitHub Actions workflow triggers on push to main
- Builds and deploys backend to Cloud Run
- Builds and deploys frontend to Cloud Run (or Vercel)
- Deployment completes within 10 minutes
- Failed deployments do not affect production
**Dependencies:** None (first phase)

### REQ-INF-002: PostgreSQL Database
**Priority:** CRITICAL
**Description:** Cloud SQL PostgreSQL instance for all persistent data.
**Acceptance Criteria:**
- PostgreSQL 17 on Cloud SQL
- Hybrid schema: relational tables + JSONB for flexible data
- Async SQLAlchemy 2.0 for backend access
- Connection pooling configured
- Database migrations via Alembic
**Dependencies:** REQ-INF-001

### REQ-INF-003: Cloud Storage
**Priority:** CRITICAL
**Description:** GCS bucket for evidence file storage.
**Acceptance Criteria:**
- Dedicated bucket per environment (dev, prod)
- Files organized by case_id
- Signed URLs for secure access
- Maximum file size: 500MB
- Supported types: PDF, DOCX, MP4, MP3, JPG, PNG, WAV
- **Tiered agent delivery:**
  - ≤100MB files: Downloaded from GCS, encoded as inline_data for Gemini
  - >100MB files: Downloaded from GCS, uploaded to Gemini File API (2GB max, 48hr retention, free)
  - File API URIs reusable across all pipeline stages
**Dependencies:** REQ-INF-001

### REQ-INF-004: SSE Streaming Infrastructure
**Priority:** HIGH
**Description:** Server-Sent Events for real-time agent progress updates.
**Acceptance Criteria:**
- FastAPI SSE endpoints via sse-starlette
- Proper headers for Cloud Run (X-Accel-Buffering: no)
- Heartbeat every 15 seconds to prevent timeout
- Polling fallback for SSE failures
- Frontend EventSource with auto-reconnect
**Dependencies:** REQ-INF-002

---

## REQ-AUTH: Authentication & Authorization

### REQ-AUTH-001: Email/Password Registration
**Priority:** HIGH
**Description:** Users can create accounts with email and password.
**Acceptance Criteria:**
- Email validation
- Password strength requirements (8+ chars, mixed case, number)
- Email verification flow
- Secure password hashing (bcrypt)
**Dependencies:** REQ-INF-002

### REQ-AUTH-002: Google OAuth
**Priority:** HIGH
**Description:** Users can sign in with Google accounts.
**Acceptance Criteria:**
- Google OAuth 2.0 integration
- Automatic account linking if email exists
- Profile picture imported
**Dependencies:** REQ-AUTH-001

### REQ-AUTH-003: Session Management
**Priority:** HIGH
**Description:** Persistent sessions across browser refresh.
**Acceptance Criteria:**
- JWT-based sessions
- Session persists in localStorage/cookies
- Automatic refresh before expiry
- Backend validates session on every request
**Dependencies:** REQ-AUTH-001

### REQ-AUTH-004: Case Access Control
**Priority:** HIGH
**Description:** Users see only their own cases.
**Acceptance Criteria:**
- Cases linked to user_id
- All case queries filtered by authenticated user
- No cross-user data leakage
**Dependencies:** REQ-AUTH-001, REQ-CASE-001

---

## REQ-CASE: Case Management

### REQ-CASE-001: Case Creation
**Priority:** HIGH
**Description:** Users can create new investigation cases.
**Acceptance Criteria:**
- Case name (required, 3-100 chars)
- Case description/context (optional, up to 5000 chars)
- Case type selection (Fraud, Corporate, Civil, Criminal, Other)
- Case created with DRAFT status
- Unique case ID generated
**Dependencies:** REQ-AUTH-001, REQ-INF-002

### REQ-CASE-002: Case List View
**Priority:** HIGH
**Description:** Users can view all their cases with status indicators.
**Acceptance Criteria:**
- Paginated list (20 per page)
- Shows: name, type, status, file count, created date, last modified
- Status indicators: DRAFT, PROCESSING, READY, ERROR
- Sort by date, name, status
- Search by name
**Dependencies:** REQ-CASE-001

### REQ-CASE-003: Case Deletion
**Priority:** MEDIUM
**Description:** Users can delete cases with all associated data.
**Acceptance Criteria:**
- Confirmation dialog required
- Cascades to: files, analysis results, knowledge graph, chat history
- GCS files deleted
- Soft delete with 30-day recovery window
**Dependencies:** REQ-CASE-001

### REQ-CASE-004: Evidence Upload
**Priority:** CRITICAL
**Description:** Users can upload multiple evidence files to a case.
**Acceptance Criteria:**
- Drag-and-drop upload UI
- Multiple file selection
- Progress indicator per file
- Automatic file type detection
- Supported: PDF, DOCX, MP4, MP3, WAV, JPG, PNG
- Max 500MB per file
- Files stored in GCS with metadata in PostgreSQL
**Dependencies:** REQ-CASE-001, REQ-INF-003

### REQ-CASE-005: Case Library View
**Priority:** HIGH
**Description:** Users can view and manage files within a case.
**Acceptance Criteria:**
- Grid or list view toggle
- File thumbnails for images/PDFs
- File metadata: name, type, size, upload date, processing status
- Filter by type, status
- Select files for batch operations
- Delete individual files
**Dependencies:** REQ-CASE-004

---

## REQ-AGENT: Agentic Processing Pipeline

### REQ-AGENT-001: Triage Agent
**Priority:** CRITICAL
**Description:** Initial agent that classifies files by domain relevance.
**Acceptance Criteria:**
- Receives files via tiered handling: inline (≤100MB) or File API (>100MB, up to 2GB)
- Uses Gemini 3 Flash for speed
- Runs in a **fresh stage-isolated ADK session** (no shared context with other stages)
- Outputs domain scores: Financial (0-100), Legal (0-100), Strategy (0-100), Evidence (0-100)
- Outputs complexity tier (Low/Medium/High)
- Outputs file summary: short (1-2 sentences) and detailed (paragraph)
- Outputs detected entities (people, orgs, dates, locations, amounts, legal terms)
- `media_resolution: "medium"` for speed (classification, not forensic)
- Stores TriageOutput in `agent_executions` table for downstream stages
- Handles multimodal evidence: PDF, video (MP4), audio (MP3/WAV), images (JPG/PNG)
**Dependencies:** REQ-INF-003, REQ-AGENT-007

### REQ-AGENT-002: Orchestrator Agent
**Priority:** CRITICAL
**Description:** Intelligent coordinator that routes files to domain agents.
**Acceptance Criteria:**
- LlmAgent with Gemini 3 Pro
- Receives triage results
- Routes to 1+ domain agents based on scores (threshold: 0.4)
- Manages parallel execution of domain agents
- Aggregates domain outputs for Synthesis Agent
- Handles agent failures gracefully
**Dependencies:** REQ-AGENT-001

### REQ-AGENT-003: Financial Analysis Agent
**Priority:** HIGH
**Description:** Domain agent specialized in financial document analysis.
**Acceptance Criteria:**
- Processes financial records, invoices, statements, receipts
- Extracts: transactions, amounts, dates, parties, account numbers
- Identifies: anomalies, patterns, discrepancies
- Links to other evidence (temporal, entity-based)
- Outputs structured findings with span-level citations
- Gemini 3 Pro for deep analysis
**Dependencies:** REQ-AGENT-002

### REQ-AGENT-004: Legal Analysis Agent
**Priority:** HIGH
**Description:** Domain agent specialized in legal document analysis.
**Acceptance Criteria:**
- Processes contracts, legal filings, correspondence, regulations
- Extracts: parties, obligations, dates, clauses, citations
- Identifies: risks, violations, precedents
- Links to statutes/regulations mentioned
- Outputs structured findings with span-level citations
- Gemini 3 Pro for nuanced legal interpretation
**Dependencies:** REQ-AGENT-002

### REQ-AGENT-005: Strategy Analysis Agent
**Priority:** HIGH
**Description:** Domain agent specialized in strategic implications.
**Acceptance Criteria:**
- Synthesizes across financial and legal findings
- Identifies: case strengths, weaknesses, risks, opportunities
- Suggests investigation directions
- Prioritizes evidence by strategic value
- Outputs strategic recommendations with citations
- Gemini 3 Pro for complex reasoning
**Dependencies:** REQ-AGENT-002

### REQ-AGENT-006: Evidence Analysis Agent
**Priority:** HIGH
**Description:** Domain agent specialized in critical evidence evaluation, authenticity verification, and forensic analysis.
**Acceptance Criteria:**

**Core Capabilities:**
- Processes ALL evidence types natively via Gemini 3 multimodal:
  - Documents: PDFs, scanned images, contracts, correspondence
  - Images: Photos, screenshots, diagrams, scanned receipts
  - Video: Surveillance footage, depositions, recordings
  - Audio: Phone calls, meetings, voicemails

**Authenticity Analysis:**
- Evaluates visual authenticity indicators:
  - Image manipulation detection (splicing, cloning, retouching)
  - Document alteration signs (font inconsistencies, alignment issues)
  - Video editing artifacts (jump cuts, frame manipulation)
- Metadata consistency checking:
  - Creation/modification timestamps vs claimed dates
  - Device/software fingerprints
  - GPS/location data validation
  - Author/creator information

**Chain of Custody:**
- Documents evidence provenance trail
- Identifies gaps in custody documentation
- Flags evidence with unclear origin
- Assesses handling and storage conditions

**Corroboration Analysis:**
- Cross-references evidence against other case materials
- Identifies supporting evidence for key claims
- Detects evidence that contradicts other sources
- Calculates corroboration scores per claim

**Quality Assessment Output:**
```json
{
  "authenticity_score": 0.0-1.0,
  "authenticity_concerns": ["list of specific concerns"],
  "custody_chain_complete": true/false,
  "custody_gaps": ["list of gaps"],
  "corroboration_status": "strong|moderate|weak|uncorroborated",
  "corroborating_evidence": ["file_id#location references"],
  "contradicting_evidence": ["file_id#location references"],
  "recommendation": "ADMIT|VERIFY|CHALLENGE|EXCLUDE",
  "confidence": 0.0-1.0
}
```

**Technical Configuration:**
- Model: Gemini 3 Pro with `thinking_level="high"`
- Media resolution: `"high"` for document forensics
- `include_thoughts=True` for audit trail
- Outputs structured findings with span-level citations

**Dependencies:** REQ-AGENT-002, REQ-AGENT-007c

### REQ-AGENT-007: ADK Runner Infrastructure
**Priority:** CRITICAL
**Description:** Google ADK integration for agent orchestration.
**Acceptance Criteria:**
- ADK >=1.22.0 integrated with FastAPI
- DatabaseSessionService with PostgreSQL (asyncpg)
- **Stage-isolated sessions**: Each pipeline stage (Triage, Orchestrator, Domain, Synthesis) gets a FRESH ADK session to prevent multimodal file content from bloating downstream contexts
- Session ID: SHA-256 hash of `case_id:workflow_id:stage` (deterministic, idempotent)
- Inter-stage data flows via database (`agent_executions` table), not session state
- Intra-stage data uses ADK `output_key` and `{key}` template injection
- Fresh agent instances per stage (ADK constraint: single parent rule)
- State namespacing per user/case with scope prefixes:
  - No prefix: Current session (case-specific data)
  - `user:` prefix: All user sessions (investigator preferences)
  - `app:` prefix: Global application (system configuration)
  - `temp:` prefix: Current invocation only (intermediate processing)
- **Tiered file handling**: inline (≤100MB) or File API (>100MB, up to 2GB)
- File API references reusable across pipeline stages (48hr retention)
- Tool registration and execution
- Error handling and retry logic
- GcsArtifactService for evidence and report storage with versioning
- Thought signature handling for multi-turn function calling (SDK handles automatically)
- Pipeline orchestration via Python code (NOT a single ADK SequentialAgent across stages)
- ParallelAgent used WITHIN Stage 3 for concurrent domain agents
**Dependencies:** REQ-INF-002

### REQ-AGENT-007a: ADK Limitations Documentation
**Priority:** HIGH
**Description:** Document and design around known ADK limitations.
**Acceptance Criteria:**
- Tool confirmation (`require_confirmation`) only works with InMemorySessionService, NOT DatabaseSessionService
  - **Mitigation:** Implement confirmation dialogs in frontend instead
- Cannot use `tools` and `output_schema` together on same agent
  - **Mitigation:** Split into tool-using agent → schema-constrained agent pipeline
- Single parent rule: An agent can only be a sub-agent of one parent
  - **Mitigation:** Agent factory pattern creates fresh instances per workflow
- State updates only commit after Event is yielded and processed
  - **Mitigation:** Ensure tool results returned before yielding next event
- Temperature must stay at 1.0 for Gemini 3 (lower values cause looping)
  - **Mitigation:** Do not override temperature setting
- LoopAgent requires explicit `EventActions(escalate=True)` to exit early
  - **Mitigation:** Add explicit QualityThresholdChecker BaseAgent in loops
**Dependencies:** REQ-AGENT-007

### REQ-AGENT-007b: Thinking Mode Configuration
**Priority:** HIGH
**Description:** Configure thinking levels using `BuiltInPlanner` with `ThinkingConfig` (ADK best practice).
**Acceptance Criteria:**
- All agents use `BuiltInPlanner(thinking_config=ThinkingConfig(thinking_level=..., include_thoughts=True))`
- **NOT** using `generate_content_config` directly (use `BuiltInPlanner` instead)
- **NOT** using `thinking_budget` (that's for Gemini 2.5, not Gemini 3)
- Thinking level assignments — **ALL agents use HIGH per user preference**:
  - **Triage Agent:** `thinking_level="high"` (user requested HIGH for all)
  - **Orchestrator Agent:** `thinking_level="high"` (complex routing decisions)
  - **Financial Agent:** `thinking_level="high"`
  - **Legal Agent:** `thinking_level="high"`
  - **Strategy Agent:** `thinking_level="high"`
  - **Evidence Agent:** `thinking_level="high"` (forensic-level authenticity analysis)
  - **Synthesis Agent:** `thinking_level="high"` (complex cross-referencing)
  - **KG Agent:** `thinking_level="high"`
  - **Chat Agent:** `thinking_level="high"`
  - **Verification Agent:** `thinking_level="high"` (critical accuracy)
- All agents set `include_thoughts=True` for Agent Flow transparency
- Thinking traces captured and stored for display in visualization
- Factory helper: `create_thinking_planner(level="high") -> BuiltInPlanner`
**Dependencies:** REQ-AGENT-007

### REQ-AGENT-007c: Media Resolution Configuration
**Priority:** HIGH
**Description:** Configure media resolution per agent type for optimal quality/cost balance.
**Acceptance Criteria:**
- Gemini 3 `media_resolution` parameter controls tokens per image/video frame:
  - `low`: 280 tokens/image, 70 tokens/video frame (fast, cheap)
  - `medium`: 560 tokens/image, 70 tokens/video frame (balanced)
  - `high`: 1,120 tokens/image, 280 tokens/video frame (detailed, expensive)
- Per-agent configuration:
  - **Triage Agent:** `media_resolution="medium"` (classification speed)
  - **Financial Agent:** `media_resolution="high"` (dense tables, fine figures)
  - **Legal Agent:** `media_resolution="high"` (fine print, signatures)
  - **Strategy Agent:** `media_resolution="medium"` (general content)
  - **Evidence Agent:** `media_resolution="high"` (forensic detail, OCR, manipulation detection)
  - **Research/Discovery:** `media_resolution="low"` (web content, not evidence)
- Enables accurate extraction of: small text, signatures, dense tables, watermarks, annotations
- Config applied via `generation_config={"media_resolution": "high"}` or equivalent
- Multimodal token rates: Video 263 tok/sec, Audio 32 tok/sec, PDF ~258 tok/page (image)
- Gemini 3 native PDF text extraction is FREE (only image tokens charged)
**Dependencies:** REQ-AGENT-007

### REQ-AGENT-007d: Video/Audio Processing with Metadata
**Priority:** HIGH
**Description:** Support precise segment analysis for video and audio evidence.
**Acceptance Criteria:**
- Video evidence processed with `VideoMetadata` for timestamp offsets
- Support for analyzing specific segments: `start_offset`, `end_offset`
- Audio evidence includes speaker diarization requests
- Key moments extracted with precise timestamps (MM:SS or HH:MM:SS)
- Transcripts aligned with timestamps for citation linking
- Example usage:
  ```python
  types.Part(
      file_data=types.FileData(file_uri=video_file.uri),
      video_metadata=VideoMetadata(
          start_offset="00:15:00",
          end_offset="00:45:00"
      )
  )
  ```
**Dependencies:** REQ-AGENT-007, REQ-INF-003

### REQ-AGENT-007e: ADK Artifact Service
**Priority:** HIGH
**Description:** Use ADK's GcsArtifactService for evidence and report storage with versioning.
**Acceptance Criteria:**
- Configure `GcsArtifactService` with dedicated bucket
- Runner initialized with artifact_service parameter
- Tools use `tool_context.save_artifact()` for storing:
  - Generated reports (PDF, DOCX)
  - Structured findings (JSON)
  - Extracted evidence snapshots
- Tools use `tool_context.load_artifact()` for retrieval
- Versioning enabled for correction/regeneration audit trail
- Artifact references stored in state for downstream access
**Dependencies:** REQ-INF-003, REQ-AGENT-007

### REQ-AGENT-007f: Context Caching for Evidence
**Priority:** MEDIUM
**Description:** Implement context caching for cost-effective repeated queries against same evidence.
**Acceptance Criteria:**
- Create context cache when user opens a case for chat
- Cache includes all case evidence files
- TTL set to session duration (default 2 hours)
- Chat queries use `cached_content` parameter
- Cost reduction: 4x cheaper for cached queries
- Cache invalidated when new evidence added
- Implementation pattern:
  ```python
  cache = client.caches.create(
      model="gemini-3-pro-preview",
      contents=[*case_evidence_files],
      ttl="7200s"
  )
  ```
**Dependencies:** REQ-AGENT-007, REQ-CHAT-001

### REQ-AGENT-007g: Context Compaction for Chat Sessions Only
**Priority:** MEDIUM
**Description:** Implement context compaction for the Chat Agent's iterative conversation sessions.
**Acceptance Criteria:**
- **NOT used for the analysis pipeline** — pipeline uses stage-isolated sessions (no history to compact)
- **Only for Chat Agent** (REQ-CHAT) which has iterative multi-turn conversations
- Configure `EventsCompactionConfig` for Chat Agent sessions
- Compaction interval: every 5 invocations
- Overlap size: 2 events preserved in summary
- Use `LlmEventSummarizer` with Gemini Flash for cost efficiency
- Implementation:
  ```python
  # ONLY for Chat Agent's App configuration
  events_compaction_config=EventsCompactionConfig(
      compaction_interval=5,
      overlap_size=2,
      summarizer=LlmEventSummarizer(llm=Gemini(model="gemini-3-flash-preview"))
  )
  ```
- **Why not for pipeline?** Each pipeline stage (Triage→Orchestrator→Domain→Synthesis) runs in a fresh session. There's no conversation history to compact. Stage isolation is the primary context management strategy.
**Dependencies:** REQ-AGENT-007, REQ-CHAT-005

### REQ-AGENT-007h: Resilient Agent Wrapper
**Priority:** HIGH
**Description:** Implement graceful degradation with fallback agents.
**Acceptance Criteria:**
- Custom `ResilientAgentWrapper` BaseAgent for each domain agent
- Primary agent: Gemini 3 Pro for full analysis
- Fallback agent: Gemini 3 Flash for degraded but functional analysis
- Error logging to state for debugging
- Graceful error message when both fail
- Pattern:
  ```python
  class ResilientAgentWrapper(BaseAgent):
      def __init__(self, primary_agent, fallback_agent=None):
          self.primary_agent = primary_agent
          self.fallback_agent = fallback_agent
  ```
**Dependencies:** REQ-AGENT-007, REQ-ERR-005

### REQ-AGENT-007i: Deep Research Agent Integration
**Priority:** LOW
**Description:** Integrate Gemini Deep Research agent for autonomous case background research.
**Acceptance Criteria:**
- Use `client.interactions.create()` with `deep-research-pro-preview` agent
- Run as background task (`background=True`)
- Stream progress via thinking summaries
- Research outputs: corporate filings, news articles, legal records
- Results integrated into case context for domain agents
- User can trigger: "Research background on [subject]"
- Implementation:
  ```python
  interaction = client.interactions.create(
      input="Research publicly available information about [subject]",
      agent='deep-research-pro-preview-12-2025',
      background=True,
      stream=True,
      agent_config={"type": "deep-research", "thinking_summaries": "auto"}
  )
  ```
**Dependencies:** REQ-AGENT-007, REQ-CHAT-003

### REQ-AGENT-008: Synthesis Agent
**Priority:** HIGH
**Description:** Agent that cross-references all domain findings.
**Acceptance Criteria:**
- Receives outputs from all domain agents
- Identifies: links between findings, contradictions, gaps
- Produces: unified findings document, contradiction list, gap list
- Maintains provenance chain for all assertions
- Gemini 3 Pro with `thinking_level="high"` for complex synthesis
- Uses `include_thoughts=True` for transparency
**Dependencies:** REQ-AGENT-003, REQ-AGENT-004, REQ-AGENT-005, REQ-AGENT-006

### REQ-AGENT-009: Knowledge Graph Agent
**Priority:** HIGH
**Description:** Agent that builds entity-relationship graph from synthesis.
**Acceptance Criteria:**
- Extracts entities with full domain-specific taxonomy
- Core types: Person, Organization, Event, Document, Location, Amount
- Legal types: statute, case_citation, contract, legal_term, court
- Financial types: monetary_amount, account, transaction, asset
- Evidence types: communication, alias, vehicle, property, timestamp
- Identifies relationships with types (e.g., EMPLOYED_BY, SIGNED, WITNESSED)
- Entity resolution: auto-merge with flag for >85% similarity matches
- Domain-dependent metadata depth per entity type
- Incremental updates without full rebuild
- Stores in PostgreSQL (nodes + edges tables)
- Links all nodes to source evidence
**Dependencies:** REQ-AGENT-008

### REQ-AGENT-010: Incremental Processing
**Priority:** MEDIUM
**Description:** Pipeline handles new files without full reprocessing.
**Acceptance Criteria:**
- New files processed through full pipeline
- Existing knowledge graph updated incrementally
- Synthesis Agent re-evaluates with new context
- Affected entities marked for review
- No reprocessing of unchanged files
**Dependencies:** REQ-AGENT-008, REQ-AGENT-009

---

## REQ-VIS: Visualization & UI

### REQ-VIS-001: Agent Flow
**Priority:** CRITICAL
**Description:** Real-time visualization of agent execution flow.
**Acceptance Criteria:**
- React Flow canvas showing agent nodes
- Animated edges during data flow
- Color-coded by agent type
- Click node to expand details panel
- Shows: model, input summary, tools called, output summary, duration, thinking traces
- Updates in real-time via SSE
- ADK callback-to-SSE mapping:
  - `before_agent_callback` → `AGENT_SPAWNED` event (node appears)
  - `after_agent_callback` → `AGENT_COMPLETED` event (node completes)
  - `before_tool_callback` → `TOOL_INVOKED` event (tool indicator)
  - `before_model_callback` → `THINKING_UPDATE` event (reasoning trace)
  - `after_model_callback` → `MODEL_RESPONSE` event (partial output)
**Dependencies:** REQ-INF-004, REQ-AGENT-002, REQ-AGENT-007b

### REQ-VIS-001a: Human-in-the-Loop Confirmation (Frontend)
**Priority:** HIGH
**Description:** Implement confirmation dialogs in frontend for sensitive operations.
**Acceptance Criteria:**
- **Note:** ADK's `require_confirmation` only works with InMemorySessionService, not DatabaseSessionService. Therefore, confirmation is implemented in frontend.
- Confirmation dialog UI component with:
  - Action description
  - Affected items preview
  - Confirm/Cancel buttons
  - Optional reason input
- Operations requiring confirmation:
  - Delete evidence file
  - Apply correction to knowledge graph
  - Regenerate stale items (batch)
  - Clear chat history
  - Delete case
- Confirmation state tracked in Zustand store
- API calls blocked until confirmation received
- Timeout with auto-cancel (2 minutes)
- Audit log entry for confirmed actions
**Dependencies:** REQ-VIS-001

### REQ-VIS-002: Agent Detail View
**Priority:** HIGH
**Description:** Detailed view of individual agent execution.
**Acceptance Criteria:**
- Full thinking trace (if available)
- Complete input context
- Tool calls with inputs/outputs
- Complete output findings
- Token usage statistics
- Execution timeline
**Dependencies:** REQ-VIS-001

### REQ-VIS-003: Knowledge Graph View
**Priority:** HIGH
**Description:** Force-directed graph displaying entities and relationships.
**Acceptance Criteria:**
- Graph library: evaluate vis-network vs D3.js during Phase 7 implementation
- Nodes sized by connection count
- Edges labeled with relationship type
- Five toggleable layers: Evidence (red), Legal (blue), Strategy (green), Temporal (amber), Hypothesis (pink)
- Zoom and pan controls
- Node search and highlight
- Click node to see details and source links
- Fullscreen capability with maximize button
- Basic analytics: node count, edge count, most connected entities
**Dependencies:** REQ-AGENT-009

### REQ-VIS-004: Timeline View
**Priority:** MEDIUM
**Description:** Chronological view of case events.
**Acceptance Criteria:**
- Horizontal timeline with zoom
- Events plotted by date/time
- Events linked to source evidence
- Filter by entity, event type
- Gaps highlighted visually
- Click event for details
**Dependencies:** REQ-AGENT-009

### REQ-VIS-005: Contradictions Panel
**Priority:** HIGH
**Description:** Panel showing detected inconsistencies.
**Acceptance Criteria:**
- List of contradiction pairs
- Each shows: claim A, claim B, sources, severity
- Click to navigate to sources
- Filter by severity, entity
- Resolution status tracking
**Dependencies:** REQ-AGENT-008

### REQ-VIS-006: Evidence Gaps Panel
**Priority:** HIGH
**Description:** Panel showing missing evidence.
**Acceptance Criteria:**
- List of identified gaps
- Each shows: what's missing, why needed, related entities
- Priority ranking
- Suggestions for finding evidence
- Resolution status tracking
**Dependencies:** REQ-AGENT-008

---

## REQ-SOURCE: Source Panel

### REQ-SOURCE-001: PDF Viewer
**Priority:** HIGH
**Description:** View PDFs with highlighted excerpts.
**Acceptance Criteria:**
- Full PDF rendering (pdf.js or react-pdf)
- Page navigation
- Zoom controls
- Text selection
- Highlighted excerpts (from citations)
- Jump to specific page/excerpt
**Dependencies:** REQ-CASE-004

### REQ-SOURCE-002: Video Player
**Priority:** HIGH
**Description:** Video playback with timestamp linking.
**Acceptance Criteria:**
- Standard video controls
- Timestamp markers for key moments
- Click marker to jump to timestamp
- Transcript overlay option
- Frame-level navigation
**Dependencies:** REQ-CASE-004

### REQ-SOURCE-003: Audio Player
**Priority:** HIGH
**Description:** Audio playback with waveform visualization.
**Acceptance Criteria:**
- Waveform display (wavesurfer.js)
- Standard playback controls
- Transcript sync (highlight current segment)
- Click waveform to seek
- Timestamp markers for key moments
**Dependencies:** REQ-CASE-004

### REQ-SOURCE-004: Image Viewer
**Priority:** MEDIUM
**Description:** Image viewing with annotation overlays.
**Acceptance Criteria:**
- Zoom and pan controls
- Bounding box overlays (from agent analysis)
- Click bounding box for entity details
- Side-by-side comparison mode
**Dependencies:** REQ-CASE-004

### REQ-SOURCE-005: Citation Navigation
**Priority:** CRITICAL
**Description:** Click any citation to view source at exact location.
**Acceptance Criteria:**
- All agent citations are clickable
- Opens Source Panel with correct viewer
- Navigates to exact location (page, timestamp, region)
- Highlights relevant excerpt
- Source panel remembers last position
**Dependencies:** REQ-SOURCE-001, REQ-SOURCE-002, REQ-SOURCE-003, REQ-SOURCE-004

---

## REQ-CHAT: Contextual Chat

### REQ-CHAT-001: Chat Interface
**Priority:** HIGH
**Description:** Chat UI for asking questions about the case.
**Acceptance Criteria:**
- Message input with send button
- Message history display
- Streaming response with typing indicator
- Markdown rendering in responses
- Code block formatting
- Mobile-responsive
**Dependencies:** REQ-VIS-001

### REQ-CHAT-002: Knowledge-First Query
**Priority:** HIGH
**Description:** Chat queries Knowledge Graph before escalating.
**Acceptance Criteria:**
- Simple questions answered from KG (fast path)
- Response time < 2 seconds for KG queries
- Indicates when using cached knowledge
- Fallback to agent escalation for novel questions
**Dependencies:** REQ-AGENT-009, REQ-CHAT-001

### REQ-CHAT-003: Agent Escalation
**Priority:** HIGH
**Description:** Complex questions escalate to Orchestrator.
**Acceptance Criteria:**
- Detects when KG is insufficient
- Routes to Orchestrator for domain agent analysis
- User sees "Analyzing with agents..." indicator
- Full agent trace available during processing
- Results added to KG for future queries
**Dependencies:** REQ-AGENT-002, REQ-CHAT-002

### REQ-CHAT-004: Inline Citations
**Priority:** CRITICAL
**Description:** Responses include clickable citations to sources.
**Acceptance Criteria:**
- Every factual claim has citation
- Citations formatted as [1], [2], etc.
- Hover shows source preview
- Click opens Source Panel
- Citation list at response end
**Dependencies:** REQ-SOURCE-005, REQ-CHAT-001

### REQ-CHAT-005: Chat History
**Priority:** MEDIUM
**Description:** Chat history persists across sessions.
**Acceptance Criteria:**
- History stored in PostgreSQL
- Loads on case open
- Searchable history
- Export chat as document
**Dependencies:** REQ-CHAT-001, REQ-INF-002

---

## REQ-CORR: Correction & Regeneration

### REQ-CORR-001: Error Flagging
**Priority:** MEDIUM
**Description:** Users can flag errors in findings or graph.
**Acceptance Criteria:**
- Flag button on any finding/node
- Error description input
- Suggested correction (optional)
- Flags stored for review
**Dependencies:** REQ-VIS-003, REQ-VIS-005

### REQ-CORR-002: Verification Agent
**Priority:** MEDIUM
**Description:** Agent validates corrections against original sources.
**Acceptance Criteria:**
- Receives flagged item and correction
- Re-analyzes relevant sources
- Confirms or refutes correction
- Provides reasoning for decision
- Gemini 3 Pro for verification accuracy
**Dependencies:** REQ-CORR-001, REQ-AGENT-007

### REQ-CORR-003: Knowledge Graph Updates
**Priority:** MEDIUM
**Description:** Confirmed corrections update the graph.
**Acceptance Criteria:**
- Verified corrections applied to KG
- Affected nodes/edges updated
- Provenance updated with correction info
- Downstream items marked STALE
**Dependencies:** REQ-CORR-002, REQ-AGENT-009

### REQ-CORR-004: Stale Item Management
**Priority:** LOW
**Description:** Track and regenerate stale items.
**Acceptance Criteria:**
- Stale items visually indicated
- List of stale items in UI
- One-click regeneration
- Batch regeneration option
**Dependencies:** REQ-CORR-003

---

## REQ-RESEARCH: Research & Discovery System

### REQ-RESEARCH-001: Research Agent
**Priority:** HIGH
**Description:** Research Agent discovers where relevant evidence might exist using Gemini web search.
**Acceptance Criteria:**
- Analyzes query intent and determines research domain (corporate, litigation, criminal, regulatory)
- Executes web search via Gemini to discover potential sources
- Scores and classifies each source by relevance
- Outputs structured source map with access metadata
- Gemini 3 Pro with `thinking_level="medium"`
**Dependencies:** REQ-AGENT-007

### REQ-RESEARCH-002: Binary Access Classification
**Priority:** MEDIUM
**Description:** Sources classified with simplified binary access levels.
**Acceptance Criteria:**
- `ACCESSIBLE` — Can be retrieved and processed automatically
- `REQUIRES_ACTION` — User action needed (subscription, physical visit, FOIA, etc.)
- Access instructions provided for REQUIRES_ACTION sources
**Dependencies:** REQ-RESEARCH-001

### REQ-RESEARCH-003: Automatic Research Domain Detection
**Priority:** MEDIUM
**Description:** Research Agent automatically detects appropriate research domain from query.
**Acceptance Criteria:**
- Detects domain: corporate, litigation, criminal, regulatory
- Adjusts search strategy based on domain
- No manual domain selection required
**Dependencies:** REQ-RESEARCH-001

### REQ-RESEARCH-004: Deep Research Agent Integration
**Priority:** LOW
**Description:** Integration with Gemini Deep Research Agent for autonomous background research.
**Acceptance Criteria:**
- Uses `deep-research-pro-preview` agent for comprehensive research
- Runs as background task (`background=True`)
- Streams progress via thinking summaries
- Results integrated into case context for domain agents
**Dependencies:** REQ-AGENT-007i

### REQ-RESEARCH-005: Discovery Agent
**Priority:** HIGH
**Description:** Discovery Agent synthesizes external research into actionable intelligence.
**Acceptance Criteria:**
- Consumes Research Agent output (source map)
- Prioritizes sources by relevance and accessibility
- Processes ACCESSIBLE sources first
- Generates hypotheses from findings
- Links findings to supporting evidence
- Gemini 3 Pro with `thinking_level="medium"`
**Dependencies:** REQ-RESEARCH-001

### REQ-RESEARCH-006: Discovery-Synthesis Integration
**Priority:** HIGH
**Description:** Discovery Agent findings feed into Synthesis Agent pipeline.
**Acceptance Criteria:**
- Discovery output stored in session state with unique output_key
- Synthesis Agent consumes discovery findings alongside domain findings
- External research incorporated into knowledge graph
**Dependencies:** REQ-RESEARCH-005, REQ-AGENT-008

### REQ-RESEARCH-007: Source Retrieval Flow
**Priority:** MEDIUM
**Description:** Suggest-then-confirm flow for source retrieval.
**Acceptance Criteria:**
- Research Agent suggests sources with relevance scores
- User confirms which sources to retrieve
- Discovery Agent processes only confirmed sources
- User can add/remove sources before retrieval
**Dependencies:** REQ-RESEARCH-001, REQ-VIS-001a

### REQ-RESEARCH-008: Resilient Research Wrapper
**Priority:** HIGH
**Description:** Apply resilient wrapper pattern to Research and Discovery agents.
**Acceptance Criteria:**
- Primary: Gemini 3 Pro for full analysis
- Fallback: Gemini 3 Flash for degraded but functional analysis
- Error logging to state for debugging
- Graceful error message when both fail
**Dependencies:** REQ-AGENT-007h

### REQ-RESEARCH-009: Orchestrator-Triggered Research
**Priority:** HIGH
**Description:** Orchestrator can trigger Research Agent when evidence gaps detected.
**Acceptance Criteria:**
- Orchestrator detects research need when:
  - Triage shows low confidence (<0.5) for key domains
  - Synthesis reports critical evidence gaps
  - Hypothesis stuck at PENDING with no new evidence
- Orchestrator proposes research via SSE event (RESEARCH_SUGGESTED)
- User must confirm before Research Agent invoked (frontend dialog)
- Research results feed back into Discovery → Synthesis pipeline
- User can decline research suggestion
**Dependencies:** REQ-AGENT-002, REQ-RESEARCH-001, REQ-VIS-001a

---

## REQ-HYPO: Hypothesis System

### REQ-HYPO-001: Hypothesis Lifecycle
**Priority:** HIGH
**Description:** Hypotheses follow simplified 3-state lifecycle.
**Acceptance Criteria:**
- Status values: PENDING, SUPPORTED, REFUTED
- Lifecycle: PENDING → SUPPORTED/REFUTED → (optionally marked RESOLVED by user)
- SUPPORTED: Evidence weight favors hypothesis (confidence >0.6)
- REFUTED: Evidence weight contradicts hypothesis (confidence <0.4)
- PENDING: Insufficient evidence to determine (0.4-0.6 confidence)
- Status stored in `case_hypotheses` table
**Dependencies:** REQ-INF-002

### REQ-HYPO-002: Hypothesis Creation
**Priority:** HIGH
**Description:** Agents propose hypotheses, users can modify.
**Acceptance Criteria:**
- Domain agents suggest new hypotheses from findings
- Synthesis Agent generates hypotheses from cross-domain patterns
- Users can accept, reject, modify, or add hypotheses
- Initial hypotheses fully agent-driven (no pre-seeding)
**Dependencies:** REQ-AGENT-003, REQ-AGENT-004, REQ-AGENT-005, REQ-AGENT-006

### REQ-HYPO-003: Hypothesis Evaluation
**Priority:** HIGH
**Description:** Domain agents evaluate findings against all hypotheses.
**Acceptance Criteria:**
- Each finding evaluated against existing hypotheses
- Evidence type assigned: SUPPORTING or CONTRADICTING
- Weight assigned (0.0-1.0) based on evidence strength
- Reasoning provided for evaluation
- Stored in `hypothesis_evidence` table
**Dependencies:** REQ-HYPO-001, REQ-AGENT-003, REQ-AGENT-004, REQ-AGENT-005, REQ-AGENT-006

### REQ-HYPO-004: Confidence Calculation
**Priority:** MEDIUM
**Description:** Simple deterministic confidence with optional user override.
**Acceptance Criteria:**
- Calculation: sum(supporting_weights) / sum(all_weights)
- Result maps to status: >0.6 = SUPPORTED, <0.4 = REFUTED, else PENDING
- User can manually override status with reason
- Override stored in hypothesis record
**Dependencies:** REQ-HYPO-003, REQ-AGENT-008

### REQ-HYPO-005: Hypothesis Evidence Linking
**Priority:** HIGH
**Description:** Evidence linked to hypotheses with weights.
**Acceptance Criteria:**
- Each evidence link has: evidence_type, weight, excerpt, location, reasoning
- Supporting evidence displayed in green
- Contradicting evidence displayed in red
- Evidence links clickable to Source Panel
**Dependencies:** REQ-HYPO-001, REQ-SOURCE-005

### REQ-HYPO-006: SSE Hypothesis Updates
**Priority:** HIGH
**Description:** Real-time updates for hypothesis status changes.
**Acceptance Criteria:**
- SSE event types: HYPOTHESIS_CREATED, HYPOTHESIS_UPDATED, HYPOTHESIS_EVALUATED
- Events include: hypothesis_id, new_status, confidence, change_reason
- Frontend updates hypothesis cards in real-time
**Dependencies:** REQ-INF-004, REQ-HYPO-001

### REQ-HYPO-007: Hypothesis View
**Priority:** HIGH
**Description:** Dedicated Hypothesis View separate from Knowledge Graph.
**Acceptance Criteria:**
- Hypothesis cards in list view
- Shows: claim, status badge, confidence meter, evidence counts
- Click to expand detailed view
- Not integrated into Knowledge Graph visualization
**Dependencies:** REQ-HYPO-001

### REQ-HYPO-008: Hypothesis Fullscreen
**Priority:** MEDIUM
**Description:** Fullscreen capability for Hypothesis View.
**Acceptance Criteria:**
- Maximize button in corner
- Full-window hypothesis display
- All controls remain accessible
- ESC or button to exit
**Dependencies:** REQ-HYPO-007

### REQ-HYPO-009: Hypothesis-Gap Relationship
**Priority:** MEDIUM
**Description:** Hypothesis system complements (not replaces) contradiction/gap detection.
**Acceptance Criteria:**
- Contradictions remain as separate feature
- Evidence gaps remain as separate feature
- Hypothesis status can trigger gap/contradiction creation
- All three features linked but independent
**Dependencies:** REQ-HYPO-001, REQ-WOW-002, REQ-WOW-003

---

## REQ-GEO: Geospatial Intelligence

### REQ-GEO-001: Geospatial Agent
**Priority:** HIGH
**Description:** Dedicated Geospatial Agent for location intelligence.
**Acceptance Criteria:**
- Extracts and enriches location entities from case findings
- Disambiguates ambiguous place names
- Geocodes locations to coordinates
- Identifies movement patterns and spatial relationships
- Flags locations needing satellite imagery analysis
- Gemini 3 Pro with `thinking_level="medium"`
**Dependencies:** REQ-AGENT-007

### REQ-GEO-002: Geospatial Agent Invocation
**Priority:** HIGH
**Description:** Geospatial Agent operates as post-synthesis utility.
**Acceptance Criteria:**
- Autonomous invocation when location data exists in synthesis results
- On-demand invocation via Chat interface
- Triggered by Orchestrator after Synthesis completes
**Dependencies:** REQ-GEO-001, REQ-AGENT-002, REQ-AGENT-008

### REQ-GEO-003: Dual Location Extraction
**Priority:** MEDIUM
**Description:** Both Domain Agents and Geospatial Agent extract locations.
**Acceptance Criteria:**
- Domain Agents: baseline location extraction during analysis
- Geospatial Agent: deeper location analysis post-synthesis
- Locations merged and deduplicated
- Geospatial Agent enriches with coordinates and context
**Dependencies:** REQ-GEO-001

### REQ-GEO-004: Location Verification Coordination
**Priority:** MEDIUM
**Description:** Evidence Agent coordinates location verification.
**Acceptance Criteria:**
- Evidence Agent identifies location claims needing verification
- Evidence Agent invokes Geospatial Agent for verification
- Verification results feed back to Evidence Agent assessment
**Dependencies:** REQ-AGENT-006, REQ-GEO-001

### REQ-GEO-005: Google Earth Engine Integration
**Priority:** HIGH
**Description:** Integration with Google Earth Engine for satellite imagery.
**Acceptance Criteria:**
- GCP project with Earth Engine API enabled
- Historical imagery retrieval for verification
- Change detection between two dates
- Thumbnail generation with metadata
- Note: Approval process may take days/weeks
**Dependencies:** External API setup

### REQ-GEO-006: Map Display API
**Priority:** HIGH
**Description:** Map display using mapping library.
**Acceptance Criteria:**
- Interactive map component (Mapbox tentative, evaluate alternatives)
- Location markers styled by type
- Route visualization for movement patterns
- Heatmaps for activity concentration
- Click interactions for location details
**Dependencies:** REQ-GEO-001

### REQ-GEO-007: Movement Pattern Detection
**Priority:** HIGH
**Description:** Core capability to detect movement patterns.
**Acceptance Criteria:**
- Connects locations showing movement over time
- Temporal associations on each location
- Route visualization (dashed for inferred, solid for confirmed)
- Anomaly detection for unusual patterns
**Dependencies:** REQ-GEO-001, REQ-GEO-006

### REQ-GEO-008: Change Detection Comparison
**Priority:** MEDIUM
**Description:** Side-by-side satellite imagery comparison.
**Acceptance Criteria:**
- Before/after imagery display
- Change indicators highlighted
- Metadata for each image (date, cloud cover, satellite)
- Significant changes flagged
**Dependencies:** REQ-GEO-005

### REQ-GEO-009: Map View Tab
**Priority:** HIGH
**Description:** Map View as separate tab with fullscreen.
**Acceptance Criteria:**
- Map View as dedicated tab alongside Knowledge Graph
- Not integrated into Knowledge Graph visualization
- Fullscreen capability with maximize button
- All controls remain accessible in fullscreen
**Dependencies:** REQ-GEO-006

### REQ-GEO-010: Optional Temporal Sync
**Priority:** LOW
**Description:** Optional synchronization with other temporal views.
**Acceptance Criteria:**
- Map filter syncs with Timeline view when enabled
- Sync is opt-in, not default
- Date range slider available
- Quick presets: All time, Last year, Case period
**Dependencies:** REQ-GEO-009, REQ-VIS-004

### REQ-GEO-011: Resilient Geospatial Wrapper
**Priority:** HIGH
**Description:** Apply resilient wrapper pattern to Geospatial Agent.
**Acceptance Criteria:**
- Primary: Gemini 3 Pro for full analysis
- Fallback: Gemini 3 Flash for degraded but functional analysis
- Error logging to state for debugging
**Dependencies:** REQ-AGENT-007h

---

## REQ-TASK: Investigation Task System

### REQ-TASK-001: Multi-Agent Task Generation
**Priority:** HIGH
**Description:** Multiple agents generate investigation tasks.
**Acceptance Criteria:**
- Synthesis Agent: tasks from contradictions, gaps
- Discovery Agent: tasks from external research needs
- Hypothesis system: tasks from pending/insufficient hypotheses
- Tasks stored in `investigation_tasks` table
**Dependencies:** REQ-INF-002

### REQ-TASK-002: Task Types
**Priority:** HIGH
**Description:** Standardized task type categorization.
**Acceptance Criteria:**
- `resolve_contradiction` — Two pieces of evidence conflict
- `obtain_evidence` — Missing evidence identified
- `verify_hypothesis` — Hypothesis needs more evidence
- `follow_up_interview` — Person identified for questioning
- `document_retrieval` — Specific document needed
- `external_research` — Research beyond current evidence
- `cross_reference` — Need to compare multiple sources
- `expert_consultation` — Domain expertise needed
**Dependencies:** REQ-TASK-001

### REQ-TASK-003: Bottom Drawer UI
**Priority:** HIGH
**Description:** Task panel located in bottom drawer.
**Acceptance Criteria:**
- Collapsible bottom drawer
- Pending count badge in header
- Filter/sort controls
- Task grouping by priority, agent, or type
**Dependencies:** REQ-TASK-001

### REQ-TASK-004: Task-Type Completion Rules
**Priority:** MEDIUM
**Description:** Completion rules depend on task type.
**Acceptance Criteria:**
- `resolve_contradiction`: Resolved when one source chosen or manual merge
- `obtain_evidence`: Resolved when file uploaded or marked unobtainable
- `verify_hypothesis`: Resolved when evidence added or hypothesis status updated
- Completion notes required
**Dependencies:** REQ-TASK-002

### REQ-TASK-005: Task Awareness via Shared Context
**Priority:** MEDIUM
**Description:** Agents receive existing task list in context to avoid duplicates.
**Acceptance Criteria:**
- Current task list loaded into agent context at invocation start
- Task list format: `[{type, title, related_entities, status}]` (compact JSON)
- Agents instructed in prompt: "Review existing tasks before proposing new ones"
- Simple string matching on title + related_entities for deduplication
- No complex coordination protocol - just context injection
**Dependencies:** REQ-TASK-001

### REQ-TASK-006: SSE Task Streaming
**Priority:** HIGH
**Description:** Real-time task events via SSE.
**Acceptance Criteria:**
- Event types: TASK_CREATED, TASK_UPDATED, TASK_COMPLETED
- Events include: task_id, title, type, priority, source_agent
- Frontend updates task panel in real-time
**Dependencies:** REQ-INF-004, REQ-TASK-001

### REQ-TASK-007: Task Fullscreen
**Priority:** LOW
**Description:** Fullscreen capability for task panel.
**Acceptance Criteria:**
- Maximize button in corner
- Full-window task display
- All controls remain accessible
- ESC or button to exit
**Dependencies:** REQ-TASK-003

---

## REQ-MEM: Memory Service (Post-MVP)

### REQ-MEM-001: Cross-Case Memory Service
**Priority:** LOW (Post-MVP)
**Description:** Long-term memory across cases for pattern recognition and learning.
**Acceptance Criteria:**
- Integrate `VertexAiMemoryBankService` for persistent memory
- Memory bank stores:
  - Entity patterns (common fraud indicators, legal precedents)
  - Investigation patterns (successful approaches)
  - User preferences and custom rules
- `PreloadMemoryTool` auto-loads relevant memory at agent start
- Search past cases: `memory_service.search_memory(query)`
- Memory isolation per user (no cross-user data leakage)
- Opt-in: User explicitly enables memory storage per case
- Implementation:
  ```python
  memory_service = VertexAiMemoryBankService(
      project="your-project-id",
      location="us-central1",
      agent_engine_id="holmes-memory"
  )

  # After investigation completes
  await memory_service.add_session_to_memory(session)

  # In Chat Agent
  tools=[PreloadMemoryTool()]  # Auto-loads relevant memory
  ```
**Dependencies:** REQ-AGENT-007 (MVP complete first)
**Migration Path:** Enable after moving to Agent Engine post-hackathon

---

## REQ-WOW: WOW Capabilities

### REQ-WOW-001: Cross-Modal Evidence Linking
**Priority:** HIGH
**Description:** Automatically surface temporal correlations across modalities.
**Acceptance Criteria:**
- Links video timestamps to document dates
- Links audio mentions to document entities
- Links image content to textual descriptions
- Displays cross-modal links in KG view
- Confidence scores for each link
**Dependencies:** REQ-AGENT-008, REQ-VIS-003

### REQ-WOW-002: Contradiction Detection
**Priority:** HIGH
**Description:** Find inconsistencies between claims and evidence.
**Acceptance Criteria:**
- Detects factual contradictions (dates, amounts, statements)
- Detects testimony inconsistencies
- Severity classification (minor, significant, critical)
- Source citations for both sides
- Displayed in Contradictions Panel
**Dependencies:** REQ-AGENT-008, REQ-VIS-005

### REQ-WOW-003: Gap Analysis
**Priority:** HIGH
**Description:** Identify missing evidence needed to prove case elements.
**Acceptance Criteria:**
- Identifies unaddressed case elements
- Identifies missing time periods
- Identifies uncorroborated claims
- Suggests what evidence would fill gap
- Priority ranking by case impact
**Dependencies:** REQ-AGENT-008, REQ-VIS-006

### REQ-WOW-004: Narrative Generation
**Priority:** MEDIUM
**Description:** One-click generation of case briefs with citations.
**Acceptance Criteria:**
- Generate executive summary
- Generate detailed narrative
- Generate timeline narrative
- Inline citations throughout
- Export as PDF or DOCX
- Customizable sections
**Dependencies:** REQ-AGENT-008, REQ-SOURCE-005

---

## REQ-ERR: Error Handling Strategy

### REQ-ERR-001: Retry Policy
**Priority:** HIGH
**Description:** Automatic retry for transient failures.
**Acceptance Criteria:**
- Gemini API calls: 3 retries, exponential backoff (1s, 2s, 4s)
- GCS operations: 3 retries, linear backoff (500ms)
- PostgreSQL writes: 3 retries, exponential backoff
- Tool executions: 2 retries, no backoff
- Mark agent as FAILED and continue others on exhausted retries
**Dependencies:** REQ-AGENT-007

### REQ-ERR-002: Error Propagation
**Priority:** HIGH
**Description:** Graceful error handling that preserves partial results.
**Acceptance Criteria:**
- Critical errors (Orchestrator/KG): Mark job FAILED, notify user immediately
- Non-critical errors (Domain worker): Mark specific files as PARTIAL, continue with remaining agents
- Partial results shown with clear warnings
- User can manually retry failed items via UI
**Dependencies:** REQ-ERR-001

### REQ-ERR-003: Error Categories
**Priority:** HIGH
**Description:** Structured error classification for appropriate handling.
**Acceptance Criteria:**
- `TRANSIENT`: Auto-retry with backoff, no user impact if resolved
- `FILE_CORRUPT`: Mark file ERROR, skip processing, user notified
- `AGENT_TIMEOUT`: Retry once with reduced context, then PARTIAL
- `QUOTA_EXCEEDED`: Pause processing, notify user, processing delayed
- `SYSTEM_ERROR`: Log, alert, fail gracefully, user sees error state
**Dependencies:** REQ-ERR-001

### REQ-ERR-004: Error Response Format
**Priority:** MEDIUM
**Description:** Consistent JSON error response structure.
**Acceptance Criteria:**
- All API errors return consistent JSON structure
- Fields: code, message, details (file_id, agent_id, last_error, attempts)
- Fields: recoverable (boolean), suggested_action
- Standard codes: VALIDATION_ERROR, FILE_CORRUPT, PROCESSING_FAILED, AGENT_TIMEOUT, QUOTA_EXCEEDED, CONFLICT_DETECTED, SYSTEM_ERROR
**Dependencies:** REQ-INF-001

### REQ-ERR-005: Graceful Degradation
**Priority:** HIGH
**Description:** System remains usable when components fail.
**Acceptance Criteria:**
- Partial file processing: Show results for successful files, mark failed with retry button
- Model unavailable: Attempt fallback Gemini 3 Pro → Gemini 3 Flash for simpler analysis
- SSE disconnection: Show "Reconnecting..." with auto-retry (exponential backoff)
- Stale data: Display last-known-good state with timestamp, show refresh prompt
- KG build fails: Preserve domain findings, allow access to raw findings without graph
**Dependencies:** REQ-INF-004, REQ-AGENT-007

---

## Traceability Matrix

| Requirement ID | PROJECT.md Reference | Research Source |
|---------------|---------------------|-----------------|
| REQ-INF-* | Infrastructure & Auth | STACK.md, PITFALLS.md |
| REQ-AUTH-* | Infrastructure & Auth | STACK.md (Better Auth) |
| REQ-CASE-* | Case Management | FEATURES.md |
| REQ-AGENT-* | Agentic Processing Pipeline | ARCHITECTURE.md |
| REQ-VIS-* | Agent Flow, Knowledge Graph | FEATURES.md |
| REQ-SOURCE-* | Source Panel | FEATURES.md |
| REQ-CHAT-* | Contextual Chat | ARCHITECTURE.md |
| REQ-CORR-* | Correction & Regeneration | FEATURES.md |
| REQ-WOW-* | WOW Capabilities | FEATURES.md, SUMMARY.md |
| REQ-ERR-* | Error Handling | PRD Section 8, PITFALLS.md |
| REQ-RESEARCH-* | Research & Discovery | INTEGRATION.md |
| REQ-HYPO-* | Hypothesis-Driven Investigation | INTEGRATION.md |
| REQ-GEO-* | Geospatial Intelligence | INTEGRATION.md |
| REQ-TASK-* | Investigation Task System | INTEGRATION.md |

---

## Requirement Statistics

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Infrastructure | 4 | 3 | 1 | 0 | 0 |
| Authentication | 4 | 0 | 4 | 0 | 0 |
| Case Management | 5 | 1 | 3 | 1 | 0 |
| Agents (Core) | 10 | 3 | 6 | 1 | 0 |
| Agents (ADK Config) | 10 | 0 | 6 | 3 | 1 |
| Visualization | 7 | 1 | 4 | 1 | 1 |
| Source Panel | 5 | 1 | 3 | 1 | 0 |
| Chat | 5 | 1 | 3 | 1 | 0 |
| Corrections | 4 | 0 | 0 | 3 | 1 |
| WOW | 4 | 0 | 3 | 1 | 0 |
| Error Handling | 5 | 0 | 4 | 1 | 0 |
| Research & Discovery | 9 | 0 | 6 | 2 | 1 |
| Hypothesis System | 9 | 0 | 5 | 4 | 0 |
| Geospatial Intelligence | 11 | 0 | 6 | 4 | 1 |
| Investigation Tasks | 7 | 0 | 4 | 2 | 1 |
| Memory (Post-MVP) | 1 | 0 | 0 | 0 | 1 |
| **TOTAL** | **100** | **10** | **58** | **24** | **6** |

---

## ADK-Specific Requirements Summary

| Requirement | Priority | Purpose |
|-------------|----------|---------|
| REQ-AGENT-007 | CRITICAL | Core ADK infrastructure: stage-isolated sessions, tiered file handling, pipeline orchestration |
| REQ-AGENT-007a | HIGH | Document and mitigate ADK limitations |
| REQ-AGENT-007b | HIGH | Thinking mode: BuiltInPlanner with ThinkingConfig, ALL agents HIGH |
| REQ-AGENT-007c | HIGH | Media resolution per agent: medium (Triage), high (Domain/Evidence) |
| REQ-AGENT-007d | HIGH | Video/audio metadata for precise timestamps |
| REQ-AGENT-007e | HIGH | ADK artifact service with versioning |
| REQ-AGENT-007f | MEDIUM | Context caching for File API URIs shared across agents |
| REQ-AGENT-007g | MEDIUM | Context compaction for Chat Agent ONLY (not pipeline) |
| REQ-AGENT-007h | HIGH | Resilient agent wrapper for graceful degradation |
| REQ-AGENT-007i | LOW | Deep Research agent for background research |
| REQ-VIS-001a | HIGH | Frontend HITL confirmation (ADK limitation workaround) |
| REQ-MEM-001 | LOW | Memory service (post-MVP) |

## New Agent Configuration Summary

| Agent | Thinking Level | Model | Notes |
|-------|----------------|-------|-------|
| Research Agent | medium | Gemini 3 Pro | Source discovery via web search |
| Discovery Agent | medium | Gemini 3 Pro | Synthesizes external research |
| Geospatial Agent | medium | Gemini 3 Pro | Location intelligence, post-synthesis |
| All new agents | — | Pro + Flash fallback | Resilient wrapper pattern applied |

---

## Implementation Status

> **Note:** This section tracks implementation progress. Updated 2026-02-02 after Yatharth's frontend work.
> See `DEVELOPMENT_DOCS/YATHARTH_WORK_SUMMARY.md` for detailed file paths and TODOs.

### Status Legend
- ✅ **COMPLETE** — Fully implemented
- 🟡 **FRONTEND_COMPLETE** — UI done, backend integration pending
- 🟠 **PARTIAL** — Some sub-criteria met
- ⏳ **NOT_STARTED** — No implementation yet

---

### REQ-VIS: Visualization & UI

#### REQ-VIS-001: Agent Flow — 🟡 FRONTEND_COMPLETE

| Sub-Criterion | Status | Notes |
|---------------|--------|-------|
| React Flow canvas showing agent nodes | ✅ | D3-based canvas in `CommandCenter/AgentFlowCanvas.tsx` |
| Animated edges during data flow | ✅ | Dashed line animations when data flows |
| Color-coded by agent type | ✅ | 6 agent types with distinct colors |
| Click node to expand details panel | ✅ | `AgentDetailsPanel.tsx` with collapsible sections |
| Shows model, input, tools, output, duration | 🟡 | UI ready, needs real backend data |
| Shows thinking traces | 🟡 | UI ready, needs ADK `include_thoughts=True` data |
| Updates in real-time via SSE | 🟡 | `useCommandCenterSSE.ts` hook ready, needs backend SSE endpoint |
| ADK callback-to-SSE mapping | ⏳ | Backend work required |

**Backend APIs Needed:**
- `SSE GET /api/cases/:caseId/command-center/stream` — Agent lifecycle events

**Files:** `frontend/src/components/CommandCenter/`, `frontend/src/hooks/useCommandCenterSSE.ts`

---

#### REQ-VIS-001a: Human-in-the-Loop Confirmation — ⏳ NOT_STARTED

No confirmation dialogs implemented yet.

---

#### REQ-VIS-002: Agent Detail View — 🟡 FRONTEND_COMPLETE

| Sub-Criterion | Status | Notes |
|---------------|--------|-------|
| Full thinking trace | 🟡 | UI section exists, needs backend data |
| Complete input context | 🟡 | UI section exists, needs backend data |
| Tool calls with inputs/outputs | 🟡 | "Tools Called" section exists |
| Complete output findings | 🟡 | "Output Findings" section exists |
| Token usage statistics | ⏳ | Not implemented |
| Execution timeline | ⏳ | Not implemented |

**Files:** `frontend/src/components/CommandCenter/AgentDetailsPanel.tsx`

---

#### REQ-VIS-003: Knowledge Graph View — 🟡 FRONTEND_COMPLETE

| Sub-Criterion | Status | Notes |
|---------------|--------|-------|
| Force-directed graph | ✅ | D3.js chosen and implemented |
| Nodes sized by connection count | ✅ | Implemented |
| Edges labeled with relationship type | ✅ | Implemented |
| Five toggleable layers | 🟠 | Layer concept exists but not 5-layer system yet |
| Zoom and pan controls | ✅ | Full zoom/pan/reset controls |
| Node search and highlight | ✅ | Implemented |
| Click node for details | ✅ | Info panel shows on click |
| Fullscreen capability | ⏳ | Not implemented |
| Basic analytics | ⏳ | Not implemented |

**Backend APIs Needed:**
- `GET /api/cases/:caseId/graph` — Fetch graph data
- `POST /api/cases/:caseId/entities` — Create entity
- `POST /api/cases/:caseId/relationships` — Create relationship
- `PATCH /api/cases/:caseId/entities/:entityId` — Update entity
- `DELETE /api/cases/:caseId/entities/:entityId` — Delete entity

**Files:** `frontend/src/components/app/knowledge-graph.tsx`, `frontend/src/hooks/use-case-graph.ts`, `frontend/src/types/knowledge-graph.ts`

---

#### REQ-VIS-004: Timeline View — 🟡 FRONTEND_COMPLETE

| Sub-Criterion | Status | Notes |
|---------------|--------|-------|
| Horizontal timeline with zoom | ✅ | Day/week/month/year zoom levels |
| Events plotted by date/time | ✅ | Grouped by zoom level |
| Events linked to source evidence | 🟡 | UI ready, needs backend evidence links |
| Filter by entity, event type | ✅ | Layer filtering (evidence/legal/strategy) |
| Gaps highlighted visually | 🟡 | Needs backend gap detection |
| Click event for details | ✅ | Opens detail modal |

**Backend APIs Needed:**
- `GET /api/cases/:caseId/timeline/events` — Fetch events with filters
- `POST /api/cases/:caseId/timeline/events` — Create event
- `PATCH /api/cases/:caseId/timeline/events/:eventId` — Update event
- `DELETE /api/cases/:caseId/timeline/events/:eventId` — Delete event
- `SSE GET /api/cases/:caseId/timeline/stream` — Real-time updates

**Files:** `frontend/src/components/Timeline/`, `frontend/src/hooks/useTimelineData.ts`, `frontend/src/hooks/useTimelineFilters.ts`, `frontend/src/hooks/useTimelineSSE.ts`

---

#### REQ-VIS-005: Contradictions Panel — 🟠 PARTIAL

| Sub-Criterion | Status | Notes |
|---------------|--------|-------|
| List of contradiction pairs | 🟠 | Conflict UI in Evidence Library, not dedicated panel |
| Each shows claim A, claim B, sources, severity | 🟠 | Basic conflict alerts exist |
| Click to navigate to sources | ⏳ | Not implemented |
| Filter by severity, entity | ⏳ | Not implemented |
| Resolution status tracking | ⏳ | Not implemented |

**Files:** `frontend/src/components/library/CaseLibrary.tsx` (conflict section)

---

#### REQ-VIS-006: Evidence Gaps Panel — ⏳ NOT_STARTED

No dedicated gaps panel implemented.

---

### REQ-CASE: Case Management

#### REQ-CASE-004: Evidence Upload — ✅ COMPLETE

| Sub-Criterion | Status | Notes |
|---------------|--------|-------|
| Drag-and-drop upload UI | ✅ | Implemented in CaseLibrary.tsx |
| Multiple file selection | ✅ | Supported via handleDrop |
| Progress indicator per file | ✅ | Upload progress tracking via useFileUpload hook |
| Automatic file type detection | ✅ | MIME type validation in backend |
| Supported file types | ✅ | PDF, DOCX, MP4, MP3, WAV, JPG, PNG |
| Max 500MB per file | ✅ | MAX_FILE_SIZE enforced in file_service.py |
| Files stored in GCS with metadata | ✅ | GCS chunked upload + PostgreSQL metadata |

**Backend APIs:**
- `POST /api/cases/:caseId/files` — Upload file (multipart, chunked GCS streaming)

**Files:** `backend/app/api/files.py`, `backend/app/services/file_service.py`, `frontend/src/hooks/useFileUpload.ts`

---

#### REQ-CASE-005: Case Library View — ✅ COMPLETE

| Sub-Criterion | Status | Notes |
|---------------|--------|-------|
| Grid or list view toggle | ✅ | List view implemented |
| File thumbnails | ✅ | Icons implemented (thumbnails deferred) |
| File metadata display | ✅ | Name, type, size, status shown |
| Filter by type, status | ✅ | Category filters (all/evidence/legal/strategy/reference) |
| Select files for batch operations | ✅ | UI connected to real APIs |
| Delete individual files | ✅ | DELETE endpoint with GCS cleanup |

**Backend APIs:**
- `GET /api/cases/:caseId/files` — List files with pagination/filters
- `POST /api/cases/:caseId/files` — Upload file (multipart)
- `DELETE /api/cases/:caseId/files/:fileId` — Delete file
- `GET /api/cases/:caseId/files/:fileId/download` — Download via signed URL
- `SSE /sse/cases/:caseId/files` — Real-time file status updates

**Files:** `frontend/src/components/library/CaseLibrary.tsx`, `frontend/src/lib/api/files.ts`

---

### REQ-CHAT: Contextual Chat

#### REQ-CHAT-001: Chat Interface — 🟡 FRONTEND_COMPLETE

| Sub-Criterion | Status | Notes |
|---------------|--------|-------|
| Message input with send button | ✅ | Full input with keyboard support |
| Message history display | ✅ | Scrollable history |
| Streaming response with typing indicator | ✅ | Animated typing dots |
| Markdown rendering | ✅ | Implemented |
| Code block formatting | ✅ | Implemented |
| Mobile-responsive | ✅ | Responsive design |

**Backend APIs Needed:**
- `POST /api/chat` — Send message, receive response

**Files:** `frontend/src/components/app/chatbot.tsx`, `frontend/src/hooks/useChatbot.ts`, `frontend/src/types/chatbot.ts`

---

### REQ-SOURCE: Source Panel

#### REQ-SOURCE-005: Citation Navigation — ⏳ NOT_STARTED

Evidence source panel exists (`evidence-source-panel.tsx`) but citation navigation not implemented.

**Files:** `frontend/src/components/app/evidence-source-panel.tsx`

---

### Summary: Frontend Implementation Coverage

| Category | Requirements | Complete | Frontend Done | Partial | Not Started |
|----------|-------------|----------|---------------|---------|-------------|
| Visualization (VIS) | 6 | 0 | 4 | 1 | 1 |
| Case Management (CASE) | 5 | 5 | 0 | 0 | 0 |
| Chat (CHAT) | 5 | 0 | 1 | 0 | 4 |
| Source Panel (SOURCE) | 5 | 0 | 0 | 0 | 5 |

*Phase 2 requirements (REQ-CASE-001, 002, 003) completed previously. Phase 3 requirements (REQ-CASE-004, 005) completed 2026-02-02.

---

*Generated: 2026-01-18*
*Updated: 2026-02-02*
*Status: Complete - Integration features added (REQ-RESEARCH, REQ-HYPO, REQ-GEO, REQ-TASK)*
*Frontend Status: Partial implementation by Yatharth (see DEVELOPMENT_DOCS/YATHARTH_WORK_SUMMARY.md)*
