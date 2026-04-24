from fastapi.testclient import TestClient


def test_register_creates_user(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@example.com",
            "password": "Testing12345",
            "display_name": "new",
            "accept_terms": True,
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["email"] == "new@example.com"
    assert body["access_token"]


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    payload = {
        "email": "dup@example.com",
        "password": "Testing12345",
        "display_name": "dup",
        "accept_terms": True,
    }
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 400


def test_register_requires_terms_agreement(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "noterms@example.com",
            "password": "Testing12345",
            "display_name": "noterms",
            "accept_terms": False,
        },
    )
    assert resp.status_code == 400
    assert "Terms" in resp.json()["detail"]


def test_login_rejects_wrong_password(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "loginfail@example.com",
            "password": "Testing12345",
            "display_name": "lf",
            "accept_terms": True,
        },
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


def test_forgot_password_unknown_email_is_still_200(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/forgot-password", json={"email": "nosuch@example.com"}
    )
    # Enumeration-safe: same 200 regardless of whether the account exists.
    assert resp.status_code == 200
    assert resp.json()["delivery"] == "none"


def test_forgot_password_returns_reset_url_in_dev(client: TestClient) -> None:
    # Register account
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "reset-me@example.com",
            "password": "Testing12345",
            "display_name": "resetme",
            "accept_terms": True,
        },
    )
    resp = client.post(
        "/api/v1/auth/forgot-password", json={"email": "reset-me@example.com"}
    )
    assert resp.status_code == 200
    body = resp.json()
    # SMTP is not configured in tests, so the reset URL should be
    # surfaced in the response under ``expose_reset_url_in_response``.
    assert body["delivery"] == "log-only"
    assert body["reset_url"] and "token=" in body["reset_url"]


def test_reset_password_flow_end_to_end(client: TestClient) -> None:
    email = "full-reset@example.com"
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "OldPassword12345",
            "display_name": "reset",
            "accept_terms": True,
        },
    )
    resp = client.post("/api/v1/auth/forgot-password", json={"email": email})
    url = resp.json()["reset_url"]
    token = url.split("token=", 1)[1]

    # Use the token to set a new password.
    reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "password": "BrandNewPass99"},
    )
    assert reset.status_code == 200

    # Old password no longer works.
    old = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "OldPassword12345"}
    )
    assert old.status_code == 401

    # New password logs in fine.
    new = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "BrandNewPass99"}
    )
    assert new.status_code == 200

    # Token cannot be reused.
    replay = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "password": "AttackersPick12"},
    )
    assert replay.status_code == 400


def test_reset_password_rejects_bad_token(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "does-not-exist-12345", "password": "Whatever12345"},
    )
    assert resp.status_code == 400
