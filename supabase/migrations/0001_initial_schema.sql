-- Slothdule initial schema

create extension if not exists "pgcrypto";

-- ENUMS
create type public.task_status as enum ('todo', 'in_progress', 'waiting', 'done', 'archived');
create type public.task_priority as enum ('low', 'medium', 'high', 'critical');
create type public.work_context as enum ('personal', 'internal_work', 'client_work');
create type public.attachment_type as enum ('link', 'audio', 'file');
create type public.reminder_channel as enum ('push', 'app', 'telegram', 'whatsapp');
create type public.reminder_horizon as enum ('short', 'medium', 'long');
create type public.leaf_transaction_type as enum (
  'task_completion',
  'early_completion_bonus',
  'checklist_bonus',
  'weekly_bonus',
  'reward_redemption',
  'manual_adjustment'
);
create type public.reward_redemption_status as enum ('requested', 'delivered', 'cancelled');

-- UPDATED_AT TRIGGER FUNCTION
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- CLIENTS
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- PROJECTS
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  type text,
  status text default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- TASKS
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text,
  work_context public.work_context not null default 'personal',
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  start_date date,
  due_date date,
  due_time time,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  completed_at timestamptz,
  leaf_awarded_at timestamptz,
  sort_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- SUBTASKS
create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subtasks_set_updated_at
before update on public.subtasks
for each row execute function public.set_updated_at();

-- REMINDERS
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  channel public.reminder_channel not null default 'push',
  horizon public.reminder_horizon not null default 'short',
  is_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reminders_set_updated_at
before update on public.reminders
for each row execute function public.set_updated_at();

-- ATTACHMENTS
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  type public.attachment_type not null,
  label text,
  url text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now()
);

-- REWARD ITEMS
create table public.reward_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cost integer not null check (cost >= 0),
  icon text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reward_items_set_updated_at
before update on public.reward_items
for each row execute function public.set_updated_at();

-- REWARD REDEMPTIONS
create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_item_id uuid not null references public.reward_items(id) on delete restrict,
  cost integer not null check (cost >= 0),
  status public.reward_redemption_status not null default 'requested',
  notes text,
  redeemed_at timestamptz not null default now(),
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reward_redemptions_set_updated_at
before update on public.reward_redemptions
for each row execute function public.set_updated_at();

-- LEAF TRANSACTIONS
create table public.leaf_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  reward_redemption_id uuid references public.reward_redemptions(id) on delete set null,
  type public.leaf_transaction_type not null,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint leaf_transactions_no_zero_amount check (amount <> 0),
  constraint leaf_transactions_single_source check (
    num_nonnulls(task_id, reward_redemption_id) <= 1
  ),
  constraint leaf_transactions_amount_direction check (
    case
      when type = 'reward_redemption' then amount < 0
      when type = 'manual_adjustment' then amount <> 0
      else amount > 0
    end
  )
);

-- Optional balance view. In production, confirm security behavior according to Supabase/Postgres version.
create or replace view public.leaf_balances
with (security_invoker = true) as
select
  user_id,
  coalesce(sum(amount), 0)::integer as balance
from public.leaf_transactions
group by user_id;

-- INDEXES
create unique index categories_user_slug_unique_idx
  on public.categories(user_id, slug)
  where user_id is not null;
create unique index categories_default_slug_unique_idx
  on public.categories(slug)
  where user_id is null;
create index categories_user_idx on public.categories(user_id);
create index clients_user_idx on public.clients(user_id);
create index projects_user_idx on public.projects(user_id);
create index projects_user_client_idx on public.projects(user_id, client_id);
create index tasks_user_idx on public.tasks(user_id);
create index tasks_user_due_date_idx on public.tasks(user_id, due_date);
create index tasks_user_status_idx on public.tasks(user_id, status);
create index tasks_user_priority_idx on public.tasks(user_id, priority);
create index tasks_user_category_idx on public.tasks(user_id, category_id);
create index tasks_user_client_idx on public.tasks(user_id, client_id);
create index tasks_user_project_idx on public.tasks(user_id, project_id);
create index reminders_user_remind_at_idx on public.reminders(user_id, remind_at);
create index attachments_user_task_idx on public.attachments(user_id, task_id);
create index subtasks_task_position_idx on public.subtasks(task_id, position);
create index subtasks_user_idx on public.subtasks(user_id);
create unique index reward_items_user_title_unique_idx
  on public.reward_items(user_id, title)
  where user_id is not null;
