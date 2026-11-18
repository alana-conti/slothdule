"""Rotina e hábitos: `habits`, `habit_checkins` e o tipo de Folhinha `habit_checkin`.

Ver docs/11-rotina-e-habitos.md. Estágio e Folhinhas por check-in são
calculados em `app/services/habits.py`, não guardados.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_habits"
down_revision = "0002_task_pause_reason"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE leaf_transaction_type ADD VALUE IF NOT EXISTS 'habit_checkin'")
    op.execute("CREATE TYPE habit_kind AS ENUM ('do', 'avoid')")
    op.execute("CREATE TYPE habit_period AS ENUM ('morning', 'afternoon', 'evening')")
    op.execute("CREATE TYPE habit_checkin_status AS ENUM ('done', 'rest')")

    op.create_table(
        "habits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("kind", postgresql.ENUM("do", "avoid", name="habit_kind", create_type=False), server_default="do", nullable=False),
        sa.Column("weekdays", postgresql.ARRAY(sa.SmallInteger()), nullable=False),
        sa.Column("time_of_day", sa.Time(), nullable=True),
        sa.Column("period", postgresql.ENUM("morning", "afternoon", "evening", name="habit_period", create_type=False), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "cardinality(weekdays) BETWEEN 1 AND 7 AND weekdays <@ ARRAY[1,2,3,4,5,6,7]::smallint[]",
            name="habits_weekdays_check",
        ),
        sa.CheckConstraint("time_of_day IS NULL OR period IS NULL", name="habits_time_or_period_check"),
    )
    op.create_index("habits_user_idx", "habits", ["user_id"])
    op.execute("CREATE TRIGGER habits_set_updated_at BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION set_updated_at()")

    op.create_table(
        "habit_checkins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("habit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("habits.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("status", postgresql.ENUM("done", "rest", name="habit_checkin_status", create_type=False), nullable=False),
        sa.Column("leaf_transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leaf_transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("habit_id", "day", name="habit_checkins_habit_day_unique"),
    )
    op.create_index("habit_checkins_user_day_idx", "habit_checkins", ["user_id", "day"])


def downgrade() -> None:
    op.drop_table("habit_checkins")
    op.drop_table("habits")
    op.execute("DROP TYPE habit_checkin_status")
    op.execute("DROP TYPE habit_period")
    op.execute("DROP TYPE habit_kind")
    # Postgres não remove valor de enum; `habit_checkin` fica em leaf_transaction_type.
