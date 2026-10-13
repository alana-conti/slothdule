from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_owned_task

router = APIRouter(prefix="/tasks/{task_id}/reminders", tags=["reminders"])


@router.get("", response_model=list[schemas.ReminderOut])
def list_reminders(
    task_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    require_owned_task(db, user.id, task_id)
    return (
        db.query(models.Reminder)
        .filter(models.Reminder.task_id == task_id, models.Reminder.user_id == user.id)
        .order_by(models.Reminder.remind_at.asc())
        .all()
    )


@router.post("", response_model=schemas.ReminderOut, status_code=201)
def create_reminder(
    task_id: UUID,
    payload: schemas.ReminderIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    require_owned_task(db, user.id, task_id)
    row = models.Reminder(
        user_id=user.id,
        task_id=task_id,
        title=(payload.title or "Lembrete de tarefa").strip(),
        remind_at=payload.remind_at,
        channel=payload.channel,
        horizon=payload.horizon,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


item_router = APIRouter(prefix="/reminders", tags=["reminders"])


def _owned_reminder(db: Session, user_id, reminder_id: UUID) -> models.Reminder:
    row = (
        db.query(models.Reminder)
        .filter(models.Reminder.id == reminder_id, models.Reminder.user_id == user_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Lembrete não encontrado.")
    return row


@item_router.patch("/{reminder_id}", response_model=schemas.ReminderOut)
def update_reminder(
    reminder_id: UUID,
    payload: schemas.ReminderIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    row = _owned_reminder(db, user.id, reminder_id)
    row.title = (payload.title or "Lembrete de tarefa").strip()
    row.remind_at = payload.remind_at
    row.channel = payload.channel
    row.horizon = payload.horizon
    db.commit()
    db.refresh(row)
    return row


@item_router.delete("/{reminder_id}", status_code=204)
def delete_reminder(
    reminder_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    row = _owned_reminder(db, user.id, reminder_id)
    db.delete(row)
    db.commit()
    return None
