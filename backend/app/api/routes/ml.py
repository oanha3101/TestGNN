"""ML-specific REST endpoints layered on top of /training-runs."""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import TrainingRun, User
from app.ml import runtime
from app.services import ml_service

router = APIRouter(prefix="/training-runs", tags=["ml"])


class StartTrainingRequest(BaseModel):
    epochs: int = Field(default=200, ge=1, le=2000)
    hidden_dim: int = Field(default=32, ge=4, le=256)
    custom_dataset: Optional[Dict[str, Any]] = None


class ExplainRequest(BaseModel):
    node_index: int = Field(ge=0)
    custom_dataset: Optional[Dict[str, Any]] = None


def _load_run_or_404(db: Session, run_id: int, user: User) -> TrainingRun:
    run = db.query(TrainingRun).filter(TrainingRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Training run not found")
    if user.role != "admin" and run.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return run


@router.post("/{run_id}/start", status_code=status.HTTP_202_ACCEPTED)
async def start_run(
    run_id: int,
    payload: StartTrainingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _load_run_or_404(db, run_id, current_user)
    await ml_service.start_training(
        run_id=run_id,
        epochs=payload.epochs,
        hidden_dim=payload.hidden_dim,
        custom_payload=payload.custom_dataset,
    )
    return {"run_id": run_id, "status": "queued", "epochs": payload.epochs}


@router.post("/{run_id}/cancel")
async def cancel_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _load_run_or_404(db, run_id, current_user)
    ok = await runtime.cancel(run_id)
    return {"run_id": run_id, "cancelled": ok}


@router.get("/{run_id}/embeddings")
def get_embeddings(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _load_run_or_404(db, run_id, current_user)
    try:
        return ml_service.get_embedding_payload(run_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{run_id}/report")
def get_report(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _load_run_or_404(db, run_id, current_user)
    try:
        return ml_service.get_report_payload(run_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{run_id}/explain")
async def explain(
    run_id: int,
    payload: ExplainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _load_run_or_404(db, run_id, current_user)
    try:
        return await ml_service.explain_run_node(
            run_id=run_id,
            node_index=payload.node_index,
            custom_payload=payload.custom_dataset,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
