"""Modelos SQLAlchemy — porte 1:1 do schema Supabase (0001) com auth própria.

Diferenças intencionais vs. Supabase:
- `auth.users` -> `users` local (tabela abaixo).
- Sem RLS: isolamento por `user_id` é imposto nas rotas (ver `deps.py`).
- `leaf_balances` é calculada na rota, não como view.
"""

import enum
import uuid
from datetime import date, datetime, time

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )


def _now():
    return func.now()


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    waiting = "waiting"
    done = "done"
    archived = "archived"


class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class WorkContext(str, enum.Enum):
    personal = "personal"
    internal_work = "internal_work"
    client_work = "client_work"


class AttachmentType(str, enum.Enum):
    link = "link"
    audio = "audio"
    file = "file"


class ReminderChannel(str, enum.Enum):
    push = "push"
    app = "app"
    telegram = "telegram"
    whatsapp = "whatsapp"


class ReminderHorizon(str, enum.Enum):
    short = "short"
    medium = "medium"
    long = "long"


class LeafTransactionType(str, enum.Enum):
    task_completion = "task_completion"
    early_completion_bonus = "early_completion_bonus"
    checklist_bonus = "checklist_bonus"
    weekly_bonus = "weekly_bonus"
    reward_redemption = "reward_redemption"
    manual_adjustment = "manual_adjustment"


class RewardRedemptionStatus(str, enum.Enum):
    requested = "requested"
    delivered = "delivered"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), onupdate=_now(), nullable=False
    )


class OAuthAccount(Base):
    """Provedor externo de login (Google), uma linha por vínculo user↔provider."""

    __tablename__ = "oauth_accounts"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="oauth_provider_uid_unique"),
        Index("oauth_user_idx", "user_id"),
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )

    __table_args__ = (Index("refresh_user_idx", "user_id"),)


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    display_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), onupdate=_now(), nullable=False
    )


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )

    __table_args__ = (
        Index("categories_user_idx", "user_id"),
        UniqueConstraint("user_id", "slug", name="categories_user_slug_unique"),
    )


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), onupdate=_now(), nullable=False
    )

    __table_args__ = (Index("clients_user_idx", "user_id"),)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, server_default=text("'active'"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), onupdate=_now(), nullable=False
    )

    __table_args__ = (
        Index("projects_user_idx", "user_id"),
        Index("projects_user_client_idx", "user_id", "client_id"),
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_context: Mapped[WorkContext] = mapped_column(
        SAEnum(WorkContext, name="work_context"), server_default=text("'personal'"), nullable=False
    )
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, name="task_status"), server_default=text("'todo'"), nullable=False
    )
    priority: Mapped[TaskPriority] = mapped_column(
        SAEnum(TaskPriority, name="task_priority"), server_default=text("'medium'"), nullable=False
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    estimated_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    leaf_awarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sort_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Recado opcional de quando a tarefa foi pausada (status `waiting`), p.ex.
    # "esperando o retorno da Ana". Só faz sentido enquanto está aguardando.
    pause_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), onupdate=_now(), nullable=False
    )

    subtasks: Mapped[list["Subtask"]] = relationship(
        backref="task", cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        CheckConstraint(
            "estimated_minutes IS NULL OR estimated_minutes >= 0",
            name="tasks_estimated_minutes_check",
        ),
        Index("tasks_user_idx", "user_id"),
        Index("tasks_user_due_date_idx", "user_id", "due_date"),
        Index("tasks_user_status_idx", "user_id", "status"),
        Index("tasks_user_priority_idx", "user_id", "priority"),
        Index("tasks_user_category_idx", "user_id", "category_id"),
        Index("tasks_user_client_idx", "user_id", "client_id"),
        Index("tasks_user_project_idx", "user_id", "project_id"),
    )


class Subtask(Base):
    __tablename__ = "subtasks"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), onupdate=_now(), nullable=False
    )

    __table_args__ = (
        Index("subtasks_task_position_idx", "task_id", "position"),
        Index("subtasks_user_idx", "user_id"),
    )


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    remind_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    channel: Mapped[ReminderChannel] = mapped_column(
        SAEnum(ReminderChannel, name="reminder_channel"),
        server_default=text("'push'"),
        nullable=False,
    )
    horizon: Mapped[ReminderHorizon] = mapped_column(
        SAEnum(ReminderHorizon, name="reminder_horizon"),
        server_default=text("'short'"),
        nullable=False,
    )
    is_sent: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), onupdate=_now(), nullable=False
    )

    __table_args__ = (Index("reminders_user_remind_at_idx", "user_id", "remind_at"),)


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[AttachmentType] = mapped_column(
        SAEnum(AttachmentType, name="attachment_type"), nullable=False
    )
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "size_bytes IS NULL OR size_bytes >= 0", name="attachments_size_check"
        ),
        Index("attachments_user_task_idx", "user_id", "task_id"),
    )


class RewardItem(Base):
    __tablename__ = "reward_items"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost: Mapped[int] = mapped_column(Integer, nullable=False)
    icon: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), onupdate=_now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("cost >= 0", name="reward_items_cost_check"),
        Index("reward_items_user_active_idx", "user_id", "is_active"),
        UniqueConstraint("user_id", "title", name="reward_items_user_title_unique"),
    )


class RewardRedemption(Base):
    __tablename__ = "reward_redemptions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    reward_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reward_items.id", ondelete="RESTRICT"), nullable=False
    )
    cost: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[RewardRedemptionStatus] = mapped_column(
        SAEnum(RewardRedemptionStatus, name="reward_redemption_status"),
        server_default=text("'requested'"),
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    redeemed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), onupdate=_now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("cost >= 0", name="reward_redemptions_cost_check"),
        Index("reward_redemptions_user_status_idx", "user_id", "status"),
    )


class LeafTransaction(Base):
    __tablename__ = "leaf_transactions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
    reward_redemption_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reward_redemptions.id", ondelete="SET NULL"),
        nullable=True,
    )
    type: Mapped[LeafTransactionType] = mapped_column(
        SAEnum(LeafTransactionType, name="leaf_transaction_type"), nullable=False
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("amount <> 0", name="leaf_transactions_no_zero_amount"),
        CheckConstraint(
            "num_nonnulls(task_id, reward_redemption_id) <= 1",
            name="leaf_transactions_single_source",
        ),
        CheckConstraint(
            "CASE WHEN type = 'reward_redemption' THEN amount < 0 "
            "WHEN type = 'manual_adjustment' THEN amount <> 0 "
            "ELSE amount > 0 END",
            name="leaf_transactions_amount_direction",
        ),
        Index("leaf_transactions_user_created_idx", "user_id", "created_at"),
        Index("leaf_transactions_user_task_type_idx", "user_id", "task_id", "type"),
        Index(
            "leaf_transactions_one_completion_award_per_task_idx",
            "user_id",
            "task_id",
            "type",
            unique=True,
            postgresql_where=text("task_id IS NOT NULL AND type = 'task_completion'"),
        ),
    )
