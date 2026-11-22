export const ROUND_PHASES = ['brief', 'negotiate', 'sign', 'debrief'];
export const DEFAULT_MINUTES = { brief: 7, negotiate: 15, sign: 3, debrief: 5, exit: 20 };

export const PHASE_LABEL = {
  lobby: ['Sala d\'attesa', 'Lobby'], brief: ['Lettura', 'Read and plan'], negotiate: ['Trattativa', 'Negotiate'],
  sign: ['Firma e voto', 'Sign and vote'], debrief: ['Debrief', 'Debrief'], exit: ['L\'exit', 'The exit'], ended: ['Partita finita', 'Game over'],
};

// The exit is the end of the three-round story: shorter games end at their last debrief.
export const hasExit = nRounds => nRounds >= 3;

// The step after the current one, for the game master's "next" button.
export function nextStep(g) {
  if (g.phase === 'lobby') return { round: 1, phase: 'brief' };
  const i = ROUND_PHASES.indexOf(g.phase);
  if (i >= 0 && i < ROUND_PHASES.length - 1) return { round: g.round, phase: ROUND_PHASES[i + 1] };
  if (g.phase === 'debrief') return g.round < g.n_rounds ? { round: g.round + 1, phase: 'brief' } : { round: g.round, phase: hasExit(g.n_rounds) ? 'exit' : 'ended' };
  if (g.phase === 'exit') return { round: g.round, phase: 'ended' };
  return null;
}

// Every step of a game, for the stepper.
export function allSteps(nRounds) {
  const s = [{ round: 0, phase: 'lobby' }];
  for (let r = 1; r <= nRounds; r++) for (const p of ROUND_PHASES) s.push({ round: r, phase: p });
  if (hasExit(nRounds)) s.push({ round: nRounds, phase: 'exit' });
  s.push({ round: nRounds, phase: 'ended' });
  return s;
}
export const stepIndex = (g, steps) => steps.findIndex(s => s.phase === g.phase && (g.phase === 'lobby' || s.round === g.round || ['exit', 'ended'].includes(g.phase)));

// ---------- session time ----------
const mins = (m, p) => +(m?.[p] ?? DEFAULT_MINUTES[p]);

// Planned length of the whole session, in minutes: every round's phases, plus the exit in a 3-round game.
export function sessionMinutes(nRounds, m) {
  return nRounds * ROUND_PHASES.reduce((s, p) => s + mins(m, p), 0) + (hasExit(nRounds) ? mins(m, 'exit') : 0);
}

// Minutes still to play from now: what is left of the running phase, plus every phase after it.
export function remainingMinutes(g, now) {
  const steps = allSteps(g.n_rounds).filter(s => !['lobby', 'ended'].includes(s.phase));
  const m = g.settings?.minutes;
  if (g.phase === 'ended') return 0;
  if (g.phase === 'lobby') return sessionMinutes(g.n_rounds, m);
  const i = steps.findIndex(s => s.phase === g.phase && (s.phase === 'exit' || s.round === g.round));
  const current = g.phase_ends_at ? Math.max(0, (new Date(g.phase_ends_at).getTime() - now) / 60000) : mins(m, g.phase);
  return current + steps.slice(i + 1).reduce((s, x) => s + mins(m, x.phase), 0);
}

// «1 h 52 min», «45 min»
export const fmtMinutes = (t, L) => { const n = Math.round(t), h = Math.floor(n / 60), r = n % 60; return h ? `${h} h${r ? ' ' + r + ' min' : ''}` : `${r} min`; };

// Scales every phase so the whole session fits a target length (rounded to whole minutes, at least 1).
export function fitMinutes(nRounds, m, target) {
  const k = target / sessionMinutes(nRounds, m);
  const out = Object.fromEntries(Object.entries(m).map(([p, v]) => [p, Math.max(1, Math.round(v * k))]));
  // Rounding drifts by a few minutes: give the difference back, to the negotiation first, then to the exit.
  for (let i = 0; i < 40; i++) {
    const diff = target - sessionMinutes(nRounds, out);
    if (!diff) break;
    if (hasExit(nRounds) && Math.abs(diff) < nRounds) { out.exit = Math.max(1, out.exit + diff); break; }
    if (Math.abs(diff) < nRounds) { out.debrief = Math.max(1, out.debrief + Math.sign(diff)); continue; }
    out.negotiate = Math.max(1, out.negotiate + Math.sign(diff));
  }
  return out;
}
