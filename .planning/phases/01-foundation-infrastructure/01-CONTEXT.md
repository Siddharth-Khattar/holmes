# Phase 1: Foundation Infrastructure - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish CI/CD pipeline, database, storage, and skeleton services that all other phases depend on. Includes GitHub Actions deploying to Cloud Run, PostgreSQL on Cloud SQL, Cloud Storage bucket, FastAPI skeleton, Next.js skeleton, SSE endpoint skeleton, and monorepo structure.

</domain>

<decisions>
## Implementation Decisions

### Deployment Strategy
- Two environments: local development + production only (no staging)
- Auto-deploy on push to main branch
- Separate Cloud Run services for frontend and backend (independent scaling)
- Use Cloud Run default URLs (*.run.app) — no custom domain needed initially

### Monorepo Structure
- Bun as package manager with plain workspaces (no Turborepo)
- Structure: `/frontend` (Next.js), `/backend` (FastAPI), `/packages` (shared TS)
- Shared packages include: types, validation (Zod schemas), and utilities
- Convenience alias scripts in root package.json (e.g., `bun dev:frontend`)
- Python backend lives inside monorepo at `/backend`
- Python dependency management via uv
- Python version: 3.12
- Python linting/formatting: Ruff (lint + format in one tool)
- TypeScript linting: ESLint + Prettier
- Makefile at root for cross-language orchestration
- Git hooks via Lefthook (lint/format on commit)
- TypeScript strict mode with relaxation: allow unused variables during development

### Database Setup
- Local development: Docker Compose PostgreSQL
- Initial schema includes auth tables (users, sessions, accounts) + cases skeleton
- UUID for all primary keys
- Migrations via Alembic, auto-run in CI before deploy
- ORM: SQLAlchemy 2.0
- Async database access with asyncpg
- snake_case naming convention throughout
- PostgreSQL 18 on Cloud SQL
- Cloud SQL tier: db-f1-micro (cheapest, ~$7/mo)
- No automatic backups (cost savings for hackathon)

### Environment Management
- Production secrets: Cloud Run environment variables (simpler approach)
- Local env: .env files (gitignored) with .env.example template
- Local GCP auth: gcloud auth application-default login
- CI GCP auth: Workload Identity Federation (keyless OIDC)
- GCP project: new project to be created
- GCP region: europe-west3
- Infrastructure as code: Terraform with local state

### Claude's Discretion
- Connection pool configuration for Cloud Run
- Specific Terraform module organization
- CI workflow job structure
- Health endpoint implementation details
- SSE heartbeat interval

</decisions>

<specifics>
## Specific Ideas

- Makefile should orchestrate both Python (uv) and JS (bun) commands cleanly
- Lefthook should run both Ruff (Python) and ESLint/Prettier (TS) on relevant files
- Docker Compose should mirror Cloud SQL PostgreSQL version for parity

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-infrastructure*
*Context gathered: 2026-01-20*
