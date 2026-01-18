# Legal Intelligence Platform - Project Idea (LLM-Optimized)

## Context

A legal/investigation intelligence platform for the Gemini 3 Global Hackathon. Leverages Google ADK for agentic AI coordination, GCP/Cloud Run for deployment, and Gemini 3's multimodal capabilities.

**Target Users**: Legal professionals, investigators, law firms
**Authentication**: Simple Email/password or Google OAuth sign-in. Each user manages their own cases.

---

## Core Problems

1. **Evidence Overload**: Professionals spend 60%+ time on manual document/media review
2. **AI Black Box**: Current AI tools lack decision transparency and traceability
3. **Fragmented Workflows**: Investigation, legal research, and strategy exist in silos
4. **Information Relationships**: Hard to visualize connections across large evidence sets
5. **Cross-Modal Blindness**: Humans miss connections between video, audio, and documents

---

## Solution

A unified case workspace where uploaded files (evidence, legal docs, strategy playbooks) are processed by specialized domain AI agents. The system provides:
- Transparent agent decision flows
- Entity/relationship knowledge graphs
- Source-linked citations with highlights
- Contextual chat interface
- Proactive insight generation (contradictions, gaps, cross-modal links)

**Key Principle**: File classification tags + domain relevance scores determine agent routing—no manual mode selection required.

---

## Core Features

### -1. Simple aesthetic Landing page
- Showcases features and allows users to login/signup.

---
### 0. User Authentication

Simple authentication for user management:
- **Sign Up**: Email + password registration OR Google OAuth
- **Login**: Email + password OR "Sign in with Google"
- **Session**: JWT-based session management
- **Scope**: Each user sees only their own cases

*Google OAuth simplifies onboarding and aligns with GCP stack.*

---
### 1. Intelligent File Processing (Two-Phase)

**Phase 1 - Triage** (parallel, fast):
- File validation, type and complexity detection
- Basic file content extraction and analysis (video content summary, image description, document entity extraction, legal doc identification, analysing if a specific doc is evidence or legal grounding or strategy/playbook)
- **Domain relevance scoring**: Each file scored against multiple domains dynamically (e.g., deposition video → Financial: 0.7, Legal: 0.8, Strategy: 0.3)
- Basic entity extraction (names, dates, amounts)
- Complexity estimation based on file content, tokens, file size, file type
- Metadata enrichment for Phase 2—helping orchestrator inject better context/system prompts into "domain" based deep research subagents
- Auto-classification based on initial metadata and content analysis: `Evidence`, `Legal/Statute`, `Legal/Precedent`, `Strategy/Playbook`, `Strategy/Memo`, `Reference`

**Phase 2 - Deep Analysis** (domain agents):
- Orchestrator spawns domain agents based on Phase 1 metadata and domain relevance scores
- Domain agents receive ALL relevant files (any format) **for their domain**
- Native multimodal analysis—Gemini 3 processes PDF + Video + Audio simultaneously
- Cross-modal inference happens naturally within domain context (not post-hoc stitching)
- Each agent has access to all tools (some python library based tool to highlight specific coordinates in an image to highlight something without reducing its quality, or some tool to extract a frame from a video as an image and then to highlight something in the image with the previous tool, statistical analysis, etc.)
- Outputs: entities, relationships, key moments, timeline events, implications, cross-references, highlight information

**Complexity-Based Batching**:

| File Complexity Score | Handling |
|-----------------------|----------|
| Low (< 0.5) | Batch similar files together (e.g., 8 receipt images → 1 agent) |
| High (≥ 0.5) | Dedicated agent per file |

**Complexity Heuristics**:

| File Type | Low Complexity | High Complexity |
|-----------|----------------|-----------------|
| PDF | < 20 pages, text-heavy | > 50 pages, tables, forms |
| Video | < 60 sec, static scene | > 10 min, dialogue, multiple people |
| Audio | < 2 min, single speaker | > 10 min, multiple speakers |
| Image | Simple photo | Document scan, diagram, multi-element |

---

### 2. Domain-Based Agent Architecture

