from uuid import UUID

from app.core.pool import SessionLocal
from app.core import encryption, llm
from app.models.capture import Capture
from app.models.message import Message
from app.models.user import User
from app.services import chunk_indexing_service


def process_new_capture(capture_id: str, user_id: str, content: str) -> None:
    """Runs in a worker process, NOT in the FastAPI request/response cycle.
    Handles everything that doesn't need to block the user's "Save Note" click."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        capture = db.query(Capture).filter(Capture.id == UUID(capture_id)).first()
        if user is None or capture is None:
            return  # nothing to do if either was deleted before the job ran

        dek = encryption.decrypt_dek(user.encrypted_dek)

        # Chunk + embed + index.
        chunk_indexing_service.index_content(
            db, dek, user.id, content, source_type="capture", capture_id=capture.id,
        )

        # Title generation.
        try:
            title_text = llm.generate_title(content)
            capture.encrypted_title = encryption.encrypt_chunk(dek, title_text)
            db.add(capture)
            db.commit()
        except Exception:
            pass

        # Persist initiating message + generate initial reply — same as before,
        # just now happening after the HTTP response has already returned.
        initial_msg = Message(
            capture_id=capture.id, user_id=user.id, role="user",
            encrypted_content=encryption.encrypt_chunk(dek, content),
            message_index=0, embedding_status=None,
        )
        db.add(initial_msg)
        db.commit()

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
    finally:
        db.close()