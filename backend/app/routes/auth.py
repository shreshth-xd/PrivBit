from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from app.core import security

from sqlalchemy.orm import Session as DBSession

from app.core.pool import get_db
from app.services import session_service
from app.services import user_service
from app.schemas.auth import UserResponse, RegisterRequest, LoginRequest
from app.controllers import auth_controller

router = APIRouter()

@router.get("/me", response_model=UserResponse)
def read_current_user(
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> UserResponse:
    user = user_service.get_user_by_id(db, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


@router.post("/register", status_code=201)
def register(payload: RegisterRequest, response: Response, db: DBSession = Depends(get_db)) -> dict:
    return auth_controller.register_controller(payload, response, db)


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: DBSession = Depends(get_db)) -> dict:
    return auth_controller.login_controller(payload, response, db)


@router.post("/logout")
def logout(request: Request, response: Response, db: DBSession = Depends(get_db)) -> dict:
    return auth_controller.logout_controller(request, response, db)


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