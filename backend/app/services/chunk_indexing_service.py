import uuid
import logging
from typing import Literal

from qdrant_client.models import PointStruct
from sqlalchemy.orm import Session as DBSession

from app.models.chunk import Chunk
from app.core import encryption, embedding as embedding_core, vector_store
from app.services import chunking_service
from app.core.job_config import MAX_ATTEMPTS
from app.models.message import Message


log = logging.getLogger(__name__)


def embed_and_upsert_chunk(db: DBSession, dek: bytes, chunk_row: Chunk, plaintext: str) -> bool:
    try:
        vector = embedding_core.generate_embedding(plaintext, task_type="RETRIEVAL_DOCUMENT")
        vector_store.client.upsert(
            collection_name=vector_store.COLLECTION_NAME,
            points=[PointStruct(
                id=str(chunk_row.id),
                vector=vector,
                payload={"user_id": str(chunk_row.user_id), "chunk_id": str(chunk_row.id)},
            )],
        )
        chunk_row.embedding_status = "completed"
        db.add(chunk_row)
        db.commit()
        return True
    except Exception:
        db.rollback()
        log.exception("Embedding/upsert failed for chunk %s", chunk_row.id)
        chunk_row.embedding_status = "failed"
        chunk_row.embedding_attempts = (chunk_row.embedding_attempts or 0) + 1
        db.add(chunk_row)
        db.commit()
        return False


def recompute_message_status(db: DBSession, message_id) -> None:
    chunks = db.query(Chunk).filter(Chunk.message_id == message_id).all()
    if not chunks:
        return
    message = db.query(Message).filter(Message.id == message_id).first()
    if message is None:
        return
    if all(chunk.embedding_status == "completed" for chunk in chunks):
        message.embedding_status = "completed"
    elif any(
        chunk.embedding_status == "failed" and chunk.embedding_attempts >= MAX_ATTEMPTS
        for chunk in chunks
    ):
        message.embedding_status = "failed"
    else:
        return
    db.add(message)
    db.commit()


def index_content(
    db: DBSession,
    dek: bytes,
    user_id,
    content: str,
    source_type: Literal["capture", "message"],
    capture_id=None,
    message_id=None,
) -> tuple[int, int]:
    """Chunks, encrypts, stores, and embeds `content`, tied to exactly one
    of capture_id/message_id (matching the chunks table's CHECK constraint).
    Returns (total_chunks, embedded_chunks)."""
    assert (capture_id is None) != (message_id is None), "exactly one of capture_id/message_id required"

    chunk_datas = chunking_service.chunk_text(content)
    embedded_count = 0

    for chunk_data in chunk_datas:
        chunk_row = Chunk(
            capture_id=capture_id,
            message_id=message_id,
            source_type=source_type,
            user_id=user_id,
            chunk_index=chunk_data.chunk_index,
            encrypted_content=encryption.encrypt_chunk(dek, chunk_data.content),
            token_count=chunk_data.token_count,
            embedding_status="pending",
        )
        db.add(chunk_row)
        db.commit()
        db.refresh(chunk_row)

        if embed_and_upsert_chunk(db, dek, chunk_row, chunk_data.content):
            embedded_count += 1

    return len(chunk_datas), embedded_count