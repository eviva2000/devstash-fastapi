"""Serve the built frontend without masking missing API or asset paths."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def mount_frontend(app: FastAPI, directory: Path) -> None:
    """Register static assets and the client-side router after API routes."""

    app.mount("/assets", StaticFiles(directory=directory / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        if path == "api" or path.startswith("api/") or "." in Path(path).name:
            raise HTTPException(status_code=404)
        return FileResponse(directory / "index.html")
