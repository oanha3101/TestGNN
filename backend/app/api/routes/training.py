from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.db.models import User
from app.schemas.pagination import DEFAULT_LIMIT, MAX_LIMIT, Page
from app.schemas.training import (
    TrainingRunCreateRequest,
    TrainingRunItem,
    TrainingRunUpdateRequest,
)
from app.services.training_service import (
    create_training_run,
    get_training_run,
    list_training_runs_page,
    to_training_run_schema,
    update_training_run,
)

router = APIRouter()


@router.get("", response_model=Page[TrainingRunItem])
def get_training_runs(
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Page[TrainingRunItem]:
    runs, total = list_training_runs_page(db, current_user, limit=limit, offset=offset)
    return Page[TrainingRunItem](
        items=[to_training_run_schema(run) for run in runs],
        total=total,
        limit=limit,
        offset=offset,
    )


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
