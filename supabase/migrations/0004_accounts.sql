-- Baby VC Deal Room, part 4: anyone can create an organiser account; the owner approves it.
-- Why approval: a game master sees the solutions and both squads' cards. Without it, a player could
-- open an account during a session, create a game and read the answers.

create table if not exists organiser_requests (
  user_id uuid primary key,
  email text not null,
  name text not null default '',
  org text not null default '',
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table organiser_requests enable row level security;   -- no policies: only the functions below

create table if not exists app_config (
  id int primary key default 1 check (id = 1),
  open_signup boolean not null default false,   -- true: new accounts are approved at once
  max_live_games int not null default 5          -- games per organiser not ended and active in the last 7 days
);
insert into app_config (id) values (1) on conflict do nothing;
alter table app_config enable row level security;

-- approved | pending | rejected | none
create or replace function organiser_status() returns text language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null or not bvc_not_anon() then 'none'
    when exists (select 1 from organisers where lower(email) = lower(auth.jwt() ->> 'email')) then 'approved'
    else coalesce((select status from organiser_requests where user_id = auth.uid()), 'none') end
$$;

-- Called right after sign-up (or later, from the organiser area).
create or replace function request_organiser(p_name text, p_org text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email'); st text;
begin
  if auth.uid() is null or not bvc_not_anon() or v_email is null then raise exception 'NOT_SIGNED_IN'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'NAME_REQUIRED'; end if;
  st := organiser_status();
  if st in ('approved', 'rejected') then return st; end if;
  insert into organiser_requests (user_id, email, name, org, note)
    values (auth.uid(), v_email, left(trim(p_name), 80), left(trim(coalesce(p_org, '')), 120), left(trim(coalesce(p_note, '')), 500))
  on conflict (user_id) do update set name = excluded.name, org = excluded.org, note = excluded.note;
  if (select open_signup from app_config where id = 1) then
    insert into organisers (email) values (v_email) on conflict do nothing;
    update organiser_requests set status = 'approved', decided_at = now() where user_id = auth.uid();
    return 'approved';
  end if;
  return 'pending';
end $$;

-- GDPR: an organiser can delete their account and everything they created, at any time.
create or replace function delete_my_account() returns void language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null or not bvc_not_anon() then raise exception 'NOT_SIGNED_IN'; end if;
  delete from games where owner = auth.uid();
  delete from organiser_requests where user_id = auth.uid();
  delete from organisers where lower(email) = v_email;
  delete from ops_sessions where user_id = auth.uid();
  if to_regclass('auth.users') is not null then execute 'delete from auth.users where id = $1' using auth.uid(); end if;
end $$;

-- Games are capped per organiser, so an account cannot fill the free database.
create or replace function create_game(p_name text, p_tables int, p_rounds int, p_settings jsonb, p_names jsonb default '[]')
returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid; t int; r text; v_code text; used text[] := '{}'; pin text; tid uuid; k int := 0;
  alpha constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null or not am_organiser() then raise exception 'NOT_ORGANISER'; end if;
  if (select count(*) from games where owner = auth.uid() and phase <> 'ended' and updated_at > now() - interval '7 days')
     >= (select max_live_games from app_config where id = 1) then raise exception 'TOO_MANY_GAMES'; end if;
  loop v_code := bvc_code(6, alpha); exit when not exists (select 1 from games where games.code = v_code); end loop;
  insert into games (code, name, owner, n_tables, n_rounds, settings) values (v_code, left(p_name, 60), auth.uid(), p_tables, p_rounds, coalesce(p_settings, '{}'))
    returning id into g;
  insert into members (game_id, user_id, role, name) values (g, auth.uid(), 'admin', 'Game master');
  for t in 1..p_tables loop
    loop pin := bvc_code(5, alpha); exit when not pin = any(used); end loop; used := used || pin;
    insert into fac_pins values (g, t, pin);
    foreach r in array array['startup','investor'] loop
      insert into teams (game_id, table_no, role, name)
        values (g, t, r, coalesce(nullif(left(p_names ->> k, 32), ''), case r when 'startup' then 'Startup ' else 'Investors ' end || t))
        returning id into tid;
      loop pin := bvc_code(5, alpha); exit when not pin = any(used); end loop; used := used || pin;
      insert into team_pins values (tid, g, pin);
      k := k + 1;
    end loop;
  end loop;
  return g;
end $$;

-- Ops console: account requests and the auto-approve switch.
create or replace function ops_accounts() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not bvc_is_ops() then raise exception 'OPS_ONLY'; end if;
  return jsonb_build_object(
    'requests', coalesce((select jsonb_agg(to_jsonb(r) order by r.status = 'pending' desc, r.created_at desc) from organiser_requests r
                           where r.status = 'pending' or r.created_at > now() - interval '30 days'), '[]'),
    'organisers', (select count(*) from organisers),
    'openSignup', (select open_signup from app_config where id = 1),
    'maxLiveGames', (select max_live_games from app_config where id = 1));
end $$;

create or replace function ops_account_action(p_kind text, p_user uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if not bvc_is_ops() then raise exception 'OPS_ONLY'; end if;
  select email into v_email from organiser_requests where user_id = p_user;
  case p_kind
    when 'approve' then
      if v_email is null then raise exception 'NO_REQUEST'; end if;
      insert into organisers (email) values (lower(v_email)) on conflict do nothing;
      update organiser_requests set status = 'approved', decided_at = now() where user_id = p_user;
    when 'reject' then
      delete from organisers where lower(email) = lower(v_email);
      update organiser_requests set status = 'rejected', decided_at = now() where user_id = p_user;
    when 'open_signup' then update app_config set open_signup = true where id = 1;
    when 'close_signup' then update app_config set open_signup = false where id = 1;
    else raise exception 'UNKNOWN_ACTION';
  end case;
end $$;

-- Deletion now also covers organiser accounts: rejected requests after 30 days,
-- and accounts not approved and not used for 12 months.
create or replace function bvc_purge(p_days int default 7) returns jsonb language plpgsql security definer set search_path = public as $$
declare n_games int; n_users int := 0; n_acc int := 0;
begin
  delete from games g where greatest(g.updated_at, coalesce((select max(last_seen) from presence pr where pr.game_id = g.id), g.updated_at))
    < now() - make_interval(days => p_days);
  get diagnostics n_games = row_count;
  delete from join_attempts where at < now() - interval '1 day';
  delete from ops_sessions where expires_at < now();
  if to_regclass('auth.users') is not null then
    execute format('delete from auth.users u where u.is_anonymous and u.created_at < now() - make_interval(days => %s)
                    and not exists (select 1 from public.members m where m.user_id = u.id)', p_days);
    get diagnostics n_users = row_count;
    execute 'delete from auth.users u where not u.is_anonymous
               and coalesce(u.last_sign_in_at, u.created_at) < now() - interval ''12 months''
               and not exists (select 1 from public.organisers o where lower(o.email) = lower(u.email))';
    get diagnostics n_acc = row_count;
  end if;
  delete from organiser_requests r where (r.status = 'rejected' and r.decided_at < now() - interval '30 days')
    or (to_regclass('auth.users') is not null and r.status <> 'approved' and r.created_at < now() - interval '12 months');
  return jsonb_build_object('games', n_games, 'users', n_users, 'accounts', n_acc);
end $$;

revoke all on function bvc_purge(int) from public, anon, authenticated;
revoke all on function organiser_status(), request_organiser(text, text, text), delete_my_account(), ops_accounts(), ops_account_action(text, uuid), create_game(text, int, int, jsonb, jsonb) from public, anon;
grant execute on function organiser_status(), request_organiser(text, text, text), delete_my_account(), ops_accounts(), ops_account_action(text, uuid), create_game(text, int, int, jsonb, jsonb) to authenticated;
