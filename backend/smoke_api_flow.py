import json
import time
import urllib.error
import urllib.request

BASE_URL = "http://127.0.0.1:8000/api/v1"


def call_api(method: str, path: str, payload=None, token: str | None = None):
    body = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url=f"{BASE_URL}{path}",
        data=body,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            if not raw:
                return response.status, None
            try:
                return response.status, json.loads(raw)
            except json.JSONDecodeError:
                return response.status, {"raw": raw}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        if not raw:
            data = None
        else:
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = {"raw": raw}
        return exc.code, data


def assert_status(actual: int, expected: int, label: str):
    if actual != expected:
        raise RuntimeError(f"{label} failed: expected {expected}, got {actual}")


def main():
    health_status, _ = call_api("GET", "/health/live")
    assert_status(health_status, 200, "health")

    seed = int(time.time())
    email = f"smoke_{seed}@example.com"
    password = "secret123"

    register_status, register_data = call_api(
        "POST",
        "/auth/register",
        {"display_name": "Smoke User", "email": email, "password": password},
    )
    if register_status != 201:
        raise RuntimeError(f"register failed: {register_status}, payload={register_data}")
    token = register_data["access_token"]
    user_id = register_data["user"]["id"]

    login_status, login_data = call_api(
        "POST",
        "/auth/login",
        {"email": email, "password": password},
    )
    assert_status(login_status, 200, "login")
    token = login_data["access_token"]

    profile_get_status, _ = call_api("GET", "/profile", token=token)
    assert_status(profile_get_status, 200, "get profile")

    profile_patch_status, profile_patch_data = call_api(
        "PATCH",
        "/profile",
        {"display_name": "Smoke Updated", "bio": "Backend smoke test"},
        token=token,
    )
    assert_status(profile_patch_status, 200, "update profile")
    if profile_patch_data["display_name"] != "Smoke Updated":
        raise RuntimeError("profile update did not persist")

    run_create_status, run_create_data = call_api(
        "POST",
        "/training-runs",
        {"model_type": "GAT", "dataset_name": "Cora", "epoch_total": 200},
        token=token,
    )
    assert_status(run_create_status, 201, "create training run")
    run_id = run_create_data["id"]

    run_update_status, run_update_data = call_api(
        "PATCH",
        f"/training-runs/{run_id}",
        {
            "status": "running",
            "metric": {"epoch": 1, "loss": 1.2345, "accuracy": 0.5123},
        },
        token=token,
    )
    assert_status(run_update_status, 200, "update training run")
    if run_update_data["epoch_current"] < 1:
        raise RuntimeError("training metric was not applied")

    post_create_status, post_create_data = call_api(
        "POST",
        "/posts",
        {
            "title": "Smoke training post",
            "summary": "Summary",
            "content": "Content",
            "tags": ["gnn", "test", "test"],
            "is_public": True,
            "training": {
                "run_id": run_id,
                "model": "GAT",
                "dataset": "Cora",
                "epoch": 1,
                "best_accuracy": 0.5123,
                "best_loss": 1.2345,
            },
        },
        token=token,
    )
    assert_status(post_create_status, 201, "create post")
    post_id = post_create_data["id"]

    posts_status, posts_data = call_api("GET", "/posts", token=token)
    assert_status(posts_status, 200, "list posts")
    if not any(item["id"] == post_id for item in posts_data):
        raise RuntimeError("newly created post was not returned")

    print(
        json.dumps(
            {
                "ok": True,
                "user_id": user_id,
                "run_id": run_id,
                "post_id": post_id,
                "email": email,
            }
        )
    )


if __name__ == "__main__":
    main()
