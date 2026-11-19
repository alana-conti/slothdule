"""Lembretes de hábito no horário (`app/services/reminders.py`).

O agendador não roda nos testes: o envio é chamado direto, com horário
fixo e um "sender" falso que só registra para qual aparelho iria o push.
O cenário (hábito, inscrição, check-in) é montado via HTTP.
"""

import json
import uuid
from datetime import date, datetime, time, timedelta

import pytest

from app import models
from app.config import settings
from app.services import habits as rules
from app.services.push import SubscriptionGone
from app.services.reminders import send_due_habit_reminders

from .helpers import habits_today, make_habit


@pytest.fixture()
def push_on(monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "chave-publica-de-teste")
    monkeypatch.setattr(settings, "vapid_private_key", "chave-privada-de-teste")


class FakeSender:
    def __init__(self, gone: set[str] | None = None):
        self.sent: list[tuple[str, dict]] = []
        self.gone = gone or set()

    def __call__(self, subscription, payload):
        if subscription.endpoint in self.gone:
            raise SubscriptionGone()
        self.sent.append((subscription.endpoint, json.loads(payload)))

    def to(self, endpoint):
        return [message for target, message in self.sent if target == endpoint]


def _subscribe(client) -> str:
    endpoint = f"https://push.example.com/{uuid.uuid4().hex}"
    r = client.post(
        "/push/subscriptions",
        json={"endpoint": endpoint, "keys": {"p256dh": "p", "auth": "a"}},
    )
    assert r.status_code == 204, r.text
    return endpoint


def date_today(client) -> date:
    return date.fromisoformat(habits_today(client)["date"])


def _at(client, hour: int, minute: int) -> datetime:
    return datetime.combine(date_today(client), time(hour, minute), tzinfo=rules.SAO_PAULO)


def test_remind_needs_a_time(user_client):
    r = user_client.post("/habits", json={"title": "x", "weekdays": [1], "remind": True})
    assert r.status_code == 422
    habit = make_habit(user_client, time_of_day="08:00", remind=True)
    assert habit["remind"] is True


def test_reminder_is_sent_once_in_the_window(user_client, push_on, db):
    habit = make_habit(user_client, title="Beber água", time_of_day="08:00", remind=True)
    endpoint = _subscribe(user_client)
    sender = FakeSender()

    send_due_habit_reminders(db, _at(user_client, 7, 59), sender)
    assert sender.to(endpoint) == []

    send_due_habit_reminders(db, _at(user_client, 8, 5), sender)
    messages = sender.to(endpoint)
    assert len(messages) == 1
    assert messages[0]["title"] == "Hora de cuidar: Beber água 🦥"
    assert messages[0]["data"] == {"url": "/routine"}
    assert messages[0]["tag"] == f"habit-{habit['id']}"

    # Mesmo dia, de novo: não repete.
    send_due_habit_reminders(db, _at(user_client, 8, 6), sender)
    assert len(sender.to(endpoint)) == 1


def test_no_reminder_after_the_window(user_client, push_on, db):
    make_habit(user_client, time_of_day="08:00", remind=True)
    endpoint = _subscribe(user_client)
    sender = FakeSender()

    send_due_habit_reminders(db, _at(user_client, 8, 31), sender)
    assert sender.to(endpoint) == []


def test_no_reminder_when_already_cared_or_resting(user_client, push_on, db):
    done = make_habit(user_client, time_of_day="09:00", remind=True)
    rest = make_habit(user_client, time_of_day="09:00", remind=True)
    today = date_today(user_client)
    user_client.put(f"/habits/{done['id']}/checkins/{today}", json={"status": "done"})
    user_client.put(f"/habits/{rest['id']}/checkins/{today}", json={"status": "rest"})
    endpoint = _subscribe(user_client)
    sender = FakeSender()

    send_due_habit_reminders(db, _at(user_client, 9, 1), sender)
    assert sender.to(endpoint) == []


def test_no_reminder_off_schedule_or_without_remind(user_client, push_on, db):
    today = date_today(user_client)
    other_days = [d for d in range(1, 8) if d != today.isoweekday()]
    make_habit(user_client, time_of_day="10:00", remind=True, weekdays=other_days)
    make_habit(user_client, time_of_day="10:00", remind=False)
    endpoint = _subscribe(user_client)
    sender = FakeSender()

    send_due_habit_reminders(db, _at(user_client, 10, 2), sender)
    assert sender.to(endpoint) == []


def test_expired_subscription_is_removed(user_client, push_on, db):
    make_habit(user_client, time_of_day="11:00", remind=True)
    alive = _subscribe(user_client)
    gone = _subscribe(user_client)
    sender = FakeSender(gone={gone})

    send_due_habit_reminders(db, _at(user_client, 11, 0), sender)
    assert len(sender.to(alive)) == 1
    db.expire_all()
    assert db.query(models.PushSubscription).filter_by(endpoint=gone).count() == 0
    assert db.query(models.PushSubscription).filter_by(endpoint=alive).count() == 1


def test_reminders_only_reach_the_habit_owner(user_client, second_user_client, push_on, db):
    make_habit(user_client, time_of_day="12:00", remind=True)
    other = _subscribe(second_user_client)
    sender = FakeSender()

    send_due_habit_reminders(db, _at(user_client, 12, 0) + timedelta(minutes=1), sender)
    assert sender.to(other) == []
