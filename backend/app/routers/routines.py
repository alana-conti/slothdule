"""Rotinas encadeadas (docs/11-rotina-e-habitos.md, 3.9).

Uma rotina é uma lista ordenada de hábitos. Os passos moram em
`habits.routine_id`/`routine_position`; o bônus de +2 do dia sai de
`app/services/routines.py`.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db
from app.services import habits as rules
from app.services import routines as chains

router = APIRouter(prefix="/routines", tags=["routines"])


def _require_routine(db: Session, user_id: UUID, routine_id: UUID) -> models.Routine:
    routine = (
        db.query(models.Routine)
        .filter(models.Routine.id == routine_id, models.Routine.user_id == user_id)
        .first()
    )
    if not routine:
        raise HTTPException(status_code=404, detail="Rotina não encontrada.")
    return routine


def _steps(db: Session, routine_ids: list[UUID]) -> dict[UUID, list[UUID]]:
    out: dict[UUID, list[UUID]] = {rid: [] for rid in routine_ids}
    if not routine_ids:
        return out
    rows = (
        db.query(models.Habit.id, models.Habit.routine_id)
        .filter(models.Habit.routine_id.in_(routine_ids))
        .order_by(models.Habit.routine_position.asc(), models.Habit.created_at.asc())
        .all()
    )
    for row in rows:
        out[row.routine_id].append(row.id)
    return out


def _routine_out(routine: models.Routine, habit_ids: list[UUID]) -> dict:
    return {
        "id": routine.id,
        "name": routine.name,
        "anchor": routine.anchor,
        "habit_ids": habit_ids,
        "created_at": routine.created_at,
    }


def _set_steps(db: Session, user_id: UUID, routine: models.Routine, habit_ids: list[UUID]) -> None:
    habits = (
        db.query(models.Habit)
        .filter(models.Habit.user_id == user_id, models.Habit.id.in_(habit_ids))
        .all()
    )
    if len(habits) != len(habit_ids):
        raise HTTPException(status_code=404, detail="Hábito não encontrado.")

    # Quem saiu da rotina vira hábito solto.
    for habit in (
        db.query(models.Habit)
        .filter(models.Habit.routine_id == routine.id, models.Habit.id.notin_(habit_ids))
        .all()
    ):
        habit.routine_id = None
        habit.routine_position = None

    by_id = {habit.id: habit for habit in habits}
    for position, habit_id in enumerate(habit_ids):
        by_id[habit_id].routine_id = routine.id
        by_id[habit_id].routine_position = position
    db.flush()


@router.get("", response_model=list[schemas.RoutineOut])
def list_routines(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    routines = (
        db.query(models.Routine)
        .filter(models.Routine.user_id == user.id)
        .order_by(models.Routine.created_at.asc())
        .all()
    )
    steps = _steps(db, [r.id for r in routines])
    return [_routine_out(r, steps[r.id]) for r in routines]


@router.post("", response_model=schemas.RoutineOut, status_code=201)
def create_routine(
    payload: schemas.RoutineIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    routine = models.Routine(user_id=user.id, name=payload.name, anchor=payload.anchor)
    db.add(routine)
    db.flush()
    _set_steps(db, user.id, routine, payload.habit_ids)
    # Editar rotinas pode fechar o dia (dá o bônus), mas nunca tira um já ganho.
    chains.reconcile_bonus(db, user.id, rules.local_today(), allow_revoke=False)
    db.commit()
    db.refresh(routine)
    return _routine_out(routine, payload.habit_ids)


@router.patch("/{routine_id}", response_model=schemas.RoutineOut)
def update_routine(
    routine_id: UUID,
    payload: schemas.RoutineIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    routine = _require_routine(db, user.id, routine_id)
    routine.name = payload.name
    routine.anchor = payload.anchor
    _set_steps(db, user.id, routine, payload.habit_ids)
    chains.reconcile_bonus(db, user.id, rules.local_today(), allow_revoke=False)
    db.commit()
    db.refresh(routine)
    return _routine_out(routine, payload.habit_ids)


@router.delete("/{routine_id}", status_code=204)
def delete_routine(
    routine_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    # Os hábitos continuam, agora soltos; o bônus já ganho fica.
    routine = _require_routine(db, user.id, routine_id)
    for habit in db.query(models.Habit).filter(models.Habit.routine_id == routine.id).all():
        habit.routine_id = None
        habit.routine_position = None
    db.delete(routine)
    db.flush()
    chains.reconcile_bonus(db, user.id, rules.local_today(), allow_revoke=False)
    db.commit()
    return Response(status_code=204)
