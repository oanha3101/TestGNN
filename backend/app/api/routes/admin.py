from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_admin_user, get_db
from app.db.models import User
from app.schemas.admin import AdminOverview, SetUserRoleRequest, SetUserStatusRequest
from app.schemas.user import UserBase
from app.services.admin_service import get_overview, list_users, set_user_role, set_user_status
from app.services.auth_service import to_user_schema
from app.services.post_service import delete_post

router = APIRouter()


@router.get("/overview", response_model=AdminOverview)
def admin_overview(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> AdminOverview:
    return get_overview(db)


@router.get("/users", response_model=List[UserBase])
def admin_users(
    _: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> List[UserBase]:
    return list_users(db)


@router.patch("/users/{user_id}/role", response_model=UserBase)
def admin_update_user_role(
    user_id: int,
    payload: SetUserRoleRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> UserBase:
    try:
        user = set_user_role(db, admin_user, user_id, payload.role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return to_user_schema(user)


@router.patch("/users/{user_id}/status", response_model=UserBase)
def admin_update_user_status(
    user_id: int,
    payload: SetUserStatusRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> UserBase:
    try:
        user = set_user_status(db, admin_user, user_id, payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return to_user_schema(user)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_post(
    post_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        delete_post(db, admin_user, post_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
