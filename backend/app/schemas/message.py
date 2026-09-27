from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime

class MessageListResponse(BaseModel):
    messages: list[MessageResponse]