"""Add collection item membership.

Revision ID: 20260907_0007
Revises: 20260904_0006
Create Date: 2026-09-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260907_0007"
down_revision: str | Sequence[str] | None = "20260904_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the many-to-many collection membership table."""

    op.create_table(
        "collection_items",
        sa.Column("collection_id", sa.Uuid(), nullable=False),
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["collection_id"], ["collections.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("collection_id", "item_id"),
    )
    op.create_index("ix_collection_items_item_id", "collection_items", ["item_id"])


def downgrade() -> None:
    """Remove collection membership storage."""

    op.drop_index("ix_collection_items_item_id", table_name="collection_items")
    op.drop_table("collection_items")
