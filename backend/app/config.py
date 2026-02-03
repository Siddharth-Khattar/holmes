# ABOUTME: Application configuration using pydantic-settings.
# ABOUTME: Loads settings from environment variables with type validation.

import os
from functools import cached_property
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root is two levels up from this file (backend/app/config.py -> project root)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ROOT_ENV = _PROJECT_ROOT / ".env"
_BACKEND_ENV = _PROJECT_ROOT / "backend" / ".env"

# Load .env files into os.environ so third-party libs (ADK, genai, GCS)
# that read env vars directly will find them.
# override=False: real env vars always take precedence over .env values.
# Backend .env loaded first (higher priority), then root .env as fallback.
load_dotenv(_BACKEND_ENV, override=False)
load_dotenv(_ROOT_ENV, override=False)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # NOTE: Kept optional so tooling (like OpenAPI/type generation) can import
    # the app without requiring runtime secrets. Runtime validation happens
    # during application startup.
    database_url: str | None = None
    cors_origins_raw: str = ""
    debug: bool = False
    sql_echo: bool = False
    gcs_bucket: str | None = None
    frontend_url: str = "http://localhost:3000"  # For JWKS endpoint
    # Service account email for signing GCS URLs when using user credentials locally
    # For Cloud Run with workload identity, this is auto-detected from metadata
    gcs_signing_service_account: str | None = None

    # Development API key for testing via Swagger UI (only works when debug=True)
    # Set DEV_API_KEY in .env to enable API testing without frontend auth
    dev_api_key: str | None = None

    # --- ADK / Gemini configuration ---
    # API key for Gemini (ADK uses GOOGLE_API_KEY, NOT GEMINI_API_KEY)
    google_api_key: str | None = None
    # Whether to use Vertex AI backend instead of AI Studio
    use_vertex_ai: bool = False
    # GCP region for Vertex AI (env: GOOGLE_CLOUD_LOCATION)
    google_cloud_location: str = "europe-west3"
    # GCS bucket for ADK artifact storage; falls back to gcs_bucket if not set
    adk_artifacts_bucket: str | None = None
    # Application name for ADK session namespacing
    adk_app_name: str = "holmes"
    # Gemini model IDs (configurable for model updates / GA migration)
    gemini_flash_model: str = "gemini-3-flash-preview"
    gemini_pro_model: str = "gemini-3-pro-preview"
    # File size (bytes) above which to use Gemini File API instead of inline data
    file_api_threshold: int = 100_000_000

    model_config = SettingsConfigDict(
        # Look for .env in backend/ first, then project root (absolute paths)
        env_file=(_BACKEND_ENV, _ROOT_ENV),
        case_sensitive=False,
        # Map CORS_ORIGINS env var to cors_origins_raw field
        env_prefix="",
        extra="ignore",
    )

    @classmethod
    def model_customise_sources(
        cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        """Customize settings sources."""
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            file_secret_settings,
        )

    @cached_property
    def cors_origins(self) -> list[str]:
        """Parse CORS origins from comma-separated or JSON string.

        Automatically includes frontend_url if set and not the localhost default.
        """
        value = self.cors_origins_raw.strip()
        origins: list[str] = []

        if value:
            # Try JSON array first
            if value.startswith("["):
                try:
                    import json

                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        origins = [str(o).strip() for o in parsed if str(o).strip()]
                except Exception:
                    pass
            # Fall back to comma-separated
            if not origins:
                origins = [o.strip() for o in value.split(",") if o.strip()]

        # Auto-include frontend_url for production CORS
        if self.frontend_url and self.frontend_url not in origins:
            origins.append(self.frontend_url)

        return origins


def _ensure_adk_env(s: Settings) -> None:
    """Sync derived ADK env vars that the ADK reads directly from os.environ.

    Called once after Settings is first created so that values computed from
    the typed settings object are visible to google-adk / google-genai.
    """
    # ADK checks GOOGLE_GENAI_USE_VERTEXAI to decide between AI Studio and Vertex
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", str(s.use_vertex_ai).upper())


_settings: Settings | None = None


def get_settings() -> Settings:
    """Get cached settings instance.

    This keeps module imports side-effect free (important for tooling, tests,
    and OpenAPI generation) while still using environment-driven configuration.
    """

    global _settings
    if _settings is None:
        _settings = Settings()  # type: ignore[call-arg]
        _ensure_adk_env(_settings)
    return _settings


# Backwards-compatible import style.
settings = get_settings()
