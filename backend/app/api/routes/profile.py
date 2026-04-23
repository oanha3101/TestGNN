from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.schemas.user import ProfileUpdateRequest, UserBase
from app.services.auth_service import to_user_schema

router = APIRouter()


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
    db.commit()
    db.refresh(current_user)
    return to_user_schema(current_user)