create unique index reward_items_default_title_unique_idx
  on public.reward_items(title)
  where user_id is null;
create index reward_items_user_active_idx on public.reward_items(user_id, is_active);
create index reward_redemptions_user_status_idx on public.reward_redemptions(user_id, status);
create index leaf_transactions_user_created_idx on public.leaf_transactions(user_id, created_at desc);
create index leaf_transactions_user_task_type_idx on public.leaf_transactions(user_id, task_id, type);
create unique index leaf_transactions_one_completion_award_per_task_idx
  on public.leaf_transactions(user_id, task_id, type)
  where task_id is not null and type = 'task_completion';

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.reminders enable row level security;
alter table public.attachments enable row level security;
alter table public.reward_items enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.leaf_transactions enable row level security;

-- POLICIES: profiles
create policy "profiles_select_own" on public.profiles
for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
for insert with check (id = auth.uid());

-- POLICIES: categories
create policy "categories_select_own_or_default" on public.categories
for select using (user_id = auth.uid() or user_id is null);
create policy "categories_insert_own" on public.categories
for insert with check (user_id = auth.uid());
create policy "categories_update_own" on public.categories
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories_delete_own" on public.categories
for delete using (user_id = auth.uid());

-- POLICIES: clients
create policy "clients_crud_own_select" on public.clients for select using (user_id = auth.uid());
create policy "clients_crud_own_insert" on public.clients for insert with check (user_id = auth.uid());
create policy "clients_crud_own_update" on public.clients for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clients_crud_own_delete" on public.clients for delete using (user_id = auth.uid());

-- POLICIES: projects
create policy "projects_crud_own_select" on public.projects for select using (user_id = auth.uid());
create policy "projects_crud_own_insert" on public.projects
for insert with check (
  user_id = auth.uid()
  and (
    client_id is null
    or exists (
      select 1
      from public.clients
      where clients.id = projects.client_id
        and clients.user_id = auth.uid()
    )
  )
);
create policy "projects_crud_own_update" on public.projects
for update using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    client_id is null
    or exists (
      select 1
      from public.clients
      where clients.id = projects.client_id
        and clients.user_id = auth.uid()
    )
  )
);
create policy "projects_crud_own_delete" on public.projects for delete using (user_id = auth.uid());

-- POLICIES: tasks
create policy "tasks_crud_own_select" on public.tasks for select using (user_id = auth.uid());
create policy "tasks_crud_own_insert" on public.tasks
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.categories
    where categories.id = tasks.category_id
      and (categories.user_id = auth.uid() or categories.user_id is null)
  )
  and (
    client_id is null
    or exists (
      select 1
      from public.clients
      where clients.id = tasks.client_id
        and clients.user_id = auth.uid()
    )
  )
  and (
    project_id is null
    or exists (
      select 1
      from public.projects
      where projects.id = tasks.project_id
        and projects.user_id = auth.uid()
    )
  )
);
create policy "tasks_crud_own_update" on public.tasks
for update using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.categories
    where categories.id = tasks.category_id
      and (categories.user_id = auth.uid() or categories.user_id is null)
  )
  and (
    client_id is null
    or exists (
      select 1
      from public.clients
      where clients.id = tasks.client_id
        and clients.user_id = auth.uid()
    )
  )
  and (
    project_id is null
    or exists (
      select 1
      from public.projects
      where projects.id = tasks.project_id
        and projects.user_id = auth.uid()
    )
  )
);
create policy "tasks_crud_own_delete" on public.tasks for delete using (user_id = auth.uid());

