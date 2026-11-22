import { ROUNDS } from '../content/public.js';
import { LEVER_SHAPES } from '../engine/model.js';

export const leverShape = (round, key) => LEVER_SHAPES[round].find(l => l.key === key);
export const leverText = (round, key) => ROUNDS[round].levers[key];

// Human-readable value of one lever.
export function fmtTerm(round, key, value, { lx, num, L }) {
  if (value === undefined || value === null || value === '') return '—';
  const shape = leverShape(round, key), txt = leverText(round, key);
  if (shape.type === 'opt') return lx(txt.options[+value]);
  if (shape.unit === '%') return num(+value, 1) + '%';
  return '€' + num(+value, 1) + 'M' + (key === 'cap' ? ' post' : '');
}
export const sideName = (role, L) => (role === 'startup' ? L('Startup', 'Startup') : L('Investitori', 'Investors'));
