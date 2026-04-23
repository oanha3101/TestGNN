"""Dataset loaders.

Two sources:
- Built-in Planetoid datasets (Cora, Citeseer, PubMed) downloaded via
  torch_geometric.datasets.Planetoid and cached on disk.
- Custom JSON graphs uploaded through /api/v1/datasets/validate (same shape
  as the frontend's GraphDatasetPayload).

The returned object is a dict describing a ready-to-train problem:
    {
        "data": torch_geometric.data.Data,   # x, edge_index, y, train_mask, ...
        "num_features": int,
        "num_classes": int,
        "name": str,
        "node_ids": list[str] | None,        # original ids for JSON graphs
    }
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import torch
from torch_geometric.data import Data
from torch_geometric.datasets import Planetoid


PLANETOID_NAMES = {
    "cora": "Cora",
    "cora citation network": "Cora",
    "citeseer": "CiteSeer",
    "pubmed": "PubMed",
}


def _data_root() -> Path:
    root = Path(os.environ.get("ML_DATA_DIR", str(Path.home() / ".gnnvp_data")))
    root.mkdir(parents=True, exist_ok=True)
    return root


def is_planetoid(name: str) -> bool:
    return name.strip().lower() in PLANETOID_NAMES


def load_planetoid(name: str) -> Dict[str, Any]:
    canonical = PLANETOID_NAMES[name.strip().lower()]
    root = _data_root() / "planetoid"
    dataset = Planetoid(root=str(root), name=canonical)
    data: Data = dataset[0]
    return {
        "data": data,
        "num_features": dataset.num_features,
        "num_classes": dataset.num_classes,
        "name": canonical,
        "node_ids": None,
    }


def _make_masks(num_nodes: int, labels: torch.Tensor, train_ratio: float = 0.6,
                val_ratio: float = 0.2) -> Dict[str, torch.Tensor]:
    """Deterministic per-class train/val/test split."""
    g = torch.Generator().manual_seed(42)
    perm = torch.randperm(num_nodes, generator=g)
    n_train = int(num_nodes * train_ratio)
    n_val = int(num_nodes * val_ratio)

    train_mask = torch.zeros(num_nodes, dtype=torch.bool)
    val_mask = torch.zeros(num_nodes, dtype=torch.bool)
    test_mask = torch.zeros(num_nodes, dtype=torch.bool)
    train_mask[perm[:n_train]] = True
    val_mask[perm[n_train:n_train + n_val]] = True
    test_mask[perm[n_train + n_val:]] = True
    return {"train_mask": train_mask, "val_mask": val_mask, "test_mask": test_mask}


def load_custom_json(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a GraphDatasetPayload dict into a torch_geometric.data.Data.

    Expected shape:
        {
            "name": "...",
            "nodes": [{"id": "v0", "label": 0, "features": [...], ...}],
            "edges": [{"source": "v0", "target": "v1", "weight": 1.0, ...}],
            "directed": false,
        }
    """
    nodes = payload.get("nodes") or []
    edges = payload.get("edges") or []
    if not nodes:
        raise ValueError("Dataset has no nodes")

    id_to_idx: Dict[str, int] = {str(node["id"]): i for i, node in enumerate(nodes)}
    node_ids = list(id_to_idx.keys())

    feature_lens = {len(node.get("features") or []) for node in nodes}
    if len(feature_lens) != 1 or 0 in feature_lens:
        raise ValueError("Every node must share the same non-empty feature vector length")

    x = torch.tensor([list(node["features"]) for node in nodes], dtype=torch.float32)

    labels = [int(node.get("label", 0)) for node in nodes]
    y = torch.tensor(labels, dtype=torch.long)
    num_classes = int(max(labels)) + 1 if labels else 1

    edge_index_src: List[int] = []
    edge_index_dst: List[int] = []
    directed = bool(payload.get("directed", False))
    for edge in edges:
        s = id_to_idx.get(str(edge["source"]))
        t = id_to_idx.get(str(edge["target"]))
        if s is None or t is None:
            continue
        edge_index_src.append(s)
        edge_index_dst.append(t)
        if not directed:
            edge_index_src.append(t)
            edge_index_dst.append(s)

    if not edge_index_src:
        # At minimum we need a self-loop so GNN layers don't crash.
        edge_index_src = list(range(len(nodes)))
        edge_index_dst = list(range(len(nodes)))

    edge_index = torch.tensor([edge_index_src, edge_index_dst], dtype=torch.long)
    masks = _make_masks(num_nodes=len(nodes), labels=y)
    data = Data(
        x=x,
        edge_index=edge_index,
        y=y,
        train_mask=masks["train_mask"],
        val_mask=masks["val_mask"],
        test_mask=masks["test_mask"],
    )

    return {
        "data": data,
        "num_features": x.size(1),
        "num_classes": max(num_classes, 2),
        "name": str(payload.get("name") or "Custom JSON"),
        "node_ids": node_ids,
    }


def load_dataset(name: str, custom_payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """High-level entry point.

    - If `custom_payload` is provided, always treat as custom JSON.
    - Else, if `name` matches a Planetoid alias, download/load it.
    - Otherwise raise ValueError.
    """
    if custom_payload is not None:
        return load_custom_json(custom_payload)
    if is_planetoid(name):
        return load_planetoid(name)
    raise ValueError(
        f"Unknown dataset {name!r}. Expected one of: Cora, CiteSeer, PubMed, "
        "or provide a Custom JSON payload."
    )
