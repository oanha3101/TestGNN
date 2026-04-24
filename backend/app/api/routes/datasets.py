from typing import List

from fastapi import APIRouter, HTTPException, status

from app.schemas.dataset import GraphDatasetPayload
from app.services.dataset_service import (
    get_available_datasets,
    get_dataset,
    get_default_dataset,
    validate_dataset,
)

router = APIRouter()


@router.get("", response_model=List[str])
def list_datasets() -> List[str]:
    return get_available_datasets()


@router.get("/default", response_model=GraphDatasetPayload)
def default_dataset() -> GraphDatasetPayload:
    return get_default_dataset()


@router.get("/{dataset_name}", response_model=GraphDatasetPayload)
def dataset_by_name(dataset_name: str) -> GraphDatasetPayload:
    try:
        return get_dataset(dataset_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/validate", response_model=GraphDatasetPayload)
def validate_dataset_payload(payload: GraphDatasetPayload) -> GraphDatasetPayload:
    try:
        return validate_dataset(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
