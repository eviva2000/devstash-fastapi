"""Require explicit ownership for every item.

Revision ID: 20260901_0005
Revises: 20260901_0004
Create Date: 2026-09-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260901_0005"
down_revision: str | Sequence[str] | None = "20260901_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Reject unmapped legacy rows, then enforce owner-scoped item storage."""

    connection = op.get_bind()
    unmapped_count = connection.scalar(
        sa.text("SELECT count(*) FROM items WHERE owner_id IS NULL")
    )
    if unmapped_count:
        raise RuntimeError(
            "Legacy items require an explicit owner mapping before upgrading to "
            "20260901_0005"
        )

    op.alter_column("items", "owner_id", existing_type=sa.Uuid(), nullable=False)
    op.create_index(
        "ix_items_owner_updated_at_id",
        "items",
        ["owner_id", sa.text("updated_at DESC"), sa.text("id DESC")],
        unique=False,
    )


def downgrade() -> None:
    """Permit ownership remapping while retaining existing owner values."""

    op.drop_index("ix_items_owner_updated_at_id", table_name="items")
    op.alter_column("items", "owner_id", existing_type=sa.Uuid(), nullable=True)
