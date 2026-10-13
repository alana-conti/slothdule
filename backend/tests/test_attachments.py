"""Anexos do tipo link: /tasks/{id}/attachments e /attachments/{id}."""

import os
import uuid
from pathlib import Path

import pytest

from .helpers import make_link, make_task, unique

NIL_UUID = "00000000-0000-0000-0000-000000000000"
DATA_DIR = os.environ.get("DATA_DIR", "/tmp/slothdule-test-data")


def test_list_starts_empty(user_client):
    task = make_task(user_client)
    assert user_client.get(f"/tasks/{task['id']}/attachments").json() == []


def test_create_link_normalizes_url(user_client):
    task = make_task(user_client)
    created = make_link(user_client, task["id"], url="example.com/pagina")
    assert created["type"] == "link"
    assert created["url"] == "https://example.com/pagina"

    items = user_client.get(f"/tasks/{task['id']}/attachments").json()
    assert [a["id"] for a in items] == [created["id"]]


def test_create_link_keeps_https_url(user_client):
    task = make_task(user_client)
    created = make_link(user_client, task["id"], url="https://docs.example.com/x")
    assert created["url"] == "https://docs.example.com/x"


def test_create_link_rejects_empty_url(user_client):
    task = make_task(user_client)
    r = user_client.post(
        f"/tasks/{task['id']}/attachments",
        json={"type": "link", "label": "vazio", "url": "   "},
    )
    assert r.status_code == 400


def test_create_on_other_users_task_fails(user_client, second_user_client):
    task = make_task(user_client)
    r = second_user_client.post(
        f"/tasks/{task['id']}/attachments",
        json={"type": "link", "label": "x", "url": "https://example.com"},
    )
    assert r.status_code == 404


def test_update_link(user_client):
    task = make_task(user_client)
    created = make_link(user_client, task["id"])
    r = user_client.patch(
        f"/attachments/{created['id']}",
        json={"label": "Novo nome", "url": "outro.example.com/doc"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["label"] == "Novo nome"
    assert body["url"] == "https://outro.example.com/doc"


def test_update_link_rejects_invalid_url(user_client):
    task = make_task(user_client)
    created = make_link(user_client, task["id"])
    assert (
        user_client.patch(f"/attachments/{created['id']}", json={"label": "x", "url": "   "}).status_code
        == 400
    )
    assert (
        user_client.patch(f"/attachments/{created['id']}", json={"label": "x", "url": "https://"}).status_code
        == 400
    )


def test_update_non_link_fails(user_client):
    task = make_task(user_client)
    r = user_client.post(
        f"/tasks/{task['id']}/attachments/upload",
        files={"file": ("nota.txt", b"ola", "text/plain")},
    )
    assert r.status_code == 201, r.text
    attachment_id = r.json()["id"]
    r = user_client.patch(
        f"/attachments/{attachment_id}", json={"label": "x", "url": "https://example.com"}
    )
    assert r.status_code == 400


def test_delete_link(user_client):
    task = make_task(user_client)
    created = make_link(user_client, task["id"])
    r = user_client.delete(f"/attachments/{created['id']}")
    assert r.status_code == 204, r.text
    assert user_client.get(f"/tasks/{task['id']}/attachments").json() == []


def test_delete_uploaded_file_removes_from_disk(user_client):
    task = make_task(user_client)
    r = user_client.post(
        f"/tasks/{task['id']}/attachments/upload",
        files={"file": ("nota.txt", b"ola", "text/plain")},
    )
    assert r.status_code == 201, r.text
    url = r.json()["url"]
    filename = url.rsplit("/", 1)[1]
    local = Path(DATA_DIR) / "attachments" / r.json()["user_id"] / task["id"] / filename
    assert local.is_file()

    assert user_client.delete(f"/attachments/{r.json()['id']}").status_code == 204
    assert not local.exists()


def test_other_users_attachment_is_invisible(user_client, second_user_client):
    task = make_task(user_client)
    created = make_link(user_client, task["id"])
    assert (
        second_user_client.patch(
            f"/attachments/{created['id']}", json={"label": "x", "url": "https://example.com"}
        ).status_code
        == 404
    )
    assert second_user_client.delete(f"/attachments/{created['id']}").status_code == 404


def test_unknown_attachment_returns_404(user_client):
    bad = str(uuid.uuid4())
    assert user_client.patch(f"/attachments/{bad}", json={"label": "x", "url": "https://example.com"}).status_code == 404
    assert user_client.delete(f"/attachments/{bad}").status_code == 404


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", f"/tasks/{NIL_UUID}/attachments"),
        ("POST", f"/tasks/{NIL_UUID}/attachments"),
        ("PATCH", f"/attachments/{NIL_UUID}"),
        ("DELETE", f"/attachments/{NIL_UUID}"),
    ],
)
def test_attachments_routes_require_auth(client, method, path):
    r = client.request(method, path, json={"type": "link", "label": "x", "url": "https://example.com"})
    assert r.status_code == 401, f"{method} {path}"
