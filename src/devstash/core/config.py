"""Typed application configuration."""

from functools import lru_cache

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError


class Settings(BaseSettings):
    """Environment-backed settings required by the backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: SecretStr

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: SecretStr) -> SecretStr:
        """Require the selected PostgreSQL and Psycopg SQLAlchemy dialect."""

        try:
            url = make_url(value.get_secret_value())
        except ArgumentError as error:
            raise ValueError("DATABASE_URL must be a valid SQLAlchemy URL") from error

        if url.get_backend_name() != "postgresql" or url.get_driver_name() != "psycopg":
            raise ValueError(
                "DATABASE_URL must use the postgresql+psycopg SQLAlchemy dialect"
            )

        if url.username is None or url.host is None or url.database is None:
            raise ValueError(
                "DATABASE_URL must include a username, host, and database name"
            )

        return value

    def reveal_database_url(self) -> str:
        """Return the validated URL only to database infrastructure code."""

        return self.database_url.get_secret_value()


@lru_cache
def get_settings() -> Settings:
    """Load and cache the process-wide application settings."""

    return Settings()
