"""Tests for /training-runs CRUD, authz, and pagination behaviour."""

from __future__ import annotations

from fastapi.testclient import TestClient


def _create_run(client: TestClient, headers: dict, **overrides) -> dict:
    payload = {
        "name": "GCN on Cora",
        "model_type": "GCN",
        "dataset_name": "Cora",
        "config_json": {"hidden_dim": 32, "epochs": 200},
    }
    payload.update(overrides)
    resp = client.post("/api/v1/training-runs", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_training_run_returns_record(client: TestClient, auth_headers: dict) -> None:
    run = _create_run(client, auth_headers)
    assert run["model_type"] == "GCN"
    assert run["dataset_name"] == "Cora"
    assert run["status"] in {"queued", "pending", "idle"}


def test_list_training_runs_only_returns_owner_runs(client: TestClient) -> None:
    # Alice creates a run.
    alice_headers = {
        "Authorization": f"Bearer {_register(client, 'alice2@example.com')}"
    }
    _create_run(client, alice_headers, name="Alice run")

    # Bob should not see Alice's run.
    bob_headers = {"Authorization": f"Bearer {_register(client, 'bob@example.com')}"}
    resp = client.get("/api/v1/training-runs", headers=bob_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 0
    assert body["items"] == []


def test_training_run_detail_requires_owner(client: TestClient) -> None:
    alice_headers = {
        "Authorization": f"Bearer {_register(client, 'alice3@example.com')}"
    }
    run = _create_run(client, alice_headers)

    bob_headers = {"Authorization": f"Bearer {_register(client, 'bob3@example.com')}"}
    resp = client.get(f"/api/v1/training-runs/{run['id']}", headers=bob_headers)
    assert resp.status_code in (403, 404)


def test_ml_start_validates_epoch_bounds(client: TestClient, auth_headers: dict) -> None:
    run = _create_run(client, auth_headers)

    # Pydantic should reject epochs > 2000 or < 1.
    too_many = client.post(
        f"/api/v1/training-runs/{run['id']}/start",
        json={"epochs": 99999},
        headers=auth_headers,
    )
    assert too_many.status_code == 422


def test_ml_start_rejects_unknown_run(client: TestClient, auth_headers: dict) -> None:
    resp = client.post(
        "/api/v1/training-runs/987654/start",
        json={"epochs": 5},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def _register(client: TestClient, email: str, password: str = "Testing12345") -> str:
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "display_name": email.split("@")[0],
            "accept_terms": True,
        },
    )
    assert reg.status_code in (200, 201), reg.text
    return reg.json()["access_token"]
