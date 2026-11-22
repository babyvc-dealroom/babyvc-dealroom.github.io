import { useEffect, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { leaderboard } from '../engine/leaderboard.js';
import { ROUNDS } from '../content/public.js';
import Icon from './Icon.jsx';

// Animated leagues. Rows slide to their new place when a score lands.
export default function Leaderboard({ snap, highlight, autoCycle, big }) {
  const { L, lx, num } = useLang();
  const [view, setView] = useState('startup');
  useEffect(() => {
    if (!autoCycle) return;
    const order = ['startup', 'investor', 'overall'];
    const t = setInterval(() => setView(v => order[(order.indexOf(v) + 1) % 3]), 12000);
    return () => clearInterval(t);
  }, [autoCycle]);
  const n = snap.game.n_rounds;
  const lb = leaderboard(snap.teams, snap.results, n);
  const rows = lb[view], key = view === 'overall' ? 'adj' : 'raw';
  const any = rows.some(r => Object.keys(r.rounds).length);
  return (
    <div className={'lb' + (big ? ' big' : '')}>
      <div className="seg" role="tablist">
        {[['startup', 'bulb', L('Lega startup', 'Startup league')], ['investor', 'briefcase', L('Lega investitori', 'Investor league')], ['overall', 'trophy', L('Generale', 'Overall')]].map(([v, ic, t]) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}><Icon name={ic} /> {t}</button>
        ))}
      </div>
      {snap.me?.role === 'player' && ['brief', 'negotiate', 'sign'].includes(snap.game.phase) && <p className="lb-partial"><Icon name="clock" /> {L(`Round ${snap.game.round} in corso: i punti degli altri tavoli arrivano al debrief, così nessuno sbircia i deal mentre si tratta.`, `Round ${snap.game.round} in progress: the other tables' points arrive at the debrief, so nobody peeks at deals while they negotiate.`)}</p>}
      {!any && <p className="empty">{L('La classifica si riempie appena il primo round viene valutato.', 'The leaderboard fills up as soon as the first round is scored.')}</p>}
      <LayoutGroup>
        <ol className="lb-rows">
          {rows.map((r, k) => (
            <motion.li layout key={r.team.id} className={`lb-row ${r.role} ${highlight === r.team.id ? 'me' : ''} ${k === 0 && any ? 'first' : ''}`} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <span className="lb-rank">{k + 1}</span>
              <span className="lb-name"><Icon name={r.role === 'startup' ? 'bulb' : 'briefcase'} /><b>{r.team.name}</b><small>{L('Tavolo', 'Table')} {r.team.table_no}</small></span>
              <span className="lb-rounds">{Array.from({ length: n }, (_, i) => i + 1).map(rd => (
                <span key={rd} className="lb-pill" style={{ '--rc': ROUNDS[rd].color }} title={lx(ROUNDS[rd].name)}>{r.rounds[rd] ? num(view === 'overall' ? r.rounds[rd].adj : r.rounds[rd].raw, 0) : '·'}</span>
              ))}</span>
              <motion.span className="lb-total" key={r[key].toFixed(1)} initial={{ scale: 1.4, color: 'var(--ok)' }} animate={{ scale: 1, color: 'var(--ink)' }}>{num(r[key], 1)}</motion.span>
            </motion.li>
          ))}
        </ol>
      </LayoutGroup>
      <p className="hint">{view === 'overall'
        ? L('Generale: ogni round vale 50 più lo scarto dalla media della propria lega, così startup e investitori si confrontano.', 'Overall: each round scores 50 plus the gap from the league average, so startups and investors can be compared.')
        : L(`Punti grezzi su ${n} round, massimo ${n * 100}. A pari punti vince la relazione.`, `Raw points over ${n} rounds, maximum ${n * 100}. Ties go to the relationship total.`)}</p>
    </div>
  );
}
