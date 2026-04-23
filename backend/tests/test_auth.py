from fastapi.testclient import TestClient


def test_register_creates_user(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "password": "Testing12345", "display_name": "new"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["email"] == "new@example.com"
    assert body["access_token"]


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    payload = {"email": "dup@example.com", "password": "Testing12345", "display_name": "dup"}
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 400


def test_login_rejects_wrong_password(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "loginfail@example.com", "password": "Testing12345", "display_name": "lf"},
    )
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "loginfail@example.com", "password": "wrongwrong"},
    )
    assert resp.status_code == 401


def test_me_requires_bearer(client: TestClient) -> None:
    unauth = client.get("/api/v1/auth/me")
    assert unauth.status_code == 401


def test_me_returns_current_user(client: TestClient, auth_headers: dict) -> None:
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == "alice@example.com"
