"""Tests for the health endpoint."""

from fastapi.testclient import TestClient

from devstash.main import app

client = TestClient(app)


def test_health_check_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "devstash-api"}
    assert response.headers["content-type"].startswith("application/json")
