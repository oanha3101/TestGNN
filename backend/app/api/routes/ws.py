"""WebSocket endpoint for streaming training metrics.

Auth via ?token=<access_token> query param because browser WebSocket can't
send Authorization headers. Token is the same JWT used by REST.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.security import decode_access_token
from app.db.models import TrainingRun, User
from app.db.session import SessionLocal
from app.ml import runtime

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ws"])


def _authenticate_ws(token: Optional[str]) -> Optional[User]:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
    except ValueError:
        return None
    subject = payload.get("sub")
    if subject is None:
        return None
    db = SessionLocal()
    try:
        try:
            user_id = int(subject)
        except (TypeError, ValueError):
            return None
        user = db.scalar(select(User).where(User.id == user_id))
        # Mirror the REST auth dep (app/core/deps.py): suspended users must not
        # be able to open a live training WS just because their JWT is still
        # signed. Without this check, a user whose status was flipped to
        # "suspended" could still see and drive realtime training streams.
        if user is None or user.status != "active":
            return None
        return user
    finally:
        db.close()


@router.websocket("/ws/training/{run_id}")
async def training_ws(
    websocket: WebSocket,
    run_id: int,
    token: Optional[str] = Query(default=None),
) -> None:
    user = _authenticate_ws(token)
    if user is None:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        run = db.scalar(select(TrainingRun).where(TrainingRun.id == run_id))
        if run is None:
            await websocket.close(code=4404)
            return
        if user.role != "admin" and run.user_id != user.id:
            await websocket.close(code=4403)
            return
    finally:
        db.close()

    await websocket.accept()
    queue = await runtime.subscribe(run_id)

    # If the run already finished before the client subscribed, the terminal
    # broadcast has already been consumed by earlier subscribers. Send the
    # current status and exit immediately — otherwise the client would hang
    # waiting for a completion message that will never arrive on this queue.
    state = runtime.get(run_id)
    if state is not None:
        await websocket.send_json({"type": "status", "status": state.status})
        if state.status in {"completed", "failed", "canceled"}:
            await runtime.unsubscribe(run_id, queue)
            return

    try:
        while True:
            try:
                message = await asyncio.wait_for(queue.get(), timeout=30.0)
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
                continue
            await websocket.send_json(message)
            if message.get("type") == "status" and message.get("status") in {
                "completed",
                "failed",
                "canceled",
            }:
                break
    except WebSocketDisconnect:
        pass
    finally:
        await runtime.unsubscribe(run_id, queue)
