"""Test fixtures.

Tests must never run against the same database as seeded demo data --
truncating detections between tests would silently wipe demo data if the
two shared a database. So before anything under app/ is imported, we point
DATABASE_URL at a dedicated "<dbname>_test" database (created here if it
doesn't exist yet) on the same Postgres server.
"""
import os
from urllib.parse import urlsplit, urlunsplit

import psycopg
import pytest

_DEFAULT_URL = "postgresql+psycopg://pavesight:pavesight@db:5432/pavesight"
_base_url = os.environ.get("DATABASE_URL", _DEFAULT_URL)


def _with_db_name(url: str, db_name: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, f"/{db_name}", parts.query, parts.fragment))


def _psycopg_dsn(url: str) -> str:
    # Strip the SQLAlchemy "+driver" suffix so psycopg can parse it directly.
    parts = urlsplit(url)
    scheme = parts.scheme.split("+")[0]
    return urlunsplit((scheme, parts.netloc, parts.path, parts.query, parts.fragment))


_base_db_name = urlsplit(_base_url).path.lstrip("/")
_test_db_name = f"{_base_db_name}_test"
_test_url = _with_db_name(_base_url, _test_db_name)

# Create the test database (on the same server) before app.* is imported.
with psycopg.connect(_psycopg_dsn(_base_url), autocommit=True) as _conn:
    exists = _conn.execute(
        "SELECT 1 FROM pg_database WHERE datname = %s", (_test_db_name,)
    ).fetchone()
    if not exists:
        _conn.execute(f'CREATE DATABASE "{_test_db_name}"')

os.environ["DATABASE_URL"] = _test_url

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine, get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _clean_tables():
    yield
    session = SessionLocal()
    try:
        session.execute(text("TRUNCATE status_history, detections RESTART IDENTITY CASCADE"))
        session.commit()
    finally:
        session.close()
