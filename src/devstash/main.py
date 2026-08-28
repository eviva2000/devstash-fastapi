"""Application entry point and HTTP routes."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from devstash.api.items import router as items_router


class HealthResponse(BaseModel):
    """Response body returned by the health endpoint."""

    status: Literal["ok"]
    service: Literal["devstash-api"]


app = FastAPI(
    title="DevStash API",
    version="0.1.0",
)
app.include_router(items_router)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """Report that the API process is ready to receive requests."""

    return HealthResponse(status="ok", service="devstash-api")
