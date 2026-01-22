# Legal Intelligence Platform - Project Idea

## Context

A legal/investigation intelligence platform for the Gemini 3 Global Hackathon. Leverages Google ADK for agentic AI coordination, GCP/Cloud Run for deployment, and Gemini 3's multimodal capabilities.

**Target Users**: Legal professionals, investigators, law firms

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

**Complete Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER UPLOADS                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TRIAGE AGENT                                     │
│                                                                             │
│  • Quick multimodal analysis of each file                                   │
│  • Assigns domain relevance scores (file can belong to multiple domains)    │
│  • Estimates complexity per file                                            │
│  • Extracts basic metadata for orchestrator                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ORCHESTRATOR                                     │
│                                                                             │
│  • Groups files by domain based on relevance scores                         │
│  • Calculates total complexity per domain                                   │
│  • Decides spawning strategy:                                               │
│    - Domain complexity < 2.0 → Single domain agent                          │
│    - Domain complexity ≥ 2.0 → Multiple sub-agents + Domain Synthesis       │
│  • Routes user queries to appropriate domain agents                         │
│  • Coordinates cross-domain questions                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│    FINANCIAL      │   │      LEGAL        │   │     STRATEGY      │
│   DOMAIN AGENT    │   │   DOMAIN AGENT    │   │   DOMAIN AGENT    │
│                   │   │                   │   │                   │
│ All relevant files│   │ All relevant files│   │ All relevant files│
│        Any format │   │        Any format │   │    Any format     │
│ All tools         │   │ All tools         │   │ All tools         │
│                   │   │                   │   │                   │
│ Outputs:          │   │ Outputs:          │   │ Outputs:          │
│ • Structured      │   │ • Structured      │   │ • Structured      │
│   findings        │   │   findings        │   │   findings        │
│ • Entity tuples   │   │ • Entity tuples   │   │ • Entity tuples   │
│ • Source citations│   │ • Source citations│   │ • Source citations│
└─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FINDINGS STORE                                      │
│                    (All structured findings with source attribution)        │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      KNOWLEDGE GRAPH AGENT                                  │
│                                                                             │
│  • Entity resolution across all domains                                     │
│  • Relationship merging                                                     │
│  • Conflict detection                                                       │
│  • Cross-domain link discovery                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      KNOWLEDGE GRAPH STORE                                  │
│                        (Single source of truth)                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Even more detailed version:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 1: TRIAGE                                                            │
│  ─────────────────                                                          │
│                                                                             │
│  Triage Agent analyzes each file and assigns DOMAIN RELEVANCE:              │
│                                                                             │
│  bank_statements.pdf      → [Financial: 0.95]                               │
│  deposition_video.mp4     → [Financial: 0.7, Legal: 0.8, Strategy: 0.3]     │
│  statute_delaware.pdf     → [Legal: 0.95]                                   │
│  warehouse_footage.mp4    → [Financial: 0.6, Evidence: 0.9]                 │
│  firm_playbook.docx       → [Strategy: 0.95]                                │
│                                                                             │
│  Key insight: Files can belong to MULTIPLE domains with relevance scores    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 2: ORCHESTRATOR PLANNING                                             │
│  ─────────────────────────────────                                          │
│                                                                             │
│  Groups files by domain, calculates complexity per domain:                  │
│                                                                             │
│  Financial Domain:                                                          │
│    • bank_statements.pdf (complexity: 0.8)                                  │
│    • deposition_video.mp4 (complexity: 0.6, financial portions)             │
│    • warehouse_footage.mp4 (complexity: 0.4)                                │
│    Total: 1.8 → Single Financial Agent                                      │
│                                                                             │
│  Legal Domain:                                                              │
│    • statute_delaware.pdf (complexity: 0.3)                                 │
│    • deposition_video.mp4 (complexity: 0.5, legal portions)                 │
│    Total: 0.8 → Single Legal Agent                                          │
│                                                                             │
│  Strategy Domain:                                                           │
│    • firm_playbook.docx (complexity: 0.4)                                   │
│    Total: 0.4 → Single Strategy Agent                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 3: DOMAIN AGENT PROCESSING                                           │
│  ─────────────────────────────────                                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FINANCIAL DOMAIN AGENT                                             │   │
│  │                                                                     │   │
│  │  System Prompt: "You are a forensic financial analyst. Analyze      │   │
│  │  all provided evidence for financial patterns, anomalies,           │   │
│  │  money flows, and potential fraud indicators."                      │   │
│  │                                                                     │   │
│  │  Context:                                                           │   │
│  │  • bank_statements.pdf (full document)                              │   │
│  │  • deposition_video.mp4 (focus: financial testimony)                │   │
│  │  • warehouse_footage.mp4 (focus: asset movement)                    │   │
│  │                                                                     │   │
│  │  Tools available:                                                   │   │
│  │  • pdf_table_extractor()                                            │   │
│  │  • video_timestamp_analyzer()                                       │   │
│  │  • audio_transcription()                                            │   │
│  │  • image_ocr()                                                      │   │
│  │  • statistical_analysis()                                           │   │
│  │                                                                     │   │
│  │  NATIVE CAPABILITY: Gemini 3 processes PDF + Video + Audio          │   │
│  │  simultaneously, making cross-modal inferences:                     │   │
│  │                                                                     │   │
│  │  "The wire transfer on page 47 of bank_statements.pdf ($2.34M       │   │
│  │   on March 15) correlates with the warehouse entry at 02:34         │   │
│  │   in video footage. In deposition at 14:32, subject claims          │   │
│  │   to have been in New York—direct contradiction."                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

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
AI automatically connects dots across different file types:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔗 CROSS-MODAL LINK DETECTED                                   │
│                                                                 │
│  The receipt timestamp (03/15/2023, 2:41 AM) from              │
│  receipt_scan_001.jpg matches video footage showing             │
│  John Doe at warehouse at 02:34 AM on the same date.            │
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────┐                 │
│  │  🖼️ Receipt       │ ←→  │  📹 Video 02:34  │                 │
│  │  March 15, 2:41AM │     │  Warehouse entry │                 │
│  └──────────────────┘     └──────────────────┘                 │
│                                                                 │
│  Implication: Subject made purchase within 7 minutes of         │
│  warehouse entry. [View Evidence Chain →]                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 3B. Contradiction & Alibi Detection (Proactive)
AI proactively identifies inconsistencies without being asked:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ CONTRADICTION DETECTED                                      │
│                                                                 │
│  CLAIM (deposition_audio.mp3, 14:32):                          │
│  "I was in New York on March 15th for a conference"             │
│                                                                 │
│  EVIDENCE AGAINST:                                              │
│  • warehouse_footage.mp4: Subject at LA warehouse, 2:34 AM     │
│  • receipt_scan_001.jpg: Purchase in LA, 2:41 AM               │
│  • bank_statements.pdf: ATM withdrawal in LA, 3:15 AM          │
│                                                                 │
│  [Generate Impeachment Brief →]                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3C. Gap Analysis (Proactive)
AI identifies what evidence is missing to prove the case:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 EVIDENCE GAP ANALYSIS                                       │
│                                                                 │
│  To prove: Money laundering through Shell Corp LLC              │
│                                                                 │
│  ✓ STRONG: Source of funds (bank statements)                    │
│  ✓ STRONG: Shell company ownership (corporate filings)          │
│  ⚠️ WEAK: Knowledge/intent (no direct communication)            │
│  ✗ MISSING: Destination of funds after Cayman transfer          │
│                                                                 │
│  RECOMMENDED:                                                   │
│  • Subpoena Cayman Islands account records                      │
│  • Obtain email/text communications for intent                  │
│  • Depose Shell Corp registered agent                           │
│                                                                 │
│  [Generate Discovery Request Draft →]                           │
└─────────────────────────────────────────────────────────────────┘
```

#### 3D. Narrative Generation (One-Click)
Generate prosecution or defense briefs instantly:

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 GENERATE NARRATIVE                                          │
│                                                                 │
│  Perspective: [Prosecution ▼]                                   │
│                                                                 │
│  ────────────────────────────────────────────────────────────   │
│                                                                 │
│  On or about March 15, 2023, Defendant John Doe orchestrated    │
│  a scheme to defraud [Client] through a series of wire          │
│  transfers totaling $2.34 million to offshore accounts.         │
│                                                                 │
│  The evidence demonstrates that at 2:34 AM on March 15,         │
│  Defendant entered a warehouse facility [Exhibit A: Video,      │
│  timestamp 02:34:17] carrying document boxes. Within seven      │
│  minutes, a receipt shows a $15,000 equipment purchase          │
│  [Exhibit B: Receipt] at a nearby location...                   │
│                                                                 │
│  [Continue →] [Export to DOCX] [View All Citations]             │
└─────────────────────────────────────────────────────────────────┘
```

