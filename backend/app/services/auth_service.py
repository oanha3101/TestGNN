from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.db.models import AuditLog, User, UserProfile
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import UserBase


def to_user_schema(user: User) -> UserBase:
    display_name = user.profile.display_name if user.profile else user.email.split("@")[0]
    bio = user.profile.bio if user.profile else None
    return UserBase(
        id=user.id,
        email=user.email,
        display_name=display_name,
        bio=bio,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
    )


def register_user(db: Session, payload: RegisterRequest) -> User:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise ValueError("Email already exists")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="user",
        status="active",
    )
    db.add(user)
    db.flush()

    profile = UserProfile(
        user_id=user.id,
        display_name=payload.display_name.strip(),
        bio="New member in GNN-VP community.",
    )
    db.add(profile)

    db.add(
        AuditLog(
            actor_user_id=user.id,
            action="auth.register",
            target_type="user",
            target_id=user.id,
            metadata_json={"email": user.email},
        )
    )
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, payload: LoginRequest) -> User:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user:
        raise ValueError("Invalid email or password")
    if user.status != "active":
        raise ValueError("Account is suspended")
    if not verify_password(payload.password, user.password_hash):
        raise ValueError("Invalid email or password")
    return user


def bootstrap_admin_if_missing(
    db: Session,
    email: str,
    password: str,
    display_name: str,
) -> None:
    existing = db.scalar(select(User).where(User.email == email.lower()))
    if existing:
        return

    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        role="admin",
        status="active",
    )
    db.add(user)
    db.flush()
    db.add(
        UserProfile(
            user_id=user.id,
            display_name=display_name,
            bio="Bootstrap admin account",
        )
    )
    db.add(
        AuditLog(
            actor_user_id=user.id,
            action="system.bootstrap_admin",
            target_type="user",
            target_id=user.id,
            metadata_json={"email": email.lower()},
        )
    )
    db.commit()