**Why Domain-Based (not File-Type Based)**:
- Gemini 3 is natively multimodal—forcing single-modality processing wastes its capability
- A deposition video contains financial testimony AND legal admissions—domain agents understand full context
- Cross-modal inference happens naturally, not through post-hoc stitching
- Aligns with how legal professionals actually think (by domain, not by file type)

**Architecture Flow (Sequential)**:

1. **USER UPLOADS** → Files enter the system
2. **TRIAGE AGENT** → Quick multimodal analysis of each file; assigns domain relevance scores (file can belong to multiple domains); estimates complexity per file; extracts basic metadata for orchestrator
3. **ORCHESTRATOR** → Groups files by domain based on relevance scores; calculates total complexity per domain; decides spawning strategy (Domain complexity < 2.0 → Single domain agent; Domain complexity ≥ 2.0 → Multiple sub-agents + Domain Synthesis); routes user queries to appropriate domain agents; coordinates cross-domain questions
4. **DOMAIN AGENTS (Parallel)** → Three parallel branches: FINANCIAL DOMAIN AGENT, LEGAL DOMAIN AGENT, STRATEGY DOMAIN AGENT. Each receives all relevant files (any format), has access to all tools, and outputs structured findings, entity tuples, and source citations
5. **FINDINGS STORE** → All structured findings with source attribution collected here
6. **KNOWLEDGE GRAPH AGENT** → Performs entity resolution across all domains, relationship merging, conflict detection, cross-domain link discovery
7. **KNOWLEDGE GRAPH STORE** → Single source of truth, feeds Frontend

**Agent Roles**:

**Orchestrator** (Gemini 3 Pro):
- Routes files to domain agents based on classification and triage relevance scores
- Spawns agents based on domain complexity:
  - Domain complexity < 2.0 → Single domain agent handles all files
  - Domain complexity ≥ 2.0 → Multiple sub-agents + Domain Synthesis Agent
- Routes user queries to appropriate domain agents
- Coordinates cross-domain questions
- Acts like Chief of Staff—delegates to domain managers

**Domain Agents**:
- Receive all files relevant to their domain (any format)
- Native multimodal analysis within domain context
- Have access to all tools (highlighting, extraction, analysis)
- Submit structured findings (tuples, not graphs) to Knowledge Graph Agent
- Can be queried directly for domain-specific questions
- Can receive multiple files of various multimodalities as input to process

**Domain Synthesis Agents** (conditional):
- Spawned only when domain complexity ≥ 2.0
- Coordinate multiple sub-agents within same domain
- Act as domain expert for complex cases
- Can delegate queries back to sub-agents

**Knowledge Graph Agent**:
- Entity Resolution: Clusters mentions → canonical entities ("John Doe", "J. Doe" → `entity_001`)
- Relationship Merging: Combines edges from multiple sources, aggregates confidence
- Conflict Detection: Same relationship with different values → flag for user review
- Incremental Updates: New findings merge into existing graph
- Graph Output: Produces frontend-ready JSON with source attribution

**Query Routing Hierarchy**:
1. Orchestrator classifies question domain
2. Routes to appropriate domain agent(s)
3. For cross-domain questions, orchestrator coordinates and synthesizes

---

### 3. WOW Features (Hackathon Differentiators)

These features showcase Gemini 3's advanced capabilities beyond basic document processing:

#### 3A. Cross-Modal Evidence Linking (Automatic)

AI automatically connects dots across different file types. Example: System detects that a receipt timestamp (03/15/2023, 2:41 AM) from `receipt_scan_001.jpg` matches video footage showing John Doe at warehouse at 02:34 AM on the same date. The implication is surfaced: "Subject made purchase within 7 minutes of warehouse entry" with links to view the evidence chain.

#### 3B. Contradiction & Alibi Detection (Proactive)

AI proactively identifies inconsistencies without being asked. Example: System detects a CLAIM from `deposition_audio.mp3` at timestamp 14:32 where subject states "I was in New York on March 15th for a conference". Evidence AGAINST this claim is automatically compiled: warehouse_footage.mp4 showing subject at LA warehouse at 2:34 AM, receipt_scan_001.jpg showing purchase in LA at 2:41 AM, bank_statements.pdf showing ATM withdrawal in LA at 3:15 AM. User can click to generate an impeachment brief.

#### 3C. Gap Analysis (Proactive)