#### 3E. Video Analysis Mode
Insights as video/audio is analyzed:

```
┌─────────────────────────────────────────────────────────────────┐
│  📹 ANALYSIS: warehouse_footage.mp4                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              [VIDEO PLAYING: 02:34:17]                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                                                 │
│  02:34 - Male subject entering through side door.               │
│          Carrying 2 cardboard boxes.                            │
│          ⚡ MATCH: Physical description matches John Doe        │
│             from corporate filing photo.                        │
│                                                                 │
│  02:35 - Subject proceeds to storage area B.                    │
│          No other individuals visible.                          │
│                                                                 │
│  02:38 - Second vehicle arrives. License plate: ABC-1234        │
│          ⚡ SEARCHING: Running plate against case entities...   │
│                                                                 │
│  [Pause Analysis] [Jump to Key Moments] [Full Screen]           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Agent Decision Graph (Trace Theater)

Real-time visualization using SSE and React Flow showing:
- Data flow between agents (nodes = agents, edges = data passing)
- Per-node details on click: model used, input prompt/context, case files consumed, tools called, output findings
- Full decision transparency and traceability

**This is the hackathon differentiator**—directly addresses AI black box problem.

---

### 5. Knowledge Graph with Layers

Force-directed graph of extracted entities and relationships:
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

```
User flags error: "Amount is $3.2M, not $2.34M"
                    │
                    ▼
