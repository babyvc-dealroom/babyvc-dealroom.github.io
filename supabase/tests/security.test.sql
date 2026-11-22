-- Database security tests: who can see and do what. Every line prints «ok ...» or stops the run.
\set ON_ERROR_STOP 1
\set owner '{"sub":"00000000-0000-0000-0000-00000000000a","is_anonymous":false,"email":"owner@babyvc.it"}'
\set stranger '{"sub":"00000000-0000-0000-0000-00000000000b","is_anonymous":false,"email":"someone@else.it"}'
\set anonu '{"sub":"00000000-0000-0000-0000-00000000000c","is_anonymous":true}'
\set p1 '{"sub":"00000000-0000-0000-0000-000000000001","is_anonymous":true}'
\set p2 '{"sub":"00000000-0000-0000-0000-000000000002","is_anonymous":true}'
\set p3 '{"sub":"00000000-0000-0000-0000-000000000003","is_anonymous":true}'
\set p4 '{"sub":"00000000-0000-0000-0000-000000000004","is_anonymous":true}'
\set p5 '{"sub":"00000000-0000-0000-0000-000000000005","is_anonymous":true}'
\set newbie '{"sub":"00000000-0000-0000-0000-00000000000d","is_anonymous":false,"email":"newbie@school.it"}'
\set fac '{"sub":"00000000-0000-0000-0000-0000000000f1","is_anonymous":true}'

