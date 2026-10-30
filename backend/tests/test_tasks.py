"""GET/POST /tasks, GET/PATCH/DELETE /tasks/{id}, status, archive, leaves-awarded."""

import uuid
from datetime import date, timedelta

import pytest

from .helpers import (
    balance,
    category_id,
    full_task_payload,
    make_client,
    make_project,
    make_task,
    tomorrow,
    unique,
)

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def test_list_starts_empty_and_includes_created(user_client):
    assert user_client.get("/tasks").json() == []
    task = make_task(user_client, title="Ler capítulo 3")
    titles = [t["title"] for t in user_client.get("/tasks").json()]
    assert titles == ["Ler capítulo 3"]
    assert task["status"] == "todo"
    assert task["user_id"] is not None


def test_create_stores_client_and_project(user_client):
    client = make_client(user_client)
    project = make_project(user_client, client_id=client["id"])
    task = make_task(user_client, client_id=client["id"], project_id=project["id"])
    assert task["client_id"] == client["id"]
    assert task["project_id"] == project["id"]


def test_create_with_status_done_awards_immediately(user_client):
    task = make_task(user_client, priority="medium", status="done")
    assert task["status"] == "done"
    assert task["completed_at"] is not None
    # medium=3 + bônus antecipada=2
    assert balance(user_client) == 5


def test_create_validation(user_client):
    cat = category_id(user_client)
    base = {"category_id": cat, "title": "ok", "due_date": tomorrow()}

    # Sem prazo → 400 (regra do handler, não do schema).
    r = user_client.post("/tasks", json={"category_id": cat, "title": "sem prazo"})
    assert r.status_code == 400

    # Título só com espaços → 400.
    r = user_client.post("/tasks", json={**base, "title": "   "})
    assert r.status_code == 400

    # Título vazio → 422 do schema.
    r = user_client.post("/tasks", json={**base, "title": ""})
    assert r.status_code == 422

    # Categoria inexistente → 400.
    r = user_client.post("/tasks", json={**base, "category_id": str(uuid.uuid4())})
    assert r.status_code == 400

    # Status inválido → 422.
    r = user_client.post("/tasks", json={**base, "status": "flying"})
    assert r.status_code == 422


def test_create_rejects_other_users_relations(user_client, second_user_client):
    other_cat = second_user_client.post(
        "/categories", json={"name": "Alheia", "slug": unique("slug")}
    ).json()
    other_client = make_client(second_user_client)
    other_project = make_project(second_user_client)

    base = {"title": "x", "due_date": tomorrow()}
    assert user_client.post("/tasks", json={**base, "category_id": other_cat["id"]}).status_code == 400
    assert (
        user_client.post(
            "/tasks",
            json={**base, "category_id": category_id(user_client), "client_id": other_client["id"]},
        ).status_code
        == 400
    )
    assert (
        user_client.post(
            "/tasks",
            json={**base, "category_id": category_id(user_client), "project_id": other_project["id"]},
        ).status_code
        == 400
    )


def test_get_unknown_and_malformed_id(user_client):
    assert user_client.get(f"/tasks/{uuid.uuid4()}").status_code == 404
    assert user_client.get("/tasks/not-a-uuid").status_code == 422


