"""Inscrições de Web Push: /push (lembretes de hábito)."""

import uuid

import pytest

from app import models
from app.config import settings


@pytest.fixture()
def push_on(monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "chave-publica-de-teste")
    monkeypatch.setattr(settings, "vapid_private_key", "chave-privada-de-teste")


def subscription(endpoint: str | None = None) -> dict:
    return {
        "endpoint": endpoint or f"https://push.example.com/{uuid.uuid4().hex}",
        "keys": {"p256dh": "chave-p256dh", "auth": "chave-auth"},
    }


def test_public_key_is_empty_without_vapid(user_client):
    r = user_client.get("/push/public-key")
    assert r.status_code == 200
    assert r.json() == {"public_key": None}


def test_subscribe_needs_push_configured(user_client):
    assert user_client.post("/push/subscriptions", json=subscription()).status_code == 503


def test_public_key_and_subscribe(user_client, push_on, db):
    assert user_client.get("/push/public-key").json() == {"public_key": "chave-publica-de-teste"}

    sub = subscription()
    assert user_client.post("/push/subscriptions", json=sub).status_code == 204
    # De novo: atualiza, não duplica.
    sub["keys"]["auth"] = "outra-auth"
    assert user_client.post("/push/subscriptions", json=sub).status_code == 204

    rows = db.query(models.PushSubscription).filter_by(endpoint=sub["endpoint"]).all()
    assert len(rows) == 1
    assert rows[0].auth == "outra-auth"


def test_same_device_moves_to_the_logged_in_account(user_client, second_user_client, push_on, db):
    sub = subscription()
    user_client.post("/push/subscriptions", json=sub)
    second_user_client.post("/push/subscriptions", json=sub)

    me = second_user_client.get("/auth/me").json()
    row = db.query(models.PushSubscription).filter_by(endpoint=sub["endpoint"]).one()
    assert str(row.user_id) == me["id"]


def test_remove_only_own_subscription(user_client, second_user_client, push_on, db):
    sub = subscription()
    user_client.post("/push/subscriptions", json=sub)

    r = second_user_client.post("/push/subscriptions/remove", json={"endpoint": sub["endpoint"]})
    assert r.status_code == 204
    assert db.query(models.PushSubscription).filter_by(endpoint=sub["endpoint"]).count() == 1

    assert user_client.post("/push/subscriptions/remove", json={"endpoint": sub["endpoint"]}).status_code == 204
    db.expire_all()
    assert db.query(models.PushSubscription).filter_by(endpoint=sub["endpoint"]).count() == 0


def test_subscription_validation(user_client, push_on):
    assert user_client.post("/push/subscriptions", json={"endpoint": "http://inseguro", "keys": {"p256dh": "a", "auth": "b"}}).status_code == 422
    assert user_client.post("/push/subscriptions", json={"endpoint": "https://x"}).status_code == 422


def test_push_routes_require_auth(client):
    assert client.get("/push/public-key").status_code == 401
    assert client.post("/push/subscriptions", json=subscription()).status_code == 401
    assert client.post("/push/subscriptions/remove", json={"endpoint": "https://x"}).status_code == 401
