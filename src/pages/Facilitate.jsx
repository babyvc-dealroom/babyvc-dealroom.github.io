import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { api } from '../lib/api/index.js';
import { tableResults, useCountdown, useNewItems } from '../lib/useGame.js';
import { useCoach } from '../components/Coach.jsx';
import { sfx } from '../lib/fx.js';
import { ROUNDS } from '../content/public.js';
import { fmtTerm } from '../lib/format.js';
import { LEVER_SHAPES } from '../engine/model.js';
import Journey from '../components/Journey.jsx';
import { PrivateCard, SolutionCard } from '../components/Cards.jsx';
import Icon from '../components/Icon.jsx';
import { Loading } from '../components/Shell.jsx';
import { useScenario } from '../lib/useScenario.js';
import LearnHub from '../components/Learn.jsx';
import { errText } from '../lib/net.js';

const ScoreForm = lazy(() => import('../components/ScoreForm.jsx'));

export function tableStatus(snap, t) {
  const g = snap.game, r = snap.results.find(x => x.table_no === t && x.round === g.round);
  if (r?.status === 'scored') return 'scored';
  if (r) return 'signed';
  if (snap.offers.some(o => o.table_no === t && o.round === g.round)) return 'live';
  return 'idle';
}
const OFFER_ST = { open: ['sul tavolo', 'on the table'], accepted: ['firmata', 'signed'], rejected: ['rifiutata', 'rejected'], countered: ['superata da controproposta', 'countered'], withdrawn: ['ritirata', 'withdrawn'] };
export const STATUS = { idle: ['In attesa', 'Waiting'], live: ['In trattativa', 'Negotiating'], signed: ['Firmato', 'Signed'], scored: ['Valutato', 'Scored'] };

