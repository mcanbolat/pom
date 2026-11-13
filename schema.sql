-- =====================================================================
--  POM Games — shared database schema (Supabase / Postgres)
--  Run this whole file once in Supabase → SQL Editor → New query → Run.
--  It is safe to re-run. It lives alongside the newsvendor tables
--  (all objects are prefixed pom_) and uses the same instructor login.
--
--  Design
--   * One generic data model for every chapter game:
--       pom_sessions  one class run of one game (game key + params jsonb)
--       pom_players   one student in a session (condition, final summary)
--       pom_events    one row per (player, round, kind) with a jsonb payload
--   * Each session gets a random seed, so every student in a session
--     faces the same random events (games use a seeded RNG).
--   * Students never touch tables; they call five functions with the
--     public key. The instructor logs in and RLS shows only own sessions.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.pom_sessions (
  id          uuid primary key default gen_random_uuid(),
  game        text not null check (game ~ '^[a-z0-9_-]{2,30}$'),
  code        text not null unique check (code ~ '^[A-Z0-9]{3,12}$'),
  title       text not null default 'POM game',
  params      jsonb not null default '{}'::jsonb,
  is_open     boolean not null default true,
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.pom_players (
  id          uuid primary key default gen_random_uuid(),
  token       uuid not null default gen_random_uuid(),
  session_id  uuid not null references public.pom_sessions(id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 1 and 40),
  student_ref text check (char_length(student_ref) <= 60),
  condition   text,
  summary     jsonb,
  user_agent  text,
  joined_at   timestamptz not null default now(),
  finished_at timestamptz
);
create unique index if not exists pom_players_nick_uq on public.pom_players (session_id, lower(nickname));

create table if not exists public.pom_events (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.pom_sessions(id) on delete cascade,
  player_id   uuid not null references public.pom_players(id) on delete cascade,
  round       int  not null default 0,
  kind        text not null check (kind ~ '^[a-z0-9_]{1,30}$'),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (player_id, round, kind)
);
create index if not exists pom_events_session_idx on public.pom_events (session_id, round);

-- ---------------------------------------------------------------------
--  Triggers: seed on create, lock game/params once students have joined
-- ---------------------------------------------------------------------
create or replace function public._pom_session_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not (new.params ? 'seed') then
      new.params := new.params || jsonb_build_object('seed', 1 + floor(random() * 2147483000)::bigint);
    end if;
  elsif (new.game is distinct from old.game or new.params is distinct from old.params)
        and exists (select 1 from pom_players where session_id = old.id) then
    raise exception 'Game settings cannot change after students have joined. Create a new session instead.';
  end if;
  new.code := upper(new.code);
  return new;
end $$;
drop trigger if exists pom_session_defaults on public.pom_sessions;
create trigger pom_session_defaults before insert or update on public.pom_sessions
  for each row execute function public._pom_session_defaults();

-- ---------------------------------------------------------------------
--  Student-facing functions (callable with the public key)
-- ---------------------------------------------------------------------
create or replace function public._pom_state(p_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'player_id', p.id, 'token', p.token, 'nickname', p.nickname, 'condition', p.condition,
    'finished', p.finished_at is not null, 'summary', p.summary,
    'session', json_build_object('code', s.code, 'title', s.title, 'game', s.game,
                                 'params', s.params, 'is_open', s.is_open),
    'events', coalesce((select json_agg(json_build_object('round', e.round, 'kind', e.kind, 'data', e.data)
                                        order by e.round, e.id)
                        from pom_events e where e.player_id = p.id), '[]'::json))
  from pom_players p join pom_sessions s on s.id = p.session_id
  where p.id = p_id
$$;

create or replace function public.pom_join(p_code text, p_game text, p_nickname text,
                                           p_student_ref text default null, p_user_agent text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  s   pom_sessions;
  pid uuid;
  conds text[];
  cond text;
begin
  select * into s from pom_sessions where code = upper(trim(p_code));
  if s.id is null then raise exception 'No session with code %', upper(trim(p_code)); end if;
  if s.game <> p_game then raise exception 'Code % is for a different game (%).', s.code, s.game; end if;
  if not s.is_open then raise exception 'This session is closed.'; end if;
  if coalesce(trim(p_nickname), '') = '' then raise exception 'Please enter a nickname.'; end if;
  if exists (select 1 from pom_players where session_id = s.id and lower(nickname) = lower(trim(p_nickname))) then
    raise exception 'Nickname "%" is taken in this session. Pick another one.', trim(p_nickname);
  end if;

  -- condition: fixed, or balanced randomisation over params.conditions
  select array_agg(x) into conds from jsonb_array_elements_text(coalesce(s.params->'conditions', '[]'::jsonb)) x;
  if coalesce(s.params->>'assignment', 'random') <> 'random' then
    cond := s.params->>'assignment';
  elsif conds is not null and array_length(conds, 1) > 0 then
    select c into cond from unnest(conds) c
      left join (select condition, count(*) n from pom_players where session_id = s.id group by condition) k
        on k.condition = c
      order by coalesce(k.n, 0), random() limit 1;
  end if;

  insert into pom_players (session_id, nickname, student_ref, condition, user_agent)
  values (s.id, trim(p_nickname), nullif(trim(p_student_ref), ''), cond, left(p_user_agent, 300))
  returning id into pid;
  return _pom_state(pid);
end $$;

create or replace function public.pom_resume(p_player uuid, p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pom_players where id = p_player and token = p_token) then
    raise exception 'Player not found.';
  end if;
  return _pom_state(p_player);
end $$;

create or replace function public.pom_log(p_player uuid, p_token uuid, p_round int, p_kind text, p_data jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare p pom_players; s pom_sessions;
begin
  select * into p from pom_players where id = p_player and token = p_token;
  if p.id is null then raise exception 'Player not found.'; end if;
  select * into s from pom_sessions where id = p.session_id;
  if not s.is_open then raise exception 'This session is closed.'; end if;
  if p.finished_at is not null then raise exception 'You have already finished this game.'; end if;
  if length(p_data::text) > 8000 then raise exception 'Payload too large.'; end if;
  if p_round < 0 or p_round > 500 then raise exception 'Bad round.'; end if;
  insert into pom_events (session_id, player_id, round, kind, data)
  values (p.session_id, p.id, p_round, p_kind, coalesce(p_data, '{}'::jsonb))
  on conflict (player_id, round, kind) do update set data = excluded.data, updated_at = now();
  return json_build_object('ok', true);
end $$;

create or replace function public.pom_finish(p_player uuid, p_token uuid, p_summary jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare p pom_players;
begin
  select * into p from pom_players where id = p_player and token = p_token;
  if p.id is null then raise exception 'Player not found.'; end if;
  if length(p_summary::text) > 8000 then raise exception 'Payload too large.'; end if;
  update pom_players set summary = p_summary, finished_at = coalesce(finished_at, now()) where id = p.id;
  return json_build_object('ok', true);
end $$;

create or replace function public.pom_leaderboard(p_code text)
returns table (nickname text, condition text, summary jsonb)
language sql stable security definer set search_path = public as $$
  select p.nickname, p.condition, p.summary
  from pom_players p join pom_sessions s on s.id = p.session_id
  where s.code = upper(trim(p_code)) and p.finished_at is not null
$$;

create or replace function public.pom_ping()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from pom_sessions where false
$$;

-- ---------------------------------------------------------------------
--  Permissions & row-level security
-- ---------------------------------------------------------------------
alter table public.pom_sessions enable row level security;
alter table public.pom_players  enable row level security;
alter table public.pom_events   enable row level security;
revoke all on public.pom_sessions, public.pom_players, public.pom_events from anon;
grant select, insert, update, delete on public.pom_sessions to authenticated;
grant select, delete on public.pom_players, public.pom_events to authenticated;

drop policy if exists pom_sessions_owner on public.pom_sessions;
create policy pom_sessions_owner on public.pom_sessions
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists pom_players_owner on public.pom_players;
create policy pom_players_owner on public.pom_players for select to authenticated
  using (exists (select 1 from pom_sessions s where s.id = session_id and s.owner = auth.uid()));
drop policy if exists pom_players_owner_del on public.pom_players;
create policy pom_players_owner_del on public.pom_players for delete to authenticated
  using (exists (select 1 from pom_sessions s where s.id = session_id and s.owner = auth.uid()));

drop policy if exists pom_events_owner on public.pom_events;
create policy pom_events_owner on public.pom_events for select to authenticated
  using (exists (select 1 from pom_sessions s where s.id = session_id and s.owner = auth.uid()));
drop policy if exists pom_events_owner_del on public.pom_events;
create policy pom_events_owner_del on public.pom_events for delete to authenticated
  using (exists (select 1 from pom_sessions s where s.id = session_id and s.owner = auth.uid()));

revoke execute on function public._pom_state(uuid) from public, anon, authenticated;
revoke execute on function public._pom_session_defaults() from public, anon, authenticated;
grant execute on function public.pom_join(text, text, text, text, text)     to anon, authenticated;
grant execute on function public.pom_resume(uuid, uuid)                     to anon, authenticated;
grant execute on function public.pom_log(uuid, uuid, int, text, jsonb)      to anon, authenticated;
grant execute on function public.pom_finish(uuid, uuid, jsonb)              to anon, authenticated;
grant execute on function public.pom_leaderboard(text)                      to anon, authenticated;
grant execute on function public.pom_ping()                                 to anon, authenticated;

-- ---------------------------------------------------------------------
--  Handy flat view for SQL analysis (one row per event, owner-only)
-- ---------------------------------------------------------------------
create or replace view public.pom_v_events with (security_invoker = true) as
  select s.game, s.code, s.title, p.nickname, p.student_ref, p.condition,
         e.round, e.kind, e.data, e.created_at, e.player_id, e.session_id
  from pom_events e
  join pom_players p on p.id = e.player_id
  join pom_sessions s on s.id = e.session_id;
revoke all on public.pom_v_events from anon;
grant select on public.pom_v_events to authenticated;
