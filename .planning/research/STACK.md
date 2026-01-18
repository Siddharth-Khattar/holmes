# Technology Stack

**Project:** Holmes - Legal Intelligence Platform
**Researched:** 2026-01-18
**Overall Confidence:** HIGH (verified with official sources and current documentation)

---

## Executive Summary

This stack is optimized for a multimodal AI legal intelligence platform with real-time streaming, agent orchestration, and knowledge graph visualization. The choices prioritize:

1. **GCP-native deployment** (Cloud Run, Cloud SQL, Cloud Storage)
2. **Google ADK for agent orchestration** (hackathon requirement)
3. **Real-time streaming** via SSE for AI response delivery
4. **High performance** async patterns throughout
5. **Type safety** end-to-end (TypeScript + Python type hints)

---

## Frontend Stack

### Core Framework

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Next.js** | 16.x | React meta-framework with App Router | HIGH |
| **React** | 19.2 | UI library (bundled with Next.js 16) | HIGH |
| **TypeScript** | 5.7+ | Type safety | HIGH |

**Rationale:** Next.js 16 (released ahead of Next.js Conf 2025) provides:
- React 19.2 with View Transitions, `useEffectEvent()`, and Activity components
- Turbopack as default bundler (2-5x faster builds, 10x faster refresh)
- Cache Components with explicit `"use cache"` directive
- `proxy.ts` replacing `middleware.ts` for explicit network boundaries
- DevTools MCP integration for richer debugging

