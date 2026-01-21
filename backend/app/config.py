# ABOUTME: Application configuration using pydantic-settings.
# ABOUTME: Loads settings from environment variables with type validation.

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    database_url: str
    cors_origins: list[str] = []
    debug: bool = False
    gcs_bucket: str | None = None

    class Config:
        env_file = ".env"

    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Handle comma-separated CORS origins from environment
        if isinstance(self.cors_origins, str):
            object.__setattr__(
                self,
                "cors_origins",
                [o.strip() for o in self.cors_origins.split(",") if o.strip()],
            )


settings = Settings()
