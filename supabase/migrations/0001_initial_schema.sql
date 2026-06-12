-- Slothdule initial schema draft
-- Review before running in production.

create extension if not exists "pgcrypto";

-- ENUMS
create type public.task_status as enum ('todo', 'in_progress', 'waiting', 'done', 'archived');
create type public.task_priority as enum ('low', 'medium', 'high', 'critical');
create type public.work_context as enum ('personal', 'internal_work', 'client_work');
create type public.attachment_type as enum ('link', 'audio', 'file');
create type public.reminder_channel as enum ('push', 'app', 'telegram', 'whatsapp');
create type public.reminder_horizon as enum ('short', 'medium', 'long');

-- UPDATED_AT TRIGGER FUNCTION
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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
  created_at timestamptz not null default now(),
  unique (user_id, slug)
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
  category_id uuid references public.categories(id) on delete set null,
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
  title text,
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

-- FUTURE GAMIFICATION TABLES
create table public.reward_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cost integer not null check (cost >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_item_id uuid not null references public.reward_items(id) on delete cascade,
  cost integer not null check (cost >= 0),
  status text not null default 'requested',
  redeemed_at timestamptz not null default now()
);

-- INDEXES
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
alter table public.coin_transactions enable row level security;
alter table public.reward_redemptions enable row level security;

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

-- helper pattern repeated for user-owned tables
create policy "clients_crud_own_select" on public.clients for select using (user_id = auth.uid());
create policy "clients_crud_own_insert" on public.clients for insert with check (user_id = auth.uid());
create policy "clients_crud_own_update" on public.clients for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clients_crud_own_delete" on public.clients for delete using (user_id = auth.uid());

create policy "projects_crud_own_select" on public.projects for select using (user_id = auth.uid());
create policy "projects_crud_own_insert" on public.projects for insert with check (user_id = auth.uid());
create policy "projects_crud_own_update" on public.projects for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "projects_crud_own_delete" on public.projects for delete using (user_id = auth.uid());

create policy "tasks_crud_own_select" on public.tasks for select using (user_id = auth.uid());
create policy "tasks_crud_own_insert" on public.tasks for insert with check (user_id = auth.uid());
create policy "tasks_crud_own_update" on public.tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks_crud_own_delete" on public.tasks for delete using (user_id = auth.uid());

create policy "subtasks_crud_own_select" on public.subtasks for select using (user_id = auth.uid());
create policy "subtasks_crud_own_insert" on public.subtasks for insert with check (user_id = auth.uid());
create policy "subtasks_crud_own_update" on public.subtasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subtasks_crud_own_delete" on public.subtasks for delete using (user_id = auth.uid());

create policy "reminders_crud_own_select" on public.reminders for select using (user_id = auth.uid());
create policy "reminders_crud_own_insert" on public.reminders for insert with check (user_id = auth.uid());
create policy "reminders_crud_own_update" on public.reminders for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reminders_crud_own_delete" on public.reminders for delete using (user_id = auth.uid());

create policy "attachments_crud_own_select" on public.attachments for select using (user_id = auth.uid());
create policy "attachments_crud_own_insert" on public.attachments for insert with check (user_id = auth.uid());
create policy "attachments_crud_own_update" on public.attachments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "attachments_crud_own_delete" on public.attachments for delete using (user_id = auth.uid());

create policy "reward_items_crud_own_select" on public.reward_items for select using (user_id = auth.uid());
create policy "reward_items_crud_own_insert" on public.reward_items for insert with check (user_id = auth.uid());
create policy "reward_items_crud_own_update" on public.reward_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reward_items_crud_own_delete" on public.reward_items for delete using (user_id = auth.uid());

create policy "coin_transactions_select_own" on public.coin_transactions for select using (user_id = auth.uid());
create policy "coin_transactions_insert_own" on public.coin_transactions for insert with check (user_id = auth.uid());

create policy "reward_redemptions_crud_own_select" on public.reward_redemptions for select using (user_id = auth.uid());
create policy "reward_redemptions_crud_own_insert" on public.reward_redemptions for insert with check (user_id = auth.uid());
create policy "reward_redemptions_crud_own_update" on public.reward_redemptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- DEFAULT CATEGORIES
insert into public.categories (user_id, name, slug, color, is_default) values
  (null, 'Trabalho', 'trabalho', '#5F7A61', true),
  (null, 'Pessoal', 'pessoal', '#C49A4A', true),
  (null, 'Estudos', 'estudos', '#6F9B6D', true),
  (null, 'Mercado', 'mercado', '#D69E45', true),
  (null, 'Casa', 'casa', '#EFE3D0', true),
  (null, 'Saúde', 'saude', '#8FAF8F', true),
  (null, 'Ideias', 'ideias', '#BFA7D8', true),
  (null, 'Financeiro', 'financeiro', '#C46A4A', true);
