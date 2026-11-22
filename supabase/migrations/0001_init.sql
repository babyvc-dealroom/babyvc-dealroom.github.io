-- Baby VC Deal Room: schema, row level security and game RPCs.
-- Run once in the Supabase SQL editor (or `supabase db push`), then run supabase/seed_content.sql.

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  owner uuid not null,
  n_tables int not null check (n_tables between 1 and 20),
  n_rounds int not null check (n_rounds between 1 and 3),
  round int not null default 1,
  phase text not null default 'lobby' check (phase in ('lobby','brief','negotiate','sign','debrief','exit','ended')),
  phase_ends_at timestamptz,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);
-- Who may create games: only the emails listed here (see supabase/organisers.sql). No policies: invisible to clients.
create table organisers (email text primary key);
-- One facilitator PIN per table: a facilitator only reaches the tables whose PIN they entered.
create table fac_pins (game_id uuid not null references games on delete cascade, table_no int not null, pin text not null, primary key (game_id, table_no));
create table teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games on delete cascade,
  table_no int not null,
  role text not null check (role in ('startup','investor')),
  name text not null check (char_length(name) between 1 and 32),
  unique (game_id, table_no, role)
);
create table team_pins (team_id uuid primary key references teams on delete cascade, game_id uuid not null references games on delete cascade, pin text not null);
create table members (
  game_id uuid not null references games on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('admin','facilitator','player')),
  team_id uuid references teams on delete set null,
  name text not null default '',
  tables int[] not null default '{}',   -- facilitators: assigned tables
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
create table offers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games on delete cascade,
  table_no int not null,
  round int not null,
  from_role text not null check (from_role in ('startup','investor')),
  terms jsonb not null,
  note text check (char_length(note) <= 280),
  status text not null default 'open' check (status in ('open','accepted','rejected','countered','withdrawn')),
  author uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table results (
  game_id uuid not null references games on delete cascade,
  table_no int not null,
  round int not null,
  outcome text not null default 'signed' check (outcome in ('signed','argued','none')),
  terms jsonb not null default '{}',
  trades jsonb not null default '{}',
  rel jsonb not null default '{}',
  facts jsonb not null default '{}',
  breach jsonb not null default '{}',
  result jsonb,
  status text not null default 'signed' check (status in ('signed','scored')),
  offer_id uuid references offers on delete set null,
  updated_at timestamptz not null default now(),
  primary key (game_id, table_no, round)
);
create table votes (
  game_id uuid not null references games on delete cascade,
  table_no int not null,
  round int not null,
  from_role text not null check (from_role in ('startup','investor')),
  value int not null check (value between 0 and 10),
  primary key (game_id, table_no, round, from_role)
);
create table events (
  id bigint generated always as identity primary key,
  game_id uuid not null references games on delete cascade,
  table_no int,
  round int,
  kind text not null,
  audience text not null default 'all' check (audience in ('all','startup','investor','staff')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
-- Confidential scenario content: cards, envelopes and solutions, bilingual in body {it, en}
create table scenario_secrets (
  round int not null,
  kind text not null,          -- card_startup | card_investor | env_A | env_B | env_spare | solution | sweet | scoring
  audience text not null,      -- startup | investor | all | staff | reveal (sweet spot: players get it once the round is over)
  body jsonb not null,
  primary key (round, kind)
);
create index on offers (game_id, table_no, round);
create index on events (game_id, created_at);

-- ---------- helpers (security definer: avoid RLS recursion) ----------
create or replace function bvc_member(g uuid) returns members language sql stable security definer set search_path = public as
$$ select m from members m where m.game_id = g and m.user_id = auth.uid() $$;
create or replace function bvc_role(g uuid) returns text language sql stable security definer set search_path = public as
$$ select role from members where game_id = g and user_id = auth.uid() $$;
create or replace function bvc_is_staff(g uuid) returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select role in ('admin','facilitator') from members where game_id = g and user_id = auth.uid()), false) $$;
create or replace function bvc_team(g uuid) returns teams language sql stable security definer set search_path = public as
$$ select t from members m join teams t on t.id = m.team_id where m.game_id = g and m.user_id = auth.uid() $$;
-- Admin: every table. Facilitator: only the tables assigned to them.
create or replace function bvc_can_table(g uuid, t int) returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'admin' or (role = 'facilitator' and t = any(tables)) from members where game_id = g and user_id = auth.uid()), false) $$;
-- A round is over for everyone once the game has moved past it, or reached its debrief.
create or replace function bvc_round_over(g uuid, r int) returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select r < round or (r = round and phase in ('debrief','exit','ended')) from games where id = g), false) $$;

