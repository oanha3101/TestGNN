from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.db.models import AuditLog, Post, User
from app.schemas.admin import AdminOverview
from app.schemas.user import UserBase
from app.services.auth_service import to_user_schema


def get_overview(db: Session) -> AdminOverview:
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.status == "active")) or 0
    suspended_users = total_users - active_users

    total_posts = db.scalar(select(func.count(Post.id))) or 0
    public_posts = db.scalar(select(func.count(Post.id)).where(Post.visibility == "public")) or 0
    private_posts = total_posts - public_posts

    return AdminOverview(
        total_users=total_users,
        active_users=active_users,
        suspended_users=suspended_users,
        total_posts=total_posts,
        public_posts=public_posts,
        private_posts=private_posts,
    )


def list_users(
    db: Session,
    *,
    limit: Optional[int] = None,
    offset: int = 0,
) -> List[UserBase]:
    query = select(User).options(joinedload(User.profile)).order_by(User.created_at.desc())
    if offset:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)
    users = list(db.scalars(query).unique())
    return [to_user_schema(user) for user in users]


def count_users(db: Session) -> int:
    return db.scalar(select(func.count(User.id))) or 0


def list_users_page(
    db: Session,
    *,
    limit: int,
    offset: int,
) -> Tuple[List[UserBase], int]:
    return list_users(db, limit=limit, offset=offset), count_users(db)


def set_user_role(db: Session, admin_user: User, user_id: int, role: str) -> User:
    if role not in {"user", "admin"}:
        raise ValueError("Invalid role")
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise ValueError("User not found")
    if admin_user.id == user.id and role != "admin":
        raise ValueError("You cannot remove your own admin role")
    if user.role == "admin" and role != "admin":
        admin_count = db.scalar(select(func.count(User.id)).where(User.role == "admin")) or 0
        if admin_count <= 1:
            raise ValueError("At least one admin account must remain")
    user.role = role
    db.add(
        AuditLog(
            actor_user_id=admin_user.id,
            action="admin.set_user_role",
            target_type="user",
            target_id=user.id,
            metadata_json={"role": role},
        )
    )
    db.commit()
    db.refresh(user)
    return user


def set_user_status(db: Session, admin_user: User, user_id: int, status: str) -> User:
    if status not in {"active", "suspended"}:
        raise ValueError("Invalid status")
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise ValueError("User not found")
    if admin_user.id == user.id and status != "active":
        raise ValueError("You cannot suspend your own account")
    if user.role == "admin" and status != "active":
        admin_count = db.scalar(
            select(func.count(User.id)).where(User.role == "admin", User.status == "active")
        ) or 0
        if admin_count <= 1:
            raise ValueError("At least one active admin account must remain")
    user.status = status
    db.add(
        AuditLog(
            actor_user_id=admin_user.id,
            action="admin.set_user_status",
            target_type="user",
            target_id=user.id,
            metadata_json={"status": status},
        )
    )
    db.commit()
    db.refresh(user)
    return user
