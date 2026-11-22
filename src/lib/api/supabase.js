import { createClient } from '@supabase/supabase-js';

const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const uid = async () => (await sb.auth.getSession()).data.session?.user;

export const api = {
  mode: 'supabase',
  async user() { return uid(); },
  async isOrganiser() { const u = await uid(); if (!u || u.is_anonymous) return false; const { data } = await sb.rpc('am_organiser'); return !!data; },
  async ensureUser() {
    if (await uid()) return uid();
    const { error } = await sb.auth.signInAnonymously();
    // Supabase caps anonymous sign-ins per IP: a whole classroom shares one IP (see docs/deploy.md).
    if (error) throw new Error(error.status === 429 || /rate limit/i.test(error.message) ? 'SIGNIN_LIMIT' : error.message);
    return uid();
  },
  async organiserSignIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error('BAD_LOGIN');
    if (!(await api.isOrganiser())) { await sb.auth.signOut(); throw new Error('NOT_ORGANISER'); }
    return { ok: true };
  },
  async signOut() { await sb.auth.signOut(); },
  async myGames() {
    const u = await uid(); if (!u) return [];
    const m = ok(await sb.from('members').select('game_id').eq('user_id', u.id).eq('role', 'admin'));
    if (!m.length) return [];
    return ok(await sb.from('games').select('*').in('id', m.map(x => x.game_id)).order('created_at', { ascending: false }));
  },
  async createGame({ name, tables, rounds, settings, names }) {
    return ok(await sb.rpc('create_game', { p_name: name, p_tables: tables, p_rounds: rounds, p_settings: settings, p_names: names }));
  },
  async deleteGame(id) { ok(await sb.from('games').delete().eq('id', id)); },
  async joinGame(code, pin, name) {
    await api.ensureUser();
    const data = ok(await sb.rpc('join_game', { p_code: code, p_pin: pin, p_name: name }));
    if (data?.error) throw new Error(data.error);   // GAME_NOT_FOUND | WRONG_PIN | TEAM_LOCKED | JOINS_LOCKED | TOO_MANY_ATTEMPTS
    return data;
  },
  // One round trip; row level security decides what each person gets (PINs and devices: game master only).
  async snapshot(gameId) {
    const u = await uid(); if (!u) return null;
    const s = ok(await sb.rpc('bvc_snapshot', { p_game: gameId }));
    if (!s) return null;
    s.me = s.members.find(m => m.user_id === u.id) || null;
    if (s.me?.role !== 'admin') { delete s.pins; delete s.facPins; delete s.presence; }
    return s;
  },
  subscribe(gameId, onChange, onStatus) {
    const ch = sb.channel('game-' + gameId);
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, onChange);
    for (const t of ['teams', 'members', 'offers', 'results', 'votes', 'events']) ch.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: `game_id=eq.${gameId}` }, onChange);
    ch.subscribe(status => onStatus?.(status));
    return () => sb.removeChannel(ch);
  },
  async myCards(gameId) { return ok(await sb.rpc('my_cards', { p_game: gameId })); },
  async setGame(gameId, patch) { ok(await sb.from('games').update(patch).eq('id', gameId)); },
  async sendOffer(o) { ok(await sb.from('offers').insert({ game_id: o.game_id, table_no: o.table_no, round: o.round, from_role: o.from_role, terms: o.terms, note: o.note || null })); },
  async acceptOffer(id) { ok(await sb.rpc('accept_offer', { p_offer: id })); },
  async rejectOffer(id) { ok(await sb.rpc('reject_offer', { p_offer: id })); },
  async vote(v) { ok(await sb.from('votes').upsert(v)); },
  async saveResult(row) { ok(await sb.from('results').upsert({ ...row, updated_at: new Date().toISOString() })); },
  async deleteResult(gameId, table, round) { ok(await sb.from('results').delete().match({ game_id: gameId, table_no: table, round })); },
  async openEnvelope(gameId, table, key) { ok(await sb.rpc('open_envelope', { p_game: gameId, p_table: table, p_key: key })); },
  async postEvent(e) { ok(await sb.from('events').insert(e)); },
  async renameTeam(id, name) { ok(await sb.from('teams').update({ name }).eq('id', id)); },
  async heartbeat(gameId, client) { return ok(await sb.rpc('bvc_heartbeat', { p_game: gameId, p_client: client })); },
  async setJoinsLocked(gameId, locked) { ok(await sb.from('games').update({ joins_locked: locked }).eq('id', gameId)); },
  // Ops console: the password is checked by the database (bcrypt), never in this code.
  async opsUnlock(password) {
    await api.ensureUser();
    const { data, error } = await sb.rpc('ops_unlock', { p: password });
    if (error) throw new Error(['OPS_LOCKED', 'OPS_NOT_SET'].find(c => error.message.includes(c)) || error.message);
    return !!data;
  },
  async opsCheck() { if (!(await uid())) return false; const { data } = await sb.rpc('bvc_is_ops'); return !!data; },
  async opsSnapshot() { return ok(await sb.rpc('ops_snapshot')); },
  async opsAction(kind, game = null, arg = {}) { return ok(await sb.rpc('ops_action', { p_kind: kind, p_game: game, p_arg: arg })); },
  async kick(gameId, userId) { ok(await sb.from('members').delete().match({ game_id: gameId, user_id: userId })); },
};
