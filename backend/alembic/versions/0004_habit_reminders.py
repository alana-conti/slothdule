"""Lembretes de hábito por Web Push.

- `habits.remind`: lembrar no horário (exige `time_of_day`).
- `push_subscriptions`: inscrições de push por aparelho.
- `habit_reminder_deliveries`: no máximo um lembrete por hábito por dia.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004_habit_reminders"
down_revision = "0003_habits"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("habits", sa.Column("remind", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.create_check_constraint("habits_remind_needs_time_check", "habits", "NOT remind OR time_of_day IS NOT NULL")

    op.create_table(
        "push_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False, unique=True),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("push_subscriptions_user_idx", "push_subscriptions", ["user_id"])

    op.create_table(
        "habit_reminder_deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("habit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("habits.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("habit_id", "day", name="habit_reminder_deliveries_habit_day_unique"),
    )


def downgrade() -> None:
    op.drop_table("habit_reminder_deliveries")
    op.drop_table("push_subscriptions")
    op.drop_constraint("habits_remind_needs_time_check", "habits")
    op.drop_column("habits", "remind")
