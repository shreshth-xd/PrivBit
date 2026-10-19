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

from app.core.queue import job_queue
from app.jobs.capture_jobs import process_new_capture
from app.core.job_config import JOB_FAILURE_TTL, JOB_RESULT_TTL



def create_capture(db: DBSession, user: User, content: str) -> Capture:
    dek = encryption.decrypt_dek(user.encrypted_dek)

    capture = Capture(
        user_id=user.id,
        encrypted_content=encryption.encrypt_chunk(dek, content),
    )
    db.add(capture)
    db.commit()
    db.refresh(capture)

    # Chunking, embedding, title generation, and the initial AI reply all
    # happen in the background now — this function only does the one fast
    # DB write above, then hands the rest off to a worker process via Redis.
    job_queue.enqueue(
        process_new_capture,
        str(capture.id),
        str(user.id),
        result_ttl=JOB_RESULT_TTL,
        failure_ttl=JOB_FAILURE_TTL,
    )

    return capture


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