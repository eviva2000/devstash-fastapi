"""Database operations for accounts, sessions, and authentication limits."""

from datetime import datetime
from typing import cast

from sqlalchemy import delete, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.models.auth import AuthRateLimit, AuthSession, User


class AuthRepository:
    """Keep authentication persistence behind one boundary."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_user_by_email(self, email: str) -> User | None:
        return cast(
            User | None,
            await self._session.scalar(select(User).where(User.email == email)),
        )

    async def get_session_with_user(
        self, token_hash: str
    ) -> tuple[AuthSession, User] | None:
        result = await self._session.execute(
            select(AuthSession, User)
            .join(User, User.id == AuthSession.user_id)
            .where(AuthSession.token_hash == token_hash)
        )
        row = result.one_or_none()
        return None if row is None else (row[0], row[1])

    def add_user(self, user: User) -> None:
        self._session.add(user)

    def add_session(self, auth_session: AuthSession) -> None:
        self._session.add(auth_session)

    async def increment_limit(
        self,
        *,
        action: str,
        key_hash: str,
        window_started_at: datetime,
    ) -> int:
        statement = (
            insert(AuthRateLimit)
            .values(
                action=action,
                key_hash=key_hash,
                window_started_at=window_started_at,
                attempt_count=1,
            )
            .on_conflict_do_update(
                index_elements=[
                    AuthRateLimit.action,
                    AuthRateLimit.key_hash,
                    AuthRateLimit.window_started_at,
                ],
                set_={"attempt_count": AuthRateLimit.attempt_count + 1},
            )
            .returning(AuthRateLimit.attempt_count)
        )
        count = await self._session.scalar(statement)
        if count is None:
            raise RuntimeError("Rate-limit counter did not return a value")
        return int(count)

    async def get_limit_count(
        self,
        *,
        action: str,
        key_hash: str,
        window_started_at: datetime,
    ) -> int:
        count = await self._session.scalar(
            select(AuthRateLimit.attempt_count).where(
                AuthRateLimit.action == action,
                AuthRateLimit.key_hash == key_hash,
                AuthRateLimit.window_started_at == window_started_at,
            )
        )
        return count or 0

    async def purge_stale_sessions(self, cutoff: datetime) -> None:
        await self._session.execute(
            delete(AuthSession).where(
                or_(
                    AuthSession.expires_at < cutoff,
                    AuthSession.revoked_at < cutoff,
                )
            )
        )
