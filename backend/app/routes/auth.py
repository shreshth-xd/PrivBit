from fastapi import APIRouter, Depends
from app.core import security

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me")
def read_current_user(user_id: str = Depends(security.get_current_user_id)) -> dict:
    """Protected helper route that returns the authenticated user's id.

    This is a minimal, illustrative endpoint. Registration/login/refresh/logout
    and DB operations are intentionally not implemented here.
    """
    return {"user_id": user_id}
