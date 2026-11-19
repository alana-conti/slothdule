"""Lembretes de tarefa por Web Push (`app/services/task_reminders.py`).

O agendador não roda nos testes: o envio é chamado direto, com horário
fixo e um "sender" falso que só registra para qual aparelho iria o push.
O cenário (tarefa, lembrete, inscrição) é montado via HTTP.
"""

import random
from datetime import datetime, timedelta, timezone

from app.services.task_reminders import send_due_task_reminders

from .helpers import FakeSender, make_reminder, make_task, subscribe_push


def _remind_at() -> datetime:
    # Horário próprio de cada teste, longe do "agora" real, para não cruzar
    # a janela de lembretes criados por outros testes no mesmo banco.
    base = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    return base + timedelta(days=random.randint(30, 3000), minutes=random.randint(0, 1439))


def _reminder(client, task_id: str, at: datetime, **overrides) -> dict:
    return make_reminder(client, task_id, remind_at=at.isoformat(), **overrides)


def _is_sent(client, task_id: str, reminder_id: str) -> bool:
    items = client.get(f"/tasks/{task_id}/reminders").json()
    return next(x for x in items if x["id"] == reminder_id)["is_sent"]


def test_reminder_is_sent_once_in_the_window(user_client, push_on, db):
    task = make_task(user_client, title="Enviar o relatório")
    at = _remind_at()
    reminder = _reminder(user_client, task["id"], at, title="Lembrete de tarefa")
    endpoint = subscribe_push(user_client)
    sender = FakeSender()

    send_due_task_reminders(db, at - timedelta(minutes=1), sender)
    assert sender.to(endpoint) == []
    assert _is_sent(user_client, task["id"], reminder["id"]) is False

    send_due_task_reminders(db, at + timedelta(minutes=5), sender)
    messages = sender.to(endpoint)
    assert len(messages) == 1
    assert messages[0]["title"] == "Lembrete: Enviar o relatório 🦥"
    assert messages[0]["body"]
    assert messages[0]["data"] == {"url": f"/tasks/{task['id']}"}
    assert messages[0]["tag"] == f"task-reminder-{reminder['id']}"
    assert _is_sent(user_client, task["id"], reminder["id"]) is True

    # De novo, ainda dentro da janela: não repete.
    send_due_task_reminders(db, at + timedelta(minutes=6), sender)
    assert len(sender.to(endpoint)) == 1


def test_custom_reminder_title_becomes_the_body(user_client, push_on, db):
    task = make_task(user_client)
    at = _remind_at()
    _reminder(user_client, task["id"], at, title="Levar o notebook")
    endpoint = subscribe_push(user_client)
    sender = FakeSender()

    send_due_task_reminders(db, at, sender)
    assert [m["body"] for m in sender.to(endpoint)] == ["Levar o notebook"]


def test_no_reminder_after_the_window(user_client, push_on, db):
    task = make_task(user_client)
    at = _remind_at()
    reminder = _reminder(user_client, task["id"], at)
    endpoint = subscribe_push(user_client)
    sender = FakeSender()

    # API fora do ar por mais de 30 minutos: o lembrete velho não dispara.
    send_due_task_reminders(db, at + timedelta(minutes=31), sender)
    assert sender.to(endpoint) == []
    assert _is_sent(user_client, task["id"], reminder["id"]) is False


def test_no_reminder_for_done_or_archived_task(user_client, push_on, db):
    at = _remind_at()
    done = make_task(user_client)
    archived = make_task(user_client)
    _reminder(user_client, done["id"], at)
    _reminder(user_client, archived["id"], at)
    r = user_client.post(f"/tasks/{done['id']}/status", json={"status": "done"})
    assert r.status_code == 200, r.text
    r = user_client.post(f"/tasks/{archived['id']}/archive")
    assert r.status_code == 200, r.text
    endpoint = subscribe_push(user_client)
    sender = FakeSender()

    send_due_task_reminders(db, at + timedelta(minutes=1), sender)
    assert sender.to(endpoint) == []


def test_only_push_channel_is_sent(user_client, push_on, db):
    task = make_task(user_client)
    at = _remind_at()
    _reminder(user_client, task["id"], at, channel="app")
    _reminder(user_client, task["id"], at, channel="whatsapp")
    endpoint = subscribe_push(user_client)
    sender = FakeSender()

    send_due_task_reminders(db, at, sender)
    assert sender.to(endpoint) == []


def test_rescheduled_reminder_is_sent_again(user_client, push_on, db):
    task = make_task(user_client)
    at = _remind_at()
    reminder = _reminder(user_client, task["id"], at)
    endpoint = subscribe_push(user_client)
    sender = FakeSender()

    send_due_task_reminders(db, at, sender)
    assert len(sender.to(endpoint)) == 1

    later = at + timedelta(hours=2)
    r = user_client.patch(
        f"/reminders/{reminder['id']}",
        json={"title": reminder["title"], "remind_at": later.isoformat(), "channel": "push"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["is_sent"] is False

    send_due_task_reminders(db, later, sender)
    assert len(sender.to(endpoint)) == 2


def test_reminders_only_reach_the_task_owner(user_client, second_user_client, push_on, db):
    task = make_task(user_client)
    at = _remind_at()
    _reminder(user_client, task["id"], at)
    mine = subscribe_push(user_client)
    other = subscribe_push(second_user_client)
    sender = FakeSender()

    send_due_task_reminders(db, at, sender)
    assert len(sender.to(mine)) == 1
    assert sender.to(other) == []
