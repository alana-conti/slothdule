"""POST /auth/* e GET /auth/me (+ fluxo OAuth Google com client fake)."""

import pytest
from fastapi.responses import RedirectResponse

from .helpers import unique


def _signup(client, email: str, password: str = "secret123"):
    return client.post("/auth/signup", json={"email": email, "password": password})


def test_signup_login_me(client):
    email = f"{unique('auth')}@example.com"
    r = _signup(client, email)
    assert r.status_code == 201, r.text
    assert r.json()["email"] == email

    # Signup não autentica sozinho: /me exige login.
    assert client.get("/auth/me").status_code == 401

    r = client.post("/auth/login", json={"email": email, "password": "secret123"})
    assert r.status_code == 200, r.text
    assert "slothdule_access" in r.cookies

    r = client.get("/auth/me")
    assert r.status_code == 200, r.text
    assert r.json()["email"] == email


def test_signup_duplicate_email_fails(client):
    email = f"{unique('dup')}@example.com"
    assert _signup(client, email).status_code == 201
    r = _signup(client, email)
    assert r.status_code == 400


def test_signup_email_is_case_insensitive(client):
    email = f"{unique('case')}@example.com"
    assert _signup(client, email.upper()).status_code == 201
    assert _signup(client, email).status_code == 400


def test_signup_validates_input(client):
    assert _signup(client, "not-an-email").status_code == 422
    assert _signup(client, f"{unique('short')}@example.com", password="123").status_code == 422


def test_login_rejects_wrong_credentials(client):
    email = f"{unique('login')}@example.com"
    assert _signup(client, email).status_code == 201
    assert client.post("/auth/login", json={"email": email, "password": "wrongpass"}).status_code == 401
    assert (
        client.post("/auth/login", json={"email": f"nobody-{unique()}@example.com", "password": "secret123"}).status_code
        == 401
    )


def test_logout_clears_session(client, user_client):
    r = user_client.post("/auth/logout")
    assert r.status_code == 204, r.text
    set_cookie = r.headers.get("set-cookie", "")
    assert "slothdule_access" in set_cookie
    assert user_client.get("/auth/me").status_code == 401


def test_refresh_rotates_tokens_and_rejects_reuse(client, user_client):
    old_refresh = user_client.cookies.get("slothdule_refresh")
    assert old_refresh, "login deveria ter emitido refresh cookie"

    r = user_client.post("/auth/refresh")
    assert r.status_code == 200, r.text
    new_refresh = user_client.cookies.get("slothdule_refresh")
    assert new_refresh != old_refresh

    # Token antigo (já rotacionado) não pode ser reutilizado.
    user_client.cookies.set("slothdule_refresh", old_refresh)
    assert user_client.post("/auth/refresh").status_code == 401

    # Token atual continua válido.
    user_client.cookies.set("slothdule_refresh", new_refresh)
    assert user_client.post("/auth/refresh").status_code == 200


def test_refresh_without_cookie_fails(client):
    assert client.post("/auth/refresh").status_code == 401


def test_me_requires_auth(client):
    assert client.get("/auth/me").status_code == 401
    client.cookies.set("slothdule_access", "token-invalido")
    assert client.get("/auth/me").status_code == 401


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/categories"),
        ("GET", "/clients"),
        ("GET", "/projects"),
        ("GET", "/tasks"),
        ("GET", "/rewards/items"),
        ("GET", "/rewards/redemptions"),
        ("GET", "/leaves/balance"),
        ("GET", "/leaves/transactions"),
    ],
)
def test_routes_require_auth(client, method, path):
    r = client.request(method, path)
    assert r.status_code == 401, f"{method} {path} deveria exigir auth"


# --- GET /auth/lookup ---


def test_lookup_reports_existing_account(client):
    email = f"{unique('lookup')}@example.com"
    assert client.post("/auth/signup", json={"email": email, "password": "secret123"}).status_code == 201
    r = client.get(f"/auth/lookup?email={email}")
    assert r.status_code == 200, r.text
    assert r.json() == {"exists": True}


def test_lookup_reports_unknown_email(client):
    r = client.get(f"/auth/lookup?email={unique('folha')}@example.com")
    assert r.status_code == 200, r.text
    assert r.json() == {"exists": False}


def test_lookup_is_case_insensitive(client):
    email = f"{unique('caixa')}@example.com"
    assert client.post("/auth/signup", json={"email": email, "password": "secret123"}).status_code == 201
    r = client.get(f"/auth/lookup?email={email.upper()}")
    assert r.json() == {"exists": True}


def test_lookup_validates_email_and_needs_auth(client):
    assert client.get("/auth/lookup?email=not-an-email").status_code == 422
    assert client.get("/auth/lookup").status_code == 422


# --- OAuth Google ---

class _FakeGoogleClient:
    def __init__(self, token):
        self.token = token
        self.redirect_uris = []

    async def authorize_redirect(self, request, redirect_uri, **kwargs):
        self.redirect_uris.append(redirect_uri)
        return RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth")

    async def authorize_access_token(self, request):
        return self.token


