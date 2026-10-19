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


def index_user_message(message_id: str, user_id: str) -> None:
    lock_key = f"lock:message:{message_id}"
    if not redis_conn.set(lock_key, "1", nx=True, ex=JOB_LOCK_TTL_SECONDS):
        return
    db = SessionLocal()
    try:
        message = db.query(Message).filter(
            Message.id == UUID(message_id),
            Message.user_id == UUID(user_id),
            Message.role == "user",
        ).first()
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if message is None or user is None:
            return
        if db.query(Chunk.id).filter(Chunk.message_id == message.id).first() is not None:
            return

        dek = encryption.decrypt_dek(user.encrypted_dek)
        plaintext = encryption.decrypt_chunk(dek, message.encrypted_content)
        chunk_indexing_service.index_content(
            db,
            dek,
            user.id,
            plaintext,
            source_type="message",
            message_id=message.id,
        )
        chunk_indexing_service.recompute_message_status(db, message.id)
    except Exception:
        db.rollback()
        log.exception("User message indexing failed for message %s", message_id)
        raise
    finally:
        db.close()
        redis_conn.delete(lock_key)