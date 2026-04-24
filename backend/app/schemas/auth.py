from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserBase


class RegisterRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    # Frontend gates submit on the Terms & Privacy checkbox, but we
    # also assert server-side so an API client can't bypass it.
    accept_terms: bool = Field(default=False)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBase


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Always returned 200 OK so the endpoint is enumeration-safe.

    ``delivery`` describes how/whether we reached the user (``email``
    when SMTP delivered, ``log-only`` otherwise). ``reset_url`` is only
    populated in dev mode (``EXPOSE_RESET_URL_IN_RESPONSE=true``) so
    the frontend can link through without an email relay.
    """

    message: str
    delivery: str = "email"
    reset_url: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=256)
    password: str = Field(min_length=6, max_length=128)


class ResetPasswordResponse(BaseModel):
    message: str

