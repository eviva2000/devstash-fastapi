"""SQLAlchemy persistence model for user collections."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Table,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from devstash.core.database import Base

if TYPE_CHECKING:
    from devstash.models.item import Item


collection_items = Table(
    "collection_items",
    Base.metadata,
    Column(
        "collection_id",
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("collections.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "item_id",
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("items.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    ),
)


class Collection(Base):
    """A named group owned by one developer."""

    __tablename__ = "collections"
    __table_args__ = (
        CheckConstraint("btrim(name) <> ''", name="name_not_blank"),
        CheckConstraint("btrim(description) <> ''", name="description_not_blank"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    owner_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(2000))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    items: Mapped[list["Item"]] = relationship(
        secondary=collection_items, lazy="selectin", order_by="Item.id"
    )

    @property
    def item_ids(self) -> list[UUID]:
        return [item.id for item in self.items]

    @property
    def item_count(self) -> int:
        return len(self.items)

    @property
    def types(self) -> list[str]:
        return sorted({item.item_type for item in self.items})

    @property
    def favorite(self) -> bool:
        return False


Index(
    "ix_collections_owner_created_at_id",
    Collection.owner_id,
    Collection.created_at.desc(),
    Collection.id.desc(),
)
