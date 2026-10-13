"""GET/POST /clients."""

from .helpers import make_client, unique


def test_list_starts_empty(user_client):
    assert user_client.get("/clients").json() == []


def test_create_and_list(user_client):
    created = make_client(user_client, name="Acme Ltda")
    assert created["notes"] is None

    items = user_client.get("/clients").json()
    assert [c["name"] for c in items] == ["Acme Ltda"]
    assert items[0]["id"] == created["id"]


def test_create_with_notes(user_client):
    r = user_client.post("/clients", json={"name": unique("cliente"), "notes": "Prefere e-mail."})
    assert r.status_code == 201, r.text
    assert r.json()["notes"] == "Prefere e-mail."


def test_create_validates_name(user_client):
    assert user_client.post("/clients", json={"name": ""}).status_code == 422


def test_clients_are_private(user_client, second_user_client):
    name = unique("cliente")
    make_client(user_client, name=name)
    names = [c["name"] for c in second_user_client.get("/clients").json()]
    assert name not in names


def test_clients_require_auth(client):
    assert client.get("/clients").status_code == 401
    assert client.post("/clients", json={"name": "x"}).status_code == 401
