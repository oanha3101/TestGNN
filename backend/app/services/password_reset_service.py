"""Forgot-password / reset-password domain logic.

Tokens are 32 random bytes (urlsafe, ~43 chars). Only a SHA-256 hash
is persisted — the plaintext never touches the DB. A token is valid
while ``used_at`` is NULL and ``expires_at`` is in the future. Marking
it ``used`` happens atomically with the password change so a token
can never be spent twice.
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import hash_password
from app.db.models import AuditLog, PasswordResetToken, User
from app.services.email_service import send_email

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    # Naive UTC so the value lines up with the DateTime columns (which
    # are stored without tzinfo). Avoids the 3.12 deprecation warning
    # raised by datetime.utcnow().
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_reset_token(
    db: Session,
    settings: Settings,
    *,
    email: str,
) -> tuple[str | None, str | None]:
    """Create a reset token for ``email`` and mail the user.

    Returns ``(reset_url, delivery_note)``. When the email does not
    match a registered user, both are ``None`` — callers should still
    respond 200 OK so the endpoint is enumeration-safe.
    """

    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None or user.status != "active":
        # Silent no-op — do NOT leak whether the account exists.
        logger.info("forgot-password: no active user for %s", email)
        return None, None

    raw_token = secrets.token_urlsafe(32)
    token = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=_utcnow()
        + timedelta(minutes=settings.password_reset_token_ttl_minutes),
    )
    db.add(token)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action="auth.password_reset.request",
            target_type="user",
            target_id=user.id,
            metadata_json={"email": user.email},
        )
    )
    db.commit()

    reset_url = (
        f"{settings.frontend_base_url.rstrip('/')}/reset-password?token={raw_token}"
    )

    sent = send_email(
        settings,
        to=user.email,
        subject="Reset your GNN-VP password",
        body=(
            "Hi,\n\n"
            "We received a request to reset the password for your GNN-VP account. "
            "Click the link below within the next "
            f"{settings.password_reset_token_ttl_minutes} minutes to set a new password:\n\n"
            f"{reset_url}\n\n"
            "If you did not request a reset, you can safely ignore this email.\n\n"
            "— GNN Visualization Platform"
        ),
    )

    delivery_note = (
        "Email sent." if sent else "SMTP not configured; see server logs or response body for the link."
    )
    return reset_url, delivery_note


def consume_reset_token(
    db: Session,
    *,
    token: str,
    new_password: str,
) -> User:
    """Consume ``token`` and update the owner's password.

    Raises ``ValueError`` for invalid, expired, or already-used tokens.
    """

    token_hash = _hash_token(token)
    record = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    if record is None:
        raise ValueError("Invalid or expired reset token")
    if record.used_at is not None:
        raise ValueError("Reset token has already been used")
    if record.expires_at < _utcnow():
        raise ValueError("Reset token has expired")

    user = db.get(User, record.user_id)
    if user is None:
        raise ValueError("Invalid or expired reset token")
    if user.status != "active":
        raise ValueError("Account is suspended")

    user.password_hash = hash_password(new_password)
    record.used_at = _utcnow()
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action="auth.password_reset.consume",
            target_type="user",
            target_id=user.id,
            metadata_json={"email": user.email},
        )
    )
    db.commit()
    return user
