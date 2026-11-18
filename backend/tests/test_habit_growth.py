"""Regras puras de crescimento dos hábitos (`app/services/habits.py`).

Exceção ao padrão "sempre via HTTP": aqui não há router, só as regras do
doc 11 (limiares, regressão, folga e teto). O contrato HTTP fica em
`test_habits.py`.
"""

from datetime import date, timedelta

from app.services.habits import (
    DAILY_LEAF_CAP,
    day_status,
    leaves_to_award,
    regression_after,
    simulate,
    stage_at_start_of,
    thresholds,
)

EVERY_DAY = [1, 2, 3, 4, 5, 6, 7]
START = date(2026, 1, 5)  # segunda-feira


def _done(days: int, start: date = START) -> dict:
    return {start + timedelta(days=i): "done" for i in range(days)}


def test_thresholds_match_doc_anchors():
    assert thresholds(7) == (0, 7, 21, 66)
    assert thresholds(3) == (0, 5, 14, 43)
    assert thresholds(1) == (0, 3, 8, 25)


def test_thresholds_interpolate_between_anchors():
    assert thresholds(5) == (0, 6, 18, 55)
    assert thresholds(2) == (0, 4, 11, 34)
    assert thresholds(4) == (0, 6, 16, 49)
    assert thresholds(6) == (0, 7, 19, 60)


def test_regression_window_is_two_weeks_of_schedule():
    assert regression_after(7) == 14
    assert regression_after(3) == 6
    assert regression_after(1) == 2


def test_growth_counts_checkins_without_streak():
    # Cuida um dia sim, outro não: cresce igual, sem punição por falta solta.
    checkins = {START + timedelta(days=i): "done" for i in range(0, 14, 2)}
    state = simulate(EVERY_DAY, START, checkins, START + timedelta(days=13), date(2026, 3, 1))
    assert state.total_checkins == 7
    assert state.stage == 1  # muda aos 7 cuidados
    assert state.misses_in_row == 1


def test_stage_ups_are_recorded_with_dates():
    checkins = _done(21)
    state = simulate(EVERY_DAY, START, checkins, START + timedelta(days=20), date(2026, 3, 1))
    assert state.stage == 2
    assert [(c.stage, c.direction) for c in state.history] == [(0, "start"), (1, "up"), (2, "up")]
    assert state.history[1].day == START + timedelta(days=6)
    assert state.history[2].day == START + timedelta(days=20)


def test_two_weeks_without_care_drops_one_stage_and_recovery_needs_a_quarter():
    checkins = _done(66)  # árvore
    last_care = START + timedelta(days=65)
    today = last_care + timedelta(days=30)

    thirteen = simulate(EVERY_DAY, START, checkins, last_care + timedelta(days=13), today)
    assert thirteen.stage == 3
    assert thirteen.misses_in_row == 13

    fourteen = simulate(EVERY_DAY, START, checkins, last_care + timedelta(days=14), today)
    assert fourteen.stage == 2
    assert fourteen.misses_in_row == 0
    assert fourteen.history[-1].direction == "down"
    # Degrau arbusto→árvore = 45; ¼ arredondado para cima = 12 cuidados.
    assert fourteen.growth == 66 - 12


def test_plant_never_drops_below_broto():
    checkins = _done(2)
    state = simulate(EVERY_DAY, START, checkins, START + timedelta(days=60), date(2026, 6, 1))
    assert state.stage == 0
    assert state.growth == 2


def test_rest_days_freeze_the_plant():
    checkins = _done(7)
    for i in range(7, 40):
        checkins[START + timedelta(days=i)] = "rest"
    state = simulate(EVERY_DAY, START, checkins, START + timedelta(days=39), date(2026, 6, 1))
    assert state.stage == 1
    assert state.misses_in_row == 0
    assert state.total_checkins == 7


def test_today_without_record_is_not_a_miss_yet():
    today = START + timedelta(days=3)
    state = simulate(EVERY_DAY, START, _done(3), today, today)
    assert state.misses_in_row == 0


def test_unscheduled_days_do_not_count():
    mon_wed_fri = [1, 3, 5]
    state = simulate(mon_wed_fri, START, {}, START + timedelta(days=6), date(2026, 6, 1))
    assert state.misses_in_row == 3


def test_stage_at_start_of_day_ignores_that_day():
    checkins = _done(7)
    seventh = START + timedelta(days=6)
    assert stage_at_start_of(EVERY_DAY, START, checkins, seventh, seventh) == 0
    assert stage_at_start_of(EVERY_DAY, START, checkins, seventh + timedelta(days=1), seventh) == 1


def test_leaves_respect_daily_cap():
    assert leaves_to_award(3, 0) == 4
    assert leaves_to_award(3, 8) == 2
    assert leaves_to_award(0, DAILY_LEAF_CAP) == 0


def test_day_status():
    today = START + timedelta(days=2)
    checkins = {START: "done", START + timedelta(days=1): "rest"}
    weekdays = [1, 2, 3]
    assert day_status(START, weekdays, START, checkins, today) == "done"
    assert day_status(START + timedelta(days=1), weekdays, START, checkins, today) == "rest"
    assert day_status(today, weekdays, START, checkins, today) == "pending"
    assert day_status(START - timedelta(days=7), weekdays, START, checkins, today) == "before"
    assert day_status(START + timedelta(days=3), weekdays, START, checkins, today) == "future"
    assert day_status(START - timedelta(days=1), weekdays, START, checkins, START) == "off"
