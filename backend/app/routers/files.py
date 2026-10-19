"""Upload e download de anexos em disco local (substitui Supabase Storage).

- POST /tasks/{task_id}/attachments/upload (multipart `file`, `label?`)
- GET /files/{user_id}/{task_id}/{filename} (autenticado, só o dono)
"""

import uuid
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.deps import get_current_user, get_db, require_owned_task

ALLOWED_MIME_TYPES = {
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
}

EXTENSION_BY_MIME = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/csv": "csv",
}

upload_router = APIRouter(tags=["files"])
files_router = APIRouter(tags=["files"])


def _attachments_base() -> Path:
    base = Path(settings.data_dir) / "attachments"
    base.mkdir(parents=True, exist_ok=True)
    return base


def _kind_from_mime(mime: str) -> models.AttachmentType:
    if mime.startswith("audio/"):
        return models.AttachmentType.audio
    return models.AttachmentType.file


@upload_router.post("/tasks/{task_id}/attachments/upload", response_model=schemas.AttachmentOut, status_code=201)
async def upload_attachment(
    task_id: UUID,
    file: UploadFile = File(...),
    label: str | None = Form(default=None),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    require_owned_task(db, user.id, task_id)
    mime = (file.content_type or "application/octet-stream").split(";")[0].strip()
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Formato não suportado. Envie áudio, PDF, Word, Excel, PowerPoint, TXT ou CSV.",
        )
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"O arquivo deve ter no máximo {settings.max_upload_mb} MB.",
        )
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    ext = EXTENSION_BY_MIME.get(mime, "file")
    filename = f"{uuid.uuid4()}.{ext}"
    directory = _attachments_base() / str(user.id) / str(task_id)
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / filename
    path.write_bytes(content)

    row = models.Attachment(
        user_id=user.id,
        task_id=task_id,
        type=_kind_from_mime(mime),
        label=(label or file.filename or "Documento anexado").strip(),
        url=f"/files/{user.id}/{task_id}/{filename}",
        mime_type=mime,
        size_bytes=len(content),
    )
    db.add(row)
    try:
        db.commit()
    except Exception:
        db.rollback()
        try:
            path.unlink()
        except OSError:
            pass
        raise HTTPException(status_code=500, detail="Não foi possível registrar o anexo.")
    db.refresh(row)
    return row


@files_router.get("/files/{user_id}/{task_id}/{filename}")
def serve_file(
    user_id: UUID,
    task_id: UUID,
    filename: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if user_id != user.id:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    require_owned_task(db, user.id, task_id)
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Arquivo inválido.")
    path = _attachments_base() / str(user_id) / str(task_id) / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    row = (
        db.query(models.Attachment)
        .filter(
            models.Attachment.user_id == user.id,
            models.Attachment.task_id == task_id,
            models.Attachment.url == f"/files/{user_id}/{task_id}/{filename}",
        )
        .first()
    )
    media_type = row.mime_type if row and row.mime_type else "application/octet-stream"
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "3600"})
