"""Production frontend routing preserves API and asset errors."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from devstash.frontend import mount_frontend


def test_frontend_routes_and_missing_assets(tmp_path: Path) -> None:
    (tmp_path / "index.html").write_text("<h1>DevStash</h1>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("export {}")
    app = FastAPI()
    mount_frontend(app, tmp_path)
    client = TestClient(app)

    assert client.get("/").text == "<h1>DevStash</h1>"
    assert client.get("/dashboard").text == "<h1>DevStash</h1>"
    assert client.get("/assets/app.js").text == "export {}"
    assert client.get("/assets/missing.js").status_code == 404
    assert client.get("/api/missing").status_code == 404
    assert client.post("/dashboard").status_code == 405