AI identifies what evidence is missing to prove the case. Example for proving "Money laundering through Shell Corp LLC": STRONG evidence for source of funds (bank statements), STRONG evidence for shell company ownership (corporate filings), WEAK evidence for knowledge/intent (no direct communication), MISSING evidence for destination of funds after Cayman transfer. Recommendations provided: Subpoena Cayman Islands account records, obtain email/text communications for intent, depose Shell Corp registered agent. User can click to generate discovery request draft.

#### 3D. Narrative Generation (One-Click)

Generate prosecution or defense briefs instantly. User selects perspective (Prosecution/Defense), and system generates a complete narrative with proper legal formatting and embedded citations: "On or about March 15, 2023, Defendant John Doe orchestrated a scheme to defraud [Client] through a series of wire transfers totaling $2.34 million to offshore accounts. The evidence demonstrates that at 2:34 AM on March 15, Defendant entered a warehouse facility [Exhibit A: Video, timestamp 02:34:17] carrying document boxes. Within seven minutes, a receipt shows a $15,000 equipment purchase [Exhibit B: Receipt] at a nearby location..." Options to continue, export to DOCX, or view all citations.

#### 3E. Video Analysis Mode

Real-time insights as video/audio is analyzed. Video player with embedded analysis shows timestamped observations: "02:34 - Male subject entering through side door. Carrying 2 cardboard boxes. MATCH: Physical description matches John Doe from corporate filing photo." "02:35 - Subject proceeds to storage area B. No other individuals visible." "02:38 - Second vehicle arrives. License plate: ABC-1234. SEARCHING: Running plate against case entities..." User can pause analysis, jump to key moments, or go full screen.

---

### 4. Agent Decision Graph (Trace Theater)

Real-time visualization using SSE and React Flow showing:
- Data flow between agents (nodes = agents, edges = data passing)
- Per-node details on click: model used, input prompt/context, case files consumed, tools called, output findings
- Full decision transparency and traceability

**This is the hackathon differentiator**—directly addresses AI black box problem.

---

### 5. Knowledge Graph with Layers

Force-directed graph of extracted entities and relationships with three layers:
- **Evidence Layer** (red): People, companies, transactions, locations
- **Legal Layer** (blue): Statutes, case law, violations
- **Strategy Layer** (green): Tactics, arguments, counter-arguments

Features:
- Toggle layers independently or combined
- Cross-layer connections visible (evidence → legal violation → strategy)
- Timeline view separately also provided

---

### 6. Source Panel (Multi-Modal Highlights)

| Media Type | Behavior |
|------------|----------|
| PDF/Doc | Side-by-side view, highlighted excerpts, page navigation |
| Video | Embedded player, auto-seek to timestamp, key frame extraction |
| Audio | Waveform + transcript with highlighted segments |
| Image | Zoom view with bounding boxes drawn by analysis agent |

Clicking any chat citation or graph node opens relevant source with auto-highlighting.

---

### 7. Contextual Chat

Single chat interface, contextually aware based on case context:
- Orchestrator routes questions to appropriate domain agents
- Can pull from multiple domains when needed
- Citations link directly to source panel

---

### 8. Correction & Regeneration Flow

**Correction propagation**:
- Knowledge Graph = single source of truth
- Agent outputs immutable (stored with timestamps)
- Corrections stored as overlays on KG nodes
- Downstream analyses marked as STALE, user prompted to regenerate

**Correction Flow**:
1. User flags error (e.g., "Amount is $3.2M, not $2.34M")
2. Verification Agent checks source file, confirms correct value is $3.2M
3. Update Findings Store: Mark finding f_001 as "superseded", create finding f_001_corrected with correct value and correction metadata
4. Trigger KG Agent rebuild (incremental): Updates edge with new value, propagates to affected nodes
5. Mark downstream outputs as STALE: Find all chat responses citing f_001, find all narrative summaries using it, notify user "3 analyses may need regeneration"

**User-initiated correction**:
1. User flags error in visualization
2. Verification agent checks original source
3. If confirmed: update KG, identify affected downstream outputs, notify user

**Data Flow (Findings → KG)**:

