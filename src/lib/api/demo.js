// Demo backend: same interface as supabase.js, kept in this browser.
// Every tab is a different person (identity in sessionStorage); tabs sync through BroadcastChannel.
import { SECRETS } from '@private-pack';

const KEY = 'bvc-demo-v2';
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(KEY) : null;
const listeners = new Set();
const id = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
const code = (n, a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') => Array.from({ length: n }, () => a[Math.floor(Math.random() * a.length)]).join('');
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
let db = load() || { games: [], secrets: {}, teams: [], pins: {}, members: [], offers: [], results: [], votes: [], events: [], attempts: [], seq: 1 };
db.attempts ||= [];
db.accounts ||= [];   // organiser accounts created from the sign-up form (demo only: password kept in the browser)
db.config ||= { openSignup: false, maxLiveGames: 5 };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ } listeners.forEach(f => f()); bc?.postMessage('x'); };
const refresh = () => { db = load() || db; listeners.forEach(f => f()); };
bc && (bc.onmessage = refresh);
addEventListener('storage', e => { if (e.key === KEY) refresh(); });

// Device heartbeats live apart from the game data, so they do not wake every tab.
const PKEY = 'bvc-demo-presence';
const presence = () => { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch { return {}; } };
const setPresence = p => { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch { /* ignore */ } };
const MIN = 60000;
const recentFails = (f, ms = 10 * MIN) => db.attempts.filter(a => !a.ok && Date.now() - new Date(a.at).getTime() < ms && f(a)).length;
const attempt = (game_id, ok) => { db.attempts.push({ game_id, user_id: me().id, ok, at: new Date().toISOString() }); db.attempts = db.attempts.slice(-500); };

const ss = (() => { try { return sessionStorage; } catch { return { getItem: () => null, setItem() {} }; } })();
// Projector and print pages open in a new tab: they borrow the organiser's identity.
const org = () => { try { return JSON.parse(localStorage.getItem('bvc-demo-org')); } catch { return null; } };
const me = () => { let u = null; try { u = JSON.parse(ss.getItem('bvc-demo-user')); } catch { /* none */ } return u || (/^#\/(screen|cards)\//.test(location.hash) ? org() : null); };
const setMe = u => ss.setItem('bvc-demo-user', JSON.stringify(u));
const fail = m => { throw new Error(m); };
const member = g => db.members.find(m => m.game_id === g && m.user_id === me()?.id);
const team = g => db.teams.find(t => t.id === member(g)?.team_id);
const staff = g => ['admin', 'facilitator'].includes(member(g)?.role);
// Admin: every table. Facilitator: only the tables whose PIN they entered.
const canTable = (g, t) => { const m = member(g); return !!m && (m.role === 'admin' || (m.role === 'facilitator' && (m.tables || []).includes(t))); };
const game = g => db.games.find(x => x.id === g);
// Same rule as bvc_valid_terms() in the database: the round's three levers, inside the public ranges.
const SPEC = { 1: { cap: [3, 7], deadEquity: [0, 4, 1], rights: [0, 4, 1] }, 2: { pre: [7, 15], pool: [6, 16], board: [0, 4, 1] }, 3: { pre: [35, 70], mna: [0, 4, 1], partner: [0, 4, 1] } };
const validTerms = (r, t) => { const sp = SPEC[r]; if (!sp || !t) return false; for (const [k, v] of Object.entries(t)) { if (k === 'poolCheck' && r === 2) { if (typeof v !== 'boolean') return false; continue; } const s = sp[k]; if (!s || typeof v !== 'number' || v < s[0] || v > s[1] || (s[2] && !Number.isInteger(v))) return false; } return Object.keys(sp).every(k => k in t); };

// ---------- ops console (demo) ----------
// The password is checked against a PBKDF2 hash set at build time (VITE_OPS_HASH, see scripts/ops-hash.mjs).
// Without it, the local demo uses «demo-ops-console». In production the database checks a bcrypt hash instead.
const OPS_HASH = import.meta.env.VITE_OPS_HASH || '';
const OKEY = 'bvc-demo-ops', OSES = 'bvc-demo-ops-session';
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function pbkdf2(pw, saltHex) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, key, 256));
}
const opsState = () => { try { return JSON.parse(localStorage.getItem(OKEY)) || { fails: 0, lockedUntil: 0 }; } catch { return { fails: 0, lockedUntil: 0 }; } };
const isOps = () => { try { return +ss.getItem(OSES) > Date.now(); } catch { return false; } };
const BASE = { on: true, rt: 'SUBSCRIBED', fails: 0, lat: 120, skew: 0, errs: 0, err: '', dev: 'mobile', br: 'Safari', vis: true, v: '0.2.0' };
const SIM_NAMES = ['Giulia', 'Marco', 'Sara', 'Luca', 'Elena', 'Pietro', 'Anna', 'Tommaso'];

