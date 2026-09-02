"""Add users, sessions, rate limits, and nullable item ownership.

Revision ID: 20260901_0004
Revises: 20260828_0003
Create Date: 2026-09-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260901_0004"
down_revision: str | Sequence[str] | None = "20260828_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create authentication storage and the legacy ownership mapping column."""

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("csrf_token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_auth_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_auth_sessions_token_hash")),
    )
    op.create_index(
        op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False
    )
    op.create_index(
        "ix_auth_sessions_active_lookup",
        "auth_sessions",
        ["token_hash", "expires_at", "revoked_at"],
        unique=False,
    )
    op.create_table(
        "auth_rate_limits",
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "attempt_count > 0", name=op.f("ck_auth_rate_limits_count_positive")
        ),
        sa.PrimaryKeyConstraint(
            "action",
            "key_hash",
            "window_started_at",
            name=op.f("pk_auth_rate_limits"),
        ),
    )
    op.create_index(
        op.f("ix_auth_rate_limits_window_started_at"),
        "auth_rate_limits",
        ["window_started_at"],
        unique=False,
    )
    op.add_column(
        "items",
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        op.f("fk_items_owner_id_users"),
        "items",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(op.f("ix_items_owner_id"), "items", ["owner_id"], unique=False)


def downgrade() -> None:
    """Remove authentication storage and item ownership."""

    op.drop_index(op.f("ix_items_owner_id"), table_name="items")
    op.drop_constraint(op.f("fk_items_owner_id_users"), "items", type_="foreignkey")
    op.drop_column("items", "owner_id")
    op.drop_index(
        op.f("ix_auth_rate_limits_window_started_at"),
        table_name="auth_rate_limits",
    )
    op.drop_table("auth_rate_limits")
    op.drop_index("ix_auth_sessions_active_lookup", table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_user_id"), table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_table("users")
