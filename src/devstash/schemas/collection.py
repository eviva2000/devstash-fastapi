"""Typed API contracts for collections."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _required_text(value: str, field_name: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError(f"{field_name} must not be blank")
    return stripped


class CollectionCreate(BaseModel):
    """Payload for creating a collection."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _required_text(value, "name")

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        return _required_text(value, "description")


class CollectionUpdate(CollectionCreate):
    """Payload for replacing editable collection fields."""


class CollectionResponse(BaseModel):
    """Canonical collection representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    item_ids: list[UUID] = Field(default_factory=list)
    item_count: int = 0
    favorite: bool = False
    types: list[str] = Field(default_factory=list)
