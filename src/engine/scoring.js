// Scoring engine (Part C of the kit). The scoring CARDS (ZOPA, bands, ladders) are not in this file:
// they come from the confidential pack in the database and only facilitators and the game master receive them.
import { tablePath, WALK, OPENING } from './model.js';

export const SCORING = { close: { signed: 20, argued: 10, none: 0 }, trades: [10, 6, 2, 0], penalty: -10 };

// card: { key, type: 'num', lo, hi, dir, band: [a, b], noBreach?, check? } or { key, type: 'opt', pts: [[startupPoints, flags], ...] }
export function scoreLever(card, terms = {}) {
  const r = { f: 0, i: 0, band: false, fBreach: false, iBreach: false, filled: false };
  const raw = terms[card.key];
  if (raw === undefined || raw === '' || raw === null) return r;
  if (card.type === 'num') {
    const x = parseFloat(raw); if (isNaN(x)) return r;
    r.filled = true;
    const t = Math.max(0, Math.min(1, (x - card.lo) / (card.hi - card.lo)));
    r.f = 15 * (card.dir === 'up' ? t : 1 - t);
    if (!card.noBreach) {
      if (x < card.lo - 1e-9) card.dir === 'up' ? (r.fBreach = true) : (r.iBreach = true);
      if (x > card.hi + 1e-9) card.dir === 'up' ? (r.iBreach = true) : (r.fBreach = true);
    }
    r.band = x >= card.band[0] - 1e-9 && x <= card.band[1] + 1e-9 && (!card.check || !!terms[card.key + 'Check']);
  } else {
    const opt = card.pts[parseInt(raw, 10)]; if (!opt) return r;
    r.filled = true; r.f = opt[0]; r.band = !!opt[1].band; r.fBreach = !!opt[1].f; r.iBreach = !!opt[1].i;
  }
  r.i = 15 - r.f;
  return r;
}

// row: { outcome, terms, trades:{f,i}, rel:{f,i}, facts:{f,i}, breach:{f,i} }; prev: earlier results at the table
// cards: the round's scoring cards; refs: terms for unsigned rounds (sweet spots, for staff)
export function scoreRound(round, row, prev = {}, cards = [], refs = OPENING) {
  const levers = cards.map(c => scoreLever(c, row.terms));
  const signed = row.outcome === 'signed';
  let founders = null, ownBreach = false;
  if (round > 1) {
    const p = tablePath({ ...prev, [round]: row }, refs);
    founders = round === 2 ? p.j.r2.founders : p.j.r3.founders;
    if (signed && levers.length && levers.every(x => x.filled) && founders < WALK[round] - 1e-9) ownBreach = true;
  }
  const side = s => {
    const close = SCORING.close[row.outcome || 'none'] ?? 0;
    const breach = !!row.breach?.[s] || levers.some(r => r[s + 'Breach']) || (s === 'f' && ownBreach);
    const claim = signed && !breach ? levers.reduce((a, r) => a + r[s], 0) : 0;
    const create = signed ? levers.reduce((a, r) => a + (r.band ? 5 : 0), 0) : 0;
    const trades = +(row.trades?.[s] ?? 0) || 0;
    const rel = Math.max(0, Math.min(10, +(row.rel?.[s] ?? 0) || 0));
    const pen = (+(row.facts?.[s] ?? 0) || 0) * SCORING.penalty;
    return { close, claim, create, trades, rel, pen, breach, total: close + claim + create + trades + rel + pen };
  };
  return { levers, f: side('f'), i: side('i'), founders, ownBreach };
}

// Pack helpers: rows as returned by my_cards().
export const packCards = (rows, round) => rows.find(r => r.round === round && r.kind === 'scoring')?.body?.cards || [];
