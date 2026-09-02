"""Database operations for items."""

from typing import cast
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from devstash.models.item import Item
from devstash.schemas.item import ItemType


class ItemRepository:
    """Keep item queries behind one persistence boundary."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(
        self,
        *,
        owner_id: UUID,
        query: str | None,
        item_type: ItemType | None,
        language: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Item], int]:
        filters: list[ColumnElement[bool]] = [Item.owner_id == owner_id]
        if query is not None:
            filters.append(
                Item.search_vector.op("@@")(func.websearch_to_tsquery("english", query))
            )
        if item_type is not None:
            filters.append(Item.item_type == item_type)
        if language is not None:
            filters.append(Item.language == language)

        count_statement = select(func.count()).select_from(Item)
        statement = select(Item)
        if filters:
            count_statement = count_statement.where(*filters)
            statement = statement.where(*filters)
        total = await self._session.scalar(count_statement)
        statement = (
            statement.order_by(Item.updated_at.desc(), Item.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self._session.scalars(statement)
        return list(result.all()), total or 0

    async def get(self, owner_id: UUID, item_id: UUID) -> Item | None:
        return cast(
            Item | None,
            await self._session.scalar(
                select(Item).where(Item.id == item_id, Item.owner_id == owner_id)
            ),
        )

    def add(self, item: Item) -> None:
        self._session.add(item)

    async def delete(self, item: Item) -> None:
        await self._session.delete(item)