┌───────────────────────────────────────────┐
│ Verification Agent checks source file     │
│ Confirms: correct value is $3.2M          │
└───────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────┐
│ Update Findings Store:                    │
│ • Mark finding f_001 as "superseded"      │
│ • Create finding f_001_corrected with     │
│   correct value and correction metadata   │
└───────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────┐
│ Trigger KG Agent rebuild (incremental)    │
│ • Updates edge with new value             │
│ • Propagates to affected nodes            │
└───────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────┐
│ Mark downstream outputs as STALE:         │
│ • Find all chat responses citing f_001    │
│ • Find all narrative summaries using it   │
│ • Notify user: "3 analyses may need       │
│   regeneration"                           │
└───────────────────────────────────────────┘
```

**User-initiated correction**:
1. User flags error in visualization
2. Verification agent checks original source
3. If confirmed: update KG, identify affected downstream outputs, notify user

**Data Flow (Findings → KG)**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW                                         │
│                                                                             │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                   │
│   │  Financial   │   │    Legal     │   │   Strategy   │                   │
│   │ Domain Agent │   │ Domain Agent │   │ Domain Agent │                   │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                   │
│          │                  │                  │                            │
│          │ Structured       │ Structured       │ Structured                 │
│          │ Findings         │ Findings         │ Findings                   │
│          │                  │                  │                            │
│          ▼                  ▼                  ▼                            │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    CASE FINDINGS STORE                              │  │
│   │                    (Firestore / PostgreSQL JSONB)                   │  │
│   │                                                                     │  │
│   │  Collection: findings/{case_id}/                                    │  │
│   │  ┌───────────────────────────────────────────────────────────────┐ │  │
│   │  │ {                                                             │ │  │
│   │  │   "finding_id": "f_001",                                      │ │  │
│   │  │   "agent_id": "financial_domain_agent",                       │ │  │
│   │  │   "source_file": "bank_statements.pdf",                       │ │  │
│   │  │   "source_location": { "page": 47, "bbox": [...] },           │ │  │
│   │  │   "timestamp": "2025-01-14T10:30:00Z",                        │ │  │
│   │  │   "status": "active",  // or "superseded"                     │ │  │
│   │  │   "entities": [                                               │ │  │
│   │  │     { "mention": "John Doe", "type": "Person", "conf": 0.95 } │ │  │
│   │  │   ],                                                          │ │  │
│   │  │   "relationships": [                                          │ │  │
│   │  │     { "subj": "John Doe", "pred": "transferred",              │ │  │
│   │  │       "obj": "$2.34M", "to": "Cayman Account" }               │ │  │
│   │  │   ]                                                           │ │  │
│   │  │ }                                                             │ │  │
│   │  └───────────────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    │ Triggered after batch / on-demand      │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    KNOWLEDGE GRAPH AGENT                            │  │
│   │                                                                     │  │
│   │  Step 1: Read all findings where status = "active"                  │  │
│   │                                                                     │  │
│   │  Step 2: Entity Resolution                                          │  │
│   │  ┌────────────────────────────────────────────────────────────────┐│  │
│   │  │ Mentions: ["John Doe", "J. Doe", "Doe, John", "Mr. Doe"]       ││  │
│   │  │                         ↓                                      ││  │
│   │  │ Resolved Entity: { id: "e_001", canonical: "John Doe",         ││  │
│   │  │                    aliases: ["J. Doe", "Doe, John"],           ││  │
│   │  │                    type: "Person" }                            ││  │
│   │  └────────────────────────────────────────────────────────────────┘│  │
│   │                                                                     │  │
│   │  Step 3: Build Graph Structure                                      │  │
│   │  • Nodes = resolved entities                                        │  │
│   │  • Edges = relationships (with source attribution)                  │  │
│   │  • Properties = aggregated facts, confidence scores                 │  │
│   │                                                                     │  │
│   │  Step 4: Conflict Detection                                         │  │
│   │  • Same relationship, different values → flag                       │  │
│   │  • Temporal contradictions → flag                                   │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    KNOWLEDGE GRAPH STORE                            │  │
│   │                    (Firestore / In-memory for hackathon)            │  │
│   │                                                                     │  │
│   │  nodes: [                                                           │  │
│   │    { id: "e_001", label: "John Doe", type: "Person",                │  │
│   │      sources: ["f_001", "f_003", "f_007"],                          │  │
│   │      layer: "evidence" }                                            │  │
│   │  ]                                                                  │  │
│   │  edges: [                                                           │  │
│   │    { from: "e_001", to: "e_002", label: "owns",                     │  │
│   │      confidence: 0.87, sources: ["f_001"] }                         │  │
│   │  ]                                                                  │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│                              [Frontend]                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

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

## User Journey & Wireframes

---

### Screen 1: Case List (Entry Point)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚖️ LEGAL INTELLIGENCE                                      [+ New Case]     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MY CASES                                                                    │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  📁 Offshore Holdings Investigation                                    │  │
│  │  Created: Jan 10, 2026 • 12 files • Last updated: 2 hours ago          │  │
│  │  Tags: Evidence (8) • Legal (3) • Strategy (1)                         │  │
│  │                                                    [📎 Files] [🗑️ Del] │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  📁 Martinez Employment Dispute                                        │  │
│  │  Created: Jan 8, 2026 • 5 files • Last updated: 1 day ago              │  │
│  │  Tags: Evidence (2) • Legal (2) • Strategy (1)                         │  │
│  │                                                    [📎 Files] [🗑️ Del] │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  📁 Tech Startup IP Theft                                              │  │
│  │  Created: Jan 5, 2026 • 23 files • Last updated: 3 days ago            │  │
│  │  Tags: Evidence (15) • Legal (5) • Strategy (3)                        │  │
│  │                                                    [📎 Files] [🗑️ Del] │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │                                                                        │  │
│           + Create your first case to get started                            │
│  │                                                                        │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Interactions**:
- Click case card → Opens Command Center (Screen 4)
- Click [📎 Files] → Opens Upload Hub modal (Screen 3)
- Click [+ New Case] → Opens Case Creation (Screen 2)

---

### Screen 2: Case Creation

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚖️ LEGAL INTELLIGENCE                                            [✕ Close] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │   ● Create Case ─────────○ Upload Files ─────────○ Finish            │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  CREATE NEW CASE                                                     │    │
│  │  ─────────────────────────────────────────────────────────────────   │    │
│  │                                                                      │    │
│  │  Case Name *                                                         │    │
│  │  ┌────────────────────────────────────────────────────────────────┐  │    │
│  │  │ Offshore Holdings Investigation                                │  │    │
│  │  └────────────────────────────────────────────────────────────────┘  │    │
│  │                                                                      │    │
│  │  Initial Context / Description                                       │    │
│  │  ┌────────────────────────────────────────────────────────────────┐  │    │
│  │  │ Investigation into potential money laundering through shell    │  │    │
│  │  │ corporations. Client suspects former business partner of       │  │    │
│  │  │ siphoning funds to offshore accounts. Key entities: John Doe,  │  │    │
│  │  │ Shell Corp LLC, suspected accounts in Cayman Islands.          │  │    │
│  │  │                                                                │  │    │
│  │  │                                                                │  │    │
│  │  └────────────────────────────────────────────────────────────────┘  │    │
│  │  This context helps the AI understand your case better.              │    │
│  │                                                                      │    │
│  │                                                                      │    │
│  │                                            [Cancel]  [Next →]        │    │
│  │                                                                      │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Step 2: Upload Files**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚖️ LEGAL INTELLIGENCE                                            [✕ Close] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │   ✓ Create Case ─────────● Upload Files ─────────○ Finish            │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │  UPLOAD CASE FILES                                                   │    │
│  │  ─────────────────────────────────────────────────────────────────   │    │
│  │                                                                      │    │
│  │  ┌────────────────────────────────────────────────────────────────┐  │    │
│  │  │                                                                │  │    │
│  │  │     📄 📹 🎵 🖼️                                                 │  │    │
│  │  │                                                                │  │    │
│  │  │     Drag & drop files here                                     │  │    │
│  │  │     or click to browse                                         │  │    │
│  │  │                                                                │  │    │
│  │  │     Supports: PDF, DOCX, MP4, MP3, JPG, PNG, and more          │  │    │
│  │  │                                                                │  │    │
│  │  └────────────────────────────────────────────────────────────────┘  │    │
│  │                                                                      │    │
│  │  Queued Files (4):                                                   │    │
│  │  ┌──────────────────────────────────────────────────────────────┐    │    │
│  │  │ 📄 bank_statements_2023.pdf         23.4 MB    [✕]           │    │    │
│  │  │ 📹 warehouse_footage.mp4            1.2 GB     [✕]           │    │    │
│  │  │ 📄 delaware_corp_statute.pdf        156 KB     [✕]           │    │    │
│  │  │ 🖼️ receipt_scan_001.jpg              2.1 MB     [✕]           │    │    │
│  │  └──────────────────────────────────────────────────────────────┘    │    │
│  │                                                                      │    │
│  │  You can add more files later from the Case Library.                 │    │
│  │                                                                      │    │
│  │                                       [← Back]  [Finish & Process]   │    │
│  │                                                                      │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Interaction**: [Finish & Process] → Triggers processing → Redirects to Command Center with Agent Flow view

---

### Screen 3: Upload Hub / Case Library

Accessible via [📎 Files] button or from Command Center header.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📁 CASE LIBRARY                                                  [✕ Close] │
│  Offshore Holdings Investigation                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │     📄 📹 🎵 🖼️  Drag & drop files to add to case                       │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Filter: [All ●] [Evidence] [Legal] [Strategy] [Reference]                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  FILE NAME                          │ TYPE       │ STATUS    │ ACTION  │  │
│  ├─────────────────────────────────────┼────────────┼───────────┼─────────┤  │
│  │ 📄 bank_statements_2023.pdf         │ Evidence ▼ │ ✓ Ready   │ [👁️][🗑️]│  │
│  │ 📹 warehouse_footage.mp4            │ Evidence ▼ │ ████░ 78% │ [👁️][🗑️]│  │
│  │ 📄 delaware_corp_statute.pdf        │ Legal ▼    │ ✓ Ready   │ [👁️][🗑️]│  │
│  │ 📄 firm_fraud_playbook.docx         │ Strategy ▼ │ ✓ Ready   │ [👁️][🗑️]│  │
│  │ 🖼️ receipt_scan_001.jpg              │ Evidence ▼ │ ✓ Ready   │ [👁️][🗑️]│  │
│  │ 🎵 witness_deposition.mp3           │ Evidence ▼ │ ✓ Ready   │ [👁️][🗑️]│  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ⚠️ Attention Required (1)                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  📄 additional_records.pdf - CONFLICT DETECTED                         │  │
│  │  New file says: Transfer date March 18 | Existing: March 15            │  │
│  │  [View Side-by-Side] [Trust New] [Keep Existing] [Flag for Review]     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Quick Analysis Modal** (Click [👁️] on any file):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  QUICK ANALYSIS: bank_statements_2023.pdf                         [✕ Close] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Classification: Evidence (Confidence: 94%)                   [Change ▼]    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  DOMAIN RELEVANCE                                                            │
│  • Financial: 0.95                                                           │
│  • Legal: 0.40                                                               │
│  • Strategy: 0.20                                                            │
│                                                                              │
│  EXTRACTED ENTITIES                                                          │
│  • John Doe (Person)                                                         │
│  • Shell Corp LLC (Organization)                                             │
│  • First National Bank (Organization)                                        │
│  • Cayman Islands Account #CH93-0076-2011-6238-5295-7                        │
│                                                                              │
│  KEY DATES                                                                   │
│  • March 15, 2023 - Wire transfer $2,340,000                                 │
│  • April 3, 2023 - Account closure                                           │
│                                                                              │
│  KEY AMOUNTS                                                                 │
│  • $2,340,000 (wire transfer)                                                │
│  • $156,000 (monthly deposits pattern)                                       │
│                                                                              │
│  COMPLEXITY SCORE: 0.72 (High)                                               │
│  • 156 pages, primarily tabular data                                         │
│  • OCR quality: Good (98% confidence)                                        │
│                                                                              │
│  ROUTING: → Financial Domain Agent (dedicated)                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 4: Command Center

#### 4A. During Processing (Agent Flow Primary)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚖️ Offshore Holdings Investigation                    [📎 Files] [← Cases] │
├─────────────────────────────────────────────────────────┬────────────────────┤
│                                                         │                    │
│  ┌───────────────────────────────────────────────────┐  │  💬 CASE CHAT      │
│  │ VIEW CONTROLS                                     │  │  ───────────────   │
│  │ [Agent Flow ●] [Knowledge Graph ○] [Timeline ○]   │  │                    │
│  │ [Source Panel ○]                                  │  │  🤖 Processing     │
│  │                                                   │  │  your files...     │
│  │        ○ = disabled during processing             │  │                    │
│  └───────────────────────────────────────────────────┘  │  4 of 6 files      │
│                                                         │  complete          │
│  ┌───────────────────────────────────────────────────┐  │                    │
│  │              AGENT FLOW (Real-time)               │  │  ──────────────    │
│  │                                                   │  │                    │
│  │         ┌─────────────┐                           │  │  Chat available    │
│  │         │ORCHESTRATOR │                           │  │  after processing  │
│  │         │ Gemini 3 Pro│                           │  │                    │
│  │         └──────┬──────┘                           │  │                    │
│  │                │                                  │  │                    │
│  │    ┌───────────┼───────────┬──────────┐          │  │                    │
│  │    ▼           ▼           ▼          ▼          │  │                    │
│  │ ┌──────┐  ┌──────┐   ┌──────┐   ┌──────┐        │  │                    │
│  │ │Financ│  │Legal │   │Strat.│   │  KG  │        │  │                    │
│  │ │Domain│  │Domain│   │Domain│   │Agent │        │  │                    │
│  │ │ ░░░  │  │ ✓    │   │ ✓    │   │ ░░░  │        │  │                    │
│  │ └──────┘  └──────┘   └──────┘   └──────┘        │  │                    │
│  │                                                   │  │                    │
│  │  Click any node for details                       │  │                    │
│  └───────────────────────────────────────────────────┘  │                    │
│                                                         │                    │
│  Processing: ████████████░░░░░░░░ 67%  ETA: 2 min       │                    │
│                                                         │                    │
└─────────────────────────────────────────────────────────┴────────────────────┘
```

