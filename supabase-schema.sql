-- Worms Battle Tracker: uruchom całość w Supabase: SQL Editor > New query.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 40),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  participant_ids uuid[] not null check (cardinality(participant_ids) >= 2),
  winner_id uuid not null references public.players(id),
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint winner_is_participant check (winner_id = any(participant_ids))
);

create index matches_played_at_idx on public.matches (played_at);

alter table public.players enable row level security;
alter table public.matches enable row level security;

grant select, insert, update, delete on public.players to anon;
grant select, insert, update, delete on public.matches to anon;

create policy "Public players can be read" on public.players for select to anon using (true);
create policy "Public players can be created" on public.players for insert to anon with check (true);
create policy "Public players can be updated" on public.players for update to anon using (true) with check (true);
create policy "Public matches can be read" on public.matches for select to anon using (true);
create policy "Public matches can be created" on public.matches for insert to anon with check (true);
create policy "Public matches can be deleted" on public.matches for delete to anon using (true);

alter publication supabase_realtime add table public.players, public.matches;
