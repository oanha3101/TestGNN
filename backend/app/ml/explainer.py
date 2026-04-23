"""GNNExplainer wrapper.

Returns node_mask + edge_mask for a target node so the frontend can highlight
the subgraph that most influenced the prediction.
"""

from __future__ import annotations

from dataclasses import dataclass

import torch
from torch import Tensor
from torch_geometric.data import Data
from torch_geometric.explain import Explainer, GNNExplainer


@dataclass
class ExplanationResult:
    node_index: int
    predicted_class: int
    node_mask: Tensor   # [N, F] importance per feature
    edge_mask: Tensor   # [E]  importance per edge
    edge_index: Tensor  # [2, E]


def explain_node(
    model: torch.nn.Module,
    data: Data,
    node_index: int,
    epochs: int = 200,
) -> ExplanationResult:
    """Run GNNExplainer on a single target node.

    Uses PyG's built-in Explainer API with model output preset to logits +
    classification task, which is what all our models expose.
    """
    model = model.eval()

    explainer = Explainer(
        model=model,
        algorithm=GNNExplainer(epochs=epochs),
        explanation_type="model",
        node_mask_type="attributes",
        edge_mask_type="object",
        model_config=dict(
            mode="multiclass_classification",
            task_level="node",
            return_type="raw",
        ),
    )

    explanation = explainer(
        x=data.x,
        edge_index=data.edge_index,
        index=torch.tensor([node_index], dtype=torch.long),
    )

    with torch.no_grad():
        logits = model(data.x, data.edge_index)
        predicted = int(logits[node_index].argmax().item())

    return ExplanationResult(
        node_index=int(node_index),
        predicted_class=predicted,
        node_mask=explanation.node_mask.detach().cpu(),
        edge_mask=explanation.edge_mask.detach().cpu(),
        edge_index=data.edge_index.detach().cpu(),
    )
