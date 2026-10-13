"""Porte das migrations Supabase 0001-0005 para backend próprio.

- Nova tabela `users` (+ `oauth_accounts` reservada p/ Fase 7, `refresh_tokens`).
- FKs que apontavam para `auth.users` agora apontam para `users`.
- Sem RLS/policies (isolamento na aplicação) e sem `storage.buckets`.
- Mantidos: enums, triggers `set_updated_at`, índices, checks, seeds.
- Regra de Folhinhas (0004) virou serviço Python; este migration NÃO cria
  `award_task_completion_leaves()`.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_port_supabase_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.execute("CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'waiting', 'done', 'archived')")
    op.execute("CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical')")
    op.execute("CREATE TYPE work_context AS ENUM ('personal', 'internal_work', 'client_work')")
    op.execute("CREATE TYPE attachment_type AS ENUM ('link', 'audio', 'file')")
    op.execute("CREATE TYPE reminder_channel AS ENUM ('push', 'app', 'telegram', 'whatsapp')")
    op.execute("CREATE TYPE reminder_horizon AS ENUM ('short', 'medium', 'long')")
    op.execute(
        "CREATE TYPE leaf_transaction_type AS ENUM "
        "('task_completion', 'early_completion_bonus', 'checklist_bonus', "
        "'weekly_bonus', 'reward_redemption', 'manual_adjustment')"
    )
    op.execute(
        "CREATE TYPE reward_redemption_status AS ENUM ('requested', 'delivered', 'cancelled')"
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
        """
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(320), unique=True, nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "oauth_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("provider_user_id", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("provider", "provider_user_id", name="oauth_provider_uid_unique"),
    )
    op.create_index("oauth_user_idx", "oauth_accounts", ["user_id"])
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("refresh_user_idx", "refresh_tokens", ["user_id"])

    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.execute("CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()")

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("color", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "slug", name="categories_user_slug_unique"),
    )
    op.create_index("categories_user_idx", "categories", ["user_id"])

    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("clients_user_idx", "clients", ["user_id"])
    op.execute("CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at()")

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'active'"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("projects_user_idx", "projects", ["user_id"])
    op.create_index("projects_user_client_idx", "projects", ["user_id", "client_id"])
    op.execute("CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at()")

    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("work_context", postgresql.ENUM("personal", "internal_work", "client_work", name="work_context", create_type=False), server_default="personal", nullable=False),
        sa.Column("status", postgresql.ENUM("todo", "in_progress", "waiting", "done", "archived", name="task_status", create_type=False), server_default="todo", nullable=False),
        sa.Column("priority", postgresql.ENUM("low", "medium", "high", "critical", name="task_priority", create_type=False), server_default="medium", nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("due_time", sa.Time(), nullable=True),
        sa.Column("estimated_minutes", sa.Integer(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("leaf_awarded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sort_score", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("estimated_minutes IS NULL OR estimated_minutes >= 0", name="tasks_estimated_minutes_check"),
    )
    for cols in (["user_id"], ["user_id", "due_date"], ["user_id", "status"], ["user_id", "priority"], ["user_id", "category_id"], ["user_id", "client_id"], ["user_id", "project_id"]):
        op.create_index(f"tasks_{'_'.join(cols)}_idx", "tasks", cols)
    op.execute("CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at()")

    op.create_table(
        "subtasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("is_done", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("subtasks_task_position_idx", "subtasks", ["task_id", "position"])
    op.create_index("subtasks_user_idx", "subtasks", ["user_id"])
    op.execute("CREATE TRIGGER subtasks_set_updated_at BEFORE UPDATE ON subtasks FOR EACH ROW EXECUTE FUNCTION set_updated_at()")

    op.create_table(
        "reminders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("remind_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("channel", postgresql.ENUM("push", "app", "telegram", "whatsapp", name="reminder_channel", create_type=False), server_default="push", nullable=False),
        sa.Column("horizon", postgresql.ENUM("short", "medium", "long", name="reminder_horizon", create_type=False), server_default="short", nullable=False),
        sa.Column("is_sent", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("reminders_user_remind_at_idx", "reminders", ["user_id", "remind_at"])
    op.execute("CREATE TRIGGER reminders_set_updated_at BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION set_updated_at()")

    op.create_table(
        "attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", postgresql.ENUM("link", "audio", "file", name="attachment_type", create_type=False), nullable=False),
        sa.Column("label", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.Text(), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("size_bytes IS NULL OR size_bytes >= 0", name="attachments_size_check"),
    )
    op.create_index("attachments_user_task_idx", "attachments", ["user_id", "task_id"])

    op.create_table(
        "reward_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cost", sa.Integer(), nullable=False),
        sa.Column("icon", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("cost >= 0", name="reward_items_cost_check"),
        sa.UniqueConstraint("user_id", "title", name="reward_items_user_title_unique"),
    )
    op.create_index("reward_items_user_active_idx", "reward_items", ["user_id", "is_active"])
    op.execute("CREATE TRIGGER reward_items_set_updated_at BEFORE UPDATE ON reward_items FOR EACH ROW EXECUTE FUNCTION set_updated_at()")

    op.create_table(
        "reward_redemptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reward_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("reward_items.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("cost", sa.Integer(), nullable=False),
        sa.Column("status", postgresql.ENUM("requested", "delivered", "cancelled", name="reward_redemption_status", create_type=False), server_default="requested", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("cost >= 0", name="reward_redemptions_cost_check"),
    )
    op.create_index("reward_redemptions_user_status_idx", "reward_redemptions", ["user_id", "status"])
    op.execute("CREATE TRIGGER reward_redemptions_set_updated_at BEFORE UPDATE ON reward_redemptions FOR EACH ROW EXECUTE FUNCTION set_updated_at()")

    op.create_table(
        "leaf_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reward_redemption_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("reward_redemptions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", postgresql.ENUM("task_completion", "early_completion_bonus", "checklist_bonus", "weekly_bonus", "reward_redemption", "manual_adjustment", name="leaf_transaction_type", create_type=False), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("amount <> 0", name="leaf_transactions_no_zero_amount"),
        sa.CheckConstraint("num_nonnulls(task_id, reward_redemption_id) <= 1", name="leaf_transactions_single_source"),
        sa.CheckConstraint(
            "CASE WHEN type = 'reward_redemption' THEN amount < 0 "
            "WHEN type = 'manual_adjustment' THEN amount <> 0 ELSE amount > 0 END",
            name="leaf_transactions_amount_direction",
        ),
    )
    op.create_index("leaf_transactions_user_created_idx", "leaf_transactions", ["user_id", "created_at"])
    op.create_index("leaf_transactions_user_task_type_idx", "leaf_transactions", ["user_id", "task_id", "type"])
    op.create_index(
        "leaf_transactions_one_completion_award_per_task_idx",
        "leaf_transactions", ["user_id", "task_id", "type"],
        unique=True, postgresql_where=sa.text("task_id IS NOT NULL AND type = 'task_completion'"),
    )

    # Seeds globais (equivale a seed.sql + defaults de 0001).
    op.execute(
        """
        INSERT INTO categories (user_id, name, slug, color, is_default) VALUES
          (NULL, 'Trabalho', 'trabalho', '#5F7A61', TRUE),
          (NULL, 'Pessoal', 'pessoal', '#C49A4A', TRUE),
          (NULL, 'Estudos', 'estudos', '#6F9B6D', TRUE),
          (NULL, 'Mercado', 'mercado', '#D69E45', TRUE),
          (NULL, 'Casa', 'casa', '#EFE3D0', TRUE),
          (NULL, 'Saúde', 'saude', '#8FAF8F', TRUE),
          (NULL, 'Ideias', 'ideias', '#BFA7D8', TRUE),
          (NULL, 'Financeiro', 'financeiro', '#C46A4A', TRUE)
        ON CONFLICT DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO reward_items (user_id, title, description, cost, icon, is_default, is_active) VALUES
          (NULL, 'Beijo', 'Resgatar um beijo.', 5, '💛', TRUE, TRUE),
          (NULL, 'Café especial', 'Um café especial para acompanhar o dia.', 10, '☕', TRUE, TRUE),
          (NULL, 'Noite de filme', 'Escolher um filme para assistir juntos.', 25, '🎬', TRUE, TRUE),
          (NULL, 'Jantar escolhido por ele', 'Escolher o jantar da vez.', 50, '🍽️', TRUE, TRUE),
          (NULL, 'Presente surpresa', 'Um presente surpresa combinado com carinho.', 80, '🎁', TRUE, TRUE),
          (NULL, 'Final de semana especial', 'Planejar um final de semana especial.', 150, '🌿', TRUE, TRUE),
          (NULL, 'Viagem', 'Guardar para uma viagem.', 300, '✈️', TRUE, TRUE)
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    for table in ("leaf_transactions", "reward_redemptions", "reward_items", "attachments", "reminders", "subtasks", "tasks", "projects", "clients", "categories", "profiles", "refresh_tokens", "oauth_accounts", "users"):
        op.drop_table(table)
    for trigger_table in ("reward_redemptions", "reward_items", "reminders", "subtasks", "tasks", "projects", "clients", "profiles"):
        op.execute(f"DROP TRIGGER IF EXISTS {trigger_table}_set_updated_at ON {trigger_table}")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at()")
    for enum_name in ("reward_redemption_status", "leaf_transaction_type", "reminder_horizon", "reminder_channel", "attachment_type", "work_context", "task_priority", "task_status"):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
