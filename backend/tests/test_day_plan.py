"""Plano do dia: /day-plan (docs/02-user-flows.md, fluxo 14)."""

import pytest

from .helpers import make_task

DAY = "2026-11-27"
NIL_UUID = "00000000-0000-0000-0000-000000000000"


def _get(client, task_id: str) -> dict:
    r = client.get(f"/tasks/{task_id}")
    assert r.status_code == 200, r.text
    return r.json()


def _decide(client, task_id: str, in_plan: bool, day: str = DAY):
    return client.put(f"/day-plan/{day}/tasks/{task_id}", json={"in_plan": in_plan})


def test_new_task_has_no_plan(user_client):
    task = make_task(user_client)
    assert task["plan_date"] is None
    assert task["plan_position"] is None


def test_accept_appends_to_the_end(user_client):
    a, b = make_task(user_client)["id"], make_task(user_client)["id"]

    assert _decide(user_client, a, True).json()["plan_position"] == 0
    r = _decide(user_client, b, True)
    assert r.status_code == 200
    assert (r.json()["plan_date"], r.json()["plan_position"]) == (DAY, 1)

    # Aceitar de novo não muda a posição.
    assert _decide(user_client, a, True).json()["plan_position"] == 0


def test_decline_marks_the_day_without_position(user_client):
    a = make_task(user_client)["id"]
    _decide(user_client, a, True)

    r = _decide(user_client, a, False)
    assert r.status_code == 200
    assert (r.json()["plan_date"], r.json()["plan_position"]) == (DAY, None)


def test_plan_of_another_day_starts_again(user_client):
    a, b = make_task(user_client)["id"], make_task(user_client)["id"]
    _decide(user_client, a, True)

    assert _decide(user_client, b, True, day="2026-11-28").json()["plan_position"] == 0


def test_set_day_plan_orders_and_keeps_the_rest(user_client):
    a, b, c = (make_task(user_client)["id"] for _ in range(3))
    for task_id in (a, b, c):
        _decide(user_client, task_id, True)

    r = user_client.put(f"/day-plan/{DAY}", json={"task_ids": [c, a]})
    assert r.status_code == 200, r.text
    assert [t["id"] for t in r.json()] == [c, a]
    assert _get(user_client, c)["plan_position"] == 0
    assert _get(user_client, a)["plan_position"] == 1
    # Quem não veio na lista (p.ex. em andamento) continua no plano.
    assert (_get(user_client, b)["plan_date"], _get(user_client, b)["plan_position"]) == (DAY, 1)


def test_set_day_plan_can_bring_new_tasks(user_client):
    a = make_task(user_client)["id"]

    r = user_client.put(f"/day-plan/{DAY}", json={"task_ids": [a]})
    assert r.status_code == 200
    assert (_get(user_client, a)["plan_date"], _get(user_client, a)["plan_position"]) == (DAY, 0)


def test_set_day_plan_validation(user_client):
    a = make_task(user_client)["id"]

    assert user_client.put(f"/day-plan/{DAY}", json={"task_ids": [a, a]}).status_code == 400
    assert user_client.put(f"/day-plan/{DAY}", json={"task_ids": [NIL_UUID]}).status_code == 404
    assert user_client.put(f"/day-plan/{DAY}", json={}).status_code == 422
    assert user_client.put("/day-plan/ontem", json={"task_ids": []}).status_code == 422
    assert _decide(user_client, a, True, day="2026-13-01").status_code == 422
    assert user_client.put(f"/day-plan/{DAY}/tasks/{a}", json={}).status_code == 422


def test_other_users_tasks_are_404(user_client, second_user_client):
    a = make_task(user_client)["id"]

    assert _decide(second_user_client, a, True).status_code == 404
    assert second_user_client.put(f"/day-plan/{DAY}", json={"task_ids": [a]}).status_code == 404
    assert _get(user_client, a)["plan_date"] is None


@pytest.mark.parametrize(
    "path,payload",
    [
        (f"/day-plan/{DAY}", {"task_ids": []}),
        (f"/day-plan/{DAY}/tasks/{NIL_UUID}", {"in_plan": True}),
    ],
)
def test_day_plan_routes_require_auth(client, path, payload):
    assert client.put(path, json=payload).status_code == 401
