from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    DECIMAL,
    JSON,
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("user", "admin", name="user_role"),
        nullable=False,
        default="user",
    )
    status: Mapped[str] = mapped_column(
        Enum("active", "suspended", name="user_status"),
        nullable=False,
        default="active",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    profile: Mapped["UserProfile"] = relationship(
        back_populates="user", uselist=False, cascade="all,delete-orphan"
    )
    posts: Mapped[List["Post"]] = relationship(back_populates="author")
    likes: Mapped[List["PostLike"]] = relationship(back_populates="user")
    bookmarks: Mapped[List["PostBookmark"]] = relationship(back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    user: Mapped[User] = relationship(back_populates="profile")


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    model_type: Mapped[str] = mapped_column(
        Enum("GCN", "GAT", "GraphSAGE", "GraphTransformer", name="training_model_type"),
        nullable=False,
    )
    dataset_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("queued", "running", "completed", "failed", "canceled", name="training_run_status"),
        nullable=False,
        default="queued",
    )
    epoch_current: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    epoch_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    best_accuracy: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(6, 4), nullable=True)
    best_loss: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 5), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    metrics: Mapped[List["TrainingMetric"]] = relationship(
        back_populates="run", cascade="all,delete-orphan"
    )


class TrainingMetric(Base):
    __tablename__ = "training_metrics"
    __table_args__ = (UniqueConstraint("run_id", "epoch", name="uq_run_epoch"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("training_runs.id", ondelete="CASCADE"), nullable=False
    )
    epoch: Mapped[int] = mapped_column(Integer, nullable=False)
    loss: Mapped[Decimal] = mapped_column(DECIMAL(8, 5), nullable=False)
    accuracy: Mapped[Decimal] = mapped_column(DECIMAL(6, 4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    run: Mapped[TrainingRun] = relationship(back_populates="metrics")


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    author_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    run_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("training_runs.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tags_json: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    training_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    visibility: Mapped[str] = mapped_column(
        Enum("public", "private", name="post_visibility"),
        nullable=False,
        default="public",
    )
    moderation_status: Mapped[str] = mapped_column(
        Enum("normal", "hidden", "reported", "featured", name="post_moderation_status"),
        nullable=False,
        default="normal",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    author: Mapped[User] = relationship(back_populates="posts")
    likes: Mapped[List["PostLike"]] = relationship(back_populates="post", cascade="all,delete-orphan")
    bookmarks: Mapped[List["PostBookmark"]] = relationship(
        back_populates="post", cascade="all,delete-orphan"
    )


class PostLike(Base):
    __tablename__ = "post_likes"

    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    post_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="likes")
    post: Mapped[Post] = relationship(back_populates="likes")


class PostBookmark(Base):
    __tablename__ = "post_bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_bookmark_user_post"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="bookmarks")
    post: Mapped[Post] = relationship(back_populates="bookmarks")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    target_type: Mapped[str] = mapped_column(String(80), nullable=False)
    target_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)


class Artifact(Base):
    __tablename__ = "artifacts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("training_runs.id", ondelete="CASCADE"), nullable=False
    )
    artifact_type: Mapped[str] = mapped_column(
        Enum("checkpoint", "embedding", "report", "explain_mask", name="artifact_type"),
        nullable=False,
    )
    object_key: Mapped[str] = mapped_column(String(500), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
