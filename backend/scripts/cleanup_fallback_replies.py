import argparse
import logging
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import and_, exists, select

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

from app.core import encryption
from app.core.pool import SessionLocal
from app.models.capture import Capture
from app.models.message import Message
from app.models.user import User


log = logging.getLogger(__name__)
FALLBACK_PREFIX = "Sorry, I couldn't generate"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Delete matching last messages")
    args = parser.parse_args()
    db = SessionLocal()
    last_message_count = 0
    non_last_message_count = 0
    try:
        candidates = db.execute(
            select(Message, Capture, User)
            .join(Capture, Message.capture_id == Capture.id)
            .join(User, Message.user_id == User.id)
            .where(Message.role == "assistant")
        ).all()
        for message, capture, user in candidates:
            try:
                dek = encryption.decrypt_dek(user.encrypted_dek)
                content = encryption.decrypt_chunk(dek, message.encrypted_content)
            except Exception:
                log.exception("Could not inspect encrypted assistant message %s", message.id)
                continue
            if not content.startswith(FALLBACK_PREFIX):
                continue
            has_later_message = db.scalar(
                select(
                    exists().where(
                        and_(
                            Message.capture_id == message.capture_id,
                            Message.message_index > message.message_index,
                        )
                    )
                )
            )
            if has_later_message:
                non_last_message_count += 1
                continue
            last_message_count += 1
            if args.apply:
                db.delete(message)
                capture.status = "processing"
                if hasattr(capture, "processing_attempts"):
                    capture.processing_attempts = 0
        if args.apply:
            db.commit()
        else:
            db.rollback()
        print(f"Last apology messages: {last_message_count}")
        print(f"Non-last apology messages (untouched): {non_last_message_count}")
        print(f"Mode: {'apply' if args.apply else 'dry-run'}")
    except Exception:
        db.rollback()
        log.exception("Fallback reply cleanup failed")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()