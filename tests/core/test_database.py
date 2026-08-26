"""PostgreSQL integration tests for session infrastructure."""

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

import devstash.core.database as database_module
from devstash.core.database import get_session, session_context


class TrackingAsyncSession(AsyncSession):
    """Record whether the session context performed cleanup."""

    was_closed: bool = False

    async def close(self) -> None:
        self.was_closed = True
        await super().close()


@pytest.mark.asyncio
async def test_managed_async_session_can_query_postgresql(
    configured_database_url: str,
) -> None:
    engine = create_async_engine(configured_database_url)
    factory = async_sessionmaker(engine, class_=AsyncSession)

    try:
        async with session_context(factory) as session:
            result = await session.execute(text("SELECT 1"))

        assert result.scalar_one() == 1
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_fastapi_session_dependency_yields_and_closes_session(
    configured_database_url: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine = create_async_engine(configured_database_url)
    factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
        engine,
        class_=TrackingAsyncSession,
    )
    monkeypatch.setattr(database_module, "get_session_factory", lambda: factory)
    sessions = get_session()

    try:
        session = await anext(sessions)
        assert isinstance(session, TrackingAsyncSession)

        await sessions.aclose()

        assert session.was_closed
    finally:
        await sessions.aclose()
        await engine.dispose()


@pytest.mark.asyncio
async def test_session_context_rolls_back_failures_and_closes_session(
    configured_database_url: str,
) -> None:
    engine = create_async_engine(configured_database_url)
    factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
        engine,
        class_=TrackingAsyncSession,
    )
    tracked_session: TrackingAsyncSession | None = None

    try:
        async with engine.begin() as connection:
            await connection.execute(
                text("CREATE TABLE test_transaction_probe (value INTEGER NOT NULL)")
            )

        with pytest.raises(RuntimeError, match="force rollback"):
            async with session_context(factory) as session:
                if not isinstance(session, TrackingAsyncSession):
                    raise AssertionError("Expected the configured session class")
                tracked_session = session
                await session.execute(
                    text("INSERT INTO test_transaction_probe (value) VALUES (1)")
                )
                raise RuntimeError("force rollback")

        async with factory() as verification_session:
            result = await verification_session.execute(
                text("SELECT count(*) FROM test_transaction_probe")
            )

        assert result.scalar_one() == 0
        assert tracked_session is not None
        assert tracked_session.was_closed
    finally:
        async with engine.begin() as connection:
            await connection.execute(
                text("DROP TABLE IF EXISTS test_transaction_probe")
            )
        await engine.dispose()
