"""Rotina e hábitos: /habits (docs/11-rotina-e-habitos.md).

As regras de crescimento e regressão têm testes puros em
`test_habit_growth.py`; aqui fica o contrato HTTP: criar, listar, detalhe,
check-in, folga, desfazer, teto diário de Folhinhas e isolamento.
"""

from datetime import date, timedelta

from .helpers import balance, habits_today, make_habit

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def _today(client) -> date:
    return date.fromisoformat(habits_today(client)["date"])


def _check(client, habit_id: str, day: date, status: str = "done"):
    return client.put(f"/habits/{habit_id}/checkins/{day.isoformat()}", json={"status": status})


def test_create_habit_starts_as_broto(user_client):
    habit = make_habit(user_client, title="  Beber água  ", period="morning")
    assert habit["title"] == "Beber água"
    assert habit["kind"] == "do"
    assert habit["stage"] == "broto"
    assert habit["leaves_per_checkin"] == 1
    assert habit["growth"] == 0
    assert habit["next_stage"] == "muda"
    assert habit["next_threshold"] == 7
    assert habit["regression_after"] == 14
    assert habit["scheduled_today"] is True
    assert habit["today_status"] is None
    assert habit["period"] == "morning"

    listed = user_client.get("/habits").json()
    assert [h["id"] for h in listed] == [habit["id"]]


def test_create_avoid_habit_with_time_and_custom_days(user_client):
    habit = make_habit(user_client, kind="avoid", weekdays=[5, 1, 3, 3], time_of_day="22:00")
    assert habit["kind"] == "avoid"
    assert habit["weekdays"] == [1, 3, 5]
    assert habit["time_of_day"] == "22:00:00"
    assert habit["next_threshold"] == 5  # 3 dias por semana


def test_create_validation(user_client):
    assert user_client.post("/habits", json={"title": "  ", "weekdays": [1]}).status_code == 422
    assert user_client.post("/habits", json={"title": "x", "weekdays": []}).status_code == 422
    assert user_client.post("/habits", json={"title": "x", "weekdays": [0, 8]}).status_code == 422
    assert (
        user_client.post(
            "/habits",
            json={"title": "x", "weekdays": [1], "time_of_day": "07:00", "period": "morning"},
        ).status_code
        == 422
    )
    assert user_client.post("/habits", json={"title": "x", "weekdays": [1], "kind": "talvez"}).status_code == 422


def test_checkin_awards_stage_leaves_once(user_client):
    habit = make_habit(user_client)
    today = _today(user_client)

    r = _check(user_client, habit["id"], today)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["leaves_awarded"] == 1
    assert body["leaves_today"] == 1
    assert body["leaves_cap"] == 10
    assert body["habit"]["today_status"] == "done"
    assert body["habit"]["today_leaves"] == 1
    assert body["habit"]["total_checkins"] == 1
    assert balance(user_client) == 1

    again = _check(user_client, habit["id"], today).json()
    assert again["leaves_awarded"] == 0
    assert balance(user_client) == 1

    txs = user_client.get("/leaves/transactions").json()
    assert [t["type"] for t in txs] == ["habit_checkin"]


def test_rest_day_gives_no_leaves_and_replaces_done(user_client):
    habit = make_habit(user_client)
    today = _today(user_client)
    _check(user_client, habit["id"], today)
    assert balance(user_client) == 1

    r = _check(user_client, habit["id"], today, "rest")
    assert r.status_code == 200, r.text
    assert r.json()["habit"]["today_status"] == "rest"
    assert r.json()["habit"]["total_checkins"] == 0
    assert balance(user_client) == 0

    summary = habits_today(user_client)
    assert summary["rest"] == 1
    assert summary["done"] == 0


def test_clear_checkin_undoes_and_returns_leaves(user_client):
    habit = make_habit(user_client)
    today = _today(user_client)
    assert user_client.delete(f"/habits/{habit['id']}/checkins/{today}").status_code == 404

    _check(user_client, habit["id"], today)
    r = user_client.delete(f"/habits/{habit['id']}/checkins/{today}")
    assert r.status_code == 200, r.text
    assert r.json()["habit"]["today_status"] is None
    assert balance(user_client) == 0


