-- Baby VC Deal Room, part 2: connection health, join lock, PIN attempt limit,
-- one-call snapshot, the owner's ops console and automatic deletion of old data.
-- Run after 0001_init.sql.

-- ---------- games: join lock and last activity ----------
alter table games add column if not exists joins_locked boolean not null default false;
alter table games add column if not exists updated_at timestamptz not null default now();
create or replace function bvc_touch() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists games_touch on games;
create trigger games_touch before update on games for each row execute function bvc_touch();

-- ---------- PIN attempts: logged so guessing can be capped ----------
create table if not exists join_attempts (
  id bigint generated always as identity primary key,
  game_id uuid references games on delete cascade,   -- null: the game code itself was wrong
  user_id uuid not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists join_attempts_user on join_attempts (user_id, at);
create index if not exists join_attempts_game on join_attempts (game_id, at);
alter table join_attempts enable row level security;   -- no policies: only the RPCs below read it

-- Errors are returned, not raised, so the failed attempt stays logged.
-- Limits: 8 wrong tries per device in 10 minutes, 60 per game in 10 minutes.
create or replace function join_game(p_code text, p_pin text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g games; tid uuid; rl text; ft int; me members;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if (select count(*) from join_attempts where user_id = auth.uid() and not ok and at > now() - interval '10 minutes') >= 8 then
    return jsonb_build_object('error', 'TOO_MANY_ATTEMPTS');
  end if;
  select * into g from games where code = upper(trim(p_code));
  if g.id is null then
    insert into join_attempts (game_id, user_id, ok) values (null, auth.uid(), false);
    return jsonb_build_object('error', 'GAME_NOT_FOUND');
  end if;
  if (select count(*) from join_attempts where game_id = g.id and not ok and at > now() - interval '10 minutes') >= 60 then
    return jsonb_build_object('error', 'TOO_MANY_ATTEMPTS');
  end if;
  select * into me from members where game_id = g.id and user_id = auth.uid();
  select table_no into ft from fac_pins where game_id = g.id and pin = upper(trim(p_pin));
  if ft is not null then rl := 'facilitator';
  else
    select team_id into tid from team_pins where game_id = g.id and pin = upper(trim(p_pin));
    if tid is null then
      insert into join_attempts (game_id, user_id, ok) values (g.id, auth.uid(), false);
      return jsonb_build_object('error', 'WRONG_PIN');
    end if;
    rl := 'player';
  end if;
  -- Anti-cheat: once the game has started nobody can hop to the other squad (or table) to read its card.
  if g.phase <> 'lobby' and me.role = 'player' and (rl <> 'player' or me.team_id is distinct from tid) then
    return jsonb_build_object('error', 'TEAM_LOCKED');
  end if;
  if me.role = 'admin' then
    return jsonb_build_object('game_id', g.id, 'role', 'admin', 'team_id', null);   -- the game master stays game master
  end if;
  -- Join lock: a new device (a private window, a second phone) cannot get in. People already in can.
  if g.joins_locked and me.user_id is null then
    return jsonb_build_object('error', 'JOINS_LOCKED');
  end if;
  insert into members (game_id, user_id, role, team_id, name, tables)
    values (g.id, auth.uid(), rl, tid, left(coalesce(p_name, ''), 40), case when ft is null then '{}'::int[] else array[ft] end)
  on conflict (game_id, user_id) do update set role = excluded.role, team_id = excluded.team_id, name = excluded.name,
    tables = case when excluded.role = 'facilitator' and members.role = 'facilitator'
                  then (select array_agg(distinct x order by x) from unnest(members.tables || excluded.tables) x)
                  else excluded.tables end;
  insert into join_attempts (game_id, user_id, ok) values (g.id, auth.uid(), true);
  return jsonb_build_object('game_id', g.id, 'role', rl, 'team_id', tid, 'tables', case when ft is null then '[]'::jsonb else to_jsonb(array[ft]) end);
end $$;

-- ---------- presence: every device says «I'm here» every 15 seconds ----------
create table if not exists presence (
  game_id uuid not null references games on delete cascade,
  user_id uuid not null,
  last_seen timestamptz not null default now(),
  client jsonb not null default '{}',   -- online, realtime status, latency, clock skew, last error, device kind
  primary key (game_id, user_id)
);
alter table presence enable row level security;
drop policy if exists presence_admin on presence;
create policy presence_admin on presence for select using (bvc_role(game_id) = 'admin');

-- Returns the server clock, so every device can correct its own (timers stay in sync).
create or replace function bvc_heartbeat(p_game uuid, p_client jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
begin
  if p_game is not null and auth.uid() is not null and length(coalesce(p_client::text, '')) <= 2000 and bvc_role(p_game) is not null then
    insert into presence (game_id, user_id, last_seen, client) values (p_game, auth.uid(), now(), coalesce(p_client, '{}'))
    on conflict (game_id, user_id) do update set last_seen = now(), client = excluded.client;
  end if;
  return now();
end $$;

-- ---------- one-call snapshot: same row level security, one round trip instead of nine ----------
create or replace function bvc_snapshot(p_game uuid) returns jsonb language sql stable security invoker set search_path = public as $$
  select case when g.id is null then null else jsonb_build_object(
    'game', to_jsonb(g),
    'teams', coalesce((select jsonb_agg(to_jsonb(t)) from teams t where t.game_id = p_game), '[]'),
    'members', coalesce((select jsonb_agg(to_jsonb(m)) from members m where m.game_id = p_game), '[]'),
    'offers', coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at) from offers o where o.game_id = p_game), '[]'),
    'results', coalesce((select jsonb_agg(to_jsonb(r)) from results r where r.game_id = p_game), '[]'),
    'votes', coalesce((select jsonb_agg(to_jsonb(v)) from votes v where v.game_id = p_game), '[]'),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.id) from events e where e.game_id = p_game), '[]'),
    'pins', coalesce((select jsonb_object_agg(p.team_id, p.pin) from team_pins p where p.game_id = p_game), '{}'),
    'facPins', coalesce((select jsonb_object_agg(f.table_no, f.pin) from fac_pins f where f.game_id = p_game), '{}'),
    'presence', coalesce((select jsonb_object_agg(pr.user_id, jsonb_build_object('last_seen', pr.last_seen, 'client', pr.client)) from presence pr where pr.game_id = p_game), '{}'),
    'now', now()) end
  from (select 1) one left join games g on g.id = p_game
