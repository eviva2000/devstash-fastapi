"""Typed request and response contracts for accounts and sessions."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator


class Credentials(BaseModel):
    """Email/password credentials accepted by registration and sign-in."""

    email: EmailStr
    password: SecretStr = Field(min_length=12, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def trim_email(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).lower()


class UserResponse(BaseModel):
    """Public account fields safe to return to the signed-in user."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    created_at: datetime


class SessionResponse(BaseModel):
    """Current user and the non-credential CSRF token for this session."""

    user: UserResponse
    csrf_token: str
