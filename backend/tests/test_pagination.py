from fastapi.testclient import TestClient


def _create_run(client: TestClient, auth_headers: dict, dataset: str) -> None:
    resp = client.post(
        "/api/v1/training-runs",
        headers=auth_headers,
        json={"model_type": "GCN", "dataset_name": dataset, "epoch_total": 10},
    )
    assert resp.status_code == 201, resp.text


def test_training_runs_return_page_envelope(client: TestClient, auth_headers: dict) -> None:
    for i in range(3):
        _create_run(client, auth_headers, f"Dataset {i}")

    resp = client.get("/api/v1/training-runs", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"items", "total", "limit", "offset"}
    assert body["total"] == 3
    assert body["limit"] == 20
    assert body["offset"] == 0
    assert len(body["items"]) == 3


def test_training_runs_respect_limit_and_offset(client: TestClient, auth_headers: dict) -> None:
    for i in range(5):
        _create_run(client, auth_headers, f"Dataset {i}")

    page_one = client.get(
        "/api/v1/training-runs?limit=2&offset=0",
        headers=auth_headers,
    ).json()
    page_two = client.get(
        "/api/v1/training-runs?limit=2&offset=2",
        headers=auth_headers,
    ).json()

    assert page_one["total"] == page_two["total"] == 5
    assert len(page_one["items"]) == 2
    assert len(page_two["items"]) == 2
    # Newest-first ordering means the offset-page pair must be disjoint:
    page_one_ids = {item["id"] for item in page_one["items"]}
    page_two_ids = {item["id"] for item in page_two["items"]}
    assert page_one_ids.isdisjoint(page_two_ids)


def test_training_runs_rejects_invalid_limit(client: TestClient, auth_headers: dict) -> None:
    resp = client.get("/api/v1/training-runs?limit=0", headers=auth_headers)
    assert resp.status_code == 422
    over = client.get("/api/v1/training-runs?limit=500", headers=auth_headers)
    assert over.status_code == 422


def test_posts_endpoint_returns_page_envelope(client: TestClient, auth_headers: dict) -> None:
    resp = client.get("/api/v1/posts", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"items", "total", "limit", "offset"}
    assert body["items"] == []
    assert body["total"] == 0


def test_admin_users_requires_admin(client: TestClient, auth_headers: dict) -> None:
    resp = client.get("/api/v1/admin/users", headers=auth_headers)
    assert resp.status_code == 403
