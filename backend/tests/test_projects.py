"""GET/POST /projects."""

from .helpers import make_client, make_project, unique


def test_list_starts_empty(user_client):
    assert user_client.get("/projects").json() == []


def test_create_and_list(user_client):
    created = make_project(user_client, name="Site novo")
    assert created["status"] == "active"
    assert created["client_id"] is None

    items = user_client.get("/projects").json()
    assert [p["name"] for p in items] == ["Site novo"]


def test_create_linked_to_client(user_client):
    client = make_client(user_client)
    project = make_project(user_client, client_id=client["id"])
    assert project["client_id"] == client["id"]


def test_create_with_unknown_client_fails(user_client):
    import uuid

    r = user_client.post("/projects", json={"name": unique("projeto"), "client_id": str(uuid.uuid4())})
    assert r.status_code == 400


def test_create_with_other_users_client_fails(user_client, second_user_client):
    other = make_client(second_user_client)
    r = user_client.post("/projects", json={"name": unique("projeto"), "client_id": other["id"]})
    assert r.status_code == 400


def test_projects_are_private(user_client, second_user_client):
    name = unique("projeto")
    make_project(user_client, name=name)
    names = [p["name"] for p in second_user_client.get("/projects").json()]
    assert name not in names


def test_projects_require_auth(client):
    assert client.get("/projects").status_code == 401
    assert client.post("/projects", json={"name": "x"}).status_code == 401
