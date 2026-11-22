import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIPS } from '../content/public.js';
import { GLOSSARY } from '../content/learn.js';
import { useLang } from '../lib/i18n.jsx';
import Icon from './Icon.jsx';

const Ctx = createContext({ tip: () => {}, say: () => {} });
export const useCoach = () => useContext(Ctx);
const store = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };

// A coach that pops up short, contextual negotiation tips. One at a time, never the same twice in a session.
export function CoachProvider({ children }) {
  const { L, lx } = useLang();
  const [on, setOn] = useState(() => store('bvc-coach', '1') === '1');
  const [cur, setCur] = useState(null);
  const used = useRef(new Set());
  const timer = useRef();
  const show = useCallback(msg => {
    clearTimeout(timer.current); setCur({ ...msg, key: Math.random() });
    timer.current = setTimeout(() => setCur(null), msg.tone === 'warn' ? 14000 : 11000);
  }, []);
  const tip = useCallback((ctx, opts = {}) => {
    if (!on && !opts.force) return;
    const pool = (TIPS[ctx] || []).filter(t => !used.current.has(t.en));
    if (!pool.length) return;
    const t = pool[Math.floor(Math.random() * pool.length)]; used.current.add(t.en);
    show({ text: t, ctx });
  }, [on, show]);
  const say = useCallback((text, tone) => { if (on || tone === 'warn') show({ text, tone }); }, [on, show]);
  const toggle = () => { const v = !on; setOn(v); try { localStorage.setItem('bvc-coach', v ? '1' : '0'); } catch { /* ignore */ } if (!v) setCur(null); };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Ctx.Provider value={{ tip, say, on, toggle }}>
      {children}
      <div className="coach-dock" aria-live="polite">
        <AnimatePresence>
          {cur && (
            <motion.div key={cur.key} className={'coach ' + (cur.tone || '')} initial={{ opacity: 0, y: 40, scale: 0.9, rotate: -2 }} animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
              <div className="coach-av"><Icon name={cur.tone === 'warn' ? 'alert' : 'zap'} /></div>
              <div className="coach-body">
                <b>{cur.tone === 'warn' ? L('Attenzione', 'Heads up') : L('Il coach', 'Coach')}</b>
                <p><AutoTerms text={lx(cur.text)} /></p>
                <div className="coach-act">
                  <button type="button" onClick={() => setCur(null)}>{L('Ok', 'Got it')}</button>
                  {cur.ctx && <button type="button" onClick={() => tip(cur.ctx, { force: true })}>{L('Un altro', 'Another one')}</button>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function CoachToggle() {
  const { on, toggle } = useCoach(); const { L } = useLang();
  return <button type="button" aria-pressed={on} onClick={toggle} title={L('Consigli del coach: attivi o spenti', 'Coach tips: on or off')} className="iconbtn labeled"><Icon name="bulb" /><span>{on ? L('Consigli', 'Tips') : L('Consigli off', 'Tips off')}</span></button>;
}

// Glossary term with an explanation on hover or tap. Each first opening counts towards the «Curious» badge.
const opened = new Set();
export function Term({ k, children }) {
  const { lx } = useLang(); const [open, setOpenState] = useState(false);
  const setOpen = v => { setOpenState(v); if (v && !opened.has(k)) { opened.add(k); window.dispatchEvent(new CustomEvent('bvc-term', { detail: opened.size })); } };
  const def = GLOSSARY[k]; if (!def) return children || k;
  return (
    <span className="term" tabIndex={0} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(!open)}>
      {children || k}
      <AnimatePresence>{open && <motion.span className="term-pop" role="tooltip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><b>{k}</b> {lx(def)}</motion.span>}</AnimatePresence>
    </span>
  );
}

// Finds glossary terms (and their aliases) inside plain text and turns the first occurrence of each into a <Term>.
const ALIASES = Object.entries(GLOSSARY).flatMap(([k, v]) => [[k, k], ...(v.alias || []).map(a => [a, k])]).sort((a, b) => b[0].length - a[0].length);
const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RX = new RegExp('(?<![\\p{L}\\d])(' + ALIASES.map(a => esc(a[0])).join('|') + ')(?![\\p{L}\\d])', 'giu');
const KEY = Object.fromEntries(ALIASES.map(([a, k]) => [a.toLowerCase(), k]));
export function AutoTerms({ text }) {
  if (typeof text !== 'string' || !text) return text || null;
  const seen = new Set(), out = []; let last = 0;
  for (const m of text.matchAll(RX)) {
    const k = KEY[m[0].toLowerCase()];
    if (!k || seen.has(k)) continue;
    seen.add(k);
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<Term key={m.index} k={k}>{m[0]}</Term>);
    last = m.index + m[0].length;
  }
  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
