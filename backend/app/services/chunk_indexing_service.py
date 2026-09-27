import uuid
from typing import Literal

from qdrant_client.models import PointStruct
from sqlalchemy.orm import Session as DBSession

from app.models.chunk import Chunk
from app.core import encryption, embedding as embedding_core, vector_store
from app.services import chunking_service


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

        try:
            vector = embedding_core.generate_embedding(chunk_data.content, task_type="RETRIEVAL_DOCUMENT")
            vector_store.client.upsert(
                collection_name=vector_store.COLLECTION_NAME,
                points=[PointStruct(
                    id=str(chunk_row.id),
                    vector=vector,
                    payload={"user_id": str(user_id), "chunk_id": str(chunk_row.id)},
                )],
            )
            chunk_row.embedding_status = "completed"
            embedded_count += 1
        except Exception:
            chunk_row.embedding_status = "failed"

        db.add(chunk_row)
        db.commit()

    return len(chunk_datas), embedded_count