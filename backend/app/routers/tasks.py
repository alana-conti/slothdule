from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_owned_task
from app.services.leaves import award_completion_leaves, user_balance

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _validate_relations(db: Session, user_id, payload: schemas.TaskIn) -> None:
    cat = (
        db.query(models.Category)
        .filter(
            models.Category.id == payload.category_id,
            ((models.Category.user_id == user_id) | (models.Category.user_id.is_(None))),
        )
        .first()
    )
    if not cat:
        raise HTTPException(status_code=400, detail="Categoria inválida.")
    if payload.client_id is not None:
        ok = (
            db.query(models.Client)
            .filter(models.Client.id == payload.client_id, models.Client.user_id == user_id)
            .first()
        )
        if not ok:
            raise HTTPException(status_code=400, detail="Cliente inválido.")
    if payload.project_id is not None:
        ok = (
            db.query(models.Project)
            .filter(models.Project.id == payload.project_id, models.Project.user_id == user_id)
            .first()
        )
        if not ok:
            raise HTTPException(status_code=400, detail="Projeto inválido.")


@router.get("", response_model=list[schemas.TaskOut])
def list_tasks(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Task)
        .filter(models.Task.user_id == user.id)
        .order_by(models.Task.due_date.asc(), models.Task.created_at.desc())
        .all()
    )


@router.post("", response_model=schemas.TaskOut, status_code=201)
def create_task(
    payload: schemas.TaskIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not payload.title.strip() or payload.due_date is None:
        raise HTTPException(status_code=400, detail="Preencha título, categoria e prazo.")
    _validate_relations(db, user.id, payload)
    task = models.Task(
        user_id=user.id,
        category_id=payload.category_id,
        client_id=payload.client_id,
        project_id=payload.project_id,
        title=payload.title.strip(),
        description=payload.description,
        work_context=payload.work_context,
        status=payload.status,
        priority=payload.priority,
        start_date=payload.start_date,
        due_date=payload.due_date,
        due_time=payload.due_time,
        estimated_minutes=payload.estimated_minutes,
        completed_at=datetime.now(timezone.utc) if payload.status == models.TaskStatus.done else None,
    )
    db.add(task)
    db.flush()
    if task.status == models.TaskStatus.done:
        award_completion_leaves(db, task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return require_owned_task(db, user.id, task_id)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: UUID,
    payload: schemas.TaskIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = require_owned_task(db, user.id, task_id)
    _validate_relations(db, user.id, payload)
    was_done_awarded = task.leaf_awarded_at is not None
    keep_completed_at = (
        payload.status == models.TaskStatus.done
        and task.status == models.TaskStatus.done
        and task.completed_at is not None
    )
    task.category_id = payload.category_id
    task.client_id = payload.client_id
    task.project_id = payload.project_id
    task.title = payload.title.strip()
    task.description = payload.description
    task.work_context = payload.work_context
    task.status = payload.status
    task.priority = payload.priority
    task.start_date = payload.start_date
    task.due_date = payload.due_date
    task.due_time = payload.due_time
    task.estimated_minutes = payload.estimated_minutes
    task.completed_at = (
        task.completed_at
        if keep_completed_at
        else (datetime.now(timezone.utc) if payload.status == models.TaskStatus.done else None)
    )
    leaves = 0
    if payload.status == models.TaskStatus.done and not was_done_awarded:
        leaves = award_completion_leaves(db, task)
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/status", response_model=schemas.TaskOut)
def update_task_status(
    task_id: UUID,
    payload: schemas.TaskStatusIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = require_owned_task(db, user.id, task_id)
    was_done_awarded = task.leaf_awarded_at is not None
    keep_completed_at = (
        payload.status == models.TaskStatus.done
        and task.status == models.TaskStatus.done
        and task.completed_at is not None
    )
    task.status = payload.status
    if payload.status == models.TaskStatus.done and not keep_completed_at:
        task.completed_at = datetime.now(timezone.utc)
    elif payload.status != models.TaskStatus.done:
        task.completed_at = None
    if payload.status == models.TaskStatus.done and not was_done_awarded:
        award_completion_leaves(db, task)
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/archive", response_model=schemas.TaskOut)
def archive_task(task_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    task = require_owned_task(db, user.id, task_id)
    task.status = models.TaskStatus.archived
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    task = require_owned_task(db, user.id, task_id)
    db.delete(task)
    db.commit()
    return None


@router.get("/{task_id}/leaves-awarded")
def leaves_awarded(task_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_owned_task(db, user.id, task_id)
    total = (
        db.query(models.LeafTransaction)
        .filter(
            models.LeafTransaction.user_id == user.id,
            models.LeafTransaction.task_id == task_id,
        )
        .all()
    )
    return {"leavesAwarded": sum(t.amount for t in total)}
