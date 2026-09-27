from uuid import UUID
from qdrant_client.models import PointStruct

from sqlalchemy.orm import Session as DBSession

from app.models.capture import Capture
from app.models.chunk import Chunk
from app.models.user import User
from app.core import encryption, embedding as embedding_core, vector_store
from app.services import chunking_service
from app.services import chunk_indexing_service


def create_capture(db: DBSession, user: User, content: str) -> tuple[Capture, int, int]:
    dek = encryption.decrypt_dek(user.encrypted_dek)

    # 1. Store the full original, encrypted — source of truth, not reconstructable
    #    from chunks alone (they overlap by design).
    capture = Capture(
        user_id=user.id,
        encrypted_content=encryption.encrypt_chunk(dek, content),
    )
    db.add(capture)
    db.commit()
    db.refresh(capture)

    # 2-4. Chunk, encrypt, embed, upsert — shared with message_service.post_message.
    total_chunks, embedded_chunks = chunk_indexing_service.index_content(
        db, dek, user.id, content, source_type="capture", capture_id=capture.id,
    )

    return capture, total_chunks, embedded_chunks


def list_captures(db: DBSession, user: User) -> list[Capture]:
    return (
        db.query(Capture)
        .filter(Capture.user_id == user.id)
        .order_by(Capture.created_at.desc())
        .all()
    )