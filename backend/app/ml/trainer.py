"""Training loop.

Callback-based so the WebSocket/REST layer can stream progress without any
knowledge of PyTorch. `train_model` yields after every epoch via `on_epoch`.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

import torch
import torch.nn.functional as F
from torch import Tensor
from torch_geometric.data import Data


@dataclass
class EpochMetrics:
    epoch: int
    loss: float
    train_accuracy: float
    val_accuracy: float
    test_accuracy: float


@dataclass
class TrainingResult:
    model_state: Dict[str, Tensor]
    embeddings: Tensor              # [N, hidden_dim]
    predictions: Tensor             # [N]
    logits: Tensor                  # [N, num_classes]
    best_accuracy: float
    best_loss: float
    final_epoch: int
    elapsed_seconds: float
    attention: Optional[Dict[str, Any]] = None  # {"edge_index": [2, E], "weights": [E]}


def _masked_accuracy(pred: Tensor, y: Tensor, mask: Tensor) -> float:
    if mask.sum().item() == 0:
        return 0.0
    return float((pred[mask] == y[mask]).float().mean().item())


def train_model(
    model: torch.nn.Module,
    data: Data,
    epochs: int = 200,
    lr: float = 0.01,
    weight_decay: float = 5e-4,
    on_epoch: Optional[Callable[[EpochMetrics], None]] = None,
    should_stop: Optional[Callable[[], bool]] = None,
) -> TrainingResult:
    """Train a node-classification GNN.

    `on_epoch` runs synchronously after each epoch — it should be cheap (push
    to a queue, not I/O-bound).
    `should_stop` gives the caller a chance to abort early (e.g. client
    disconnected or user cancelled); checked every epoch.
    """
    device = torch.device("cpu")
    model = model.to(device)
    data = data.to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)

    best_acc = 0.0
    best_loss = float("inf")
    start = time.monotonic()
    # Initialised here so `final_epoch=epoch` below is well-defined even when
    # `epochs == 0` and the loop body never executes.
    epoch = 0

    for epoch in range(1, epochs + 1):
        if should_stop and should_stop():
            break

        model.train()
        optimizer.zero_grad()
        logits = model(data.x, data.edge_index)
        train_mask = getattr(data, "train_mask")
        loss = F.cross_entropy(logits[train_mask], data.y[train_mask])
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            eval_logits = model(data.x, data.edge_index)
            pred = eval_logits.argmax(dim=-1)
            train_acc = _masked_accuracy(pred, data.y, train_mask)
            val_acc = _masked_accuracy(pred, data.y, getattr(data, "val_mask"))
            test_acc = _masked_accuracy(pred, data.y, getattr(data, "test_mask"))

        loss_value = float(loss.item())
        best_acc = max(best_acc, val_acc)
        best_loss = min(best_loss, loss_value)

        if on_epoch is not None:
            on_epoch(
                EpochMetrics(
                    epoch=epoch,
                    loss=loss_value,
                    train_accuracy=train_acc,
                    val_accuracy=val_acc,
                    test_accuracy=test_acc,
                )
            )

    model.eval()
    with torch.no_grad():
        embeddings = model.embed(data.x, data.edge_index).detach().cpu()
        logits = model(data.x, data.edge_index).detach().cpu()
        predictions = logits.argmax(dim=-1)

    attention: Optional[Dict[str, Any]] = None
    last = getattr(model, "last_attention", None)
    if last is not None:
        edge_index_attn, alpha = last
        attention = {
            "edge_index": edge_index_attn.detach().cpu(),
            "weights": alpha.detach().cpu(),
        }

    return TrainingResult(
        model_state={k: v.detach().cpu() for k, v in model.state_dict().items()},
        embeddings=embeddings,
        predictions=predictions,
        logits=logits,
        best_accuracy=best_acc,
        best_loss=best_loss,
        final_epoch=epoch,
        elapsed_seconds=time.monotonic() - start,
        attention=attention,
    )
