"""Graph neural network models.

Four architectures, each a thin stack over torch_geometric.nn layers:
- GCN            : semi-supervised classification (Kipf & Welling 2017)
- GAT            : attention-based (Veličković et al. 2018); exposes attention weights
- GraphSAGE      : inductive aggregation (Hamilton et al. 2017)
- GraphTransformer: transformer-style message passing (Shi et al. 2021)

All models implement the same interface:
    model = build_model(kind, in_dim, hidden_dim, num_classes, ...)
    logits = model(x, edge_index)
    embeddings = model.embed(x, edge_index)  # pre-classifier representation

Keeping the API uniform lets the trainer and explainer be model-agnostic.
"""

from __future__ import annotations

from typing import Literal

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch import Tensor
from torch_geometric.nn import GATConv, GCNConv, SAGEConv, TransformerConv


ModelKind = Literal["GCN", "GAT", "GraphSAGE", "GraphTransformer"]


class GCN(nn.Module):
    def __init__(self, in_dim: int, hidden_dim: int, num_classes: int, dropout: float = 0.5):
        super().__init__()
        # cached=False so GNNExplainer's edge-mask optimisation actually takes
        # effect. With cached=True GCNConv memoises the normalised adjacency
        # on the first forward pass and ignores the mask on subsequent passes.
        self.conv1 = GCNConv(in_dim, hidden_dim, cached=False)
        self.conv2 = GCNConv(hidden_dim, hidden_dim, cached=False)
        self.classifier = nn.Linear(hidden_dim, num_classes)
        self.dropout = dropout

    def embed(self, x: Tensor, edge_index: Tensor) -> Tensor:
        x = F.relu(self.conv1(x, edge_index))
        x = F.dropout(x, p=self.dropout, training=self.training)
        x = F.relu(self.conv2(x, edge_index))
        return x

    def forward(self, x: Tensor, edge_index: Tensor) -> Tensor:
        return self.classifier(self.embed(x, edge_index))


class GAT(nn.Module):
    def __init__(
        self,
        in_dim: int,
        hidden_dim: int,
        num_classes: int,
        heads: int = 4,
        dropout: float = 0.6,
    ):
        super().__init__()
        self.conv1 = GATConv(in_dim, hidden_dim, heads=heads, dropout=dropout)
        self.conv2 = GATConv(
            hidden_dim * heads, hidden_dim, heads=1, concat=False, dropout=dropout
        )
        self.classifier = nn.Linear(hidden_dim, num_classes)
        self.dropout = dropout
        # Will hold (edge_index_with_self_loops, alpha) from the most recent forward.
        self.last_attention: tuple[Tensor, Tensor] | None = None

    def embed(self, x: Tensor, edge_index: Tensor) -> Tensor:
        x = F.dropout(x, p=self.dropout, training=self.training)
        x = F.elu(self.conv1(x, edge_index))
        x = F.dropout(x, p=self.dropout, training=self.training)
        x, attn = self.conv2(x, edge_index, return_attention_weights=True)
        self.last_attention = attn
        return x

    def forward(self, x: Tensor, edge_index: Tensor) -> Tensor:
        return self.classifier(self.embed(x, edge_index))


class GraphSAGE(nn.Module):
    def __init__(self, in_dim: int, hidden_dim: int, num_classes: int, dropout: float = 0.5):
        super().__init__()
        self.conv1 = SAGEConv(in_dim, hidden_dim, aggr="mean")
        self.conv2 = SAGEConv(hidden_dim, hidden_dim, aggr="mean")
        self.classifier = nn.Linear(hidden_dim, num_classes)
        self.dropout = dropout

    def embed(self, x: Tensor, edge_index: Tensor) -> Tensor:
        x = F.relu(self.conv1(x, edge_index))
        x = F.dropout(x, p=self.dropout, training=self.training)
        x = F.relu(self.conv2(x, edge_index))
        return x

    def forward(self, x: Tensor, edge_index: Tensor) -> Tensor:
        return self.classifier(self.embed(x, edge_index))


class GraphTransformer(nn.Module):
    def __init__(
        self,
        in_dim: int,
        hidden_dim: int,
        num_classes: int,
        heads: int = 4,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.conv1 = TransformerConv(in_dim, hidden_dim, heads=heads, dropout=dropout)
        self.conv2 = TransformerConv(
            hidden_dim * heads, hidden_dim, heads=1, concat=False, dropout=dropout
        )
        self.classifier = nn.Linear(hidden_dim, num_classes)
        self.dropout = dropout

    def embed(self, x: Tensor, edge_index: Tensor) -> Tensor:
        x = F.elu(self.conv1(x, edge_index))
        x = F.dropout(x, p=self.dropout, training=self.training)
        x = F.elu(self.conv2(x, edge_index))
        return x

    def forward(self, x: Tensor, edge_index: Tensor) -> Tensor:
        return self.classifier(self.embed(x, edge_index))


def build_model(
    kind: ModelKind,
    in_dim: int,
    num_classes: int,
    hidden_dim: int = 32,
) -> nn.Module:
    if kind == "GCN":
        return GCN(in_dim, hidden_dim, num_classes)
    if kind == "GAT":
        return GAT(in_dim, hidden_dim, num_classes)
    if kind == "GraphSAGE":
        return GraphSAGE(in_dim, hidden_dim, num_classes)
    if kind == "GraphTransformer":
        return GraphTransformer(in_dim, hidden_dim, num_classes)
    raise ValueError(f"Unknown model kind: {kind}")
