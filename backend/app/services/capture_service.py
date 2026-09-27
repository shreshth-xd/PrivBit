from uuid import UUID
from qdrant_client.models import PointStruct

from sqlalchemy.orm import Session as DBSession

from app.models.capture import Capture
from app.models.chunk import Chunk
from app.models.user import User
from app.core import encryption, embedding as embedding_core, vector_store
from app.services import chunking_service
from app.services import chunk_indexing_service
from app.core import llm
from app.models.message import Message
from qdrant_client.models import PointIdsList


def create_capture(db: DBSession, user: User, content: str) -> tuple[Capture, int, int]:
    dek = encryption.decrypt_dek(user.encrypted_dek)

    capture = Capture(
        user_id=user.id,
        encrypted_content=encryption.encrypt_chunk(dek, content),
    )
    db.add(capture)
    db.commit()
    db.refresh(capture)

    total_chunks, embedded_chunks = chunk_indexing_service.index_content(
        db, dek, user.id, content, source_type="capture", capture_id=capture.id,
    )

    try:
        title_text = llm.generate_title(content)
        capture.encrypted_title = encryption.encrypt_chunk(dek, title_text)
        db.add(capture)
        db.commit()
    except Exception:
        pass

    # Persist the initiating content as a real Message row (index 0), so the
    # chat view can display it via GET /captures/{id}/messages like any
    # other turn. embedding_status stays None — already indexed above via
    # the capture path, not re-embedded here (would duplicate the same text).
    initial_user_msg = Message(
        capture_id=capture.id, user_id=user.id, role="user",
        encrypted_content=encryption.encrypt_chunk(dek, content),
        message_index=0, embedding_status=None,
    )
    db.add(initial_user_msg)
    db.commit()

    # Generate an immediate reply to the capture itself — matches
    # ChatGPT/Claude Desktop: the first message you send gets answered,
    # not just silently stored.
    try:
        reply_text = llm.generate_reply([{"role": "user", "content": content}])
    except Exception:
        reply_text = "Sorry, I couldn't generate a reply right now."

    assistant_msg = Message(
        capture_id=capture.id, user_id=user.id, role="assistant",
        encrypted_content=encryption.encrypt_chunk(dek, reply_text),
        message_index=1, embedding_status=None,
    )
    db.add(assistant_msg)
    db.commit()

    return capture, total_chunks, embedded_chunks


def update_title(db: DBSession, user: User, capture_id, new_title: str) -> Capture:
    dek = encryption.decrypt_dek(user.encrypted_dek)
    capture = db.query(Capture).filter(Capture.id == capture_id, Capture.user_id == user.id).first()
    if capture is None:
        raise ValueError("Capture not found")
    capture.encrypted_title = encryption.encrypt_chunk(dek, new_title)
    db.add(capture)
    db.commit()
    db.refresh(capture)
    return capture


def list_captures(db: DBSession, user: User) -> list[Capture]:
    return (
        db.query(Capture)
        .filter(Capture.user_id == user.id)
        .order_by(Capture.created_at.desc())
        .all()
    )


def delete_capture(db: DBSession, user: User, capture_id) -> None:
    capture = db.query(Capture).filter(Capture.id == capture_id, Capture.user_id == user.id).first()
    if capture is None:
        raise ValueError("Capture not found")

    # Gather every chunk_id tied to this capture — both directly (source_type="capture")
    # and via its messages (source_type="message") — since chunks.message_id links
    # through messages, not directly through capture_id, for message-originated chunks.
    message_ids = [m.id for m in db.query(Message.id).filter(Message.capture_id == capture.id).all()]

    chunk_ids = [
        str(c.id) for c in db.query(Chunk.id).filter(
            (Chunk.capture_id == capture.id) | (Chunk.message_id.in_(message_ids))
        ).all()
    ]

    if chunk_ids:
        vector_store.client.delete(
            collection_name=vector_store.COLLECTION_NAME,
            points_selector=PointIdsList(points=chunk_ids),
        )

    db.delete(capture)  # cascades to messages + chunks in Postgres
    db.commit()