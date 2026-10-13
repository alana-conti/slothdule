"""POST /auth/* e GET /auth/me."""

from .helpers import unique


import pytest

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
