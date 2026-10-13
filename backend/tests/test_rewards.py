"""Recompensas: /rewards/items, /rewards/redemptions, redeem, deliver."""

import uuid

import pytest

from .helpers import balance, make_reward_item, make_task, unique


def test_list_includes_global_seeds(user_client):
    titles = {i["title"] for i in user_client.get("/rewards/items").json()}
    assert {"Beijo", "Café especial"} <= titles


def test_create_and_list_custom_item(user_client):
    title = unique("recompensa")
    created = make_reward_item(user_client, title=title, cost=7)
    assert created["is_active"] is True
    assert created["is_default"] is False

    items = user_client.get("/rewards/items").json()
    assert title in {i["title"] for i in items}


def test_create_validates_cost(user_client):
    r = user_client.post("/rewards/items", json={"title": unique("r"), "cost": 0})
    assert r.status_code == 422


def test_duplicate_title_same_user_fails(user_client):
    title = unique("recompensa")
    assert make_reward_item(user_client, title=title)["title"] == title
    r = user_client.post("/rewards/items", json={"title": title, "cost": 9})
    assert r.status_code == 400


def test_same_title_other_user_ok(user_client, second_user_client):
    title = unique("recompensa")
    make_reward_item(user_client, title=title)
    r = second_user_client.post("/rewards/items", json={"title": title, "cost": 9})
    assert r.status_code == 201, r.text


def _earn(user_client, priority="critical"):
    task = make_task(user_client, priority=priority)
    user_client.post(f"/tasks/{task['id']}/status", json={"status": "done"})
    return balance(user_client)


def test_redeem_unknown_item_returns_404(user_client):
    _earn(user_client)
    r = user_client.post(f"/rewards/items/{uuid.uuid4()}/redeem")
    assert r.status_code == 404


def test_redeem_other_users_item_returns_404(user_client, second_user_client):
    _earn(second_user_client)
    item = make_reward_item(user_client)
    r = second_user_client.post(f"/rewards/items/{item['id']}/redeem")
    assert r.status_code == 404


def test_redeem_registers_negative_transaction(user_client):
    before = _earn(user_client)  # critical: 8 + 2 = 10
    assert before == 10
    item = make_reward_item(user_client, cost=4)
    r = user_client.post(f"/rewards/items/{item['id']}/redeem")
    assert r.status_code == 201, r.text
    assert r.json()["cost"] == 4
    assert r.json()["status"] == "requested"
    assert balance(user_client) == before - 4

    amounts = [t["amount"] for t in user_client.get("/leaves/transactions").json()]
    assert -4 in amounts


def test_redemptions_list(user_client):
    assert user_client.get("/rewards/redemptions").json() == []
    _earn(user_client)
    item = make_reward_item(user_client, cost=2)
    redemption = user_client.post(f"/rewards/items/{item['id']}/redeem").json()

    items = user_client.get("/rewards/redemptions").json()
    assert [x["id"] for x in items] == [redemption["id"]]
    assert items[0]["reward_item"] == {"title": item["title"], "icon": item["icon"]}


def test_deliver_twice_fails(user_client):
    _earn(user_client)
    item = make_reward_item(user_client, cost=1)
    redemption_id = user_client.post(f"/rewards/items/{item['id']}/redeem").json()["id"]

    r = user_client.post(f"/rewards/redemptions/{redemption_id}/deliver")
    assert r.status_code == 200
    assert r.json()["delivered_at"] is not None

    r = user_client.post(f"/rewards/redemptions/{redemption_id}/deliver")
    assert r.status_code == 404


def test_deliver_unknown_or_other_users_redemption_fails(user_client, second_user_client):
    assert user_client.post(f"/rewards/redemptions/{uuid.uuid4()}/deliver").status_code == 404

    _earn(user_client)
    item = make_reward_item(user_client, cost=1)
    redemption_id = user_client.post(f"/rewards/items/{item['id']}/redeem").json()["id"]
    assert second_user_client.post(f"/rewards/redemptions/{redemption_id}/deliver").status_code == 404


def test_redemptions_are_private(user_client, second_user_client):
    _earn(user_client)
    item = make_reward_item(user_client, cost=1)
    redemption_id = user_client.post(f"/rewards/items/{item['id']}/redeem").json()["id"]
    ids = [x["id"] for x in second_user_client.get("/rewards/redemptions").json()]
    assert redemption_id not in ids


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/rewards/items"),
        ("POST", "/rewards/items"),
        ("GET", "/rewards/redemptions"),
        ("POST", f"/rewards/items/{uuid.uuid4()}/redeem"),
        ("POST", f"/rewards/redemptions/{uuid.uuid4()}/deliver"),
    ],
)
def test_rewards_routes_require_auth(client, method, path):
    r = client.request(method, path, json={"title": "x", "cost": 1})
    assert r.status_code == 401, f"{method} {path}"
