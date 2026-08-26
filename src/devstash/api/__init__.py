"""FastAPI routers for DevStash resources."""

from devstash.api.items import router as items_router

__all__ = ["items_router"]
