"""Rotina inicial "Organizar meu dia" (docs/11-rotina-e-habitos.md, 3.10)."""

from .helpers import unique

NAME = "Organizar meu dia"


def _signup_and_login(client, email: str) -> None:
    assert client.post("/auth/signup", json={"email": email, "password": "secret123"}).status_code == 201
    assert client.post("/auth/login", json={"email": email, "password": "secret123"}).status_code == 200


def test_new_account_gets_the_starter_routine(client):
    _signup_and_login(client, f"{unique('inicio')}@example.com")

    routines = client.get("/routines").json()
    assert [r["name"] for r in routines] == [NAME]
    assert routines[0]["anchor"] == "ao começar o dia"

    habits = client.get("/habits").json()
    assert len(habits) == 1
    habit = habits[0]
    assert habit["title"] == "Montar o Plano do dia"
    assert habit["weekdays"] == [1, 2, 3, 4, 5]
    assert habit["period"] == "morning"
    assert habit["time_of_day"] is None
    assert habit["routine_id"] == routines[0]["id"]


def test_starter_routine_is_private_and_removable(client, second_user_client):
    _signup_and_login(client, f"{unique('inicio')}@example.com")
    routine = client.get("/routines").json()[0]

    # Cada conta tem a sua; a da outra pessoa não aparece nem se apaga daqui.
    assert second_user_client.delete(f"/routines/{routine['id']}").status_code == 404
    assert client.delete(f"/routines/{routine['id']}").status_code == 204
    assert client.get("/routines").json() == []
