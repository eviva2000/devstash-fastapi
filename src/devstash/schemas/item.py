"""Typed API contracts for items."""

from datetime import datetime
from enum import StrEnum
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ItemType(StrEnum):
    """Text-based item types supported by the first CRUD slice."""

    SNIPPET = "snippet"
    PROMPT = "prompt"
    COMMAND = "command"
    NOTE = "note"


def _non_blank(value: str, field_name: str) -> str:
    if not value.strip():
        raise ValueError(f"{field_name} must not be blank")
    return value


class ItemCreate(BaseModel):
    """Payload for creating an item."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=50_000)
    item_type: ItemType
    language: str | None = Field(default=None, max_length=64)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        return _non_blank(value, "title").strip()

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        return _non_blank(value, "content")

    @field_validator("language")
    @classmethod
    def normalize_language(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @model_validator(mode="after")
    def validate_language_type(self) -> Self:
        if self.item_type is not ItemType.SNIPPET and self.language is not None:
            raise ValueError("language is only supported for snippets")
        return self


class ItemUpdate(BaseModel):
    """Non-empty partial update payload for an item."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1, max_length=50_000)
    item_type: ItemType | None = None
    language: str | None = Field(default=None, max_length=64)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _non_blank(value, "title").strip()

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _non_blank(value, "content")

    @field_validator("language")
    @classmethod
    def normalize_language(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @model_validator(mode="after")
    def validate_non_empty(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("at least one field must be supplied")
        required_fields = {"title", "content", "item_type"}
        if any(
            field in self.model_fields_set and getattr(self, field) is None
            for field in required_fields
        ):
            raise ValueError("title, content, and item_type cannot be null")
        return self


class ItemResponse(BaseModel):
    """Canonical item representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    content: str
    item_type: ItemType
    language: str | None
    created_at: datetime
    updated_at: datetime
