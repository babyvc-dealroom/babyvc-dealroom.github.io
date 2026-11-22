import { useEffect, useRef } from 'react';
import { useCountdown } from '../lib/useGame.js';
import { sfx } from '../lib/fx.js';

// Ring countdown synced on the game's phase_ends_at.
export default function Timer({ endsAt, total, big }) {
  const left = useCountdown(endsAt);
  const last = useRef(null);
  useEffect(() => { if (left != null && left <= 10 && left > 0 && left !== last.current) sfx.tick(); last.current = left; }, [left]);
  if (left == null) return <div className={'timer idle' + (big ? ' big' : '')}><span>--:--</span></div>;
  const frac = total ? Math.max(0, Math.min(1, left / total)) : 0;
  const R = 44, C = 2 * Math.PI * R;
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
  const state = left === 0 ? 'done' : left <= 60 ? 'urgent' : '';
  return (
    <div className={`timer ${state}${big ? ' big' : ''}`} role="timer" aria-label={`${mm}:${ss}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={R} className="tr-bg" />
        <circle cx="50" cy="50" r={R} className="tr-fg" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
      </svg>
      <span>{mm}:{ss}</span>
    </div>
  );
}
