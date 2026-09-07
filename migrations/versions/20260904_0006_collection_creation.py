"""Add user-scoped collections.

Revision ID: 20260904_0006
Revises: 20260901_0005
Create Date: 2026-09-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260904_0006"
down_revision: str | Sequence[str] | None = "20260901_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create owner-scoped collection storage."""

    op.create_table(
        "collections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
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
        sa.CheckConstraint("btrim(description) <> ''", name="description_not_blank"),
        sa.CheckConstraint("btrim(name) <> ''", name="name_not_blank"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_collections_owner_id", "collections", ["owner_id"])
    op.create_index(
        "ix_collections_owner_created_at_id",
        "collections",
        ["owner_id", sa.text("created_at DESC"), sa.text("id DESC")],
    )


def downgrade() -> None:
    """Remove collection storage."""

    op.drop_index("ix_collections_owner_created_at_id", table_name="collections")
    op.drop_index("ix_collections_owner_id", table_name="collections")
    op.drop_table("collections")
