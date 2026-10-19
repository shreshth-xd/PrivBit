from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.services import retrieval_service, user_service
from app.schemas.search import SearchRequest, SearchResponse

def search_controller(payload: SearchRequest, user_id: str, db: DBSession) -> SearchResponse:
    user = user_service.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    answer, sources = retrieval_service.search_and_answer(db, user, payload.query)
    return SearchResponse(answer=answer, sources_count=len(sources), sources=sources)