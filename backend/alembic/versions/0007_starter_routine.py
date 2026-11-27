"""Rotina inicial "Organizar meu dia" para quem já tinha conta.

Contas novas ganham a rotina no cadastro (`app/services/starter_routine.py`).
Aqui ela chega às contas antigas: dias úteis, de manhã, um passo "Montar o
Plano do dia". Quem já tem uma rotina com esse nome fica como está.
"""

from alembic import op

revision = "0007_starter_routine"
down_revision = "0006_day_plan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        WITH new_routines AS (
            INSERT INTO routines (id, user_id, name, anchor)
            SELECT gen_random_uuid(), u.id, 'Organizar meu dia', 'ao começar o dia'
            FROM users u
            WHERE NOT EXISTS (
                SELECT 1 FROM routines r
                WHERE r.user_id = u.id AND r.name = 'Organizar meu dia'
            )
            RETURNING id, user_id
        )
        INSERT INTO habits (
            id, user_id, title, kind, weekdays, period, start_date, routine_id, routine_position
        )
        SELECT
            gen_random_uuid(), user_id, 'Montar o Plano do dia', 'do'::habit_kind,
            ARRAY[1, 2, 3, 4, 5]::smallint[], 'morning'::habit_period,
            (now() AT TIME ZONE 'America/Sao_Paulo')::date, id, 0
        FROM new_routines
        """
    )


def downgrade() -> None:
    # Dado de produto: a pessoa pode ter mexido na rotina; desfazer não apaga.
    pass
