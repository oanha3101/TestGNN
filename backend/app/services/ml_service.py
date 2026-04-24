"""Bridges the ML engine with the DB and the async runtime registry.

Responsibilities:
- Kick off a training run as a background asyncio task.
- Stream per-epoch metrics into both the DB (TrainingMetric) and the
  broadcast channel (ml.runtime) so live WebSocket subscribers see them.
- On completion, persist final embeddings / checkpoint / report as Artifacts.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select

from app.db.models import Artifact, AuditLog, TrainingMetric, TrainingRun
from app.db.session import SessionLocal
from app.ml import runtime
from app.ml.artifacts import load_embedding, load_report, save_training_result
from app.ml.datasets import load_dataset
from app.ml.explainer import explain_node
from app.ml.models import build_model
from app.ml.trainer import EpochMetrics, train_model

logger = logging.getLogger(__name__)


def _mark_running(db, run: TrainingRun, epoch_total: int) -> None:
    run.status = "running"
    run.epoch_total = epoch_total
    if run.started_at is None:
        run.started_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.add(
        AuditLog(
            actor_user_id=run.user_id,
            action="training.start",
            target_type="training_run",
            target_id=run.id,
            metadata_json={"model_type": run.model_type, "dataset": run.dataset_name},
        )
    )
    db.commit()


def _persist_epoch(run_id: int, metrics: EpochMetrics) -> None:
    """Persist a single epoch's metrics.

    Opens its own short-lived SQLAlchemy session so it can be safely invoked
    from the thread-pool worker that runs `train_model` (PyMySQL connections
    are not thread-safe, so we must NOT share the session created on the
    event-loop thread).
    """
    db = SessionLocal()
    try:
        try:
            existing = db.scalar(
                select(TrainingMetric).where(
                    TrainingMetric.run_id == run_id, TrainingMetric.epoch == metrics.epoch
                )
            )
            if existing is None:
                db.add(
                    TrainingMetric(
                        run_id=run_id,
                        epoch=metrics.epoch,
                        loss=metrics.loss,
                        accuracy=metrics.val_accuracy,
                    )
                )
            else:
                existing.loss = metrics.loss
                existing.accuracy = metrics.val_accuracy

            run = db.scalar(select(TrainingRun).where(TrainingRun.id == run_id))
            if run is None:
                return
            run.epoch_current = max(run.epoch_current, metrics.epoch)
            current_best_acc = float(run.best_accuracy) if run.best_accuracy is not None else 0.0
            if metrics.val_accuracy > current_best_acc:
                run.best_accuracy = metrics.val_accuracy
            current_best_loss = float(run.best_loss) if run.best_loss is not None else None
            if current_best_loss is None or metrics.loss < current_best_loss:
                run.best_loss = metrics.loss
            db.commit()
        except Exception:
            # Epoch persistence must never take down the training loop. Roll
            # the session back so the next epoch gets a clean session, and
            # log the failure. The WebSocket channel still receives the live
            # metric via the broadcaster; we only lose the DB row for this
            # epoch.
            logger.exception("failed to persist epoch %s for run %s", metrics.epoch, run_id)
            db.rollback()
    finally:
        db.close()


def _record_artifacts(db, run_id: int, paths: Dict[str, Any]) -> None:
    for kind, path in paths.items():
        db.add(
            Artifact(
                run_id=run_id,
                artifact_type=kind,
                object_key=str(path),
                size_bytes=path.stat().st_size if hasattr(path, "stat") else 0,
            )
        )
    db.commit()


async def start_training(
    run_id: int,
    *,
    epochs: int = 200,
    hidden_dim: int = 32,
    custom_payload: Optional[Dict[str, Any]] = None,
) -> None:
    """Public entrypoint. Returns immediately; training continues in a task."""
    state = await runtime.get_or_create(run_id)
    # A run that is already queued or running must not be launched again —
    # a duplicate task would race on the same TrainingRun row, broadcast
    # duplicate progress events, and clobber artifacts under the same
    # run_id directory.
    if state.status in {"queued", "running"}:
        return
    state.cancel_event.clear()
    state.status = "queued"

    loop = asyncio.get_running_loop()
    asyncio.create_task(
        _run_training_task(
            run_id=run_id,
            epochs=epochs,
            hidden_dim=hidden_dim,
            custom_payload=custom_payload,
            loop=loop,
        )
    )


async def _run_training_task(
    run_id: int,
    *,
    epochs: int,
    hidden_dim: int,
    custom_payload: Optional[Dict[str, Any]],
    loop: asyncio.AbstractEventLoop,
) -> None:
    db = SessionLocal()
    try:
        run = db.scalar(select(TrainingRun).where(TrainingRun.id == run_id))
        if run is None:
            await runtime.set_status(run_id, "failed", error="Training run not found")
            return

        try:
            dataset = load_dataset(run.dataset_name, custom_payload=custom_payload)
        except Exception as exc:
            logger.exception("dataset load failed for run %s", run_id)
            await runtime.set_status(run_id, "failed", error=f"dataset: {exc}")
            return

        model = build_model(
            kind=run.model_type,
            in_dim=dataset["num_features"],
            num_classes=dataset["num_classes"],
            hidden_dim=hidden_dim,
        )

        _mark_running(db, run, epoch_total=epochs)
        await runtime.set_status(run_id, "running", epoch_total=epochs)

        state = await runtime.get_or_create(run_id)

        def on_epoch(metrics: EpochMetrics) -> None:
            # on_epoch fires from the thread-pool worker running train_model
            # (see asyncio.to_thread below). _persist_epoch opens its own
            # session so we don't touch `db` from the wrong thread.
            _persist_epoch(run_id, metrics)
            runtime.broadcast_threadsafe(
                loop,
                run_id,
                {
                    "type": "progress",
                    "epoch": metrics.epoch,
                    "epochs": epochs,
                    "loss": metrics.loss,
                    "train_accuracy": metrics.train_accuracy,
                    "val_accuracy": metrics.val_accuracy,
                    "test_accuracy": metrics.test_accuracy,
                },
            )

        def should_stop() -> bool:
            return state.cancel_event.is_set()

        result = await asyncio.to_thread(
            train_model,
            model=model,
            data=dataset["data"],
            epochs=epochs,
            on_epoch=on_epoch,
            should_stop=should_stop,
        )

        run = db.scalar(select(TrainingRun).where(TrainingRun.id == run_id))
        if run is None:
            # Row vanished mid-training (admin deletion, cascaded user removal,
            # manual DB cleanup). Without flipping runtime state to a terminal
            # value, WS subscribers would hang forever and future starts for
            # this run_id would be blocked by the queued/running guard.
            await runtime.set_status(run_id, "failed", error="Training run was deleted")
            return

        if state.cancel_event.is_set():
            run.status = "canceled"
            run.finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.commit()
            await runtime.set_status(run_id, "canceled")
            return

        paths = save_training_result(run_id, result)
        _record_artifacts(db, run_id, paths)

        run.status = "completed"
        run.best_accuracy = max(
            float(run.best_accuracy) if run.best_accuracy is not None else 0.0,
            result.best_accuracy,
        )
        run.best_loss = min(
            float(run.best_loss) if run.best_loss is not None else float("inf"),
            result.best_loss,
        )
        run.finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()

        await runtime.set_status(
            run_id,
            "completed",
            final_metric={
                "best_accuracy": result.best_accuracy,
                "best_loss": result.best_loss,
                "final_epoch": result.final_epoch,
                "elapsed_seconds": result.elapsed_seconds,
            },
        )
    except Exception as exc:  # pragma: no cover — defensive top-level
        logger.exception("training task crashed for run %s", run_id)
        try:
            # If the triggering exception came from inside a failed db.commit()
            # (e.g. _record_artifacts or the final run update), the session is
            # left in a PendingRollback state and the next query here would
            # raise PendingRollbackError, leaving the DB row stuck at
            # "running". Explicit rollback resets the session so we can write
            # the terminal "failed" status reliably.
            db.rollback()
            run = db.scalar(select(TrainingRun).where(TrainingRun.id == run_id))
            if run is not None:
                run.status = "failed"
                run.finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
                db.commit()
        finally:
            await runtime.set_status(run_id, "failed", error=str(exc))
    finally:
        db.close()


def get_embedding_payload(run_id: int) -> Dict[str, Any]:
    return load_embedding(run_id)


def get_report_payload(run_id: int) -> Dict[str, Any]:
    return load_report(run_id)


async def explain_run_node(
    run_id: int,
    node_index: int,
    custom_payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Run GNNExplainer for a single node using the latest checkpoint."""
    db = SessionLocal()
    try:
        run = db.scalar(select(TrainingRun).where(TrainingRun.id == run_id))
        if run is None:
            raise ValueError("Training run not found")
        if run.status != "completed":
            raise ValueError("Training run has not completed yet")

        checkpoint = db.scalar(
            select(Artifact).where(
                Artifact.run_id == run_id, Artifact.artifact_type == "checkpoint"
            )
        )
        if checkpoint is None:
            raise ValueError("No checkpoint artifact for this run")

        dataset = load_dataset(run.dataset_name, custom_payload=custom_payload)

        import torch

        state_dict = torch.load(checkpoint.object_key, map_location="cpu", weights_only=True)
        # Recover hidden_dim from the classifier weight shape [num_classes, hidden_dim]
        # so we can rebuild the model with the same architecture as training.
        classifier_weight = state_dict.get("classifier.weight")
        if classifier_weight is None:
            raise ValueError("Checkpoint is missing classifier weights")
        hidden_dim = int(classifier_weight.shape[1])
        model = build_model(
            kind=run.model_type,
            in_dim=dataset["num_features"],
            num_classes=dataset["num_classes"],
            hidden_dim=hidden_dim,
        )
        model.load_state_dict(state_dict)

        result = await asyncio.to_thread(
            explain_node, model=model, data=dataset["data"], node_index=int(node_index)
        )
        return {
            "node_index": result.node_index,
            "predicted_class": result.predicted_class,
            "node_mask": result.node_mask.tolist(),
            "edge_mask": result.edge_mask.tolist(),
            "edge_index": result.edge_index.tolist(),
        }
    finally:
        db.close()
