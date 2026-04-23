from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.user import UserBase


class TrainingSnapshot(BaseModel):
    run_id: Optional[int] = None
    model: str = Field(default="GAT")
    dataset: str = Field(default="Cora Citation Network")
    epoch: int = 0
    best_accuracy: float = 0
    best_loss: float = 0


class TrainingSnapshotUpdate(BaseModel):
    run_id: Optional[int] = None
    model: Optional[str] = None
    dataset: Optional[str] = None
    epoch: Optional[int] = None
    best_accuracy: Optional[float] = None
    best_loss: Optional[float] = None


class PostCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    summary: str = Field(min_length=1)
    content: str = Field(min_length=1)
    tags: List[str] = Field(default_factory=list)
    is_public: bool = True
    training: TrainingSnapshot


class PostUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    summary: str = Field(min_length=1)
    content: str = Field(min_length=1)
    tags: List[str] = Field(default_factory=list)
    is_public: bool = True
    training: Optional[TrainingSnapshotUpdate] = None


class PostItem(BaseModel):
    id: int
    title: str
    summary: str
    content: str
    tags: List[str]
    is_public: bool
    moderation_status: str
    author: UserBase
    like_count: int
    liked: bool
    bookmarked: bool
    training: TrainingSnapshot
    created_at: datetime
    updated_at: datetime


class BookmarkItem(BaseModel):
    id: int
    post: PostItem
    note: Optional[str] = None
    created_at: datetime

