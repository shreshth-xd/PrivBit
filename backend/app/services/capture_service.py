from uuid import UUID
from qdrant_client.models import PointStruct

from sqlalchemy.orm import Session as DBSession

from app.models.capture import Capture
from app.models.chunk import Chunk
from app.models.user import User
from app.core import encryption, embedding as embedding_core, vector_store
from app.services import chunking_service


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

    # 2. Chunk the plaintext.
    chunk_datas = chunking_service.chunk_text(content)

    embedded_count = 0

    for chunk_data in chunk_datas:
        # 3. Encrypt + insert chunk row first (pending), so a failure below
        #    (embedding API down, etc.) leaves a recoverable row, not silent data loss.
        chunk_row = Chunk(
            capture_id=capture.id,
            user_id=user.id,
            chunk_index=chunk_data.chunk_index,
            encrypted_content=encryption.encrypt_chunk(dek, chunk_data.content),
            token_count=chunk_data.token_count,
            embedding_status="pending",
        )
        db.add(chunk_row)
        db.commit()
        db.refresh(chunk_row)

        # 4. Embed plaintext (never encrypted content) + upsert to Qdrant.
        try:
            vector = embedding_core.generate_embedding(
                chunk_data.content, task_type="RETRIEVAL_DOCUMENT"
            )
            vector_store.client.upsert(
                collection_name=vector_store.COLLECTION_NAME,
                points=[
                    PointStruct(
                        id=str(chunk_row.id),
                        vector=vector,
                        payload={"user_id": str(user.id), "chunk_id": str(chunk_row.id)},
                    )
                ],
            )
            chunk_row.embedding_status = "completed"
            embedded_count += 1
        except Exception:
            chunk_row.embedding_status = "failed"

        db.add(chunk_row)
        db.commit()

    return capture, len(chunk_datas), embedded_count