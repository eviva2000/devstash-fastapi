"""Application entry point and HTTP routes."""

from collections.abc import Awaitable, Callable
from typing import Literal

from fastapi import FastAPI, Request, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from devstash.api.auth import router as auth_router
from devstash.api.items import router as items_router
from devstash.core.config import get_settings


class HealthResponse(BaseModel):
    """Response body returned by the health endpoint."""

    status: Literal["ok"]
    service: Literal["devstash-api"]


app = FastAPI(
    title="DevStash API",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(get_settings().trusted_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "X-CSRF-Token"],
)
app.include_router(auth_router)
app.include_router(items_router)


@app.middleware("http")
async def security_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Apply browser hardening and prevent authentication response caching."""

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    if request.url.path in {"/api/users", "/api/sessions", "/api/session"}:
        response.headers["Cache-Control"] = "no-store"
    if get_settings().environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    _request: object, error: RequestValidationError
) -> JSONResponse:
    """Preserve FastAPI errors without reflecting submitted passwords."""

    errors: list[dict[str, object]] = []
    for entry in error.errors():
        sanitized = dict(entry)
        if "password" in entry.get("loc", ()):
            sanitized.pop("input", None)
        errors.append(sanitized)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": jsonable_encoder(errors)},
    )


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """Report that the API process is ready to receive requests."""

    return HealthResponse(status="ok", service="devstash-api")
