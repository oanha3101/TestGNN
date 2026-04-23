from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.schemas.training import (
    TrainingRunCreateRequest,
    TrainingRunItem,
    TrainingRunUpdateRequest,
)
from app.services.training_service import (
    create_training_run,
    get_training_run,
    list_training_runs,
    to_training_run_schema,
    update_training_run,
)

router = APIRouter()


@router.get("", response_model=List[TrainingRunItem])
def get_training_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[TrainingRunItem]:
    runs = list_training_runs(db, current_user)
    return [to_training_run_schema(run) for run in runs]


@router.post("", response_model=TrainingRunItem, status_code=status.HTTP_201_CREATED)
def create_training_run_handler(
    payload: TrainingRunCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrainingRunItem:
    run = create_training_run(db, current_user, payload)
    return to_training_run_schema(run)


@router.get("/{run_id}", response_model=TrainingRunItem)
def get_training_run_handler(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrainingRunItem:
    run = get_training_run(db, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training run not found")
    if current_user.role != "admin" and run.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return to_training_run_schema(run)


@router.patch("/{run_id}", response_model=TrainingRunItem)
def update_training_run_handler(
    run_id: int,
    payload: TrainingRunUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrainingRunItem:
    try:
        run = update_training_run(db, current_user, run_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    return to_training_run_schema(run)