create function t_ok(c boolean, msg text) returns void language plpgsql as $$
begin if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  %', msg; end $$;
create function t_fails(q text, expect text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if expect is not null and position(expect in sqlerrm) = 0 then raise exception 'FAIL: % (wrong error: %)', msg, sqlerrm; end if;
    raise notice 'ok  %', msg; return;
  end;
  raise exception 'FAIL: % (no error)', msg;
end $$;
create function t_as(c text) returns void language sql as $$ select set_config('request.jwt.claims', c, false) $$;
insert into organisers values ('owner@babyvc.it');
insert into auth.users (id) select ('00000000-0000-0000-0000-00000000000' || x)::uuid from unnest(array['1','2','3','4','5','c']) x;
insert into auth.users (id, email, is_anonymous) values ('00000000-0000-0000-0000-00000000000a', 'owner@babyvc.it', false), ('00000000-0000-0000-0000-00000000000b', 'someone@else.it', false), ('00000000-0000-0000-0000-00000000000d', 'newbie@school.it', false);

set role authenticated;

-- ---------- organisers ----------
select t_as(:'anonu');
select t_fails($$select create_game('X', 2, 3, '{}')$$, 'NOT_ORGANISER', 'an anonymous player cannot create a game');
select t_as(:'stranger');
select t_fails($$select create_game('X', 2, 3, '{}')$$, 'NOT_ORGANISER', 'a signed-in stranger cannot create a game');
select t_as(:'owner');
select create_game('Test', 2, 3, '{}') as gid \gset
select code from games where id = :'gid' \gset
select p.pin as s1 from team_pins p join teams t on t.id = p.team_id where t.table_no = 1 and t.role = 'startup' \gset
select p.pin as i1 from team_pins p join teams t on t.id = p.team_id where t.table_no = 1 and t.role = 'investor' \gset
select p.pin as s2 from team_pins p join teams t on t.id = p.team_id where t.table_no = 2 and t.role = 'startup' \gset
select pin as f1 from fac_pins where table_no = 1 \gset
select t_ok((select count(*) from organisers) = 0, 'the organiser list is invisible, even to the owner');

-- ---------- joining ----------
select t_as(:'p1'); select t_ok(join_game(:'code', :'s1', 'Anna') ->> 'role' = 'player', 'p1 joins the startup squad of table 1');
select t_as(:'p2'); select t_ok(join_game(:'code', :'i1', 'Bruno') ->> 'role' = 'player', 'p2 joins the investors of table 1');
select t_as(:'p3'); select t_ok(join_game(:'code', :'s2', 'Carla') ->> 'role' = 'player', 'p3 joins the startup squad of table 2');
select t_ok(join_game(:'code', 'WRONG', 'x') ->> 'error' = 'WRONG_PIN', 'a wrong PIN is refused');
select t_ok(join_game('ZZZZZZ', :'s1', 'x') ->> 'error' = 'GAME_NOT_FOUND', 'a wrong game code is refused');
select t_as(:'fac'); select t_ok(join_game(:'code', :'f1', 'Fede') ->> 'role' = 'facilitator', 'the facilitator joins table 1');
select t_as(:'owner'); select t_ok(join_game(:'code', :'f1', 'x') ->> 'role' = 'admin', 'the game master entering a PIN stays game master');

-- ---------- what a player can read ----------
select t_as(:'p1');
select t_ok((select count(*) from team_pins) = 0 and (select count(*) from fac_pins) = 0, 'players cannot read any PIN');
select t_ok((select count(*) from scenario_secrets) = 0, 'players cannot read the scenario pack directly');
select t_ok((select count(*) from my_cards(:'gid')) = 0, 'no card in the lobby');
select t_ok((bvc_snapshot(:'gid') -> 'pins') = '{}' and (bvc_snapshot(:'gid') -> 'presence') = '{}', 'the snapshot gives players no PINs and no device data');
select t_as(:'stranger'); select t_ok(bvc_snapshot(:'gid') is null, 'a stranger gets no snapshot');
select t_as(:'owner'); select t_ok((select count(*) from jsonb_object_keys(bvc_snapshot(:'gid') -> 'pins')) = 4, 'the game master snapshot carries the 4 squad PINs');

-- ---------- start: lock ----------
select t_as(:'p1'); update games set phase = 'negotiate' where id = :'gid';
select t_ok((select phase from games where id = :'gid') = 'lobby', 'a player cannot move the game forward');
update teams set name = 'Lobby name' where table_no = 1 and role = 'startup';
select t_ok((select name from teams where table_no = 1 and role = 'startup') = 'Lobby name', 'players rename their squad in the lobby');
select t_as(:'owner'); update games set phase = 'negotiate', joins_locked = true where id = :'gid';
select t_as(:'p1');
update teams set name = 'Late rename' where table_no = 1 and role = 'startup';
select t_ok((select name from teams where table_no = 1 and role = 'startup') = 'Lobby name', 'after the start players cannot rename their squad');
select t_ok(join_game(:'code', :'i1', 'Anna') ->> 'error' = 'TEAM_LOCKED', 'after the start p1 cannot hop to the investors');
select t_ok(join_game(:'code', :'s1', 'Anna') ->> 'role' = 'player', 'p1 can rejoin their own squad');
select t_ok((select string_agg(kind, ',') from my_cards(:'gid')) = 'card_startup', 'during the round p1 reads only the startup card');
select t_as(:'p4');
select t_ok(join_game(:'code', :'i1', 'Spy') ->> 'error' = 'JOINS_LOCKED', 'with joins locked a new device (private window) cannot get in');
select t_as(:'owner'); update games set joins_locked = false where id = :'gid';
select t_as(:'p4'); select t_ok(join_game(:'code', :'s2', 'Dario') ->> 'role' = 'player', 'once reopened a late player gets in');

-- ---------- PIN guessing ----------
select t_as(:'p5');
select count(*) from (select join_game(:'code', 'GUES' || x, 'g') from generate_series(1, 8) x) z \g /dev/null
select t_ok(join_game(:'code', :'s1', 'g') ->> 'error' = 'TOO_MANY_ATTEMPTS', 'after 8 wrong PINs even the right one is refused for 10 minutes');

-- ---------- offers and results ----------
select t_as(:'p1');
select t_fails($$insert into offers (game_id, table_no, round, from_role, terms) values ('$$ || :'gid' || $$', 1, 1, 'startup', '{"cap":100,"deadEquity":2,"rights":2}')$$, 'row-level security', 'an offer outside the public ranges is refused');
select t_fails($$insert into offers (game_id, table_no, round, from_role, terms) values ('$$ || :'gid' || $$', 1, 1, 'investor', '{"cap":5,"deadEquity":2,"rights":2}')$$, 'row-level security', 'a player cannot send an offer for the other side');
insert into offers (game_id, table_no, round, from_role, terms) values (:'gid', 1, 1, 'startup', '{"cap":5,"deadEquity":2,"rights":2}');
select t_as(:'p3'); select t_ok((select count(*) from offers) = 0, 'table 2 cannot see the offers of table 1');
select t_as(:'p2'); select accept_offer(id) from offers where status = 'open' \g /dev/null
select t_ok((select count(*) from results) = 1, 'the investors accept: the deal is signed');
select t_as(:'p3');
select t_ok((select count(*) from results) = 0, 'table 2 cannot see the signed terms of table 1 during the round');
select t_ok((select bool_and(not payload ? 'terms') from events where kind = 'signed'), 'the «signed» event visible to everyone carries no terms');
select t_as(:'owner'); update games set phase = 'debrief' where id = :'gid';
select t_as(:'p3'); select t_ok((select count(*) from results) = 1, 'at the debrief every table sees the results');

-- ---------- facilitators ----------
select t_as(:'fac');
select t_fails($$select open_envelope('$$ || :'gid' || $$', 2, 'A')$$, 'NOT_YOUR_TABLE', 'the facilitator of table 1 cannot open envelopes at table 2');
select t_fails($$select open_envelope('$$ || :'gid' || $$', null, 'A')$$, 'ADMIN_ONLY', 'only the game master opens envelopes for every table');

-- ---------- heartbeat and presence ----------
select t_as(:'p1');
select t_ok(bvc_heartbeat(:'gid', '{"online":true,"rt":"SUBSCRIBED"}') is not null, 'the heartbeat returns the server clock');
select t_ok((select count(*) from presence) = 0, 'players cannot read device data');
select bvc_heartbeat(:'gid', jsonb_build_object('x', repeat('a', 3000))) \g /dev/null
select t_as(:'stranger'); select bvc_heartbeat(:'gid', '{}') \g /dev/null
select t_as(:'owner');
select t_ok((select count(*) from presence) = 1 and (select client ->> 'rt' from presence) = 'SUBSCRIBED', 'the game master sees the device; oversized or stranger heartbeats are ignored');
select t_fails($$insert into presence (game_id, user_id) values ('$$ || :'gid' || $$', auth.uid())$$, 'row-level security', 'nobody writes device data directly');

-- ---------- ops console ----------
select t_as(:'owner');
select t_fails($$select ops_unlock('anything')$$, 'OPS_NOT_SET', 'without a password the console stays closed');
select t_fails($$select ops_set_password('a new password')$$, 'permission denied', 'nobody can set the console password from the app');
select t_fails($$select ops_snapshot()$$, 'OPS_ONLY', 'not even the game master reads the ops data without the password');
reset role;
select ops_set_password('correct horse battery') \g /dev/null
select t_ok((select pass_hash from ops_config) like '$2a$%', 'the password is stored only as a bcrypt hash');
set role authenticated;
select t_as(:'p2');
select count(*) from (select ops_unlock('wrong ' || x) from generate_series(1, 4) x) z \g /dev/null
select t_ok(ops_unlock('still wrong') = false, 'a wrong password is refused');
select t_fails($$select ops_unlock('correct horse battery')$$, 'OPS_LOCKED', 'after 5 wrong passwords the console locks for 15 minutes, even for the right one');
reset role; update ops_config set locked_until = null; set role authenticated;
select t_ok(ops_unlock('correct horse battery'), 'the right password opens the console');
select t_ok(jsonb_array_length(ops_snapshot() -> 'games') = 1, 'the console sees every game');
select t_ok((select count(*) from jsonb_array_elements(ops_snapshot() #> '{games,0,members}') m where m ->> 'last_seen' is not null) = 1, 'the console sees which devices are alive');
select ops_action('lock_joins', :'gid') \g /dev/null
select t_ok((select joins_locked from games where id = :'gid'), 'the console can lock joins');
select t_as(:'p3');
select t_fails($$select ops_action('delete_game', '$$ || :'gid' || $$')$$, 'OPS_ONLY', 'a player without the password cannot use console actions');
select t_fails($$select bvc_purge(0)$$, 'permission denied', 'nobody can trigger the deletion from the app');

-- ---------- organiser accounts ----------
select t_as(:'stranger');
select t_ok(organiser_status() = 'none', 'a new account starts with no organiser rights');
select t_ok(request_organiser('Marta Rossi', 'Liceo Volta', 'Lezione sul VC') = 'pending', 'asking to organise puts the account on hold');
select t_fails($$select create_game('X', 2, 3, '{}')$$, 'NOT_ORGANISER', 'an account on hold cannot create games (it would see the solutions)');
select t_as(:'p3');
select t_fails($$select request_organiser('Spy', '', '')$$, 'NOT_SIGNED_IN', 'an anonymous player cannot ask to organise');
select t_fails($$select ops_accounts()$$, 'OPS_ONLY', 'only the console sees the account requests');
select t_as(:'p2');
select t_ok((select count(*) from jsonb_array_elements(ops_accounts() -> 'requests') r where r ->> 'status' = 'pending') = 1, 'the console lists the request');
select ops_account_action('approve', '00000000-0000-0000-0000-00000000000b') \g /dev/null
select t_as(:'stranger');
select t_ok(organiser_status() = 'approved', 'once approved the account is an organiser');
select t_ok(create_game('Marta 1', 1, 1, '{}') is not null, 'an approved organiser creates a game');
select count(*) from (select create_game('Marta ' || x, 1, 1, '{}') from generate_series(2, 5) x) z \g /dev/null
select t_fails($$select create_game('Marta 6', 1, 1, '{}')$$, 'TOO_MANY_GAMES', 'an organiser cannot keep more than 5 live games');
select t_ok((select count(*) from games) = 5, 'an organiser sees only their own games');
select t_as(:'p2'); select ops_account_action('open_signup') \g /dev/null
select t_as(:'newbie');
select t_ok(request_organiser('Luca', '', '') = 'approved', 'with auto-approve on, a new account is approved at once');
select t_as(:'p2'); select ops_account_action('close_signup') \g /dev/null
select t_as(:'stranger');
select delete_my_account() \g /dev/null
select t_ok(organiser_status() = 'none', 'deleting the account removes the organiser rights');
reset role;
select t_ok((select count(*) from games where name like 'Marta%') = 0 and not exists (select 1 from auth.users where email = 'someone@else.it'), 'deleting the account deletes its games and the account itself');
set role authenticated;

-- ---------- anonymous role (no session) ----------
set role anon;
select t_fails($$select bvc_role('$$ || :'gid' || $$')$$, 'permission denied', 'without a session the helper functions are closed');
select t_fails($$select join_game('X', 'Y', 'Z')$$, 'permission denied', 'without a session nobody can try PINs');

-- ---------- automatic deletion ----------
reset role;
select t_ok((bvc_purge(7) ->> 'games')::int = 0, 'an active game is kept');
alter table games disable trigger games_touch;
update games set updated_at = now() - interval '8 days';
alter table games enable trigger games_touch;
update presence set last_seen = now() - interval '8 days';
update auth.users set created_at = now() - interval '8 days';
select t_ok((bvc_purge(7) ->> 'games')::int = 1, 'a game idle for 7 days is deleted');
select t_ok((select count(*) from offers) + (select count(*) from members) + (select count(*) from presence) + (select count(*) from team_pins) = 0, 'its offers, members, devices and PINs go with it');
select t_ok((select count(*) from auth.users where is_anonymous) = 0, 'the anonymous accounts left without a game are deleted');
select t_ok((select count(*) from auth.users where not is_anonymous) = 2, 'organiser accounts in use are kept');
