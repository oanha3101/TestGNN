from typing import List, Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, joinedload

from app.db.models import AuditLog, Post, PostBookmark, PostLike, TrainingRun, User
from app.schemas.post import (
    BookmarkItem,
    PostCreateRequest,
    PostItem,
    PostUpdateRequest,
    TrainingSnapshot,
    TrainingSnapshotUpdate,
)
from app.services.auth_service import to_user_schema


def sanitize_tags(tags: List[str]) -> List[str]:
    seen = set()
    cleaned: List[str] = []
    for raw in tags:
        tag = raw.strip().lower()
        if not tag:
            continue
        if tag in seen:
            continue
        seen.add(tag)
        cleaned.append(tag)
        if len(cleaned) >= 8:
            break
    return cleaned


def _to_training_snapshot(payload: dict) -> TrainingSnapshot:
    return TrainingSnapshot(
        run_id=payload.get("run_id"),
        model=payload.get("model", "GAT"),
        dataset=payload.get("dataset", "Cora Citation Network"),
        epoch=int(payload.get("epoch", 0)),
        best_accuracy=float(payload.get("best_accuracy", 0)),
        best_loss=float(payload.get("best_loss", 0)),
    )


def _validate_training_run(
    db: Session,
    current_user: User,
    run_id: Optional[int],
) -> Optional[TrainingRun]:
    if run_id is None:
        return None
    run = db.scalar(select(TrainingRun).where(TrainingRun.id == run_id))
    if not run:
        raise ValueError("Training run not found")
    if current_user.role != "admin" and run.user_id != current_user.id:
        raise PermissionError("Not allowed to use this training run")
    return run


def _merge_training_payload(existing: dict, patch: TrainingSnapshotUpdate) -> dict:
    merged = dict(existing or {})
    for key, value in patch.model_dump(exclude_unset=True).items():
        if value is not None:
            merged[key] = value
    return merged


