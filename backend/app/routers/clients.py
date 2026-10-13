from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[schemas.ClientOut])
def list_clients(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Client)
        .filter(models.Client.user_id == user.id)
        .order_by(models.Client.name)
        .all()
    )


@router.post("", response_model=schemas.ClientOut, status_code=201)
def create_client(
    payload: schemas.ClientIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    row = models.Client(user_id=user.id, name=payload.name.strip(), notes=payload.notes)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
