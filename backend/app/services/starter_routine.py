"""Rotina inicial "Organizar meu dia" (docs/11-rotina-e-habitos.md, 3.10).

Toda conta nasce com ela: dias úteis, de manhã, com um passo que convida a
montar o Plano do dia. Também mostra a quem chega que rotinas existem. A
migração `0007_starter_routine` dá a mesma rotina a quem já tinha conta.
"""

import uuid

from sqlalchemy.orm import Session

from app import models
from app.services.habits import local_today

STARTER_ROUTINE_NAME = "Organizar meu dia"
STARTER_ROUTINE_ANCHOR = "ao começar o dia"
STARTER_HABIT_TITLE = "Montar o Plano do dia"
# Segunda a sexta (dias ISO).
STARTER_WEEKDAYS = [1, 2, 3, 4, 5]


def add_starter_routine(db: Session, user_id: uuid.UUID) -> models.Routine:
    routine = models.Routine(user_id=user_id, name=STARTER_ROUTINE_NAME, anchor=STARTER_ROUTINE_ANCHOR)
    db.add(routine)
    db.flush()
    db.add(
        models.Habit(
            user_id=user_id,
            title=STARTER_HABIT_TITLE,
            kind=models.HabitKind.do,
            weekdays=STARTER_WEEKDAYS,
            period=models.HabitPeriod.morning,
            start_date=local_today(),
            routine_id=routine.id,
            routine_position=0,
        )
    )
    db.flush()
    return routine
