from sqlalchemy.orm import Session as DBSession
from app.models.user import User
from app.core import security
from uuid import UUID


def get_user_by_id(db: DBSession, user_id: UUID) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: DBSession, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_user(db: DBSession, email: str, password: str) -> User:
    user = User(
        email=email,
        password_hash=security.hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: DBSession, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None:
        return None
    if not security.verify_password(password, user.password_hash):
        return None
    return user