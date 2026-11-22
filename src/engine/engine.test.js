import { describe, it, expect } from 'vitest';
import { journey, tablePath, exitProceeds, round1, walkBreaches, OPENING } from './model.js';
import { scoreRound, packCards } from './scoring.js';
import { leaderboard } from './leaderboard.js';
import { SECRETS } from '@private-pack';
import { IS_REAL_PACK } from '../../scenarios/flussi-energy/resolve.mjs';

const pct = x => Math.round(x * 1000) / 10;
const signed = (terms, extra = {}) => ({ outcome: 'signed', terms, trades: { f: 6, i: 6 }, rel: { f: 8, i: 8 }, facts: { f: 0, i: 0 }, ...extra });
const sweet = Object.fromEntries(SECRETS.filter(s => s.kind === 'sweet').map(s => [s.round, s.body.terms]));

describe('public cap table model', () => {
  it('a post-money SAFE stake is investment / cap', () => {
    expect(pct(round1({ cap: 4.5 }).s)).toBe(13.3);
    expect(pct(round1({ cap: 6 }).s)).toBe(10);
  });
  it('Numbers card R2: €8M pre and 14% pool gives 47.4% (public table of the kit)', () => {
    expect(pct(journey({ cap: 4.5, deadEquity: 2, rights: 2 }, { pre: 8, pool: 14 }).r2.founders)).toBe(47.4);
  });
  it('2x super pro-rata leaves the club €733k', () => {
    expect(Math.round(journey({ cap: 4.5, deadEquity: 2, rights: 0 }).r2.clubM * 1000)).toBe(733);
  });
  it('unsigned rounds default to the investors\' opening, never to a hidden number', () => {
    const p = tablePath({});
    expect(p.opts).toEqual({ 1: OPENING[1], 2: OPENING[2], 3: OPENING[3] });
  });
  it('flags walk-away breaches from a card', () => {
    expect(walkBreaches(1, {}, { cap: 3.8, deadEquity: 2, rights: 2 }, { cap: { min: 4 }, rights: { forbid: [0] } })).toEqual(['cap']);
  });
});

describe('scoring with the pack cards', () => {
  it('every round of the pack has three scoring cards and a sweet spot', () => {
    for (const r of [1, 2, 3]) { expect(packCards(SECRETS, r)).toHaveLength(3); expect(sweet[r]).toBeTruthy(); }
  });
  it('the sweet spot is inside every band, so both sides get the create-value bonus', () => {
    for (const r of [1, 2, 3]) {
      const s = scoreRound(r, signed(sweet[r]), {}, packCards(SECRETS, r), sweet);
      expect(s.f.create).toBe(15); expect(s.i.create).toBe(15);
    }
  });
  it('leaderboard ranks per league over N rounds', () => {
    const teams = [1, 2].flatMap(k => [{ id: 's' + k, table_no: k, role: 'startup' }, { id: 'i' + k, table_no: k, role: 'investor' }]);
    const res = [{ table_no: 1, round: 1, status: 'scored', result: { f: { total: 80, rel: 8 }, i: { total: 60, rel: 7 } } },
      { table_no: 2, round: 1, status: 'scored', result: { f: { total: 70, rel: 9 }, i: { total: 75, rel: 7 } } }];
    const L = leaderboard(teams, res, 2);
    expect(L.startup[0].team.id).toBe('s1'); expect(L.investor[0].team.id).toBe('i2'); expect(L.overall[0].adj).toBe(57.5);
  });
});

// Numbers from the kit's solutions: they need the real pack and do not run on the public sample.
describe.skipIf(!IS_REAL_PACK)('kit v3 solutions (real pack only)', () => {
  it('sweet-spot path: founders 55.6% after seed, 40.1% after Series A, about €60M at a €150M exit', () => {
    const { r2, r3 } = journey(sweet[1], sweet[2], sweet[3]);
    expect(pct(r2.founders)).toBe(55.6); expect(pct(r3.founders)).toBe(40.1);
    expect(Math.round(exitProceeds(journey(sweet[1], sweet[2], sweet[3]), 150).founders)).toBe(60);
  });
  it('sweet spot gives 71.5 points to both sides', () => {
    const s = scoreRound(1, signed(sweet[1]), {}, packCards(SECRETS, 1), sweet);
    expect(s.f.total).toBe(71.5); expect(s.i.total).toBe(71.5);
  });
  it('demo table 2: a €46M Series A breaks the 38% walk-away and zeroes the startup claim value', () => {
    const prev = { 1: signed({ cap: 4.0, deadEquity: 0, rights: 1 }), 2: signed({ pre: 9, pool: 12, poolCheck: true, board: 1 }) };
    const s = scoreRound(3, signed({ pre: 46, mna: 2, partner: 2 }), prev, packCards(SECRETS, 3), sweet);
    expect(pct(s.founders)).toBe(37.3); expect(s.ownBreach).toBe(true); expect(s.f.claim).toBe(0);
  });
});
