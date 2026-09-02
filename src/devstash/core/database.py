"""SQLAlchemy engine, metadata, and request-session infrastructure."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from functools import lru_cache

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from devstash.core.config import get_settings

NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Declarative base shared by all future persistence models."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


@lru_cache
def get_engine() -> AsyncEngine:
    """Create the process-wide asynchronous SQLAlchemy engine."""

    return create_async_engine(get_settings().reveal_database_url())


@lru_cache
def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create the process-wide factory for request-scoped sessions."""

    return async_sessionmaker(
        bind=get_engine(), class_=AsyncSession, expire_on_commit=False
    )


async def get_session() -> AsyncGenerator[AsyncSession]:
    """Yield one request-scoped database session."""

    async with session_context(get_session_factory()) as session:
        yield session


@asynccontextmanager
async def session_context(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncSession]:
    """Guarantee rollback and cleanup around one session lifetime."""

    async with session_factory() as session:
        try:
            yield session
        except BaseException:
            await session.rollback()
            raise
