"""Regras de Folhinhas — espelha `src/lib/rewards/index.ts` + trigger 0004.

Base por prioridade: low=1, medium=3, high=5, critical=8.
Bônus +2 se concluída antes do due_date; +2 se checklist existe e está 100% feito.
Idempotente: `task_completion` tem índice único (user, task, type); bônus só
acompanham a primeira conclusão (guard via `leaf_awarded_at` no chamador).
"""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app import models

BASE_POINTS = {"low": 1, "medium": 3, "high": 5, "critical": 8}
PRIORITY_LABELS = {"low": "baixa", "medium": "média", "high": "alta", "critical": "crítica"}
SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def award_completion_leaves(db: Session, task: models.Task) -> int:
    """Insere transações de conclusão para `task`. Retorna total de folhas. Chamador deve commitar."""
    if task.status != models.TaskStatus.done or task.leaf_awarded_at is not None:
        return 0

    priority = task.priority.value if isinstance(task.priority, models.TaskPriority) else str(task.priority)
    base = BASE_POINTS.get(priority, 0)

    stmt = (
        pg_insert(models.LeafTransaction)
        .values(
            user_id=task.user_id,
            task_id=task.id,
            reward_redemption_id=None,
            type=models.LeafTransactionType.task_completion,
            amount=base,
            reason=f"Conclusão de tarefa de prioridade {PRIORITY_LABELS.get(priority, priority)}",
        )
        .on_conflict_do_nothing(
            index_elements=["user_id", "task_id", "type"],
            index_where=text("task_id IS NOT NULL AND type = 'task_completion'"),
        )
        .returning(models.LeafTransaction.id)
    )
    base_row = db.execute(stmt).first()
    if base_row is None:
        return 0

    total = base

    completed_date = (
        (task.completed_at or datetime.now(timezone.utc)).astimezone(SAO_PAULO).date()
    )
    if task.due_date is not None and completed_date < task.due_date:
        db.add(
            models.LeafTransaction(
                user_id=task.user_id,
                task_id=task.id,
                type=models.LeafTransactionType.early_completion_bonus,
                amount=2,
                reason="Bônus: concluída antes do prazo",
            )
        )
        total += 2

    subtasks = db.query(models.Subtask.is_done).filter(models.Subtask.task_id == task.id).all()
    if subtasks and all(s[0] for s in subtasks):
        db.add(
            models.LeafTransaction(
                user_id=task.user_id,
                task_id=task.id,
                type=models.LeafTransactionType.checklist_bonus,
                amount=2,
                reason="Bônus: checklist completo finalizado",
            )
        )
        total += 2

    task.leaf_awarded_at = datetime.now(timezone.utc)
    db.flush()
    return total


def user_balance(db: Session, user_id) -> int:
    total = (
        db.query(func.coalesce(func.sum(models.LeafTransaction.amount), 0))
        .filter(models.LeafTransaction.user_id == user_id)
        .scalar()
    )
    return int(total or 0)
