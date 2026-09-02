"""Item use cases and transaction ownership."""

from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.models.item import Item
from devstash.repositories.item import ItemRepository
from devstash.schemas.item import ItemCreate, ItemType, ItemUpdate


class ItemNotFound(Exception):
    """Raised when an item ID does not exist."""


class InvalidItem(Exception):
    """Raised when a partial update would produce an invalid item."""


class ItemService:
    """Implement item workflows and explicit transaction boundaries."""

    def __init__(self, session: AsyncSession, owner_id: UUID) -> None:
        self._session = session
        self._owner_id = owner_id
        self._repository = ItemRepository(session)

    async def list_items(
        self,
        *,
        query: str | None,
        item_type: ItemType | None,
        language: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Item], int]:
        return await self._repository.list(
            owner_id=self._owner_id,
            query=query,
            item_type=item_type,
            language=language,
            page=page,
            page_size=page_size,
        )

    async def get_item(self, item_id: UUID) -> Item:
        item = await self._repository.get(self._owner_id, item_id)
        if item is None:
            raise ItemNotFound
        return item

    async def create_item(self, payload: ItemCreate) -> Item:
        item = Item(owner_id=self._owner_id, **payload.model_dump(mode="json"))
        self._repository.add(item)
        await self._commit()
        await self._session.refresh(item)
        return item

    async def update_item(self, item_id: UUID, payload: ItemUpdate) -> Item:
        item = await self.get_item(item_id)
        values = payload.model_dump(exclude_unset=True, mode="json")
        next_type = values.get("item_type", item.item_type)
        next_language = values.get("language", item.language)
        if next_type != ItemType.SNIPPET and next_language is not None:
            raise InvalidItem("language is only supported for snippets")
        for field, value in values.items():
            setattr(item, field, value)
        await self._commit()
        await self._session.refresh(item)
        return item

    async def delete_item(self, item_id: UUID) -> None:
        item = await self.get_item(item_id)
        await self._repository.delete(item)
        await self._commit()

    async def _commit(self) -> None:
        try:
            await self._session.commit()
        except SQLAlchemyError:
            await self._session.rollback()
            raise
