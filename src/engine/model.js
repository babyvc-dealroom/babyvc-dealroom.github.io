// Flussi Energy cap-table model: one company, up to three rounds, one table.
// Stakes are fully diluted fractions (0..1). Money in EUR millions.
// Ported from the Deal Room calculator (kit v3). No confidential number lives here: sweet spots and scoring
// cards are part of the scenario's private pack.

export const CASE = {
  start: { Andrea: 0.45, Chiara: 0.45, Luca: 0.10, ESOP: 0 },
  r1: { amount: 0.6, angels: 0.25, lanterna: 0.35 },
  r2: { amount: 3.0, lumen: 1.8, clubMax: 1.2, clubMin: 0.8 },
  r3: { amount: 15, verdis: 9, nova: 6, esopPost: 0.12 },
  deadEquity: [[0, 0.10], [0.02, 0.10], [0.03, 0.07], [0.05, 0.05], [0.10, 0]],
  proRata: [{ mult: 2 }, { mult: 2 }, { mult: 1 }, { mult: 1, capM: 0.15 }, { mult: 0 }],
  board: [{ F: 2, I: 3, X: 0 }, { F: 2, I: 2, X: 1 }, { F: 2, I: 1, X: 1 }, { F: 2, I: 1, X: 0 }, { F: 2, I: 0, X: 0 }],
};

// Public lever shapes: the key, the type and a generous slider range (not the ZOPA).
export const LEVER_SHAPES = {
  1: [{ key: 'cap', type: 'num', min: 3, max: 7, step: 0.1, unit: '€M' }, { key: 'deadEquity', type: 'opt', n: 5 }, { key: 'rights', type: 'opt', n: 5 }],
  2: [{ key: 'pre', type: 'num', min: 7, max: 15, step: 0.1, unit: '€M' }, { key: 'pool', type: 'num', min: 6, max: 16, step: 0.5, unit: '%', check: true }, { key: 'board', type: 'opt', n: 5 }],
  3: [{ key: 'pre', type: 'num', min: 35, max: 70, step: 0.5, unit: '€M' }, { key: 'mna', type: 'opt', n: 5 }, { key: 'partner', type: 'opt', n: 5 }],
};
export const MAX_ROUNDS = 3;
// The investors' opening term sheet (public in the kit): the composer starts here, and it is the public reference for unsigned rounds.
export const OPENING = { 1: { cap: 3.5, deadEquity: 0, rights: 0 }, 2: { pre: 8, pool: 14, board: 0 }, 3: { pre: 40, mna: 0, partner: 0 } };
export const WALK = { 2: 0.50, 3: 0.38 }; // founders combined after the round (public in the kit)

const norm = t => { const s = Object.values(t).reduce((a, b) => a + b, 0); const o = {}; for (const k in t) o[k] = t[k] / s; return o; };

export function round1(o) {
  const [luca, esop] = CASE.deadEquity[o.deadEquity ?? OPENING[1].deadEquity];
  const f = (1 - luca - esop) / 2;
  const pre = { Andrea: f, Chiara: f, Luca: luca, ESOP: esop };
  const cap = o.cap ?? OPENING[1].cap, s = CASE.r1.amount / cap;
  const conv = { Andrea: f * (1 - s), Chiara: f * (1 - s), Luca: luca * (1 - s), ESOP: esop * (1 - s), Angels: s * CASE.r1.angels / CASE.r1.amount, Lanterna: s * CASE.r1.lanterna / CASE.r1.amount };
  return { pre, cap, s, conv, proRata: CASE.proRata[o.rights ?? OPENING[1].rights], founders: 2 * f * (1 - s) };
}

export function round2(r1, o) {
  const P = o.pre ?? OPENING[2].pre, p = (o.pool ?? OPENING[2].pool) / 100, A = CASE.r2.amount;
  const post = P + A, n = A / post, preCap = 1 - n;
  const safe = r1.s * preCap;
  const esop0 = r1.pre.ESOP * (1 - r1.s) * preCap;
  const pool = Math.max(p, esop0);
  const others = preCap - safe - pool;
  const base = r1.pre.Andrea + r1.pre.Chiara + r1.pre.Luca;
  const lanPre = r1.s * CASE.r1.lanterna / CASE.r1.amount;
  let pr = lanPre * A * r1.proRata.mult; if (r1.proRata.capM) pr = Math.min(pr, r1.proRata.capM);
  const club = Math.max(0, CASE.r2.clubMax - pr);
  const t = {
    Andrea: others * r1.pre.Andrea / base, Chiara: others * r1.pre.Chiara / base, Luca: others * r1.pre.Luca / base, ESOP: pool,
    Angels: safe * CASE.r1.angels / CASE.r1.amount, Lanterna: safe * CASE.r1.lanterna / CASE.r1.amount + pr / post,
    Lumen: CASE.r2.lumen / post, Club: club / post,
  };
  const sum = Object.values(t).reduce((a, b) => a + b, 0);
  return { P, post, pool, proRataM: pr, clubM: club, clubShort: club < CASE.r2.clubMin - 1e-9,
    table: norm(t), founders: (t.Andrea + t.Chiara) / sum, board: CASE.board[o.board ?? OPENING[2].board], boardIdx: o.board ?? OPENING[2].board };
}

