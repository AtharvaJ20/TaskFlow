-- Run this in your Supabase project: Dashboard → SQL Editor → New query

-- Tasks table
create table tasks (
  id text primary key,
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  completed boolean not null default false,
  priority text not null default 'medium',
  due_date text,
  tags text[] not null default '{}',
  subtasks jsonb not null default '[]',
  recurrence jsonb,
  list_id text,
  created_at text not null,
  completed_at text,
  time_logged integer not null default 0
);

alter table tasks enable row level security;

create policy "Users manage own tasks"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Lists table
create table task_lists (
  id text primary key,
  user_id uuid references auth.users not null,
  name text not null,
  color text not null,
  created_at text not null
);

alter table task_lists enable row level security;

create policy "Users manage own lists"
  on task_lists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable realtime for both tables (required for cross-device sync)
-- Dashboard → Database → Replication → enable tasks and task_lists
