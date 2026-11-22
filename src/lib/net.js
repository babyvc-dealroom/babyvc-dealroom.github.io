// Connection health of this device: browser online flag, realtime channel, failing requests,
// clock offset from the server, latency, app errors. Read by the banner, sent by the heartbeat.
import { useSyncExternalStore } from 'react';

export const APP_VERSION = '0.2.0';
const SIM_KEY = 'bvc-sim';
const readSim = () => { try { return sessionStorage.getItem(SIM_KEY) || null; } catch { return null; } };

const st = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  rt: 'idle',          // realtime channel: idle | SUBSCRIBED | CHANNEL_ERROR | TIMED_OUT | CLOSED
  fails: 0,            // consecutive requests that did not reach the server
  lastOk: Date.now(),
  offset: 0,           // server clock minus this device's clock, ms
  lat: null,           // last heartbeat round trip, ms
  errs: 0, lastErr: '',
  wake: false,         // screen kept on (Wake Lock)
  sim: readSim(),      // simulated failure on this device: offline | slow | realtime | skew
};
let snap = { ...st };
const subs = new Set();
const emit = () => { snap = { ...st }; subs.forEach(f => f()); };

export const net = {
  get: () => snap,
  sub(f) { subs.add(f); return () => subs.delete(f); },
  set(p) { if (Object.entries(p).some(([k, v]) => st[k] !== v)) { Object.assign(st, p); emit(); } },
  ok() { st.lastOk = Date.now(); if (st.fails) { st.fails = 0; emit(); } },
  fail() { st.fails += 1; emit(); },
  error(msg) { st.errs += 1; st.lastErr = String(msg || '').slice(0, 120); emit(); },
  clock(serverIso, t0, t1) {
    const server = new Date(serverIso).getTime(); if (!server) return;
    const off = server - (t0 + t1) / 2;
    net.set({ offset: Math.abs(off - st.offset) > 1500 ? Math.round(off) : Math.round((st.offset + off) / 2), lat: Math.round(t1 - t0) });
  },
  simulate(kind) {
    try { kind ? sessionStorage.setItem(SIM_KEY, kind) : sessionStorage.removeItem(SIM_KEY); } catch { /* ignore */ }
    net.set({ sim: kind || null, fails: 0 });
  },
};

if (typeof window !== 'undefined') {
  addEventListener('online', () => net.set({ online: true }));
  addEventListener('offline', () => net.set({ online: false }));
  addEventListener('error', e => { if (!/ResizeObserver/.test(e.message)) net.error(e.message); });
  addEventListener('unhandledrejection', e => { const m = e.reason?.message || String(e.reason); if (!isNetErr(e.reason)) net.error(m); });
}

export const serverNow = () => Date.now() + st.offset;
export const isNetErr = e => /NETWORK|Failed to fetch|NetworkError|Load failed|fetch failed|ERR_INTERNET|timeout/i.test(e?.message || String(e || ''));

// ok | slow | reconnecting | offline
export function health(s = snap) {
  if (!s.online || s.sim === 'offline') return 'offline';
  if (s.fails >= 2 || s.sim === 'realtime' || ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(s.rt)) return 'reconnecting';
  if (s.sim === 'slow' || (s.lat != null && s.lat > 1500)) return 'slow';
  return 'ok';
}

export function useNet() { return useSyncExternalStore(net.sub, net.get); }

// What a device reports in its heartbeat (kept small: the server ignores anything over 2 KB).
export function clientReport(extra = {}) {
  const ua = navigator.userAgent;
  return {
    on: st.online && st.sim !== 'offline', rt: st.sim === 'realtime' ? 'CHANNEL_ERROR' : st.rt, fails: st.fails,
    lat: st.sim === 'slow' ? Math.max(2400, st.lat || 0) : st.lat, skew: st.sim === 'skew' ? st.offset - 95000 : st.offset, errs: st.errs, err: st.lastErr,
    dev: /Mobi|Android|iPhone|iPad/.test(ua) ? 'mobile' : 'desktop',
    br: /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'other',
    vis: document.visibilityState === 'visible', wl: st.wake, v: APP_VERSION, ...extra,
  };
}

// Readable error for people, whatever the backend said.
export function errText(x, L) {
  const m = x?.message || String(x);
  if (isNetErr(x)) return L('Nessuna connessione: non è partito nulla. Riprova appena torna la rete.', 'No connection: nothing was sent. Try again once the network is back.');
  const known = {
    OFFER_CLOSED: L('Questa offerta non è più aperta: è arrivata una controproposta o è stata ritirata.', 'This offer is no longer open: a counter-offer arrived or it was withdrawn.'),
    ROUND_CLOSED: L('Il round è chiuso: il game master è andato avanti.', 'The round is closed: the game master moved on.'),
    ALREADY_SIGNED: L('Il vostro tavolo ha già firmato questo round.', 'Your table has already signed this round.'),
    OFFER_NOT_ALLOWED: L('In questa fase non si possono mandare offerte.', 'Offers cannot be sent in this phase.'),
    INVALID_TERMS: L('Valori fuori dai limiti del term sheet.', 'Values outside the term sheet limits.'),
    NOT_YOUR_TABLE: L('Non è un tavolo assegnato a te.', 'This table is not assigned to you.'),
    NOT_YOUR_OFFER: L('Non puoi rispondere alla tua stessa offerta.', 'You cannot answer your own offer.'),
  };
  const k = Object.keys(known).find(c => m.includes(c));
  return k ? known[k] : m;
}
