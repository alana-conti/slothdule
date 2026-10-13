"""GET/POST /categories."""

from .helpers import unique


def test_list_includes_global_seeds(user_client):
    slugs = {c["slug"] for c in user_client.get("/categories").json()}
    assert {"trabalho", "pessoal"} <= slugs


def test_create_custom_category(user_client):
    slug = unique("slug")
    r = user_client.post("/categories", json={"name": "Estudos", "slug": slug, "color": "#7A9E7E"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert (body["name"], body["slug"], body["color"]) == ("Estudos", slug, "#7A9E7E")

    slugs = {c["slug"] for c in user_client.get("/categories").json()}
    assert slug in slugs


def test_duplicate_slug_same_user_fails(user_client):
    payload = {"name": "X", "slug": unique("slug")}
    assert user_client.post("/categories", json=payload).status_code == 201
    r = user_client.post("/categories", json={**payload, "name": "Y"})
    assert r.status_code == 400


def test_same_slug_other_user_ok(user_client, second_user_client):
    slug = unique("slug")
    assert user_client.post("/categories", json={"name": "A", "slug": slug}).status_code == 201
    r = second_user_client.post("/categories", json={"name": "B", "slug": slug})
    assert r.status_code == 201, r.text


def test_own_categories_are_private(user_client, second_user_client):
    slug = unique("slug")
    user_client.post("/categories", json={"name": "Minha", "slug": slug})
    slugs = {c["slug"] for c in second_user_client.get("/categories").json()}
    assert slug not in slugs


def test_categories_require_auth(client):
    assert client.get("/categories").status_code == 401
    assert client.post("/categories", json={"name": "x", "slug": "x"}).status_code == 401
