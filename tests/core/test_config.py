"""Tests for typed application settings."""

import pytest
from pydantic import SecretStr, ValidationError

from devstash.core.config import Settings

VALID_DATABASE_URL = (
    "postgresql+psycopg://devstash:do-not-print@127.0.0.1:5432/devstash"
)


def test_settings_accept_postgresql_psycopg_url_and_redact_password() -> None:
    settings = Settings(
        _env_file=None,
        database_url=SecretStr(VALID_DATABASE_URL),
    )

    assert settings.reveal_database_url() == VALID_DATABASE_URL
    assert "do-not-print" not in repr(settings)
    assert "do-not-print" not in str(settings)


def test_settings_require_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(ValidationError, match="database_url"):
        Settings(_env_file=None)


@pytest.mark.parametrize(
    "database_url",
    [
        "not-a-url",
        "sqlite:///devstash.db",
        "postgresql+asyncpg://devstash:secret@127.0.0.1/devstash",
        "postgresql+psycopg://devstash@/devstash",
    ],
)
def test_settings_reject_invalid_database_url(database_url: str) -> None:
    with pytest.raises(ValidationError, match="DATABASE_URL"):
        Settings(_env_file=None, database_url=SecretStr(database_url))
