from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import os
from typing import Optional

from dotenv import load_dotenv

import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

from fastapi import Depends, HTTPException, Request, status


# Load project .env (keeps behavior consistent with other core modules)
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


# Configuration: secret and TTL (minutes)
JWT_SECRET_KEY = os.getenv("ACCESS_TOKEN_SIG")
if not JWT_SECRET_KEY:
    raise RuntimeError("ACCESS_TOKEN_SIG environment variable is not set")

_ttl_env = os.getenv("ACCESS_TOKEN_TTL")
try:
    ACCESS_TOKEN_TTL: int = int(_ttl_env) if _ttl_env and _ttl_env.strip() else 15
except ValueError:
    ACCESS_TOKEN_TTL = 15


# Cookie name used to store access token (HTTP-only cookie expected)
ACCESS_TOKEN_COOKIE_NAME = "access_token"


def _now() -> datetime:
    return datetime.utcnow()


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token for ``subject``.

    Includes `sub`, `iat`, and `exp` claims. Uses HS256 and the
    ``ACCESS_TOKEN_SIG`` environment variable as the secret.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_TTL)

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


def get_current_user_id_dep() -> Depends:
    """Helper to return a dependency for route definitions.

    Example: ``Depends(get_current_user_id_dep())``
    """
    return Depends(get_current_user_id)
