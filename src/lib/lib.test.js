import { describe, it, expect } from 'vitest';
import { nextStep, allSteps } from './phases.js';
import { diagnose, diagnoseGame, deviceState } from './diagnose.js';
import { health, errText } from './net.js';

const L = (it) => it;

describe('phases', () => {
  it('a three-round game ends with the exit', () => {
    expect(nextStep({ phase: 'debrief', round: 3, n_rounds: 3 })).toEqual({ round: 3, phase: 'exit' });
    expect(allSteps(3).map(s => s.phase).slice(-2)).toEqual(['exit', 'ended']);
  });
  it('one- and two-round games skip the exit (its content needs all three rounds)', () => {
    expect(nextStep({ phase: 'debrief', round: 2, n_rounds: 2 })).toEqual({ round: 2, phase: 'ended' });
    expect(allSteps(1).map(s => s.phase)).toEqual(['lobby', 'brief', 'negotiate', 'sign', 'debrief', 'ended']);
  });
});

const NOW = Date.parse('2026-11-18T18:00:00Z');
const ago = s => new Date(NOW - s * 1000).toISOString();
const ok = { on: true, rt: 'SUBSCRIBED', fails: 0, lat: 100, skew: 0, errs: 0, vis: true };
const game = (over = {}) => ({ id: 'g1', name: 'Test', phase: 'negotiate', round: 1, n_rounds: 3, joins_locked: true, phase_ends_at: new Date(NOW + 60000).toISOString(), ...over });
const teams = [{ id: 's1', table_no: 1, role: 'startup', name: 'Volt' }, { id: 'i1', table_no: 1, role: 'investor', name: 'Lumen' }];
const m = (id, team, client, seen = 5, role = 'player') => ({ user_id: id, name: id, role, team_id: team, last_seen: seen == null ? null : ago(seen), client });

describe('diagnose', () => {
  it('a healthy room has no problems', () => {
    const x = { game: game(), teams, members: [m('gm', null, ok, 5, 'admin'), m('a', 's1', ok), m('b', 'i1', ok)], results: [], fails10: 0, blocked: 0 };
    expect(diagnoseGame(x, NOW)).toEqual([]);
  });
  it('spots each device problem', () => {
    const x = { game: game(), teams, results: [], fails10: 0, blocked: 0, members: [
      m('gm', null, ok, 5, 'admin'), m('off', 's1', ok, 90), m('rt', 's1', { ...ok, rt: 'CHANNEL_ERROR' }), m('slow', 'i1', { ...ok, lat: 2600 }),
      m('clock', 'i1', { ...ok, skew: -95000 }), m('bug', 'i1', { ...ok, errs: 2, err: 'TypeError' }), m('fail', 'i1', { ...ok, fails: 3 })] };
    const kinds = diagnoseGame(x, NOW).map(i => i.kind).sort();
    expect(kinds).toEqual(['error', 'failing', 'offline', 'realtime', 'skew', 'slow']);
  });
  it('the game master offline is critical for the ops console, hidden in the game master own view', () => {
    const x = { game: game(), teams, members: [m('gm', null, ok, 200, 'admin'), m('a', 's1', ok), m('b', 'i1', ok)], results: [], fails10: 0, blocked: 0 };
    expect(diagnoseGame(x, NOW)[0]).toMatchObject({ kind: 'gm_offline', sev: 'critical' });
    expect(diagnoseGame(x, NOW, { forGm: true })).toEqual([]);
  });
  it('room problems: overdue phase, PIN guessing, joins open, empty squad, unscored debrief', () => {
    const x = { game: game({ phase_ends_at: ago(300), joins_locked: false }), teams, members: [m('gm', null, ok, 5, 'admin'), m('a', 's1', ok)], results: [], fails10: 14, blocked: 1 };
    expect(diagnoseGame(x, NOW).map(i => i.kind).sort()).toEqual(['blocked', 'empty_squad', 'joins_open', 'overdue', 'pin_guessing']);
    const d = { game: game({ phase: 'debrief', phase_ends_at: null }), teams, members: [m('gm', null, ok, 5, 'admin'), m('a', 's1', ok), m('b', 'i1', ok)], results: [{ table_no: 1, round: 1, status: 'signed' }], fails10: 0, blocked: 0 };
    expect(diagnoseGame(d, NOW).map(i => i.kind)).toEqual(['unscored']);
  });
  it('global problems are sorted critical first', () => {
    const g = { game: game(), teams, members: [m('gm', null, ok, 300, 'admin'), m('a', 's1', ok), m('b', 'i1', ok)], results: [], fails10: 0, blocked: 0 };
    const out = diagnose({ games: [g], badCodes10: 20, cron: false, oldGames: 2, dbBytes: 1, opsFails: 0 }, NOW);
    expect(out[0].sev).toBe('critical');
    expect(out.map(i => i.kind)).toEqual(expect.arrayContaining(['bad_codes', 'no_cron', 'old_data']));
  });
  it('a device silent for hours has left, it is not a problem', () => {
    expect(deviceState(m('x', 's1', ok, 3 * 3600), NOW)).toBe('gone');
    expect(deviceState(m('x', 's1', null, null), NOW)).toBe('unknown');
  });
});

describe('connection', () => {
  it('health reads the device state', () => {
    expect(health({ online: false })).toBe('offline');
    expect(health({ online: true, fails: 2 })).toBe('reconnecting');
    expect(health({ online: true, fails: 0, rt: 'CHANNEL_ERROR' })).toBe('reconnecting');
    expect(health({ online: true, fails: 0, rt: 'SUBSCRIBED', lat: 2000 })).toBe('slow');
    expect(health({ online: true, fails: 0, rt: 'SUBSCRIBED', lat: 80 })).toBe('ok');
  });
  it('network errors become a plain sentence', () => {
    expect(errText(new Error('TypeError: Failed to fetch'), L)).toMatch(/Nessuna connessione/);
    expect(errText(new Error('OFFER_CLOSED'), L)).toMatch(/non è più aperta/);
  });
});
