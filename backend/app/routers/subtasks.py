from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_owned_task

router = APIRouter(prefix="/tasks/{task_id}/subtasks", tags=["subtasks"])


@router.get("", response_model=list[schemas.SubtaskOut])
def list_subtasks(
    task_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    require_owned_task(db, user.id, task_id)
    return (
        db.query(models.Subtask)
        .filter(models.Subtask.task_id == task_id, models.Subtask.user_id == user.id)
        .order_by(models.Subtask.position.asc(), models.Subtask.created_at.asc())
        .all()
    )


@router.post("", response_model=schemas.SubtaskOut, status_code=201)
def create_subtask(
    task_id: UUID,
    payload: schemas.SubtaskIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    require_owned_task(db, user.id, task_id)
    last = (
        db.query(models.Subtask)
        .filter(models.Subtask.task_id == task_id, models.Subtask.user_id == user.id)
        .order_by(models.Subtask.position.desc())
        .first()
    )
    row = models.Subtask(
        user_id=user.id,
        task_id=task_id,
        title=payload.title.strip(),
        position=(last.position + 1) if last else 0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


sub_router = APIRouter(prefix="/subtasks", tags=["subtasks"])


@sub_router.patch("/{subtask_id}/title", response_model=schemas.SubtaskOut)
def update_subtask_title(
    subtask_id: UUID,
    payload: schemas.SubtaskTitleIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.Subtask)
        .filter(models.Subtask.id == subtask_id, models.Subtask.user_id == user.id)
        .first()
    )
    if not row:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Subtarefa não encontrada.")
    row.title = payload.title.strip()
    db.commit()
    db.refresh(row)
    return row


@sub_router.patch("/{subtask_id}/done", response_model=schemas.SubtaskOut)
def set_subtask_done(
    subtask_id: UUID,
    payload: schemas.SubtaskDoneIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.Subtask)
        .filter(models.Subtask.id == subtask_id, models.Subtask.user_id == user.id)
        .first()
    )
    if not row:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Subtarefa não encontrada.")
    row.is_done = payload.is_done
    db.commit()
    db.refresh(row)
    return row


@sub_router.delete("/{subtask_id}", status_code=204)
def delete_subtask(
    subtask_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    row = (
        db.query(models.Subtask)
        .filter(models.Subtask.id == subtask_id, models.Subtask.user_id == user.id)
        .first()
    )
    if not row:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Subtarefa não encontrada.")
    db.delete(row)
    db.commit()
    return None
