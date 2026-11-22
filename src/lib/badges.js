// Learning badges: kept in this browser, per game and squad. They never change the score,
// so there is nothing to gain by gaming them.
import { useCallback, useEffect, useState } from 'react';

const key = (g, t) => `bvc-badges-${g}-${t}`;
const read = (g, t) => { try { return JSON.parse(localStorage.getItem(key(g, t))) || []; } catch { return []; } };

export function useBadges(gameId, teamId) {
  const [got, setGot] = useState(() => read(gameId, teamId));
  useEffect(() => { setGot(read(gameId, teamId)); }, [gameId, teamId]);
  const award = useCallback(id => {
    setGot(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try { localStorage.setItem(key(gameId, teamId), JSON.stringify(next)); } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent('bvc-badge', { detail: id }));
      return next;
    });
  }, [gameId, teamId]);
  return { got, award };
}
