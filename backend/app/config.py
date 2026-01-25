# ABOUTME: Application configuration using pydantic-settings.
# ABOUTME: Loads settings from environment variables with type validation.

from functools import cached_property

from pydantic_settings import BaseSettings, SettingsConfigDict


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

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        # Map CORS_ORIGINS env var to cors_origins_raw field
        env_prefix="",
        extra="ignore",
    )

    @classmethod
    def model_customise_sources(
        cls,
        settings_cls,
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
        """Parse CORS origins from comma-separated or JSON string."""
        value = self.cors_origins_raw.strip()
        if not value:
            return []
        # Try JSON array first
        if value.startswith("["):
            try:
                import json

                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(o).strip() for o in parsed if str(o).strip()]
            except Exception:
                pass
        # Fall back to comma-separated
        return [o.strip() for o in value.split(",") if o.strip()]


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
