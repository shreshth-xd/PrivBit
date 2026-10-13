from fastapi import HTTPException, status
from sqlalchemy.orm import Session as DBSession
from uuid import UUID

from app.core import encryption
from app.services import capture_service, user_service
from app.schemas.capture import CaptureCreate, CaptureListItem, CaptureListResponse, CaptureResponse, CaptureTitleUpdate


def create_capture_controller(payload: CaptureCreate, user_id: str, db: DBSession) -> CaptureResponse:
    user = user_service.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    capture = capture_service.create_capture(db, user, payload.content)

    return CaptureResponse(
        id=capture.id,
        created_at=capture.created_at,
        status="processing",
    )


def update_title_controller(capture_id, payload: CaptureTitleUpdate, user_id: str, db: DBSession) -> CaptureListItem:
    user = user_service.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        capture = capture_service.update_title(db, user, capture_id, payload.title)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capture not found")
    return CaptureListItem(id=capture.id, title=payload.title, created_at=capture.created_at)


def list_captures_controller(user_id: str, db: DBSession) -> CaptureListResponse:
    user = user_service.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    dek = encryption.decrypt_dek(user.encrypted_dek)
    captures = capture_service.list_captures(db, user)

    items = []
    for c in captures:
        title = encryption.decrypt_chunk(dek, c.encrypted_title) if c.encrypted_title else None
        items.append(CaptureListItem(id=c.id, title=title, created_at=c.created_at))

    return CaptureListResponse(captures=items)


def delete_capture_controller(capture_id, user_id: str, db: DBSession) -> None:
    user = user_service.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        capture_service.delete_capture(db, user, capture_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capture not found")