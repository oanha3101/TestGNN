from typing import Generic, List, TypeVar

from pydantic import BaseModel, Field

ItemT = TypeVar("ItemT")


class Page(BaseModel, Generic[ItemT]):
    """Envelope returned by list endpoints that accept ``limit`` / ``offset``.

    ``total`` reflects the full unpaginated row count so clients can render
    pagers / infinite-scroll sentinels without firing a second request.
    """

    items: List[ItemT]
    total: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)


DEFAULT_LIMIT = 20
MAX_LIMIT = 100
