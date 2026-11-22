import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import Icon from './Icon.jsx';

const L2 = (it, en) => ({ it, en });
// Guided tour that lights up the real buttons of the page, one at a time. Steps whose element is not on screen are skipped.
export const TOURS = {
  lobby: [
    ['.teamname', L2('Questo è il nome della vostra squadra: potete cambiarlo finché la partita non parte.', 'This is your squad\'s name: you can change it until the game starts.')],
    ['.help-btn', L2('Il punto di domanda vi dice sempre cosa fare adesso, con parole semplici.', 'The question mark always tells you what to do now, in plain words.')],
  ],
  player: [
    ['.nowbar', L2('Qui leggete sempre cosa fare in questa fase. Cambia da solo quando cambia la fase.', 'Here you always read what to do in this phase. It changes by itself when the phase changes.')],
    ['.tabs [data-tab="card"]', L2('Le carte: la scheda pubblica del round e la vostra carta riservata, con i vostri limiti.', 'Your cards: the round\'s public sheet and your confidential card, with your limits.')],
    ['.tabs [data-tab="deal"]', L2('Il tavolo: qui mandate i term sheet, ricevete le controproposte e firmate.', 'The table: here you send term sheets, get counter-offers and sign.')],
    ['.tabs [data-tab="journey"]', L2('Journey: guardate come cambia il cap table fino all\'exit prima di firmare.', 'Journey: see how the cap table changes up to the exit before you sign.')],
    ['.tabs [data-tab="learn"]', L2('Impara: concetti, strategie e glossario. Le parole sottolineate si spiegano con un clic.', 'Learn: concepts, strategies and glossary. Underlined words explain themselves with a click.')],
    ['.help-btn', L2('Dubbi? Il punto di domanda apre le istruzioni per il vostro ruolo.', 'Unsure? The question mark opens the instructions for your role.')],
  ],
  facilitator: [
    ['.nowbar', L2('Qui leggi cosa fare in questa fase.', 'Here you read what to do in this phase.')],
    ['.table-chips', L2('I tuoi tavoli, con lo stato in tempo reale. Vedi solo quelli del tuo PIN.', 'Your tables, with live status. You only see those of your PIN.')],
    ['.env-buttons', L2('Le buste: aprile al momento giusto. Arrivano solo alla squadra destinataria.', 'Envelopes: open them at the right moment. They reach only the intended squad.')],
    ['.scoreform', L2('Dopo la firma dai il punteggio: le leve sono già compilate.', 'After signing, score the round: the levers are prefilled.')],
    ['.help-btn', L2('Il punto di domanda apre le istruzioni per il facilitator.', 'The question mark opens the facilitator instructions.')],
  ],
  admin: [
    ['.ctrl-bar', L2('«Avanti» porta tutta la sala alla fase successiva e fa partire il timer.', '«Next» moves the whole room to the next phase and starts the timer.')],
    ['.stepper', L2('La mappa della partita: dove siete e cosa viene dopo.', 'The game map: where you are and what comes next.')],
    ['.tabs [data-tab="access"]', L2('Accessi: i PIN delle squadre e un PIN facilitator per ogni tavolo.', 'Access: squad PINs and one facilitator PIN per table.')],
    ['.ctrl-actions', L2('Proiettore, join card con QR e CSV dei risultati.', 'Projector, QR join cards and the results CSV.')],
  ],
};

export const tourSeen = k => { try { return !!localStorage.getItem('bvc-spot-' + k); } catch { return true; } };
export function startTour() { window.dispatchEvent(new Event('bvc-tour')); }

export default function Spotlight({ tourKey, auto }) {
  const { L, lx } = useLang();
  const [i, setI] = useState(-1);
  const [rect, setRect] = useState(null);
  const steps = (TOURS[tourKey] || []).filter(([sel]) => typeof document !== 'undefined');
  const storeKey = 'bvc-spot-' + tourKey;
  const visible = useCallback(k => { for (let n = k; n < steps.length; n++) if (document.querySelector(steps[n][0])) return n; return -1; }, [steps]);
  // Waits for the phase title card and any popup to close, so that only one thing talks at a time.
  const begin = useCallback(() => {
    let tries = 0;
    const tryStart = () => { if (document.querySelector('.phasecard, .overlay') && tries++ < 40) return setTimeout(tryStart, 400); setI(visible(0)); };
    return setTimeout(tryStart, 350);
  }, [visible]);
  useEffect(() => { let seen = true; try { seen = !!localStorage.getItem(storeKey); } catch { /* ignore */ } if (auto && !seen) { const t = begin(); return () => clearTimeout(t); } }, [tourKey, auto]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const on = () => begin(); addEventListener('bvc-tour', on); return () => removeEventListener('bvc-tour', on); }, [begin]);
  const measure = useCallback(() => {
    if (i < 0) return;
    const el = document.querySelector(steps[i]?.[0]);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 });
  }, [i, steps]);
  useLayoutEffect(() => {
    if (i < 0) return;
    document.querySelector(steps[i]?.[0])?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(measure, 380); measure();
    addEventListener('resize', measure); addEventListener('scroll', measure, true);
    return () => { clearTimeout(t); removeEventListener('resize', measure); removeEventListener('scroll', measure, true); };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const end = () => { setI(-1); setRect(null); try { localStorage.setItem(storeKey, '1'); } catch { /* ignore */ } window.dispatchEvent(new CustomEvent('bvc-tour-end', { detail: tourKey })); };
  const next = () => { const n = visible(i + 1); if (n < 0) end(); else setI(n); };
  const back = () => { for (let n = i - 1; n >= 0; n--) if (document.querySelector(steps[n][0])) { setI(n); return; } };
  useEffect(() => { if (i < 0) return; const k = e => { if (e.key === 'Escape') end(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') back(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); });
  if (i < 0 || !steps[i]) return null;
  const vw = innerWidth, vh = innerHeight, bw = Math.min(340, vw - 24);
  const below = !rect || rect.y + rect.h + 190 < vh;
  const bx = rect ? Math.max(12, Math.min(vw - bw - 12, rect.x + rect.w / 2 - bw / 2)) : (vw - bw) / 2;
  const by = rect ? (below ? rect.y + rect.h + 14 : Math.max(12, rect.y - 14 - 170)) : vh / 2 - 80;
  const total = steps.filter(([s]) => document.querySelector(s)).length;
  const pos = steps.slice(0, i + 1).filter(([s]) => document.querySelector(s)).length;
  return (
    <div className="spot" role="dialog" aria-modal="true" aria-label={L('Tour guidato', 'Guided tour')}>
      <motion.div className="spot-hole" animate={rect ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h, opacity: 1 } : { left: vw / 2, top: vh / 2, width: 0, height: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} />
      <AnimatePresence mode="wait">
        <motion.div key={i} className="spot-bubble" style={{ left: bx, top: by, width: bw }} initial={{ opacity: 0, y: below ? -8 : 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
          <div className="spot-dots">{Array.from({ length: total }, (_, k) => <i key={k} className={k < pos ? 'on' : ''} />)}</div>
          <p>{lx(steps[i][1])}</p>
          <div className="spot-act">
            <button type="button" className="linkbtn" onClick={end}>{L('Salta il tour', 'Skip the tour')}</button>
            <span>{pos > 1 && <button type="button" className="btn ghost" onClick={back}>{L('Indietro', 'Back')}</button>}<button type="button" className="btn primary" onClick={next}>{pos === total ? L('Iniziamo', 'Let\'s go') : L('Avanti', 'Next')} <Icon name="next" /></button></span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
