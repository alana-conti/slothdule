"""Regra de negócio das Folhinhas (base + bônus + resgate)."""

from .helpers import balance, make_subtask, make_task


def test_task_crud_and_completion_awards_leaves(user_client):
    task = make_task(user_client, priority="high")
    task_id = task["id"]

    r = user_client.get(f"/tasks/{task_id}")
    assert r.status_code == 200

    # Conclui -> task_completion (5 p/ high) + early bonus (2).
    r = user_client.post(f"/tasks/{task_id}/status", json={"status": "done"})
    assert r.status_code == 200, r.text

    assert balance(user_client) == 7

    r = user_client.get(f"/tasks/{task_id}/leaves-awarded")
    assert r.json()["leavesAwarded"] == 7

    # Reconcluir não gera de novo (idempotência).
    r = user_client.post(f"/tasks/{task_id}/status", json={"status": "done"})
    assert r.status_code == 200
    assert balance(user_client) == 7


def test_checklist_bonus(user_client):
    task = make_task(user_client, priority="low")
    sub = make_subtask(user_client, task["id"])
    r = user_client.patch(f"/subtasks/{sub['id']}/done", json={"is_done": True})
    assert r.status_code == 200, r.text

    user_client.post(f"/tasks/{task['id']}/status", json={"status": "done"})
    # low=1 + early=2 + checklist=2
    assert balance(user_client) == 5


def test_redeem_flow(user_client):
    task = make_task(user_client, priority="critical")
    user_client.post(f"/tasks/{task['id']}/status", json={"status": "done"})
    before = balance(user_client)
    assert before >= 8

    items = user_client.get("/rewards/items").json()
    beijo = next(i for i in items if i["title"] == "Beijo")
    r = user_client.post(f"/rewards/items/{beijo['id']}/redeem")
    assert r.status_code == 201, r.text
    redemption_id = r.json()["id"]

    assert balance(user_client) == before - 5

    r = user_client.post(f"/rewards/redemptions/{redemption_id}/deliver")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "delivered"


def test_redeem_without_balance_fails(user_client):
    # user_client é um usuário novo a cada teste: saldo começa zerado.
    assert balance(user_client) == 0
    items = user_client.get("/rewards/items").json()
    assert items
    expensive = max(items, key=lambda i: i["cost"])
    r = user_client.post(f"/rewards/items/{expensive['id']}/redeem")
    assert r.status_code == 400
