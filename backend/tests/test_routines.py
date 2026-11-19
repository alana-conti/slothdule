"""Rotinas encadeadas e bônus de rotinas: /routines (docs/11-rotina-e-habitos.md, 3.9).

- Rotina = lista ordenada de hábitos; um hábito está em no máximo uma rotina.
- Bônus de +2 uma vez por dia, quando todas as rotinas com passos no dia têm
  todos os passos feitos. Fora do teto de 10. Folga não completa a rotina.
- Desfazer um cuidado devolve o bônus; editar a rotina nunca tira um já ganho.
"""

from datetime import date

from app.services.routines import routines_complete

from .helpers import balance, habits_today, make_habit

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def _today(client) -> date:
    return date.fromisoformat(habits_today(client)["date"])


def _not_today(client) -> list[int]:
    """Dias da semana que não incluem hoje: o hábito fica fora da agenda."""
    weekday = _today(client).isoweekday()
    return [d for d in range(1, 8) if d != weekday]


def _check(client, habit_id: str, status: str | None = "done"):
    day = _today(client).isoformat()
    if status is None:
        return client.delete(f"/habits/{habit_id}/checkins/{day}")
    return client.put(f"/habits/{habit_id}/checkins/{day}", json={"status": status})


def _make_routine(client, habit_ids: list[str], **overrides) -> dict:
    payload = {"name": "Rotina da manhã", "anchor": "Depois de acordar", "habit_ids": habit_ids}
    payload.update(overrides)
    r = client.post("/routines", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


# --- Regra pura ---


def test_routines_complete_rule():
    assert routines_complete([["done", "done"]]) is True
    assert routines_complete([["done"], ["done", "done"]]) is True
    assert routines_complete([["done", None]]) is False
    assert routines_complete([["done", "rest"]]) is False  # folga não completa
    assert routines_complete([["done"], [None]]) is False  # todas as rotinas do dia
    assert routines_complete([]) is False  # sem rotina no dia, sem bônus
    assert routines_complete([[], ["done"]]) is True  # rotina sem passos hoje não conta
    assert routines_complete([[]]) is False


# --- CRUD ---


def test_create_and_list_routine_keeps_order(user_client):
    a, b, c = (make_habit(user_client, title=t) for t in ("Água", "Alongar", "Planejar"))
    routine = _make_routine(
        user_client, [c["id"], a["id"], b["id"]], name="  Manhã  ", anchor="  depois do café  "
    )
    assert routine["name"] == "Manhã"
    assert routine["anchor"] == "depois do café"
    assert routine["habit_ids"] == [c["id"], a["id"], b["id"]]

    listed = user_client.get("/routines").json()
    assert [r["habit_ids"] for r in listed] == [[c["id"], a["id"], b["id"]]]

    habits = {h["id"]: h for h in user_client.get("/habits").json()}
    assert habits[c["id"]]["routine_id"] == routine["id"]
    assert [habits[h]["routine_position"] for h in (c["id"], a["id"], b["id"])] == [0, 1, 2]


def test_blank_anchor_becomes_null(user_client):
    habit = make_habit(user_client)
    routine = _make_routine(user_client, [habit["id"]], anchor="   ")
    assert routine["anchor"] is None


def test_create_validation(user_client):
    habit = make_habit(user_client)
    assert user_client.post("/routines", json={"name": " ", "habit_ids": [habit["id"]]}).status_code == 422
    assert user_client.post("/routines", json={"name": "x", "habit_ids": []}).status_code == 422
    assert (
        user_client.post("/routines", json={"name": "x", "habit_ids": [habit["id"], habit["id"]]}).status_code
        == 422
    )
    assert user_client.post("/routines", json={"name": "x", "habit_ids": [NIL_UUID]}).status_code == 404
    assert user_client.get("/routines").json() == []


def test_update_reorders_and_releases_removed_steps(user_client):
    a, b, c = (make_habit(user_client) for _ in range(3))
    routine = _make_routine(user_client, [a["id"], b["id"]])

    r = user_client.patch(
        f"/routines/{routine['id']}",
        json={"name": "Noite", "anchor": None, "habit_ids": [c["id"], a["id"]]},
    )
    assert r.status_code == 200, r.text
    assert r.json()["habit_ids"] == [c["id"], a["id"]]
    assert r.json()["name"] == "Noite"

    habits = {h["id"]: h for h in user_client.get("/habits").json()}
    assert habits[b["id"]]["routine_id"] is None
    assert habits[b["id"]]["routine_position"] is None
    assert habits[c["id"]]["routine_position"] == 0


def test_habit_moves_between_routines(user_client):
    a, b = make_habit(user_client), make_habit(user_client)
    first = _make_routine(user_client, [a["id"], b["id"]])
    second = _make_routine(user_client, [b["id"]], name="Noite")

    listed = {r["id"]: r for r in user_client.get("/routines").json()}
    assert listed[first["id"]]["habit_ids"] == [a["id"]]
    assert listed[second["id"]]["habit_ids"] == [b["id"]]


def test_delete_routine_keeps_habits_loose(user_client):
    habit = make_habit(user_client)
    routine = _make_routine(user_client, [habit["id"]])

    assert user_client.delete(f"/routines/{routine['id']}").status_code == 204
    assert user_client.get("/routines").json() == []
    [kept] = user_client.get("/habits").json()
    assert kept["routine_id"] is None
    assert user_client.delete(f"/routines/{routine['id']}").status_code == 404


def test_deleting_habit_removes_it_from_routine(user_client):
    a, b = make_habit(user_client), make_habit(user_client)
    _make_routine(user_client, [a["id"], b["id"]])
    assert user_client.delete(f"/habits/{a['id']}").status_code == 204
    [routine] = user_client.get("/routines").json()
    assert routine["habit_ids"] == [b["id"]]


# --- Bônus ---


def test_bonus_when_every_step_is_done(user_client):
    a, b = make_habit(user_client), make_habit(user_client)
    _make_routine(user_client, [a["id"], b["id"]])
    start = balance(user_client)

    first = _check(user_client, a["id"]).json()
    assert first["routine_bonus_change"] == 0
    assert habits_today(user_client)["routine_bonus_earned"] is False

    second = _check(user_client, b["id"]).json()
    assert second["routine_bonus_change"] == 2
    today = habits_today(user_client)
    assert today["routine_bonus_earned"] is True
    assert today["routine_bonus"] == 2
    assert balance(user_client) == start + 1 + 1 + 2


def test_bonus_is_once_a_day_for_all_routines(user_client):
    a, b, c = (make_habit(user_client) for _ in range(3))
    _make_routine(user_client, [a["id"]])
    _make_routine(user_client, [b["id"], c["id"]], name="Noite")
    start = balance(user_client)

    assert _check(user_client, a["id"]).json()["routine_bonus_change"] == 0
    assert _check(user_client, b["id"]).json()["routine_bonus_change"] == 0
    assert _check(user_client, c["id"]).json()["routine_bonus_change"] == 2
    # Repetir o mesmo cuidado é idempotente: nada de bônus em dobro.
    assert _check(user_client, c["id"]).json()["routine_bonus_change"] == 0
    assert balance(user_client) == start + 3 + 2


def test_rest_step_blocks_the_bonus(user_client):
    a, b = make_habit(user_client), make_habit(user_client)
    _make_routine(user_client, [a["id"], b["id"]])

    _check(user_client, a["id"])
    assert _check(user_client, b["id"], "rest").json()["routine_bonus_change"] == 0
    assert habits_today(user_client)["routine_bonus_earned"] is False


def test_undo_returns_the_bonus_and_redo_gives_it_back(user_client):
    habit = make_habit(user_client)
    _make_routine(user_client, [habit["id"]])
    start = balance(user_client)

    assert _check(user_client, habit["id"]).json()["routine_bonus_change"] == 2
    assert balance(user_client) == start + 1 + 2

    assert _check(user_client, habit["id"], None).json()["routine_bonus_change"] == -2
    assert balance(user_client) == start
    assert habits_today(user_client)["routine_bonus_earned"] is False

    # Trocar o cuidado por folga também tira o bônus.
    _check(user_client, habit["id"])
    assert _check(user_client, habit["id"], "rest").json()["routine_bonus_change"] == -2
    assert balance(user_client) == start


def test_bonus_is_outside_the_daily_cap(user_client):
    # Hábitos soltos chegam ao teto de 10; a rotina ainda rende +2 de bônus.
    for _ in range(10):
        _check(user_client, make_habit(user_client)["id"])
    assert habits_today(user_client)["leaves_earned"] == 10

    step = make_habit(user_client)
    _make_routine(user_client, [step["id"]])
    start = balance(user_client)
    body = _check(user_client, step["id"]).json()
    assert body["leaves_awarded"] == 0
    assert body["routine_bonus_change"] == 2
    assert body["leaves_today"] == 10  # o bônus não entra no teto
    assert balance(user_client) == start + 2


def test_steps_off_the_agenda_do_not_count(user_client):
    on = make_habit(user_client)
    off = make_habit(user_client, weekdays=_not_today(user_client))
    _make_routine(user_client, [on["id"], off["id"]])

    assert _check(user_client, on["id"]).json()["routine_bonus_change"] == 2


def test_loose_habits_do_not_block_the_bonus(user_client):
    step, loose = make_habit(user_client), make_habit(user_client)
    _make_routine(user_client, [step["id"]])
    assert _check(user_client, step["id"]).json()["routine_bonus_change"] == 2
    assert _check(user_client, loose["id"]).json()["routine_bonus_change"] == 0


def test_no_routine_no_bonus(user_client):
    habit = make_habit(user_client)
    assert _check(user_client, habit["id"]).json()["routine_bonus_change"] == 0
    assert habits_today(user_client)["routine_bonus_earned"] is False


def test_editing_routines_never_takes_the_bonus_away(user_client):
    a, b = make_habit(user_client), make_habit(user_client)
    routine = _make_routine(user_client, [a["id"]])
    _check(user_client, a["id"])
    start = balance(user_client)

    # Um passo novo e pendente não tira o bônus de hoje...
    r = user_client.patch(
        f"/routines/{routine['id']}", json={"name": "Manhã", "habit_ids": [a["id"], b["id"]]}
    )
    assert r.status_code == 200
    assert habits_today(user_client)["routine_bonus_earned"] is True
    # ...e apagar a rotina também não.
    assert user_client.delete(f"/routines/{routine['id']}").status_code == 204
    assert balance(user_client) == start


def test_routine_made_of_done_habits_closes_the_day(user_client):
    habit = make_habit(user_client)
    _check(user_client, habit["id"])
    start = balance(user_client)
    _make_routine(user_client, [habit["id"]])
    assert habits_today(user_client)["routine_bonus_earned"] is True
    assert balance(user_client) == start + 2


# --- Acesso ---


def test_requires_session(client):
    assert client.get("/routines").status_code == 401
    assert client.post("/routines", json={"name": "x", "habit_ids": [NIL_UUID]}).status_code == 401


def test_users_cannot_touch_each_others_routines(user_client, second_user_client):
    habit = make_habit(user_client)
    routine = _make_routine(user_client, [habit["id"]])

    assert second_user_client.get("/routines").json() == []
    assert (
        second_user_client.patch(
            f"/routines/{routine['id']}", json={"name": "x", "habit_ids": [habit["id"]]}
        ).status_code
        == 404
    )
    assert second_user_client.delete(f"/routines/{routine['id']}").status_code == 404

    # Usar o hábito de outra pessoa como passo: 404, e nada muda.
    assert (
        second_user_client.post("/routines", json={"name": "x", "habit_ids": [habit["id"]]}).status_code
        == 404
    )
    [mine] = user_client.get("/routines").json()
    assert mine["habit_ids"] == [habit["id"]]
