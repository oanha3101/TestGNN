"""In-process training task registry + per-run broadcast channel.

Design:
- One asyncio.Queue per run for WebSocket subscribers to read progress.
- Fan-out to multiple subscribers: `broadcast()` replicates onto every live
  queue, so every open WebSocket gets the same stream.
- Tasks themselves run in a thread (torch is CPU-bound); the trainer callback
  hops back to the event loop via asyncio.run_coroutine_threadsafe to push
  progress.

This is not a Celery/RQ replacement — it's deliberately in-process so a single
uvicorn worker can demo end-to-end ML without extra infra. Swapping to Celery
later only touches this file + the API handlers that call `start_task`.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class RunState:
    run_id: int
    status: str = "queued"          # queued | running | completed | failed | canceled
    final_metric: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    cancel_event: asyncio.Event = field(default_factory=asyncio.Event)
    subscribers: List[asyncio.Queue] = field(default_factory=list)


_registry: Dict[int, RunState] = {}
_lock = asyncio.Lock()


async def get_or_create(run_id: int) -> RunState:
    async with _lock:
        state = _registry.get(run_id)
        if state is None:
            state = RunState(run_id=run_id)
            _registry[run_id] = state
        return state


def get(run_id: int) -> Optional[RunState]:
    return _registry.get(run_id)


async def subscribe(run_id: int) -> asyncio.Queue:
    state = await get_or_create(run_id)
    queue: asyncio.Queue = asyncio.Queue(maxsize=512)
    state.subscribers.append(queue)
    return queue


async def unsubscribe(run_id: int, queue: asyncio.Queue) -> None:
    state = _registry.get(run_id)
    if state is None:
        return
    try:
        state.subscribers.remove(queue)
    except ValueError:
        pass


async def broadcast(run_id: int, message: Dict[str, Any]) -> None:
    state = _registry.get(run_id)
    if state is None:
        return
    for queue in list(state.subscribers):
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            logger.warning("subscriber queue full for run %s; dropping", run_id)


def broadcast_threadsafe(loop: asyncio.AbstractEventLoop, run_id: int,
                          message: Dict[str, Any]) -> None:
    """Schedule a broadcast from a worker thread."""
    asyncio.run_coroutine_threadsafe(broadcast(run_id, message), loop)


async def cancel(run_id: int) -> bool:
    state = _registry.get(run_id)
    if state is None or state.status not in {"queued", "running"}:
        return False
    state.cancel_event.set()
    return True


async def set_status(run_id: int, status: str, **extra: Any) -> None:
    state = await get_or_create(run_id)
    state.status = status
    if "final_metric" in extra:
        state.final_metric = extra["final_metric"]
    if "error" in extra:
        state.error = extra["error"]
    await broadcast(run_id, {"type": "status", "status": status, **extra})
