from uuid import UUID
from qdrant_client.models import PointStruct

from sqlalchemy.orm import Session as DBSession

from app.models.capture import Capture
from app.models.message import Message
from app.models.user import User
from app.core import encryption, embedding as embedding_core, vector_store, llm
from app.services import chunking_service
from app.services import chunk_indexing_service


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


def post_message(db: DBSession, user: User, capture_id: UUID, content: str) -> tuple[Message, Message]:
    dek = encryption.decrypt_dek(user.encrypted_dek)
    capture = get_capture_or_404(db, user, capture_id)

    # 1. Save the user's message.
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

    # 2. Chunk + embed + index ONLY the user's message — assistant replies
    #    are never embedded (avoids feedback-loop pollution, halves indexing
    #    volume for free). Per-chunk failures are tracked on individual
    #    Chunk rows (embedding_status) for future retry-worker recovery;
    #    this message-level field is just a coarse done/not-done signal.
    total, embedded = chunk_indexing_service.index_content(
        db, dek, user.id, content, source_type="message", message_id=user_msg.id,
    )
    user_msg.embedding_status = "completed" if embedded == total else "failed"
    db.add(user_msg)
    db.commit()

    # 3. Build conversation history + generate assistant reply.
    history = _decrypt_thread_history(db, dek, capture)
    reply_text = llm.generate_reply(history)

    # 4. Save assistant reply — embedding_status stays NULL (not applicable,
    #    assistant messages are never embedded).
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


def list_messages(db: DBSession, user: User, capture_id: UUID) -> list[Message]:
    capture = get_capture_or_404(db, user, capture_id)
    return (
        db.query(Message)
        .filter(Message.capture_id == capture.id)
        .order_by(Message.message_index.asc())
        .all()
    )