Domain Agents (Financial, Legal, Strategy) output structured findings to CASE FINDINGS STORE (PostgreSQL JSONB). Each finding document contains: finding_id, agent_id, source_file, source_location (page, bbox), timestamp, status (active/superseded), entities array (mention, type, confidence), relationships array (subject, predicate, object, additional context).

KNOWLEDGE GRAPH AGENT reads all findings where status = "active", performs Entity Resolution (clusters mentions to canonical entities, e.g., "John Doe", "J. Doe", "Doe, John", "Mr. Doe" → resolved entity e_001 with canonical name and aliases), builds graph structure (nodes = resolved entities, edges = relationships with source attribution, properties = aggregated facts and confidence scores), performs Conflict Detection (same relationship with different values → flag, temporal contradictions → flag).

Output goes to KNOWLEDGE GRAPH STORE (Postgres) containing nodes array (id, label, type, sources, layer) and edges array (from, to, label, confidence, sources), which feeds the Frontend.

---

### 9. New File Adaptation

When files added to existing case:
- Run through two-phase processing
- Entity resolution: match/merge with existing entities
- **Conflict detection**: contradictions surfaced to user (never auto-resolved)
- Options: Trust New | Keep Existing | Merge Manually | View Side-by-Side

Edge cases handled: duplicates, superseding versions, irrelevant files, corrupted files, temporal mismatches, mid-processing uploads.

---

### 10. Judge Simulation (Post-MVP)

Based on specific judge's verdict history:
- Predict likely rulings on motions
- Identify judge's tendencies and patterns
- Inform strategy recommendations

Fits within Strategy layer of knowledge graph.

---

## User Journey & Screens

### Screen 1: Case List (Entry Point)

**Layout**: Header with app title "LEGAL INTELLIGENCE" and [+ New Case] button. Main content shows list of case cards.

**Case Card Content**: Case name with folder icon, creation date, file count, last updated timestamp, tag summary (Evidence count, Legal count, Strategy count), action buttons [View Files] and [Delete].

**Empty State**: Dashed border card with message "+ Create your first case to get started"

**Interactions**:
- Click case card → Opens Command Center (Screen 4)
- Click [View Files] → Opens Upload Hub modal (Screen 3)
- Click [+ New Case] → Opens Case Creation (Screen 2)

---

### Screen 2: Case Creation

**Two-Step Wizard with Progress Indicator**:

**Step 1 - Create Case**:
- Form with "Case Name" required text field
- "Initial Context / Description" textarea for case background (helps AI understand context)
- Helper text: "This context helps the AI understand your case better."
- Buttons: [Cancel] [Next →]

**Step 2 - Upload Files**:
- Drag & drop zone with icons for PDF, Video, Audio, Image
- Text: "Drag & drop files here or click to browse"
- Supported formats: PDF, DOCX, MP4, MP3, JPG, PNG, and more
- Queued Files list showing: file icon, filename, size, remove [×] button
- Helper text: "You can add more files later from the Case Library."
- Buttons: [← Back] [Finish & Process]

**Interaction**: [Finish & Process] → Triggers processing → Redirects to Command Center with Agent Flow view

---

### Screen 3: Upload Hub / Case Library

**Accessible via**: [View Files] button or from Command Center header

**Layout**:
- Header: "CASE LIBRARY" with case name and [× Close] button
- Compact drag & drop zone at top
- Filter tabs: [All] [Evidence] [Legal] [Strategy] [Reference]
- File table with columns: FILE NAME, TYPE (dropdown), STATUS, ACTION

**File Row Content**: File icon + name, type dropdown selector, status indicator (✓ Ready / progress bar with percentage), action buttons [👁 View] [🗑 Delete]

**Attention Required Section**: Yellow highlighted section for files with conflicts. Shows conflict description (e.g., "New file says: Transfer date March 18 | Existing: March 15") with resolution buttons: [View Side-by-Side] [Trust New] [Keep Existing] [Flag for Review]

**Quick Analysis Modal** (Click [👁] on any file):
- Header: "QUICK ANALYSIS: {filename}" with [× Close]
- Classification with confidence percentage and [Change] dropdown
- Domain Relevance scores (Financial: 0.95, Legal: 0.40, Strategy: 0.20)
- Extracted Entities list (names, organizations, account numbers)
- Key Dates list with descriptions
- Key Amounts list with context
- Complexity Score with explanation
- Routing destination (e.g., "→ Financial Domain Agent (dedicated)")

