"""Folhinhas: GET /leaves/balance e GET /leaves/transactions."""

import pytest

from .helpers import balance, make_task

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def test_balance_starts_zero(user_client):
    assert balance(user_client) == 0
    assert user_client.get("/leaves/transactions").json() == []


def test_balance_sums_base_plus_bonuses(user_client):
    # low=1 + antecipada=2
    low = make_task(user_client, priority="low")
    user_client.post(f"/tasks/{low['id']}/status", json={"status": "done"})
    assert balance(user_client) == 3

    # medium=3 + antecipada=2 → total 8
    med = make_task(user_client, priority="medium")
    user_client.post(f"/tasks/{med['id']}/status", json={"status": "done"})
    assert balance(user_client) == 8


def test_transactions_list_types(user_client):
    task = make_task(user_client, priority="low")
    user_client.post(f"/tasks/{task['id']}/status", json={"status": "done"})

    txs = user_client.get("/leaves/transactions").json()
    by_type = {t["type"] for t in txs}
    assert {"task_completion", "early_completion_bonus"} <= by_type
    assert all(t["task_id"] == task["id"] for t in txs)
    assert sum(t["amount"] for t in txs) == balance(user_client)


def test_transactions_filter_by_task(user_client):
    first = make_task(user_client, priority="low")
    second = make_task(user_client, priority="low")
    user_client.post(f"/tasks/{first['id']}/status", json={"status": "done"})
    user_client.post(f"/tasks/{second['id']}/status", json={"status": "done"})

    txs = user_client.get("/leaves/transactions", params={"task_id": first["id"]}).json()
    assert txs, "filtro deveria retornar as transações da tarefa"
    assert all(t["task_id"] == first["id"] for t in txs)


def test_transactions_are_private(user_client, second_user_client):
    task = make_task(user_client, priority="low")
    user_client.post(f"/tasks/{task['id']}/status", json={"status": "done"})

    txs = second_user_client.get("/leaves/transactions", params={"task_id": task["id"]}).json()
    assert txs == []


def test_leaves_routes_require_auth(client):
    assert client.get("/leaves/balance").status_code == 401
    assert client.get("/leaves/transactions").status_code == 401
    assert client.get("/leaves/transactions", params={"task_id": NIL_UUID}).status_code == 401
