from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.deps import get_current_user, get_db, require_owned_task

router = APIRouter(prefix="/tasks/{task_id}/attachments", tags=["attachments"])


@router.get("", response_model=list[schemas.AttachmentOut])
def list_attachments(
    task_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    require_owned_task(db, user.id, task_id)
    return (
        db.query(models.Attachment)
        .filter(models.Attachment.task_id == task_id, models.Attachment.user_id == user.id)
        .order_by(models.Attachment.created_at.asc())
        .all()
    )


@router.post("", response_model=schemas.AttachmentOut, status_code=201)
def create_attachment(
    task_id: UUID,
    payload: schemas.AttachmentIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    require_owned_task(db, user.id, task_id)
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Digite o link do anexo.")
    if not url.lower().startswith(("http://", "https://")):
        url = "https://" + url
    row = models.Attachment(
        user_id=user.id,
        task_id=task_id,
        type=payload.type,
        label=payload.label,
        url=url,
        mime_type=payload.mime_type,
        size_bytes=payload.size_bytes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


item_router = APIRouter(prefix="/attachments", tags=["attachments"])


def _owned_attachment(db: Session, user_id, attachment_id: UUID) -> models.Attachment:
    row = (
        db.query(models.Attachment)
        .filter(models.Attachment.id == attachment_id, models.Attachment.user_id == user_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Anexo não encontrado.")
    return row


class AttachmentUpdateIn(BaseModel):
    label: str | None = None
    url: str


@item_router.patch("/{attachment_id}", response_model=schemas.AttachmentOut)
def update_attachment(
    attachment_id: UUID,
    payload: AttachmentUpdateIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    row = _owned_attachment(db, user.id, attachment_id)
    if row.type != models.AttachmentType.link:
        raise HTTPException(status_code=400, detail="Apenas links podem ser editados por aqui.")
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Digite o link do anexo.")
    if not url.lower().startswith(("http://", "https://")):
        url = "https://" + url
    try:
        from urllib.parse import urlparse as _urlparse

        if not _urlparse(url).netloc:
            raise ValueError
    except ValueError:
        raise HTTPException(status_code=400, detail="O link fornecido não é válido.")
    row.label = payload.label
    row.url = url
    db.commit()
    db.refresh(row)
    return row


@item_router.delete("/{attachment_id}", status_code=204)
def delete_attachment(
    attachment_id: UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    row = _owned_attachment(db, user.id, attachment_id)
    # Remove arquivo local se a URL apontar para /files/ (upload via backend)
    if "/files/" in (row.url or ""):
        try:
            parts = row.url.split("/files/", 1)[1].split("?")[0]
            candidate = Path(settings.data_dir) / "attachments" / parts
            if candidate.is_file():
                candidate.unlink()
        except OSError:
            pass
    db.delete(row)
    db.commit()
    return None
