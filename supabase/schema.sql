-- Uruchom w Supabase Dashboard -> SQL Editor.
-- Posiłki: jedna unikalna UUID na wpis. payload przechowuje pełną strukturę edytowalnego posiłku.
create table if not exists public.meals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);
create index if not exists meals_by_user_updated on public.meals(user_id,updated_at desc);
alter table public.meals enable row level security;
drop policy if exists meals_select_own on public.meals;
drop policy if exists meals_insert_own on public.meals;
drop policy if exists meals_update_own on public.meals;
drop policy if exists meals_delete_own on public.meals;
create policy meals_select_own on public.meals for select to authenticated using ((select auth.uid()) = user_id);
create policy meals_insert_own on public.meals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy meals_update_own on public.meals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy meals_delete_own on public.meals for delete to authenticated using ((select auth.uid()) = user_id);

-- Tylko wybrane pomiary z eksportu Apple Zdrowie. Niczego nie wysyłamy do AI automatycznie.
create table if not exists public.health_measurements (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('weight','glucose','systolic','diastolic')),
  at timestamptz not null,
  value double precision not null,
  unit text not null,
  source text not null,
  primary key (user_id,id)
);
create index if not exists health_by_user_time on public.health_measurements(user_id,at desc);
alter table public.health_measurements enable row level security;
drop policy if exists health_select_own on public.health_measurements;
drop policy if exists health_insert_own on public.health_measurements;
drop policy if exists health_update_own on public.health_measurements;
drop policy if exists health_delete_own on public.health_measurements;
create policy health_select_own on public.health_measurements for select to authenticated using ((select auth.uid()) = user_id);
create policy health_insert_own on public.health_measurements for insert to authenticated with check ((select auth.uid()) = user_id);
create policy health_update_own on public.health_measurements for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy health_delete_own on public.health_measurements for delete to authenticated using ((select auth.uid()) = user_id);