**Agent Node Detail Modal** (Click any node):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  AGENT: Financial Domain Agent                                    [✕ Close] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Status: ✓ Complete                          Model: Gemini 3 Pro             │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  INPUT CONTEXT                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ From: Orchestrator                                                     │  │
│  │ Files: bank_statements_2023.pdf, warehouse_footage.mp4,                │  │
│  │        receipt_scan_001.jpg, witness_deposition.mp3                    │  │
│  │ Phase 1 Metadata: { domain_relevance: {financial: 0.95, ...} }         │  │
│  │ Task: "Analyze all evidence for financial patterns, anomalies,         │  │
│  │        money flows, and potential fraud indicators"                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  TOOLS CALLED                                                                │
│  • pdf_table_extractor() → 847 rows extracted                                │
│  • video_timestamp_analyzer() → 4 key moments identified                     │
│  • image_highlight_regions() → 2 regions marked on receipt                   │
│  • statistical_analysis(data=transactions) → 4 anomalies detected            │
│                                                                              │
│  OUTPUT FINDINGS                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ {                                                                      │  │
│  │   "entities_found": 12,                                                │  │
│  │   "transactions_analyzed": 847,                                        │  │
│  │   "cross_modal_links": [                                               │  │
│  │     { "receipt_timestamp": "02:41", "video_timestamp": "02:34",        │  │
│  │       "implication": "Purchase within 7 min of warehouse entry" }      │  │
│  │   ],                                                                   │  │
│  │   "anomalies": [                                                       │  │
│  │     { "date": "2023-03-15", "amount": 2340000, "type": "wire" }        │  │
│  │   ],                                                                   │  │
│  │   "confidence": 0.94                                                   │  │
│  │ }                                                                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  SENT TO: Findings Store → Knowledge Graph Agent                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

