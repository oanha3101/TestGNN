"""End-to-end smoke test for the ML engine.

Creates a user, creates a training run, starts training over a small custom
graph, watches progress over the WebSocket, then fetches embeddings + report
via REST.

Run with the server up on 127.0.0.1:8000.
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
import uuid

import requests
import websockets

BASE = "http://127.0.0.1:8000/api/v1"
WS_BASE = "ws://127.0.0.1:8000/api/v1"


def _tiny_graph() -> dict:
    # 6 nodes, 2 classes, chain graph; enough for the trainer to learn something
    # deterministic and run fast.
    return {
        "name": "smoke-ml",
        "directed": False,
        "nodes": [
            {"id": f"v{i}", "label": i % 2, "features": [float(i), float(i % 2), 1.0, 0.0]}
            for i in range(6)
        ],
        "edges": [
            {"id": f"e{i}", "source": f"v{i}", "target": f"v{i+1}", "weight": 1.0}
            for i in range(5)
        ],
    }


async def _watch(run_id: int, token: str) -> dict | None:
    url = f"{WS_BASE}/ws/training/{run_id}?token={token}"
    async with websockets.connect(url) as ws:
        last_progress = None
        while True:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=60)
            except asyncio.TimeoutError:
                return None
            msg = json.loads(raw)
            if msg.get("type") == "progress":
                last_progress = msg
            if msg.get("type") == "status" and msg.get("status") in {
                "completed",
                "failed",
                "canceled",
            }:
                return {"final_status": msg, "last_progress": last_progress}


async def _run() -> None:
    email = f"ml_smoke_{uuid.uuid4().hex[:8]}@example.com"
    password = "Passw0rd!"
    register = requests.post(
        f"{BASE}/auth/register",
        json={"email": email, "password": password, "display_name": "ML Smoke"},
        timeout=10,
    )
    register.raise_for_status()
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create = requests.post(
        f"{BASE}/training-runs",
        json={"model_type": "GCN", "dataset_name": "smoke-ml", "epoch_total": 30},
        headers=headers,
        timeout=10,
    )
    create.raise_for_status()
    run_id = create.json()["id"]

    start = requests.post(
        f"{BASE}/training-runs/{run_id}/start",
        json={"epochs": 30, "hidden_dim": 16, "custom_dataset": _tiny_graph()},
        headers=headers,
        timeout=10,
    )
    start.raise_for_status()

    # Brief pause to let the WS subscribe before training finishes (30 epochs is fast).
    time.sleep(0.3)

    result = await _watch(run_id, token)
    if result is None:
        raise RuntimeError("WebSocket did not produce a final status in time")
    final = result["final_status"]
    if final.get("status") != "completed":
        raise RuntimeError(f"Training did not complete cleanly: {final}")

    emb = requests.get(
        f"{BASE}/training-runs/{run_id}/embeddings", headers=headers, timeout=10
    )
    emb.raise_for_status()
    emb_json = emb.json()

    report = requests.get(
        f"{BASE}/training-runs/{run_id}/report", headers=headers, timeout=10
    )
    report.raise_for_status()

    explain = requests.post(
        f"{BASE}/training-runs/{run_id}/explain",
        json={"node_index": 0, "custom_dataset": _tiny_graph()},
        headers=headers,
        timeout=60,
    )
    explain.raise_for_status()

    print(
        json.dumps(
            {
                "ok": True,
                "run_id": run_id,
                "final_status": final,
                "embedding_shape": [len(emb_json["embedding_2d"]), 2],
                "best_accuracy": report.json().get("best_accuracy"),
                "best_loss": report.json().get("best_loss"),
                "elapsed_seconds": report.json().get("elapsed_seconds"),
                "explain_predicted_class": explain.json().get("predicted_class"),
            }
        )
    )


if __name__ == "__main__":
    try:
        asyncio.run(_run())
    except Exception as exc:  # pragma: no cover
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
