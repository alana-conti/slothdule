"""Laço leve que dispara os lembretes de hábito a cada minuto.

Roda dentro da API (lifespan do FastAPI), só quando o push está configurado
(chaves VAPID) e `PUSH_SCHEDULER_ENABLED` não foi desligado. A reserva em
`habit_reminder_deliveries` evita envio duplicado entre processos.
"""

import asyncio
import logging

from app.config import settings
from app.db import SessionLocal
from app.services.reminders import send_due_habit_reminders

log = logging.getLogger(__name__)

INTERVAL_SECONDS = 60


def run_once() -> int:
    with SessionLocal() as db:
        return send_due_habit_reminders(db)


async def reminder_loop() -> None:
    while True:
        try:
            sent = await asyncio.to_thread(run_once)
            if sent:
                log.info("Lembretes de hábito enviados: %s", sent)
        except Exception:  # noqa: BLE001 - o laço nunca deve morrer
            log.exception("Falha ao processar lembretes de hábito")
        await asyncio.sleep(INTERVAL_SECONDS)


def should_run() -> bool:
    return settings.push_enabled and settings.push_scheduler_enabled
