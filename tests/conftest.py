"""Shared PostgreSQL fixtures for persistence integration tests."""

import os
from collections.abc import Iterator
from uuid import uuid4

import pytest
from psycopg import connect, sql
from sqlalchemy.engine import URL, make_url

from devstash.core.config import get_settings

TEST_DATABASE_PREFIX = "devstash_test_"
DEFAULT_APPLICATION_URL = (
    "postgresql+psycopg://devstash:devstash-local-only@127.0.0.1:5432/devstash"
)
DEFAULT_ADMIN_URL = (
    "postgresql+psycopg://devstash_admin:devstash-admin-local-only"
    "@127.0.0.1:5432/postgres"
)


def _connection_url(url: URL) -> str:
    """Render a SQLAlchemy Psycopg URL for a direct Psycopg connection."""

    return url.set(drivername="postgresql").render_as_string(hide_password=False)


def _validate_test_database_name(database_name: str) -> None:
    """Refuse cleanup unless pytest created the expected disposable database."""

    if not database_name.startswith(TEST_DATABASE_PREFIX):
        raise RuntimeError("Refusing to manage a database without the test prefix")


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    """Create and later remove one uniquely named PostgreSQL test database."""

    application_url = make_url(
        os.environ.get("TEST_DATABASE_URL", DEFAULT_APPLICATION_URL)
    )
    admin_url = make_url(os.environ.get("TEST_DATABASE_ADMIN_URL", DEFAULT_ADMIN_URL))
    database_name = f"{TEST_DATABASE_PREFIX}{uuid4().hex}"
    _validate_test_database_name(database_name)

    if application_url.username is None:
        raise RuntimeError("TEST_DATABASE_URL must include the application role")

    disposable_url = application_url.set(database=database_name)

    with connect(_connection_url(admin_url), autocommit=True) as connection:
        connection.execute(
            sql.SQL("CREATE DATABASE {} OWNER {}").format(
                sql.Identifier(database_name),
                sql.Identifier(application_url.username),
            )
        )

    try:
        yield disposable_url.render_as_string(hide_password=False)
    finally:
        _validate_test_database_name(database_name)
        with connect(_connection_url(admin_url), autocommit=True) as connection:
            connection.execute(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s AND pid <> pg_backend_pid()
                """,
                (database_name,),
            )
            connection.execute(
                sql.SQL("DROP DATABASE {}").format(sql.Identifier(database_name))
            )


@pytest.fixture
def configured_database_url(
    database_url: str,
    monkeypatch: pytest.MonkeyPatch,
) -> str:
    """Expose the disposable URL through the application's settings contract."""

    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()
    return database_url
