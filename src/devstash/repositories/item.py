"""Database operations for items."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.models.item import Item


class ItemRepository:
    """Keep item queries behind one persistence boundary."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> list[Item]:
        statement = select(Item).order_by(Item.updated_at.desc(), Item.id.desc())
        result = await self._session.scalars(statement)
        return list(result.all())

    async def get(self, item_id: UUID) -> Item | None:
        return await self._session.get(Item, item_id)

    def add(self, item: Item) -> None:
        self._session.add(item)

    async def delete(self, item: Item) -> None:
        await self._session.delete(item)
