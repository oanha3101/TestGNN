from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.core.security import create_access_token
from app.db.models import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.services.auth_service import authenticate_user, register_user, to_user_schema
from app.services.password_reset_service import consume_reset_token, issue_reset_token

router = APIRouter()

_settings = get_settings()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(_settings.rate_limit_auth_register)
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    # Enforce the Terms & Privacy agreement on the server too — the
    # checkbox on the frontend is the primary gate, but an API client
    # should not be able to skip it.
    if not payload.accept_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the Terms of Service and Privacy Policy.",
        )

    try:
        user = register_user(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token, user=to_user_schema(user))


@router.post("/login", response_model=AuthResponse)
@limiter.limit(_settings.rate_limit_auth_login)
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        user = authenticate_user(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token, user=to_user_schema(user))


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit(_settings.rate_limit_auth_forgot_password)
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """Kick off the password-reset flow.

    Always returns 200 with the same generic message regardless of
    whether the email is registered, so attackers cannot enumerate
    accounts through this endpoint.
    """

    settings = get_settings()
    reset_url, delivery_note = issue_reset_token(db, settings, email=payload.email)

    generic = (
        "If an account exists for that email, we've sent a password reset link. "
        "Check your inbox (and spam folder) within the next "
        f"{settings.password_reset_token_ttl_minutes} minutes."
    )

    if reset_url is None:
        return ForgotPasswordResponse(message=generic, delivery="none")

    delivery = "email" if delivery_note == "Email sent." else "log-only"
    body = ForgotPasswordResponse(message=generic, delivery=delivery)
    if settings.expose_reset_url_in_response and delivery == "log-only":
        body.reset_url = reset_url
    return body


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> ResetPasswordResponse:
    try:
        consume_reset_token(db, token=payload.token, new_password=payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return ResetPasswordResponse(
        message="Password updated. You can now sign in with your new password."
    )


@router.get("/me", response_model=AuthResponse)
def me(current_user: User = Depends(get_current_user)) -> AuthResponse:
    token = create_access_token(str(current_user.id))
    return AuthResponse(access_token=token, user=to_user_schema(current_user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> None:
    return None
