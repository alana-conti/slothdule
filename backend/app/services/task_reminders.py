"""Lembretes de tarefa por Web Push.

Um lembrete com `channel = push` é enviado quando `remind_at` chega, dentro
de uma janela curta (para não disparar lembretes velhos depois de a API ficar
fora do ar). Tarefas concluídas ou arquivadas não são lembradas.

Para nunca enviar duas vezes, mesmo com mais de um processo da API rodando o
agendador, o lembrete é reservado com um UPDATE atômico em `is_sent` antes do
envio: só quem virou o `false` para `true` envia.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlalchemy.orm import Session

from app import models
from app.services.push import Sender, deliver, send_to_user

# Depois disso o lembrete perde o sentido (ex.: API fora do ar): não envia.
REMINDER_WINDOW = timedelta(minutes=30)

DEFAULT_TITLE = "Lembrete de tarefa"

CLOSED_STATUSES = (models.TaskStatus.done, models.TaskStatus.archived)


def reminder_message(reminder: models.Reminder, task: models.Task) -> dict:
    note = (reminder.title or "").strip()
    if note and note != DEFAULT_TITLE:
        body = note
    else:
        body = "Sem pressa: quando der, dá uma olhadinha nela. Um passo de cada vez."
    return {
        "title": f"Lembrete: {task.title} 🦥",
        "body": body,
        "tag": f"task-reminder-{reminder.id}",
        "data": {"url": f"/tasks/{task.id}"},
    }


def due_task_reminders(
    db: Session, now: datetime
) -> list[tuple[models.Reminder, models.Task]]:
    """Lembretes de push na janela, ainda não enviados, de tarefas em aberto."""
    return (
        db.query(models.Reminder, models.Task)
        .join(
            models.Task,
            (models.Task.id == models.Reminder.task_id)
            & (models.Task.user_id == models.Reminder.user_id),
        )
        .filter(
            models.Reminder.channel == models.ReminderChannel.push,
            models.Reminder.is_sent.is_(False),
            models.Reminder.remind_at <= now,
            models.Reminder.remind_at > now - REMINDER_WINDOW,
            models.Task.status.notin_(CLOSED_STATUSES),
        )
        .order_by(models.Reminder.remind_at.asc())
        .all()
    )


def send_due_task_reminders(
    db: Session, now: datetime | None = None, sender: Sender = deliver
) -> int:
    """Envia os lembretes de tarefa devidos agora. Retorna quantos foram enviados."""
    now = now or datetime.now(timezone.utc)
    reminded = 0
    for reminder, task in due_task_reminders(db, now):
        claimed = db.execute(
            update(models.Reminder)
            .where(models.Reminder.id == reminder.id, models.Reminder.is_sent.is_(False))
            .values(is_sent=True)
            .returning(models.Reminder.id)
        ).first()
        # Outro processo já reservou este lembrete: segue sem enviar de novo.
        if claimed is None:
            continue
        send_to_user(db, reminder.user_id, reminder_message(reminder, task), sender)
        db.commit()
        reminded += 1
    return reminded
