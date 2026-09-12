from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.core import security
from app.core.pool import get_db
from app.schemas.search import SearchRequest, SearchResponse
from app.controllers import search_controller

router = APIRouter()

@router.post("/", response_model=SearchResponse)
def search(
    payload: SearchRequest,
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> SearchResponse:
    return search_controller.search_controller(payload, user_id, db)