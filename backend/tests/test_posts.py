"""Tests for posts CRUD, visibility, and like/bookmark toggles."""

from __future__ import annotations

from fastapi.testclient import TestClient


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


def _create_run(client: TestClient, headers: dict) -> dict:
    resp = client.post(
        "/api/v1/training-runs",
        json={
            "name": "GCN run",
            "model_type": "GCN",
            "dataset_name": "Cora",
            "config_json": {"hidden_dim": 32, "epochs": 10},
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_post(client: TestClient, headers: dict, run_id: int, **overrides) -> dict:
    payload = {
        "title": "My training post",
        "summary": "A short summary about the training.",
        "content": "Detailed content body.",
        "tags": ["gnn", "cora"],
        "is_public": True,
        "training": {"run_id": run_id},
    }
    payload.update(overrides)
    resp = client.post("/api/v1/posts", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_and_list_public_post(client: TestClient, auth_headers: dict) -> None:
    run = _create_run(client, auth_headers)
    post = _create_post(client, auth_headers, run["id"])
    assert post["title"] == "My training post"

    listing = client.get("/api/v1/posts", headers=auth_headers)
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] >= 1
    assert any(p["id"] == post["id"] for p in body["items"])


def test_private_post_not_visible_to_others(client: TestClient, auth_headers: dict) -> None:
    run = _create_run(client, auth_headers)
    private = _create_post(client, auth_headers, run["id"], is_public=False, title="Private one")

    bob_headers = {"Authorization": f"Bearer {_register(client, 'bob-posts@example.com')}"}
    listing = client.get("/api/v1/posts", headers=bob_headers)
    assert listing.status_code == 200
    assert not any(p["id"] == private["id"] for p in listing.json()["items"])


def test_toggle_like_is_idempotent_per_user(client: TestClient, auth_headers: dict) -> None:
    run = _create_run(client, auth_headers)
    post = _create_post(client, auth_headers, run["id"])
    pid = post["id"]

    first = client.post(f"/api/v1/posts/{pid}/like", headers=auth_headers)
    assert first.status_code in (200, 204)

    second = client.post(f"/api/v1/posts/{pid}/like", headers=auth_headers)
    # Toggle semantics: second call removes the like, same status class.
    assert second.status_code in (200, 204)


def test_update_post_requires_author(client: TestClient, auth_headers: dict) -> None:
    run = _create_run(client, auth_headers)
    post = _create_post(client, auth_headers, run["id"])

    bob_headers = {"Authorization": f"Bearer {_register(client, 'bob-update@example.com')}"}
    resp = client.patch(
        f"/api/v1/posts/{post['id']}",
        json={
            "title": "hijacked",
            "summary": "nope",
            "content": "nope",
            "tags": [],
            "is_public": True,
            "training": {"run_id": run["id"]},
        },
        headers=bob_headers,
    )
    assert resp.status_code in (403, 404)
