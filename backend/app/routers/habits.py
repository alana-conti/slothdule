"""Rotina e hábitos (docs/11-rotina-e-habitos.md).

Estágio, contador e Folhinhas saem de `app/services/habits.py`. O cuidado de
um dia rende as Folhinhas do estágio em que a planta estava no começo daquele
dia, respeitando o teto diário dos hábitos.
"""

from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db
from app.services import habits as rules

router = APIRouter(prefix="/habits", tags=["habits"])

CALENDAR_WEEKS = 7


def _require_habit(db: Session, user_id: UUID, habit_id: UUID) -> models.Habit:
    habit = (
        db.query(models.Habit)
        .filter(models.Habit.id == habit_id, models.Habit.user_id == user_id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Hábito não encontrado.")
    return habit


def _checkins_by_habit(
    db: Session, user_id: UUID, habit_ids: list[UUID]
) -> dict[UUID, dict[date, models.HabitCheckin]]:
    out: dict[UUID, dict[date, models.HabitCheckin]] = {hid: {} for hid in habit_ids}
    if not habit_ids:
        return out
    rows = (
        db.query(models.HabitCheckin)
        .filter(
            models.HabitCheckin.user_id == user_id,
            models.HabitCheckin.habit_id.in_(habit_ids),
        )
        .all()
    )
    for row in rows:
        out[row.habit_id][row.day] = row
    return out


def _statuses(checkins: dict[date, models.HabitCheckin]) -> dict[date, str]:
    return {day: row.status.value for day, row in checkins.items()}


def _leaves_by_transaction(db: Session, checkins: dict[date, models.HabitCheckin]) -> dict[UUID, int]:
    ids = [row.leaf_transaction_id for row in checkins.values() if row.leaf_transaction_id]
    if not ids:
        return {}
    rows = (
        db.query(models.LeafTransaction.id, models.LeafTransaction.amount)
        .filter(models.LeafTransaction.id.in_(ids))
        .all()
    )
    return {row.id: row.amount for row in rows}


def _leaves_earned_on(db: Session, user_id: UUID, day: date) -> int:
    total = (
        db.query(func.coalesce(func.sum(models.LeafTransaction.amount), 0))
        .join(
            models.HabitCheckin,
            models.HabitCheckin.leaf_transaction_id == models.LeafTransaction.id,
        )
        .filter(models.HabitCheckin.user_id == user_id, models.HabitCheckin.day == day)
        .scalar()
    )
    return int(total or 0)


def _habit_out(
    db: Session,
    habit: models.Habit,
    checkins: dict[date, models.HabitCheckin],
    today: date,
) -> dict:
    statuses = _statuses(checkins)
    state = rules.simulate(habit.weekdays, habit.start_date, statuses, today, today)
    limits = rules.thresholds(len(set(habit.weekdays)))
    next_index = state.stage + 1 if state.stage < len(rules.STAGES) - 1 else None
    today_row = checkins.get(today)
    today_leaves = 0
    if today_row and today_row.leaf_transaction_id:
        today_leaves = _leaves_by_transaction(db, {today: today_row}).get(
            today_row.leaf_transaction_id, 0
        )

    return {
        "id": habit.id,
        "title": habit.title,
        "kind": habit.kind,
        "weekdays": sorted(habit.weekdays),
        "time_of_day": habit.time_of_day,
        "period": habit.period,
        "remind": habit.remind,
        "start_date": habit.start_date,
        "created_at": habit.created_at,
        "stage": rules.STAGES[state.stage],
        "leaves_per_checkin": rules.LEAVES_BY_STAGE[state.stage],
        "growth": state.growth,
        "total_checkins": state.total_checkins,
        "current_threshold": limits[state.stage],
        "next_stage": rules.STAGES[next_index] if next_index is not None else None,
        "next_threshold": limits[next_index] if next_index is not None else None,
        "misses_in_row": state.misses_in_row,
        "regression_after": rules.regression_after(len(set(habit.weekdays))),
        "scheduled_today": rules.is_scheduled(today, habit.weekdays) and today >= habit.start_date,
        "today_status": today_row.status if today_row else None,
        "today_leaves": today_leaves,
    }


def _check_day(habit: models.Habit, day: date, today: date) -> None:
    if day > today:
        raise HTTPException(status_code=400, detail="Esse dia ainda não chegou.")
    if day < today - timedelta(days=rules.CHECKIN_WINDOW_DAYS):
        raise HTTPException(
            status_code=400, detail="Dá para registrar só os últimos 7 dias."
        )
    if day < habit.start_date:
        raise HTTPException(status_code=400, detail="O hábito ainda não existia nesse dia.")
    if not rules.is_scheduled(day, habit.weekdays):
        raise HTTPException(status_code=400, detail="Esse dia não está na agenda do hábito.")


def _drop_leaves(db: Session, checkin: models.HabitCheckin) -> None:
    if checkin.leaf_transaction_id:
        tx = db.get(models.LeafTransaction, checkin.leaf_transaction_id)
        checkin.leaf_transaction_id = None
        if tx is not None:
            db.delete(tx)
        db.flush()


@router.get("", response_model=list[schemas.HabitOut])
def list_habits(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    habits = (
        db.query(models.Habit)
        .filter(models.Habit.user_id == user.id)
        .order_by(models.Habit.created_at.asc())
        .all()
    )
    checkins = _checkins_by_habit(db, user.id, [h.id for h in habits])
    today = rules.local_today()
    return [_habit_out(db, h, checkins[h.id], today) for h in habits]


@router.post("", response_model=schemas.HabitOut, status_code=201)
def create_habit(
    payload: schemas.HabitIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    today = rules.local_today()
    habit = models.Habit(
        user_id=user.id,
        title=payload.title,
        kind=payload.kind,
        weekdays=payload.weekdays,
        time_of_day=payload.time_of_day,
        period=payload.period,
        remind=payload.remind,
        start_date=today,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return _habit_out(db, habit, {}, today)


@router.get("/today", response_model=schemas.HabitTodayOut)
def today_summary(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    today = rules.local_today()
    habits = db.query(models.Habit).filter(models.Habit.user_id == user.id).all()
    due = [h for h in habits if rules.is_scheduled(today, h.weekdays) and today >= h.start_date]
    rows = (
        db.query(models.HabitCheckin)
        .filter(models.HabitCheckin.user_id == user.id, models.HabitCheckin.day == today)
        .all()
    )
    due_ids = {h.id for h in due}
    return {
        "date": today,
        "leaves_earned": _leaves_earned_on(db, user.id, today),
        "leaves_cap": rules.DAILY_LEAF_CAP,
        "scheduled": len(due),
        "done": sum(1 for r in rows if r.habit_id in due_ids and r.status == models.HabitCheckinStatus.done),
        "rest": sum(1 for r in rows if r.habit_id in due_ids and r.status == models.HabitCheckinStatus.rest),
    }


@router.get("/{habit_id}", response_model=schemas.HabitDetailOut)
def get_habit(
    habit_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    habit = _require_habit(db, user.id, habit_id)
    checkins = _checkins_by_habit(db, user.id, [habit.id])[habit.id]
    today = rules.local_today()
    out = _habit_out(db, habit, checkins, today)
    statuses = _statuses(checkins)
    state = rules.simulate(habit.weekdays, habit.start_date, statuses, today, today)

    # Semanas de segunda a domingo, terminando na semana atual.
    first = today - timedelta(days=today.isoweekday() - 1) - timedelta(weeks=CALENDAR_WEEKS - 1)
    calendar = [
        {
            "day": first + timedelta(days=i),
            "status": rules.day_status(
                first + timedelta(days=i), habit.weekdays, habit.start_date, statuses, today
            ),
        }
        for i in range(CALENDAR_WEEKS * 7)
    ]
    out.update(
        history=[
            {"day": c.day, "stage": rules.STAGES[c.stage], "direction": c.direction}
            for c in state.history
        ],
        calendar=calendar,
        thresholds=list(rules.thresholds(len(set(habit.weekdays)))),
    )
    return out


@router.patch("/{habit_id}", response_model=schemas.HabitOut)
def update_habit(
    habit_id: UUID,
    payload: schemas.HabitIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    habit = _require_habit(db, user.id, habit_id)
    habit.title = payload.title
    habit.kind = payload.kind
    habit.weekdays = payload.weekdays
    habit.time_of_day = payload.time_of_day
    habit.period = payload.period
    habit.remind = payload.remind
    db.commit()
    db.refresh(habit)
    checkins = _checkins_by_habit(db, user.id, [habit.id])[habit.id]
    return _habit_out(db, habit, checkins, rules.local_today())


@router.delete("/{habit_id}", status_code=204)
def delete_habit(
    habit_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    # As Folhinhas já ganhas continuam no saldo: só o vínculo com o check-in some.
    habit = _require_habit(db, user.id, habit_id)
    db.delete(habit)
    db.commit()
    return Response(status_code=204)


@router.put("/{habit_id}/checkins/{day}", response_model=schemas.HabitCheckinResultOut)
def set_checkin(
    habit_id: UUID,
    day: date,
    payload: schemas.HabitCheckinIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    habit = _require_habit(db, user.id, habit_id)
    today = rules.local_today()
    _check_day(habit, day, today)

    checkins = _checkins_by_habit(db, user.id, [habit.id])[habit.id]
    row = checkins.get(day)
    awarded = 0

    if row is not None and row.status == payload.status:
        pass  # Idempotente: nada muda.
    elif payload.status == models.HabitCheckinStatus.rest:
        if row is None:
            row = models.HabitCheckin(
                user_id=user.id, habit_id=habit.id, day=day, status=models.HabitCheckinStatus.rest
            )
            db.add(row)
        else:
            _drop_leaves(db, row)
            row.status = models.HabitCheckinStatus.rest
    else:
        if row is None:
            row = models.HabitCheckin(
                user_id=user.id, habit_id=habit.id, day=day, status=models.HabitCheckinStatus.done
            )
            db.add(row)
        else:
            row.status = models.HabitCheckinStatus.done
        db.flush()

        statuses = _statuses({d: r for d, r in checkins.items() if d != day})
        stage = rules.stage_at_start_of(habit.weekdays, habit.start_date, statuses, day, today)
        awarded = rules.leaves_to_award(stage, _leaves_earned_on(db, user.id, day))
        if awarded > 0:
            verb = "evitar" if habit.kind == models.HabitKind.avoid else "cuidar de"
            tx = models.LeafTransaction(
                user_id=user.id,
                type=models.LeafTransactionType.habit_checkin,
                amount=awarded,
                reason=f"Rotina: {verb} “{habit.title}”",
            )
            db.add(tx)
            db.flush()
            row.leaf_transaction_id = tx.id

    db.commit()
    checkins = _checkins_by_habit(db, user.id, [habit.id])[habit.id]
    return {
        "habit": _habit_out(db, habit, checkins, today),
        "leaves_awarded": awarded,
        "leaves_today": _leaves_earned_on(db, user.id, today),
        "leaves_cap": rules.DAILY_LEAF_CAP,
    }


@router.delete("/{habit_id}/checkins/{day}", response_model=schemas.HabitCheckinResultOut)
def clear_checkin(
    habit_id: UUID,
    day: date,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    habit = _require_habit(db, user.id, habit_id)
    today = rules.local_today()
    _check_day(habit, day, today)
    row = (
        db.query(models.HabitCheckin)
        .filter(
            models.HabitCheckin.user_id == user.id,
            models.HabitCheckin.habit_id == habit.id,
            models.HabitCheckin.day == day,
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Nada registrado nesse dia.")
    _drop_leaves(db, row)
    db.delete(row)
    db.commit()
    checkins = _checkins_by_habit(db, user.id, [habit.id])[habit.id]
    return {
        "habit": _habit_out(db, habit, checkins, today),
        "leaves_awarded": 0,
        "leaves_today": _leaves_earned_on(db, user.id, today),
        "leaves_cap": rules.DAILY_LEAF_CAP,
    }