$$;

-- Players may rename their squad only in the lobby; the game master always.
drop policy if exists teams_rename on teams;
create policy teams_rename on teams for update using (
  bvc_role(game_id) = 'admin'
  or ((bvc_team(game_id)).id = id and exists (select 1 from games g where g.id = teams.game_id and g.phase = 'lobby')));

-- ---------- ops console (/easteregg): one password, stored only as a bcrypt hash ----------
create table if not exists ops_config (
  id int primary key default 1 check (id = 1),
  pass_hash text,
  fails int not null default 0,
  locked_until timestamptz
);
insert into ops_config (id) values (1) on conflict do nothing;
create table if not exists ops_sessions (user_id uuid primary key, expires_at timestamptz not null);
alter table ops_config enable row level security;     -- no policies
alter table ops_sessions enable row level security;   -- no policies

-- Run once from the Supabase SQL editor, never from the app:  select ops_set_password('your password');
create or replace function ops_set_password(p text) returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(coalesce(p, '')) < 10 then raise exception 'Use at least 10 characters'; end if;
  update ops_config set pass_hash = crypt(p, gen_salt('bf', 10)), fails = 0, locked_until = null where id = 1;
  delete from ops_sessions;
end $$;

create or replace function bvc_is_ops() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from ops_sessions where user_id = auth.uid() and expires_at > now()) $$;

-- 5 wrong passwords lock the console for 15 minutes, for everyone.
create or replace function ops_unlock(p text) returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare c ops_config;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into c from ops_config where id = 1 for update;
  if c.pass_hash is null then raise exception 'OPS_NOT_SET'; end if;
  if c.locked_until > now() then raise exception 'OPS_LOCKED'; end if;
  if crypt(coalesce(p, ''), c.pass_hash) = c.pass_hash then
    update ops_config set fails = 0 where id = 1;
    insert into ops_sessions values (auth.uid(), now() + interval '12 hours')
      on conflict (user_id) do update set expires_at = excluded.expires_at;
    return true;
  end if;
  update ops_config set fails = case when fails + 1 >= 5 then 0 else fails + 1 end,
                        locked_until = case when fails + 1 >= 5 then now() + interval '15 minutes' end where id = 1;
  return false;
end $$;

