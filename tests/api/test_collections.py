"""Integration tests for collection listing and creation."""

import asyncio
from collections.abc import AsyncGenerator, Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from devstash.core.database import get_session, session_context
from devstash.main import app

TRUSTED_ORIGIN = "http://127.0.0.1:5173"


@pytest.fixture
def collection_client(configured_database_url: str) -> Iterator[TestClient]:
    """Run collection requests against a migrated disposable database."""

    command.upgrade(Config("alembic.ini"), "head")
    engine = create_async_engine(configured_database_url)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_session() -> AsyncGenerator[AsyncSession]:
        async with session_context(factory) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    try:
        with TestClient(app, base_url=TRUSTED_ORIGIN) as client:
            registered = client.post(
                "/api/users",
                json={
                    "email": "collections-owner@example.com",
                    "password": "correct horse battery staple",
                },
                headers={"Origin": TRUSTED_ORIGIN},
            )
            assert registered.status_code == 201
            client.headers.update(
                {
                    "Origin": TRUSTED_ORIGIN,
                    "X-CSRF-Token": registered.json()["csrf_token"],
                }
            )
            yield client
    finally:
        app.dependency_overrides.pop(get_session, None)

        async def clean_up() -> None:
            async with engine.begin() as connection:
                await connection.execute(
                    text(
                        "TRUNCATE TABLE collections, items, auth_sessions, "
                        "auth_rate_limits, users CASCADE"
                    )
                )
            await engine.dispose()

        asyncio.run(clean_up())


def test_create_and_list_collections_newest_first(
    collection_client: TestClient,
) -> None:
    first = collection_client.post(
        "/api/collections",
        json={"name": "  Backend  ", "description": "  API references  "},
    )
    second = collection_client.post(
        "/api/collections",
        json={"name": "Frontend", "description": "React patterns"},
    )

    assert first.status_code == 201
    assert first.json()["name"] == "Backend"
    assert first.json()["description"] == "API references"
    assert first.json()["item_count"] == 0
    assert first.json()["favorite"] is False
    assert first.json()["types"] == []
    assert "owner_id" not in first.json()
    assert first.headers["location"] == f"/api/collections/{first.json()['id']}"
    assert second.status_code == 201

    listed = collection_client.get("/api/collections")
    assert listed.status_code == 200
    assert [entry["id"] for entry in listed.json()] == [
        second.json()["id"],
        first.json()["id"],
    ]


@pytest.mark.parametrize(
    "payload",
    [
        {"name": " ", "description": "Useful"},
        {"name": "Useful", "description": "\n\t"},
        {"name": "x" * 201, "description": "Useful"},
        {"name": "Useful", "description": "x" * 2001},
        {"name": "Useful", "description": "Useful", "owner_id": "forbidden"},
    ],
)
def test_create_rejects_invalid_collection_payloads(
    collection_client: TestClient, payload: dict[str, str]
) -> None:
    response = collection_client.post("/api/collections", json=payload)

    assert response.status_code == 422
    assert "postgres" not in response.text.lower()


def test_collection_endpoints_require_authentication_and_csrf(
    collection_client: TestClient,
) -> None:
    collection_client.headers.pop("X-CSRF-Token")
    assert (
        collection_client.post(
            "/api/collections",
            json={"name": "No CSRF", "description": "Rejected"},
        ).status_code
        == 403
    )

    collection_client.cookies.clear()
    assert collection_client.get("/api/collections").status_code == 401
    assert (
        collection_client.post(
            "/api/collections",
            json={"name": "Anonymous", "description": "Rejected"},
        ).status_code
        == 401
    )


def test_collection_listing_is_scoped_to_authenticated_owner(
    collection_client: TestClient,
) -> None:
    created = collection_client.post(
        "/api/collections",
        json={"name": "Private", "description": "First user's collection"},
    )
    assert created.status_code == 201

    registered = collection_client.post(
        "/api/users",
        json={
            "email": "second-collections-owner@example.com",
            "password": "correct horse battery staple",
        },
    )
    assert registered.status_code == 201
    collection_client.headers["X-CSRF-Token"] = registered.json()["csrf_token"]

    assert collection_client.get("/api/collections").json() == []
