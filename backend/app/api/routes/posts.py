from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.schemas.post import PostCreateRequest, PostItem, PostUpdateRequest
from app.services.post_service import (
    create_post,
    delete_post,
    get_post,
    list_posts,
    to_post_schema,
    toggle_bookmark,
    toggle_like,
    update_post,
)

router = APIRouter()


@router.get("", response_model=List[PostItem])
def get_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[PostItem]:
    posts = list_posts(db, current_user)
    return [to_post_schema(post, current_user) for post in posts]


@router.post("", response_model=PostItem, status_code=status.HTTP_201_CREATED)
def create_post_handler(
    payload: PostCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostItem:
    try:
        post = create_post(db, current_user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    hydrated = get_post(db, post.id)
    if not hydrated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return to_post_schema(hydrated, current_user)


@router.patch("/{post_id}", response_model=PostItem)
def update_post_handler(
    post_id: int,
    payload: PostUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostItem:
    try:
        update_post(db, current_user, post_id, payload)
    except ValueError as exc:
        status_code = status.HTTP_404_NOT_FOUND if str(exc) == "Post not found" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    hydrated = get_post(db, post_id)
    if not hydrated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return to_post_schema(hydrated, current_user)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post_handler(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        delete_post(db, current_user, post_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
def toggle_like_handler(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        toggle_like(db, current_user, post_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/{post_id}/bookmark", status_code=status.HTTP_204_NO_CONTENT)
def toggle_bookmark_handler(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        toggle_bookmark(db, current_user, post_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