-- Everything, for the owner: games of the last 30 days with squads, PINs, devices and their health.
create or replace function ops_snapshot() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare anon_users bigint; cron_ok boolean := false;
begin
  if not bvc_is_ops() then raise exception 'OPS_ONLY'; end if;
  if to_regclass('auth.users') is not null then execute 'select count(*) from auth.users where is_anonymous' into anon_users; end if;
  if to_regclass('cron.job') is not null then execute 'select exists (select 1 from cron.job where jobname = ''bvc-purge'')' into cron_ok; end if;
  return jsonb_build_object(
    'now', now(),
    'games', coalesce((select jsonb_agg(jsonb_build_object(
        'game', to_jsonb(g),
        'teams', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('pin', p.pin) order by t.table_no, t.role), '[]')
                    from teams t left join team_pins p on p.team_id = t.id where t.game_id = g.id),
        'facPins', (select coalesce(jsonb_object_agg(f.table_no, f.pin), '{}') from fac_pins f where f.game_id = g.id),
        'members', (select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object('last_seen', pr.last_seen, 'client', pr.client)), '[]')
                      from members m left join presence pr on pr.game_id = m.game_id and pr.user_id = m.user_id where m.game_id = g.id),
        'offers', (select count(*) from offers o where o.game_id = g.id),
        'offersRound', (select count(*) from offers o where o.game_id = g.id and o.round = g.round),
        'results', (select coalesce(jsonb_agg(jsonb_build_object('table_no', r.table_no, 'round', r.round, 'status', r.status)), '[]') from results r where r.game_id = g.id),
        'fails10', (select count(*) from join_attempts a where a.game_id = g.id and not a.ok and a.at > now() - interval '10 minutes'),
        'blocked', (select count(*) from (select a.user_id from join_attempts a where not a.ok and a.at > now() - interval '10 minutes'
                      and a.user_id in (select b.user_id from join_attempts b where b.game_id = g.id) group by a.user_id having count(*) >= 8) x)
      ) order by g.created_at desc) from games g where g.created_at > now() - interval '30 days'), '[]'),
    'badCodes10', (select count(*) from join_attempts where game_id is null and at > now() - interval '10 minutes'),
    'oldGames', (select count(*) from games g where greatest(g.updated_at, coalesce((select max(last_seen) from presence pr where pr.game_id = g.id), g.updated_at)) < now() - interval '7 days'),
    'cron', cron_ok,
    'dbBytes', pg_database_size(current_database()),
    'anonUsers', anon_users,
    'opsFails', (select fails from ops_config where id = 1));
end $$;

-- The few fixes the console can apply.
create or replace function ops_action(p_kind text, p_game uuid default null, p_arg jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not bvc_is_ops() then raise exception 'OPS_ONLY'; end if;
  case p_kind
    when 'lock_joins' then update games set joins_locked = true where id = p_game;
    when 'unlock_joins' then update games set joins_locked = false where id = p_game;
    when 'reset_attempts' then delete from join_attempts where not ok and at > now() - interval '10 minutes';
    when 'kick' then delete from members where game_id = p_game and user_id = (p_arg ->> 'user_id')::uuid and role <> 'admin';
    when 'delete_game' then delete from games where id = p_game;
    when 'purge' then return bvc_purge(7);
    when 'logout' then delete from ops_sessions where user_id = auth.uid();
    else raise exception 'UNKNOWN_ACTION';
  end case;
  return '{}'::jsonb;
end $$;

-- ---------- automatic deletion: games idle for 7 days, with every row that hangs off them ----------
create or replace function bvc_purge(p_days int default 7) returns jsonb language plpgsql security definer set search_path = public as $$
declare n_games int; n_users int := 0;
begin
  delete from games g where greatest(g.updated_at, coalesce((select max(last_seen) from presence pr where pr.game_id = g.id), g.updated_at))
    < now() - make_interval(days => p_days);
  get diagnostics n_games = row_count;
  delete from join_attempts where at < now() - interval '1 day';
  delete from ops_sessions where expires_at < now();
  -- Anonymous players left without a game: their Supabase account goes too.
  if to_regclass('auth.users') is not null then
    execute format('delete from auth.users u where u.is_anonymous and u.created_at < now() - make_interval(days => %s)
                    and not exists (select 1 from public.members m where m.user_id = u.id)', p_days);
    get diagnostics n_users = row_count;
  end if;
  return jsonb_build_object('games', n_games, 'users', n_users);
end $$;

-- Every night at 03:17 (database time). Without pg_cron, run «select bvc_purge();» by hand after each session.
do $$ begin
  begin
    create extension if not exists pg_cron with schema pg_catalog;
  exception when others then raise notice 'pg_cron not available: run select bvc_purge(); by hand';
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('bvc-purge', '17 3 * * *', 'select public.bvc_purge(7)');
  end if;
end $$;

-- ---------- grants ----------
revoke all on function ops_set_password(text), bvc_purge(int) from public, anon, authenticated;
revoke all on function bvc_heartbeat(uuid, jsonb), bvc_snapshot(uuid), bvc_is_ops(), ops_unlock(text), ops_snapshot(), ops_action(text, uuid, jsonb), join_game(text, text, text) from public, anon;
grant execute on function bvc_heartbeat(uuid, jsonb), bvc_snapshot(uuid), bvc_is_ops(), ops_unlock(text), ops_snapshot(), ops_action(text, uuid, jsonb), join_game(text, text, text) to authenticated;
-- Helpers used by the policies: signed-in users only.
revoke execute on function bvc_member(uuid), bvc_role(uuid), bvc_is_staff(uuid), bvc_team(uuid), bvc_can_table(uuid, int), bvc_round_over(uuid, int), bvc_code(int, text) from public, anon;
grant execute on function bvc_member(uuid), bvc_role(uuid), bvc_is_staff(uuid), bvc_team(uuid), bvc_can_table(uuid, int), bvc_round_over(uuid, int) to authenticated;
revoke execute on function bvc_code(int, text) from authenticated;
