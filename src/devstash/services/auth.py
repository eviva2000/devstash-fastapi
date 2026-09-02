"""Account registration and session lifecycle use cases."""

import hashlib
import hmac
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.models.auth import AuthSession, User
from devstash.repositories.auth import AuthRepository
from devstash.services.auth_security import (
    PasswordManager,
    derive_csrf_token,
    generate_opaque_token,
    hash_opaque_token,
)

REGISTRATION_WINDOW = timedelta(hours=1)
REGISTRATION_LIMIT = 10
LOGIN_WINDOW = timedelta(minutes=15)
LOGIN_FAILURE_LIMIT = 5
SESSION_IDLE_LIFETIME = timedelta(minutes=30)
SESSION_ABSOLUTE_LIFETIME = timedelta(days=30)
SESSION_RETENTION = timedelta(days=30)


class DuplicateAccount(Exception):
    """Raised when normalized account identity already exists."""


class InvalidCredentials(Exception):
    """Raised for every failed email/password authentication attempt."""


class InvalidSession(Exception):
    """Raised when an opaque session is absent, expired, or revoked."""


class InvalidCsrf(Exception):
    """Raised when an unsafe request lacks the session's CSRF proof."""


@dataclass(frozen=True)
class RateLimited(Exception):
    """Raised when an authentication attempt exceeds its fixed window."""

    retry_after: int


@dataclass(frozen=True)
class CreatedSession:
    """A user plus raw credentials returned only at session creation."""

    user: User
    session_token: str
    csrf_token: str


@dataclass(frozen=True)
class AuthenticatedSession:
    """The trusted account and session resolved from an opaque credential."""

    user: User
    auth_session: AuthSession
    session_token: str


def _window_start(now: datetime, window: timedelta) -> datetime:
    seconds = int(window.total_seconds())
    return datetime.fromtimestamp(int(now.timestamp()) // seconds * seconds, tz=UTC)


def _limit_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class AuthService:
    """Own account/session transactions and security policy."""

    def __init__(self, session: AsyncSession, passwords: PasswordManager) -> None:
        self._session = session
        self._repository = AuthRepository(session)
        self._passwords = passwords

    async def register(
        self, *, email: str, password: str, source_ip: str
    ) -> CreatedSession:
        now = datetime.now(UTC)
        window_start = _window_start(now, REGISTRATION_WINDOW)
        count = await self._repository.increment_limit(
            action="register",
            key_hash=_limit_key(source_ip),
            window_started_at=window_start,
        )
        await self._commit()
        if count > REGISTRATION_LIMIT:
            retry_after = int(
                (window_start + REGISTRATION_WINDOW - now).total_seconds()
            )
            raise RateLimited(max(1, retry_after))

        if await self._repository.get_user_by_email(email) is not None:
            raise DuplicateAccount

        user = User(email=email, password_hash=await self._passwords.hash(password))
        self._repository.add_user(user)
        try:
            await self._session.flush()
            created = self._new_session(user, now)
            await self._repository.purge_stale_sessions(now - SESSION_RETENTION)
            await self._commit()
        except IntegrityError as error:
            raise DuplicateAccount from error
        await self._session.refresh(user)
        return created

    async def login(
        self, *, email: str, password: str, source_ip: str
    ) -> CreatedSession:
        now = datetime.now(UTC)
        window_start = _window_start(now, LOGIN_WINDOW)
        retry_after = max(1, int((window_start + LOGIN_WINDOW - now).total_seconds()))
        source_key_hash = _limit_key(source_ip)
        account_key_hash = _limit_key(email)
        source_count = await self._repository.get_limit_count(
            action="login_failure_source",
            key_hash=source_key_hash,
            window_started_at=window_start,
        )
        account_count = await self._repository.get_limit_count(
            action="login_failure_account",
            key_hash=account_key_hash,
            window_started_at=window_start,
        )
        if source_count >= LOGIN_FAILURE_LIMIT or account_count >= LOGIN_FAILURE_LIMIT:
            raise RateLimited(retry_after)

        user = await self._repository.get_user_by_email(email)
        password_hash = user.password_hash if user is not None else None
        if not await self._passwords.verify(password_hash, password):
            source_count = await self._repository.increment_limit(
                action="login_failure_source",
                key_hash=source_key_hash,
                window_started_at=window_start,
            )
            account_count = await self._repository.increment_limit(
                action="login_failure_account",
                key_hash=account_key_hash,
                window_started_at=window_start,
            )
            await self._commit()
            if (
                source_count > LOGIN_FAILURE_LIMIT
                or account_count > LOGIN_FAILURE_LIMIT
            ):
                raise RateLimited(retry_after)
            raise InvalidCredentials

        if user is None:
            raise InvalidCredentials
        if self._passwords.needs_rehash(user.password_hash):
            user.password_hash = await self._passwords.hash(password)
        created = self._new_session(user, now)
        await self._repository.purge_stale_sessions(now - SESSION_RETENTION)
        await self._commit()
        await self._session.refresh(user)
        return created

    async def authenticate(self, session_token: str | None) -> AuthenticatedSession:
        if session_token is None:
            raise InvalidSession
        record = await self._repository.get_session_with_user(
            hash_opaque_token(session_token)
        )
        if record is None:
            raise InvalidSession
        auth_session, user = record
        now = datetime.now(UTC)
        is_idle = auth_session.last_seen_at < now - SESSION_IDLE_LIFETIME
        if (
            auth_session.revoked_at is not None
            or auth_session.expires_at <= now
            or is_idle
        ):
            if auth_session.revoked_at is None:
                auth_session.revoked_at = now
                await self._commit()
            raise InvalidSession
        auth_session.last_seen_at = now
        await self._commit()
        return AuthenticatedSession(user, auth_session, session_token)

    def current_csrf(self, auth: AuthenticatedSession) -> str:
        return derive_csrf_token(auth.session_token)

    def require_csrf(self, auth: AuthenticatedSession, csrf_token: str | None) -> None:
        candidate_hash = hash_opaque_token(csrf_token or "")
        if not hmac.compare_digest(auth.auth_session.csrf_token_hash, candidate_hash):
            raise InvalidCsrf

    async def logout(self, auth: AuthenticatedSession) -> None:
        auth.auth_session.revoked_at = datetime.now(UTC)
        await self._commit()

    def _new_session(self, user: User, now: datetime) -> CreatedSession:
        session_token = generate_opaque_token()
        csrf_token = derive_csrf_token(session_token)
        self._repository.add_session(
            AuthSession(
                user_id=user.id,
                token_hash=hash_opaque_token(session_token),
                csrf_token_hash=hash_opaque_token(csrf_token),
                created_at=now,
                last_seen_at=now,
                expires_at=now + SESSION_ABSOLUTE_LIFETIME,
            )
        )
        return CreatedSession(user, session_token, csrf_token)

    async def _commit(self) -> None:
        try:
            await self._session.commit()
        except SQLAlchemyError:
            await self._session.rollback()
            raise
