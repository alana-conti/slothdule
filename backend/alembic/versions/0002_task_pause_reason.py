"""Recado opcional de pausa na tarefa (`tasks.pause_reason`)."""

from alembic import op
import sqlalchemy as sa

revision = "0002_task_pause_reason"
down_revision = "0001_port_supabase_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("pause_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "pause_reason")
