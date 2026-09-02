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

TRUSTED_ORIGIN = "http://127.0.0.1:5173"


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
        with TestClient(app, base_url=TRUSTED_ORIGIN) as client:
            registered = client.post(
                "/api/users",
                json={
                    "email": "items-owner@example.com",
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
                        "TRUNCATE TABLE items, auth_sessions, auth_rate_limits, "
                        "users CASCADE"
                    )
                )
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
    assert [item["id"] for item in listed.json()["items"]] == [
        first["id"],
        second["id"],
    ]
    assert listed.json()["total"] == 2

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
    assert response.json() == {"items": [], "page": 1, "page_size": 12, "total": 0}


def test_list_searches_filters_and_paginates_items(item_client: TestClient) -> None:
    auth = item_client.post(
        "/api/items",
        json={
            **_item_payload(),
            "title": "Auth hook",
            "content": "Reusable React authentication helper",
            "language": "typescript",
        },
    ).json()
    note = item_client.post(
        "/api/items",
        json={
            **_item_payload("note"),
            "title": "Release checklist",
            "content": "Deploy the API safely",
        },
    ).json()
    item_client.post(
        "/api/items",
        json={
            **_item_payload(),
            "title": "Python helper",
            "content": "Reusable utility",
            "language": "python",
        },
    )

    searched = item_client.get("/api/items", params={"q": "authentication"})
    assert searched.status_code == 200
    assert [entry["id"] for entry in searched.json()["items"]] == [auth["id"]]
    assert searched.json()["total"] == 1

    filtered = item_client.get(
        "/api/items",
        params={
            "q": "utility",
            "item_type": "snippet",
            "language": "python",
        },
    )
    assert filtered.status_code == 200
    assert [entry["title"] for entry in filtered.json()["items"]] == ["Python helper"]

    paged = item_client.get("/api/items", params={"page": 2, "page_size": 1})
    assert paged.status_code == 200
    assert paged.json()["page"] == 2
    assert paged.json()["page_size"] == 1
    assert paged.json()["total"] == 3
    assert paged.json()["items"][0]["id"] == note["id"]


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 51}])
def test_list_rejects_invalid_pagination(
    item_client: TestClient, params: dict[str, int]
) -> None:
    assert item_client.get("/api/items", params=params).status_code == 422


def test_item_endpoints_require_authentication(item_client: TestClient) -> None:
    item_client.cookies.clear()
    item_id = str(uuid4())

    assert item_client.get("/api/items").status_code == 401
    assert item_client.post("/api/items", json=_item_payload()).status_code == 401
    assert item_client.get(f"/api/items/{item_id}").status_code == 401
    assert (
        item_client.patch(
            f"/api/items/{item_id}", json={"title": "Updated"}
        ).status_code
        == 401
    )
    assert item_client.delete(f"/api/items/{item_id}").status_code == 401


@pytest.mark.parametrize("provided_csrf", [None, "incorrect-csrf-proof"])
def test_item_mutations_reject_invalid_csrf_without_changes(
    item_client: TestClient, provided_csrf: str | None
) -> None:
    owned = item_client.post("/api/items", json=_item_payload("note"))
    assert owned.status_code == 201
    item_id = owned.json()["id"]
    original_csrf = item_client.headers.pop("X-CSRF-Token")
    headers = {} if provided_csrf is None else {"X-CSRF-Token": provided_csrf}

    try:
        rejected_create = item_client.post(
            "/api/items", json=_item_payload("command"), headers=headers
        )
        rejected_update = item_client.patch(
            f"/api/items/{item_id}", json={"title": "Tampered"}, headers=headers
        )
        rejected_delete = item_client.delete(f"/api/items/{item_id}", headers=headers)

        assert rejected_create.status_code == 403
        assert rejected_update.status_code == 403
        assert rejected_delete.status_code == 403
        unchanged = item_client.get(f"/api/items/{item_id}")
        assert unchanged.status_code == 200
        assert unchanged.json()["title"] == owned.json()["title"]
        assert item_client.get("/api/items").json()["total"] == 1
    finally:
        item_client.headers["X-CSRF-Token"] = original_csrf


def test_users_cannot_discover_or_mutate_each_others_items(
    item_client: TestClient,
) -> None:
    forged = item_client.post(
        "/api/items",
        json={**_item_payload("note"), "owner_id": str(uuid4())},
    )
    assert forged.status_code == 422

    owned = item_client.post("/api/items", json=_item_payload("note"))
    assert owned.status_code == 201, owned.text
    item_id = owned.json()["id"]

    with TestClient(app, base_url=TRUSTED_ORIGIN) as other_client:
        registered = other_client.post(
            "/api/users",
            json={
                "email": "other-owner@example.com",
                "password": "correct horse battery staple",
            },
            headers={"Origin": TRUSTED_ORIGIN},
        )
        assert registered.status_code == 201
        other_client.headers.update(
            {
                "Origin": TRUSTED_ORIGIN,
                "X-CSRF-Token": registered.json()["csrf_token"],
            }
        )

        assert other_client.get("/api/items").json()["total"] == 0
        assert other_client.get(f"/api/items/{item_id}").status_code == 404
        assert (
            other_client.patch(
                f"/api/items/{item_id}", json={"title": "Stolen"}
            ).status_code
            == 404
        )
        assert other_client.delete(f"/api/items/{item_id}").status_code == 404

    assert item_client.get(f"/api/items/{item_id}").json()["title"] != "Stolen"


def test_search_filters_counts_and_pagination_are_owner_scoped(
    item_client: TestClient,
) -> None:
    owned_ids = {
        item_client.post(
            "/api/items",
            json={
                **_item_payload(),
                "title": "First isolation marker",
                "content": "private isolationmarker content",
            },
        ).json()["id"],
        item_client.post(
            "/api/items",
            json={
                **_item_payload(),
                "title": "Second isolation marker",
                "content": "private isolationmarker content",
            },
        ).json()["id"],
    }

    with TestClient(app, base_url=TRUSTED_ORIGIN) as other_client:
        registered = other_client.post(
            "/api/users",
            json={
                "email": "filtered-owner@example.com",
                "password": "correct horse battery staple",
            },
            headers={"Origin": TRUSTED_ORIGIN},
        )
        assert registered.status_code == 201
        foreign = other_client.post(
            "/api/items",
            json={
                **_item_payload(),
                "title": "Foreign isolation marker",
                "content": "private isolationmarker content",
            },
            headers={
                "Origin": TRUSTED_ORIGIN,
                "X-CSRF-Token": registered.json()["csrf_token"],
            },
        )
        assert foreign.status_code == 201

    first_page = item_client.get(
        "/api/items",
        params={
            "q": "isolationmarker",
            "item_type": "snippet",
            "language": "python",
            "page": 1,
            "page_size": 1,
        },
    )
    second_page = item_client.get(
        "/api/items",
        params={
            "q": "isolationmarker",
            "item_type": "snippet",
            "language": "python",
            "page": 2,
            "page_size": 1,
        },
    )

    assert first_page.status_code == second_page.status_code == 200
    assert first_page.json()["total"] == second_page.json()["total"] == 2
    listed_ids = {
        first_page.json()["items"][0]["id"],
        second_page.json()["items"][0]["id"],
    }
    assert listed_ids == owned_ids
