"""Password and opaque-token primitives for authentication workflows."""

import hashlib
import hmac
import secrets
from functools import lru_cache

from anyio import to_thread
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

ARGON2_TIME_COST = 3
ARGON2_MEMORY_COST_KIB = 65_536
ARGON2_PARALLELISM = 4
ARGON2_HASH_LENGTH = 32
ARGON2_SALT_LENGTH = 16


def hash_opaque_token(token: str) -> str:
    """Return a stable one-way digest for a high-entropy opaque token."""

    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_opaque_token() -> str:
    """Create a URL-safe credential with 256 bits of entropy."""

    return secrets.token_urlsafe(32)


def derive_csrf_token(session_token: str) -> str:
    """Derive a stable CSRF proof keyed by the secret session credential."""

    return hmac.new(
        session_token.encode("utf-8"), b"devstash-csrf-v1", hashlib.sha256
    ).hexdigest()


class PasswordManager:
    """Keep Argon2 work off the async event loop."""

    def __init__(self, hasher: PasswordHasher | None = None) -> None:
        self._hasher = hasher or PasswordHasher(
            time_cost=ARGON2_TIME_COST,
            memory_cost=ARGON2_MEMORY_COST_KIB,
            parallelism=ARGON2_PARALLELISM,
            hash_len=ARGON2_HASH_LENGTH,
            salt_len=ARGON2_SALT_LENGTH,
        )
        self._dummy_hash = self._hasher.hash(generate_opaque_token())

    async def hash(self, password: str) -> str:
        return await to_thread.run_sync(self._hasher.hash, password)

    async def verify(self, password_hash: str | None, password: str) -> bool:
        candidate_hash = password_hash or self._dummy_hash
        try:
            return await to_thread.run_sync(
                self._hasher.verify, candidate_hash, password
            )
        except (InvalidHashError, VerificationError):
            return False

    def needs_rehash(self, password_hash: str) -> bool:
        return self._hasher.check_needs_rehash(password_hash)


@lru_cache
def get_password_manager() -> PasswordManager:
    """Return one process-wide password hashing policy."""

    return PasswordManager()
