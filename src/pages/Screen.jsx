import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame, useNewItems, tableResults } from '../lib/useGame.js';
import { useLang, LangSwitch } from '../lib/i18n.jsx';
import { celebrate, sfx } from '../lib/fx.js';
import { ROUNDS } from '../content/public.js';
import { PHASE_LABEL } from '../lib/phases.js';
import { tablePath, exitProceeds } from '../engine/model.js';
import Timer from '../components/Timer.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
import { Brand, Loading } from '../components/Shell.jsx';
import { tableStatus, STATUS } from './Facilitate.jsx';
import Icon from '../components/Icon.jsx';
import { useScenario } from '../lib/useScenario.js';
import DemoSwitcher from '../components/DemoSwitcher.jsx';
import { useWakeLock } from '../lib/useWakeLock.js';

function ExitRace({ snap, refs }) {
  const { L, eur, pc } = useLang();
  const [E, setE] = useState(150);
  const rows = Array.from({ length: snap.game.n_tables }, (_, k) => {
    const p = tablePath(tableResults(snap, k + 1), refs);
    return { t: k + 1, name: snap.teams.find(x => x.table_no === k + 1 && x.role === 'startup')?.name, f: p.j.r3.founders, eur: exitProceeds(p.j, E).founders };
  }).sort((a, b) => b.eur - a.eur);
  const max = Math.max(...rows.map(r => r.eur), 1);
  return (
    <div className="exitrace">
      <h2>{L('L\'exit: quanto valgono tre round per i founder', 'The exit: what three rounds are worth to the founders')}</h2>
      <label className="field"><span>{L('Valore di vendita', 'Exit value')} <output>{eur(E, 0)}</output></span><input type="range" min="50" max="400" step="10" value={E} onChange={e => setE(+e.target.value)} style={{ '--p': ((E - 50) / 350) * 100 + '%', '--rc': 'var(--lime)' }} /></label>
      <ol>{rows.map((r, i) => (
        <motion.li layout key={r.t}>
          <span className="er-name"><b>{r.name}</b><small>{L('Tavolo', 'Table')} {r.t}, {pc(r.f)}</small></span>
          <div className="er-track"><motion.i initial={{ width: 0 }} animate={{ width: (r.eur / max) * 100 + '%' }} transition={{ delay: i * 0.15, type: 'spring', stiffness: 60 }} /></div>
          <b className="er-eur">{eur(r.eur)}</b>
        </motion.li>
      ))}</ol>
    </div>
  );
}

// Projector: phase and timer, live deal ticker, leagues that cycle on their own, the exit race.
export default function Screen() {
  const { id } = useParams();
  const [snap] = useGame(id);
  useWakeLock(!!snap?.game && snap.game.phase !== 'ended');   // the projector never goes to sleep mid-session
  const { L, lx } = useLang();
  const [flash, setFlash] = useState(null);
  const sc = useScenario(snap);
  const signed = useMemo(() => (snap ? snap.events.filter(e => e.kind === 'signed') : null), [snap]);
  useNewItems(signed, useCallback(e => {
    setFlash(e); sfx.sign(); celebrate();
    setTimeout(() => setFlash(f => (f === e ? null : f)), 5000);
  }, []));
  if (snap === undefined) return <Loading />;
  if (!snap) return <p className="empty">{L('Apri il proiettore dal pannello del game master.', 'Open the projector from the game master\'s panel.')}</p>;
  const g = snap.game, r = ROUNDS[g.round];
  const nameOf = (t, role) => snap.teams.find(x => x.table_no === t && x.role === role)?.name;
  return (
    <div className="screen" style={{ '--rc': r.color }}>
      <header className="sc-head">
        <Brand />
        <div className="sc-phase">
          {!['lobby', 'exit', 'ended'].includes(g.phase) && <span className="round-chip big" style={{ '--rc': r.color }}><Icon name={r.icon} />{lx(r.name)} <small>{g.round}/{g.n_rounds}</small></span>}
          <h1>{L(...PHASE_LABEL[g.phase])}</h1>
        </div>
        <Timer endsAt={g.phase_ends_at} total={(g.settings?.minutes?.[g.phase] || 0) * 60} big />
        <LangSwitch />
      </header>
      <DemoSwitcher snap={snap} screen />
      {g.phase === 'lobby' ? (
        <div className="sc-lobby">
          <p>{L('Entrate su', 'Join at')} <b>{location.host}</b> {L('con il codice', 'with the code')}</p>
          <div className="sc-code">{g.code.split('').map((c, i) => <motion.span key={i} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}>{c}</motion.span>)}</div>
          <p>{L('e il PIN della vostra squadra', 'and your squad PIN')}. {snap.members.filter(m => m.role === 'player').length} {L('giocatori in sala', 'players in the room')}</p>
        </div>
      ) : ['exit', 'ended'].includes(g.phase) && g.n_rounds === 3 ? (
        <div className="sc-grid"><ExitRace snap={snap} refs={sc.refs} /><Leaderboard snap={snap} autoCycle big /></div>
      ) : (
        <div className="sc-grid">
          <div className="sc-tables">
            {Array.from({ length: g.n_tables }, (_, k) => k + 1).map(t => {
              const st = tableStatus(snap, t);
              return <motion.div layout key={t} className={'sc-t ' + st}><b>{t}</b><span>{nameOf(t, 'startup')}<i>vs</i>{nameOf(t, 'investor')}</span><em>{L(...STATUS[st])}</em></motion.div>;
            })}
          </div>
          <Leaderboard snap={snap} autoCycle big />
        </div>
      )}
      <AnimatePresence>
        {flash && (
          <motion.div className="sc-flash" initial={{ scale: 0.4, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 1.2, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
            <Icon name="pen" size={48} />
            <b>{L('Tavolo', 'Table')} {flash.payload.table_no} {L('ha firmato', 'signed')}!</b>
            <span>{nameOf(flash.payload.table_no, 'startup')} × {nameOf(flash.payload.table_no, 'investor')}, {lx(ROUNDS[flash.round].name)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