#### 4B. After Processing - Knowledge Graph View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚖️ Offshore Holdings Investigation                    [📎 Files] [← Cases] │
├─────────────────────────────────────────────────────────┬────────────────────┤
│                                                         │                    │
│  ┌───────────────────────────────────────────────────┐  │  💬 CASE CHAT      │
│  │ VIEW CONTROLS                                     │  │  ───────────────   │
│  │ [Agent Flow] [Knowledge Graph ●] [Timeline]       │  │                    │
│  │ [Source Panel]                                    │  │  ┌──────────────┐  │
│  │                                                   │  │  │ What money   │  │
│  │ Layers: [Evidence ●] [Legal ●] [Strategy ○]       │  │  │ trails can   │  │
│  └───────────────────────────────────────────────────┘  │  │ you identify?│  │
│                                                         │  └──────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │                    │
│  │              KNOWLEDGE GRAPH                      │  │  I identified 4    │
│  │                                                   │  │  suspicious wire   │
│  │          ┌─────────┐                              │  │  transfers:        │
│  │          │John Doe │ ← (Person, Evidence)         │  │                    │
│  │          │  🔴     │                              │  │  1. $2.34M on      │
│  │          └────┬────┘                              │  │  Mar 15 to Cayman  │
│  │    owns       │      received $2.3M              │  │  account [1]       │
│  │       ┌───────┴───────┐                          │  │                    │
│  │       ▼               ▼                          │  │  2. $890K on       │
│  │  ┌─────────┐    ┌──────────┐                     │  │  Apr 3... [2]      │
│  │  │Shell    │    │Cayman    │                     │  │                    │
│  │  │Corp LLC │────│Account   │                     │  │  This pattern      │
│  │  │  🔴     │    │  🔴      │                     │  │  suggests... [3]   │
│  │  └────┬────┘    └──────────┘                     │  │                    │
│  │       │                                          │  │  [1][2][3] = click │
│  │       │ violates                                 │  │  to view source    │
│  │       ▼                                          │  │                    │
│  │  ┌──────────────┐                                │  │  ──────────────    │
│  │  │18 Del. C.    │ ← (Statute, Legal)             │  │  [Type message...] │
│  │  │§ 3502        │                                │  │                    │
│  │  │  🔵          │                                │  │                    │
│  │  └──────────────┘                                │  │                    │
│  │                                                   │  │                    │
│  │  🔴 Evidence  🔵 Legal  🟢 Strategy               │  │                    │
│  │                                                   │  │                    │
│  │  ⚠️ Issue? [🔄 Regenerate] [✏️ Edit]              │  │                    │
│  └───────────────────────────────────────────────────┘  │                    │
│                                                         │                    │
└─────────────────────────────────────────────────────────┴────────────────────┘
```

---

#### 4C. Source Panel View - PDF

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚖️ Offshore Holdings Investigation                    [📎 Files] [← Cases] │
├─────────────────────────────────────────────────────────┬────────────────────┤
│                                                         │                    │
│  ┌───────────────────────────────────────────────────┐  │  💬 CASE CHAT      │
│  │ VIEW CONTROLS                                     │  │  ───────────────   │
│  │ [Agent Flow] [Knowledge Graph] [Timeline]         │  │                    │
│  │ [Source Panel ●]                                  │  │  ... identified 4  │
│  │                                                   │  │  suspicious wire   │
│  │ Source: bank_statements_2023.pdf ▼                │  │  transfers:        │
│  └───────────────────────────────────────────────────┘  │                    │
│                                                         │  1. $2.34M on      │
│  ┌───────────────────────────────────────────────────┐  │  Mar 15 to Cayman  │
│  │  📄 bank_statements_2023.pdf       Page 47 of 156 │  │  account [1] ←     │
│  │  ─────────────────────────────────────────────────│  │  (currently        │
│  │                                                   │  │   viewing)         │
│  │  ... regular account activity until March 15th   │  │                    │
│  │  when a                                          │  │  2. $890K on       │
│  │                                                   │  │  Apr 3... [2]      │
│  │  ╔═══════════════════════════════════════════╗   │  │                    │
│  │  ║ wire transfer of $2,340,000 was initiated ║   │  │                    │
│  │  ║ to account #CH93-0076-2011-6238-5295-7    ║   │  │                    │
│  │  ║ (Cayman Islands)                          ║   │  │                    │
│  │  ╚═══════════════════════════════════════════╝   │  │                    │
│  │                                                   │  │                    │
│  │  This transfer was flagged by compliance as      │  │  ──────────────    │
│  │  requiring additional documentation per...        │  │  [Type message...] │
│  │                                                   │  │                    │
│  │  ─────────────────────────────────────────────── │  │                    │
│  │  [← Prev Finding]  Finding 1 of 7  [Next Finding →] │                    │
│  │  [◀ Page] [Page ▶]                [Zoom + / -]   │  │                    │
│  └───────────────────────────────────────────────────┘  │                    │
│                                                         │                    │
└─────────────────────────────────────────────────────────┴────────────────────┘
```

