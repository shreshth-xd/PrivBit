# app/models/chunk.py
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    capture_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("captures.id", ondelete="CASCADE"), nullable=True,
    )
    message_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=True,
    )
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)

    # Denormalized from captures.user_id — avoids a join on every retrieval
    # query, and matches what Qdrant will need as point payload for
    # per-user filtering during semantic search.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)  # order within the capture

    encrypted_content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    token_count: Mapped[int] = mapped_column(Integer, nullable=True)

    # Tracks the Postgres/Qdrant dual-write: a chunk row can exist here
    # before its embedding has successfully landed in Qdrant.
    embedding_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending",  # pending | completed | failed
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )