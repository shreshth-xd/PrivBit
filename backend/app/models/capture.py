# app/models/capture.py
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, LargeBinary, func, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

class Capture(Base):
    __tablename__ = "captures"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Encrypted like content, for the same privacy reasons — a title alone
    # can leak meaningful information about what a capture contains.
    # Nullable: can be set by the user immediately, or generated later
    # (e.g. via an LLM summarization pass over the capture's content).
    encrypted_title: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    # The full original capture text, AES-GCM encrypted under the user's DEK.
    # Source of truth for display/editing — NOT reconstructable from chunks
    # alone, since chunks overlap by design.
    encrypted_content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="processing")