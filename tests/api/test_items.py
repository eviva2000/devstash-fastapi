"""Integration tests for the item CRUD API."""

import asyncio
from collections.abc import AsyncGenerator, Iterator
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from devstash.core.database import get_session, session_context
from devstash.main import app


@pytest.fixture
def item_client(configured_database_url: str) -> Iterator[TestClient]:
    """Run API requests against the migrated disposable PostgreSQL database."""

    command.upgrade(Config("alembic.ini"), "head")
    engine = create_async_engine(configured_database_url)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_session() -> AsyncGenerator[AsyncSession]:
        async with session_context(factory) as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_session, None)

        async def clean_up() -> None:
            async with engine.begin() as connection:
                await connection.execute(text("TRUNCATE TABLE items"))
            await engine.dispose()

        asyncio.run(clean_up())


def _item_payload(item_type: str = "snippet") -> dict[str, str | None]:
    return {
        "title": f"Example {item_type}",
        "content": "Reusable developer knowledge",
        "item_type": item_type,
        "language": "python" if item_type == "snippet" else None,
    }


@pytest.mark.parametrize("item_type", ["snippet", "prompt", "command", "note"])
def test_create_supports_each_text_item_type(
    item_client: TestClient, item_type: str
) -> None:
    response = item_client.post("/api/items", json=_item_payload(item_type))

    assert response.status_code == 201
    body = response.json()
    assert body["item_type"] == item_type
    assert response.headers["location"] == f"/api/items/{body['id']}"
    assert body["created_at"] == body["updated_at"]


def test_item_crud_and_recent_first_listing(item_client: TestClient) -> None:
    first = item_client.post("/api/items", json=_item_payload()).json()
    second = item_client.post("/api/items", json=_item_payload("command")).json()

    empty_update = item_client.patch(f"/api/items/{first['id']}", json={})
    assert empty_update.status_code == 422

    invalid_type_change = item_client.patch(
        f"/api/items/{first['id']}", json={"item_type": "note"}
    )
    assert invalid_type_change.status_code == 422

    updated = item_client.patch(
        f"/api/items/{first['id']}",
        json={
            "title": "Updated title",
            "item_type": "note",
            "language": None,
        },
    )
    assert updated.status_code == 200
    updated_body = updated.json()
    assert updated_body["title"] == "Updated title"
    assert updated_body["item_type"] == "note"
    assert updated_body["language"] is None
    assert updated_body["created_at"] == first["created_at"]
    assert updated_body["updated_at"] > first["updated_at"]

    listed = item_client.get("/api/items")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [first["id"], second["id"]]

    fetched = item_client.get(f"/api/items/{first['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == updated_body

    deleted = item_client.delete(f"/api/items/{first['id']}")
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert item_client.get(f"/api/items/{first['id']}").status_code == 404


@pytest.mark.parametrize(
    "payload",
    [
        {"title": " ", "content": "content", "item_type": "note"},
        {"title": "title", "content": "\n\t", "item_type": "note"},
        {"title": "title", "content": "content", "item_type": "unknown"},
        {
            "title": "title",
            "content": "content",
            "item_type": "command",
            "language": "bash",
        },
        {"title": "x" * 201, "content": "content", "item_type": "note"},
        {"title": "title", "content": "x" * 50_001, "item_type": "note"},
        {
            "title": "title",
            "content": "content",
            "item_type": "snippet",
            "language": "x" * 65,
        },
    ],
)
def test_create_rejects_invalid_payloads(
    item_client: TestClient, payload: dict[str, str]
) -> None:
    response = item_client.post("/api/items", json=payload)

    assert response.status_code == 422
    assert "postgres" not in response.text.lower()


def test_missing_and_malformed_item_ids_return_not_found(
    item_client: TestClient,
) -> None:
    for item_id in ("not-a-uuid", str(uuid4())):
        assert item_client.get(f"/api/items/{item_id}").status_code == 404
        assert (
            item_client.patch(
                f"/api/items/{item_id}", json={"title": "Updated"}
            ).status_code
            == 404
        )
        assert item_client.delete(f"/api/items/{item_id}").status_code == 404


def test_empty_database_returns_empty_list(item_client: TestClient) -> None:
    response = item_client.get("/api/items")

    assert response.status_code == 200
    assert response.json() == []
