from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    rows = (
        db.query(models.Category)
        .filter((models.Category.user_id == user.id) | (models.Category.user_id.is_(None)))
        .order_by(models.Category.name)
        .all()
    )
    return rows


@router.post("", response_model=schemas.CategoryOut, status_code=201)
def create_category(
    payload: schemas.CategoryIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    row = models.Category(
        user_id=user.id, name=payload.name.strip(), slug=payload.slug.strip(), color=payload.color
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Você já tem uma categoria com esse apelido.")
    db.refresh(row)
    return row
