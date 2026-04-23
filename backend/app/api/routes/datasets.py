from typing import List

from fastapi import APIRouter, HTTPException, status

from app.schemas.dataset import GraphDatasetPayload
from app.services.dataset_service import get_available_datasets, get_default_dataset, validate_dataset

router = APIRouter()


@router.get("", response_model=List[str])
def list_datasets() -> List[str]:
    return get_available_datasets()


@router.get("/default", response_model=GraphDatasetPayload)
def default_dataset() -> GraphDatasetPayload:
    return get_default_dataset()


@router.post("/validate", response_model=GraphDatasetPayload)
def validate_dataset_payload(payload: GraphDatasetPayload) -> GraphDatasetPayload:
    try:
        return validate_dataset(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
