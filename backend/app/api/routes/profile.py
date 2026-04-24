import base64
import hashlib
import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.schemas.user import ProfileUpdateRequest, UserBase
from app.services.auth_service import to_user_schema

router = APIRouter()

# Avatar storage directory — persisted in the ml_artifacts Docker volume.
AVATAR_DIR = Path(os.environ.get("AVATAR_DIR", Path.home() / ".gnnvp_data" / "avatars"))
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.get("", response_model=UserBase)
def get_profile(current_user: User = Depends(get_current_user)) -> UserBase:
    return to_user_schema(current_user)


@router.patch("", response_model=UserBase)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserBase:
    if not current_user.profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    current_user.profile.display_name = payload.display_name.strip()
    current_user.profile.bio = payload.bio.strip() if payload.bio else None
    if payload.avatar_url is not None:
        current_user.profile.avatar_url = payload.avatar_url.strip() or None
    db.commit()
    db.refresh(current_user)
    return to_user_schema(current_user)


@router.post("/avatar", response_model=UserBase)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserBase:
    """Upload a profile picture. Accepts JPEG, PNG, WebP or GIF up to 2 MB."""
    if not current_user.profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, WebP or GIF.",
        )

    data = await file.read()
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum 2 MB.",
        )

    # Deterministic filename based on user id + content hash so old files
    # are overwritten and the URL is cache-bustable by content.
    content_hash = hashlib.sha256(data).hexdigest()[:12]
    ext = (file.filename or "avatar.png").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        ext = "png"
    filename = f"user_{current_user.id}_{content_hash}.{ext}"

    filepath = AVATAR_DIR / filename
    filepath.write_bytes(data)

    avatar_url = f"/api/v1/profile/avatar/{filename}"
    current_user.profile.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)
    return to_user_schema(current_user)


@router.get("/avatar/{filename}")
def serve_avatar(filename: str):
    """Serve an uploaded avatar image."""
    filepath = AVATAR_DIR / filename
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    return FileResponse(filepath)

