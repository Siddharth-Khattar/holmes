# ABOUTME: FastAPI application entry point.
# ABOUTME: Configures middleware, includes routers, and handles application lifecycle.

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import auth, cases, files, health, sse
from app.config import get_settings
from app.schemas import ErrorResponse

# DO NOT import GZipMiddleware - incompatible with SSE

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    logger.info("Holmes API starting up...")

    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError(
            "DATABASE_URL must be set for the backend to start. "
            "(It may be omitted for tooling like OpenAPI/type generation.)"
        )

    yield
    logger.info("Holmes API shutting down...")


app = FastAPI(
    title="Holmes API",
    version="0.1.0",
    description="Legal intelligence platform backend",
    lifespan=lifespan,
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    error = ErrorResponse(
        code="VALIDATION_ERROR",
        message="Invalid request",
        details={
            "errors": exc.errors(),
            "path": request.url.path,
        },
        recoverable=True,
        suggested_action="Fix the request payload and try again.",
    )
    return JSONResponse(status_code=422, content=error.model_dump(mode="json"))


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    # If something already raised a structured error payload, pass it through.
    if (
        isinstance(exc.detail, dict)
        and "code" in exc.detail
        and "message" in exc.detail
    ):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    error = ErrorResponse(
        code=f"HTTP_{exc.status_code}",
        message=str(exc.detail),
        details={
            "path": request.url.path,
        },
        recoverable=exc.status_code < 500,
    )
    return JSONResponse(
        status_code=exc.status_code, content=error.model_dump(mode="json")
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    settings = get_settings()
    logger.exception("Unhandled exception on %s", request.url.path)

    details: dict | None = None
    if settings.debug:
        details = {"error": str(exc), "path": request.url.path}

    error = ErrorResponse(
        code="INTERNAL_SERVER_ERROR",
        message="Internal server error",
        details=details,
        recoverable=False,
    )
    return JSONResponse(status_code=500, content=error.model_dump(mode="json"))


# CORS for frontend
settings = get_settings()
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
app.include_router(files.router, tags=["files"])
