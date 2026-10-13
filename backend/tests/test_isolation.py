"""Isolamento por usuário — prova cruzada de todos os routers.

Substitui as garantias do RLS (auth.uid()): nenhum usuário enxerga, altera
ou conclui dados de outro. Os casos 404 detalhados por router vivem em cada
`test_<router>.py`; aqui fica a varredura completa com um cenário só.
"""

from .helpers import (
    balance,
    make_client,
    make_link,
    make_project,
    make_reminder,
    make_reward_item,
    make_subtask,
    make_task,
    unique,
)


def _scenario(user_client):
    """Cria um recurso de cada tipo e devolve os ids."""
    task_id = make_task(user_client, title="Tarefa privada")["id"]
    return {
        "task": task_id,
        "subtask": make_subtask(user_client, task_id)["id"],
        "reminder": make_reminder(user_client, task_id)["id"],
        "attachment": make_link(user_client, task_id)["id"],
        "client": make_client(user_client, name=unique("cliente"))["id"],
        "project": make_project(user_client, name=unique("projeto"))["id"],
        "reward": make_reward_item(user_client)["id"],
    }


def test_users_cannot_touch_each_others_data(user_client, second_user_client):
    ids = _scenario(user_client)
    t = ids["task"]

    # Leitura direta: tudo 404.
    assert second_user_client.get(f"/tasks/{t}").status_code == 404
    assert second_user_client.get(f"/tasks/{t}/subtasks").status_code == 404
    assert second_user_client.get(f"/tasks/{t}/reminders").status_code == 404
    assert second_user_client.get(f"/tasks/{t}/attachments").status_code == 404

    # Escrita: tudo 404 (criar sob a tarefa alheia, concluir, arquivar, apagar).
    assert second_user_client.post(f"/tasks/{t}/subtasks", json={"title": "x"}).status_code == 404
    assert (
        second_user_client.post(
            f"/tasks/{t}/reminders",
            json={"title": "x", "remind_at": "2030-01-01T10:00:00Z", "channel": "push", "horizon": "short"},
        ).status_code
        == 404
    )
    assert (
        second_user_client.post(
            f"/tasks/{t}/attachments",
            json={"type": "link", "label": "x", "url": "https://example.com"},
        ).status_code
        == 404
    )
    assert second_user_client.post(f"/tasks/{t}/status", json={"status": "done"}).status_code == 404
    assert second_user_client.post(f"/tasks/{t}/archive").status_code == 404
    assert second_user_client.delete(f"/tasks/{t}").status_code == 404
    assert second_user_client.get(f"/tasks/{t}/leaves-awarded").status_code == 404

    # Rotas de item por id: tudo 404.
    assert second_user_client.patch(f"/subtasks/{ids['subtask']}/done", json={"is_done": True}).status_code == 404
    assert second_user_client.delete(f"/subtasks/{ids['subtask']}").status_code == 404
    assert second_user_client.delete(f"/reminders/{ids['reminder']}").status_code == 404
    assert second_user_client.delete(f"/attachments/{ids['attachment']}").status_code == 404

    # Recompensa alheia não pode ser resgatada.
    assert second_user_client.post(f"/rewards/items/{ids['reward']}/redeem").status_code in (400, 404)


def test_users_cannot_see_each_others_lists(user_client, second_user_client):
    ids = _scenario(user_client)

    other_tasks = second_user_client.get("/tasks").json()
    assert all(t["id"] != ids["task"] for t in other_tasks)

    assert ids["client"] not in [c["id"] for c in second_user_client.get("/clients").json()]
    assert ids["project"] not in [p["id"] for p in second_user_client.get("/projects").json()]
    assert ids["reward"] not in [i["id"] for i in second_user_client.get("/rewards/items").json()]

    # Saldo e extratos são isolados.
    assert balance(second_user_client) == 0
    assert second_user_client.get("/leaves/transactions", params={"task_id": ids["task"]}).json() == []
