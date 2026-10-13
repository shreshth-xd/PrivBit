from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class CaptureCreate(BaseModel):
    content: str

class CaptureResponse(BaseModel):
    id: UUID
    created_at: datetime
    status: str  # "processing" — chunking/embedding/title/reply all happen in the background

class CaptureListItem(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime

class CaptureListResponse(BaseModel):
    captures: list[CaptureListItem]

class CaptureTitleUpdate(BaseModel):
    title: str