# ABOUTME: Application configuration using pydantic-settings.
# ABOUTME: Loads settings from environment variables with type validation.

from functools import cached_property

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    database_url: str
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


# Required fields are loaded from environment variables at runtime
settings = Settings()  # type: ignore[call-arg]
