import os
import json
import asyncio
from uuid import UUID
from fastapi import APIRouter, Depends
from fastapi import HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.core import security
from app.core.pool import get_db
from app.core.pool import SessionLocal
from app.core.queue import redis_conn

from app.schemas.capture import CaptureCreate, CaptureListItem, CaptureListResponse, CaptureResponse, CaptureTitleUpdate
from app.schemas.message import MessageCreate, MessageResponse, MessageListResponse

from app.controllers import message_controller
from app.controllers import capture_controller

from app.models.capture import Capture

SSE_MAX_SECONDS = 180

import redis.asyncio as aioredis
from fastapi.responses import StreamingResponse
    
router = APIRouter()
from app.core.queue import REDIS_URL as _REDIS_URL

@router.post("/", response_model=CaptureResponse, status_code=201)
def create_capture(
    payload: CaptureCreate,
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> CaptureResponse:
    return capture_controller.create_capture_controller(payload, user_id, db)

@router.get("/", response_model=CaptureListResponse)
def list_captures(
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> CaptureListResponse:
    return capture_controller.list_captures_controller(user_id, db)

@router.post("/{capture_id}/messages", response_model=MessageResponse, status_code=201)
def post_message(
    capture_id: UUID,
    payload: MessageCreate,
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> MessageResponse:
    return message_controller.post_message_controller(capture_id, payload, user_id, db)


@router.post("/{capture_id}/messages/stream")
def stream_message(
    capture_id: UUID,
    payload: MessageCreate,
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
):
    events = message_controller.stream_message_controller(capture_id, payload, user_id, db)

    def event_stream():
        for event in events:
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{capture_id}/messages", response_model=MessageListResponse)
def list_messages(
    capture_id: UUID,
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> MessageListResponse:
    return message_controller.list_messages_controller(capture_id, user_id, db)


@router.patch("/{capture_id}", response_model=CaptureListItem)
def update_capture_title(
    capture_id: UUID, payload: CaptureTitleUpdate,
    user_id: str = Depends(security.get_current_user_id), db: DBSession = Depends(get_db),
) -> CaptureListItem:
    return capture_controller.update_title_controller(capture_id, payload, user_id, db)


@router.delete("/{capture_id}", status_code=204)
def delete_capture(
    capture_id: UUID,
    user_id: str = Depends(security.get_current_user_id),
    db: DBSession = Depends(get_db),
) -> None:
    capture_controller.delete_capture_controller(capture_id, user_id, db)




def _get_capture_status(capture_id: UUID, user_id: str) -> str | None:
    """Short-lived own DB session (same pattern as the worker job). Returns None
    if the capture doesn't exist or isn't owned by this user."""
    db = SessionLocal()
    try:
        row = db.query(Capture.status).filter(
            Capture.id == capture_id, Capture.user_id == UUID(user_id)
        ).first()
        return row[0] if row else None
    finally:
        db.close()


@router.get("/{capture_id}/events")
async def capture_events(
    capture_id: UUID,
    user_id: str = Depends(security.get_current_user_id),
):
    # Ownership check up front, so a stranger's capture ID gets a clean 404.
    if await asyncio.to_thread(_get_capture_status, capture_id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capture not found")

    channel = f"capture:{capture_id}:events"

    async def event_generator():
        redis_async = aioredis.from_url(_REDIS_URL)
        pubsub = redis_async.pubsub()
        await pubsub.subscribe(channel)  # 1. subscribe FIRST
        try:
            # 2. check the DB AFTER subscribing, which closes the race
            current = await asyncio.to_thread(_get_capture_status, capture_id, user_id)
            if current in ("ready", "failed"):
                yield f"data: {json.dumps({'status': current})}\n\n"
                return

            # 3. otherwise wait for the worker's publish
            loop = asyncio.get_running_loop()
            deadline = loop.time() + SSE_MAX_SECONDS
            while loop.time() < deadline:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=15.0)
                if message is None:
                    yield ": keepalive\n\n"
                    continue
                yield f"data: {message['data'].decode()}\n\n"
                return
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
            await redis_async.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")