"""HTTP routes for collection listing and creation."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.api.auth import CsrfAuthDependency, CurrentAuthDependency
from devstash.core.database import get_session
from devstash.schemas.collection import CollectionCreate, CollectionResponse
from devstash.services.collection import CollectionService

router = APIRouter(prefix="/api/collections", tags=["collections"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=list[CollectionResponse])
async def list_collections(
    session: SessionDependency, auth: CurrentAuthDependency
) -> list[CollectionResponse]:
    """Return the current user's collections newest first."""

    collections = await CollectionService(session, auth.user.id).list_collections()
    return [CollectionResponse.model_validate(collection) for collection in collections]


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    payload: CollectionCreate,
    session: SessionDependency,
    response: Response,
    auth: CsrfAuthDependency,
) -> CollectionResponse:
    """Create and return one user-owned collection."""

    collection = await CollectionService(session, auth.user.id).create_collection(
        payload
    )
    response.headers["Location"] = f"/api/collections/{collection.id}"
    return CollectionResponse.model_validate(collection)
