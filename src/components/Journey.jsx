import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { tablePath, journey, exitProceeds, CASE, HOLDERS, WALK, LEVER_SHAPES } from '../engine/model.js';
import { ROUNDS, HOLDER_NAMES } from '../content/public.js';
import LeverInput from './LeverInput.jsx';
import Icon from './Icon.jsx';

export function CapBar({ t, label, color }) {
  const { pc } = useLang();
  return (
    <>
      <span className="evo-lab" style={{ color }}>{label}</span>
      <div className="evo-bar" role="img" aria-label={HOLDERS.filter(h => t[h] > 0.0005).map(h => `${HOLDER_NAMES[h]} ${pc(t[h])}`).join(', ')}>
        {HOLDERS.map(h => t[h] > 0.0005 && (
          <motion.span key={h} title={`${HOLDER_NAMES[h]} ${pc(t[h])}`} style={{ background: `var(--h-${h})` }} initial={false} animate={{ width: t[h] * 100 + '%' }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
            {t[h] > 0.07 && <i>{pc(t[h], 0)}</i>}
          </motion.span>
        ))}
      </div>
    </>
  );
}

function notes(j, n, T) {
  const { L, pc, eur, eurk } = T, { r1, r2, r3 } = j, out = [];
  out.push(['sprout', '', L(`Il SAFE converte con cap ${eur(r1.cap)}: angels e Lanterna hanno il ${pc(r1.s)} prima del seed.`, `The SAFE converts at a ${eur(r1.cap)} cap: angels and Lanterna own ${pc(r1.s)} before the seed.`)]);
  out.push(r1.pre.Luca > 0.05 ? ['alert', 'warn', L(`Luca ha ancora il ${pc(r1.pre.Luca)}: Lumen chiederà di pulire il cap table.`, `Luca still holds ${pc(r1.pre.Luca)}: Lumen will ask for a clean-up.`)] : ['check', '', L(`Dead equity sistemata: Luca al ${pc(r1.pre.Luca)}.`, `Dead equity settled: Luca at ${pc(r1.pre.Luca)}.`)]);
  if (n >= 2) {
    out.push([r2.clubShort ? 'alert' : 'users', r2.clubShort ? 'warn' : '', L(`Il pro-rata di Lanterna prende ${eurk(r2.proRataM)} del seed e lascia ${eurk(r2.clubM)} al Club${r2.clubShort ? ': sotto il minimo di €800k' : ''}.`, `Lanterna's pro-rata takes ${eurk(r2.proRataM)} of the seed, leaving ${eurk(r2.clubM)} to the Club${r2.clubShort ? ': below its €800k minimum' : ''}.`)]);
    const b = r2.board, inv = b.I + 1, tot = b.F + b.I + b.X + 1;
    if (n >= 3) out.push([inv > b.F + b.X ? 'alert' : 'users', inv > b.F + b.X ? 'warn' : '', L(`Con Verdis alla Series A gli investitori hanno ${inv} seggi su ${tot}.`, `With Verdis at the Series A the investors hold ${inv} of ${tot} seats.`)]);
  }
  return out;
}

// The cap table from the start to the last round of the game, with what carries over and the exit.
export default function Journey({ results = {}, nRounds = 3, canPlay = true, showExit = true, refs, revealed = {} }) {
  const T = useLang(); const { L, lx, pc, eur } = T;
  const base = useMemo(() => tablePath(results, refs), [results, refs]);
  const [play, setPlay] = useState(null);
  const [exitV, setExitV] = useState(150);
  const opts = play || base.opts;
  const j = play ? journey(opts[1], opts[2], opts[3]) : base.j;
  const after = [null, j.r1.founders, j.r2.founders, j.r3.founders];
  const tables = [null, j.r1.conv, j.r2.table, j.r3.table];
  const w = exitProceeds(j, exitV);
  const setOpt = (r, k, v) => setPlay(p => { const n = JSON.parse(JSON.stringify(p || base.opts)); n[r][k] = v; return n; });
  return (
    <div className="journey">
      <div className="kpis">
        {[1, 2, 3].slice(0, nRounds).map(r => {
          const bad = WALK[r] && after[r] < WALK[r];
          return (
            <div key={r} className={'kpi' + (bad ? ' bad' : r === nRounds ? ' hi' : '')}>
              <div className="k"><Icon name={ROUNDS[r].icon} /> {L('Founder dopo', 'Founders after')} {lx(ROUNDS[r].name)}{WALK[r] ? ` (walk-away ${WALK[r] * 100}%)` : ''}</div>
              <motion.div className="v" key={after[r].toFixed(4)} initial={{ scale: 1.15 }} animate={{ scale: 1 }}>{pc(after[r])}</motion.div>
              {!play && base.assumed[r] && <div className="kpi-note">{revealed[r] ? L('non firmato: sweet spot del round', 'not signed: the round\'s sweet spot') : L('proiezione: condizioni d\'apertura degli investitori', 'projection: the investors\' opening terms')}</div>}
            </div>
          );
        })}
      </div>

      <div className="evo">
        <CapBar t={CASE.start} label={L('Inizio', 'Start')} />
        {[1, 2, 3].slice(0, nRounds).map(r => <CapBar key={r} t={tables[r]} label={lx(ROUNDS[r].name)} color={ROUNDS[r].color} />)}
      </div>
      <div className="legend">{HOLDERS.filter(h => tables[nRounds][h] > 0 || CASE.start[h] > 0).map(h => <span key={h}><i style={{ background: `var(--h-${h})` }} />{HOLDER_NAMES[h]}</span>)}</div>

      <ul className="carry">{notes(j, nRounds, T).map(([ic, c, t], i) => <li key={i} className={c}><Icon name={ic} /><span>{t}</span></li>)}</ul>

      {canPlay && (
        <details className="whatif" open={!!play}>
          <summary><Icon name="sliders" /> {L('E se…? Prova altre condizioni', 'What if…? Try other terms')}</summary>
          <p className="hint">{L('Simulazione privata: non cambia nulla al tavolo.', 'Private simulation: nothing changes at the table.')}</p>
          <div className="whatif-grid">
            {[1, 2, 3].slice(0, nRounds).map(r => (
              <div key={r} className="whatif-round" style={{ '--rc': ROUNDS[r].color }}>
                <h4><Icon name={ROUNDS[r].icon} /> {lx(ROUNDS[r].name)}</h4>
                {LEVER_SHAPES[r].map(s => <LeverInput key={s.key} round={r} shape={s} value={opts[r][s.key]} onChange={v => setOpt(r, s.key, v)} compact />)}
              </div>
            ))}
          </div>
          {play && <button type="button" className="btn ghost" onClick={() => setPlay(null)}>{L('Torna al percorso del tavolo', 'Back to the table\'s path')}</button>}
        </details>
      )}

      {showExit && nRounds === 3 && (
        <div className="exitbox">
          <h3><Icon name="flag" /> {L('La fine della storia: l\'exit', 'The end of the story: the exit')}</h3>
          <label className="field"><span>{L('Valore dell\'equity all\'exit', 'Exit equity value')} <output>{eur(exitV, 0)}</output></span>
            <input type="range" min="30" max="400" step="5" value={exitV} onChange={e => setExitV(+e.target.value)} style={{ '--p': ((exitV - 30) / 370) * 100 + '%', '--rc': 'var(--lime)' }} /></label>
          <div className="exit-rows">
            {[['founders', L('Founder (Andrea + Chiara)', 'Founders (Andrea + Chiara)'), 'Andrea'], ['luca', 'Luca', 'Luca'], ['esop', 'ESOP', 'ESOP'], ['seed', L('Investitori seed (SAFE incluso)', 'Seed investors (incl. SAFE)'), 'Lumen'], ['seriesA', 'Series A', 'Verdis']].map(([k, n, h]) => (
              <div key={k} className="exit-row"><span>{n}</span><div className="exit-track"><motion.i style={{ background: `var(--h-${h})` }} animate={{ width: (w[k] / exitV) * 100 + '%' }} /></div><b>{eur(w[k])}</b></div>
            ))}
          </div>
          {w.haircut > 0 && <p className="hint warn"><Icon name="alert" /> {L('Con un ROFR alla CVC gli altri compratori si tirano indietro: ipotesi didattica di -15% sul prezzo di vendita.', 'With a CVC ROFR other buyers stay away: teaching assumption of -15% on the sale price.')}</p>}
          <p className="hint">{L('Preferred 1x non partecipanti, pari passu: €3,6M per le classi seed, €15M per la Series A, convertono quando conviene.', '1x non-participating preferred, pari passu: €3.6M for the seed classes, €15M for the Series A, converting when it pays.')}</p>
        </div>
      )}
    </div>
  );
}
