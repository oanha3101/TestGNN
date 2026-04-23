from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import AuditLog, TrainingMetric, TrainingRun, User
from app.schemas.training import (
    TrainingMetricItem,
    TrainingMetricWrite,
    TrainingRunCreateRequest,
    TrainingRunItem,
    TrainingRunUpdateRequest,
)


def _to_float(value: Optional[Decimal]) -> Optional[float]:
    if value is None:
        return None
    return float(value)


def to_training_run_schema(run: TrainingRun) -> TrainingRunItem:
    metrics = sorted(run.metrics, key=lambda item: item.epoch)
    return TrainingRunItem(
        id=run.id,
        user_id=run.user_id,
        model_type=run.model_type,
        dataset_name=run.dataset_name,
        status=run.status,
        epoch_current=run.epoch_current,
        epoch_total=run.epoch_total,
        best_accuracy=_to_float(run.best_accuracy),
        best_loss=_to_float(run.best_loss),
        started_at=run.started_at,
        finished_at=run.finished_at,
        created_at=run.created_at,
        metrics=[
            TrainingMetricItem(
                id=metric.id,
                epoch=metric.epoch,
                loss=float(metric.loss),
                accuracy=float(metric.accuracy),
                created_at=metric.created_at,
            )
            for metric in metrics
        ],
    )


def _touch_run_timestamps(run: TrainingRun) -> None:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if run.status == "running" and run.started_at is None:
        run.started_at = now
    if run.status in {"completed", "failed", "canceled"}:
        run.finished_at = now


def _apply_metric(
    db: Session,
    run: TrainingRun,
    metric_payload: TrainingMetricWrite,
) -> None:
    metric = db.scalar(
        select(TrainingMetric).where(
            TrainingMetric.run_id == run.id,
            TrainingMetric.epoch == metric_payload.epoch,
        )
    )
    if metric:
        metric.loss = metric_payload.loss
        metric.accuracy = metric_payload.accuracy
    else:
        db.add(
            TrainingMetric(
                run_id=run.id,
                epoch=metric_payload.epoch,
                loss=metric_payload.loss,
                accuracy=metric_payload.accuracy,
            )
        )
    run.epoch_current = max(run.epoch_current, metric_payload.epoch)
    run.best_accuracy = max(_to_float(run.best_accuracy) or 0, metric_payload.accuracy)
    current_best_loss = _to_float(run.best_loss)
    if current_best_loss is None or metric_payload.loss < current_best_loss:
        run.best_loss = metric_payload.loss


def get_training_run(db: Session, run_id: int) -> Optional[TrainingRun]:
    return db.scalar(
        select(TrainingRun)
        .where(TrainingRun.id == run_id)
        .options(selectinload(TrainingRun.metrics))
    )


def _training_runs_base_query(current_user: User):
    query = select(TrainingRun)
    if current_user.role != "admin":
        query = query.where(TrainingRun.user_id == current_user.id)
    return query


def count_training_runs(db: Session, current_user: User) -> int:
    base = _training_runs_base_query(current_user)
    return db.scalar(select(func.count()).select_from(base.subquery())) or 0


def list_training_runs(
    db: Session,
    current_user: User,
    *,
    limit: Optional[int] = None,
    offset: int = 0,
) -> List[TrainingRun]:
    # Runs can have hundreds of metric rows; joinedload here would inflate
    # the result set by metrics-per-run. selectinload keeps it to one extra
    # bounded query for the metric collection.
    query = (
        _training_runs_base_query(current_user)
        .options(selectinload(TrainingRun.metrics))
        .order_by(TrainingRun.created_at.desc())
    )
    if offset:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)
    return list(db.scalars(query).unique())


def list_training_runs_page(
    db: Session,
    current_user: User,
    *,
    limit: int,
    offset: int,
) -> Tuple[List[TrainingRun], int]:
    return (
        list_training_runs(db, current_user, limit=limit, offset=offset),
        count_training_runs(db, current_user),
    )


def create_training_run(
    db: Session,
    current_user: User,
    payload: TrainingRunCreateRequest,
) -> TrainingRun:
    run = TrainingRun(
        user_id=current_user.id,
        model_type=payload.model_type,
        dataset_name=payload.dataset_name.strip(),
        status="queued",
        epoch_current=0,
        epoch_total=payload.epoch_total,
    )
    db.add(run)
    db.flush()
    db.add(
        AuditLog(
            actor_user_id=current_user.id,
            action="training.create",
            target_type="training_run",
            target_id=run.id,
            metadata_json={
                "model_type": run.model_type,
                "dataset_name": run.dataset_name,
            },
        )
    )
    db.commit()
    return get_training_run(db, run.id)


def update_training_run(
    db: Session,
    current_user: User,
    run_id: int,
    payload: TrainingRunUpdateRequest,
) -> TrainingRun:
    run = db.scalar(select(TrainingRun).where(TrainingRun.id == run_id))
    if not run:
        raise ValueError("Training run not found")
    if current_user.role != "admin" and run.user_id != current_user.id:
        raise PermissionError("Not allowed to update this training run")

    if payload.status is not None:
        run.status = payload.status
    if payload.epoch_current is not None:
        run.epoch_current = payload.epoch_current
    if payload.epoch_total is not None:
        run.epoch_total = payload.epoch_total
    if payload.best_accuracy is not None:
        run.best_accuracy = payload.best_accuracy
    if payload.best_loss is not None:
        run.best_loss = payload.best_loss
    if payload.metric is not None:
        _apply_metric(db, run, payload.metric)

    _touch_run_timestamps(run)

    db.add(
        AuditLog(
            actor_user_id=current_user.id,
            action="training.update",
            target_type="training_run",
            target_id=run.id,
            metadata_json={"status": run.status, "epoch_current": run.epoch_current},
        )
    )
    db.commit()
    return get_training_run(db, run.id)
