import { useEffect, useMemo, useState } from 'react';
import { api } from './api/index.js';
import { OPENING } from '../engine/model.js';
import { packCards } from '../engine/scoring.js';

// What this person may know of the scenario's confidential pack, refreshed at every phase change.
// Players: their own card up to the current round, and each round's sweet spot once that round is over.
// Facilitators and game master: everything, scoring cards included.
export function useScenario(snap) {
  const g = snap?.game;
  const [rows, setRows] = useState([]);
  useEffect(() => { if (g) api.myCards(g.id).then(setRows).catch(() => setRows([])); }, [g?.id, g?.round, g?.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const refs = {}, revealed = {};
    for (const r of [1, 2, 3]) {
      const sw = rows.find(x => x.round === r && x.kind === 'sweet');
      refs[r] = sw ? { ...sw.body.terms } : { ...OPENING[r] };
      revealed[r] = !!sw;
    }
    return { rows, refs, revealed, card: (r, k) => rows.find(x => x.round === r && x.kind === k), scoring: r => packCards(rows, r) };
  }, [rows]);
}
