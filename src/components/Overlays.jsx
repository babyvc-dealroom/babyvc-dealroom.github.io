import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { celebrate, sfx } from '../lib/fx.js';
import { ROUNDS } from '../content/public.js';
import TermSheet from './TermSheet.jsx';
import Icon from './Icon.jsx';
import { AutoTerms } from './Coach.jsx';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Modal dialog: Escape closes, Tab stays inside, focus goes back where it was on close.
export function Overlay({ open, onClose, children, label, wide }) {
  const box = useRef(null), close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement;
    const t = setTimeout(() => { const f = box.current?.querySelector(FOCUSABLE); (f || box.current)?.focus({ preventScroll: true }); }, 60);
    const k = e => {
      if (e.key === 'Escape') close.current?.();
      if (e.key !== 'Tab' || !box.current) return;
      const els = [...box.current.querySelectorAll(FOCUSABLE)]; if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    addEventListener('keydown', k);
    return () => { clearTimeout(t); removeEventListener('keydown', k); back?.focus?.({ preventScroll: true }); };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" role="dialog" aria-modal="true" aria-label={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onClose?.()}>
          <motion.div ref={box} tabIndex={-1} className={'overlay-box' + (wide ? ' wide' : '')} initial={{ y: 40, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// The envelope arrives sealed, the flap opens and the card slides out.
export function EnvelopeOverlay({ env, onClose }) {
  const { L, lx } = useLang();
  const [opened, setOpened] = useState(false);
  useEffect(() => { if (env) { setOpened(false); sfx.envelope(); const t = setTimeout(() => setOpened(true), 700); return () => clearTimeout(t); } }, [env]);
  const body = env && lx(env.payload.body);
  const keyName = env && (env.payload.key === 'spare' ? L('Busta di riserva', 'Spare envelope') : L('Busta ', 'Envelope ') + env.payload.key);
  return (
    <Overlay open={!!env} onClose={onClose} label={keyName}>
      {env && (
        <div className="env-scene">
          <div className={'envelope' + (opened ? ' open' : '')}>
            <div className="env-back" />
            <motion.div className="env-letter" initial={{ y: 40 }} animate={opened ? { y: -150 } : { y: 40 }} transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.25 }}>
              <span className="env-key">{keyName}</span>
              <h3>{body.title}</h3>
              <p><AutoTerms text={body.text} /></p>
            </motion.div>
            <div className="env-front" />
            <div className="env-flap" />
          </div>
          <button type="button" className="btn primary" onClick={onClose}>{L('Letta, torniamo al tavolo', 'Read it, back to the table')}</button>
        </div>
      )}
    </Overlay>
  );
}

// Signing ceremony: the accepted term sheet gets two signatures and a stamp, then confetti.
export function SignedOverlay({ deal, names, onClose, children }) {
  const { L } = useLang();
  useEffect(() => { if (!deal) return; const t1 = setTimeout(sfx.sign, 2300), t2 = setTimeout(celebrate, 2450); return () => { clearTimeout(t1); clearTimeout(t2); }; }, [deal]);
  return (
    <Overlay open={!!deal} onClose={onClose} label={L('Deal firmato', 'Deal signed')} wide>
      {deal && (
        <div className="signed">
          <motion.div initial={{ rotate: -3, y: 60, opacity: 0 }} animate={{ rotate: 0, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
            <TermSheet round={deal.round} terms={deal.terms} from="startup" fromName={names[0]} toName={names[1]} status="accepted" signing />
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.6 }}>{L('Deal firmato. Quello che avete firmato resta firmato.', 'Deal signed. What you signed stays signed.')}</motion.h2>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.9 }}>{children}</motion.div>
        </div>
      )}
    </Overlay>
  );
}

function CountUp({ to, delay = 0 }) {
  const { num } = useLang();
  const [v, setV] = useState(0);
  useEffect(() => { const c = animate(0, to, { duration: 1.4, delay, ease: 'easeOut', onUpdate: setV }); return () => c.stop(); }, [to, delay]);
  return <>{num(v, 1)}</>;
}

// Score reveal for one squad: the total counts up, then each component fills in turn.
export function ScoreOverlay({ data, onClose }) {
  const { L, lx, num } = useLang();
  useEffect(() => { if (data) { const t = setTimeout(sfx.score, 1500); const t2 = setTimeout(() => data.s.total >= 60 && celebrate(), 1600); return () => { clearTimeout(t); clearTimeout(t2); }; } }, [data]);
  if (!data) return <Overlay open={false} />;
  const s = data.s;
  const parts = [['close', L('Chiusura', 'Close the deal'), 20, 'var(--ink)'], ['claim', L('Valore conquistato', 'Claim value'), 45, data.role === 'startup' ? 'var(--startup)' : 'var(--investor)'], ['create', L('Valore creato', 'Create value'), 15, 'var(--r1)'], ['trades', L('Scambi', 'Trades'), 10, 'var(--r2)'], ['rel', L('Relazione', 'Relationship'), 10, 'var(--r3)']];
  return (
    <Overlay open onClose={onClose} label={L('Punteggio', 'Score')}>
      <div className="score-reveal" style={{ '--rc': ROUNDS[data.round].color }}>
        <div className="sr-round"><Icon name={ROUNDS[data.round].icon} /> {lx(ROUNDS[data.round].name)}: {L('il vostro punteggio', 'your score')}</div>
        <div className="sr-total"><CountUp to={s.total} /><small>/ 100</small></div>
        <div className="sr-parts">
          {parts.map(([k, t, max, c], i) => (
            <div key={k} className="sr-part">
              <span>{t}</span>
              <div className="sr-track"><motion.i style={{ background: c }} initial={{ width: 0 }} animate={{ width: (Math.max(0, s[k]) / max) * 100 + '%' }} transition={{ delay: 0.4 + i * 0.25, duration: 0.6 }} /></div>
              <b>{num(s[k] || 0, 1)}<small>/{max}</small></b>
            </div>
          ))}
          {s.pen < 0 && <div className="sr-part pen"><span>{L('Penalità', 'Penalties')}</span><div /><b>{num(s.pen, 0)}</b></div>}
        </div>
        {s.breach && <p className="hint warn"><Icon name="alert" /> {L('Walk-away superato: valore conquistato azzerato.', 'Walk-away breached: claim value set to zero.')}</p>}
        <button type="button" className="btn primary" onClick={onClose}>{L('Vai alla classifica', 'See the leaderboard')}</button>
      </div>
    </Overlay>
  );
}
