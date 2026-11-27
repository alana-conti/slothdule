"""Plano do dia: /day-plan (docs/02-user-flows.md, fluxo 14).

A tarefa guarda o último dia em que foi decidida (`plan_date`) e a posição no
plano daquele dia (`plan_position`; vazia = recusada). O "hoje" vem do app, que
vira o dia às 4h.
"""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_owned_task

router = APIRouter(prefix="/day-plan", tags=["day-plan"])


@router.put("/{plan_date}", response_model=list[schemas.TaskOut])
def set_day_plan(
    plan_date: date,
    payload: schemas.DayPlanIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Põe estas tarefas no plano do dia, nesta ordem.

    Não tira ninguém: quem está em andamento fica fora da lista arrastável e
    não pode sair do plano por isso. Tirar é com `/tasks/{id}` (in_plan=false).
    """
    task_ids = payload.task_ids
    if len(set(task_ids)) != len(task_ids):
        raise HTTPException(status_code=400, detail="Tarefa repetida no plano.")
    tasks = (
        db.query(models.Task)
        .filter(models.Task.user_id == user.id, models.Task.id.in_(task_ids))
        .all()
    )
    if len(tasks) != len(task_ids):
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")

    by_id = {task.id: task for task in tasks}
    for position, task_id in enumerate(task_ids):
        by_id[task_id].plan_date = plan_date
        by_id[task_id].plan_position = position
    db.commit()
    return [by_id[task_id] for task_id in task_ids]


@router.put("/{plan_date}/tasks/{task_id}", response_model=schemas.TaskOut)
def decide_task(
    plan_date: date,
    task_id: UUID,
    payload: schemas.PlanDecisionIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Põe a tarefa no fim do plano do dia, ou a recusa ("Hoje não")."""
    task = require_owned_task(db, user.id, task_id)
    already_in = task.plan_date == plan_date and task.plan_position is not None
    if payload.in_plan and not already_in:
        last = (
            db.query(func.max(models.Task.plan_position))
            .filter(models.Task.user_id == user.id, models.Task.plan_date == plan_date)
            .scalar()
        )
        task.plan_position = 0 if last is None else last + 1
    elif not payload.in_plan:
        task.plan_position = None
    task.plan_date = plan_date
    db.commit()
    db.refresh(task)
    return task