def test_patch_updates_all_fields(user_client):
    task = make_task(user_client, title="Antes")
    new_cat = user_client.post(
        "/categories", json={"name": "Nova", "slug": unique("slug"), "color": "#fff"}
    ).json()
    payload = full_task_payload(
        task,
        category_id=new_cat["id"],
        title="Depois",
        description="detalhes",
        priority="critical",
        due_date=str(date.today() + timedelta(days=5)),
        estimated_minutes=90,
    )
    r = user_client.patch(f"/tasks/{task['id']}", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert (body["title"], body["description"], body["priority"]) == ("Depois", "detalhes", "critical")
    assert body["category_id"] == new_cat["id"]
    assert body["estimated_minutes"] == 90


def test_patch_to_done_awards_leaves(user_client):
    task = make_task(user_client, priority="low")
    r = user_client.patch(f"/tasks/{task['id']}", json=full_task_payload(task, status="done"))
    assert r.status_code == 200, r.text
    assert r.json()["completed_at"] is not None
    # low=1 + antecipada=2
    assert balance(user_client) == 3


def test_patch_done_back_to_todo_clears_completed_at(user_client):
    task = make_task(user_client, priority="low", status="done")
    before = balance(user_client)
    assert before > 0
    r = user_client.patch(f"/tasks/{task['id']}", json=full_task_payload(task, status="todo"))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "todo"
    assert r.json()["completed_at"] is None
    # Transações já lançadas não são desfeitas.
    assert balance(user_client) == before


def test_status_transitions(user_client):
    task = make_task(user_client, priority="low")
    task_id = task["id"]

    r = user_client.post(f"/tasks/{task_id}/status", json={"status": "in_progress"})
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"
    assert r.json()["completed_at"] is None

    r = user_client.post(f"/tasks/{task_id}/status", json={"status": "done"})
    assert r.json()["completed_at"] is not None
    assert balance(user_client) == 3

    # Reconcluir mantém completed_at e não premia de novo.
    completed_at = r.json()["completed_at"]
    r = user_client.post(f"/tasks/{task_id}/status", json={"status": "done"})
    assert r.json()["completed_at"] == completed_at
    assert balance(user_client) == 3

    # Voltar para todo limpa completed_at.
    r = user_client.post(f"/tasks/{task_id}/status", json={"status": "todo"})
    assert r.json()["completed_at"] is None


def test_pause_reason_is_kept_while_waiting_and_cleared_after(user_client):
    task = make_task(user_client)
    task_id = task["id"]
    assert task["pause_reason"] is None

    r = user_client.post(
        f"/tasks/{task_id}/status",
        json={"status": "waiting", "pause_reason": "  esperando o retorno da Ana  "},
    )
    assert r.status_code == 200, r.text
    assert r.json()["pause_reason"] == "esperando o retorno da Ana"

    # Reenviar o status sem o campo (ou editar via PATCH sem ele) preserva o recado.
    r = user_client.post(f"/tasks/{task_id}/status", json={"status": "waiting"})
    assert r.json()["pause_reason"] == "esperando o retorno da Ana"
    r = user_client.patch(
        f"/tasks/{task_id}",
        json=full_task_payload(r.json(), title="Outro título"),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "waiting"
    assert r.json()["pause_reason"] == "esperando o retorno da Ana"

    # Retomar limpa o recado.
    r = user_client.post(f"/tasks/{task_id}/status", json={"status": "in_progress"})
    assert r.json()["pause_reason"] is None


def test_pause_reason_blank_becomes_null_and_other_statuses_ignore_it(user_client):
    task = make_task(user_client)
    task_id = task["id"]

    r = user_client.post(
        f"/tasks/{task_id}/status", json={"status": "waiting", "pause_reason": "   "}
    )
    assert r.json()["pause_reason"] is None

    r = user_client.post(
        f"/tasks/{task_id}/status",
        json={"status": "in_progress", "pause_reason": "não deveria ficar"},
    )
    assert r.json()["pause_reason"] is None

    # Entrar em waiting por PATCH sem o campo começa sem recado.
    r = user_client.patch(
        f"/tasks/{task_id}", json=full_task_payload(r.json(), status="waiting")
    )
    assert r.json()["pause_reason"] is None

    # PATCH com o campo define o recado.
    r = user_client.patch(
        f"/tasks/{task_id}",
        json=full_task_payload(r.json(), status="waiting", pause_reason="aguardando o cliente"),
    )
    assert r.json()["pause_reason"] == "aguardando o cliente"


def test_pause_reason_rejects_too_long(user_client):
    task = make_task(user_client)
    r = user_client.post(
        f"/tasks/{task['id']}/status",
        json={"status": "waiting", "pause_reason": "x" * 501},
    )
    assert r.status_code == 422


def test_status_rejects_invalid(user_client):
    task = make_task(user_client)
    r = user_client.post(f"/tasks/{task['id']}/status", json={"status": "flying"})
    assert r.status_code == 422


def test_archive(user_client):
    task = make_task(user_client)
    r = user_client.post(f"/tasks/{task['id']}/archive")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "archived"


def test_delete_removes_task(user_client):
    task = make_task(user_client)
    r = user_client.delete(f"/tasks/{task['id']}")
    assert r.status_code == 204, r.text
    assert user_client.get(f"/tasks/{task['id']}").status_code == 404
    assert user_client.get("/tasks").json() == []


def test_leaves_awarded_zero_for_pending_task(user_client):
    task = make_task(user_client)
    r = user_client.get(f"/tasks/{task['id']}/leaves-awarded")
    assert r.status_code == 200, r.text
    assert r.json() == {"leavesAwarded": 0}


@pytest.mark.parametrize(
    "method,path",
    [
        ("POST", "/tasks"),
        ("GET", "/tasks"),
        ("GET", f"/tasks/{NIL_UUID}"),
        ("PATCH", f"/tasks/{NIL_UUID}"),
        ("DELETE", f"/tasks/{NIL_UUID}"),
        ("POST", f"/tasks/{NIL_UUID}/status"),
        ("POST", f"/tasks/{NIL_UUID}/archive"),
        ("GET", f"/tasks/{NIL_UUID}/leaves-awarded"),
    ],
)
def test_tasks_routes_require_auth(client, method, path):
    payload = {} if method != "POST" or path != "/tasks" else {"title": "x"}
    r = client.request(method, path, json=payload)
    assert r.status_code == 401, f"{method} {path}"
