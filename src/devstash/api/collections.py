"""HTTP routes for collection listing and creation."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.api.auth import CsrfAuthDependency, CurrentAuthDependency
from devstash.core.database import get_session
from devstash.schemas.collection import (
    CollectionCreate,
    CollectionResponse,
    CollectionUpdate,
)
from devstash.services.collection import CollectionNotFound, CollectionService

router = APIRouter(prefix="/api/collections", tags=["collections"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def _parse_collection_id(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found"
        ) from error


def _parse_membership_id(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection or item not found",
        ) from error


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


@router.patch("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: str,
    payload: CollectionUpdate,
    session: SessionDependency,
    auth: CsrfAuthDependency,
) -> CollectionResponse:
    """Replace the editable fields of one owner-scoped collection."""

    try:
        collection = await CollectionService(session, auth.user.id).update_collection(
            _parse_collection_id(collection_id), payload
        )
    except CollectionNotFound as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found"
        ) from error
    return CollectionResponse.model_validate(collection)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: str, session: SessionDependency, auth: CsrfAuthDependency
) -> Response:
    """Permanently delete one owner-scoped collection."""

    try:
        await CollectionService(session, auth.user.id).delete_collection(
            _parse_collection_id(collection_id)
        )
    except CollectionNotFound as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found"
        ) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _change_membership(
    collection_id: str,
    item_id: str,
    session: AsyncSession,
    owner_id: UUID,
    *,
    add: bool,
) -> CollectionResponse:
    service = CollectionService(session, owner_id)
    try:
        collection_uuid = _parse_membership_id(collection_id)
        item_uuid = _parse_membership_id(item_id)
        collection = (
            await service.add_item(collection_uuid, item_uuid)
            if add
            else await service.remove_item(collection_uuid, item_uuid)
        )
    except CollectionNotFound as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection or item not found",
        ) from error
    return CollectionResponse.model_validate(collection)


@router.put("/{collection_id}/items/{item_id}", response_model=CollectionResponse)
async def add_collection_item(
    collection_id: str,
    item_id: str,
    session: SessionDependency,
    auth: CsrfAuthDependency,
) -> CollectionResponse:
    """Idempotently add one owned item to an owned collection."""

    return await _change_membership(
        collection_id, item_id, session, auth.user.id, add=True
    )


@router.delete("/{collection_id}/items/{item_id}", response_model=CollectionResponse)
async def remove_collection_item(
    collection_id: str,
    item_id: str,
    session: SessionDependency,
    auth: CsrfAuthDependency,
) -> CollectionResponse:
    """Idempotently remove one owned item from an owned collection."""

    return await _change_membership(
        collection_id, item_id, session, auth.user.id, add=False
    )
