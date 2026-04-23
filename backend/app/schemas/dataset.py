from typing import List, Optional

from pydantic import BaseModel, Field


class GraphNodeDisplay(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None


class GraphNodePayload(BaseModel):
    id: str
    label: Optional[int] = None
    features: List[float] = Field(default_factory=list)
    display: Optional[GraphNodeDisplay] = None


class GraphEdgePayload(BaseModel):
    id: Optional[str] = None
    source: str
    target: str
    weight: Optional[float] = None
    relation: Optional[str] = None


class GraphDatasetPayload(BaseModel):
    graph_id: Optional[str] = None
    name: str = Field(min_length=1, max_length=255)
    directed: bool = False
    nodes: List[GraphNodePayload] = Field(default_factory=list)
    edges: List[GraphEdgePayload] = Field(default_factory=list)
