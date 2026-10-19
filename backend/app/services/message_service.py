import logging
from collections.abc import Iterator
from uuid import UUID

from sqlalchemy.orm import Session as DBSession

from app.models.capture import Capture
from app.models.message import Message
from app.models.user import User
from app.core import encryption, llm
from app.core.job_config import JOB_FAILURE_TTL, JOB_RESULT_TTL
from app.core.pool import SessionLocal
from app.core.queue import job_queue
from app.jobs.message_jobs import index_user_message
from app.services import chunk_indexing_service

log = logging.getLogger(__name__)


class ReplyGenerationError(Exception):
    pass


def get_capture_or_404(db: DBSession, user: User, capture_id: UUID) -> Capture:
    capture = (
        db.query(Capture)
        .filter(Capture.id == capture_id, Capture.user_id == user.id)
        .first()
    )
    if capture is None:
        raise ValueError("Capture not found")
    return capture


def _next_message_index(db: DBSession, capture_id: UUID) -> int:
    last = (
        db.query(Message)
        .filter(Message.capture_id == capture_id)
        .order_by(Message.message_index.desc())
        .first()
    )
    return (last.message_index + 1) if last else 0


def _decrypt_thread_history(db: DBSession, dek: bytes, capture: Capture) -> list[dict]:
    messages = (
        db.query(Message)
        .filter(Message.capture_id == capture.id)
        .order_by(Message.message_index.asc())
        .all()
    )
    return [{"role": m.role, "content": encryption.decrypt_chunk(dek, m.encrypted_content)} for m in messages]


def save_user_message(db: DBSession, user: User, capture_id: UUID, content: str) -> tuple[Capture, Message]:
    dek = encryption.decrypt_dek(user.encrypted_dek)
    capture = get_capture_or_404(db, user, capture_id)
    user_msg = Message(
        capture_id=capture.id,
        user_id=user.id,
        role="user",
        encrypted_content=encryption.encrypt_chunk(dek, content),
        message_index=_next_message_index(db, capture.id),
        embedding_status="pending",
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)
    job_queue.enqueue(
        index_user_message,
        str(user_msg.id),
        str(user.id),
        result_ttl=JOB_RESULT_TTL,
        failure_ttl=JOB_FAILURE_TTL,
    )
    return capture, user_msg


def post_message(db: DBSession, user: User, capture_id: UUID, content: str) -> tuple[Message, Message]:
    capture, user_msg = save_user_message(db, user, capture_id, content)
    dek = encryption.decrypt_dek(user.encrypted_dek)
    history = _decrypt_thread_history(db, dek, capture)
    try:
        reply_text = llm.generate_reply(history)
    except llm.LLMError as error:
        raise ReplyGenerationError from error

    assistant_msg = Message(
        capture_id=capture.id,
        user_id=user.id,
        role="assistant",
        encrypted_content=encryption.encrypt_chunk(dek, reply_text),
        message_index=_next_message_index(db, capture.id),
        embedding_status=None,
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return user_msg, assistant_msg


def stream_assistant_reply(user_id: str, capture_id: str) -> Iterator[dict]:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        capture = db.query(Capture).filter(
            Capture.id == UUID(capture_id),
            Capture.user_id == UUID(user_id),
        ).first()
        if user is None or capture is None:
            raise ValueError("Capture not found")
        dek = encryption.decrypt_dek(user.encrypted_dek)
        history = _decrypt_thread_history(db, dek, capture)
        reply_parts: list[str] = []
        for text in llm.stream_reply(history):
            reply_parts.append(text)
            yield {"type": "delta", "text": text}

        reply = "".join(reply_parts)
        if not reply:
            raise llm.LLMError("stream_reply returned no text")
        assistant_msg = Message(
            capture_id=capture.id,
            user_id=user.id,
            role="assistant",
            encrypted_content=encryption.encrypt_chunk(dek, reply),
            message_index=_next_message_index(db, capture.id),
            embedding_status=None,
        )
        db.add(assistant_msg)
        db.commit()
        db.refresh(assistant_msg)
        yield {"type": "done", "message_id": str(assistant_msg.id)}
    except Exception:
        db.rollback()
        log.exception("Assistant stream failed for capture %s", capture_id)
        yield {
            "type": "error",
            "detail": "The AI couldn't reply right now. Please try again.",
        }
    finally:
        db.close()


def list_messages(db: DBSession, user: User, capture_id: UUID) -> list[Message]:
    capture = get_capture_or_404(db, user, capture_id)
    return (
        db.query(Message)
        .filter(Message.capture_id == capture.id)
        .order_by(Message.message_index.asc())
        .all()
    )