class _FakeOAuth:
    def __init__(self, token):
        self.google = _FakeGoogleClient(token)


_TOKEN = {
    "userinfo": {
        "sub": "google-sub-123",
        "email": "google-user@example.com",
        "email_verified": True,
        "name": "Google User",
        "picture": "https://lh3.googleusercontent.com/avatar.jpg",
    }
}


@pytest.fixture()
def google_env(monkeypatch):
    from app import config

    # Userinfo novo por teste: o banco persiste entre testes, então sub/email
    # repetidos colidiriam com o vínculo do teste anterior.
    token = {"userinfo": {**_TOKEN["userinfo"], "sub": f"sub-{unique('gsub')}", "email": f"{unique('gusr')}@example.com"}}
    fake = _FakeOAuth(token)
    monkeypatch.setattr("app.routers.auth.oauth", fake)
    monkeypatch.setattr(config.settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(config.settings, "google_client_secret", "test-secret")
    return fake


def test_google_login_redirects_when_unconfigured(client, monkeypatch):
    from app import config

    monkeypatch.setattr(config.settings, "google_client_id", "")
    monkeypatch.setattr(config.settings, "google_client_secret", "")
    r = client.get("/auth/google/login", follow_redirects=False)
    assert r.status_code == 303
    assert "/login?error=" in r.headers["location"]


def test_google_callback_redirects_when_unconfigured(client, monkeypatch):
    from app import config

    monkeypatch.setattr(config.settings, "google_client_id", "")
    monkeypatch.setattr(config.settings, "google_client_secret", "")
    r = client.get("/auth/google/callback", follow_redirects=False)
    assert r.status_code == 303
    assert "/login?error=" in r.headers["location"]


def test_google_login_redirects_to_provider(client, google_env):
    r = client.get("/auth/google/login", follow_redirects=False)
    assert r.status_code in (302, 307), r.text
    assert r.headers["location"].startswith("https://accounts.google.com/")


def test_google_callback_creates_user_and_logs_in(client, google_env, engine):
    from sqlalchemy.orm import sessionmaker
    from app import models

    r = client.get("/auth/google/callback", follow_redirects=False)
    assert r.status_code == 303, r.text
    assert r.headers["location"].endswith("/today")
    assert "slothdule_access" in r.cookies

    r = client.get("/auth/me")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email"] == google_env.google.token["userinfo"]["email"]
    assert body["display_name"] == "Google User"
    assert body["avatar_url"].startswith("https://lh3.googleusercontent.com/")

    TestingSession = sessionmaker(bind=engine)
    with TestingSession() as session:
        row = session.query(models.OAuthAccount).filter_by(provider="google").one()
        assert row.provider_user_id == google_env.google.token["userinfo"]["sub"]
        assert session.get(models.Profile, row.user_id) is not None


def test_google_callback_links_existing_email_with_verification(client, google_env, engine):
    from sqlalchemy.orm import sessionmaker
    from app import models

    email = f"{unique('glink')}@example.com"
    r = client.post("/auth/signup", json={"email": email, "password": "secret123"})
    local_id = r.json()["id"]
    client.post("/auth/logout")

    google_env.google.token["userinfo"]["email"] = email
    client.cookies.clear()
    r = client.get("/auth/google/callback", follow_redirects=False)
    assert r.status_code == 303, r.text

    r = client.get("/auth/me")
    assert r.status_code == 200, r.text
    assert r.json()["id"] == local_id, "deve ser o mesmo usuário, não um novo"

    TestingSession = sessionmaker(bind=engine)
    with TestingSession() as session:
        sub = google_env.google.token["userinfo"]["sub"]
        assert session.query(models.OAuthAccount).filter_by(provider="google", provider_user_id=sub).count() == 1


def test_google_callback_rejects_unverified_email_with_local_account(client, google_env, engine):
    from sqlalchemy.orm import sessionmaker
    from app import models

    email = f"{unique('gunv')}@example.com"
    assert client.post("/auth/signup", json={"email": email, "password": "secret123"}).status_code == 201

    google_env.google.token["userinfo"]["email"] = email
    google_env.google.token["userinfo"]["email_verified"] = False
    client.cookies.clear()
    r = client.get("/auth/google/callback", follow_redirects=False)
    assert r.status_code == 303
    assert "/login?error=" in r.headers["location"]
    assert "slothdule_access" not in r.cookies
    assert client.get("/auth/me").status_code == 401

    TestingSession = sessionmaker(bind=engine)
    with TestingSession() as session:
        sub = google_env.google.token["userinfo"]["sub"]
        assert session.query(models.OAuthAccount).filter_by(provider="google", provider_user_id=sub).count() == 0


def test_google_callback_rejects_incomplete_userinfo(client, google_env):
    google_env.google.token["userinfo"] = {}
    r = client.get("/auth/google/callback", follow_redirects=False)
    assert r.status_code == 303
    assert "/login?error=" in r.headers["location"]
