"""HTTP routes for item CRUD."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.core.database import get_session
from devstash.schemas.item import (
    ItemCreate,
    ItemListResponse,
    ItemResponse,
    ItemType,
    ItemUpdate,
)
from devstash.services.item import InvalidItem, ItemNotFound, ItemService

router = APIRouter(prefix="/api/items", tags=["items"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def _parse_item_id(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        ) from error


async def _get_item(service: ItemService, item_id: str) -> ItemResponse:
    try:
        return ItemResponse.model_validate(
            await service.get_item(_parse_item_id(item_id))
        )
    except ItemNotFound as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        ) from error


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    payload: ItemCreate, session: SessionDependency, response: Response
) -> ItemResponse:
    """Create and return one text item."""

    item = await ItemService(session).create_item(payload)
    response.headers["Location"] = f"/api/items/{item.id}"
    return ItemResponse.model_validate(item)


@router.get("", response_model=ItemListResponse)
async def list_items(
    session: SessionDependency,
    q: str | None = Query(default=None, max_length=200),
    item_type: ItemType | None = None,
    language: str | None = Query(default=None, max_length=64),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
) -> ItemListResponse:
    """Return a filtered, deterministic page of items."""

    query = q.strip() if q is not None else None
    items, total = await ItemService(session).list_items(
        query=query or None,
        item_type=item_type,
        language=language.strip() or None if language is not None else None,
        page=page,
        page_size=page_size,
    )
    return ItemListResponse(
        items=[ItemResponse.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: str, session: SessionDependency) -> ItemResponse:
    """Return one item or a stable not-found response."""

    return await _get_item(ItemService(session), item_id)


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: str, payload: ItemUpdate, session: SessionDependency
) -> ItemResponse:
    """Apply a validated partial item update."""

    service = ItemService(session)
    try:
        item = await service.update_item(_parse_item_id(item_id), payload)
    except ItemNotFound as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        ) from error
    except InvalidItem as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error
    return ItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: str, session: SessionDependency) -> Response:
    """Permanently delete one item."""

    try:
        await ItemService(session).delete_item(_parse_item_id(item_id))
    except ItemNotFound as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        ) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