// Room facilitator: one table at a time. Envelopes, live offers, cards, solution and the score form.
export default function Facilitate({ snap }) {
  const T = useLang(); const { L, lx } = T;
  const coach = useCoach();
  const g = snap.game;
  // The game master reaches every table; a facilitator only the tables assigned with their PIN.
  const mine = snap.me.role === 'admin' ? Array.from({ length: g.n_tables }, (_, k) => k + 1) : (snap.me.tables || []);
  const [pick, setTable] = useState(() => { try { return +sessionStorage.getItem('bvc-fac-table-' + g.id) || mine[0]; } catch { return mine[0]; } });
  const table = mine.includes(pick) ? pick : mine[0];
  const sc = useScenario(snap);
  const [round, setRound] = useState(g.round);
  useEffect(() => { try { sessionStorage.setItem('bvc-fac-table-' + g.id, table); } catch { /* ignore */ } }, [table, g.id]);
  useEffect(() => { setRound(g.round); }, [g.round]);
  const left = useCountdown(g.phase_ends_at);
  const remindB = useRef(false);
  useEffect(() => {
    const tot = (g.settings?.minutes?.negotiate || 15) * 60;
    if (g.phase === 'negotiate' && left != null && tot - left >= 540 && !remindB.current) { remindB.current = true; coach.say(L('Minuto 9: se nessuna leva è chiusa, apri la busta B.', 'Minute 9: if no lever has closed, open Envelope B.'), 'warn'); }
    if (g.phase !== 'negotiate') remindB.current = false;
  }, [left, g.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const offers = useMemo(() => snap.offers.filter(o => o.table_no === table && o.round === round).slice().reverse(), [snap.offers, table, round]);
  useNewItems(offers, useCallback(() => sfx.receive(), []));
  const opened = snap.events.filter(e => e.kind === 'envelope' && e.table_no === table && e.round === g.round).map(e => e.payload.key);
  const teams = snap.teams.filter(t => t.table_no === table);
  const nameOf = r => teams.find(t => t.role === r)?.name;
  const card = sc.card;
  const votes = snap.votes.filter(v => v.table_no === table && v.round === round);
  const results = tableResults(snap, table);

  const open = async k => { try { await api.openEnvelope(g.id, table, k); sfx.envelope(); } catch (x) { coach.say(errText(x, L), 'warn'); } };

  return (
    <div className="fac">
      <div className="table-chips" role="tablist">
        {mine.map(t => {
          const st = tableStatus(snap, t);
          return <button key={t} type="button" role="tab" aria-selected={table === t} className={'tchip ' + st} onClick={() => setTable(t)}><b>{L('Tavolo', 'Table')} {t}</b><small>{L(...STATUS[st])}</small></button>;
        })}
      </div>
      {snap.me.role !== 'admin' && <p className="hint"><Icon name="key" /> {L('Vedi solo i tavoli assegnati a te. Per seguirne un altro, rientra con il PIN facilitator di quel tavolo.', 'You only see the tables assigned to you. To follow another one, join again with that table\'s facilitator PIN.')}</p>}
      <div className="pairing"><span className="startup"><Icon name="bulb" /> {nameOf('startup')}</span><i>vs</i><span className="investor">{nameOf('investor')} <Icon name="briefcase" /></span></div>

      <div className="fac-grid">
        <section className="panel">
          <h3><Icon name="mail" /> {L('Buste del round', 'Round envelopes')} {lx(ROUNDS[g.round].name)}</h3>
          <div className="env-buttons">
            {[['A', L('Dopo le offerte di apertura', 'After the opening offers')], ['B', L('Prima leva chiusa o minuto 9', 'First lever closed or minute 9')], ['spare', L('Solo se le 3 leve sono chiuse presto', 'Only if all 3 levers close early')]].map(([k, when]) => {
              const env = card(g.round, 'env_' + k), done = opened.includes(k);
              return (
                <motion.button key={k} type="button" className={'envbtn' + (done ? ' done' : '')} disabled={done || !['negotiate', 'sign'].includes(g.phase)} onClick={() => open(k)} whileTap={{ scale: 0.95 }}>
                  <span className="eb-key">{k === 'spare' ? L('Ris.', 'Spare') : k}</span>
                  <span><b>{env ? lx(env.body).title : '…'}</b><small>{when}. {L('Per', 'For')}: {env?.audience === 'all' ? L('entrambe', 'both squads') : env?.audience === 'startup' ? 'startup' : L('investitori', 'investors')}</small></span>
                  {done ? <Icon name="check" /> : <Icon name="send" />}
                </motion.button>
              );
            })}
          </div>
          {!['negotiate', 'sign'].includes(g.phase) && <p className="hint">{L('Le buste si aprono durante la trattativa.', 'Envelopes open during the negotiation.')}</p>}
        </section>

        <section className="panel">
          <h3><Icon name="doc" /> {L('Offerte al tavolo', 'Offers at the table')} <small>{offers.length}</small></h3>
          {!offers.length && <p className="empty">{L('Nessuna offerta ancora.', 'No offers yet.')}</p>}
          <ol className="feed">
            {offers.map(o => (
              <motion.li key={o.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={o.from_role + ' ' + o.status}>
                <b>{nameOf(o.from_role)}</b> <span className={'st ' + o.status}>{L(...OFFER_ST[o.status])}</span>
                <span>{LEVER_SHAPES[o.round].map(s => fmtTerm(o.round, s.key, o.terms[s.key], T)).join(' | ')}</span>
                {o.note && <em>«{o.note}»</em>}
              </motion.li>
            ))}
          </ol>
          <p className="hint"><Icon name="users" /> {L('Voti relazione ricevuti', 'Relationship votes in')}: {votes.length}/2</p>
        </section>
      </div>

      <section className="panel">
        <div className="panel-h">
          <h3><Icon name="clipboard" /> {L('Firma e punteggio', 'Sign and score')}</h3>
          <div className="seg small">{Array.from({ length: g.round }, (_, i) => i + 1).map(r => <button key={r} type="button" aria-pressed={round === r} onClick={() => setRound(r)}>{lx(ROUNDS[r].name)}</button>)}</div>
        </div>
        <Suspense fallback={<Loading />}><ScoreForm snap={snap} table={table} round={round} sc={sc} /></Suspense>
      </section>

      <details className="panel">
        <summary><Icon name="route" /> {L('Journey del tavolo: cosa si porta dietro', 'Table journey: what carries over')}</summary>
        <Journey results={results} nRounds={g.n_rounds} canPlay={false} refs={sc.refs} revealed={{ 1: true, 2: true, 3: true }} />
      </details>
      <details className="panel">
        <summary><Icon name="bulb" /> {L('Impara: concetti, strategie, glossario da usare nel debrief', 'Learn: concepts, strategies, glossary for the debrief')}</summary>
        <LearnHub round={g.round} nRounds={g.n_rounds} />
      </details>
      <details className="panel">
        <summary><Icon name="key" /> {L('Carte e soluzione del round', 'Cards and solution for the round')}</summary>
        <div className="cards-grid three">
          <PrivateCard row={card(round, 'card_startup')} side="startup" />
          <PrivateCard row={card(round, 'card_investor')} side="investor" />
          <SolutionCard row={card(round, 'solution')} />
        </div>
      </details>
    </div>
  );
}
