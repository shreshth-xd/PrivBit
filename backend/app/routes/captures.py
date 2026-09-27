from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.core import security
from app.core.pool import get_db
from app.schemas.capture import CaptureCreate, CaptureListItem, CaptureListResponse, CaptureResponse, CaptureTitleUpdate
from app.schemas.message import MessageCreate, MessageResponse, MessageListResponse
from app.controllers import message_controller
from app.controllers import capture_controller

router = APIRouter()

@router.post("/", response_model=CaptureResponse, status_code=201)
def create_capture(
    payload: CaptureCreate,
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> CaptureResponse:
    return capture_controller.create_capture_controller(payload, user_id, db)

@router.get("/", response_model=CaptureListResponse)
def list_captures(
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> CaptureListResponse:
    return capture_controller.list_captures_controller(user_id, db)

@router.post("/{capture_id}/messages", response_model=MessageResponse, status_code=201)
def post_message(
    capture_id: UUID,
    payload: MessageCreate,
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> MessageResponse:
    return message_controller.post_message_controller(capture_id, payload, user_id, db)


@router.get("/{capture_id}/messages", response_model=MessageListResponse)
def list_messages(
    capture_id: UUID,
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> MessageListResponse:
    return message_controller.list_messages_controller(capture_id, user_id, db)


@router.patch("/{capture_id}", response_model=CaptureListItem)
def update_capture_title(
    capture_id: UUID, payload: CaptureTitleUpdate,
    user_id: str = Depends(security.get_current_user_id), db: DBSession = Depends(get_db),
) -> CaptureListItem:
    return capture_controller.update_title_controller(capture_id, payload, user_id, db)


@router.delete("/{capture_id}", status_code=204)
def delete_capture(
    capture_id: UUID,
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> None:
    capture_controller.delete_capture_controller(capture_id, user_id, db)