from datetime import datetime, timezone, timedelta
from uuid import UUID

from sqlalchemy.orm import Session as DBSession
from fastapi import HTTPException, status

from app.models.session import Session as SessionModel
from app.core import security


def create_session(db: DBSession, user_id: UUID) -> tuple[str, SessionModel]:
    """Issue a brand new refresh token + session row for a user (e.g. on login)."""
    raw_token = security.generate_refresh_token()
    token_hash = security.hash_refresh_token(raw_token)

    session_row = SessionModel(
        user_id=user_id,
        refresh_token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=security.REFRESH_TOKEN_TTL_DAYS),
    )
    db.add(session_row)
    db.commit()
    db.refresh(session_row)

    return raw_token, session_row


def revoke_session(db: DBSession, session_row: SessionModel) -> None:
    session_row.revoked_at = datetime.now(timezone.utc)
    db.add(session_row)
    db.commit()


def revoke_all_sessions_for_user(db: DBSession, user_id: UUID) -> None:
    """Reuse-detection response: kill every active session for this user."""
    now = datetime.now(timezone.utc)
    (
        db.query(SessionModel)
        .filter(SessionModel.user_id == user_id, SessionModel.revoked_at.is_(None))
        .update({"revoked_at": now})
    )
    db.commit()


def rotate_session(db: DBSession, raw_refresh_token: str) -> tuple[str, UUID]:
    """
    Validate a refresh token and rotate it: revoke the old session row,
    issue a new one. Returns (new_raw_refresh_token, user_id).

    Reuse detection: if the presented token matches an already-revoked
    session row, that's a signal of token theft/replay — every session
    for that user is revoked, forcing full re-login everywhere.
    """
    token_hash = security.hash_refresh_token(raw_refresh_token)

    session_row = (
        db.query(SessionModel)
        .filter(SessionModel.refresh_token_hash == token_hash)
        .first()
    )

    if session_row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if session_row.revoked_at is not None:
        # This exact token was already used/rotated once before — replay detected.
        revoke_all_sessions_for_user(db, session_row.user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token reuse detected — all sessions revoked",
        )

    if session_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    user_id = session_row.user_id
    revoke_session(db, session_row)
    new_raw_token, _ = create_session(db, user_id)

    return new_raw_token, user_id