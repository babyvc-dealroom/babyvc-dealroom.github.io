import { motion } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { ROUNDS } from '../content/public.js';
import { LEVER_SHAPES } from '../engine/model.js';
import { fmtTerm } from '../lib/format.js';

const STAMP = { accepted: ['FIRMATO', 'SIGNED'], rejected: ['RIFIUTATO', 'REJECTED'], countered: ['CONTROPROPOSTA', 'COUNTERED'], withdrawn: ['RITIRATO', 'WITHDRAWN'] };

// A term sheet drawn as a paper document. Used for offers in the timeline and in the signing ceremony.
export default function TermSheet({ round, terms, from, fromName, toName, note, status, mine, time, children, signing }) {
  const T = useLang(); const { L, lx } = T;
  const shapes = LEVER_SHAPES[round];
  return (
    <div className={`sheet ${from} ${status || ''} ${mine ? 'mine' : ''}`} style={{ '--rc': ROUNDS[round].color }}>
      <div className="sheet-head">
        <div>
          <div className="sheet-kicker">Flussi Energy S.r.l.</div>
          <div className="sheet-title">Term sheet {lx(ROUNDS[round].name)} <span>{ROUNDS[round].ticket}</span></div>
        </div>
        <div className="sheet-from">
          <span>{L('Da', 'From')}</span><b>{fromName}</b>
          {time && <time>{new Date(time).toLocaleTimeString(T.lang, { hour: '2-digit', minute: '2-digit' })}</time>}
        </div>
      </div>
      <ol className="sheet-terms">
        {shapes.map((s, i) => (
          <li key={s.key}>
            <span className="st-k">{i + 1}. {lx(ROUNDS[round].levers[s.key].label)}</span>
            <span className="st-v">{fmtTerm(round, s.key, terms?.[s.key], T)}{s.check && terms?.[s.key + 'Check'] ? <em> · {L('2% promesso incluso', 'promised 2% included')}</em> : null}</span>
          </li>
        ))}
      </ol>
      {note && <p className="sheet-note">«{note}»</p>}
      {signing && (
        <div className="sheet-sign">
          {[fromName, toName].map((n, i) => (
            <div key={i} className="sig">
              <svg viewBox="0 0 200 50" aria-hidden="true"><motion.path d={i ? 'M8 34c18-22 26-24 30-10s8 14 18-6 12-8 16 4 10 10 22-12c8-14 14-6 16 6s14 6 26-8 20 4 34-2' : 'M10 30c10-18 22-26 28-14s-4 22 8 14 16-20 24-10-2 18 10 10 18-16 26-8 8 8 20 0 22-12 40-4'}
                fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.5 + i * 0.9, ease: 'easeInOut' }} /></svg>
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}
      {status && STAMP[status] && (
        <motion.div className={'stamp ' + status} initial={signing ? { scale: 3, opacity: 0, rotate: -30 } : false} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ delay: signing ? 2.4 : 0, type: 'spring', stiffness: 500, damping: 18 }}>
          {L(...STAMP[status])}
        </motion.div>
      )}
      {children}
    </div>
  );
}
