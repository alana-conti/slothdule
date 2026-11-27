"""Plano do dia (docs/02-user-flows.md, fluxo 14).

- `tasks.plan_date`: o último dia em que a pessoa decidiu sobre a tarefa no plano.
- `tasks.plan_position`: a ordem no plano daquele dia; vazio com data = recusada
  ("Agora não") naquele dia.
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_day_plan"
down_revision = "0005_routines"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("plan_date", sa.Date(), nullable=True))
    op.add_column("tasks", sa.Column("plan_position", sa.Integer(), nullable=True))
    op.create_index("tasks_user_plan_date_idx", "tasks", ["user_id", "plan_date"])


def downgrade() -> None:
    op.drop_index("tasks_user_plan_date_idx", table_name="tasks")
    op.drop_column("tasks", "plan_position")
    op.drop_column("tasks", "plan_date")
