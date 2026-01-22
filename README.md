# Holmes

**AI-powered legal intelligence platform** — Automates multimodal evidence analysis with transparent AI reasoning.

Built for the [Gemini 3 Global Hackathon 2026](https://ai.google.dev/gemini-api/docs).

## The Problem

Legal professionals spend **60%+ of their time** on manual evidence review across scattered formats — PDFs, video depositions, audio recordings, financial documents. Current AI tools suffer from high hallucination rates and operate as black boxes, making them unusable for legal work that demands transparency and auditability.

## The Solution

Holmes processes **any combination of evidence types** and surfaces connections, contradictions, and gaps — while showing exactly *how* it reached those conclusions through **Agent Flow**, a real-time visualization of AI reasoning.

### Key Capabilities

- **Multimodal Analysis** — PDF, video, audio, images processed together natively via Gemini 3
- **Agent Flow** — Watch AI reasoning unfold in real-time with full transparency
- **Knowledge Graph** — Visual entity-relationship mapping across all evidence
- **Contradiction Detection** — Automatic flagging of conflicting information
- **Hypothesis-Driven Investigation** — AI proposes, human curates, system tracks
- **Span-Level Citations** — Every claim traced to exact source locations

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, React Flow |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL 17 (Cloud SQL) |
| AI | Google ADK, Gemini 3 Pro/Flash |
| Infrastructure | GCP Cloud Run, Cloud Storage, Terraform |
| CI/CD | GitHub Actions with Workload Identity Federation |

## Quick Start

```bash
# Install dependencies
make install

# Start local database
make dev-db && make migrate

# Run services (separate terminals)
make dev-backend   # http://localhost:8080
make dev-frontend  # http://localhost:3000
```

See [GUIDE.md](./GUIDE.md) for detailed setup instructions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│  Next.js 16 · React Flow (Agent Flow) · Knowledge Graph     │
└─────────────────────────┬───────────────────────────────────┘
                          │ SSE (real-time streaming)
┌─────────────────────────▼───────────────────────────────────┐
│                        Backend                              │
│  FastAPI · Google ADK · Multi-Agent Orchestration           │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  PostgreSQL   │ │ Cloud Storage │ │   Gemini 3    │
│  (Sessions,   │ │  (Evidence    │ │  Pro + Flash  │
│   KG, State)  │ │   Files)      │ │               │
└───────────────┘ └───────────────┘ └───────────────┘
```

### Agent Pipeline

1. **Triage** → Classifies evidence by domain relevance
2. **Domain Agents** → Financial, Legal, Strategy, Evidence analysis (parallel)
3. **Synthesis** → Cross-references findings for contradictions and gaps
4. **Knowledge Graph** → Builds entity-relationship structure
5. **Query Agents** → Chat, Research, Discovery for user interaction

## Project Structure

```
holmes/
├── backend/           # FastAPI + Google ADK agents
├── frontend/          # Next.js 16 + React Flow
├── packages/types/    # Shared TypeScript types (auto-generated)
├── terraform/         # GCP infrastructure
└── .planning/         # Project roadmap and architecture docs
```

## Status

**Phase 1 Complete** — Foundation infrastructure operational with CI/CD, database, storage, and deployment pipeline.

See [.planning/ROADMAP.md](./.planning/ROADMAP.md) for the full 12-phase development plan.

## License

Apache License Version 2.0
