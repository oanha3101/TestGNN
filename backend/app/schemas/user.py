from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    status: str
    created_at: datetime


class ProfileUpdateRequest(BaseModel):
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

