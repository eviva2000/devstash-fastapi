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


def test_update_and_delete_collection(collection_client: TestClient) -> None:
    created = collection_client.post(
        "/api/collections",
        json={"name": "Original", "description": "Before"},
    ).json()

    updated = collection_client.patch(
        f"/api/collections/{created['id']}",
        json={"name": "  Updated  ", "description": "  After  "},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Updated"
    assert updated.json()["description"] == "After"
    assert updated.json()["updated_at"] >= created["updated_at"]
    assert collection_client.get("/api/collections").json()[0]["name"] == "Updated"

    deleted = collection_client.delete(f"/api/collections/{created['id']}")
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert collection_client.get("/api/collections").json() == []


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
def test_update_rejects_invalid_collection_payloads(
    collection_client: TestClient, payload: dict[str, str]
) -> None:
    created = collection_client.post(
        "/api/collections", json={"name": "Valid", "description": "Valid"}
    ).json()
    response = collection_client.patch(
        f"/api/collections/{created['id']}", json=payload
    )
    assert response.status_code == 422


def test_collection_mutations_hide_non_owned_and_missing_ids(
    collection_client: TestClient,
) -> None:
    created = collection_client.post(
        "/api/collections",
        json={"name": "Private", "description": "First owner"},
    ).json()
    registered = collection_client.post(
        "/api/users",
        json={
            "email": "collection-mutator@example.com",
            "password": "correct horse battery staple",
        },
    )
    collection_client.headers["X-CSRF-Token"] = registered.json()["csrf_token"]

    assert (
        collection_client.patch(
            f"/api/collections/{created['id']}",
            json={"name": "Stolen", "description": "No"},
        ).status_code
        == 404
    )
    assert (
        collection_client.delete(f"/api/collections/{created['id']}").status_code == 404
    )
    assert collection_client.delete("/api/collections/not-a-uuid").status_code == 404


def test_collection_mutations_require_authentication_and_csrf(
    collection_client: TestClient,
) -> None:
    created = collection_client.post(
        "/api/collections", json={"name": "Protected", "description": "Protected"}
    ).json()
    path = f"/api/collections/{created['id']}"
    collection_client.headers.pop("X-CSRF-Token")
    assert (
        collection_client.patch(
            path, json={"name": "No", "description": "No"}
        ).status_code
        == 403
    )
    assert collection_client.delete(path).status_code == 403
    collection_client.cookies.clear()
    assert (
        collection_client.patch(
            path, json={"name": "No", "description": "No"}
        ).status_code
        == 401
    )
    assert collection_client.delete(path).status_code == 401


def test_adds_and_removes_owned_items_from_a_collection(
    collection_client: TestClient,
) -> None:
    collection = collection_client.post(
        "/api/collections", json={"name": "Mixed", "description": "Knowledge"}
    ).json()
    snippet = collection_client.post(
        "/api/items",
        json={
            "title": "Hook",
            "content": "const hook = true",
            "item_type": "snippet",
            "language": "typescript",
        },
    ).json()
    note = collection_client.post(
        "/api/items",
        json={
            "title": "Guide",
            "content": "Remember this",
            "item_type": "note",
            "language": None,
        },
    ).json()

    added = collection_client.put(
        f"/api/collections/{collection['id']}/items/{snippet['id']}"
    )
    assert added.status_code == 200
    assert added.json()["item_ids"] == [snippet["id"]]
    assert added.json()["item_count"] == 1
    assert added.json()["types"] == ["snippet"]
    repeated = collection_client.put(
        f"/api/collections/{collection['id']}/items/{snippet['id']}"
    )
    assert repeated.json()["item_count"] == 1

    added_note = collection_client.put(
        f"/api/collections/{collection['id']}/items/{note['id']}"
    ).json()
    assert set(added_note["item_ids"]) == {snippet["id"], note["id"]}
    assert added_note["item_count"] == 2
    assert added_note["types"] == ["note", "snippet"]
    listed = collection_client.get("/api/collections").json()[0]
    assert listed["item_count"] == 2

    removed = collection_client.delete(
        f"/api/collections/{collection['id']}/items/{snippet['id']}"
    )
    assert removed.status_code == 200
    assert removed.json()["item_ids"] == [note["id"]]
    assert removed.json()["types"] == ["note"]
    repeated_remove = collection_client.delete(
        f"/api/collections/{collection['id']}/items/{snippet['id']}"
    )
    assert repeated_remove.status_code == 200
    assert repeated_remove.json()["item_count"] == 1


def test_collection_membership_requires_owned_resources(
    collection_client: TestClient,
) -> None:
    collection = collection_client.post(
        "/api/collections", json={"name": "Private", "description": "Owner one"}
    ).json()
    item = collection_client.post(
        "/api/items",
        json={
            "title": "Private note",
            "content": "Secret",
            "item_type": "note",
            "language": None,
        },
    ).json()
    registered = collection_client.post(
        "/api/users",
        json={
            "email": "membership-owner@example.com",
            "password": "correct horse battery staple",
        },
    )
    collection_client.headers["X-CSRF-Token"] = registered.json()["csrf_token"]

    assert (
        collection_client.put(
            f"/api/collections/{collection['id']}/items/{item['id']}"
        ).status_code
        == 404
    )
    own_collection = collection_client.post(
        "/api/collections", json={"name": "Mine", "description": "Owner two"}
    ).json()
    assert (
        collection_client.put(
            f"/api/collections/{own_collection['id']}/items/{item['id']}"
        ).status_code
        == 404
    )
