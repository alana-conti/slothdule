from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Project)
        .filter(models.Project.user_id == user.id)
        .order_by(models.Project.name)
        .all()
    )


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(
    payload: schemas.ProjectIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if payload.client_id is not None:
        client = (
            db.query(models.Client)
            .filter(models.Client.id == payload.client_id, models.Client.user_id == user.id)
            .first()
        )
        if not client:
            raise HTTPException(status_code=400, detail="Cliente inválido.")
    row = models.Project(
        user_id=user.id,
        client_id=payload.client_id,
        name=payload.name.strip(),
        type=payload.type,
        status=payload.status or "active",
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
