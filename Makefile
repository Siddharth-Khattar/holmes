# Holmes Development Makefile
# Cross-language orchestration for the monorepo

.PHONY: install dev-db stop-db generate-types lint format migrate dev-backend dev-frontend

# Install all dependencies
install:
	bun install
	cd backend && uv sync --all-extras

# Start local PostgreSQL database
dev-db:
	docker compose up -d postgres

# Stop local PostgreSQL database
stop-db:
	docker compose down

# Generate TypeScript types from Pydantic models
generate-types:
	cd backend && uv run pydantic2ts --module app.schemas --output ../packages/types/src/generated/api.ts

# Run linting for all projects
lint:
	bun run lint:frontend || true
	cd backend && uv run ruff check .

# Run formatting for all projects
format:
	bun run format:frontend || true
	cd backend && uv run ruff format .

# Run database migrations
migrate:
	cd backend && uv run alembic upgrade head

# Start backend development server
dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8080

# Start frontend development server
dev-frontend:
	bun --cwd frontend dev
