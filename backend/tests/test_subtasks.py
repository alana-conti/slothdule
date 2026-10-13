"""Subtarefas: /tasks/{id}/subtasks e /subtasks/{id}."""

import uuid

import pytest

from .helpers import make_subtask, make_task

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def test_list_starts_empty(user_client):
    task = make_task(user_client)
    assert user_client.get(f"/tasks/{task['id']}/subtasks").json() == []


def test_create_assigns_positions_in_order(user_client):
    task = make_task(user_client)
    first = make_subtask(user_client, task["id"], title="primeiro")
    second = make_subtask(user_client, task["id"], title="segundo")
    assert (first["position"], second["position"]) == (0, 1)

    items = user_client.get(f"/tasks/{task['id']}/subtasks").json()
    assert [s["title"] for s in items] == ["primeiro", "segundo"]
    assert all(s["is_done"] is False for s in items)


def test_update_title(user_client):
    task = make_task(user_client)
    sub = make_subtask(user_client, task["id"])
    r = user_client.patch(f"/subtasks/{sub['id']}/title", json={"title": "renomeada"})
    assert r.status_code == 200, r.text
    assert r.json()["title"] == "renomeada"


def test_toggle_done(user_client):
    task = make_task(user_client)
    sub = make_subtask(user_client, task["id"])
    r = user_client.patch(f"/subtasks/{sub['id']}/done", json={"is_done": True})
    assert r.json()["is_done"] is True
    r = user_client.patch(f"/subtasks/{sub['id']}/done", json={"is_done": False})
    assert r.json()["is_done"] is False


def test_delete(user_client):
    task = make_task(user_client)
    sub = make_subtask(user_client, task["id"])
    r = user_client.delete(f"/subtasks/{sub['id']}")
    assert r.status_code == 204, r.text
    assert user_client.get(f"/tasks/{task['id']}/subtasks").json() == []


def test_unknown_subtask_returns_404(user_client):
    bad = str(uuid.uuid4())
    assert user_client.patch(f"/subtasks/{bad}/title", json={"title": "x"}).status_code == 404
    assert user_client.patch(f"/subtasks/{bad}/done", json={"is_done": True}).status_code == 404
    assert user_client.delete(f"/subtasks/{bad}").status_code == 404


def test_other_users_subtask_is_invisible(user_client, second_user_client):
    task = make_task(user_client)
    sub = make_subtask(user_client, task["id"])
    assert second_user_client.patch(f"/subtasks/{sub['id']}/title", json={"title": "x"}).status_code == 404
    assert second_user_client.patch(f"/subtasks/{sub['id']}/done", json={"is_done": True}).status_code == 404
    assert second_user_client.delete(f"/subtasks/{sub['id']}").status_code == 404


def test_create_on_other_users_task_fails(user_client, second_user_client):
    task = make_task(user_client)
    r = second_user_client.post(f"/tasks/{task['id']}/subtasks", json={"title": "invadir"})
    assert r.status_code == 404


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", f"/tasks/{NIL_UUID}/subtasks"),
        ("POST", f"/tasks/{NIL_UUID}/subtasks"),
        ("PATCH", f"/subtasks/{NIL_UUID}/title"),
        ("PATCH", f"/subtasks/{NIL_UUID}/done"),
        ("DELETE", f"/subtasks/{NIL_UUID}"),
    ],
)
def test_subtasks_routes_require_auth(client, method, path):
    r = client.request(method, path, json={"title": "x", "is_done": True})
    assert r.status_code == 401, f"{method} {path}"
