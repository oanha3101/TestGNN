"""Rate limiting facade.

We use ``slowapi`` (the FastAPI port of ``flask-limiter``) when it's
installed; otherwise we fall back to a no-op shim so development and tests
don't hard-depend on it.

All route handlers can decorate themselves with
``@limiter.limit("15/minute")`` without caring whether a real limiter is
active — the shim's ``.limit()`` just returns the function unchanged.

Rate limits are keyed by client IP (via ``get_remote_address``). If the
app is deployed behind a trusted proxy, set the proxy's
``X-Forwarded-For`` header so the real client IP is preserved.
"""

from __future__ import annotations

import logging
from typing import Any, Callable

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class _NoopLimiter:
    """Fallback when slowapi isn't installed or rate-limiting is disabled.

    The ``@limiter.limit(...)`` decorator becomes a no-op, and the
    attributes FastAPI/Starlette wiring expects (``limiter`` on the app,
    ``middleware``) are present but inert.
    """

    enabled = False

    def limit(self, _spec: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            return func

        return decorator


def _build_limiter() -> Any:
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return _NoopLimiter()
    try:
        from slowapi import Limiter
        from slowapi.util import get_remote_address
    except ImportError:
        logger.warning(
            "slowapi is not installed; rate limiting is disabled. "
            "Install it with `pip install slowapi` to enable."
        )
        return _NoopLimiter()

    return Limiter(key_func=get_remote_address, default_limits=[])


limiter: Any = _build_limiter()


def install_rate_limit_handlers(app: Any) -> None:
    """Wire slowapi into the FastAPI app (429 handler + state).

    Safe to call when the limiter is the no-op shim — we only wire up
    handlers when slowapi is actually active.
    """

    if not getattr(limiter, "enabled", True):
        return
    if isinstance(limiter, _NoopLimiter):
        return
    try:
        from slowapi import _rate_limit_exceeded_handler
        from slowapi.errors import RateLimitExceeded
        from slowapi.middleware import SlowAPIMiddleware
    except ImportError:
        return

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
