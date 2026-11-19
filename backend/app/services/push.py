"""Envio de Web Push (pywebpush + VAPID).

`send_to_user` manda a mesma notificação para todos os aparelhos inscritos
da pessoa e apaga inscrições que o serviço de push diz não existirem mais.
"""

import json
import logging
from collections.abc import Callable
from uuid import UUID

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app import models
from app.config import settings

log = logging.getLogger(__name__)

# Assinatura de quem entrega um push: (inscrição, payload JSON). Os testes
# trocam por um falso; em produção é `deliver`.
Sender = Callable[[models.PushSubscription, str], None]


class SubscriptionGone(Exception):
    """O serviço de push respondeu 404/410: a inscrição expirou."""


def deliver(subscription: models.PushSubscription, payload: str) -> None:
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=60 * 60,
            timeout=10,
        )
    except WebPushException as error:
        status = getattr(error.response, "status_code", None)
        if status in (404, 410):
            raise SubscriptionGone() from error
        raise


def send_to_user(
    db: Session, user_id: UUID, message: dict, sender: Sender = deliver
) -> int:
    """Envia `message` a todos os aparelhos da pessoa. Retorna quantos receberam."""
    payload = json.dumps(message, ensure_ascii=False)
    subscriptions = (
        db.query(models.PushSubscription)
        .filter(models.PushSubscription.user_id == user_id)
        .all()
    )
    sent = 0
    for subscription in subscriptions:
        try:
            sender(subscription, payload)
            sent += 1
        except SubscriptionGone:
            db.delete(subscription)
        except Exception:  # noqa: BLE001 - um aparelho com problema não para os outros
            log.exception("Falha ao enviar push para %s", subscription.endpoint[:60])
    db.flush()
    return sent
