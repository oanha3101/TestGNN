from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.schemas.post import BookmarkItem
from app.services.post_service import list_bookmarks

router = APIRouter()


@router.get("", response_model=List[BookmarkItem])
def get_bookmarks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[BookmarkItem]:
    return list_bookmarks(db, current_user)

