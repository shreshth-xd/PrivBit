from uuid import UUID
from collections.abc import Iterator
from fastapi import HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.services import message_service, user_service
from app.schemas.message import MessageCreate, MessageResponse, MessageListResponse
from app.core import encryption


def post_message_controller(
    capture_id: UUID, payload: MessageCreate, user_id: str, db: DBSession
) -> MessageResponse:
    user = user_service.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    try:
        user_msg, assistant_msg = message_service.post_message(db, user, capture_id, payload.content)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capture not found")
    except message_service.ReplyGenerationError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="The AI couldn't reply right now. Please try again.")

    dek = encryption.decrypt_dek(user.encrypted_dek)
    return MessageResponse(
        id=assistant_msg.id,
        role=assistant_msg.role,
        content=encryption.decrypt_chunk(dek, assistant_msg.encrypted_content),
        created_at=assistant_msg.created_at,
    )


def stream_message_controller(
    capture_id: UUID, payload: MessageCreate, user_id: str, db: DBSession
) -> Iterator[dict]:
    user = user_service.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        capture, _ = message_service.save_user_message(db, user, capture_id, payload.content)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capture not found")
    return message_service.stream_assistant_reply(str(user.id), str(capture.id))


def list_messages_controller(capture_id: UUID, user_id: str, db: DBSession) -> MessageListResponse:
    user = user_service.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    try:
        messages = message_service.list_messages(db, user, capture_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capture not found")

    dek = encryption.decrypt_dek(user.encrypted_dek)
    items = [
        MessageResponse(
            id=m.id, role=m.role,
            content=encryption.decrypt_chunk(dek, m.encrypted_content),
            created_at=m.created_at,
        )
        for m in messages
    ]
    return MessageListResponse(messages=items)