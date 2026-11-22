import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { api } from '../lib/api/index.js';
import { scoreRound } from '../engine/scoring.js';
import { LEVER_SHAPES, WALK } from '../engine/model.js';
import { ROUNDS } from '../content/public.js';
import { tableResults } from '../lib/useGame.js';
import { burst } from '../lib/fx.js';
import LeverInput from './LeverInput.jsx';
import Icon from './Icon.jsx';
import ConfirmButton from './ConfirmButton.jsx';
import { errText } from '../lib/net.js';

const TRADES = [[10, ['Ogni concessione scambiata, più uno scambio creativo', 'Every concession traded, plus one creative trade']], [6, ['Ogni concessione scambiata', 'Every concession traded']], [2, ['Una concessione gratuita', 'One free concession']], [0, ['Più concessioni gratuite', 'Several free concessions']]];

// Facilitator's scoring form (Part C). Prefilled from the signed term sheet and the squads' votes.
export default function ScoreForm({ snap, table, round, sc }) {
  const T = useLang(); const { L, lx, num, pc } = T;
  const g = snap.game;
  const all = tableResults(snap, table);
  const row = all[round];
  const vote = s => snap.votes.find(v => v.table_no === table && v.round === round && v.from_role === s)?.value;
  const init = () => ({
    outcome: row?.outcome || 'signed', terms: { ...(row?.terms || {}) },
    trades: { f: 6, i: 6, ...(row?.trades || {}) }, facts: { f: 0, i: 0, ...(row?.facts || {}) }, breach: { f: false, i: false, ...(row?.breach || {}) },
    rel: { f: row?.rel?.f ?? vote('investor') ?? '', i: row?.rel?.i ?? vote('startup') ?? '' },
  });
  const [d, setD] = useState(init);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const key = `${table}-${round}-${row?.updated_at || ''}-${row?.status || ''}`;
  useEffect(() => { setD(init()); setMsg(''); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  // Votes may arrive after the form opened.
  useEffect(() => { setD(x => ({ ...x, rel: { f: x.rel.f === '' ? vote('investor') ?? '' : x.rel.f, i: x.rel.i === '' ? vote('startup') ?? '' : x.rel.i } })); }, [snap.votes]); // eslint-disable-line react-hooks/exhaustive-deps

  const prev = { 1: all[1], 2: all[2] };
  const cards = sc.scoring(round);
  const score = useMemo(() => scoreRound(round, d, prev, cards, sc.refs), [d, round, all[1], all[2], cards, sc.refs]); // eslint-disable-line react-hooks/exhaustive-deps
  const filled = cards.length > 0 && score.levers.every(x => x.filled);
  const set = (path, v) => setD(x => { const n = JSON.parse(JSON.stringify(x)); const [a, b] = path.split('.'); if (b) n[a][b] = v; else n[a] = v; return n; });
  const teams = snap.teams.filter(t => t.table_no === table);
  const nameOf = r => teams.find(t => t.role === r)?.name;

  const save = async () => {
    if (d.outcome === 'signed' && !filled) { setMsg(L('Compila tutte e 3 le leve prima di salvare un deal firmato.', 'Fill in all 3 levers before saving a signed deal.')); return; }
    setBusy(true);
    try {
      const result = { f: score.f, i: score.i };
      await api.saveResult({ game_id: g.id, table_no: table, round, outcome: d.outcome, terms: d.terms, trades: d.trades, rel: d.rel, facts: d.facts, breach: d.breach, result, status: 'scored', offer_id: row?.offer_id || null });
      await api.postEvent({ game_id: g.id, table_no: table, round, kind: 'scored', audience: 'all', payload: result });
      setMsg(L('Salvato. Le squadre vedono il punteggio e la classifica si aggiorna.', 'Saved. The squads see their score and the leaderboard updates.')); burst(0.75, 0.8);
    } catch (x) { setMsg(L('Non salvato. ', 'Not saved. ') + errText(x, L)); }
    setBusy(false);
  };

  const Side = ({ s, role }) => {
    const x = score[s];
    return (
      <div className={'side-score ' + role}>
        <div className="ss-h"><Icon name={role === 'startup' ? 'bulb' : 'briefcase'} /> {nameOf(role)}</div>
        <motion.div className="ss-total" key={x.total.toFixed(1)} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>{num(x.total, 1)}</motion.div>
        <div className="ss-rows">
          {[['close', L('Chiusura', 'Close'), 20], ['claim', L('Conquistato', 'Claim'), 45], ['create', L('Creato', 'Create'), 15], ['trades', L('Scambi', 'Trades'), 10], ['rel', L('Relazione', 'Relationship'), 10], ['pen', L('Penalità', 'Penalties')]].map(([k, t, m]) => <div key={k}><span>{t}</span><b>{num(x[k] || 0, 1)}{m ? <small>/{m}</small> : null}</b></div>)}
        </div>
        {x.breach && <p className="walkwarn"><Icon name="alert" /> {L('Walk-away superato', 'Walk-away breached')}</p>}
        <label className="field"><span>{L('Scambi', 'Trades')}</span><select value={d.trades[s]} onChange={e => set('trades.' + s, +e.target.value)}>{TRADES.map(([p, t]) => <option key={p} value={p}>{p}: {L(...t)}</option>)}</select></label>
        <div className="row2">
          <label className="field"><span>{L('Voto relazione ricevuto', 'Relationship vote received')}</span><input type="number" min="0" max="10" value={d.rel[s]} onChange={e => set('rel.' + s, e.target.value)} placeholder="0-10" /></label>
          <label className="field"><span>{L('Fatti inventati', 'Invented facts')}</span><input type="number" min="0" value={d.facts[s]} onChange={e => set('facts.' + s, e.target.value)} /></label>
        </div>
        <label className="chk"><input type="checkbox" checked={!!d.breach[s]} onChange={e => set('breach.' + s, e.target.checked)} /> {L('Ha firmato oltre un proprio walk-away (gli altri casi li rileva la pagina)', 'Signed beyond its own walk-away (other cases are detected)')}</label>
      </div>
    );
  };

  return (
    <div className="scoreform" style={{ '--rc': ROUNDS[round].color }}>
      {!cards.length && <p className="walkwarn"><Icon name="alert" /> {L('Griglie di punteggio non caricate: controlla che il pacchetto riservato sia nel database (supabase/seed_content.sql).', 'Scoring cards not loaded: check that the confidential pack is in the database (supabase/seed_content.sql).')}</p>}
      <div className="seg">{[['signed', L('Firmato', 'Signed')], ['argued', L('No deal argomentato', 'Well-argued no deal')], ['none', L('No deal', 'No deal')]].map(([v, t]) => <button key={v} type="button" aria-pressed={d.outcome === v} onClick={() => set('outcome', v)}>{t}</button>)}</div>
      {row?.offer_id && <p className="hint"><Icon name="check" /> {L('Leve precompilate dal term sheet firmato al tavolo.', 'Levers prefilled from the term sheet signed at the table.')}</p>}
      <div className="sf-levers">
        {LEVER_SHAPES[round].map((s, i) => {
          const r = score.levers[i] || {}, card = cards[i] || {};
          return (
            <div key={s.key} className={'sf-lever' + (r.band ? ' band' : '') + (r.fBreach || r.iBreach ? ' breach' : '')}>
              <LeverInput idx={i} round={round} shape={s} value={d.terms[s.key]} onChange={v => set('terms.' + s.key, v)} check={d.terms[s.key + 'Check']} onCheck={c => set('terms.' + s.key + 'Check', c)} />
              <div className="sf-split">
                <span className="s">S {r.filled ? num(r.f, 1) : '·'}</span><div className="sf-bar"><motion.i animate={{ width: (r.f / 15) * 100 + '%' }} /></div><span className="i">{r.filled ? num(r.i, 1) : '·'} I</span>
                {r.band && <em className="band-tag">sweet spot +5</em>}
                {card.type === 'num' && <small>ZOPA {num(card.lo, 1)}–{num(card.hi, 1)}, band {num(card.band[0], 1)}–{num(card.band[1], 1)}</small>}
              </div>
            </div>
          );
        })}
      </div>
      {score.founders != null && <div className={'kpi' + (score.ownBreach ? ' bad' : '')}><div className="k">{L('Founder dopo il round', 'Founders after the round')} (walk-away {WALK[round] * 100}%)</div><div className="v">{pc(score.founders)}</div></div>}
      <div className="sf-sides"><Side s="f" role="startup" /><Side s="i" role="investor" /></div>
      <div className="row">
        <button type="button" className="btn primary big" onClick={save} disabled={busy}><Icon name="check" /> {row?.status === 'scored' ? L('Aggiorna il punteggio', 'Update the score') : L('Salva e mostra il punteggio', 'Save and reveal the score')}</button>
        {row && <ConfirmButton onConfirm={() => api.deleteResult(g.id, table, round)}>{L('Cancella risultato', 'Delete result')}</ConfirmButton>}
      </div>
      {msg && <p className="msg">{msg}</p>}
      <p className="hint">{lx(ROUNDS[round].name)}: {L('chiusura 20, conquistato 3×15, creato 3×5, scambi 10, relazione 10, -10 per ogni fatto inventato.', 'close 20, claim 3×15, create 3×5, trades 10, relationship 10, -10 per invented fact.')}</p>
    </div>
  );
}
