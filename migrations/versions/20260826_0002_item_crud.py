"""Add the initial text-item table.

Revision ID: 20260826_0002
Revises: 20260825_0001
Create Date: 2026-08-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260826_0002"
down_revision: str | Sequence[str] | None = "20260825_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create items and its validation and listing indexes."""

    op.create_table(
        "items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("item_type", sa.String(length=20), nullable=False),
        sa.Column("language", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "item_type IN ('snippet', 'prompt', 'command', 'note')",
            name=op.f("ck_items_item_type_valid"),
        ),
        sa.CheckConstraint("btrim(title) <> ''", name=op.f("ck_items_title_not_blank")),
        sa.CheckConstraint(
            "btrim(content) <> ''", name=op.f("ck_items_content_not_blank")
        ),
        sa.CheckConstraint(
            "language IS NULL OR item_type = 'snippet'",
            name=op.f("ck_items_language_for_snippet"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_items")),
    )
    op.create_index(
        op.f("ix_items_updated_at_id"),
        "items",
        [sa.text("updated_at DESC"), sa.text("id DESC")],
        unique=False,
    )


def downgrade() -> None:
    """Remove the initial item schema."""

    op.drop_index(op.f("ix_items_updated_at_id"), table_name="items")
    op.drop_table("items")
