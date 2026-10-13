"""Base dos testes automatizados do backend.

Padrão (vale para todos os testes daqui em diante):

- Tudo em `backend/tests/`, um arquivo `test_<router>.py` por módulo de
  `app/routers/` (+ `test_isolation.py` para as garantias entre usuários).
- Testes sempre via HTTP (`TestClient`), nunca chamando função de router
  diretamente — o contrato testado é o da API.
- Cada teste que precisa de usuário usa `user_client` (usuário novo, cookies
  na jar do client). `second_user_client` é um segundo usuário isolado.
- `client` puro (sem login) serve para os casos 401.
- Builders compartilhados vivem em `helpers.py`, não copiados por arquivo.
"""

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("DATA_DIR", "/tmp/slothdule-test-data")

from app.db import Base  # noqa: E402
import app.models  # noqa: F401,E402
from app.db import get_session  # noqa: E402
from app.main import app  # noqa: E402

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://slothdule:slothdule@localhost:5434/slothdule_test",
)


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DATABASE_URL)
    with eng.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\""))
        conn.commit()
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    # Seeds globais mínimos (espelham o migration).
    with eng.connect() as conn:
        conn.execute(
            text(
                "INSERT INTO categories (id, user_id, name, slug, color, is_default) VALUES "
                "(gen_random_uuid(), NULL, 'Trabalho', 'trabalho', '#5F7A61', TRUE), "
                "(gen_random_uuid(), NULL, 'Pessoal', 'pessoal', '#C49A4A', TRUE) "
                "ON CONFLICT DO NOTHING"
            )
        )
        conn.execute(
            text(
                "INSERT INTO reward_items (id, user_id, title, description, cost, icon, is_default, is_active) VALUES "
                "(gen_random_uuid(), NULL, 'Beijo', 'Resgatar um beijo.', 5, '💛', TRUE, TRUE), "
                "(gen_random_uuid(), NULL, 'Café especial', 'Café.', 10, '☕', TRUE, TRUE) "
                "ON CONFLICT DO NOTHING"
            )
        )
        conn.commit()
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def client(engine):
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_session] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _unique_email(prefix="user") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def _signup_and_login(c: TestClient, prefix: str) -> None:
    email = _unique_email(prefix)
    r = c.post("/auth/signup", json={"email": email, "password": "secret123"})
    assert r.status_code == 201, r.text
    r = c.post("/auth/login", json={"email": email, "password": "secret123"})
    assert r.status_code == 200, r.text


@pytest.fixture()
def user_client(client):
    _signup_and_login(client, "user")
    return client


@pytest.fixture()
def second_user_client(client):
    """Segundo usuário isolado (jar de cookies própria).

    Recebe `client` para garantir que o override de sessão do banco já está
    instalado antes de abrir o segundo TestClient sobre o mesmo `app`.
    """
    with TestClient(app) as c:
        _signup_and_login(c, "other")
        yield c
