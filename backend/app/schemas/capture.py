from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class CaptureCreate(BaseModel):
    content: str

class CaptureResponse(BaseModel):
    id: UUID
    created_at: datetime
    chunks_created: int
    chunks_embedded: int


class CaptureListItem(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime

class CaptureListResponse(BaseModel):
    captures: list[CaptureListItem]

class CaptureTitleUpdate(BaseModel):
    title: str