"""Rotinas encadeadas e o bônus de rotinas do dia.

- `routines`: nome e âncora opcional ("depois do café").
- `habits.routine_id`/`routine_position`: os passos, em ordem.
- `routine_bonuses`: no máximo um bônus de +2 por pessoa por dia.
- Tipo de Folhinha `routine_bonus` (fora do teto diário dos hábitos).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005_routines"
down_revision = "0004_habit_reminders"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE leaf_transaction_type ADD VALUE IF NOT EXISTS 'routine_bonus'")

    op.create_table(
        "routines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("anchor", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("routines_user_idx", "routines", ["user_id"])

    op.add_column(
        "habits",
        sa.Column("routine_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("routines.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column("habits", sa.Column("routine_position", sa.SmallInteger(), nullable=True))

    op.create_table(
        "routine_bonuses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column(
            "leaf_transaction_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("leaf_transactions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "day", name="routine_bonuses_user_day_unique"),
    )


def downgrade() -> None:
    op.drop_table("routine_bonuses")
    op.drop_column("habits", "routine_position")
    op.drop_column("habits", "routine_id")
    op.drop_index("routines_user_idx", table_name="routines")
    op.drop_table("routines")
    # Postgres não remove valor de enum; `routine_bonus` fica em leaf_transaction_type.
