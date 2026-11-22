import { useLang } from '../lib/i18n.jsx';
import { ROUNDS } from '../content/public.js';
import { LEVER_SHAPES } from '../engine/model.js';
import { Term, AutoTerms as A } from './Coach.jsx';
import Icon from './Icon.jsx';

// Public sheet for both squads: story of the round, KPIs, the 3 open levers, the pre-agreed terms.
export function RoundBrief({ round }) {
  const { L, lx } = useLang();
  const r = ROUNDS[round];
  return (
    <article className="brief" style={{ '--rc': r.color }}>
      <header><span className="round-chip" style={{ '--rc': r.color }}><Icon name={r.icon} />{lx(r.name)}</span><h2>{lx(r.year)}</h2></header>
      <div className="brief-ticket"><div><small>Ticket</small><b>{r.ticket}</b></div><div><small>{L('Strumento', 'Instrument')}</small><b>{lx(r.instrument)}</b></div><div><small>{L('Al tavolo', 'At the table')}</small><b>{lx(r.investors)}</b></div></div>
      <p><A text={lx(r.sheet)} /></p>
      <dl className="kv">{r.kpis.map(([k, v], i) => <div key={i}><dt>{lx(k)}</dt><dd><A text={lx(v)} /></dd></div>)}</dl>
      <h3>{L('Le 3 leve aperte', 'The 3 open levers')}</h3>
      <table className="tbl">
        <thead><tr><th>{L('Leva', 'Lever')}</th><th>{L('Apertura degli investitori', 'Investors\' opening')}</th><th>{L('Cosa c\'è in gioco', 'What is at stake')}</th></tr></thead>
        <tbody>{LEVER_SHAPES[round].map((s, i) => { const t = r.levers[s.key]; return <tr key={s.key}><td><b>{i + 1}. {lx(t.label)}</b></td><td><A text={lx(t.opening)} /></td><td><A text={lx(t.stake)} /></td></tr>; })}</tbody>
      </table>
      <h3>{L('Termini già concordati', 'Pre-agreed terms')} <small>{L('riaprirli costa una concessione su una leva', 'reopening one costs a concession on a lever')}</small></h3>
      <dl className="kv">{r.preAgreed.map(([k, v], i) => <div key={i}><dt>{lx(k)}</dt><dd><A text={lx(v)} /></dd></div>)}</dl>
      <p className="hint">{L('Glossario: ', 'Glossary: ')}{['SAFE', 'Valuation cap', 'Pre-money', 'Option pool', 'Pro-rata', 'ROFR', 'ROFN', 'BATNA', 'Walk-away', 'ZOPA'].map((k, i) => <span key={k}>{i ? ', ' : ''}<Term k={k} /></span>)}</p>
    </article>
  );
}

// A squad's confidential card.
export function PrivateCard({ row, side }) {
  const { L, lx } = useLang();
  if (!row) return null;
  const c = lx(row.body);
  return (
    <article className={'private ' + side}>
      <header>
        <span className="conf"><Icon name="key" /> {L('Riservato', 'Confidential')}: {side === 'startup' ? L('solo squadra startup', 'startup squad only') : L('solo squadra investitori', 'investor squad only')}</span>
        <h2>{c.title}</h2>
        {c.voices && <p className="voices"><Icon name="users" /> {c.voices}</p>}
      </header>
      <p className="objectives"><b>{L('Obiettivi', 'Objectives')}</b> <A text={c.objectives} /></p>
      <table className="tbl">
        <thead><tr><th>{L('Leva', 'Lever')}</th><th>{L('Il tuo obiettivo', 'Your target')}</th><th>{L('Il tuo walk-away', 'Your walk-away')}</th></tr></thead>
        <tbody>{c.levers.map(([l, t, w], i) => <tr key={i}><td><b>{i + 1}. {l}</b></td><td><A text={t} /></td><td className="walk"><A text={w} /></td></tr>)}</tbody>
      </table>
      <dl className="kv">
        {c.batna && <div><dt><Term k="BATNA" /></dt><dd><A text={c.batna} /></dd></div>}
        <div><dt>{L('Informazioni private', 'Private information')}</dt><dd><ul>{c.private.map((p, i) => <li key={i}><A text={p} /></li>)}</ul></dd></div>
        <div><dt>{L('Leva negoziale', 'Leverage')}</dt><dd><A text={c.leverage} /></dd></div>
        <div><dt>{L('Moneta di scambio', 'Trade currency')}</dt><dd><A text={c.trade} /></dd></div>
      </dl>
    </article>
  );
}

export function SolutionCard({ row }) {
  const { L, lx } = useLang();
  if (!row) return null;
  const s = lx(row.body);
  return (
    <article className="solution">
      <header><span className="conf"><Icon name="key" /> {L('Solo facilitator', 'Facilitators only')}</span><h3>ZOPA</h3><p>{s.zopa}</p></header>
      <h4>Sweet spot</h4><ol>{s.sweet.map((x, i) => <li key={i}>{x}</li>)}</ol>
      <h4>{L('Come gestire le buste', 'How to handle the envelopes')}</h4><ul>{s.envelopes.map((x, i) => <li key={i}>{x}</li>)}</ul>
      <h4>{L('Domande per il debrief', 'Debrief questions')}</h4><ul>{s.debrief.map((x, i) => <li key={i}>{x}</li>)}</ul>
      <h4>{L('Errori tipici', 'Typical mistakes')}</h4><ul>{s.mistakes.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </article>
  );
}
