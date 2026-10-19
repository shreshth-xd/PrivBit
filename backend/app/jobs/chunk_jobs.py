import logging
from uuid import UUID

from app.core import encryption
from app.core.job_config import JOB_LOCK_TTL_SECONDS
from app.core.pool import SessionLocal
from app.core.queue import redis_conn
from app.models.chunk import Chunk
from app.models.message import Message
from app.models.user import User
from app.services import chunk_indexing_service


log = logging.getLogger(__name__)


def retry_chunk_embedding(chunk_id: str, user_id: str) -> None:
    lock_key = f"lock:chunk:{chunk_id}"
    if not redis_conn.set(lock_key, "1", nx=True, ex=JOB_LOCK_TTL_SECONDS):
        return
    db = SessionLocal()
    try:
        chunk = db.query(Chunk).filter(
            Chunk.id == UUID(chunk_id),
            Chunk.user_id == UUID(user_id),
        ).first()
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if chunk is None or user is None or chunk.embedding_status == "completed":
            return

        dek = encryption.decrypt_dek(user.encrypted_dek)
        plaintext = encryption.decrypt_chunk(dek, chunk.encrypted_content)
        chunk_indexing_service.embed_and_upsert_chunk(db, dek, chunk, plaintext)
        if chunk.message_id is not None:
            chunk_indexing_service.recompute_message_status(db, chunk.message_id)
    except Exception:
        db.rollback()
        log.exception("Chunk embedding retry failed for chunk %s", chunk_id)
        raise
    finally:
        db.close()
        redis_conn.delete(lock_key)