"""Email delivery with graceful degradation.

When SMTP is configured (``settings.smtp_host`` is non-empty), messages
are sent over SMTP with STARTTLS. Otherwise, the service logs the
rendered body and returns — the caller (e.g. the forgot-password
endpoint) is free to surface the reset URL in-band so developers can
still exercise the flow on a fresh box without configuring an SMTP
relay.

This module has NO side-effects at import time; tests can call
``send_email`` with ``settings.smtp_host=""`` and nothing will be
networked.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import Settings

logger = logging.getLogger(__name__)


def send_email(settings: Settings, *, to: str, subject: str, body: str) -> bool:
    """Send an email. Returns True when delivered, False when skipped.

    Never raises — delivery failure is logged and reported via the
    return value. Callers must treat ``False`` as "user did not receive
    the message" and surface an alternative (e.g. reset link in the
    response) if appropriate for their environment.
    """

    if not settings.smtp_host:
        logger.info(
            "SMTP not configured; skipping email send. to=%s subject=%s body=%s",
            to,
            subject,
            body,
        )
        return False

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.ehlo()
            if settings.smtp_use_tls:
                smtp.starttls()
                smtp.ehlo()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
        logger.info("Sent email to %s (subject=%s)", to, subject)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to send email to %s: %s", to, exc)
        return False
