from uuid import UUID
from pydantic import BaseModel

class SearchRequest(BaseModel):
    query: str

class SearchResponse(BaseModel):
    answer: str
    sources_count: int
    sources: list["SourceItem"]


class SourceItem(BaseModel):
    capture_id: UUID
    title: str | None