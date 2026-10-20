import json
import logging
import signal
import threading
import time
from datetime import datetime, timedelta, timezone

from app.core.job_config import (
    JOB_FAILURE_TTL,
    JOB_RESULT_TTL,
    MAX_ATTEMPTS,
    STALL_SECONDS,
    SWEEP_INTERVAL_SECONDS,
)
from app.core.pool import SessionLocal
from app.core.queue import job_queue, redis_conn
from app.jobs.capture_jobs import process_new_capture
from app.jobs.chunk_jobs import retry_chunk_embedding
from app.jobs.message_jobs import index_user_message
from app.models.capture import Capture
from app.models.chunk import Chunk
from app.models.message import Message
from app.models.user import User
from app.services.session_service import purge_expired_sessions


log = logging.getLogger(__name__)
stop_event = threading.Event()
SESSION_PURGE_INTERVAL_SECONDS = 60 * 60
_last_session_purge_at: float | None = None


def sweep() -> tuple[int, int, int]:
    db = SessionLocal()
    chunk_count = 0
    capture_count = 0
    failed_count = 0
    message_count = 0
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=STALL_SECONDS)
    try:
        chunks = db.query(Chunk).join(User, Chunk.user_id == User.id).filter(
            Chunk.embedding_status.in_(("failed", "pending")),
            Chunk.embedding_attempts < MAX_ATTEMPTS,
            Chunk.updated_at < cutoff,
        ).order_by(Chunk.updated_at).limit(50).all()
        for chunk in chunks:
            chunk.updated_at = datetime.now(timezone.utc)
            db.add(chunk)
            db.commit()
            job_queue.enqueue(
                retry_chunk_embedding,
                str(chunk.id),
                str(chunk.user_id),
                result_ttl=JOB_RESULT_TTL,
                failure_ttl=JOB_FAILURE_TTL,
            )
            chunk_count += 1

        captures = db.query(Capture).join(User, Capture.user_id == User.id).filter(
            Capture.status == "processing",
            Capture.processing_attempts < MAX_ATTEMPTS,
            Capture.updated_at < cutoff,
        ).order_by(Capture.updated_at).limit(50).all()
        for capture in captures:
            capture.updated_at = datetime.now(timezone.utc)
            db.add(capture)
            db.commit()
            job_queue.enqueue(
                process_new_capture,
                str(capture.id),
                str(capture.user_id),
                result_ttl=JOB_RESULT_TTL,
                failure_ttl=JOB_FAILURE_TTL,
            )
            capture_count += 1

        exhausted = db.query(Capture).filter(
            Capture.status == "processing",
            Capture.processing_attempts >= MAX_ATTEMPTS,
            Capture.updated_at < cutoff,
        ).order_by(Capture.updated_at).limit(50).all()
        for capture in exhausted:
            capture.status = "failed"
            capture.updated_at = datetime.now(timezone.utc)
            db.add(capture)
            db.commit()
            redis_conn.publish(
                f"capture:{capture.id}:events",
                json.dumps({"status": "failed"}),
            )
            failed_count += 1
        pending_messages = db.query(Message).filter(
            Message.role == "user",
            Message.embedding_status == "pending",
            Message.updated_at < cutoff,
            ~db.query(Chunk.id).filter(Chunk.message_id == Message.id).exists(),
        ).order_by(Message.updated_at).limit(50).all()
        for message in pending_messages:
            message.updated_at = datetime.now(timezone.utc)
            db.add(message)
            db.commit()
            job_queue.enqueue(
                index_user_message,
                str(message.id),
                str(message.user_id),
                result_ttl=JOB_RESULT_TTL,
                failure_ttl=JOB_FAILURE_TTL,
            )
            message_count += 1
    finally:
        db.close()
    if chunk_count or capture_count or failed_count or message_count:
        log.info(
            "Retry sweep found chunks=%d captures=%d exhausted_captures=%d messages=%d",
            chunk_count,
            capture_count,
            failed_count,
            message_count,
        )
    return chunk_count, capture_count, failed_count


def _request_stop(signum, frame) -> None:
    stop_event.set()


def _purge_expired_sessions_if_due() -> None:
    global _last_session_purge_at

    now = time.monotonic()
    if (
        _last_session_purge_at is not None
        and now - _last_session_purge_at < SESSION_PURGE_INTERVAL_SECONDS
    ):
        return

    _last_session_purge_at = now
    try:
        db = SessionLocal()
        try:
            deleted = purge_expired_sessions(db)
            if deleted > 0:
                log.info("Purged %d expired sessions", deleted)
        finally:
            db.close()
    except Exception:
        log.exception("Expired session purge failed")


def main() -> None:
    signal.signal(signal.SIGINT, _request_stop)
    signal.signal(signal.SIGTERM, _request_stop)
    while not stop_event.is_set():
        try:
            sweep()
        except Exception:
            log.exception("Retry sweep failed")
        _purge_expired_sessions_if_due()
        stop_event.wait(SWEEP_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()