const ops = {
  async opsUnlock(pw) {
    const st = opsState();
    if (st.lockedUntil > Date.now()) fail('OPS_LOCKED');
    const good = OPS_HASH ? (await pbkdf2(pw, OPS_HASH.split(':')[0])) === OPS_HASH.split(':')[1] : pw === 'demo-ops-console';
    if (good) { localStorage.setItem(OKEY, JSON.stringify({ fails: 0, lockedUntil: 0 })); ss.setItem(OSES, String(Date.now() + 12 * 60 * MIN)); return true; }
    const fails = st.fails + 1;
    localStorage.setItem(OKEY, JSON.stringify(fails >= 5 ? { fails: 0, lockedUntil: Date.now() + 15 * MIN } : { fails, lockedUntil: 0 }));
    return false;
  },
  async opsCheck() { return isOps(); },
  async opsAccounts() {
    if (!isOps()) fail('OPS_ONLY');
    return JSON.parse(JSON.stringify({ requests: db.accounts.map(({ password, ...a }) => a).reverse(), organisers: db.accounts.filter(a => a.status === 'approved').length + 1, openSignup: db.config.openSignup, maxLiveGames: db.config.maxLiveGames }));
  },
  async opsAccountAction(kind, userId) {
    if (!isOps()) fail('OPS_ONLY');
    const a = db.accounts.find(x => x.user_id === userId);
    if (kind === 'approve' || kind === 'reject') { if (!a) fail('NO_REQUEST'); a.status = kind === 'approve' ? 'approved' : 'rejected'; a.decided_at = new Date().toISOString(); }
    else if (kind === 'open_signup' || kind === 'close_signup') db.config.openSignup = kind === 'open_signup';
    else fail('UNKNOWN_ACTION');
    save();
  },
  async opsSnapshot() {
    if (!isOps()) fail('OPS_ONLY');
    const pr = presence(), now = Date.now();
    const recent = (a, ms = 10 * MIN) => now - new Date(a.at).getTime() < ms;
    return JSON.parse(JSON.stringify({
      now: new Date().toISOString(),
      games: db.games.filter(g => now - new Date(g.created_at).getTime() < 30 * 24 * 60 * MIN).slice().reverse().map(g => {
        const tried = new Set(db.attempts.filter(a => a.game_id === g.id).map(a => a.user_id));
        const byUser = {}; db.attempts.filter(a => !a.ok && recent(a) && tried.has(a.user_id)).forEach(a => { byUser[a.user_id] = (byUser[a.user_id] || 0) + 1; });
        return {
          game: g,
          teams: db.teams.filter(t => t.game_id === g.id).map(t => ({ ...t, pin: db.pins[t.id] })),
          facPins: db.secrets[g.id] || {},
          members: db.members.filter(m => m.game_id === g.id).map(m => ({ ...m, last_seen: pr[g.id + '|' + m.user_id]?.last_seen || null, client: pr[g.id + '|' + m.user_id]?.client || null })),
          offers: db.offers.filter(o => o.game_id === g.id).length,
          offersRound: db.offers.filter(o => o.game_id === g.id && o.round === g.round).length,
          results: db.results.filter(r => r.game_id === g.id).map(r => ({ table_no: r.table_no, round: r.round, status: r.status })),
          fails10: db.attempts.filter(a => a.game_id === g.id && !a.ok && recent(a)).length,
          blocked: Object.values(byUser).filter(n => n >= 8).length,
        };
      }),
      badCodes10: db.attempts.filter(a => a.game_id == null && recent(a)).length,
      oldGames: db.games.filter(g => now - new Date(g.updated_at || g.created_at).getTime() > 7 * 24 * 60 * MIN).length,
      cron: true, dbBytes: (localStorage.getItem(KEY) || '').length, anonUsers: null, opsFails: opsState().fails, demo: true,
    }));
  },
  async opsAction(kind, gid, arg = {}) {
    if (!isOps()) fail('OPS_ONLY');
    const g = game(gid);
    if (kind === 'lock_joins' || kind === 'unlock_joins') g.joins_locked = kind === 'lock_joins';
    else if (kind === 'reset_attempts') db.attempts = db.attempts.filter(a => a.ok || Date.now() - new Date(a.at).getTime() > 10 * MIN);
    else if (kind === 'kick') db.members = db.members.filter(m => !(m.game_id === gid && m.user_id === arg.user_id && m.role !== 'admin'));
    else if (kind === 'delete_game') return api.deleteGame(gid);
    else if (kind === 'purge') { const old = db.games.filter(x => Date.now() - new Date(x.updated_at || x.created_at).getTime() > 7 * 24 * 60 * MIN); for (const x of old) await api.deleteGame(x.id); return { games: old.length, users: 0 }; }
    else if (kind === 'logout') { ss.setItem(OSES, '0'); return {}; }
    else fail('UNKNOWN_ACTION');
    save(); return {};
  },
  // Demo only: puts a realistic problem into the latest game, so the console and the game master view can be tried.
  async opsSimulate(kind) {
    if (!isOps()) fail('OPS_ONLY');
    const g = db.games[db.games.length - 1]; if (!g) fail('NO_GAME');
    const pr = presence(), until = Date.now() + 10 * MIN;
    const teams = db.teams.filter(t => t.game_id === g.id);
    const fake = client => {
      const n = db.members.filter(m => m.sim).length, t = teams[n % teams.length], uid = 'sim-' + id().slice(0, 8);
      db.members.push({ game_id: g.id, user_id: uid, role: 'player', team_id: t.id, tables: [], name: SIM_NAMES[n % SIM_NAMES.length] + ' (sim)', sim: true, joined_at: new Date().toISOString() });
      pr[g.id + '|' + uid] = { game_id: g.id, user_id: uid, last_seen: new Date(Date.now() - (client.ago || 0)).toISOString(), client: { ...BASE, ...client, simUntil: until } };
    };
    if (kind === 'offline') fake({ on: false, ago: 2 * MIN });
    else if (kind === 'realtime') fake({ rt: 'CHANNEL_ERROR', fails: 0 });
    else if (kind === 'slow') fake({ lat: 2600 });
    else if (kind === 'skew') fake({ skew: -95000 });
    else if (kind === 'error') fake({ errs: 2, err: "TypeError: Cannot read properties of undefined (reading 'terms')", dev: 'desktop', br: 'Firefox' });
    else if (kind === 'failing') fake({ fails: 4, lat: 900 });
    else if (kind === 'gm_offline') { const a = db.members.find(m => m.game_id === g.id && m.role === 'admin'); pr[g.id + '|' + a.user_id] = { game_id: g.id, user_id: a.user_id, last_seen: new Date(Date.now() - 3 * MIN).toISOString(), client: { ...BASE, dev: 'desktop', br: 'Chrome', simUntil: until } }; }
    else if (kind === 'pins') { const spy = 'sim-spy-' + id().slice(0, 6); for (let k = 0; k < 12; k++) db.attempts.push({ game_id: g.id, user_id: k < 9 ? spy : 'sim-' + k, ok: false, at: new Date().toISOString(), sim: true }); }
    else if (kind === 'overdue') { if (['lobby', 'ended'].includes(g.phase)) fail('NEEDS_ROUND'); g.phase_ends_at = new Date(Date.now() - 4 * MIN).toISOString(); }
    else if (kind === 'clear') {
      db.members = db.members.filter(m => !m.sim); db.attempts = db.attempts.filter(a => !a.sim);
      for (const k of Object.keys(pr)) if (pr[k].client?.simUntil) delete pr[k];
    } else fail('UNKNOWN_SIM');
    setPresence(pr); save(); return { game: g.name };
  },
};

