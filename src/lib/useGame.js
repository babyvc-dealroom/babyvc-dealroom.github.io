import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from './api/index.js';
import { net, serverNow, clientReport } from './net.js';

// Live snapshot of one game: realtime changes when the channel works, polling when it does not,
// and a fresh load whenever the device comes back online or the tab becomes visible again.
export function useGame(gameId) {
  const [snap, setSnap] = useState(undefined);
  const timer = useRef(null), last = useRef(0), rt = useRef('idle');
  const load = useCallback(async () => {
    last.current = Date.now();
    try { setSnap(await api.snapshot(gameId)); } catch (e) { console.warn(e); }
  }, [gameId]);
  useEffect(() => {
    let alive = true;
    load();
    const kick = () => { clearTimeout(timer.current); timer.current = setTimeout(load, 120); };
    const off = api.subscribe(gameId, () => { if (net.get().sim !== 'realtime') kick(); }, status => {
      if (!alive) return;
      const was = rt.current; rt.current = status; net.set({ rt: status });
      if (status === 'SUBSCRIBED' && was !== 'idle' && was !== 'SUBSCRIBED') kick();   // back after a drop: catch up
    });
    // Fallback: every 5 s while realtime is down, every 25 s anyway.
    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const down = rt.current !== 'SUBSCRIBED' || net.get().sim === 'realtime' || net.get().fails > 0;
      if (Date.now() - last.current > (down ? 5000 : 25000)) load();
    }, 2500);
    const wake = () => { if (document.visibilityState === 'visible') kick(); };
    addEventListener('online', kick); document.addEventListener('visibilitychange', wake);
    return () => { alive = false; off(); clearTimeout(timer.current); clearInterval(poll); removeEventListener('online', kick); document.removeEventListener('visibilitychange', wake); net.set({ rt: 'idle' }); };
  }, [gameId, load]);
  return [snap, load];
}

// «I'm here» every 15 s: tells the game master and the ops console how this device is doing,
// and brings back the server clock so every timer in the room shows the same seconds.
export function useHeartbeat(gameId, extra) {
  const ex = useRef(extra); ex.current = extra;
  useEffect(() => {
    if (!gameId) return;
    let stop = false;
    const beat = async () => {
      const t0 = Date.now();
      try { const now = await api.heartbeat(gameId, clientReport(ex.current)); if (!stop) net.clock(now, t0, Date.now()); } catch { /* reported by the api wrapper */ }
    };
    beat();
    const t = setInterval(beat, 15000);
    const wake = () => document.visibilityState === 'visible' && beat();
    document.addEventListener('visibilitychange', wake); addEventListener('online', beat);
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', wake); removeEventListener('online', beat); };
  }, [gameId]);
}

// Results of one table, keyed by round.
export const tableResults = (snap, table) => Object.fromEntries((snap?.results || []).filter(r => r.table_no === table).map(r => [r.round, r]));

// Fires cb once for each new item (by id) after the first render.
export function useNewItems(items, cb) {
  const seen = useRef(null);
  useEffect(() => {
    if (!items) return;
    const ids = new Set(items.map(x => x.id ?? x.key));
    if (seen.current) for (const x of items) if (!seen.current.has(x.id ?? x.key)) cb(x);
    seen.current = ids;
  }, [items, cb]);
}

// Seconds left until an ISO timestamp, ticking on the server clock.
export function useCountdown(endsAt) {
  const [now, setNow] = useState(serverNow());
  useEffect(() => { const t = setInterval(() => setNow(serverNow()), 500); return () => clearInterval(t); }, []);
  if (!endsAt) return null;
  return Math.max(0, Math.round((new Date(endsAt).getTime() - now) / 1000));
}
