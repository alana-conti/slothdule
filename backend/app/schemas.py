from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models import (
    AttachmentType,
    HabitCheckinStatus,
    HabitKind,
    HabitPeriod,
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


class MeOut(UserOut):
    """GET/PATCH /auth/me: o usuário logado, com o que a tela de Perfil mostra."""

    created_at: datetime
    google_linked: bool = False


class ProfileUpdateIn(BaseModel):
    # Vazio (ou só espaços) apaga o nome; o app volta a mostrar o e-mail.
    display_name: str | None = Field(default=None, max_length=60)


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


class DayPlanIn(BaseModel):
    # A ordem da lista é a ordem do plano.
    task_ids: list[UUID] = Field(max_length=500)


class PlanDecisionIn(BaseModel):
    in_plan: bool


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
    plan_date: date | None = None
    plan_position: int | None = None
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


# --- Rotina e hábitos ---
class HabitIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    kind: HabitKind = HabitKind.do
    weekdays: list[int] = Field(min_length=1, max_length=7)
    time_of_day: time | None = None
    period: HabitPeriod | None = None
    remind: bool = False

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Dê um nome ao hábito.")
        return value

    @field_validator("weekdays")
    @classmethod
    def _valid_weekdays(cls, value: list[int]) -> list[int]:
        if any(day < 1 or day > 7 for day in value):
            raise ValueError("Os dias vão de 1 (segunda) a 7 (domingo).")
        return sorted(set(value))

    @model_validator(mode="after")
    def _time_or_period(self):
        if self.time_of_day is not None and self.period is not None:
            raise ValueError("Escolha um horário ou um período, não os dois.")
        if self.remind and self.time_of_day is None:
            raise ValueError("O lembrete precisa de um horário.")
        return self


class HabitOut(BaseModel):
    id: UUID
    title: str
    kind: HabitKind
    weekdays: list[int]
    time_of_day: time | None = None
    period: HabitPeriod | None = None
    remind: bool
    start_date: date
    created_at: datetime
    stage: str
    leaves_per_checkin: int
    growth: int
    total_checkins: int
    current_threshold: int
    next_stage: str | None = None
    next_threshold: int | None = None
    misses_in_row: int
    regression_after: int
    scheduled_today: bool
    today_status: HabitCheckinStatus | None = None
    today_leaves: int
    routine_id: UUID | None = None
    routine_position: int | None = None


class HabitStageChangeOut(BaseModel):
    day: date
    stage: str
    direction: str


class HabitDayOut(BaseModel):
    day: date
    status: str


class HabitDetailOut(HabitOut):
    history: list[HabitStageChangeOut]
    calendar: list[HabitDayOut]
    thresholds: list[int]


class HabitTodayOut(BaseModel):
    date: date
    leaves_earned: int
    leaves_cap: int
    scheduled: int
    done: int
    rest: int
    routine_bonus: int
    routine_bonus_earned: bool


class HabitCheckinIn(BaseModel):
    status: HabitCheckinStatus


class HabitCheckinResultOut(BaseModel):
    habit: HabitOut
    leaves_awarded: int
    leaves_today: int
    leaves_cap: int
    # +2 quando o cuidado fechou as rotinas do dia; -2 quando desfazer reabriu.
    routine_bonus_change: int = 0


# --- Rotinas encadeadas ---
class RoutineIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    anchor: str | None = Field(default=None, max_length=80)
    # Passos em ordem. Um hábito está em no máximo uma rotina: entrar nesta
    # tira o hábito de onde estava.
    habit_ids: list[UUID] = Field(min_length=1, max_length=12)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Dê um nome à rotina.")
        return value

    @field_validator("anchor")
    @classmethod
    def _strip_anchor(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("habit_ids")
    @classmethod
    def _unique_steps(cls, value: list[UUID]) -> list[UUID]:
        if len(set(value)) != len(value):
            raise ValueError("Cada hábito entra uma vez só na rotina.")
        return value


class RoutineOut(BaseModel):
    id: UUID
    name: str
    anchor: str | None = None
    habit_ids: list[UUID]
    created_at: datetime


# --- Web Push ---
class PushPublicKeyOut(BaseModel):
    public_key: str | None = None


class PushKeysIn(BaseModel):
    p256dh: str = Field(min_length=1, max_length=512)
    auth: str = Field(min_length=1, max_length=512)


class PushSubscriptionIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2048, pattern=r"^https://")
    keys: PushKeysIn


class PushSubscriptionRemoveIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2048)
