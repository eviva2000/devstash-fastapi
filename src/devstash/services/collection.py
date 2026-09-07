"""Collection use cases and transaction ownership."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.models.collection import Collection
from devstash.models.item import Item
from devstash.repositories.collection import CollectionRepository
from devstash.repositories.item import ItemRepository
from devstash.schemas.collection import CollectionCreate, CollectionUpdate


class CollectionNotFound(Exception):
    """Raised when a collection is absent from the owner's workspace."""


class CollectionService:
    """Implement owner-scoped collection workflows."""

    def __init__(self, session: AsyncSession, owner_id: UUID) -> None:
        self._session = session
        self._owner_id = owner_id
        self._repository = CollectionRepository(session)
        self._item_repository = ItemRepository(session)

    async def list_collections(self) -> list[Collection]:
        return await self._repository.list(self._owner_id)

    async def create_collection(self, payload: CollectionCreate) -> Collection:
        collection = Collection(owner_id=self._owner_id, **payload.model_dump())
        self._repository.add(collection)
        await self._commit()
        await self._session.refresh(collection)
        return collection

    async def update_collection(
        self, collection_id: UUID, payload: CollectionUpdate
    ) -> Collection:
        collection = await self._get_collection(collection_id)
        collection.name = payload.name
        collection.description = payload.description
        await self._commit()
        await self._session.refresh(collection)
        return collection

    async def delete_collection(self, collection_id: UUID) -> None:
        collection = await self._get_collection(collection_id)
        await self._repository.delete(collection)
        await self._commit()

    async def add_item(self, collection_id: UUID, item_id: UUID) -> Collection:
        collection, item = await self._get_membership_resources(collection_id, item_id)
        if item not in collection.items:
            collection.items.append(item)
            collection.updated_at = datetime.now(UTC)
            await self._commit()
            await self._session.refresh(collection, ["items"])
        return collection

    async def remove_item(self, collection_id: UUID, item_id: UUID) -> Collection:
        collection, item = await self._get_membership_resources(collection_id, item_id)
        if item in collection.items:
            collection.items.remove(item)
            collection.updated_at = datetime.now(UTC)
            await self._commit()
            await self._session.refresh(collection, ["items"])
        return collection

    async def _get_membership_resources(
        self, collection_id: UUID, item_id: UUID
    ) -> tuple[Collection, Item]:
        collection = await self._get_collection(collection_id)
        item = await self._item_repository.get(self._owner_id, item_id)
        if item is None:
            raise CollectionNotFound
        return collection, item

    async def _get_collection(self, collection_id: UUID) -> Collection:
        collection = await self._repository.get(self._owner_id, collection_id)
        if collection is None:
            raise CollectionNotFound
        return collection

    async def _commit(self) -> None:
        try:
            await self._session.commit()
        except SQLAlchemyError:
            await self._session.rollback()
            raise
