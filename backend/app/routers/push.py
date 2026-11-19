"""Inscrições de Web Push (lembretes de hábito)."""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.deps import get_current_user, get_db

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/public-key", response_model=schemas.PushPublicKeyOut)
def public_key(user: models.User = Depends(get_current_user)):
    # Vazio quando o push não está configurado: o app só não oferece a inscrição.
    return {"public_key": settings.vapid_public_key if settings.push_enabled else None}


@router.post("/subscriptions", status_code=204)
def save_subscription(
    payload: schemas.PushSubscriptionIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not settings.push_enabled:
        raise HTTPException(status_code=503, detail="Os lembretes por push ainda não estão configurados.")
    row = (
        db.query(models.PushSubscription)
        .filter(models.PushSubscription.endpoint == payload.endpoint)
        .first()
    )
    if row is None:
        row = models.PushSubscription(endpoint=payload.endpoint, user_id=user.id)
        db.add(row)
    # Mesmo aparelho, outra conta: a inscrição passa a ser de quem está logado.
    row.user_id = user.id
    row.p256dh = payload.keys.p256dh
    row.auth = payload.keys.auth
    db.commit()
    return Response(status_code=204)


@router.post("/subscriptions/remove", status_code=204)
def remove_subscription(
    payload: schemas.PushSubscriptionRemoveIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    db.query(models.PushSubscription).filter(
        models.PushSubscription.endpoint == payload.endpoint,
        models.PushSubscription.user_id == user.id,
    ).delete()
    db.commit()
    return Response(status_code=204)
