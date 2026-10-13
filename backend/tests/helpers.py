"""Builders compartilhados dos testes do backend.

Centraliza a criação de entidades via HTTP para não duplicar helpers entre
os arquivos `test_*.py`. Todos afirmam o status esperado e devolvem o JSON.
"""

import uuid
from datetime import date, timedelta

TASK_FIELDS = (
    "category_id",
    "title",
    "description",
    "work_context",
    "status",
    "priority",
    "start_date",
    "due_date",
    "due_time",
    "estimated_minutes",
    "client_id",
    "project_id",
)


def unique(prefix="t") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def tomorrow() -> str:
    return str(date.today() + timedelta(days=1))


def category_id(client) -> str:
    r = client.get("/categories")
    assert r.status_code == 200, r.text
    items = r.json()
    assert items, "seed de categorias ausente"
    return items[0]["id"]


def make_task(client, **overrides) -> dict:
    payload = {
        "category_id": category_id(client),
        "title": "Estudar matemática",
        "due_date": tomorrow(),
    }
    payload.update(overrides)
    r = client.post("/tasks", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def full_task_payload(task: dict, **overrides) -> dict:
    """Monta um TaskIn completo a partir de um TaskOut (para o PATCH)."""
    payload = {k: task[k] for k in TASK_FIELDS if k in task}
    payload.update(overrides)
    return payload


def make_client(client, name: str | None = None) -> dict:
    r = client.post("/clients", json={"name": name or unique("cliente")})
    assert r.status_code == 201, r.text
    return r.json()


def make_project(client, name: str | None = None, client_id: str | None = None) -> dict:
    payload = {"name": name or unique("projeto")}
    if client_id is not None:
        payload["client_id"] = client_id
    r = client.post("/projects", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def make_subtask(client, task_id: str, title: str | None = None) -> dict:
    r = client.post(f"/tasks/{task_id}/subtasks", json={"title": title or unique("sub")})
    assert r.status_code == 201, r.text
    return r.json()


def make_reminder(client, task_id: str, **overrides) -> dict:
    from datetime import datetime, timezone

    payload = {
        "title": unique("lembrete"),
        "remind_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        "channel": "push",
        "horizon": "short",
    }
    payload.update(overrides)
    r = client.post(f"/tasks/{task_id}/reminders", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def make_link(client, task_id: str, url: str = "example.com/pagina") -> dict:
    r = client.post(
        f"/tasks/{task_id}/attachments",
        json={"type": "link", "label": unique("link"), "url": url},
    )
    assert r.status_code == 201, r.text
    return r.json()


def make_reward_item(client, title: str | None = None, cost: int = 3) -> dict:
    r = client.post("/rewards/items", json={"title": title or unique("recompensa"), "cost": cost})
    assert r.status_code == 201, r.text
    return r.json()


def balance(client) -> int:
    r = client.get("/leaves/balance")
    assert r.status_code == 200, r.text
    return r.json()["balance"]
