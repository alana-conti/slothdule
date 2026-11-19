"""Rotinas encadeadas e o bônus de rotinas (docs/11-rotina-e-habitos.md, 3.9).

- Uma rotina é uma lista ordenada de hábitos (os passos).
- Os passos de um dia são os hábitos da rotina agendados para aquele dia.
- Bônus: +2 Folhinhas uma vez por dia quando todas as rotinas com passos no
  dia têm todos esses passos feitos. Folga não completa a rotina.
- O bônus fica fora do teto diário de 10 dos hábitos.

`routines_complete` é pura; `reconcile_bonus` mexe no banco.
"""

from collections.abc import Iterable, Sequence
from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app import models
from app.services import habits as rules

ROUTINE_BONUS = 2


def is_step_on(habit: models.Habit, day: date) -> bool:
    return day >= habit.start_date and rules.is_scheduled(day, habit.weekdays)


def routines_complete(routines: Iterable[Sequence[str | None]]) -> bool:
    """Cada item é a lista de estados dos passos de uma rotina no dia.

    Rotinas sem passos no dia não contam. Sem nenhuma rotina no dia, não há
    bônus. Só `done` completa um passo: folga e pendente, não.
    """
    days = [steps for steps in routines if len(steps) > 0]
    return bool(days) and all(all(status == "done" for status in steps) for steps in days)


def _day_statuses(db: Session, user_id: UUID, day: date) -> list[list[str | None]]:
    habits = (
        db.query(models.Habit)
        .filter(models.Habit.user_id == user_id, models.Habit.routine_id.isnot(None))
        .all()
    )
    rows = (
        db.query(models.HabitCheckin)
        .filter(models.HabitCheckin.user_id == user_id, models.HabitCheckin.day == day)
        .all()
    )
    status_by_habit = {row.habit_id: row.status.value for row in rows}
    by_routine: dict[UUID, list[str | None]] = {}
    for habit in habits:
        if is_step_on(habit, day):
            by_routine.setdefault(habit.routine_id, []).append(status_by_habit.get(habit.id))
    return list(by_routine.values())


def bonus_for(db: Session, user_id: UUID, day: date) -> models.RoutineBonus | None:
    return (
        db.query(models.RoutineBonus)
        .filter(models.RoutineBonus.user_id == user_id, models.RoutineBonus.day == day)
        .first()
    )


def reconcile_bonus(db: Session, user_id: UUID, day: date, *, allow_revoke: bool = True) -> int:
    """Dá ou devolve o bônus do dia conforme o estado atual. Retorna +2, -2 ou 0.

    Desfazer um cuidado devolve o bônus (como devolve as Folhinhas do
    cuidado). Mudanças na própria rotina usam `allow_revoke=False`: editar a
    rotina nunca tira um bônus já ganho.
    """
    complete = routines_complete(_day_statuses(db, user_id, day))
    current = bonus_for(db, user_id, day)

    if complete and current is None:
        tx = models.LeafTransaction(
            user_id=user_id,
            type=models.LeafTransactionType.routine_bonus,
            amount=ROUTINE_BONUS,
            reason="Bônus: rotinas do dia completas",
        )
        db.add(tx)
        db.flush()
        db.add(models.RoutineBonus(user_id=user_id, day=day, leaf_transaction_id=tx.id))
        db.flush()
        return ROUTINE_BONUS

    if not complete and current is not None and allow_revoke:
        amount = 0
        if current.leaf_transaction_id:
            tx = db.get(models.LeafTransaction, current.leaf_transaction_id)
            if tx is not None:
                amount = tx.amount
                db.delete(tx)
        db.delete(current)
        db.flush()
        return -amount

    return 0
