import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { journey, exitProceeds, CASE } from '../engine/model.js';
import { celebrate, sfx } from '../lib/fx.js';
import { CapBar } from './Journey.jsx';
import { Term } from './Coach.jsx';
import Icon from './Icon.jsx';

// Landing mini-game: one pre-seed term sheet, three choices, and what they are worth three rounds later.
// The seed and Series A are an illustrative fixed path (not the game's solutions).
const LATER = [{ pre: 10, pool: 12, board: 1 }, { pre: 47, mna: 3, partner: 3 }];
const EXIT = 150;

function Money({ value }) {
  const { num } = useLang();
  const [v, setV] = useState(value);
  const prev = useRef(value);
  useEffect(() => { const c = animate(prev.current, value, { duration: 0.6, ease: 'easeOut', onUpdate: setV }); prev.current = value; return () => c.stop(); }, [value]);
  return <>€{num(v, 1)}M</>;
}

export default function Playground({ onPlay }) {
  const { L, pc, eur, num } = useLang();
  const [cap, setCap] = useState(4.0);
  const [luca, setLuca] = useState(4);
  const [rights, setRights] = useState(0);
  const [signed, setSigned] = useState(false);
  const calc = (o1) => { const j = journey(o1, LATER[0], LATER[1]); return { j, eur: exitProceeds(j, EXIT).founders }; };
  const now = useMemo(() => calc({ cap, deadEquity: luca, rights }), [cap, luca, rights]);
  const best = useMemo(() => calc({ cap: 6, deadEquity: luca, rights }), [luca, rights]);
  const gap = best.eur - now.eur;
  const touch = f => v => { f(v); setSigned(false); };
  const sign = () => { setSigned(true); sfx.sign(); setTimeout(celebrate, 350); };
  const lucaOpts = [[0, L('Luca a zero, ESOP dai founder', 'Luca to zero, ESOP from founders')], [2, L('Buyback: Luca tiene il 3%', 'Buyback: Luca keeps 3%')], [4, L('Luca tiene il suo 10%', 'Luca keeps his 10%')]];
  const rightOpts = [[0, L('Board seat e super pro-rata', 'Board seat and super pro-rata')], [2, L('Observer e pro-rata standard', 'Observer and standard pro-rata')], [4, L('Solo informazioni', 'Information only')]];
  const insight = gap > 0.05
    ? L(`Con un cap di €6M i founder avrebbero ${eur(gap)} in più all'exit. Un dettaglio di oggi vale milioni domani.`, `With a €6M cap the founders would have ${eur(gap)} more at the exit. Today's detail is worth millions tomorrow.`)
    : L('Cap al massimo: gli investitori ora chiederanno qualcosa in cambio. Nel gioco vero, dall\'altra parte c\'è una squadra.', 'Cap at the top: the investors will now ask for something in return. In the real game, a squad sits across the table.');
  return (
    <div className="pg">
      <div className="pg-controls">
        <div className="pg-sticky" aria-hidden="true"><span>{L('Ai founder all\'exit', 'Founders at the exit')}</span><b><Money value={now.eur} /></b><small>{pc(now.j.r3.founders)}</small></div>
        <p className="pg-brief"><Icon name="bulb" /> {L('Sei la founder di Flussi Energy. Gli investitori offrono €600k con un SAFE. Scegli tu le condizioni.', 'You are Flussi Energy\'s founder. The investors offer €600k on a SAFE. You pick the terms.')}</p>
        <label className="pg-lever">
          <span className="pg-lh"><span>1. <Term k="Valuation cap">Valuation cap</Term></span><b>€{num(cap, 1)}M</b></span>
          <input type="range" min="3" max="7" step="0.1" value={cap} onChange={e => touch(setCap)(+e.target.value)} style={{ '--p': ((cap - 3) / 4) * 100 + '%', '--rc': 'var(--r1)' }} aria-label="Valuation cap" />
          <span className="pg-scale"><span>{L('Meglio per gli investitori', 'Better for investors')}</span><span>{L('Meglio per i founder', 'Better for founders')}</span></span>
        </label>
        <div className="pg-lever">
          <span className="pg-lh"><span>2. <Term k="Dead equity">Dead equity</Term> {L('ed', 'and')} <Term k="ESOP">ESOP</Term></span></span>
          <div className="pg-chips">{lucaOpts.map(([v, t]) => <button key={v} type="button" aria-pressed={luca === v} onClick={() => touch(setLuca)(v)}>{t}</button>)}</div>
        </div>
        <div className="pg-lever">
          <span className="pg-lh"><span>3. {L('Diritti dell\'investitore', 'Investor rights')} (<Term k="Pro-rata">pro-rata</Term>)</span></span>
          <div className="pg-chips">{rightOpts.map(([v, t]) => <button key={v} type="button" aria-pressed={rights === v} onClick={() => touch(setRights)(v)}>{t}</button>)}</div>
        </div>
      </div>

      <div className="pg-result">
        <div className="pg-money">
          <span>{L(`Ai founder, con un'exit da €${EXIT}M dopo tre round`, `To the founders, at a €${EXIT}M exit three rounds later`)}</span>
          <b><Money value={now.eur} /></b>
          <div className="pg-steps">
            {[[L('Pre-seed', 'Pre-seed'), now.j.r1.founders, 'var(--r1)'], ['Seed', now.j.r2.founders, 'var(--r2)'], ['Series A', now.j.r3.founders, 'var(--r3)']].map(([t, v, c]) => (
              <span key={t} style={{ '--rc': c }}><small>{t}</small><motion.b key={v.toFixed(4)} initial={{ y: -6, opacity: 0.3 }} animate={{ y: 0, opacity: 1 }}>{pc(v)}</motion.b></span>
            ))}
          </div>
        </div>
        <div className="evo pg-evo">
          <CapBar t={CASE.start} label={L('Oggi', 'Today')} />
          <CapBar t={now.j.r1.conv} label="Pre-seed" color="var(--r1)" />
          <CapBar t={now.j.r2.table} label="Seed" color="var(--r2)" />
          <CapBar t={now.j.r3.table} label="Series A" color="var(--r3)" />
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={gap > 0.05 ? 'gap' : 'top'} className="pg-insight" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Icon name="zap" /> {insight}</motion.p>
        </AnimatePresence>
        <div className="pg-sign">
          <AnimatePresence mode="wait">
            {!signed ? (
              <motion.button key="b" type="button" className="btn sign big" onClick={sign} exit={{ scale: 0.9, opacity: 0 }} whileTap={{ scale: 0.95 }}><Icon name="pen" /> {L('Firma questo term sheet', 'Sign this term sheet')}</motion.button>
            ) : (
              <motion.div key="s" className="pg-signed" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <motion.span className="stamp accepted pg-stamp" initial={{ scale: 3, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: -12, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 16 }}>{L('FIRMATO', 'SIGNED')}</motion.span>
                <p>{L('Firmato. Nel gioco vero quello che firmi resta firmato, e dall\'altra parte del tavolo c\'è una squadra che vuole l\'opposto.', 'Signed. In the real game what you sign stays signed, and across the table a squad wants the opposite.')}</p>
                <button type="button" className="btn primary" onClick={onPlay}>{L('Come si gioca davvero', 'How the real game works')} <Icon name="next" /></button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