export const api = {
  mode: 'demo',
  async user() { return me(); },
  async isOrganiser() { const u = me(); if (!u || u.is_anonymous) return false; return u.id === org()?.id || db.accounts.some(a => a.user_id === u.id && a.status === 'approved'); },
  async ensureUser() { if (!me()) setMe({ id: id(), is_anonymous: true }); return me(); },
  // Without an email: the demo's one-click game master. With one: an account made with the sign-up form.
  async organiserSignIn(email, password) {
    if (email) { const a = db.accounts.find(x => x.email === email.toLowerCase() && x.password === password); if (!a) fail('BAD_LOGIN'); setMe({ id: a.user_id, is_anonymous: false, email: a.email }); return { ok: true }; }
    const u = org() || { id: id(), is_anonymous: false, email: 'demo@babyvc' }; setMe(u); localStorage.setItem('bvc-demo-org', JSON.stringify(u)); return { sent: false };
  },
  async organiserSignUp({ email, password, name, org: o, note }) {
    email = email.trim().toLowerCase();
    if (db.accounts.some(a => a.email === email)) fail('EMAIL_TAKEN');
    if ((password || '').length < 8) fail('WEAK_PASSWORD');
    const a = { user_id: id(), email, password, name, org: o || '', note: note || '', status: db.config.openSignup ? 'approved' : 'pending', created_at: new Date().toISOString() };
    db.accounts.push(a); save(); setMe({ id: a.user_id, is_anonymous: false, email }); return a.status;
  },
  async organiserStatus() {
    const u = me(); if (!u || u.is_anonymous) return { status: 'none' };
    if (u.id === org()?.id) return { status: 'approved', email: u.email };
    return { status: db.accounts.find(a => a.user_id === u.id)?.status || 'none', email: u.email };
  },
  async requestOrganiser() { return (await api.organiserStatus()).status; },
  async deleteMyAccount() {
    const u = me(); if (!u || u.is_anonymous) fail('NOT_SIGNED_IN');
    for (const g of db.games.filter(x => x.owner === u.id)) await api.deleteGame(g.id);
    db.accounts = db.accounts.filter(a => a.user_id !== u.id); save(); setMe(null);
  },
  async signOut() { ss.setItem('bvc-demo-user', 'null'); },
  async myGames() { return db.games.filter(g => db.members.some(m => m.game_id === g.id && m.user_id === me()?.id && m.role === 'admin')).reverse(); },
  async createGame({ name, tables, rounds, settings, names }) {
    if (!(await api.isOrganiser())) fail('NOT_ORGANISER');
    if (db.games.filter(g => g.owner === me().id && g.phase !== 'ended').length >= db.config.maxLiveGames) fail('TOO_MANY_GAMES');
    const g = { id: id(), code: code(6), name, owner: me().id, n_tables: tables, n_rounds: rounds, round: 1, phase: 'lobby', phase_ends_at: null, settings, created_at: new Date().toISOString() };
    db.games.push(g); db.secrets[g.id] = {};
    db.members.push({ game_id: g.id, user_id: me().id, role: 'admin', team_id: null, name: 'Game master' });
    let k = 0;
    for (let t = 1; t <= tables; t++) db.secrets[g.id][t] = code(5);
    for (let t = 1; t <= tables; t++) for (const role of ['startup', 'investor']) {
      const tm = { id: id(), game_id: g.id, table_no: t, role, name: names?.[k] || (role === 'startup' ? 'Startup ' : 'Investors ') + t };
      db.teams.push(tm); db.pins[tm.id] = code(5); k++;
    }
    save(); return g.id;
  },
  async deleteGame(gid) { for (const k of ['games']) db[k] = db[k].filter(x => x.id !== gid); for (const k of ['teams', 'members', 'offers', 'results', 'votes', 'events']) db[k] = db[k].filter(x => x.game_id !== gid); save(); },
  async joinGame(c, pin, name) {
    await api.ensureUser();
    // Same rules and limits as join_game() in the database.
    if (recentFails(a => a.user_id === me().id) >= 8) fail('TOO_MANY_ATTEMPTS');
    const g = db.games.find(x => x.code === c.trim().toUpperCase());
    if (!g) { attempt(null, false); save(); fail('GAME_NOT_FOUND'); }
    if (recentFails(a => a.game_id === g.id) >= 60) fail('TOO_MANY_ATTEMPTS');
    pin = pin.trim().toUpperCase();
    let role = 'player', team_id = null;
    const ft = Object.keys(db.secrets[g.id] || {}).find(t => db.secrets[g.id][t] === pin);
    if (ft) role = 'facilitator';
    else { team_id = Object.keys(db.pins).find(t => db.pins[t] === pin && db.teams.find(x => x.id === t)?.game_id === g.id); if (!team_id) { attempt(g.id, false); save(); fail('WRONG_PIN'); } }
    const old = member(g.id);
    if (g.phase !== 'lobby' && old?.role === 'player' && (role !== 'player' || old.team_id !== team_id)) fail('TEAM_LOCKED');
    if (old?.role === 'admin') return { game_id: g.id, role: 'admin', team_id: null };
    if (g.joins_locked && !old) fail('JOINS_LOCKED');
    const tables = ft ? [...new Set([...(old?.role === 'facilitator' ? old.tables || [] : []), +ft])].sort((a, b) => a - b) : [];
    db.members = db.members.filter(m => !(m.game_id === g.id && m.user_id === me().id));
    db.members.push({ game_id: g.id, user_id: me().id, role, team_id, tables, name: (name || '').slice(0, 40), joined_at: new Date().toISOString() });
    attempt(g.id, true); save(); return { game_id: g.id, role, team_id, tables };
  },
  async snapshot(gid) {
    const g = game(gid), m = member(gid); if (!g || !m) return null;
    const of = t => db[t].filter(x => x.game_id === gid);
    const tm = team(gid), can = t => canTable(gid, t);
    const over = r => r < g.round || (r === g.round && ['debrief', 'exit', 'ended'].includes(g.phase));
    const snap = { game: g, teams: of('teams'), members: of('members'), me: m,
      results: of('results').filter(r => staff(gid) || r.table_no === tm?.table_no || over(r.round)),
      offers: of('offers').filter(o => can(o.table_no) || o.table_no === tm?.table_no),
      votes: of('votes').filter(v => can(v.table_no) || (v.table_no === tm?.table_no && v.from_role === tm?.role)),
      events: of('events').filter(e => m.role === 'admin' || (m.role === 'facilitator' && (e.table_no == null || can(e.table_no)))
        || (m.role === 'player' && (e.audience === 'all' || e.audience === tm?.role) && (e.table_no == null || e.table_no === tm?.table_no))) };
    if (m.role === 'admin') {
      snap.pins = Object.fromEntries(snap.teams.map(t => [t.id, db.pins[t.id]])); snap.facPins = { ...db.secrets[gid] };
      const pr = presence(); snap.presence = Object.fromEntries(Object.values(pr).filter(x => x.game_id === gid).map(x => [x.user_id, x]));
    }
    return JSON.parse(JSON.stringify(snap));
  },
  subscribe(gid, onChange, onStatus) { listeners.add(onChange); onStatus?.('SUBSCRIBED'); return () => listeners.delete(onChange); },
  async myCards(gid) {
    const g = game(gid);
    if (staff(gid)) return SECRETS.filter(s => s.round <= g.n_rounds);
    const tm = team(gid); if (!tm) return [];
    const over = r => r < g.round || (r === g.round && ['debrief', 'exit', 'ended'].includes(g.phase));
    return SECRETS.filter(s => (g.phase !== 'lobby' && s.round <= g.round && s.kind === 'card_' + tm.role) || (s.kind === 'sweet' && over(s.round)));
  },
  async setGame(gid, patch) { if (member(gid)?.role !== 'admin') fail('ADMIN_ONLY'); Object.assign(game(gid), patch); save(); },
  async sendOffer(o) {
    const g = game(o.game_id), tm = team(o.game_id);
    if (!tm || tm.table_no !== o.table_no || tm.role !== o.from_role || g.round !== o.round || !['negotiate', 'sign'].includes(g.phase)) fail('OFFER_NOT_ALLOWED');
    if (db.results.some(r => r.game_id === o.game_id && r.table_no === o.table_no && r.round === o.round)) fail('ALREADY_SIGNED');
    if (!validTerms(o.round, o.terms)) fail('INVALID_TERMS');
    db.offers.forEach(x => { if (x.game_id === o.game_id && x.table_no === o.table_no && x.round === o.round && x.status === 'open') x.status = 'countered'; });
    db.offers.push({ ...o, id: id(), status: 'open', author: me().id, created_at: new Date().toISOString() }); save();
  },
  async acceptOffer(oid) {
    const o = db.offers.find(x => x.id === oid); if (!o || o.status !== 'open') fail('OFFER_CLOSED');
    const tm = team(o.game_id), g = game(o.game_id);
    if (!tm || tm.table_no !== o.table_no || tm.role === o.from_role) fail('NOT_YOUR_OFFER');
    if (g.round !== o.round || !['negotiate', 'sign'].includes(g.phase)) fail('ROUND_CLOSED');
    o.status = 'accepted';
    db.results.push({ game_id: o.game_id, table_no: o.table_no, round: o.round, outcome: 'signed', terms: o.terms, trades: {}, rel: {}, facts: {}, breach: {}, result: null, status: 'signed', offer_id: o.id, updated_at: new Date().toISOString() });
    db.events.push({ id: db.seq++, game_id: o.game_id, table_no: null, round: o.round, kind: 'signed', audience: 'all', payload: { table_no: o.table_no }, created_at: new Date().toISOString() });
    save();
  },
  async rejectOffer(oid) { const o = db.offers.find(x => x.id === oid); if (!o || o.status !== 'open') fail('OFFER_CLOSED'); o.status = team(o.game_id)?.role === o.from_role ? 'withdrawn' : 'rejected'; save(); },
  async vote(v) { db.votes = db.votes.filter(x => !(x.game_id === v.game_id && x.table_no === v.table_no && x.round === v.round && x.from_role === v.from_role)); db.votes.push(v); save(); },
  async saveResult(row) {
    if (!canTable(row.game_id, row.table_no)) fail('NOT_YOUR_TABLE');
    db.results = db.results.filter(r => !(r.game_id === row.game_id && r.table_no === row.table_no && r.round === row.round));
    db.results.push({ ...row, updated_at: new Date().toISOString() }); save();
  },
  async deleteResult(gid, table, round) {
    if (!canTable(gid, table)) fail('NOT_YOUR_TABLE'); db.results = db.results.filter(r => !(r.game_id === gid && r.table_no === table && r.round === round)); save(); },
  async openEnvelope(gid, table, key) {
    if (table == null && member(gid)?.role !== 'admin') fail('ADMIN_ONLY');
    if (table != null && !canTable(gid, table)) fail('NOT_YOUR_TABLE');
    const g = game(gid), s = SECRETS.find(x => x.round === g.round && x.kind === 'env_' + key);
    for (let t = 1; t <= g.n_tables; t++) if (table == null || table === t)
      db.events.push({ id: db.seq++, game_id: gid, table_no: t, round: g.round, kind: 'envelope', audience: s.audience, payload: { key, body: s.body }, created_at: new Date().toISOString() });
    save();
  },
  async postEvent(e) {
    if (e.table_no == null ? member(e.game_id)?.role !== 'admin' : !canTable(e.game_id, e.table_no)) fail('NOT_YOUR_TABLE'); db.events.push({ ...e, id: db.seq++, audience: e.audience || 'all', created_at: new Date().toISOString() }); save(); },
  async renameTeam(tid, name) {
    const t = db.teams.find(x => x.id === tid); if (!t) return;
    const m = member(t.game_id);
    if (!(m?.role === 'admin' || (m?.team_id === tid && game(t.game_id).phase === 'lobby'))) return;   // like the database policy: no error, nothing changes
    t.name = name; save();
  },
  async setJoinsLocked(gid, locked) { if (member(gid)?.role !== 'admin') fail('ADMIN_ONLY'); game(gid).joins_locked = locked; save(); },
  async heartbeat(gid, client) {
    if (member(gid)) {
      const pr = presence(), k = gid + '|' + me().id;
      if (!(pr[k]?.client?.simUntil > Date.now())) { pr[k] = { game_id: gid, user_id: me().id, last_seen: new Date().toISOString(), client }; setPresence(pr); }
    }
    return new Date().toISOString();
  },
  ...ops,
  // Demo only: play every role from one window.
  async switchTo(gid, who) {
    if (who === 'admin') { setMe(org()); listeners.forEach(f => f()); return; }
    const isFac = who.startsWith('fac-'), uid = 'demo-' + gid.slice(0, 8) + '-' + who;
    if (!db.members.some(m => m.game_id === gid && m.user_id === uid)) {
      const t = db.teams.find(x => x.id === who);
      db.members.push({ game_id: gid, user_id: uid, role: isFac ? 'facilitator' : 'player', team_id: t?.id || null, tables: isFac ? [+who.slice(4)] : [], name: isFac ? 'Facilitator ' + who.slice(4) : 'Demo', joined_at: new Date().toISOString() });
    }
    setMe({ id: uid, is_anonymous: true }); save();
  },
  userId() { return me()?.id || null; },
  // «Back to your game» in the demo: take back the identity this browser used in that game.
  async adopt(uid) { if (db.members.some(m => m.user_id === uid)) setMe({ id: uid, is_anonymous: true }); },
  // Looks at a game as another identity of this browser without switching to it.
  async snapshotAs(gid, uid) { const prev = me(); setMe({ id: uid, is_anonymous: true }); try { return await api.snapshot(gid); } finally { setMe(prev); } },
  whoAmI(gid) { const m = member(gid); return !m ? '' : m.role === 'admin' ? 'admin' : m.role === 'facilitator' ? 'fac-' + (m.tables || [1])[0] : m.team_id; },
  async kick(gid, userId) { db.members = db.members.filter(m => !(m.game_id === gid && m.user_id === userId)); save(); },
};
