"""Integration tests for account and session APIs."""

import asyncio
import logging
from collections.abc import AsyncGenerator, Iterator
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from alembic import command
from alembic.config import Config
from argon2 import Type, extract_parameters
from fastapi.testclient import TestClient
from psycopg import connect
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from devstash.core.database import get_session, session_context
from devstash.main import app
from devstash.services.auth_security import get_password_manager

TRUSTED_ORIGIN = "http://127.0.0.1:5173"


@pytest.fixture
def auth_client(configured_database_url: str) -> Iterator[TestClient]:
    """Run auth requests against an isolated migrated PostgreSQL database."""

    command.upgrade(Config("alembic.ini"), "head")
    engine = create_async_engine(configured_database_url)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_session() -> AsyncGenerator[AsyncSession]:
        async with session_context(factory) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    try:
        with TestClient(app, base_url=TRUSTED_ORIGIN) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_session, None)

        async def clean_up() -> None:
            async with engine.begin() as connection:
                await connection.execute(
                    text(
                        "TRUNCATE TABLE items, auth_sessions, auth_rate_limits, "
                        "users CASCADE"
                    )
                )
            await engine.dispose()

        asyncio.run(clean_up())


def _credentials(email: str = "developer@example.com") -> dict[str, str]:
    return {"email": email, "password": "correct horse battery staple"}


def _direct_connection_url(database_url: str) -> str:
    return (
        make_url(database_url)
        .set(drivername="postgresql")
        .render_as_string(hide_password=False)
    )


class _CoordinatedPasswordManager:
    """Pause concurrent verifications until every request passed its pre-check."""

    def __init__(self, participants: int) -> None:
        self._barrier = Barrier(participants)

    async def hash(self, _password: str) -> str:
        raise AssertionError("The concurrent login test must not hash a password")

    async def verify(self, _password_hash: str | None, _password: str) -> bool:
        await asyncio.to_thread(self._barrier.wait, 10)
        return False

    def needs_rehash(self, _password_hash: str) -> bool:
        return False


