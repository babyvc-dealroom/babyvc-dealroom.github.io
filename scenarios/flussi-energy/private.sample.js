// SAMPLE confidential pack for Flussi Energy: same shape as private.js, placeholder content and DIFFERENT numbers.
// It lets contributors run the demo and the tests without the real cards and solutions.
// Organisers get the real pack (private.js) from the scenario's maintainers and keep it out of public repositories.

const T = (it, en) => ({ it, en });
const card = (round, side, walk, levers) => ({
  round, kind: 'card_' + side, audience: side, body: {
    walk,
    it: { title: side === 'startup' ? 'Founder (carta di esempio)' : 'Investitori (carta di esempio)', objectives: 'Carta di esempio: sostituiscila con il pacchetto reale.', levers: levers.it, private: ['Informazione privata di esempio.'], leverage: 'Leva di esempio.', trade: 'Moneta di scambio di esempio.', batna: side === 'startup' ? 'BATNA di esempio.' : undefined },
    en: { title: side === 'startup' ? 'Founders (sample card)' : 'Investors (sample card)', objectives: 'Sample card: replace it with the real pack.', levers: levers.en, private: ['Sample private information.'], leverage: 'Sample leverage.', trade: 'Sample trade currency.', batna: side === 'startup' ? 'Sample BATNA.' : undefined },
  },
});
const env = (round, key, audience) => ({ round, kind: 'env_' + key, audience, body: { it: { title: `Busta ${key} di esempio`, text: 'Evento di esempio per provare il gioco.' }, en: { title: `Sample envelope ${key}`, text: 'Sample event to try the game.' } } });
const sol = round => ({ round, kind: 'solution', audience: 'staff', body: {
  it: { zopa: 'Soluzione di esempio.', sweet: ['Esempio'], envelopes: ['Esempio'], debrief: ['Domanda di esempio?'], mistakes: ['Errore di esempio'] },
  en: { zopa: 'Sample solution.', sweet: ['Sample'], envelopes: ['Sample'], debrief: ['Sample question?'], mistakes: ['Sample mistake'] } } });
const L3 = (a, b, c) => ({ it: [['Leva 1', a, '—'], ['Leva 2', b, '—'], ['Leva 3', c, '—']], en: [['Lever 1', a, '—'], ['Lever 2', b, '—'], ['Lever 3', c, '—']] });
const LADDER = [[0, {}], [4, {}], [7.5, { band: 1 }], [11, {}], [15, {}]];

export const SECRETS = [
  card(1, 'startup', { cap: { min: 3.8 } }, L3('€5,5M', '—', '—')), card(1, 'investor', { cap: { max: 5.4 } }, L3('€4,0M', '—', '—')),
  card(2, 'startup', { pre: { min: 8.5 }, founders: 0.50 }, L3('€13M', '9%', '—')), card(2, 'investor', { pre: { max: 12.5 } }, L3('€9M', '13%', '—')),
  card(3, 'startup', { pre: { min: 44 }, founders: 0.38 }, L3('€58M', '—', '—')), card(3, 'investor', { pre: { max: 57 } }, L3('€44M', '—', '—')),
  ...[1, 2, 3].flatMap(r => [env(r, 'A', 'all'), env(r, 'B', 'all'), env(r, 'spare', 'all'), sol(r)]),
  { round: 1, kind: 'sweet', audience: 'reveal', body: { terms: { cap: 4.6, deadEquity: 2, rights: 2 } } },
  { round: 2, kind: 'sweet', audience: 'reveal', body: { terms: { pre: 10.5, pool: 10, poolCheck: true, board: 2 } } },
  { round: 3, kind: 'sweet', audience: 'reveal', body: { terms: { pre: 51, mna: 2, partner: 2 } } },
  { round: 1, kind: 'scoring', audience: 'staff', body: { cards: [{ key: 'cap', type: 'num', lo: 3.8, hi: 5.4, dir: 'up', band: [4.4, 4.8] }, { key: 'deadEquity', type: 'opt', pts: LADDER }, { key: 'rights', type: 'opt', pts: LADDER }] } },
  { round: 2, kind: 'scoring', audience: 'staff', body: { cards: [{ key: 'pre', type: 'num', lo: 8.5, hi: 12.5, dir: 'up', band: [10, 11] }, { key: 'pool', type: 'num', lo: 8, hi: 13, dir: 'down', band: [9, 11], noBreach: true }, { key: 'board', type: 'opt', pts: LADDER }] } },
  { round: 3, kind: 'scoring', audience: 'staff', body: { cards: [{ key: 'pre', type: 'num', lo: 44, hi: 57, dir: 'up', band: [49, 53] }, { key: 'mna', type: 'opt', pts: LADDER }, { key: 'partner', type: 'opt', pts: LADDER }] } },
];
void T;
