# ABOUTME: Application configuration using pydantic-settings.
# ABOUTME: Loads settings from environment variables with type validation.

from functools import cached_property
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root is two levels up from this file (backend/app/config.py -> project root)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_ROOT_ENV = _PROJECT_ROOT / ".env"
_BACKEND_ENV = _PROJECT_ROOT / "backend" / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # NOTE: Kept optional so tooling (like OpenAPI/type generation) can import
    # the app without requiring runtime secrets. Runtime validation happens
    # during application startup.
    database_url: str | None = None
    cors_origins_raw: str = ""
    debug: bool = False
    gcs_bucket: str | None = None
    frontend_url: str = "http://localhost:3000"  # For JWKS endpoint
    # Service account email for signing GCS URLs when using user credentials locally
    # For Cloud Run with workload identity, this is auto-detected from metadata
    gcs_signing_service_account: str | None = None

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


_settings: Settings | None = None


def get_settings() -> Settings:
    """Get cached settings instance.

    This keeps module imports side-effect free (important for tooling, tests,
    and OpenAPI generation) while still using environment-driven configuration.
    """

    global _settings
    if _settings is None:
        _settings = Settings()  # type: ignore[call-arg]
    return _settings


# Backwards-compatible import style.
settings = get_settings()
