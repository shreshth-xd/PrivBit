from fastapi import HTTPException, status
from sqlalchemy.orm import Session as DBSession
from uuid import UUID

from app.services import capture_service, user_service
from app.schemas.capture import CaptureCreate, CaptureResponse


def create_capture_controller(payload: CaptureCreate, user_id: str, db: DBSession) -> CaptureResponse:
    user = user_service.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    capture, total_chunks, embedded_chunks = capture_service.create_capture(db, user, payload.content)

    return CaptureResponse(
        id=capture.id,
        created_at=capture.created_at,
        chunks_created=total_chunks,
        chunks_embedded=embedded_chunks,
    )