---

### Screen 4: Command Center

**Header**: Case name, [View Files] button, [← Cases] back button

**Layout**: Two-column layout with main visualization area (left, ~70%) and chat panel (right, ~30%)

#### 4A. During Processing (Agent Flow Primary)

**View Controls Bar**: Toggle buttons for [Agent Flow ●] [Knowledge Graph ○] [Timeline ○] [Source Panel ○]. Note: ○ = disabled during processing

**Agent Flow Visualization (React Flow)**:
- Root node: ORCHESTRATOR (Gemini 3 Pro)
- Child nodes branching from orchestrator: Financial Domain (progress indicator), Legal Domain (✓ complete), Strategy Domain (✓ complete), KG Agent (progress indicator)
- Visual connections showing data flow between nodes
- Click any node for details

**Progress Bar**: Bottom of visualization area showing "Processing: [progress bar] 67% ETA: 2 min"

**Chat Panel (Right)**: Shows "Processing your files... 4 of 6 files complete" and "Chat available after processing"

**Agent Node Detail Modal** (on node click):
- Header: "AGENT: {agent name}" with [× Close]
- Status indicator (✓ Complete) and Model info (Gemini 3 Pro)
- INPUT CONTEXT section: Source agent, files received, Phase 1 metadata, task description
- TOOLS CALLED section: List of tool invocations with results (e.g., "pdf_table_extractor() → 847 rows extracted")
- OUTPUT FINDINGS section: JSON structure showing entities_found count, transactions_analyzed count, cross_modal_links array, anomalies array, confidence score
- SENT TO: Destination (e.g., "Findings Store → Knowledge Graph Agent")

#### 4B. After Processing - Knowledge Graph View

**View Controls**: [Agent Flow] [Knowledge Graph ●] [Timeline] [Source Panel]
**Layer Toggles**: [Evidence ●] [Legal ●] [Strategy ○]

**Knowledge Graph Visualization**: Force-directed graph showing:
- Nodes with labels and layer-color coding (🔴 Evidence, 🔵 Legal, 🟢 Strategy)
- Edge labels showing relationships (e.g., "owns", "received $2.3M", "violates")
- Node example: "John Doe" (Person, Evidence, red) connected to "Shell Corp LLC" (red) via "owns", connected to "Cayman Account" (red) via "received $2.3M", "Shell Corp LLC" connected to "18 Del. C. § 3502" (Statute, Legal, blue) via "violates"
- Legend at bottom: 🔴 Evidence 🔵 Legal 🟢 Strategy
- Action buttons: [⚠️ Issue?] [🔄 Regenerate] [✏️ Edit]

**Chat Panel**: Active with conversation. Citations in responses shown as clickable [1], [2], [3] links. Input field at bottom.

#### 4C. Source Panel View - PDF

**View Controls**: [Source Panel ●] active
**Source Dropdown**: Shows current file with dropdown to switch

**PDF Viewer**:
- Header: filename, page indicator (e.g., "Page 47 of 156")
- Document content with highlighted sections (double-bordered highlight boxes around key text)
- Navigation: [← Prev Finding] "Finding 1 of 7" [Next Finding →]
- Page controls: [◀ Page] [Page ▶] [Zoom + / -]

**Chat Panel**: Shows conversation with citation [1] currently being viewed highlighted, indicating which chat reference maps to current view

#### 4D. Source Panel View - Video

**Video Player Section**:
- Video frame with timestamp overlay (e.g., "02:34:17")
- Playback controls: [▶ Play] progress bar with current position marker, duration display

**Key Moments List**: Clickable list below player
- ● 02:34 - Subject enters building (currently viewing, highlighted)
- ○ 02:41 - Subject carrying boxes
- ○ 03:15 - Vehicle arrives (plate: ABC-123)
- ○ 03:28 - Subject exits with second person

Navigation: [← Prev Moment] "Moment 1 of 4" [Next Moment →]

#### 4E. Source Panel View - Image with Bounding Box

