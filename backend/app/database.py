# ABOUTME: Async SQLAlchemy database engine and session management.
# ABOUTME: Provides connection pooling optimized for Cloud Run cold starts.

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

# Cloud Run specific: smaller pool due to instance scaling
engine = create_async_engine(
    settings.database_url,
    pool_size=5,  # Small for Cloud Run cold starts
    max_overflow=10,  # Allow bursting
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=1800,  # Recycle connections every 30 min
    echo=settings.debug,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
