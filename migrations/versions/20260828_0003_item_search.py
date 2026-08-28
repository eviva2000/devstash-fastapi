"""Add full-text search support for items.

Revision ID: 20260828_0003
Revises: 20260826_0002
Create Date: 2026-08-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260828_0003"
down_revision: str | Sequence[str] | None = "20260826_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add an indexed generated vector for title and content search."""

    op.add_column(
        "items",
        sa.Column(
            "search_vector",
            postgresql.TSVECTOR(),
            sa.Computed(
                "to_tsvector('english', coalesce(title, '') || ' ' "
                "|| coalesce(content, ''))",
                persisted=True,
            ),
            nullable=False,
        ),
    )
    op.create_index(
        op.f("ix_items_search_vector"),
        "items",
        ["search_vector"],
        unique=False,
        postgresql_using="gin",
    )


def downgrade() -> None:
    """Remove full-text search support."""

    op.drop_index(op.f("ix_items_search_vector"), table_name="items")
    op.drop_column("items", "search_vector")