**Image Viewer**:
- Image displayed with bounding box overlays around key elements
- Bounding boxes labeled and color-coded (🔴 indicators)
- Example: Receipt image with boxes around "Total: $15,000.00" and "Signature: J.D."

**Highlights Legend**: Lists what each bounding box represents (e.g., "🔴 Amount: $15,000 | 🔴 Signature matches J. Doe")

**Controls**: [Zoom + / -] [Toggle Highlights]

#### 4F. Timeline View

**View Controls**: [Timeline ●] active
**Layer Toggles**: [Evidence ●] [Legal ●] [Strategy ○]

**Timeline Visualization**: Vertical timeline with year header (2023), events listed chronologically:

- **MAR 14** — Receipt: $15K equipment purchase | Source: receipt_scan_001.jpg | 🔴 Evidence
- **MAR 15** — Wire transfer: $2.34M to Cayman | Source: bank_statements.pdf:47 | 🔴 Evidence
- **MAR 15** — Warehouse entry: 2:34 AM | Source: warehouse_footage.mp4 | 🔴 Evidence
- **MAR 18** — Potential statute violation | 18 Del. C. § 3502 - Filing deadline | 🔵 Legal

**Zoom Controls**: [Day / Week / Month / Year]
**Action Buttons**: [⚠️ Issue?] [🔄 Regenerate] [✏️ Edit]

#### 4G. Regeneration Modal

**Header**: "🔄 REGENERATE VISUALIZATION" with [× Close]

**Options**:
- ○ Full regeneration: "Re-process all source files and rebuild visualization" with warning "⚠️ This may take several minutes"
- ● Partial correction: "Describe what's wrong and we'll fix it" with textarea for user input

**Example Input**: "The connection between Shell Corp and Wire Transfer shows $2.3M but the actual amount was $2.34M according to page 47 of the bank statements."

**Note**: "Affected downstream analyses will be marked for review."

**Buttons**: [Cancel] [Apply Correction]

---

### Screen 5: Judge Simulation (Post-MVP)

**Header Tabs**: [Case Analysis] [Judge Simulation ●]

**Judge Selection Card**:
- Judge name (e.g., "Judge Maria Santos")
- Court info (e.g., "District Court, Southern District")
- Stats: "847 cases analyzed • Tends strict on discovery"
- [View History →] link

**Prediction Panel**:
- Motion type (e.g., "Motion to Compel Discovery")
- Likely Outcome with confidence (e.g., "GRANTED (78% confidence)")
- Key Factors list with ✓/⚠️ indicators:
  - ✓ Strong showing of relevance (pattern match)
  - ✓ Proportionality argument aligns w/ history
  - ⚠️ May require in-camera review first
- Similar Past Rulings list with case names and outcomes

**Actions**: [Try Different Motion ▼] [Export Analysis]

**Simulation Chat Panel**: Separate chat for judge simulation queries with full analysis responses citing specific past rulings and percentages

---

## Tech Stack

- **Frontend**: Next.js, React Flow (agent visualization), Force-graph library
- **Backend**: Python/FastAPI (ADK integration)
- **AI**: Google ADK, Gemini 3 Pro (orchestrator, domain agents), Gemini 3 Flash (triage)
- **Infrastructure**: GCP, Cloud Run
- **Storage**: Cloud Storage (files), Postgres (case data, findings, KG)

---

## Hackathon Alignment

| Requirement | Coverage |
|-------------|----------|
| Not simple RAG | Domain-based multi-agent orchestration |
| Not prompt wrapper | Full app with rich visualizations, state management |
| Not simple vision | Cross-modal inference, cause-effect detection |
| Marathon Agent | Long-running case analysis, multi-session |
| Multimodal | Native PDF + Video + Audio + Image processing in domain agents |
| Action Era | Autonomous agent spawning, tool calls, multi-step execution |

**Key Differentiators**:
1. **Agent Trace Theater** — Full AI decision transparency
2. **Cross-Modal Evidence Linking** — AI connects dots across file types
3. **Proactive Contradiction Detection** — AI catches lies without being asked
4. **Gap Analysis** — AI tells you what evidence you're missing
5. **Domain-Based Architecture** — Leverages Gemini 3's native multimodal capabilities