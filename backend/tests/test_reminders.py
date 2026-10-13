"""Lembretes: /tasks/{id}/reminders e /reminders/{id}."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from .helpers import make_reminder, make_task, unique

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def _payload(**overrides):
    payload = {
        "title": unique("lembrete"),
        "remind_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        "channel": "push",
        "horizon": "short",
    }
    payload.update(overrides)
    return payload


def test_create_and_list(user_client):
    task = make_task(user_client)
    created = make_reminder(user_client, task["id"])
    assert created["is_sent"] is False

    items = user_client.get(f"/tasks/{task['id']}/reminders").json()
    assert [x["id"] for x in items] == [created["id"]]


def test_create_uses_default_title(user_client):
    task = make_task(user_client)
    payload = _payload()
    del payload["title"]
    r = user_client.post(f"/tasks/{task['id']}/reminders", json=payload)
    assert r.status_code == 201, r.text
    assert r.json()["title"] == "Lembrete de tarefa"


def test_create_requires_remind_at(user_client):
    task = make_task(user_client)
    payload = _payload()
    del payload["remind_at"]
    assert user_client.post(f"/tasks/{task['id']}/reminders", json=payload).status_code == 422


def test_update(user_client):
    task = make_task(user_client)
    created = make_reminder(user_client, task["id"])
    later = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    r = user_client.patch(
        f"/reminders/{created['id']}",
        json=_payload(title="Atualizado", remind_at=later, channel="whatsapp", horizon="long"),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert (body["title"], body["channel"], body["horizon"]) == ("Atualizado", "whatsapp", "long")


def test_delete(user_client):
    task = make_task(user_client)
    created = make_reminder(user_client, task["id"])
    r = user_client.delete(f"/reminders/{created['id']}")
    assert r.status_code == 204, r.text
    assert user_client.get(f"/tasks/{task['id']}/reminders").json() == []


def test_unknown_reminder_returns_404(user_client):
    bad = str(uuid.uuid4())
    assert user_client.patch(f"/reminders/{bad}", json=_payload()).status_code == 404
    assert user_client.delete(f"/reminders/{bad}").status_code == 404


def test_other_users_reminder_is_invisible(user_client, second_user_client):
    task = make_task(user_client)
    created = make_reminder(user_client, task["id"])
    assert second_user_client.patch(f"/reminders/{created['id']}", json=_payload()).status_code == 404
    assert second_user_client.delete(f"/reminders/{created['id']}").status_code == 404


def test_create_on_other_users_task_fails(user_client, second_user_client):
    task = make_task(user_client)
    r = second_user_client.post(f"/tasks/{task['id']}/reminders", json=_payload())
    assert r.status_code == 404


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", f"/tasks/{NIL_UUID}/reminders"),
        ("POST", f"/tasks/{NIL_UUID}/reminders"),
        ("PATCH", f"/reminders/{NIL_UUID}"),
        ("DELETE", f"/reminders/{NIL_UUID}"),
    ],
)
def test_reminders_routes_require_auth(client, method, path):
    r = client.request(method, path, json=_payload())
    assert r.status_code == 401, f"{method} {path}"
