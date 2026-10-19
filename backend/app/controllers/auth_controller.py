from fastapi import HTTPException, Request, Response, status
from sqlalchemy.orm import Session as DBSession

from app.core import security
from app.services import user_service, session_service
from app.schemas.auth import RegisterRequest, LoginRequest


def _issue_tokens_and_set_cookies(db: DBSession, response: Response, user_id) -> None:
    raw_refresh_token, _ = session_service.create_session(db, user_id)
    access_token = security.create_access_token(subject=str(user_id))

    security.set_access_token_cookie(response, access_token)
    security.set_refresh_token_cookie(response, raw_refresh_token)
    security.set_csrf_cookie(response)


def register_controller(payload: RegisterRequest, response: Response, db: DBSession) -> dict:
    existing = user_service.get_user_by_email(db, payload.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = user_service.create_user(db, payload.email, payload.password)
    _issue_tokens_and_set_cookies(db, response, user.id)

    return {"id": str(user.id), "email": user.email}


def login_controller(payload: LoginRequest, response: Response, db: DBSession) -> dict:
    user = user_service.authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    _issue_tokens_and_set_cookies(db, response, user.id)

    return {"id": str(user.id), "email": user.email}



def logout_controller(request: Request, response: Response, db: DBSession) -> dict:
    raw_refresh_token = request.cookies.get(security.REFRESH_TOKEN_COOKIE_NAME)
    if raw_refresh_token:
        session_service.revoke_session_by_raw_token(db, raw_refresh_token)

    security.clear_auth_cookies(response)
    return {"detail": "Logged out"}