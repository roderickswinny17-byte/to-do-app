-- Run this in Supabase Dashboard -> SQL Editor -> New query.
-- No credentials needed for this step; you're already authenticated via the dashboard.

create table if not exists public.lists (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.todos (
  id bigint generated always as identity primary key,
  list_id bigint not null references public.lists (id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  inserted_at timestamptz not null default now()
);

create index if not exists todos_list_id_idx on public.todos (list_id);

alter table public.lists enable row level security;
alter table public.todos enable row level security;

-- This app has no auth yet, so lists and todos are public/shared across all visitors.
-- Revisit these policies if you add per-user accounts later.
create policy "Public read access" on public.lists
  for select to anon using (true);

create policy "Public insert access" on public.lists
  for insert to anon with check (true);

create policy "Public update access" on public.lists
  for update to anon using (true) with check (true);

create policy "Public delete access" on public.lists
  for delete to anon using (true);

create policy "Public read access" on public.todos
  for select to anon using (true);

create policy "Public insert access" on public.todos
  for insert to anon with check (true);

create policy "Public update access" on public.todos
  for update to anon using (true) with check (true);

create policy "Public delete access" on public.todos
  for delete to anon using (true);
