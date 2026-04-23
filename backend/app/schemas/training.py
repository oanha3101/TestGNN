from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class TrainingMetricWrite(BaseModel):
    epoch: int = Field(ge=1)
    loss: float = Field(ge=0)
    accuracy: float = Field(ge=0, le=1)


class TrainingRunCreateRequest(BaseModel):
    model_type: str = Field(pattern="^(GCN|GAT|GraphSAGE|GraphTransformer)$")
    dataset_name: str = Field(min_length=1, max_length=255)
    epoch_total: int = Field(default=0, ge=0)


class TrainingRunUpdateRequest(BaseModel):
    status: Optional[str] = Field(
        default=None,
        pattern="^(queued|running|completed|failed|canceled)$",
    )
    epoch_current: Optional[int] = Field(default=None, ge=0)
    epoch_total: Optional[int] = Field(default=None, ge=0)
    best_accuracy: Optional[float] = Field(default=None, ge=0, le=1)
    best_loss: Optional[float] = Field(default=None, ge=0)
    metric: Optional[TrainingMetricWrite] = None


class TrainingMetricItem(BaseModel):
    id: int
    epoch: int
    loss: float
    accuracy: float
    created_at: datetime


class TrainingRunItem(BaseModel):
    id: int
    user_id: int
    model_type: str
    dataset_name: str
    status: str
    epoch_current: int
    epoch_total: int
    best_accuracy: Optional[float]
    best_loss: Optional[float]
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    created_at: datetime
    metrics: List[TrainingMetricItem]