---

#### 4D. Source Panel View - Video

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚖️ Offshore Holdings Investigation                    [📎 Files] [← Cases] │
├─────────────────────────────────────────────────────────┬────────────────────┤
│                                                         │                    │
│  ┌───────────────────────────────────────────────────┐  │  💬 CASE CHAT      │
│  │ VIEW CONTROLS                                     │  │  ───────────────   │
│  │ [Agent Flow] [Knowledge Graph] [Timeline]         │  │                    │
│  │ [Source Panel ●]                                  │  │  The warehouse     │
│  │                                                   │  │  footage shows     │
│  │ Source: warehouse_footage.mp4 ▼                   │  │  John Doe entering │
│  └───────────────────────────────────────────────────┘  │  at 2:34 AM [1]    │
│                                                         │  carrying what     │
│  ┌───────────────────────────────────────────────────┐  │  appears to be     │
│  │  📹 warehouse_footage.mp4                         │  │  document boxes    │
│  │  ─────────────────────────────────────────────────│  │  [2]               │
│  │                                                   │  │                    │
│  │  ┌─────────────────────────────────────────────┐  │  │                    │
│  │  │                                             │  │  │                    │
│  │  │                                             │  │  │                    │
│  │  │            [VIDEO PLAYER]                   │  │  │                    │
│  │  │             02:34:17                        │  │  │                    │
│  │  │                                             │  │  │                    │
│  │  │                                             │  │  │                    │
│  │  └─────────────────────────────────────────────┘  │  │                    │
│  │  [▶ Play]  ════●══════════════════  02:34/04:12  │  │                    │
│  │                                                   │  │  ──────────────    │
│  │  KEY MOMENTS:                                     │  │  [Type message...] │
│  │  ┌─────────────────────────────────────────────┐  │  │                    │
│  │  │ ● 02:34 - Subject enters building           │  │  │                    │
│  │  │ ○ 02:41 - Subject carrying boxes            │  │  │                    │
│  │  │ ○ 03:15 - Vehicle arrives (plate: ABC-123)  │  │  │                    │
│  │  │ ○ 03:28 - Subject exits with second person  │  │  │                    │
│  │  └─────────────────────────────────────────────┘  │  │                    │
│  │                                                   │  │                    │
│  │  [← Prev Moment]  Moment 1 of 4  [Next Moment →]  │  │                    │
│  └───────────────────────────────────────────────────┘  │                    │
│                                                         │                    │
└─────────────────────────────────────────────────────────┴────────────────────┘
```

---

#### 4E. Source Panel View - Image with Bounding Box

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚖️ Offshore Holdings Investigation                    [📎 Files] [← Cases] │
├─────────────────────────────────────────────────────────┬────────────────────┤
│                                                         │                    │
│  ┌───────────────────────────────────────────────────┐  │  💬 CASE CHAT      │
│  │ VIEW CONTROLS                                     │  │  ───────────────   │
│  │ [Agent Flow] [Knowledge Graph] [Timeline]         │  │                    │
│  │ [Source Panel ●]                                  │  │  The receipt shows │
│  │                                                   │  │  a purchase of     │
│  │ Source: receipt_scan_001.jpg ▼                    │  │  $15,000 in        │
│  └───────────────────────────────────────────────────┘  │  equipment [1]     │
│                                                         │  from a vendor     │
│  ┌───────────────────────────────────────────────────┐  │  that matches      │
│  │  🖼️ receipt_scan_001.jpg                          │  │  Shell Corp's      │
│  │  ─────────────────────────────────────────────────│  │  known suppliers   │
│  │                                                   │  │                    │
│  │  ┌─────────────────────────────────────────────┐  │  │                    │
│  │  │                                             │  │  │                    │
│  │  │   ACME SUPPLIES INC                         │  │  │                    │
│  │  │   Date: 03/14/2023                          │  │  │                    │
│  │  │                                             │  │  │                    │
│  │  │   ┌─────────────────────────┐               │  │  │                    │
│  │  │   │ Total: $15,000.00  🔴   │ ← Highlighted │  │  │                    │
│  │  │   └─────────────────────────┘               │  │  │                    │
│  │  │                                             │  │  │                    │
│  │  │   ┌─────────────────────┐                   │  │  │                    │
│  │  │   │ Signature: J.D. 🔴  │ ← Highlighted     │  │  │                    │
│  │  │   └─────────────────────┘                   │  │  │                    │
│  │  └─────────────────────────────────────────────┘  │  │                    │
│  │                                                   │  │  ──────────────    │
│  │  HIGHLIGHTS:                                      │  │  [Type message...] │
│  │  🔴 Amount: $15,000 | 🔴 Signature matches J. Doe │  │                    │
│  │                                                   │  │                    │
│  │  [Zoom + / -]  [Toggle Highlights]                │  │                    │
│  └───────────────────────────────────────────────────┘  │                    │
│                                                         │                    │
└─────────────────────────────────────────────────────────┴────────────────────┘
```

