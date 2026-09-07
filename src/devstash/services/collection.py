"""Collection use cases and transaction ownership."""

from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from devstash.models.collection import Collection
from devstash.repositories.collection import CollectionRepository
from devstash.schemas.collection import CollectionCreate


class CollectionService:
    """Implement owner-scoped collection workflows."""

    def __init__(self, session: AsyncSession, owner_id: UUID) -> None:
        self._session = session
        self._owner_id = owner_id
        self._repository = CollectionRepository(session)

    async def list_collections(self) -> list[Collection]:
        return await self._repository.list(self._owner_id)

    async def create_collection(self, payload: CollectionCreate) -> Collection:
        collection = Collection(owner_id=self._owner_id, **payload.model_dump())
        self._repository.add(collection)
        try:
            await self._session.commit()
        except SQLAlchemyError:
            await self._session.rollback()
            raise
        await self._session.refresh(collection)
        return collection
