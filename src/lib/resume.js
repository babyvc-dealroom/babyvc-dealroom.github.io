// «Back to your game» in one tap: this device remembers the last game it joined.
// The Supabase session already survives a closed browser; this only remembers which game to reopen.
import { api } from './api/index.js';

const KEY = 'bvc-last-game';
const MAX_AGE = 24 * 60 * 60 * 1000;

// Called by the «Back to the game» button, just before opening the game.
export async function resumeGame(rec) { if (rec.uid && api.adopt) await api.adopt(rec.uid); }

export function rememberGame(snap) {
  const me = snap?.me; if (!me) return;
  const t = snap.teams.find(x => x.id === me.team_id);
  const rec = { id: snap.game.id, name: snap.game.name, role: me.role, team: t?.name || null, side: t?.role || null,
    table: t?.table_no ?? (me.tables || [])[0] ?? null, uid: api.userId?.() || null, at: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch { /* private mode: nothing to remember */ }
}

// Without an id: forget whatever is remembered. With an id: only if it is that game.
export function forgetGame(id) {
  try { if (!id || JSON.parse(localStorage.getItem(KEY))?.id === id) localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// The remembered game, checked against the server: null if it ended, was deleted, or this device was removed.
export async function checkLastGame() {
  let rec = null;
  try { rec = JSON.parse(localStorage.getItem(KEY)); } catch { /* none */ }
  if (!rec?.id || Date.now() - rec.at > MAX_AGE) { forgetGame(); return null; }
  try {
    // Demo only: identities live per tab, so look as the remembered one without switching to it.
    const s = rec.uid && api.snapshotAs ? await api.snapshotAs(rec.id, rec.uid) : await api.snapshot(rec.id);
    if (!s?.me || s.game.phase === 'ended') { forgetGame(); return null; }
    return { ...rec, phase: s.game.phase, round: s.game.round };
  } catch { return { ...rec, unchecked: true }; }   // offline: still offer it, the game page will tell
}
