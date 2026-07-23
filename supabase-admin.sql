-- Uruchom ten plik po supabase-schema.sql, aby usuwanie byĹ‚o dostÄ™pne tylko dla administratora.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$ select exists (select 1 from public.admins where user_id = auth.uid()); $$;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Public players can read" on public.players;
drop policy if exists "Public players can be created" on public.players;
drop policy if exists "Public players can be updated" on public.players;
drop policy if exists "Public matches can be read" on public.matches;
drop policy if exists "Public matches can be created" on public.matches;
drop policy if exists "Public matches can be deleted" on public.matches;

grant select, insert on public.players to anon, authenticated;
grant select, insert on public.matches to anon, authenticated;
grant update on public.players to authenticated;
grant delete on public.matches to authenticated;

create policy "Players public read" on public.players for select to anon, authenticated using (true);
create policy "Players public insert" on public.players for insert to anon, authenticated with check (true);
create policy "Matches public read" on public.matches for select to anon, authenticated using (true);
create policy "Matches public insert" on public.matches for insert to anon, authenticated with check (true);
create policy "Administrators update players" on public.players for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Administrators delete matches" on public.matches for delete to authenticated using ((select public.is_admin()));

-- Po utworzeniu uĹĽytkownika admin@wormstracker.app w Authentication > Users uruchom:
insert into public.admins (user_id)
select id from auth.users where email = 'admin@wormstracker.app'
on conflict do nothing;
