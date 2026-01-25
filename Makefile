# Holmes Development Makefile
# Cross-language orchestration for the monorepo

.PHONY: install dev-db stop-db adminer generate-types lint format migrate migrate-auth dev-backend dev-frontend

# Install all dependencies
install:
	bun install
	cd backend && uv sync --dev

# Start local PostgreSQL database
dev-db:
	docker compose up -d postgres

# Stop local PostgreSQL database
stop-db:
	docker compose down

# Start Adminer database UI (http://localhost:8081)
adminer:
	docker compose up -d adminer

# Generate TypeScript types from Pydantic models
generate-types:
	@tmp=$$(mktemp -t holmes-openapi.XXXXXX.json) ; \
	cd backend && uv run python -c 'import json; from app.main import app; print(json.dumps(app.openapi()))' > "$$tmp" ; \
	cd .. && bunx openapi-typescript "$$tmp" --output packages/types/src/generated/api.ts ; \
	rm -f "$$tmp"

# Run linting for all projects
lint:
	bun run lint:frontend || true
	cd backend && uv run ruff check .

# Run formatting for all projects
format:
	bun run format:frontend || true
	cd backend && uv run ruff format .

# Run Better Auth migrations (creates auth tables)
migrate-auth:
	cd frontend && bunx @better-auth/cli migrate

# Run all database migrations (auth first, then app)
migrate: migrate-auth
	cd backend && uv run alembic upgrade head

# Start backend development server
dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8080

# Start frontend development server
dev-frontend:
	bun --cwd frontend dev
