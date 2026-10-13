import uuid

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.db import get_session
from app.security import ACCESS_COOKIE, decode_access_token

DbSession = Depends(get_session)


def get_db(session=DbSession):
    return session


def get_current_user(
    access: str | None = Cookie(default=None, alias=ACCESS_COOKIE),
    db: Session = Depends(get_session),
) -> models.User:
    if not access:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")
    user_id = decode_access_token(access)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada. Entre novamente.")
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida.")
    user = db.get(models.User, uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada. Entre novamente.")
    return user


def require_owned_task(db: Session, user_id: uuid.UUID, task_id: uuid.UUID) -> models.Task:
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.user_id == user_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    return task
