# Project Research Summary

**Project:** Holmes - Legal Intelligence Platform
**Domain:** Legal intelligence, e-discovery, investigation support with multi-agent AI
**Researched:** 2026-01-18
**Confidence:** HIGH

## Executive Summary

Holmes is a multimodal AI legal intelligence platform that must prioritize **transparency, accuracy, and source attribution** above all else. The research confirms that legal AI has a critical hallucination problem (58-88% for general LLMs, 17-34% even for purpose-built legal RAG), making verification architecture non-negotiable from day one. The platform should use domain-based agents (Financial, Legal, Strategy) rather than file-type agents, leveraging Gemini 3's native multimodal capabilities. Google ADK provides the orchestration layer with specific constraints that must be designed around upfront.

The recommended approach is a hierarchical multi-agent architecture with an intelligent Orchestrator coordinating specialized domain agents. The stack centers on Next.js 16 + FastAPI + PostgreSQL + Google ADK, deployed on GCP Cloud Run. Real-time transparency is delivered via SSE streaming, with React Flow powering the "Agent Trace Theater" visualization that differentiates Holmes from competitors.

The key risks are: (1) LLM hallucination requiring multi-agent verification and span-level citation, (2) multi-agent system failures (41-86.7% failure rate in research) requiring clear boundaries and orchestrator patterns, (3) ADK production limitations requiring fresh agent instances and state namespacing, and (4) SSE streaming failures in production requiring proper headers and fallback patterns. Mitigation requires building verification, monitoring, and fallback patterns from the foundation phase, not bolting them on later.

## Key Findings

### Recommended Stack

The stack optimizes for GCP-native deployment, async patterns, and real-time streaming. All choices are verified with official 2025/2026 documentation.

**Core technologies:**
- **Next.js 16 + React 19**: Frontend with Turbopack, streaming SSR, View Transitions
- **FastAPI 0.115.x + Python 3.12**: Async-first API with Pydantic v2 validation
- **PostgreSQL 17 + SQLAlchemy 2.0**: Async ORM with JSONB for flexible schemas
- **Google ADK 1.21.x + Gemini 3**: Agent orchestration (hackathon requirement)
- **React Flow 12 + D3.js**: Agent trace and knowledge graph visualization
- **Tailwind CSS v4 + shadcn/ui**: Styling with 5x faster builds
- **SSE (sse-starlette)**: Real-time streaming (simpler than WebSockets, auto-reconnect)
- **Zustand + TanStack Query v5**: Client and server state management
- **Better Auth**: Authentication (successor to NextAuth)

**Critical version constraints:**
- FastAPI 0.115+ (Pydantic v1 deprecated)
- React Flow renamed to @xyflow/react
- Tailwind v4 uses CSS-first config (no tailwind.config.js)

### Expected Features

**Must have (table stakes):**
- Document processing and ingestion (PDF, docx, txt)
- Full-text search across evidence corpus
- OCR for scanned documents
- Source citations for every AI claim
- Metadata extraction and preservation
- Basic security (auth, access controls, audit logging)

**Should have (differentiators):**
- AI Reasoning Traces / Agent Trace Theater (Holmes core differentiator)
- Knowledge Graph / Entity Relationships
- Natural Language Querying (RAG)
- Document Summarization
- Entity Extraction

**Defer (v2+):**
- Custom Workflow Builder
- Third-party integrations (Slack, M365)
- Multi-language support
- Legal Hold Management
- Production/Export with Bates numbering
- Contradiction Detection (technically hard)
- Cross-Modal Evidence Linking (very high complexity)
- Evidence Gap Identification

**Anti-features (never build):**
- Autonomous filing without attorney review
- Definitive legal conclusions
- Hidden AI reasoning (black box)
- Training on client data by default
- Auto-resolving contradictions (require human judgment)

### Architecture Approach

Holmes uses a hierarchical multi-agent architecture with an intelligent Orchestrator (LlmAgent with Gemini 3 Pro) that routes to specialized domain agents. The key insight: domain-based agents (Financial, Legal, Strategy) handle all file types within their domain, leveraging Gemini 3's native multimodal capabilities rather than artificial file-type boundaries.