---

#### 4F. Timeline View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚖️ Offshore Holdings Investigation                    [📎 Files] [← Cases] │
├─────────────────────────────────────────────────────────┬────────────────────┤
│                                                         │                    │
│  ┌───────────────────────────────────────────────────┐  │  💬 CASE CHAT      │
│  │ VIEW CONTROLS                                     │  │  ───────────────   │
│  │ [Agent Flow] [Knowledge Graph] [Timeline ●]       │  │                    │
│  │ [Source Panel]                                    │  │  Show me events    │
│  │                                                   │  │  from March 2023   │
│  │ Layers: [Evidence ●] [Legal ●] [Strategy ○]       │  │                    │
│  └───────────────────────────────────────────────────┘  │  Here's the        │
│                                                         │  timeline for      │
│  ┌───────────────────────────────────────────────────┐  │  March 2023...     │
│  │              CASE TIMELINE                        │  │                    │
│  │                                                   │  │                    │
│  │  2023                                             │  │                    │
│  │  ════════════════════════════════════════════     │  │                    │
│  │                                                   │  │                    │
│  │  MAR 14 ─●─ Receipt: $15K equipment purchase      │  │                    │
│  │           │  Source: receipt_scan_001.jpg         │  │                    │
│  │           │  🔴 Evidence                          │  │                    │
│  │           │                                       │  │                    │
│  │  MAR 15 ─●─ Wire transfer: $2.34M to Cayman       │  │                    │
│  │           │  Source: bank_statements.pdf:47       │  │                    │
│  │           │  🔴 Evidence                          │  │                    │
│  │           │                                       │  │                    │
│  │          ─●─ Warehouse entry: 2:34 AM             │  │                    │
│  │           │  Source: warehouse_footage.mp4        │  │                    │
│  │           │  🔴 Evidence                          │  │  ──────────────    │
│  │           │                                       │  │  [Type message...] │
│  │  MAR 18 ─●─ Potential statute violation           │  │                    │
│  │              18 Del. C. § 3502 - Filing deadline  │  │                    │
│  │              🔵 Legal                             │  │                    │
│  │                                                   │  │                    │
│  │  [Zoom: Day / Week / Month / Year]                │  │                    │
│  │                                                   │  │                    │
│  │  ⚠️ Issue? [🔄 Regenerate] [✏️ Edit]              │  │                    │
│  └───────────────────────────────────────────────────┘  │                    │
│                                                         │                    │
└─────────────────────────────────────────────────────────┴────────────────────┘
```

---

#### 4G. Regeneration Modal

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🔄 REGENERATE VISUALIZATION                                      [✕ Close] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  What would you like to regenerate?                                          │
│                                                                              │
│  ○ Full regeneration                                                         │
│    Re-process all source files and rebuild visualization                     │
│    ⚠️ This may take several minutes                                          │
│                                                                              │
│  ● Partial correction                                                        │
│    Describe what's wrong and we'll fix it                                    │
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────────┐  │
│    │ The connection between Shell Corp and Wire Transfer shows $2.3M     │  │
│    │ but the actual amount was $2.34M according to page 47 of the        │  │
│    │ bank statements.                                                    │  │
│    │                                                                     │  │
│    └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Affected downstream analyses will be marked for review.                     │
│                                                                              │
│                                            [Cancel]  [Apply Correction]      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 5: Judge Simulation (Post-MVP)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚖️ Offshore Holdings Investigation                    [📎 Files] [← Cases] │
├──────────────────────────────────────────────────────────────────────────────┤
│  [Case Analysis] [Judge Simulation ●]                                        │
├─────────────────────────────────────────────────────────┬────────────────────┤
│                                                         │                    │
│  JUDGE SIMULATION                                       │  💬 SIMULATION     │
│  ─────────────────────────────────────────────────────  │  CHAT              │
│                                                         │  ───────────────   │
│  Select Judge:                                          │                    │
│  ┌─────────────────────────────────────────────────┐    │  Based on Judge    │
│  │ Judge Maria Santos         [View History →]     │    │  Santos' history,  │
│  │ District Court, Southern District               │    │  how would she     │
│  │ 847 cases analyzed • Tends strict on discovery  │    │  rule on our       │
│  └─────────────────────────────────────────────────┘    │  motion to compel? │
│                                                         │                    │
│  ┌─────────────────────────────────────────────────┐    │  Based on 23       │
│  │ PREDICTION: Motion to Compel Discovery          │    │  similar rulings:  │
│  │                                                 │    │                    │
│  │ Likely Outcome: GRANTED (78% confidence)        │    │  Judge Santos      │
│  │                                                 │    │  has granted       │
│  │ Key Factors:                                    │    │  discovery         │
│  │ ✓ Strong showing of relevance (pattern match)  │    │  motions in 78%    │
│  │ ✓ Proportionality argument aligns w/ history   │    │  of cases with     │
│  │ ⚠️ May require in-camera review first           │    │  similar fact      │
│  │                                                 │    │  patterns...       │
│  │ Similar Past Rulings:                           │    │                    │
│  │ • Case A v. Corp B (2024) - Granted             │    │  [See full         │
│  │ • Case X v. Entity Y (2023) - Granted w/ limits │    │   analysis →]      │
│  │                                                 │    │                    │
│  └─────────────────────────────────────────────────┘    │  ──────────────    │
│                                                         │  [Type message...] │
│  [Try Different Motion ▼]  [Export Analysis]            │                    │
│                                                         │                    │
└─────────────────────────────────────────────────────────┴────────────────────┘
```

---

## Tech Stack

- **Frontend**: Next.js, React Flow (agent visualization), Force-graph library
- **Backend**: Python/FastAPI (ADK integration)
- **AI**: Google ADK, Gemini 3 Pro (orchestrator, domain agents), Gemini 3 Flash (triage)
- **Infrastructure**: GCP, Cloud Run
- **Storage**: Cloud Storage (files), Firestore (case data, findings, KG)

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
1. **Agent Flow** — Full AI decision transparency
2. **Cross-Modal Evidence Linking** — AI connects dots across file types
3. **Proactive Contradiction Detection** — AI catches lies without being asked
4. **Gap Analysis** — AI tells you what evidence you're missing
5. **Domain-Based Architecture** — Leverages Gemini 3's native multimodal capabilities