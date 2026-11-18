"""Crescimento dos hábitos — regras de docs/11-rotina-e-habitos.md (seções 3.4 a 3.7).

Espelha `src/lib/habits/index.ts` (limiares e Folhinhas por estágio). Tudo
aqui é puro: recebe a agenda e os check-ins e devolve o estado da planta.

- Estágios: broto (+1), muda (+2), arbusto (+3), árvore (+4) por cuidado.
- Crescimento por contador acumulado de cuidados, sem exigir sequência.
- Limiares por dias na semana: âncoras em 1, 3 e 7 dias; os demais são
  interpolados (provisório até a decisão dos limiares exatos).
- Regressão: depois de 2 semanas de agenda sem nenhum cuidado (folgas não
  contam), a planta desce um estágio e fica a ¼ do degrau perdido de voltar.
  Nunca desce abaixo de broto.
- Folga congela o dia: não é falta, não é cuidado.
- Teto: no máximo 10 Folhinhas por dia vindas de hábitos.
"""

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from math import ceil, floor
from typing import Literal
from zoneinfo import ZoneInfo

SAO_PAULO = ZoneInfo("America/Sao_Paulo")

STAGES = ("broto", "muda", "arbusto", "arvore")
LEAVES_BY_STAGE = (1, 2, 3, 4)
DAILY_LEAF_CAP = 10
CHECKIN_WINDOW_DAYS = 7

# Cuidados acumulados para chegar a muda, arbusto e árvore.
THRESHOLD_ANCHORS: dict[int, tuple[int, int, int]] = {
    1: (3, 8, 25),
    3: (5, 14, 43),
    7: (7, 21, 66),
}

CheckinStatus = Literal["done", "rest"]


def _round_half_up(value: float) -> int:
    return int(floor(value + 0.5))


def thresholds(days_per_week: int) -> tuple[int, int, int, int]:
    """Contador mínimo de cada estágio: (broto, muda, arbusto, árvore)."""
    days = max(1, min(7, days_per_week))
    if days in THRESHOLD_ANCHORS:
        muda, arbusto, arvore = THRESHOLD_ANCHORS[days]
        return (0, muda, arbusto, arvore)

    low = max(a for a in THRESHOLD_ANCHORS if a < days)
    high = min(a for a in THRESHOLD_ANCHORS if a > days)
    ratio = (days - low) / (high - low)
    values = tuple(
        _round_half_up(lo + (hi - lo) * ratio)
        for lo, hi in zip(THRESHOLD_ANCHORS[low], THRESHOLD_ANCHORS[high])
    )
    return (0, *values)


def regression_after(days_per_week: int) -> int:
    """Ocorrências seguidas sem cuidado que fazem a planta descer (2 semanas)."""
    return 2 * max(1, min(7, days_per_week))


def stage_for(growth: int, limits: tuple[int, int, int, int]) -> int:
    stage = 0
    for index, minimum in enumerate(limits):
        if growth >= minimum:
            stage = index
    return stage


def growth_after_regression(stage: int, limits: tuple[int, int, int, int]) -> int:
    """Contador ao descer de `stage`: falta ¼ do degrau perdido para voltar."""
    step = limits[stage] - limits[stage - 1]
    return limits[stage] - ceil(step / 4)


@dataclass
class StageChange:
    day: date
    stage: int
    direction: Literal["start", "up", "down"]


@dataclass
class Growth:
    stage: int = 0
    growth: int = 0
    total_checkins: int = 0
    misses_in_row: int = 0
    history: list[StageChange] = field(default_factory=list)


def is_scheduled(day: date, weekdays: list[int] | tuple[int, ...] | set[int]) -> bool:
    return day.isoweekday() in weekdays


def simulate(
    weekdays: list[int] | tuple[int, ...] | set[int],
    start_date: date,
    checkins: dict[date, CheckinStatus],
    through: date,
    today: date,
) -> Growth:
    """Reprocessa a agenda de `start_date` até `through` (inclusive).

    O dia `today` sem registro ainda não é falta: o dia não acabou.
    """
    days = set(weekdays)
    limits = thresholds(len(days))
    limit_misses = regression_after(len(days))
    state = Growth(history=[StageChange(start_date, 0, "start")])

    day = start_date
    while day <= through:
        if is_scheduled(day, days):
            status = checkins.get(day)
            if status == "done":
                state.growth += 1
                state.total_checkins += 1
                state.misses_in_row = 0
                new_stage = stage_for(state.growth, limits)
                if new_stage > state.stage:
                    state.stage = new_stage
                    state.history.append(StageChange(day, new_stage, "up"))
            elif status is None and day < today:
                state.misses_in_row += 1
                if state.misses_in_row >= limit_misses:
                    state.misses_in_row = 0
                    if state.stage > 0:
                        state.growth = growth_after_regression(state.stage, limits)
                        state.stage -= 1
                        state.history.append(StageChange(day, state.stage, "down"))
            # Folga: o dia fica congelado.
        day += timedelta(days=1)

    return state


def stage_at_start_of(
    weekdays: list[int] | tuple[int, ...] | set[int],
    start_date: date,
    checkins: dict[date, CheckinStatus],
    day: date,
    today: date,
) -> int:
    """Estágio da planta no começo de `day` — define as Folhinhas daquele cuidado."""
    return simulate(weekdays, start_date, checkins, day - timedelta(days=1), today).stage


def leaves_to_award(stage: int, earned_that_day: int) -> int:
    """Folhinhas de um cuidado, respeitando o teto diário dos hábitos."""
    return max(0, min(LEAVES_BY_STAGE[stage], DAILY_LEAF_CAP - earned_that_day))


def local_today(now: datetime | None = None) -> date:
    return (now or datetime.now(timezone.utc)).astimezone(SAO_PAULO).date()


DayStatus = Literal["done", "rest", "missed", "pending", "off", "before", "future"]


def day_status(
    day: date,
    weekdays: list[int] | tuple[int, ...] | set[int],
    start_date: date,
    checkins: dict[date, CheckinStatus],
    today: date,
) -> DayStatus:
    if day > today:
        return "future"
    if not is_scheduled(day, weekdays):
        return "off"
    if day < start_date:
        return "before"
    status = checkins.get(day)
    if status is not None:
        return status
    return "pending" if day == today else "missed"