**Major components:**
1. **Frontend Layer**: Next.js 16 with React Flow for Agent Trace Theater, D3.js for Knowledge Graph
2. **API Layer**: FastAPI with SSE streaming for real-time progress updates
3. **Agent Layer**: ADK Runner with Orchestrator, Triage, Domain Agents (parallel), Synthesis, KG Agent
4. **Query-Time Agents**: Chat Agent (knowledge-first with escalation), Verification Agent, Merge Agent
5. **Storage Layer**: PostgreSQL (all persistent data + sessions), Cloud Storage (evidence files)

**Key patterns:**
- Sequential Pipeline: Triage -> Domain -> Synthesis -> KG
- Parallel Fan-Out: Financial, Legal, Strategy agents run concurrently
- Knowledge-First Chat: Query existing knowledge, escalate only for novel questions
- Generator-Critic Loop: Quality refinement for synthesis

### Critical Pitfalls

1. **LLM Hallucination** (CRITICAL) — Implement multi-agent verification and span-level citation from day one. Never trust LLM to return exact quotes. Dedicated Verifier Agent reduces critical errors by 82%.

2. **Multi-Agent System Failures** (CRITICAL) — Define clear agent boundaries, use Orchestrator pattern, implement deterministic workflows (SequentialAgent), namespace all state keys to prevent race conditions.

3. **ADK Production Limitations** (CRITICAL) — Create fresh agent instances for each workflow (single parent rule), avoid built-in tools in sub-agents, implement per-user agent factory, test outside ADK Web UI.

4. **Citation/Source Attribution Failures** (CRITICAL) — Only 74% citation accuracy in RAG systems. Extract exact text from sources rather than asking LLM to quote. Post-processing citation correction required.

5. **SSE Streaming Failures** (HIGH) — Works locally, fails in production. Require HTTP/2, set proper headers (X-Accel-Buffering: no), implement heartbeats, build polling fallback.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation Infrastructure
**Rationale:** All other components depend on database, storage, API skeleton, and auth. SSE streaming and async patterns must be correct from the start to avoid rewrite.
**Delivers:** PostgreSQL schema, Cloud Storage, FastAPI skeleton with SSE, Next.js skeleton with auth
**Addresses:** Security/Auth (table stakes), Audit Trail foundation
**Avoids:** JSONB performance cliffs (hybrid schema), SSE production failures (proper config)

### Phase 2: Document Processing Pipeline
**Rationale:** Evidence ingestion is prerequisite for all AI features. Search is table stakes.
**Delivers:** File upload, text extraction, OCR, full-text search, metadata extraction
**Addresses:** Document Processing, OCR, Full-Text Search (table stakes)
**Uses:** Cloud Storage, PostgreSQL with hybrid schema
**Avoids:** Cloud Run timeouts (async processing architecture)

### Phase 3: Core Agent System
**Rationale:** ADK integration is the riskiest technical component. Start with Triage Agent (simplest) to validate setup, then add domain agents.
**Delivers:** ADK Runner, Triage Agent, single Domain Agent (Financial), Orchestrator
**Implements:** Hierarchical orchestration, Sequential pipeline
**Avoids:** ADK production limitations (fresh instances, state namespacing), multi-agent failures (clear boundaries)

### Phase 4: Parallel Domain Analysis
**Rationale:** Once single agent works, add remaining domain agents with parallel execution.
**Delivers:** Legal Agent, Strategy Agent, ParallelAgent wrapper, full pipeline
**Addresses:** Domain-Specialized Agents (differentiator)
**Avoids:** Race conditions (unique output_keys)

### Phase 5: Intelligence Layer
**Rationale:** Synthesis and Knowledge Graph depend on domain agent outputs.
**Delivers:** Synthesis Agent (cross-referencing), KG Agent (entity resolution), basic knowledge graph
**Addresses:** Knowledge Graph, Entity Extraction (differentiators)
**Avoids:** Entity resolution scaling issues (incremental ER with blocking)

