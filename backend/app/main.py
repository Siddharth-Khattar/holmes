# ABOUTME: FastAPI application entry point.
# ABOUTME: Configures middleware, includes routers, and handles application lifecycle.

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, cases, health, sse
from app.config import settings

# DO NOT import GZipMiddleware - incompatible with SSE

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    logger.info("Holmes API starting up...")
    yield
    logger.info("Holmes API shutting down...")


app = FastAPI(
    title="Holmes API",
    version="0.1.0",
    description="Legal intelligence platform backend",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NOTE: Do NOT add GZipMiddleware - breaks SSE streaming

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(sse.router, tags=["sse"])
app.include_router(auth.router, tags=["auth"])
app.include_router(cases.router, tags=["cases"])
