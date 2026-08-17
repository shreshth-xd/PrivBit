from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from app.core import security

from sqlalchemy.orm import Session as DBSession

from app.core.pool import get_db
from app.services import session_service

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me")
def read_current_user(user_id: str = Depends(security.get_current_user_id)) -> dict:
    """Protected helper route that returns the authenticated user's id.

    This is a minimal, illustrative endpoint. Registration/login/refresh/logout
    and DB operations are intentionally not implemented here.
    """
    return {"user_id": user_id}


@router.post("/refresh")
def refresh_tokens(request: Request, response: Response, db: DBSession = Depends(get_db)) -> dict:
    raw_refresh_token = request.cookies.get(security.REFRESH_TOKEN_COOKIE_NAME)
    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token cookie",
        )

    new_raw_refresh_token, user_id = session_service.rotate_session(db, raw_refresh_token)
    new_access_token = security.create_access_token(subject=str(user_id))

    security.set_access_token_cookie(response, new_access_token)
    security.set_refresh_token_cookie(response, new_raw_refresh_token)

    return {"detail": "Tokens refreshed"}