-- Anti-cheat: an offer may only carry the round's three levers, inside the public slider ranges.
create or replace function bvc_valid_terms(r int, t jsonb) returns boolean language plpgsql immutable as $$
declare spec jsonb := case r
    when 1 then '{"cap":[3,7,0],"deadEquity":[0,4,1],"rights":[0,4,1]}'
    when 2 then '{"pre":[7,15,0],"pool":[6,16,0],"board":[0,4,1]}'
    when 3 then '{"pre":[35,70,0],"mna":[0,4,1],"partner":[0,4,1]}' end;
  k text; v jsonb; lo numeric; hi numeric; x numeric;
begin
  if spec is null or jsonb_typeof(t) <> 'object' then return false; end if;
  for k, v in select * from jsonb_each(t) loop
    if k = 'poolCheck' and r = 2 then if jsonb_typeof(v) <> 'boolean' then return false; end if; continue; end if;
    if not spec ? k or jsonb_typeof(v) <> 'number' then return false; end if;
    lo := (spec -> k ->> 0)::numeric; hi := (spec -> k ->> 1)::numeric; x := (v #>> '{}')::numeric;
    if x < lo or x > hi or ((spec -> k ->> 2) = '1' and x <> trunc(x)) then return false; end if;
  end loop;
  return (select count(*) from jsonb_object_keys(spec) kk where t ? kk) = 3;   -- all three levers present
end $$;
create or replace function bvc_not_anon() returns boolean language sql stable as
$$ select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false $$;
create or replace function am_organiser() returns boolean language sql stable security definer set search_path = public as
$$ select bvc_not_anon() and exists (select 1 from organisers where lower(email) = lower(auth.jwt() ->> 'email')) $$;
create or replace function bvc_code(n int, alphabet text) returns text language sql volatile as
$$ select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') from generate_series(1, n) $$;

-- ---------- row level security ----------
alter table games enable row level security;
alter table fac_pins enable row level security;
alter table organisers enable row level security;
alter table teams enable row level security;
alter table team_pins enable row level security;
alter table members enable row level security;
alter table offers enable row level security;
alter table results enable row level security;
alter table votes enable row level security;
alter table events enable row level security;
alter table scenario_secrets enable row level security; -- no policies: reachable only through RPCs

create policy games_read on games for select using (bvc_role(id) is not null);
create policy games_admin on games for update using (bvc_role(id) = 'admin');
create policy games_delete on games for delete using (owner = auth.uid());

create policy facpins_admin on fac_pins for select using (bvc_role(game_id) = 'admin');
create policy pins_staff on team_pins for select using (bvc_role(game_id) = 'admin');

create policy teams_read on teams for select using (bvc_role(game_id) is not null);
create policy teams_rename on teams for update using (bvc_role(game_id) = 'admin' or (bvc_team(game_id)).id = id);
revoke update on teams from authenticated;
grant update (name) on teams to authenticated;

create policy members_read on members for select using (bvc_role(game_id) is not null);
create policy members_kick on members for delete using (bvc_role(game_id) = 'admin' and user_id <> auth.uid());

create policy offers_read on offers for select using (
  bvc_can_table(game_id, table_no) or (bvc_team(game_id)).table_no = table_no);
create policy offers_send on offers for insert with check (
  author = auth.uid()
  and (bvc_team(game_id)).table_no = table_no
  and (bvc_team(game_id)).role = from_role
  and exists (select 1 from games g where g.id = offers.game_id and g.round = offers.round and g.phase in ('negotiate','sign'))
  and not exists (select 1 from results r where r.game_id = offers.game_id and r.table_no = offers.table_no and r.round = offers.round)
  and bvc_valid_terms(round, terms));

-- Players see their own table at once; other tables only once the round is over (no peeking at live deals).
create policy results_read on results for select using (
  bvc_is_staff(game_id) or (bvc_team(game_id)).table_no = table_no or (bvc_role(game_id) is not null and bvc_round_over(game_id, round)));
create policy results_staff_ins on results for insert with check (bvc_can_table(game_id, table_no));
create policy results_staff_upd on results for update using (bvc_can_table(game_id, table_no));
create policy results_staff_del on results for delete using (bvc_can_table(game_id, table_no));

create policy votes_read on votes for select using (
  bvc_can_table(game_id, table_no) or ((bvc_team(game_id)).table_no = table_no and (bvc_team(game_id)).role = from_role));
create policy votes_cast on votes for insert with check (
  (bvc_team(game_id)).table_no = table_no and (bvc_team(game_id)).role = from_role);
create policy votes_change on votes for update using (
  (bvc_team(game_id)).table_no = table_no and (bvc_team(game_id)).role = from_role);

create policy events_read on events for select using (
  bvc_role(game_id) = 'admin'
  or (bvc_role(game_id) = 'facilitator' and (table_no is null or bvc_can_table(game_id, table_no)))
  or (bvc_role(game_id) = 'player' and (
    (audience = 'all' or audience = (bvc_team(game_id)).role)
    and (table_no is null or table_no = (bvc_team(game_id)).table_no))));
create policy events_staff on events for insert with check (
  case when table_no is null then bvc_role(game_id) = 'admin' else bvc_can_table(game_id, table_no) end);

-- A new offer replaces the previous open one at the table: it becomes a counter-offer.
create or replace function bvc_offer_counter() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update offers set status = 'countered'
   where game_id = new.game_id and table_no = new.table_no and round = new.round and status = 'open';
  return new;
end $$;
create trigger offers_counter before insert on offers for each row execute function bvc_offer_counter();

-- ---------- RPCs ----------
create or replace function create_game(p_name text, p_tables int, p_rounds int, p_settings jsonb, p_names jsonb default '[]')
returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid; t int; r text; v_code text; used text[] := '{}'; pin text; tid uuid; k int := 0;
  alpha constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null or not am_organiser() then raise exception 'NOT_ORGANISER'; end if;
  loop v_code := bvc_code(6, alpha); exit when not exists (select 1 from games where games.code = v_code); end loop;
  insert into games (code, name, owner, n_tables, n_rounds, settings) values (v_code, p_name, auth.uid(), p_tables, p_rounds, coalesce(p_settings, '{}'))
    returning id into g;
  insert into members (game_id, user_id, role, name) values (g, auth.uid(), 'admin', 'Game master');
  for t in 1..p_tables loop
    loop pin := bvc_code(5, alpha); exit when not pin = any(used); end loop; used := used || pin;
    insert into fac_pins values (g, t, pin);
    foreach r in array array['startup','investor'] loop
      insert into teams (game_id, table_no, role, name)
        values (g, t, r, coalesce(nullif(p_names ->> k, ''), case r when 'startup' then 'Startup ' else 'Investors ' end || t))
        returning id into tid;
      loop pin := bvc_code(5, alpha); exit when not pin = any(used); end loop; used := used || pin;
      insert into team_pins values (tid, g, pin);
      k := k + 1;
    end loop;
  end loop;
  return g;
end $$;

create or replace function join_game(p_code text, p_pin text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g games; tid uuid; rl text; ft int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into g from games where code = upper(trim(p_code));
  if g.id is null then raise exception 'GAME_NOT_FOUND'; end if;
  select table_no into ft from fac_pins where game_id = g.id and pin = upper(trim(p_pin));
  if ft is not null then rl := 'facilitator';
  else
    select team_id into tid from team_pins where game_id = g.id and pin = upper(trim(p_pin));
    if tid is null then raise exception 'WRONG_PIN'; end if;
    rl := 'player';
  end if;
  -- Anti-cheat: once the game has started nobody can hop to the other squad (or table) to read its card.
  if g.phase <> 'lobby' and exists (select 1 from members m where m.game_id = g.id and m.user_id = auth.uid() and m.role = 'player'
      and (rl <> 'player' or m.team_id is distinct from tid)) then
    raise exception 'TEAM_LOCKED';
  end if;
  if exists (select 1 from members where game_id = g.id and user_id = auth.uid() and role = 'admin') then
    return jsonb_build_object('game_id', g.id, 'role', 'admin', 'team_id', null);   -- the game master stays game master
  end if;
  insert into members (game_id, user_id, role, team_id, name, tables)
    values (g.id, auth.uid(), rl, tid, left(coalesce(p_name, ''), 40), case when ft is null then '{}'::int[] else array[ft] end)
  on conflict (game_id, user_id) do update set role = excluded.role, team_id = excluded.team_id, name = excluded.name,
    -- a facilitator entering a second table PIN covers both tables; switching to a squad PIN drops them
    tables = case when excluded.role = 'facilitator' and members.role = 'facilitator'
                  then (select array_agg(distinct x order by x) from unnest(members.tables || excluded.tables) x)
                  else excluded.tables end;
  return jsonb_build_object('game_id', g.id, 'role', rl, 'team_id', tid, 'tables', case when ft is null then '[]'::jsonb else to_jsonb(array[ft]) end);
end $$;

create or replace function accept_offer(p_offer uuid) returns void language plpgsql security definer set search_path = public as $$
declare o offers; me teams; g games;
begin
  select * into o from offers where id = p_offer for update;
  if o.id is null or o.status <> 'open' then raise exception 'OFFER_CLOSED'; end if;
  me := bvc_team(o.game_id);
  if me.id is null or me.table_no <> o.table_no or me.role = o.from_role then raise exception 'NOT_YOUR_OFFER'; end if;
  select * into g from games where id = o.game_id;
  if g.round <> o.round or g.phase not in ('negotiate','sign') then raise exception 'ROUND_CLOSED'; end if;
  if exists (select 1 from results where game_id = o.game_id and table_no = o.table_no and round = o.round) then raise exception 'ALREADY_SIGNED'; end if;
  update offers set status = 'accepted' where id = o.id;
  update offers set status = 'withdrawn' where game_id = o.game_id and table_no = o.table_no and round = o.round and status = 'open';
  insert into results (game_id, table_no, round, outcome, terms, status, offer_id) values (o.game_id, o.table_no, o.round, 'signed', o.terms, 'signed', o.id);
  insert into events (game_id, table_no, round, kind, payload) values (o.game_id, null, o.round, 'signed', jsonb_build_object('table_no', o.table_no));   -- no terms: other tables must not see them
end $$;

create or replace function reject_offer(p_offer uuid) returns void language plpgsql security definer set search_path = public as $$
declare o offers; me teams;
begin
  select * into o from offers where id = p_offer for update;
  if o.id is null or o.status <> 'open' then raise exception 'OFFER_CLOSED'; end if;
  me := bvc_team(o.game_id);
  if me.id is null or me.table_no <> o.table_no then raise exception 'NOT_YOUR_OFFER'; end if;
  update offers set status = case when me.role = o.from_role then 'withdrawn' else 'rejected' end where id = o.id;
end $$;

-- Opens an envelope of the current round for one table (or every table when p_table is null).
create or replace function open_envelope(p_game uuid, p_table int, p_key text) returns void language plpgsql security definer set search_path = public as $$
declare g games; s scenario_secrets; t int;
begin
  if p_table is null and bvc_role(p_game) <> 'admin' then raise exception 'ADMIN_ONLY'; end if;
  if p_table is not null and not bvc_can_table(p_game, p_table) then raise exception 'NOT_YOUR_TABLE'; end if;
  select * into g from games where id = p_game;
  select * into s from scenario_secrets where round = g.round and kind = 'env_' || p_key;
  if s.round is null then raise exception 'NO_ENVELOPE'; end if;
  for t in select generate_series(1, g.n_tables) loop
    if p_table is null or p_table = t then
      insert into events (game_id, table_no, round, kind, audience, payload)
        values (p_game, t, g.round, 'envelope', s.audience, jsonb_build_object('key', p_key, 'body', s.body));
    end if;
  end loop;
end $$;

-- Cards a member may read: players get their side's card up to the current round, staff get everything.
create or replace function my_cards(p_game uuid) returns setof scenario_secrets language plpgsql stable security definer set search_path = public as $$
declare g games; me teams; staff boolean;
begin
  select * into g from games where id = p_game;
  staff := bvc_is_staff(p_game);
  if staff then return query select * from scenario_secrets where round <= g.n_rounds order by round, kind; return; end if;
  me := bvc_team(p_game);
  if me.id is null then return; end if;
  return query select * from scenario_secrets
    where (round <= g.round and g.phase <> 'lobby' and kind = 'card_' || me.role)
       or (kind = 'sweet' and bvc_round_over(p_game, round))
    order by round, kind;
end $$;

revoke all on function create_game, join_game, accept_offer, reject_offer, open_envelope, my_cards, am_organiser from public, anon;
grant execute on function create_game, join_game, accept_offer, reject_offer, open_envelope, my_cards, am_organiser to authenticated;

-- ---------- realtime ----------
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then create publication supabase_realtime; end if;
end $$;
alter publication supabase_realtime add table games, teams, members, offers, results, votes, events;
