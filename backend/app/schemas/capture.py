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