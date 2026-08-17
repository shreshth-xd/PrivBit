from __future__ import annotations
from datetime import datetime, timedelta, timezone

from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

import jwt
import os
import secrets
import hashlib

from jwt import ExpiredSignatureError, InvalidTokenError
from fastapi import Depends, HTTPException, Request, status
from passlib.context import CryptContext

# Load project .env (keeps behavior consistent with other core modules)
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

# Configuration: secret and TTL (minutes)
JWT_SECRET_KEY = os.getenv("ACCESS_TOKEN_SIG")
if not JWT_SECRET_KEY:
    raise RuntimeError("ACCESS_TOKEN_SIG environment variable is not set")

_ttl_env = os.getenv("ACCESS_TOKEN_TTL")
try:
    ACCESS_TOKEN_TTL_MIN: int = int(_ttl_env) if _ttl_env and _ttl_env.strip() else 10
except ValueError:
    ACCESS_TOKEN_TTL_MIN = 10

# Cookie name used to store access token (HTTP-only cookie expected)
ACCESS_TOKEN_COOKIE_NAME = "access_token"




# --- Refresh token config ---
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"

_refresh_ttl_env = os.getenv("REFRESH_TOKEN_TTL_DAYS")
try:
    REFRESH_TOKEN_TTL_DAYS: int = int(_refresh_ttl_env) if _refresh_ttl_env and _refresh_ttl_env.strip() else 7
except ValueError:
    REFRESH_TOKEN_TTL_DAYS = 7





_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return _pwd_context.hash(password)

def verify_password(plain_password: str, password_hash: str) -> bool:
    return _pwd_context.verify(plain_password, password_hash)




def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token for ``subject``.

    Includes `sub`, `iat`, and `exp` claims. Uses HS256 and the
    ``ACCESS_TOKEN_SIG`` environment variable as the secret.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_TTL_MIN)

    now = _now()
    exp = now + expires_delta

    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }

    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
    # PyJWT returns str in v2+, keep type stable
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


def verify_access_token(token: str) -> dict:
    """Decode and validate an access token.

    Returns the token payload on success. Raises ``HTTPException`` when
    the token is missing/invalid/expired.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Basic payload validation
    if "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload




def generate_refresh_token() -> str:
    """Generate a high-entropy opaque refresh token (not a JWT)."""
    return secrets.token_urlsafe(32)  # 256 bits of randomness


def hash_refresh_token(token: str) -> str:
    """One-way hash of a refresh token for DB storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# The secure attribute is omitted here because the backend is expected to be served over HTTPS in production.
def set_access_token_cookie(response, token: str) -> None:
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=ACCESS_TOKEN_TTL_MIN * 60,
    )


def set_refresh_token_cookie(response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
    )


def clear_auth_cookies(response) -> None:
    response.delete_cookie(ACCESS_TOKEN_COOKIE_NAME)
    response.delete_cookie(REFRESH_TOKEN_COOKIE_NAME)


def get_current_user_id(request: Request) -> str:
    """FastAPI dependency that extracts the access token from an HTTP-only cookie,
    verifies it, and returns the authenticated user's id (the token `sub`).

    Usage: ``current_user_id: str = Depends(get_current_user_id)`` in a route.
    """
    token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token cookie",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_access_token(token)
    return str(payload.get("sub"))


