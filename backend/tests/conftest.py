"""Pytest fixtures for the FastAPI app.

We run the suite against an in-memory SQLite database so tests can execute
anywhere — no MariaDB service required. This matches the schema defined by
SQLAlchemy models (``Base.metadata.create_all``). The raw SQL files in
``backend/sql/`` are the authoritative MySQL/MariaDB schema and are verified
separately in CI's integration job.
"""

from __future__ import annotations

import os
from typing import Generator

# Test configuration must be set before importing ``app`` so ``get_settings``
# doesn't latch onto the dev ``.env``.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "pytest-secret-not-for-prod")
os.environ.setdefault("APP_ENV", "test")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import BigInteger, create_engine  # noqa: E402
from sqlalchemy.ext.compiler import compiles  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402


# SQLite only auto-increments ``INTEGER PRIMARY KEY``, not ``BIGINT``. The
# production schema uses ``BigInteger`` for every PK (MySQL friendly), so
# compile BigInteger → INTEGER on the sqlite dialect for the test engine.
@compiles(BigInteger, "sqlite")
def _bi_as_integer_on_sqlite(element, compiler, **kw):  # pragma: no cover
    return "INTEGER"


from app.core import deps  # noqa: E402
from app.db.base import Base  # noqa: E402
# Registers all mappers with ``Base.metadata``:
from app.db import models  # noqa: E402,F401
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def _engine():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(_engine) -> Generator:
    # Wrap each test in a transaction that rolls back at the end so tests
    # stay isolated without recreating the schema between runs.
    connection = _engine.connect()
    transaction = connection.begin()
    TestingSession = sessionmaker(bind=connection, autocommit=False, autoflush=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session) -> Generator[TestClient, None, None]:
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[deps.get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(deps.get_db, None)


def _register_user(client: TestClient, email: str, password: str = "Testing12345") -> str:
    """Register + login; returns a bearer token string."""
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": email.split("@")[0]},
    )
    assert resp.status_code in (200, 201), resp.text
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200, login.text
    return login.json()["access_token"]


@pytest.fixture()
def auth_token(client: TestClient) -> str:
    return _register_user(client, "alice@example.com")


@pytest.fixture()
def auth_headers(auth_token: str) -> dict:
    return {"Authorization": f"Bearer {auth_token}"}