def to_post_schema(
    post: Post,
    current_user: Optional[User],
) -> PostItem:
    liked = False
    bookmarked = False
    if current_user:
        liked = any(item.user_id == current_user.id for item in post.likes)
        bookmarked = any(item.user_id == current_user.id for item in post.bookmarks)

    return PostItem(
        id=post.id,
        title=post.title,
        summary=post.summary,
        content=post.content,
        tags=list(post.tags_json or []),
        is_public=post.visibility == "public",
        moderation_status=post.moderation_status,
        author=to_user_schema(post.author),
        like_count=len(post.likes),
        liked=liked,
        bookmarked=bookmarked,
        training=_to_training_snapshot(post.training_json or {}),
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


def list_posts(db: Session, current_user: Optional[User]) -> List[Post]:
    query = (
        select(Post)
        .options(
            joinedload(Post.author).joinedload(User.profile),
            joinedload(Post.likes),
            joinedload(Post.bookmarks),
        )
        .order_by(Post.updated_at.desc())
    )

    if current_user and current_user.role == "admin":
        return list(db.scalars(query).unique())

    if current_user:
        query = query.where(
            or_(
                Post.author_id == current_user.id,
                and_(Post.visibility == "public", Post.moderation_status != "hidden"),
            )
        )
    else:
        query = query.where(Post.visibility == "public", Post.moderation_status != "hidden")

    return list(db.scalars(query).unique())


def create_post(db: Session, current_user: User, payload: PostCreateRequest) -> Post:
    training = payload.training.model_dump()
    _validate_training_run(db, current_user, payload.training.run_id)
    post = Post(
        author_id=current_user.id,
        run_id=payload.training.run_id,
        title=payload.title.strip(),
        summary=payload.summary.strip(),
        content=payload.content.strip(),
        tags_json=sanitize_tags(payload.tags),
        training_json=training,
        visibility="public" if payload.is_public else "private",
        moderation_status="normal",
    )
    db.add(post)
    db.flush()

    db.add(
        AuditLog(
            actor_user_id=current_user.id,
            action="post.create",
            target_type="post",
            target_id=post.id,
            metadata_json={"title": post.title},
        )
    )
    db.commit()
    db.refresh(post)
    return post


def get_post(db: Session, post_id: int) -> Optional[Post]:
    return db.scalar(
        select(Post)
        .where(Post.id == post_id)
        .options(
            joinedload(Post.author).joinedload(User.profile),
            joinedload(Post.likes),
            joinedload(Post.bookmarks),
        )
    )


def update_post(db: Session, current_user: User, post_id: int, payload: PostUpdateRequest) -> Post:
    post = db.scalar(select(Post).where(Post.id == post_id))
    if not post:
        raise ValueError("Post not found")
    if current_user.role != "admin" and post.author_id != current_user.id:
        raise PermissionError("Not allowed to edit this post")

    post.title = payload.title.strip()
    post.summary = payload.summary.strip()
    post.content = payload.content.strip()
    post.tags_json = sanitize_tags(payload.tags)
    post.visibility = "public" if payload.is_public else "private"
    if payload.training is not None:
        training_payload = _merge_training_payload(post.training_json or {}, payload.training)
        run_id = training_payload.get("run_id")
        _validate_training_run(db, current_user, run_id)
        post.training_json = training_payload

    db.add(
        AuditLog(
            actor_user_id=current_user.id,
            action="post.update",
            target_type="post",
            target_id=post.id,
            metadata_json={"title": post.title},
        )
    )
    db.commit()
    db.refresh(post)
    return post


def delete_post(db: Session, current_user: User, post_id: int) -> None:
    post = db.scalar(select(Post).where(Post.id == post_id))
    if not post:
        raise ValueError("Post not found")
    if current_user.role != "admin" and post.author_id != current_user.id:
        raise PermissionError("Not allowed to delete this post")

    db.delete(post)
    db.add(
        AuditLog(
            actor_user_id=current_user.id,
            action="post.delete",
            target_type="post",
            target_id=post_id,
            metadata_json=None,
        )
    )
    db.commit()


def toggle_like(db: Session, current_user: User, post_id: int) -> None:
    post = db.scalar(select(Post).where(Post.id == post_id))
    if not post:
        raise ValueError("Post not found")

    like = db.scalar(
        select(PostLike).where(PostLike.post_id == post_id, PostLike.user_id == current_user.id)
    )
    if like:
        db.delete(like)
    else:
        db.add(PostLike(post_id=post_id, user_id=current_user.id))
    db.commit()


def toggle_bookmark(db: Session, current_user: User, post_id: int) -> None:
    post = db.scalar(select(Post).where(Post.id == post_id))
    if not post:
        raise ValueError("Post not found")

    bookmark = db.scalar(
        select(PostBookmark).where(
            PostBookmark.post_id == post_id, PostBookmark.user_id == current_user.id
        )
    )
    if bookmark:
        db.delete(bookmark)
    else:
        db.add(PostBookmark(post_id=post_id, user_id=current_user.id, note=None))
    db.commit()


def list_bookmarks(db: Session, current_user: User) -> List[BookmarkItem]:
    bookmarks = list(
        db.scalars(
            select(PostBookmark)
            .where(PostBookmark.user_id == current_user.id)
            .options(
                joinedload(PostBookmark.post)
                .joinedload(Post.author)
                .joinedload(User.profile),
                joinedload(PostBookmark.post).joinedload(Post.likes),
                joinedload(PostBookmark.post).joinedload(Post.bookmarks),
            )
            .order_by(PostBookmark.created_at.desc())
        ).unique()
    )

    result: List[BookmarkItem] = []
    for bookmark in bookmarks:
        if not bookmark.post:
            continue
        result.append(
            BookmarkItem(
                id=bookmark.id,
                post=to_post_schema(bookmark.post, current_user),
                note=bookmark.note,
                created_at=bookmark.created_at,
            )
        )
    return result
