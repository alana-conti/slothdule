"""Lembretes de hábito no horário (docs/11-rotina-e-habitos.md, seção 3.2).

Um hábito com `remind` e `time_of_day` recebe um push no dia agendado, a
partir do horário, se ainda não tiver cuidado nem folga naquele dia. A tabela
`habit_reminder_deliveries` garante no máximo um lembrete por hábito por dia,
mesmo com mais de um processo da API rodando o agendador.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app import models
from app.services import habits as rules
from app.services.push import Sender, deliver, send_to_user

# Depois disso o lembrete perde o sentido (ex.: API fora do ar): não envia.
REMINDER_WINDOW = timedelta(minutes=30)


def reminder_message(habit: models.Habit) -> dict:
    if habit.kind == models.HabitKind.avoid:
        body = "Lembrete gentil: hoje é dia de cuidar disso. Se conseguir, marque no Slothdule."
    else:
        body = "Uma coisa de cada vez. Fez em outro horário? Conta igual."
    return {
        "title": f"Hora de cuidar: {habit.title} 🦥",
        "body": body,
        "tag": f"habit-{habit.id}",
        "data": {"url": "/routine"},
    }


def due_habits(db: Session, now: datetime) -> list[models.Habit]:
    """Hábitos cujo lembrete de hoje está na janela e ainda não foi enviado."""
    local = now.astimezone(rules.SAO_PAULO)
    today = local.date()
    candidates = (
        db.query(models.Habit)
        .filter(
            models.Habit.remind.is_(True),
            models.Habit.time_of_day.isnot(None),
            models.Habit.start_date <= today,
        )
        .all()
    )
    due = []
    for habit in candidates:
        if not rules.is_scheduled(today, habit.weekdays):
            continue
        at = datetime.combine(today, habit.time_of_day, tzinfo=rules.SAO_PAULO)
        if not (at <= local < at + REMINDER_WINDOW):
            continue
        handled = (
            db.query(models.HabitCheckin.id)
            .filter(models.HabitCheckin.habit_id == habit.id, models.HabitCheckin.day == today)
            .first()
        )
        if handled:
            continue
        due.append(habit)
    return due


def send_due_habit_reminders(
    db: Session, now: datetime | None = None, sender: Sender = deliver
) -> int:
    """Envia os lembretes devidos agora. Retorna quantos hábitos foram lembrados."""
    now = now or datetime.now(timezone.utc)
    today = now.astimezone(rules.SAO_PAULO).date()
    reminded = 0
    for habit in due_habits(db, now):
        claimed = db.execute(
            pg_insert(models.HabitReminderDelivery)
            .values(habit_id=habit.id, day=today)
            .on_conflict_do_nothing(constraint="habit_reminder_deliveries_habit_day_unique")
            .returning(models.HabitReminderDelivery.id)
        ).first()
        # Outro processo já reservou este lembrete: segue sem enviar de novo.
        if claimed is None:
            continue
        send_to_user(db, habit.user_id, reminder_message(habit), sender)
        db.commit()
        reminded += 1
    return reminded
