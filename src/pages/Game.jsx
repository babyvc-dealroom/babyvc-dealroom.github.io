import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame, useHeartbeat } from '../lib/useGame.js';
import { useWakeLock } from '../lib/useWakeLock.js';
import { rememberGame, forgetGame } from '../lib/resume.js';
import { useLang } from '../lib/i18n.jsx';
import { useCoach } from '../components/Coach.jsx';
import { ROUNDS } from '../content/public.js';
import { PHASE_LABEL } from '../lib/phases.js';
import Shell, { Loading } from '../components/Shell.jsx';
import Timer from '../components/Timer.jsx';
import Icon from '../components/Icon.jsx';
import Play from './Play.jsx';
import { openHelp, content as helpContent } from '../components/Help.jsx';
import Spotlight from '../components/Spotlight.jsx';
import { sfx } from '../lib/fx.js';

// Full-screen title card when the room moves to a new phase: round colour, phase, what to do, minutes.
function PhaseCard({ snap }) {
  const { L, lx } = useLang();
  const g = snap.game;
  const [show, setShow] = useState(null);
  const last = useRef(g.round + g.phase);
  useEffect(() => {
    const k = g.round + g.phase;
    if (last.current === k) return;
    last.current = k; setShow({ round: g.round, phase: g.phase }); sfx.envelope();
    const t = setTimeout(() => setShow(null), 3200); return () => clearTimeout(t);
  }, [g.round, g.phase]);
  const now = show && helpContent({ snap }, L, lx).now;
  const r = show && ROUNDS[show.round], inRound = show && !['lobby', 'exit', 'ended'].includes(show.phase);
  const mins = show && g.settings?.minutes?.[show.phase];
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="phasecard" style={{ '--rc': inRound ? r.color : '#14201B' }} onClick={() => setShow(null)} initial={{ clipPath: 'circle(0% at 50% 50%)' }} animate={{ clipPath: 'circle(150% at 50% 50%)' }} exit={{ opacity: 0 }} transition={{ duration: 0.55, ease: [0.7, 0, 0.3, 1] }}>
          <motion.div className="pc-in" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            {inRound && <span className="pc-round"><Icon name={r.icon} /> {lx(r.name)}, round {show.round} {L('di', 'of')} {g.n_rounds}</span>}
            <h1>{L(...PHASE_LABEL[show.phase])}</h1>
            {now && <p>{now}</p>}
            {mins && !['lobby', 'ended'].includes(show.phase) && <span className="pc-min"><Icon name="clock" /> {mins} min</span>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Always-visible «right now» line for the person's role and the current phase.
function NowBar({ snap }) {
  const { L, lx } = useLang();
  const c = helpContent({ snap }, L, lx);
  if (!c.now) return null;
  const r = ROUNDS[snap.game.round];
  return (
    <AnimatePresence mode="wait">
      <motion.div key={snap.game.round + snap.game.phase} className="nowbar" style={{ '--rc': r.color }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <span className="nb-k"><Icon name="zap" /> {L('Adesso', 'Right now')}</span>
        <p>{c.now}</p>
        <button type="button" className="linkbtn" onClick={openHelp}>{L('Come si fa?', 'How?')}</button>
      </motion.div>
    </AnimatePresence>
  );
}
import DemoSwitcher from '../components/DemoSwitcher.jsx';

const ControlRoom = lazy(() => import('./ControlRoom.jsx'));
const Facilitate = lazy(() => import('./Facilitate.jsx'));

export function GameBar({ game, extra }) {
  const { L, lx } = useLang();
  const r = ROUNDS[game.round];
  const inRound = !['lobby', 'exit', 'ended'].includes(game.phase);
  const total = (game.settings?.minutes?.[game.phase] || 0) * 60;
  return (
    <div className="gamebar">
      <AnimatePresence mode="wait">
        <motion.div key={game.round + game.phase} className="gb-phase" initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }}>
          {inRound && <span className="round-chip" style={{ '--rc': r.color }}><Icon name={r.icon} />{lx(r.name)} <small>{game.round}/{game.n_rounds}</small></span>}
          <b>{L(...PHASE_LABEL[game.phase])}</b>
        </motion.div>
      </AnimatePresence>
      {extra}
      <Timer endsAt={game.phase_ends_at} total={total} />
    </div>
  );
}

export default function Game() {
  const { id } = useParams();
  const [snap, reload] = useGame(id);
  useHeartbeat(snap?.me ? id : null, { role: snap?.me?.role });
  useWakeLock(!!snap?.me && snap.game.phase !== 'ended');
  // Remember this game for «back to your game»; forget it when it ends or this device is removed.
  useEffect(() => {
    if (snap === undefined) return;
    if (snap?.me && snap.game.phase !== 'ended') rememberGame(snap); else forgetGame(id);
  }, [snap?.me?.user_id, snap?.me?.team_id, snap?.game?.phase === 'ended', snap === null]); // eslint-disable-line react-hooks/exhaustive-deps
  const { L } = useLang();
  const coach = useCoach();
  const last = useRef(null);
  // Phase tips for everyone, by role.
  useEffect(() => {
    if (!snap?.game) return;
    const k = snap.game.round + snap.game.phase;
    if (last.current && last.current !== k) {
      const staff = snap.me?.role !== 'player';
      if (staff && snap.game.phase === 'brief') coach.tip('fac:brief');
      else if (!staff) setTimeout(() => coach.tip(snap.game.phase === 'brief' && Math.random() < 0.5 ? 'round:' + snap.game.round : 'phase:' + snap.game.phase), 900);
    }
    last.current = k;
  }, [snap?.game?.round, snap?.game?.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  if (snap === undefined) return <Shell><Loading /></Shell>;
  if (!snap || !snap.me) return (
    <Shell><div className="joincard narrow"><h2>{L('Non sei in questa partita', 'You are not in this game')}</h2><p>{L('Entra con il codice partita e il PIN della tua squadra.', 'Join with the game code and your squad PIN.')}</p><Link className="btn primary" to="/">{L('Vai all\'ingresso', 'Go to the entrance')}</Link></div></Shell>
  );
  const stripe = ROUNDS[snap.game.round]?.color;
  return (
    <Shell stripe={stripe} right={<GameBar game={snap.game} />} help={{ snap }}>
      <PhaseCard snap={snap} />
      <Spotlight auto tourKey={snap.me.role === 'player' ? (snap.game.phase === 'lobby' ? 'lobby' : 'player') : snap.me.role} />
      <DemoSwitcher snap={snap} />
      <NowBar snap={snap} />
      <Suspense fallback={<Loading />}>
        {snap.me.role === 'admin' ? <ControlRoom snap={snap} reload={reload} /> : snap.me.role === 'facilitator' ? <Facilitate snap={snap} /> : <Play key={snap.me.team_id} snap={snap} />}
      </Suspense>
    </Shell>
  );
}
