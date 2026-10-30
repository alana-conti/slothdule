from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models import (
    AttachmentType,
    ReminderChannel,
    ReminderHorizon,
    RewardRedemptionStatus,
    TaskPriority,
    TaskStatus,
    WorkContext,
)


# --- Auth ---
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: UUID
    email: str
    display_name: str | None = None
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


# --- Categories ---
class CategoryOut(BaseModel):
    id: UUID
    name: str
    slug: str
    color: str | None = None

    model_config = {"from_attributes": True}


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str = Field(min_length=1, max_length=120)
    color: str | None = None


# --- Clients / Projects ---
class ClientOut(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClientIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    notes: str | None = None


class ProjectOut(BaseModel):
    id: UUID
    user_id: UUID
    client_id: UUID | None = None
    name: str
    type: str | None = None
    status: str = "active"
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    client_id: UUID | None = None
    type: str | None = None
    status: str = "active"
    notes: str | None = None


# --- Tasks ---
class TaskIn(BaseModel):
    category_id: UUID
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    work_context: WorkContext = WorkContext.personal
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    start_date: date | None = None
    due_date: date | None = None
    due_time: time | None = None
    estimated_minutes: int | None = Field(default=None, ge=0)
    client_id: UUID | None = None
    project_id: UUID | None = None
    # Só é aplicado quando enviado (o PATCH sem o campo preserva o recado).
    pause_reason: str | None = Field(default=None, max_length=500)


class TaskStatusIn(BaseModel):
    status: TaskStatus
    pause_reason: str | None = Field(default=None, max_length=500)


class TaskOut(BaseModel):
    id: UUID
    user_id: UUID
    category_id: UUID
    client_id: UUID | None = None
    project_id: UUID | None = None
    title: str
    description: str | None = None
    work_context: WorkContext
    status: TaskStatus
    priority: TaskPriority
    start_date: date | None = None
    due_date: date | None = None
    due_time: time | None = None
    estimated_minutes: int | None = None
    completed_at: datetime | None = None
    leaf_awarded_at: datetime | None = None
    pause_reason: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Subtasks ---
class SubtaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=500)


class SubtaskTitleIn(BaseModel):
    title: str = Field(min_length=1, max_length=500)


class SubtaskDoneIn(BaseModel):
    is_done: bool


class SubtaskOut(BaseModel):
    id: UUID
    user_id: UUID
    task_id: UUID
    title: str
    is_done: bool
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Reminders ---
class ReminderIn(BaseModel):
    title: str = Field(default="Lembrete de tarefa", max_length=300)
    remind_at: datetime
    channel: ReminderChannel = ReminderChannel.push
    horizon: ReminderHorizon = ReminderHorizon.short


class ReminderOut(BaseModel):
    id: UUID
    user_id: UUID
    task_id: UUID | None = None
    title: str
    remind_at: datetime
    channel: ReminderChannel
    horizon: ReminderHorizon
    is_sent: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Attachments ---
class AttachmentIn(BaseModel):
    type: AttachmentType
    label: str | None = None
    url: str = Field(min_length=1, max_length=2000)
    mime_type: str | None = None
    size_bytes: int | None = Field(default=None, ge=0)


class AttachmentOut(BaseModel):
    id: UUID
    user_id: UUID
    task_id: UUID
    type: AttachmentType
    label: str | None = None
    url: str
    mime_type: str | None = None
    size_bytes: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Rewards ---
class RewardItemIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    cost: int = Field(ge=1)
    icon: str | None = None


class RewardItemOut(BaseModel):
    id: UUID
    user_id: UUID | None = None
    title: str
    description: str | None = None
    cost: int
    icon: str | None = None
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RedemptionOut(BaseModel):
    id: UUID
    user_id: UUID
    reward_item_id: UUID
    cost: int
    status: RewardRedemptionStatus
    notes: str | None = None
    redeemed_at: datetime
    delivered_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    reward_item: dict | None = None

    model_config = {"from_attributes": True}


# --- Leaves ---
class LeafTransactionOut(BaseModel):
    id: UUID
    user_id: UUID
    task_id: UUID | None = None
    reward_redemption_id: UUID | None = None
    type: str
    amount: int
    reason: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BalanceOut(BaseModel):
    balance: int