def test_daily_cap_of_ten_leaves(user_client):
    today = _today(user_client)
    habits = [make_habit(user_client) for _ in range(11)]
    awarded = [_check(user_client, h["id"], today).json()["leaves_awarded"] for h in habits]

    assert awarded == [1] * 10 + [0]
    assert balance(user_client) == 10
    summary = habits_today(user_client)
    assert summary["leaves_earned"] == 10
    assert summary["done"] == 11
    assert summary["scheduled"] == 11

    # O 11º cresceu mesmo sem render Folhinhas.
    last = user_client.get(f"/habits/{habits[-1]['id']}").json()
    assert last["total_checkins"] == 1
    assert last["today_leaves"] == 0


def test_checkin_day_rules(user_client):
    today = _today(user_client)
    habit = make_habit(user_client)

    assert _check(user_client, habit["id"], today + timedelta(days=1)).status_code == 400
    # Criado hoje: ontem ainda não existia.
    assert _check(user_client, habit["id"], today - timedelta(days=1)).status_code == 400
    assert _check(user_client, habit["id"], today, "talvez").status_code == 422

    other_days = [d for d in range(1, 8) if d != today.isoweekday()]
    off_today = make_habit(user_client, weekdays=other_days)
    assert off_today["scheduled_today"] is False
    assert _check(user_client, off_today["id"], today).status_code == 400


def test_detail_has_calendar_history_and_thresholds(user_client):
    habit = make_habit(user_client, weekdays=[1, 3, 5])
    detail = user_client.get(f"/habits/{habit['id']}").json()

    assert detail["thresholds"] == [0, 5, 14, 43]
    assert detail["history"][0]["direction"] == "start"
    assert detail["history"][0]["stage"] == "broto"
    assert len(detail["calendar"]) == 49
    assert date.fromisoformat(detail["calendar"][0]["day"]).isoweekday() == 1
    statuses = {d["status"] for d in detail["calendar"]}
    assert statuses <= {"done", "rest", "missed", "pending", "off", "before", "future"}


def test_update_and_delete_keep_earned_leaves(user_client):
    habit = make_habit(user_client)
    today = _today(user_client)
    _check(user_client, habit["id"], today)

    r = user_client.patch(
        f"/habits/{habit['id']}",
        json={"title": "Ler 10 páginas", "weekdays": [1, 2, 3, 4, 5, 6, 7], "time_of_day": "22:00"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["title"] == "Ler 10 páginas"
    assert r.json()["total_checkins"] == 1

    assert user_client.delete(f"/habits/{habit['id']}").status_code == 204
    assert user_client.get(f"/habits/{habit['id']}").status_code == 404
    assert balance(user_client) == 1


def test_habits_are_private(user_client, second_user_client):
    habit = make_habit(user_client)
    today = _today(user_client)
    hid = habit["id"]

    assert second_user_client.get("/habits").json() == []
    assert second_user_client.get(f"/habits/{hid}").status_code == 404
    assert (
        second_user_client.patch(f"/habits/{hid}", json={"title": "x", "weekdays": [1]}).status_code
        == 404
    )
    assert _check(second_user_client, hid, today).status_code == 404
    assert second_user_client.delete(f"/habits/{hid}/checkins/{today}").status_code == 404
    assert second_user_client.delete(f"/habits/{hid}").status_code == 404
    assert user_client.get(f"/habits/{hid}").status_code == 200


def test_habit_routes_require_auth(client):
    assert client.get("/habits").status_code == 401
    assert client.get("/habits/today").status_code == 401
    assert client.post("/habits", json={"title": "x", "weekdays": [1]}).status_code == 401
    assert client.get(f"/habits/{NIL_UUID}").status_code == 401
    assert (
        client.put(f"/habits/{NIL_UUID}/checkins/2026-01-01", json={"status": "done"}).status_code
        == 401
    )