-- POLICIES: subtasks
create policy "subtasks_crud_own_select" on public.subtasks for select using (user_id = auth.uid());
create policy "subtasks_crud_own_insert" on public.subtasks
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks
    where tasks.id = subtasks.task_id
      and tasks.user_id = auth.uid()
  )
);
create policy "subtasks_crud_own_update" on public.subtasks
for update using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks
    where tasks.id = subtasks.task_id
      and tasks.user_id = auth.uid()
  )
);
create policy "subtasks_crud_own_delete" on public.subtasks for delete using (user_id = auth.uid());

-- POLICIES: reminders
create policy "reminders_crud_own_select" on public.reminders for select using (user_id = auth.uid());
create policy "reminders_crud_own_insert" on public.reminders
for insert with check (
  user_id = auth.uid()
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks
      where tasks.id = reminders.task_id
        and tasks.user_id = auth.uid()
    )
  )
);
create policy "reminders_crud_own_update" on public.reminders
for update using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks
      where tasks.id = reminders.task_id
        and tasks.user_id = auth.uid()
    )
  )
);
create policy "reminders_crud_own_delete" on public.reminders for delete using (user_id = auth.uid());

-- POLICIES: attachments
create policy "attachments_crud_own_select" on public.attachments for select using (user_id = auth.uid());
create policy "attachments_crud_own_insert" on public.attachments
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks
    where tasks.id = attachments.task_id
      and tasks.user_id = auth.uid()
  )
);
create policy "attachments_crud_own_update" on public.attachments
for update using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks
    where tasks.id = attachments.task_id
      and tasks.user_id = auth.uid()
  )
);
create policy "attachments_crud_own_delete" on public.attachments for delete using (user_id = auth.uid());

-- POLICIES: reward_items
create policy "reward_items_select_own_or_default" on public.reward_items
for select using (user_id = auth.uid() or user_id is null);
create policy "reward_items_insert_own" on public.reward_items for insert with check (user_id = auth.uid());
create policy "reward_items_update_own" on public.reward_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reward_items_delete_own" on public.reward_items for delete using (user_id = auth.uid());

-- POLICIES: reward_redemptions
create policy "reward_redemptions_crud_own_select" on public.reward_redemptions for select using (user_id = auth.uid());
create policy "reward_redemptions_crud_own_insert" on public.reward_redemptions
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.reward_items
    where reward_items.id = reward_redemptions.reward_item_id
      and (reward_items.user_id = auth.uid() or reward_items.user_id is null)
  )
);
create policy "reward_redemptions_crud_own_update" on public.reward_redemptions
for update using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.reward_items
    where reward_items.id = reward_redemptions.reward_item_id
      and (reward_items.user_id = auth.uid() or reward_items.user_id is null)
  )
);

-- POLICIES: leaf_transactions
create policy "leaf_transactions_select_own" on public.leaf_transactions for select using (user_id = auth.uid());
create policy "leaf_transactions_insert_own" on public.leaf_transactions
for insert with check (
  user_id = auth.uid()
  and (
    task_id is null
    or exists (
      select 1
      from public.tasks
      where tasks.id = leaf_transactions.task_id
        and tasks.user_id = auth.uid()
    )
  )
  and (
    reward_redemption_id is null
    or exists (
      select 1
      from public.reward_redemptions
      where reward_redemptions.id = leaf_transactions.reward_redemption_id
        and reward_redemptions.user_id = auth.uid()
    )
  )
);

-- DEFAULT REWARDS
insert into public.reward_items (user_id, title, description, cost, icon, is_default, is_active) values
  (null, 'Beijo', 'Resgatar um beijo.', 5, '💛', true, true),
  (null, 'Café especial', 'Um café especial para acompanhar o dia.', 10, '☕', true, true),
  (null, 'Noite de filme', 'Escolher um filme para assistir juntos.', 25, '🎬', true, true),
  (null, 'Jantar escolhido por ele', 'Escolher o jantar da vez.', 50, '🍽️', true, true),
  (null, 'Presente surpresa', 'Um presente surpresa combinado com carinho.', 80, '🎁', true, true),
  (null, 'Final de semana especial', 'Planejar um final de semana especial.', 150, '🌿', true, true),
  (null, 'Viagem', 'Guardar para uma viagem.', 300, '✈️', true, true);
