# Holmes Quick Start Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Bun | latest | JS package manager & runtime |
| uv | latest | Python package manager |
| Docker | latest | Local PostgreSQL |
| Python | 3.12 | Backend runtime |
| Terraform | >= 1.9 | Infrastructure (optional) |
| gcloud | latest | GCP CLI (optional) |

## Quick Setup

1. Clone the repository
   ```bash
   git clone git@github.com:Siddharth-Khattar/holmes.git && cd holmes
   ```

2. Copy environment files
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   ```

3. Install dependencies
   ```bash
   make install
   ```

4. Start database and run migrations
   ```bash
   make dev-db
   make migrate
   ```

5. Run services (separate terminals)
   ```bash
   make dev-backend   # Terminal 1: http://localhost:8080
   make dev-frontend  # Terminal 2: http://localhost:3000
   ```

## Development Commands

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies (bun + uv) |
| `make dev-db` | Start local PostgreSQL via Docker |
| `make stop-db` | Stop local PostgreSQL |
| `make adminer` | Start Adminer database UI (port 8081) |
| `make migrate` | Run all database migrations (auth + app) |
| `make migrate-auth` | Run Better Auth migrations only |
| `make dev-backend` | Start FastAPI dev server (port 8080) |
| `make dev-frontend` | Start Next.js dev server (port 3000) |
| `make lint` | Run linters (ESLint + Ruff) |
| `make format` | Format code (Prettier + Ruff) |
| `make generate-types` | Generate TS types from FastAPI OpenAPI (via openapi-typescript) |

## Project Structure

```
holmes/
├── backend/           # FastAPI (Python 3.12, uv)
│   ├── app/           # Application code
│   └── alembic/       # Database migrations
├── frontend/          # Next.js 16 (React 19, Bun)
│   └── src/           # Application code
├── packages/types/    # Shared TypeScript types (auto-generated)
├── terraform/         # GCP infrastructure (Cloud Run, Cloud SQL)
├── docker-compose.yml # Local PostgreSQL + Adminer
└── Makefile           # Development commands
```

## Environment Variables

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/holmes` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:3000` |
| `DEBUG` | Enable debug mode | `true` |
| `GCS_BUCKET` | GCS bucket for file storage | (optional) |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8080` |
| `NEXT_PUBLIC_VIDEO_URL` | Hero video URL (GCS in prod) | `/video.mp4` |

## Deployment

### Triggers

Push to these branches triggers automatic deployment:
- `main` - Production
- `development` - Development
- `test-deployment` - Testing

Manual trigger available via GitHub Actions workflow dispatch.

### Pipeline

```
Push → GitHub Actions → Lint/Types → Build Docker → Artifact Registry → Cloud Run
```

### Terraform Commands

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Common Operations

### Create a new migration
```bash
cd backend
uv run alembic revision --autogenerate -m "description"
```

### Sync TypeScript types after schema changes
```bash
make generate-types
```

Generated types are committed under `packages/types/`. A pre-push hook will block pushes if generated output differs from what’s committed.

### Database Migrations

The project uses two migration systems:

1. **Better Auth** (frontend) - Creates authentication tables (`user`, `session`, `account`, etc.)
2. **Alembic** (backend) - Creates application tables (`cases`, etc.)

**Important:** Better Auth migrations must run first because Alembic migrations have foreign keys to auth tables.

```bash
# Run all migrations (recommended)
make migrate

# Or run individually in order:
make migrate-auth     # Better Auth tables first
cd backend && uv run alembic upgrade head  # Then Alembic
```

**Troubleshooting:** If you see `relation "user" does not exist`, run Better Auth migrations first:
```bash
cd frontend && bunx @better-auth/cli migrate
```

### Database UI (Adminer)

Adminer provides a web UI for browsing and managing the PostgreSQL database.

```bash
# Start database + Adminer
make dev-db && make adminer

# Or start everything at once
docker compose up -d
```

Open **http://localhost:8081** and login:

| Field | Value |
|-------|-------|
| System | PostgreSQL |
| Server | postgres |
| Username | postgres |
| Password | postgres |
| Database | holmes |

### Better Auth Tables

Better Auth stores authentication data in PostgreSQL. These tables are managed by Better Auth (not Alembic):

| Table | Contents |
|-------|----------|
| `user` | User accounts (id, name, email, emailVerified, image) |
| `session` | Active sessions (token, userId, expiresAt, ipAddress, userAgent) |
| `account` | Auth providers & credentials (OAuth tokens, hashed passwords) |
| `verification` | Email verification tokens |
| `jwks` | JWT signing keys |

**Note:** The SQLAlchemy models in `backend/app/models/auth.py` use snake_case attribute names but map to Better Auth's camelCase column names (e.g., `email_verified` maps to `emailVerified`).

### Build for production
```bash
# Backend
cd backend && docker build -t holmes-backend .

# Frontend
docker build -f frontend/Dockerfile -t holmes-frontend .
```

### Run backend directly with uvicorn
```bash
cd backend && uv run uvicorn app.main:app --reload --port 8080
```

### Replace Hero Video

The landing page video is served from GCS (not the repo) because Next.js standalone mode doesn't serve `/public` files.

**Bucket:** `gs://{project-id}-media/video.mp4`

**To replace the video:**

1. Upload via GCP Console:
   - Go to https://console.cloud.google.com/storage/browser
   - Open the `{project-id}-media` bucket
   - Upload your new `video.mp4` (overwrites existing)

2. Or via CLI:
   ```bash
   gsutil cp path/to/new-video.mp4 gs://holmes-gemini-3-hack-media/video.mp4
   gsutil setmeta -h "Cache-Control:public, max-age=31536000" gs://holmes-gemini-3-hack-media/video.mp4
   ```

3. Clear browser cache or wait for CDN propagation

**Local development:** Place video at `frontend/public/video.mp4` (gitignored). The app falls back to this when `NEXT_PUBLIC_VIDEO_URL` is unset.