**Source:** [Next.js 16 Release](https://nextjs.org/blog/next-16)

### Styling

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Tailwind CSS** | 4.x | Utility-first CSS | HIGH |
| **shadcn/ui** | latest | Component foundation | HIGH |

**Rationale:** Tailwind CSS v4 (released January 2025) brings:
- CSS-first configuration (no `tailwind.config.js` needed)
- 5x faster full builds, 100x faster incremental rebuilds
- Built on cascade layers, `@property`, `color-mix()`
- Automatic content detection

shadcn/ui provides accessible, customizable components built on Radix UI primitives. Components live in your codebase for full control.

**Installation:**
```bash
npm install tailwindcss @tailwindcss/postcss postcss
npx shadcn@latest init
```

**Sources:**
- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4)
- [shadcn/ui Introduction](https://ui.shadcn.com/docs)

### State Management

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Zustand** | 5.x | Client state management | HIGH |
| **TanStack Query** | 5.x | Server state management | HIGH |

**Rationale:**

**Zustand** (recommended for 90% of projects in 2025):
- ~3KB bundle size, minimal boilerplate
- Hook-based API, no providers needed
- Define state and actions in one place
- Best middle ground between simplicity and power

**TanStack Query v5:**
- Single object parameter API (more consistent)
- `useSuspenseQuery` for SSR streaming
- 20% smaller than v4
- React 18+ required (we have React 19)

**Do NOT use:**
- Redux/Redux Toolkit - overkill for this project, more boilerplate
- Jotai - better for complex interdependencies we don't have
- React Context alone - performance issues with frequent updates

**Sources:**
- [State Management in 2025](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)
- [TanStack Query v5](https://tanstack.com/query/latest)

### Visualization

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **@xyflow/react** | 12.10.0 | Agent trace visualization, workflow UIs | HIGH |
| **D3.js** | 7.x | Knowledge graph force layouts | MEDIUM |

**Rationale:**

**React Flow (@xyflow/react v12):**
- Renamed from `reactflow` to `@xyflow/react`
- SSR/SSG support (define width, height, handles)
- Built-in dark mode with `colorMode` prop
- CSS variables for theming
- Nodes are React components (full customization)
- Perfect for "Agent Trace Theater" visualization

**D3.js** for knowledge graphs:
- Force-directed layouts for entity relationships
- Can combine with React Flow for hybrid approach
- Better for large datasets (<10k elements use D3/SVG)

**Installation:**
```bash
npm install @xyflow/react d3 @types/d3
```

**Import pattern:**
```typescript
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

**Sources:**
- [React Flow 12 Release](https://xyflow.com/blog/react-flow-12-release)
- [D3.js](https://d3js.org/)

### Authentication (Frontend)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Better Auth** | 1.4.x | Authentication framework | MEDIUM |

**Rationale:** Better Auth is the official successor to Auth.js with:
- Framework-agnostic design
- Plugin ecosystem (2FA, magic links, admin tools)
- Stateless sessions option
- JWT plugin for backend verification
- Cookie chunking (no size errors)
- TypeScript-first

**Backend Integration Pattern:**
1. Use Better Auth JWT plugin on frontend
2. Verify JWTs on FastAPI using public key from JWKS endpoint
3. OR use reverse proxy with ForwardAuth pattern

**Do NOT use:**
- NextAuth/Auth.js - Better Auth is the successor
- Firebase Auth - adds unnecessary GCP complexity
- Clerk/Auth0 - external dependencies for hackathon

**Source:** [Better Auth](https://www.better-auth.com/)

### Additional Frontend Libraries

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `lucide-react` | latest | Icons | Consistent with shadcn |
| `zod` | 3.x | Schema validation | Shared with backend models |
| `date-fns` | 4.x | Date manipulation | Tree-shakeable |
| `nuqs` | latest | URL state management | Type-safe query params |

---

## Backend Stack

### Core Framework

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **FastAPI** | 0.115.x | Async API framework | HIGH |
| **Uvicorn** | 0.34.x | ASGI server | HIGH |
| **Python** | 3.12+ | Runtime | HIGH |

**Rationale:** FastAPI 0.115.x (latest stable):
- Async-first design perfect for AI workloads
- Automatic OpenAPI documentation
- Pydantic v2 integration (5x faster validation)
- `StreamingResponse` for SSE
- Type hints throughout

**Key 0.115+ changes:**
- Python 3.9+ required (dropped 3.8)
- Pydantic v1 deprecated
- Dependencies with yield run exit code after response sent (good for streaming)

**Source:** [FastAPI Releases](https://github.com/fastapi/fastapi/releases)

### Data Validation

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Pydantic** | 2.12+ | Data validation | HIGH |
| **pydantic-settings** | 2.x | Settings management | HIGH |

**Rationale:** Pydantic v2:
- Rust core = 5x faster validation
- `model_validate_json()` for direct JSON parsing
- `field_validator()` and `model_validator()` (not deprecated `validator`/`root_validator`)
- TypeAdapter for non-model validation

**Best practices:**
- Use specific types over generic (`list` not `Sequence`)
- Express constraints declaratively (let Rust handle them)
- Reuse TypeAdapter instances

**Source:** [Pydantic Performance](https://docs.pydantic.dev/latest/concepts/performance/)

### Database

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **PostgreSQL** | 17 | Primary database | HIGH |
| **SQLAlchemy** | 2.0+ | Async ORM | HIGH |
| **asyncpg** | 0.30.x | Async PostgreSQL driver | HIGH |
| **Alembic** | 1.14+ | Database migrations | HIGH |

**Rationale:**

**PostgreSQL 17** on Cloud SQL:
- JSONB for flexible evidence metadata
- Full-text search for document content
- pgvector extension for embeddings (if needed)

**SQLAlchemy 2.0 async patterns:**
```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@host/db",
    pool_size=10,
    max_overflow=20,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
```

**JSONB best practices:**
- Hybrid approach: columns for stable fields, JSONB for variable data
- Generated columns for hot filters
- GIN indexes with `jsonb_path_ops` for containment queries
- Avoid large arrays/deeply nested structures in JSONB

**Installation:**
```bash
pip install sqlalchemy[asyncio] asyncpg alembic
```

**Sources:**
- [SQLAlchemy Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [PostgreSQL JSONB Patterns](https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/)

### Real-Time Streaming

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **sse-starlette** | 3.1.x | SSE implementation | HIGH |

**Rationale:** SSE over WebSockets because:
- Unidirectional (server to client) fits AI response streaming
- Simpler than WebSockets, easier to scale
- Built-in automatic reconnection
- Works over standard HTTP

**sse-starlette** features:
- W3C SSE specification compliant
- Automatic client disconnect detection
- Thread safety for multi-loop support

**Usage:**
```python
from sse_starlette import EventSourceResponse

async def stream_agent_response():
    async for chunk in agent.stream():
        yield {"data": chunk, "event": "chunk"}
    yield {"data": "done", "event": "complete"}

return EventSourceResponse(stream_agent_response())
```

**Important:**
- Disable GZipMiddleware (incompatible with SSE)
- Add `X-Accel-Buffering: no` header for nginx

**Source:** [sse-starlette PyPI](https://pypi.org/project/sse-starlette/)

---

## AI/Agent Stack

### Agent Orchestration

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **google-adk** | 1.21.x | Agent Development Kit | HIGH |
| **Gemini 3 Pro/Flash** | latest | LLM models | HIGH |

**Rationale:** Google ADK (hackathon requirement) provides:
- Code-first agent development
- Model-agnostic but optimized for Gemini
- Production-ready (v1.0+ stable)
- Multi-agent orchestration patterns

**ADK Agent Types:**
1. **LLM Agents** - reasoning with Gemini
2. **Workflow Agents** - orchestration (Sequential, Parallel, Loop)
3. **Custom Agents** - inherit from BaseAgent

**Key Patterns for Holmes:**

1. **Sequential Pipeline** for evidence processing:
   - Parser Agent → Extractor Agent → Summarizer Agent

2. **Parallel Execution** for independent analysis:
   - Document Agent + Video Agent + Audio Agent running concurrently

3. **Hierarchical Delegation** for specialized processing:
   - Coordinator routes to domain specialists

**Gemini 3 Interactions API (NEW in 1.21.0):**
```python
from google.adk import Agent
from google.adk.models import Gemini

agent = Agent(
    model=Gemini(model="gemini-3-pro-preview", use_interactions_api=True)
)
```

**Best Practice:** Avoid monolithic agents. Build specialized micro-agents that do one thing well.

**Installation:**
```bash
pip install google-adk
```

**Sources:**
- [ADK Documentation](https://google.github.io/adk-docs/)
- [Multi-Agent Patterns](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)
- [ADK 1.21.0 Release](https://github.com/google/adk-python/releases)

### Multimodal Processing

| Technology | Purpose | Notes |
|------------|---------|-------|
| **Gemini 3 Pro** | Complex reasoning, legal analysis | Higher capability |
| **Gemini 3 Flash** | Fast processing, simple extraction | Lower latency, cost |
| **google-cloud-storage** | Evidence file storage | GCP native |
| **google-cloud-speech** | Audio transcription | If needed beyond Gemini |
| **google-cloud-vision** | OCR, image analysis | If needed beyond Gemini |

**Multimodal Strategy:**
- Use Gemini's native multimodal capabilities first
- Fall back to specialized APIs only if needed
- Stream large files through Cloud Storage

---

## Infrastructure Stack

### GCP Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **Cloud Run** | Container hosting | 1 vCPU, 512MiB starting |
| **Cloud SQL** | PostgreSQL | PostgreSQL 17, smallest tier |
| **Cloud Storage** | Evidence files | Standard class |
| **Artifact Registry** | Container images | Docker format |
| **Secret Manager** | API keys, credentials | Required |

### Cloud Run Configuration

**Best Practices:**

1. **Cold Start Mitigation:**
   - Set minimum instances for user-facing services
   - Use smaller container images
   - Lazy load heavy dependencies

2. **Resource Sizing:**
   - Start with 1 vCPU, 512MiB
   - Monitor and adjust based on actual usage
   - AI workloads may need more CPU

3. **Async Libraries Required:**
   - `asyncpg` (not `psycopg2`)
   - `httpx` (not `requests`)
   - `aiohttp` for external APIs

4. **Logging:**
   - Set `PYTHONUNBUFFERED=1` in Dockerfile
   - Write to stdout/stderr for Cloud Logging

**Dockerfile pattern:**
```dockerfile
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**Source:** [Cloud Run FastAPI Guide](https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-fastapi-service)

### CI/CD

| Technology | Purpose |
|------------|---------|
| **Cloud Build** | Build and deploy pipeline |
| **GitHub Actions** | Alternative CI/CD |

---

## Development Tools

### Python

| Tool | Purpose |
|------|---------|
| `uv` or `pip` | Package management |
| `ruff` | Linting + formatting (replaces black, isort, flake8) |
| `mypy` | Type checking |
| `pytest` + `pytest-asyncio` | Testing |

### JavaScript/TypeScript

| Tool | Purpose |
|------|---------|
| `pnpm` | Package management (faster than npm) |
| `eslint` | Linting |
| `prettier` | Formatting |
| `vitest` | Testing |

### Development Environment

```bash
# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
pnpm install
pnpm dev
```

---

## Complete Installation Commands

### Frontend
```bash
# Create Next.js 16 app
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir

# Install dependencies
cd frontend
pnpm add @xyflow/react d3 @types/d3 zustand @tanstack/react-query better-auth zod lucide-react date-fns nuqs
pnpm add -D @tailwindcss/postcss
```

### Backend
```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install fastapi uvicorn pydantic pydantic-settings
pip install sqlalchemy[asyncio] asyncpg alembic
pip install google-adk sse-starlette
pip install google-cloud-storage google-cloud-secret-manager
pip install httpx python-multipart

# Dev dependencies
pip install ruff mypy pytest pytest-asyncio
```

---

## Alternatives Considered

| Category | Chosen | Alternative | Why Not |
|----------|--------|-------------|---------|
| Frontend Framework | Next.js 16 | Remix, Vite+React | Next.js is default for this scale, better RSC support |
| State Management | Zustand | Redux, Jotai | Zustand is simpler, Redux overkill, Jotai for different use case |
| CSS | Tailwind v4 | CSS Modules, styled-components | Tailwind v4 is fastest, best DX |
| Components | shadcn/ui | MUI, Chakra | Full control, no vendor lock-in |
| Backend Framework | FastAPI | Django, Flask | FastAPI async-first, better for AI workloads |
| ORM | SQLAlchemy 2.0 | Django ORM, Tortoise | Best async support, mature |
| Graph Viz | React Flow | Cytoscape.js, vis.js | React components, best DX for React apps |
| Auth | Better Auth | NextAuth, Clerk | Better Auth is successor, self-hosted |
| Streaming | SSE | WebSockets | SSE simpler for server→client, auto-reconnect |

---

## Version Pinning Recommendations

**requirements.txt (Backend):**
```
fastapi>=0.115.0,<0.116.0
uvicorn>=0.34.0
pydantic>=2.12.0
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.30.0
alembic>=1.14.0
google-adk>=1.21.0
sse-starlette>=3.1.0
```

**package.json (Frontend):**
```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "@xyflow/react": "^12.10.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "better-auth": "^1.4.0"
  }
}
```

---

## Sources

### Official Documentation
- [Next.js 16 Release](https://nextjs.org/blog/next-16)
- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Google ADK](https://google.github.io/adk-docs/)
- [SQLAlchemy 2.0 Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [React Flow 12](https://xyflow.com/blog/react-flow-12-release)
- [Better Auth](https://www.better-auth.com/)
- [TanStack Query v5](https://tanstack.com/query/latest)
- [Pydantic v2](https://docs.pydantic.dev/latest/)
- [Cloud Run FastAPI](https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-fastapi-service)

### Best Practices Guides
- [State Management 2025](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)
- [PostgreSQL JSONB Patterns](https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/)
- [Multi-Agent Patterns in ADK](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)
- [FastAPI SSE Streaming](https://medium.com/@nandagopal05/server-sent-events-with-python-fastapi-1c8c54746eb7)
