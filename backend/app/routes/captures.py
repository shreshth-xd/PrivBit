from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.core import security
from app.core.pool import get_db
from app.schemas.capture import CaptureCreate, CaptureListResponse, CaptureResponse
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