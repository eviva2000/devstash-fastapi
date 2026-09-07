"""Database operations for collections."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.models.collection import Collection


class CollectionRepository:
    """Keep collection queries behind one owner-scoped boundary."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self, owner_id: UUID) -> list[Collection]:
        result = await self._session.scalars(
            select(Collection)
            .where(Collection.owner_id == owner_id)
            .order_by(Collection.created_at.desc(), Collection.id.desc())
        )
        return list(result.all())

    def add(self, collection: Collection) -> None:
        self._session.add(collection)
