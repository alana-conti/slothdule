"""Laço leve que dispara os lembretes (hábitos e tarefas) a cada minuto.

Roda dentro da API (lifespan do FastAPI), só quando o push está configurado
(chaves VAPID) e `PUSH_SCHEDULER_ENABLED` não foi desligado. A reserva em
`habit_reminder_deliveries` (hábitos) e em `reminders.is_sent` (tarefas)
evita envio duplicado entre processos.
"""

import asyncio
import logging
from collections.abc import Callable

from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.services.reminders import send_due_habit_reminders
from app.services.task_reminders import send_due_task_reminders

log = logging.getLogger(__name__)

INTERVAL_SECONDS = 60


def _run(job: Callable[[Session], int], label: str) -> int:
    # Cada tipo de lembrete com sua sessão: uma falha num não trava o outro.
    try:
        with SessionLocal() as db:
            return job(db)
    except Exception:  # noqa: BLE001 - o laço nunca deve morrer
        log.exception("Falha ao processar lembretes de %s", label)
        return 0


def run_once() -> tuple[int, int]:
    return (
        _run(send_due_habit_reminders, "hábito"),
        _run(send_due_task_reminders, "tarefa"),
    )


async def reminder_loop() -> None:
    while True:
        try:
            habits, tasks = await asyncio.to_thread(run_once)
            if habits or tasks:
                log.info("Lembretes enviados: %s de hábito, %s de tarefa", habits, tasks)
        except Exception:  # noqa: BLE001 - o laço nunca deve morrer
            log.exception("Falha ao processar lembretes")
        await asyncio.sleep(INTERVAL_SECONDS)


def should_run() -> bool:
    return settings.push_enabled and settings.push_scheduler_enabled
