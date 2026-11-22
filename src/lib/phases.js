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
