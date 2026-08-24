"""Application entry point and HTTP routes."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Response body returned by the health endpoint."""

    status: Literal["ok"]


app = FastAPI(
    title="DevStash API",
    version="0.1.0",
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """Report that the API process is ready to receive requests."""

    return HealthResponse(status="ok")
