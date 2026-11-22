import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { ROUNDS } from '../content/public.js';
import { CONCEPTS, STRATEGIES, GLOSSARY, GLOSSARY_CATS, SOURCES, QUIZ, BADGES } from '../content/learn.js';
import { sfx, burst } from '../lib/fx.js';
import { Overlay } from './Overlays.jsx';
import { AutoTerms } from './Coach.jsx';
import Icon from './Icon.jsx';

function Source({ id }) {
  const { L, lx } = useLang();
  const s = SOURCES[id]; if (!s) return null;
  return <p className="src">{L('Per approfondire', 'Read more')}: {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.org}, {lx(s.title)}</a> : <span>{s.org}, {lx(s.title)}</span>}</p>;
}

export function ConceptCard({ c, open, onToggle }) {
  const T = useLang(); const { L, lx } = T;
  return (
    <article className={'concept' + (open ? ' open' : '')}>
      <button type="button" className="concept-h" aria-expanded={open} onClick={onToggle}><Icon name="bulb" /><b>{lx(c.title)}</b><Icon name="plus" /></button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="concept-b">
            <p><AutoTerms text={lx(c.body)} /></p>
            <div className="example"><b>{L('Con i numeri del gioco', 'With the game\'s numbers')}</b><p>{c.example(T)}</p></div>
            <Source id={c.source} />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

// The «Learn» tab: concepts of the rounds played so far, negotiation strategies, the glossary, badges and sources.
export default function LearnHub({ round = 1, nRounds = 3, badges, onRead }) {
  const { L, lx } = useLang();
  const [sec, setSec] = useState('concepts');
  const [open, setOpen] = useState(`${round}-0`);
  const [q, setQ] = useState(''); const [cat, setCat] = useState('all');
  useEffect(() => { if (sec === 'concepts') onRead?.(); }, [sec]); // eslint-disable-line react-hooks/exhaustive-deps
  const terms = useMemo(() => Object.entries(GLOSSARY).filter(([k, v]) => (cat === 'all' || v.cat === cat) && (!q || (k + ' ' + lx(v) + ' ' + (v.alias || []).join(' ')).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a[0].localeCompare(b[0])), [q, cat, lx]);
  const secs = [['concepts', 'bulb', L('Concetti', 'Concepts')], ['strategy', 'sliders', L('Strategie', 'Strategies')], ['glossary', 'book', L('Glossario', 'Glossary')], ...(badges ? [['badges', 'trophy', 'Badge']] : []), ['sources', 'doc', L('Fonti', 'Sources')]];
  return (
    <div className="learn">
      <div className="seg small" role="tablist">{secs.map(([id, ic, t]) => <button key={id} type="button" role="tab" aria-selected={sec === id} onClick={() => setSec(id)}><Icon name={ic} /> {t}</button>)}</div>
      {sec === 'concepts' && Array.from({ length: Math.min(round, nRounds) }, (_, i) => i + 1).reverse().map(r => (
        <section key={r} className="learn-round" style={{ '--rc': ROUNDS[r].color }}>
          <h3><span className="round-chip" style={{ '--rc': ROUNDS[r].color }}><Icon name={ROUNDS[r].icon} />{lx(ROUNDS[r].name)}</span> {r === round ? L('il round di adesso', 'the current round') : ''}</h3>
          {CONCEPTS[r].map((c, i) => <ConceptCard key={c.id} c={c} open={open === `${r}-${i}`} onToggle={() => setOpen(open === `${r}-${i}` ? null : `${r}-${i}`)} />)}
        </section>
      ))}
      {sec === 'strategy' && (
        <div className="strategies">
          {STRATEGIES.map((s, i) => (
            <motion.article key={s.id} className="strategy" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <span className="st-n">{i + 1}</span>
              <div><b>{lx(s.title)}</b><p><AutoTerms text={lx(s.body)} /></p>{s.source && <Source id={s.source} />}</div>
            </motion.article>
          ))}
        </div>
      )}
      {sec === 'glossary' && (
        <div className="glossary">
          <input className="gl-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={L('Cerca una sigla o un concetto: ROFR, pool, BATNA…', 'Search an acronym or concept: ROFR, pool, BATNA…')} aria-label={L('Cerca nel glossario', 'Search the glossary')} />
          <div className="gl-cats">{[['all', L('Tutto', 'All')], ...Object.entries(GLOSSARY_CATS).map(([k, v]) => [k, lx(v)])].map(([k, t]) => <button key={k} type="button" aria-pressed={cat === k} onClick={() => setCat(k)}>{t}</button>)}</div>
          <dl>{terms.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{lx(v)}</dd></div>)}</dl>
          {!terms.length && <p className="empty">{L('Nessuna voce: prova un\'altra parola.', 'No entry: try another word.')}</p>}
        </div>
      )}
      {sec === 'badges' && badges && (
        <div className="badges">
          <p className="hint">{L('I badge non danno punti: servono a capire cosa fa un buon negoziatore.', 'Badges give no points: they show what a good negotiator does.')}</p>
          <div className="badge-grid">{Object.entries(BADGES).map(([id, b]) => (
            <div key={id} className={'badge' + (badges.includes(id) ? ' got' : '')}><span className="b-ico"><Icon name={b.icon} /></span><b>{lx(b.title)}</b><small>{lx(b.text)}</small></div>
          ))}</div>
        </div>
      )}
      {sec === 'sources' && (
        <div className="sources">
          <p className="hint">{L('Il gioco si ispira a queste risorse aperte. Le spiegazioni nell\'app sono semplificate a scopo didattico: non sono consulenza legale o finanziaria.', 'The game draws on these open resources. The app\'s explanations are simplified for teaching: they are not legal or financial advice.')}</p>
          <ul>{Object.values(SOURCES).map(s => <li key={s.org + lx(s.title)}><b>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{lx(s.title)}</a> : lx(s.title)}</b> <span>{s.org}</span><p>{lx(s.what)}</p></li>)}</ul>
        </div>
      )}
    </div>
  );
}

// At the start of each round: the first concept of the round, with its live example.
export function ConceptOverlay({ round, onClose, onMore }) {
  const T = useLang(); const { L, lx } = T;
  const c = round && CONCEPTS[round]?.[0];
  return (
    <Overlay open={!!c} onClose={onClose} label={L('Concetto del round', 'Concept of the round')}>
      {c && (
        <div className="concept-pop" style={{ '--rc': ROUNDS[round].color }}>
          <span className="round-chip" style={{ '--rc': ROUNDS[round].color }}><Icon name={ROUNDS[round].icon} />{lx(ROUNDS[round].name)}</span>
          <h2>{lx(c.title)}</h2>
          <p><AutoTerms text={lx(c.body)} /></p>
          <div className="example"><b>{L('Con i numeri del gioco', 'With the game\'s numbers')}</b><p>{c.example(T)}</p></div>
          <div className="row"><button type="button" className="btn ghost" onClick={onMore}><Icon name="book" /> {L('Altri concetti del round', 'More concepts of the round')}</button><button type="button" className="btn primary" onClick={onClose}>{L('Chiaro', 'Got it')}</button></div>
        </div>
      )}
    </Overlay>
  );
}

// At the debrief: two questions, an explanation after each answer. No points at stake.
export function QuizOverlay({ round, onClose, onPerfect }) {
  const { L, lx } = useLang();
  const qs = round ? QUIZ[round] || [] : [];
  const [i, setI] = useState(0); const [picked, setPicked] = useState(null); const [right, setRight] = useState(0);
  useEffect(() => { setI(0); setPicked(null); setRight(0); }, [round]);
  const q = qs[i];
  const pick = k => { if (picked != null) return; setPicked(k); if (k === q.ok) { setRight(r => r + 1); sfx.score(); burst(0.5, 0.6); } else sfx.reject(); };
  const next = () => { if (i + 1 < qs.length) { setI(i + 1); setPicked(null); } else { if (right === qs.length) onPerfect?.(); onClose(); } };
  return (
    <Overlay open={!!q} onClose={onClose} label="Quiz">
      {q && (
        <div className="quiz">
          <span className="quiz-k">{L('Domanda', 'Question')} {i + 1}/{qs.length}, {L('nessun punto in gioco', 'no points at stake')}</span>
          <h2>{lx(q.q)}</h2>
          <div className="quiz-a">{q.a.map((a, k) => (
            <motion.button key={k} type="button" className={'qa' + (picked != null && k === q.ok ? ' ok' : '') + (picked === k && k !== q.ok ? ' ko' : '')} onClick={() => pick(k)} disabled={picked != null}
              animate={picked === k && k !== q.ok ? { x: [0, -6, 6, -3, 0] } : {}}>{lx(a)}</motion.button>
          ))}</div>
          <AnimatePresence>{picked != null && <motion.p className="quiz-why" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}><b>{picked === q.ok ? L('Giusto. ', 'Right. ') : L('Non proprio. ', 'Not quite. ')}</b><AutoTerms text={lx(q.why)} /></motion.p>}</AnimatePresence>
          <div className="row"><button type="button" className="btn ghost" onClick={onClose}>{L('Salta', 'Skip')}</button>{picked != null && <button type="button" className="btn primary" onClick={next}>{i + 1 < qs.length ? L('Avanti', 'Next') : L('Fine', 'Done')}</button>}</div>
        </div>
      )}
    </Overlay>
  );
}

// Toast when a badge unlocks.
export function BadgeToast() {
  const { L, lx } = useLang();
  const [b, setB] = useState(null);
  useEffect(() => {
    let t;
    const on = e => { setB(e.detail); sfx.score(); clearTimeout(t); t = setTimeout(() => setB(null), 4200); };
    addEventListener('bvc-badge', on); return () => { removeEventListener('bvc-badge', on); clearTimeout(t); };
  }, []);
  const d = b && BADGES[b];
  return (
    <div className="badge-dock" aria-live="polite">
      <AnimatePresence>{d && (
        <motion.div key={b} className="badge-toast" initial={{ y: -60, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
          <motion.span className="b-ico" initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15, type: 'spring' }}><Icon name={d.icon} /></motion.span>
          <div><small>{L('Badge sbloccato', 'Badge unlocked')}</small><b>{lx(d.title)}</b><span>{lx(d.text)}</span></div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}
