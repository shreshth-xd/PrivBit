from uuid import UUID
import logging

import json
import logging
from uuid import UUID

from app.core import encryption, llm
from app.core.job_config import JOB_LOCK_TTL_SECONDS, MAX_ATTEMPTS
from app.core.pool import SessionLocal
from app.core.queue import redis_conn
from app.models.capture import Capture
from app.models.chunk import Chunk
from app.models.message import Message
from app.models.user import User
from app.services import chunk_indexing_service


log = logging.getLogger(__name__)


def _publish_status(capture_id: str, status: str) -> None:
    redis_conn.publish(f"capture:{capture_id}:events", json.dumps({"status": status}))


def _finish_failed(db, capture_id: str) -> None:
    db.rollback()
    capture = db.query(Capture).filter(Capture.id == UUID(capture_id)).first()
    if capture is None:
        return
    if capture.processing_attempts >= MAX_ATTEMPTS:
        capture.status = "failed"
        db.add(capture)
        db.commit()
        _publish_status(capture_id, "failed")
    else:
        capture.status = "processing"
        db.add(capture)
        db.commit()


def process_new_capture(capture_id: str, user_id: str, content: str | None = None) -> None:
    del content
    lock_key = f"lock:capture:{capture_id}"
    if not redis_conn.set(lock_key, "1", nx=True, ex=JOB_LOCK_TTL_SECONDS):
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        capture = db.query(Capture).filter(Capture.id == UUID(capture_id)).first()
        if user is None or capture is None:
            return

        capture.processing_attempts += 1
        db.add(capture)
        db.commit()
        dek = encryption.decrypt_dek(user.encrypted_dek)
        plaintext = encryption.decrypt_chunk(dek, capture.encrypted_content)
        failed_step = False

        has_capture_chunks = db.query(Chunk.id).filter(Chunk.capture_id == capture.id).first() is not None
        if not has_capture_chunks:
            chunk_indexing_service.index_content(
                db, dek, user.id, plaintext, source_type="capture", capture_id=capture.id,
            )

        if capture.encrypted_title is None:
            try:
                title = llm.generate_title(plaintext)
                capture.encrypted_title = encryption.encrypt_chunk(dek, title)
                db.add(capture)
                db.commit()
            except Exception:
                log.exception("Capture title generation failed for capture %s", capture_id)
                db.rollback()
                failed_step = True

        initial_message = db.query(Message).filter(
            Message.capture_id == capture.id,
            Message.message_index == 0,
        ).first()
        if initial_message is None:
            initial_message = Message(
                capture_id=capture.id,
                user_id=user.id,
                role="user",
                encrypted_content=encryption.encrypt_chunk(dek, plaintext),
                message_index=0,
                embedding_status=None,
            )
            db.add(initial_message)
            db.commit()

        has_assistant_message = db.query(Message.id).filter(
            Message.capture_id == capture.id,
            Message.role == "assistant",
        ).first() is not None
        if not has_assistant_message:
            try:
                history = [
                    {"role": message.role, "content": encryption.decrypt_chunk(dek, message.encrypted_content)}
                    for message in db.query(Message)
                    .filter(Message.capture_id == capture.id)
                    .order_by(Message.message_index)
                    .all()
                ]
                reply = llm.generate_reply(history)
                messages = db.query(Message).filter(Message.capture_id == capture.id).all()
                next_index = max(message.message_index for message in messages) + 1
                db.add(Message(
                    capture_id=capture.id,
                    user_id=user.id,
                    role="assistant",
                    encrypted_content=encryption.encrypt_chunk(dek, reply),
                    message_index=next_index,
                    embedding_status=None,
                ))
                db.commit()
            except Exception:
                log.exception("Initial reply generation failed for capture %s", capture_id)
                db.rollback()
                failed_step = True

        if failed_step:
            _finish_failed(db, capture_id)
            return

        capture = db.query(Capture).filter(Capture.id == UUID(capture_id)).first()
        capture.status = "ready"
        db.add(capture)
        db.commit()
        _publish_status(capture_id, "ready")
    except Exception:
        log.exception("Unexpected capture processing failure for capture %s", capture_id)
        _finish_failed(db, capture_id)
    finally:
        db.close()
        redis_conn.delete(lock_key)