def test_register_creates_private_cookie_session(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/users",
        json=_credentials("  Developer@Example.com "),
        headers={"Origin": TRUSTED_ORIGIN},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "developer@example.com"
    assert body["csrf_token"]
    assert "password" not in response.text.lower()
    assert response.headers["location"] == "/api/session"
    assert response.headers["cache-control"] == "no-store"
    cookie = response.headers["set-cookie"].lower()
    assert "devstash_session=" in cookie
    assert "httponly" in cookie
    assert "samesite=lax" in cookie

    restored = auth_client.get("/api/session")
    assert restored.status_code == 200
    assert restored.json()["user"] == body["user"]
    assert restored.json()["csrf_token"] == body["csrf_token"]


def test_duplicate_registration_uses_normalized_email(auth_client: TestClient) -> None:
    first = auth_client.post(
        "/api/users",
        json=_credentials("developer@example.com"),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    duplicate = auth_client.post(
        "/api/users",
        json=_credentials("DEVELOPER@example.com"),
        headers={"Origin": TRUSTED_ORIGIN},
    )

    assert first.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json() == {"detail": "Account could not be created"}


@pytest.mark.parametrize(
    ("email", "password", "expected_status"),
    [
        ("twelve@example.com", "x" * 12, 201),
        ("maximum@example.com", "x" * 128, 201),
        ("short@example.com", "x" * 11, 422),
        ("long@example.com", "x" * 129, 422),
        ("not-an-email", "correct horse battery staple", 422),
    ],
)
def test_registration_validates_credential_boundaries(
    auth_client: TestClient,
    email: str,
    password: str,
    expected_status: int,
) -> None:
    response = auth_client.post(
        "/api/users",
        json={"email": email, "password": password},
        headers={"Origin": TRUSTED_ORIGIN},
    )

    assert response.status_code == expected_status
    assert password not in response.text


def test_registration_rejects_an_untrusted_origin(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/users",
        json=_credentials(),
        headers={"Origin": "https://attacker.example"},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Request rejected"}
    assert response.headers["cache-control"] == "no-store"


def test_login_errors_do_not_reveal_whether_account_exists(
    auth_client: TestClient,
) -> None:
    auth_client.post(
        "/api/users",
        json=_credentials(),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    auth_client.cookies.clear()

    wrong_password = auth_client.post(
        "/api/sessions",
        json={**_credentials(), "password": "this password is incorrect"},
        headers={"Origin": TRUSTED_ORIGIN},
    )
    unknown_account = auth_client.post(
        "/api/sessions",
        json=_credentials("missing@example.com"),
        headers={"Origin": TRUSTED_ORIGIN},
    )

    assert wrong_password.status_code == 401
    assert unknown_account.status_code == 401
    assert (
        wrong_password.json()
        == unknown_account.json()
        == {"detail": "Invalid email or password"}
    )


def test_logout_requires_csrf_and_revokes_session(auth_client: TestClient) -> None:
    registered = auth_client.post(
        "/api/users",
        json=_credentials(),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    csrf_token = registered.json()["csrf_token"]

    rejected = auth_client.delete("/api/session", headers={"Origin": TRUSTED_ORIGIN})
    assert rejected.status_code == 403
    restored = auth_client.get("/api/session")
    assert restored.status_code == 200
    csrf_token = restored.json()["csrf_token"]

    logged_out = auth_client.delete(
        "/api/session",
        headers={"Origin": TRUSTED_ORIGIN, "X-CSRF-Token": csrf_token},
    )
    assert logged_out.status_code == 204
    assert "max-age=0" in logged_out.headers["set-cookie"].lower()
    assert auth_client.get("/api/session").status_code == 401

    assert auth_client.delete("/api/session").status_code == 204


def test_credentials_are_hashed_and_never_reflected(
    auth_client: TestClient, configured_database_url: str
) -> None:
    password = "a private passphrase"
    registered = auth_client.post(
        "/api/users",
        json={"email": "secure@example.com", "password": password},
        headers={"Origin": TRUSTED_ORIGIN},
    )
    assert registered.status_code == 201
    session_token = auth_client.cookies.get("devstash_session")
    csrf_token = registered.json()["csrf_token"]

    with connect(_direct_connection_url(configured_database_url)) as connection:
        password_hash = connection.execute(
            "SELECT password_hash FROM users WHERE email = %s",
            ("secure@example.com",),
        ).fetchone()
        session_hashes = connection.execute(
            "SELECT token_hash, csrf_token_hash FROM auth_sessions"
        ).fetchone()

    assert password_hash is not None and password_hash[0].startswith("$argon2id$")
    assert password not in password_hash[0]
    parameters = extract_parameters(password_hash[0])
    assert parameters.type is Type.ID
    assert parameters.time_cost == 3
    assert parameters.memory_cost == 65_536
    assert parameters.parallelism == 4
    assert parameters.hash_len == 32
    assert parameters.salt_len == 16
    assert session_hashes is not None
    assert session_token not in session_hashes
    assert csrf_token not in session_hashes

    invalid_password = "too-short"
    invalid = auth_client.post(
        "/api/users",
        json={"email": "invalid@example.com", "password": invalid_password},
        headers={"Origin": TRUSTED_ORIGIN},
    )
    assert invalid.status_code == 422
    assert invalid_password not in invalid.text


def test_authentication_credentials_are_not_logged(
    auth_client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    email = "private-identity@example.com"
    password = "private credential value"
    caplog.set_level(logging.INFO)

    response = auth_client.post(
        "/api/sessions",
        json={"email": email, "password": password},
        headers={"Origin": TRUSTED_ORIGIN},
    )

    assert response.status_code == 401
    assert email not in caplog.text
    assert password not in caplog.text


@pytest.mark.parametrize("session_token", [None, "malformed-session-token"])
def test_missing_and_malformed_sessions_share_the_safe_error(
    auth_client: TestClient, session_token: str | None
) -> None:
    auth_client.cookies.clear()
    if session_token is not None:
        auth_client.cookies.set("devstash_session", session_token)

    response = auth_client.get("/api/session")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}
    assert "max-age=0" in response.headers["set-cookie"].lower()


def test_failed_login_is_rate_limited(auth_client: TestClient) -> None:
    auth_client.post(
        "/api/users",
        json=_credentials(),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    auth_client.cookies.clear()
    wrong = {**_credentials(), "password": "this password is incorrect"}

    for _ in range(5):
        assert (
            auth_client.post(
                "/api/sessions", json=wrong, headers={"Origin": TRUSTED_ORIGIN}
            ).status_code
            == 401
        )

    limited = auth_client.post(
        "/api/sessions", json=wrong, headers={"Origin": TRUSTED_ORIGIN}
    )
    assert limited.status_code == 429
    assert int(limited.headers["retry-after"]) > 0


def test_concurrent_failed_logins_cannot_exceed_the_limit(
    auth_client: TestClient,
) -> None:
    registered = auth_client.post(
        "/api/users",
        json=_credentials(),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    assert registered.status_code == 201
    auth_client.cookies.clear()
    wrong = {**_credentials(), "password": "this password is incorrect"}
    participants = 8
    passwords = _CoordinatedPasswordManager(participants)
    app.dependency_overrides[get_password_manager] = lambda: passwords

    def attempt_login(_attempt: int) -> int:
        with TestClient(
            app,
            base_url=TRUSTED_ORIGIN,
            client=("203.0.113.10", 50_000),
        ) as client:
            return client.post(
                "/api/sessions",
                json=wrong,
                headers={"Origin": TRUSTED_ORIGIN},
            ).status_code

    try:
        with ThreadPoolExecutor(max_workers=participants) as executor:
            statuses = list(executor.map(attempt_login, range(participants)))
    finally:
        app.dependency_overrides.pop(get_password_manager, None)

    assert statuses.count(401) == 5
    assert statuses.count(429) == participants - 5


def test_failed_login_is_rate_limited_per_account_across_sources(
    auth_client: TestClient,
) -> None:
    registered = auth_client.post(
        "/api/users",
        json=_credentials(),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    assert registered.status_code == 201
    wrong = {**_credentials(), "password": "this password is incorrect"}

    for attempt in range(5):
        with TestClient(
            app,
            base_url=TRUSTED_ORIGIN,
            client=(f"198.51.100.{attempt + 1}", 50_000),
        ) as client:
            assert (
                client.post(
                    "/api/sessions",
                    json=wrong,
                    headers={"Origin": TRUSTED_ORIGIN},
                ).status_code
                == 401
            )

    with TestClient(
        app,
        base_url=TRUSTED_ORIGIN,
        client=("198.51.100.6", 50_000),
    ) as client:
        limited = client.post(
            "/api/sessions",
            json=wrong,
            headers={"Origin": TRUSTED_ORIGIN},
        )
    assert limited.status_code == 429


def test_failed_login_is_rate_limited_per_source_across_accounts(
    auth_client: TestClient,
) -> None:
    for attempt in range(6):
        registered = auth_client.post(
            "/api/users",
            json=_credentials(f"developer-{attempt}@example.com"),
            headers={"Origin": TRUSTED_ORIGIN},
        )
        assert registered.status_code == 201
    auth_client.cookies.clear()

    for attempt in range(5):
        wrong = {
            **_credentials(f"developer-{attempt}@example.com"),
            "password": "this password is incorrect",
        }
        assert (
            auth_client.post(
                "/api/sessions",
                json=wrong,
                headers={"Origin": TRUSTED_ORIGIN},
            ).status_code
            == 401
        )

    limited = auth_client.post(
        "/api/sessions",
        json={
            **_credentials("developer-5@example.com"),
            "password": "this password is incorrect",
        },
        headers={"Origin": TRUSTED_ORIGIN},
    )
    assert limited.status_code == 429


def test_registration_is_rate_limited_by_source(auth_client: TestClient) -> None:
    for attempt in range(10):
        response = auth_client.post(
            "/api/users",
            json=_credentials(f"developer-{attempt}@example.com"),
            headers={"Origin": TRUSTED_ORIGIN},
        )
        assert response.status_code == 201

    limited = auth_client.post(
        "/api/users",
        json=_credentials("developer-11@example.com"),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    assert limited.status_code == 429
    assert int(limited.headers["retry-after"]) > 0


def test_idle_session_expires_and_cookie_is_cleared(
    auth_client: TestClient, configured_database_url: str
) -> None:
    auth_client.post(
        "/api/users",
        json=_credentials(),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    with connect(_direct_connection_url(configured_database_url)) as connection:
        connection.execute(
            "UPDATE auth_sessions SET last_seen_at = now() - interval '31 minutes'"
        )
        connection.commit()

    expired = auth_client.get("/api/session")
    assert expired.status_code == 401
    assert "max-age=0" in expired.headers["set-cookie"].lower()


def test_absolute_session_expiry_is_enforced(
    auth_client: TestClient, configured_database_url: str
) -> None:
    auth_client.post(
        "/api/users",
        json=_credentials(),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    with connect(_direct_connection_url(configured_database_url)) as connection:
        connection.execute(
            "UPDATE auth_sessions SET expires_at = now() - interval '1 second'"
        )
        connection.commit()

    expired = auth_client.get("/api/session")
    assert expired.status_code == 401
    assert "max-age=0" in expired.headers["set-cookie"].lower()


def test_multiple_browser_sessions_remain_valid(auth_client: TestClient) -> None:
    auth_client.post(
        "/api/users",
        json=_credentials(),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    first_token = auth_client.cookies.get("devstash_session")
    assert first_token is not None
    auth_client.cookies.clear()
    signed_in = auth_client.post(
        "/api/sessions",
        json=_credentials(),
        headers={"Origin": TRUSTED_ORIGIN},
    )
    assert signed_in.status_code == 200
    second_token = auth_client.cookies.get("devstash_session")
    assert first_token != second_token

    with TestClient(app, base_url=TRUSTED_ORIGIN) as first_browser:
        first_browser.cookies.set("devstash_session", first_token)
        assert first_browser.get("/api/session").status_code == 200
    assert auth_client.get("/api/session").status_code == 200
