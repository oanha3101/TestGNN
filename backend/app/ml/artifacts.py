"""On-disk artifact storage for training runs.

Files are written under {ML_DATA_DIR}/artifacts/run_{id}/ and referenced from
the `artifacts` table via `object_key`. Small enough for a monolith; replace
with S3/GCS later without touching callers.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

import numpy as np
import torch
from sklearn.decomposition import PCA
from torch import Tensor

from app.ml.trainer import TrainingResult


def _artifacts_root() -> Path:
    root = Path(os.environ.get("ML_DATA_DIR", str(Path.home() / ".gnnvp_data"))) / "artifacts"
    root.mkdir(parents=True, exist_ok=True)
    return root


def run_dir(run_id: int) -> Path:
    path = _artifacts_root() / f"run_{run_id}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _project_2d(embeddings: Tensor) -> np.ndarray:
    """Project node embeddings to 2D using PCA for the embedding viewer."""
    emb = embeddings.detach().cpu().numpy()
    if emb.shape[1] <= 2:
        padded = np.zeros((emb.shape[0], 2), dtype=np.float32)
        padded[:, : emb.shape[1]] = emb[:, : min(2, emb.shape[1])]
        return padded
    pca = PCA(n_components=2)
    return pca.fit_transform(emb).astype(np.float32)


def save_training_result(run_id: int, result: TrainingResult) -> Dict[str, Path]:
    """Persist checkpoint + 2D embedding + predictions + attention.

    Returns a map of artifact_type → Path for the caller to record in the DB.
    """
    target = run_dir(run_id)

    checkpoint_path = target / "checkpoint.pt"
    torch.save(result.model_state, checkpoint_path)

    embedding_2d = _project_2d(result.embeddings)
    embedding_path = target / "embedding.npz"
    np.savez_compressed(
        embedding_path,
        embedding_2d=embedding_2d,
        embedding_raw=result.embeddings.detach().cpu().numpy().astype(np.float32),
        predictions=result.predictions.detach().cpu().numpy().astype(np.int64),
        logits=result.logits.detach().cpu().numpy().astype(np.float32),
    )

    report_path = target / "report.npz"
    report_data: Dict[str, Any] = {
        "best_accuracy": np.float32(result.best_accuracy),
        "best_loss": np.float32(result.best_loss),
        "final_epoch": np.int64(result.final_epoch),
        "elapsed_seconds": np.float32(result.elapsed_seconds),
    }
    if result.attention is not None:
        report_data["attention_edge_index"] = (
            result.attention["edge_index"].detach().cpu().numpy().astype(np.int64)
        )
        report_data["attention_weights"] = (
            result.attention["weights"].detach().cpu().numpy().astype(np.float32)
        )
    np.savez_compressed(report_path, **report_data)

    return {
        "checkpoint": checkpoint_path,
        "embedding": embedding_path,
        "report": report_path,
    }


def load_embedding(run_id: int) -> Dict[str, Any]:
    path = run_dir(run_id) / "embedding.npz"
    if not path.exists():
        raise FileNotFoundError(f"No embedding artifact for run {run_id}")
    npz = np.load(path)
    return {
        "embedding_2d": npz["embedding_2d"].tolist(),
        "predictions": npz["predictions"].tolist(),
    }


def load_report(run_id: int) -> Dict[str, Any]:
    path = run_dir(run_id) / "report.npz"
    if not path.exists():
        raise FileNotFoundError(f"No report artifact for run {run_id}")
    npz = np.load(path)
    out: Dict[str, Any] = {
        "best_accuracy": float(npz["best_accuracy"]),
        "best_loss": float(npz["best_loss"]),
        "final_epoch": int(npz["final_epoch"]),
        "elapsed_seconds": float(npz["elapsed_seconds"]),
    }
    if "attention_weights" in npz.files:
        out["attention"] = {
            "edge_index": npz["attention_edge_index"].tolist(),
            "weights": npz["attention_weights"].tolist(),
        }
    return out