export function round3(r2, o) {
  const Q = o.pre ?? OPENING[3].pre, A = CASE.r3.amount, post = Q + A, n = A / post;
  const t0 = r2.table, esop0 = t0.ESOP * (1 - n);
  const pool = Math.max(CASE.r3.esopPost, esop0), nonPool = 1 - t0.ESOP, rest = 1 - n - pool;
  const t = {};
  for (const k in t0) if (k !== 'ESOP') t[k] = rest * t0[k] / nonPool;
  t.ESOP = pool; t.Verdis = CASE.r3.verdis / post; t.Nova = CASE.r3.nova / post;
  return { Q, post, table: t, founders: t.Andrea + t.Chiara, mna: o.mna ?? OPENING[3].mna };
}

export function journey(o1 = {}, o2 = {}, o3 = {}) {
  const r1 = round1(o1), r2 = round2(r1, o2), r3 = round3(r2, o3);
  return { r1, r2, r3 };
}

// results: { 1: row, 2: row, 3: row } where row = { outcome, terms }.
// refs: terms used for rounds that are not signed. The sweet spot of a round reaches a player only after that
// round is over (from the database); before that, the public reference is the investors' opening term sheet.
export function tablePath(results = {}, refs = OPENING) {
  const opts = {}, assumed = {};
  for (const r of [1, 2, 3]) {
    const row = results[r];
    opts[r] = { ...(refs[r] || OPENING[r]) };
    assumed[r] = !(row && row.outcome === 'signed');
    if (!assumed[r]) for (const l of LEVER_SHAPES[r]) { const v = row.terms?.[l.key]; if (v !== undefined && v !== '' && !isNaN(+v)) opts[r][l.key] = +v; else assumed[r] = true; }
  }
  return { j: journey(opts[1], opts[2], opts[3]), opts, assumed };
}

// Founders combined after a given round, for an offer under discussion.
export function foundersAfter(round, results, terms, refs = OPENING) {
  const p = tablePath({ ...results, [round]: { outcome: 'signed', terms: { ...(refs[round] || OPENING[round]), ...terms } } }, refs);
  return round === 1 ? p.j.r1.founders : round === 2 ? p.j.r2.founders : p.j.r3.founders;
}

// ---- Exit waterfall: 1x non-participating preferred, pari passu ----
function payout(equity, classes, conv) {
  const out = {}; classes.forEach(c => { out[c.name] = 0; });
  let rem = equity;
  const jr = classes.filter(c => c.type === 'np' && !conv.has(c.name));
  const jrTot = jr.reduce((a, c) => a + c.pref, 0);
  if (jrTot > 0) { const paid = Math.min(rem, jrTot); jr.forEach(c => { out[c.name] += paid * c.pref / jrTot; }); rem -= paid; }
  const sharers = classes.filter(c => c.type === 'common' || conv.has(c.name));
  const units = sharers.reduce((a, c) => a + c.pct, 0);
  sharers.forEach(c => { out[c.name] += rem * c.pct / units; });
  return out;
}
export function waterfall(equity, classes) {
  const np = classes.filter(c => c.type === 'np');
  for (let m = 0; m < 1 << np.length; m++) {
    const conv = new Set(np.filter((c, i) => m & (1 << i)).map(c => c.name));
    const res = payout(equity, classes, conv);
    const stable = np.every(c => { const alt = new Set(conv); conv.has(c.name) ? alt.delete(c.name) : alt.add(c.name); return payout(equity, classes, alt)[c.name] <= res[c.name] + 1e-9; });
    if (stable) return res;
  }
  return payout(equity, classes, new Set());
}

// ROFR on the sale of the company chills other bidders: a teaching haircut on the exit value.
export const ROFR_HAIRCUT = 0.15;
export function exitProceeds(j, E) {
  const t = j.r3.table, hair = j.r3.mna === 0 ? ROFR_HAIRCUT : 0, eq = E * (1 - hair);
  const w = waterfall(eq, [
    { name: 'founders', pct: t.Andrea + t.Chiara, type: 'common' }, { name: 'luca', pct: t.Luca, type: 'common' }, { name: 'esop', pct: t.ESOP, type: 'common' },
    { name: 'seed', pct: t.Angels + t.Lanterna + t.Lumen + t.Club, type: 'np', pref: CASE.r1.amount + CASE.r2.amount },
    { name: 'seriesA', pct: t.Verdis + t.Nova, type: 'np', pref: CASE.r3.amount }]);
  return { ...w, haircut: hair, equity: eq };
}

export const HOLDERS = ['Andrea', 'Chiara', 'Luca', 'ESOP', 'Angels', 'Lanterna', 'Lumen', 'Club', 'Verdis', 'Nova'];


// Checks an offer against a squad's own walk-aways (from its private card). Returns the lever keys breached.
export function walkBreaches(round, results, terms, walk, refs = OPENING) {
  if (!walk) return [];
  const out = [];
  for (const [k, w] of Object.entries(walk)) {
    if (k === 'founders') { if (round > 1 && foundersAfter(round, results, terms, refs) < w - 1e-9) out.push('founders'); continue; }
    const v = terms[k]; if (v === undefined || v === '') continue;
    if (w.min != null && +v < w.min - 1e-9) out.push(k);
    if (w.max != null && +v > w.max + 1e-9) out.push(k);
    if (w.forbid && w.forbid.includes(+v)) out.push(k);
  }
  return out;
}
