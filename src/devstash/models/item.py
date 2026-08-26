"""SQLAlchemy persistence model for text items."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from devstash.core.database import Base


class Item(Base):
    """A persisted snippet, prompt, command, or note."""

    __tablename__ = "items"
    __table_args__ = (
        CheckConstraint(
            "item_type IN ('snippet', 'prompt', 'command', 'note')",
            name="item_type_valid",
        ),
        CheckConstraint("btrim(title) <> ''", name="title_not_blank"),
        CheckConstraint("btrim(content) <> ''", name="content_not_blank"),
        CheckConstraint(
            "language IS NULL OR item_type = 'snippet'",
            name="language_for_snippet",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    item_type: Mapped[str] = mapped_column(String(20))
    language: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


Index("ix_items_updated_at_id", Item.updated_at.desc(), Item.id.desc())