### Phase 6: Verification and Citations
**Rationale:** Hallucination mitigation is critical for legal domain. Must be built before user-facing features.
**Delivers:** Verification Agent, span-level citation system, source linking
**Addresses:** Source Citations (table stakes), AI Transparency (differentiator)
**Avoids:** LLM hallucination (multi-agent verification), citation failures (span-level extraction)

### Phase 7: Chat and Query Interface
**Rationale:** Chat depends on populated knowledge graph and verification infrastructure.
**Delivers:** Chat Agent with knowledge-first pattern, escalation to Orchestrator, citations in responses
**Addresses:** Natural Language Querying (differentiator), Document Summarization
**Avoids:** Re-analysis costs (knowledge-first pattern)

### Phase 8: Visualization and UI
**Rationale:** Agent Trace Theater and Knowledge Graph view are Holmes differentiators. Depend on working agent system.
**Delivers:** React Flow agent trace, D3.js knowledge graph view, source panel, chat panel
**Addresses:** AI Transparency / Agent Trace Theater (core differentiator)
**Avoids:** React Flow performance issues (memoization, virtualization from start)

### Phase Ordering Rationale

- **Dependencies flow downward:** Database -> Document Processing -> Agents -> Intelligence -> Verification -> Chat -> UI
- **Risk mitigation first:** ADK integration (Phase 3) comes before feature expansion to validate approach
- **Verification before features:** Citation system (Phase 6) before Chat (Phase 7) ensures all outputs are grounded
- **Table stakes before differentiators:** Search and processing before AI features
- **Performance patterns from start:** Hybrid schema, SSE config, React Flow memoization built in initially, not retrofitted

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Core Agent System):** ADK integration patterns are new, may need exploration of specific tool implementations
- **Phase 5 (Intelligence Layer):** Entity resolution algorithms, knowledge graph schema design
- **Phase 6 (Verification):** Span-level citation extraction algorithms, confidence scoring approaches

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented FastAPI/Next.js patterns
- **Phase 2 (Document Processing):** Standard text extraction, search patterns
- **Phase 8 (Visualization):** React Flow and D3.js have excellent documentation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified with official 2025/2026 documentation |
| Features | HIGH | Cross-referenced multiple legal AI platforms and industry reports |
| Architecture | HIGH | Based on official ADK docs and proven multi-agent patterns |
| Pitfalls | HIGH | Academic research, production case studies, official limitations docs |

**Overall confidence:** HIGH

### Gaps to Address

- **Better Auth integration with FastAPI:** Documentation is frontend-focused; need to verify JWT verification pattern in FastAPI during Phase 1
- **ADK DatabaseSessionService performance:** Limited production benchmarks; monitor during Phase 3
- **Gemini 3 rate limits for multi-agent:** May need tier upgrade earlier than expected; budget for Tier 1 ($250 threshold)
- **Video/audio processing limits:** May need Cloud Run Jobs for long files; validate chunk size during Phase 2

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Release](https://nextjs.org/blog/next-16)
- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0 Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [React Flow 12](https://xyflow.com/blog/react-flow-12-release)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Cloud Run Documentation](https://cloud.google.com/run/docs/)

### Secondary (MEDIUM confidence)
- [Stanford Legal RAG Hallucinations Study](https://dho.stanford.edu/wp-content/uploads/Legal_RAG_Hallucinations.pdf)
- [Multi-Agent Failure Research](https://arxiv.org/abs/2503.13657)
- [ADK Production Challenges](https://dlabs.ai/blog/google-adk-production-challenges-and-how-to-solve-them/)
- [PostgreSQL JSONB Performance](https://pganalyze.com/blog/5mins-postgres-jsonb-toast)

### Tertiary (LOW confidence)
- SSE production issues from industry blog posts (validate with own testing)
- React Flow performance optimizations from community guides (validate at scale)

---
*Research completed: 2026-01-18*
*Ready for roadmap: yes*
