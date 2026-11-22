import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { api } from '../lib/api/index.js';
import { ROUNDS } from '../content/public.js';
import { nextStep, allSteps, stepIndex, PHASE_LABEL } from '../lib/phases.js';
import { LEVER_SHAPES } from '../engine/model.js';
import Leaderboard from '../components/Leaderboard.jsx';
import Facilitate, { tableStatus, STATUS } from './Facilitate.jsx';
import Icon from '../components/Icon.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import LearnHub from '../components/Learn.jsx';
import { RoomHealth, Dot } from '../components/Health.jsx';
import { useCoach } from '../components/Coach.jsx';
import { serverNow, errText } from '../lib/net.js';
import { useCountdown } from '../lib/useGame.js';

function csv(snap) {
  const rows = [['table', 'round', 'outcome', 'lever1', 'lever2', 'lever3', 'startup_squad', 'startup_total', 'investor_squad', 'investor_total']];
  for (const r of [...snap.results].sort((a, b) => a.table_no - b.table_no || a.round - b.round)) {
    const tm = role => snap.teams.find(t => t.table_no === r.table_no && t.role === role)?.name;
    rows.push([r.table_no, r.round, r.outcome, ...LEVER_SHAPES[r.round].map(s => r.terms?.[s.key] ?? ''), tm('startup'), r.result?.f?.total ?? '', tm('investor'), r.result?.i?.total ?? '']);
  }
  // A cell starting with = + - @ would run as a formula in Excel: prefix it so it stays text.
  const cell = v => { const t = String(v); return `"${(/^[=+\-@\t\r]/.test(t) ? "'" + t : t).replace(/"/g, '""')}"`; };
  const blob = new Blob([rows.map(x => x.map(cell).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `dealroom-${snap.game.code}.csv`; a.click();
}

// Game master's control room: phases and timer, live tables, access codes, leaderboard.
export default function ControlRoom({ snap }) {
  const { L, lx } = useLang();
  const nav = useNavigate();
  const g = snap.game;
  const [tab, setTab] = useState('room');
  const steps = allSteps(g.n_rounds), cur = stepIndex(g, steps);
  const nx = nextStep(g);
  const mins = p => g.settings?.minutes?.[p] || 5;
  const coach = useCoach();
  const [err, setErr] = useState('');
  const due = useCountdown(g.phase_ends_at) === 0;   // time is up: the «Next» button calls for attention
  const run = async f => { setErr(''); try { await f(); } catch (x) { setErr(errText(x, L)); } };
  // Timers use the server clock, so every phone shows the same seconds whatever its own clock says.
  const go = s => run(async () => {
    const timed = !['lobby', 'ended'].includes(s.phase);
    const start = g.phase === 'lobby' && s.phase !== 'lobby' && !g.joins_locked;   // the game starts: close the door behind the squads
    await api.setGame(g.id, { round: Math.max(1, s.round), phase: s.phase, phase_ends_at: timed ? new Date(serverNow() + mins(s.phase) * 60000).toISOString() : null, ...(start ? { joins_locked: true } : {}) });
    if (start) coach.say(L('Ho chiuso gli ingressi: nessun dispositivo nuovo può entrare con un PIN visto su un tavolo. Per un ritardatario premi «Ingressi chiusi» e riaprili.', 'Joins are now locked: no new device can get in with a PIN seen on a table. For a latecomer press «Joins locked» to reopen them.'), 'ok');
  });
  const lock = v => run(() => api.setJoinsLocked(g.id, v));
  const addMin = m => run(async () => { const base = g.phase_ends_at ? Math.max(serverNow(), new Date(g.phase_ends_at).getTime()) : serverNow(); await api.setGame(g.id, { phase_ends_at: new Date(base + m * 60000).toISOString() }); });
  const players = snap.members.filter(m => m.role === 'player');
  const facs = snap.members.filter(m => m.role === 'facilitator');
  const link = pin => `${location.origin}${location.pathname}#/join?code=${g.code}&pin=${pin}`;

  return (
    <div className="control">
      <div className="ctrl-head">
        <div>
          <h1>{g.name}</h1>
          <p className="hint">{L('Codice partita', 'Game code')} <b className="bigcode">{g.code}</b> {g.n_tables} {L('tavoli', 'tables')}, {g.n_rounds} round, {players.length} {L('giocatori', 'players')}, {facs.length} facilitator</p>
        </div>
        <div className="ctrl-actions">
          <Link className="btn" to={'/screen/' + g.id} target="_blank"><Icon name="screen" /> {L('Proiettore', 'Projector')}</Link>
          <Link className="btn" to={'/cards/' + g.id} target="_blank"><Icon name="qr" /> {L('Join card da stampare', 'Printable join cards')}</Link>
          <button type="button" className="btn" onClick={() => csv(snap)}><Icon name="download" /> CSV</button>
        </div>
      </div>

      <ol className="stepper">
        {steps.map((s, i) => (
          <li key={i} className={(i < cur ? 'done' : i === cur ? 'now' : '') + (s.phase === 'brief' ? ' rstart' : '')} style={{ '--rc': s.round ? ROUNDS[s.round].color : 'var(--ink)' }}>
            <button type="button" title={L('Doppio clic per saltare a questa fase', 'Double-click to jump to this step')} onDoubleClick={() => i !== cur && go(s)}>
              {s.phase === 'brief' && <span className="sp-round"><Icon name={ROUNDS[s.round].icon} /> {lx(ROUNDS[s.round].name)}</span>}
              <span>{L(...PHASE_LABEL[s.phase])}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="ctrl-bar">
        {nx && <motion.button type="button" className={'btn primary big' + (due ? ' due' : '')} onClick={() => go(nx)} whileTap={{ scale: 0.96 }}><Icon name="next" /> {L('Avanti', 'Next')}: {nx.phase === 'brief' ? lx(ROUNDS[nx.round].name) + ', ' : ''}{L(...PHASE_LABEL[nx.phase])}</motion.button>}
        {g.phase_ends_at && <><button type="button" className="btn" onClick={() => addMin(1)}>+1 min</button><button type="button" className="btn" onClick={() => addMin(-1)}>-1 min</button></>}
        <button type="button" className={'btn lockbtn' + (g.joins_locked ? ' on' : '')} aria-pressed={!!g.joins_locked} onClick={() => lock(!g.joins_locked)} title={g.joins_locked ? L('Nessun dispositivo nuovo può entrare. Clic per riaprire.', 'No new device can join. Click to reopen.') : L('Chiunque abbia un PIN può entrare. Clic per chiudere.', 'Anyone with a PIN can join. Click to lock.')}>
          <Icon name={g.joins_locked ? 'lock' : 'unlock'} /> {g.joins_locked ? L('Ingressi chiusi', 'Joins locked') : L('Ingressi aperti', 'Joins open')}</button>
        {['negotiate', 'sign'].includes(g.phase) && ['A', 'B'].map(k => <ConfirmButton key={k} armedLabel={L(`Apri la busta ${k} a tutti i tavoli`, `Open Envelope ${k} at every table`)} onConfirm={() => api.openEnvelope(g.id, null, k)}><Icon name="mail" /> {L('Busta', 'Envelope')} {k} {L('a tutti', 'to all')}</ConfirmButton>)}
      </div>
      {err && <p className="err" role="alert">{err}</p>}

      <nav className="tabs" role="tablist">
        {[['room', 'users', L('Sala', 'Room')], ['score', 'clipboard', L('Valuta i tavoli', 'Score tables')], ['board', 'trophy', L('Classifica', 'Leaderboard')], ['learn', 'bulb', L('Impara', 'Learn')], ['access', 'key', L('Accessi', 'Access')]].map(([id, ic, t]) => <button key={id} type="button" role="tab" data-tab={id} aria-selected={tab === id} onClick={() => setTab(id)}><Icon name={ic} /><span>{t}</span></button>)}
      </nav>

      {tab === 'room' && <RoomHealth snap={snap} onLock={lock} />}
      {tab === 'room' && (
        <div className="room-grid">
          {Array.from({ length: g.n_tables }, (_, k) => k + 1).map(t => {
            const st = tableStatus(snap, t), ts = snap.teams.filter(x => x.table_no === t);
            const n = snap.offers.filter(o => o.table_no === t && o.round === g.round).length;
            return (
              <motion.div layout key={t} className={'room-table ' + st}>
                <div className="rt-h"><b>{L('Tavolo', 'Table')} {t}</b><span className={'pill ' + st}>{L(...STATUS[st])}</span></div>
                {['startup', 'investor'].map(r => { const tm = ts.find(x => x.role === r); const ms = snap.members.filter(m => m.team_id === tm?.id); return <div key={r} className={'rt-team ' + r}><Icon name={r === 'startup' ? 'bulb' : 'briefcase'} /><span>{tm?.name}</span><small>{ms.length ? ms.map(m => <span key={m.user_id} className="who"><Dot m={m} presence={snap.presence?.[m.user_id]} />{m.name}</span>) : L('nessuno ancora', 'nobody yet')}</small></div>; })}
                <div className="rt-foot"><Icon name="doc" /> {n} {L('offerte', 'offers')}<span className="rt-dots">{Array.from({ length: g.n_rounds }, (_, i) => { const r = snap.results.find(x => x.table_no === t && x.round === i + 1); return <i key={i} className={r?.status || ''} style={{ '--rc': ROUNDS[i + 1].color }} />; })}</span></div>
              </motion.div>
            );
          })}
        </div>
      )}
      {tab === 'score' && <Facilitate snap={snap} />}
      {tab === 'board' && <Leaderboard snap={snap} />}
      {tab === 'learn' && <LearnHub round={g.n_rounds} nRounds={g.n_rounds} />}
      {tab === 'access' && (
        <div className="access">
          <div className="panel">
            <h3><Icon name="clipboard" /> {L('Facilitator: un PIN per tavolo', 'Facilitators: one PIN per table')}</h3>
            <p className="hint">{L('Chi entra con il PIN di un tavolo vede, valuta e apre le buste solo di quel tavolo. Per assegnare più tavoli alla stessa persona, dagli più PIN. Il tuo accesso da game master non è raggiungibile con nessun PIN.', 'Whoever joins with a table\'s PIN sees, scores and opens envelopes for that table only. To give one person several tables, give them several PINs. Your game master access cannot be reached with any PIN.')}</p>
            <table className="tbl">
              <thead><tr><th>{L('Tavolo', 'Table')}</th><th>{L('PIN facilitator', 'Facilitator PIN')}</th><th>{L('Assegnato a', 'Assigned to')}</th><th /></tr></thead>
              <tbody>{Array.from({ length: g.n_tables }, (_, k) => k + 1).map(t => (
                <tr key={t}><td>{t}</td><td><b className="pin">{snap.facPins?.[t]}</b></td>
                  <td>{facs.filter(m => (m.tables || []).includes(t)).map(m => <span key={m.user_id} className="member">{m.name || '?'}<ConfirmButton className="kick" title={L('Rimuovi', 'Remove')} armedLabel={L('Rimuovi?', 'Remove?')} onConfirm={() => api.kick(g.id, m.user_id)}><Icon name="x" /></ConfirmButton></span>)}
                    {!facs.some(m => (m.tables || []).includes(t)) && <span className="hint">{L('nessuno: lo valuti tu', 'nobody: you score it')}</span>}</td>
                  <td><button type="button" className="btn ghost" onClick={() => navigator.clipboard?.writeText(link(snap.facPins?.[t]))}>{L('Copia link', 'Copy link')}</button></td></tr>
              ))}</tbody>
            </table>
          </div>
          <table className="tbl">
            <thead><tr><th>{L('Tavolo', 'Table')}</th><th>{L('Squadra', 'Squad')}</th><th>PIN</th><th>{L('Membri', 'Members')}</th><th /></tr></thead>
            <tbody>{[...snap.teams].sort((a, b) => a.table_no - b.table_no || (a.role > b.role ? -1 : 1)).map(t => (
              <tr key={t.id}><td>{t.table_no}</td>
                <td><input className="inline" defaultValue={t.name} onBlur={e => e.target.value.trim() && e.target.value !== t.name && api.renameTeam(t.id, e.target.value.trim())} aria-label={L('Nome squadra', 'Squad name')} /> <small className={'side ' + t.role}>{t.role}</small></td>
                <td><b className="pin">{snap.pins?.[t.id]}</b></td>
                <td>{snap.members.filter(m => m.team_id === t.id).map(m => <span key={m.user_id} className="member"><Dot m={m} presence={snap.presence?.[m.user_id]} />{m.name}<ConfirmButton className="kick" title={L('Rimuovi', 'Remove')} armedLabel={L('Rimuovi?', 'Remove?')} onConfirm={() => api.kick(g.id, m.user_id)}><Icon name="x" /></ConfirmButton></span>)}</td>
                <td><button type="button" className="btn ghost" onClick={() => navigator.clipboard?.writeText(link(snap.pins?.[t.id]))}>{L('Copia link', 'Copy link')}</button></td></tr>
            ))}</tbody>
          </table>
          <ConfirmButton className="btn ghost danger" armedLabel={L('Elimina partita e dati: non si può annullare', 'Delete game and data: this cannot be undone')} onConfirm={async () => { await api.deleteGame(g.id); nav('/admin'); }}><Icon name="x" /> {L('Elimina la partita', 'Delete the game')}</ConfirmButton>
        </div>
      )}
    </div>
  );
}
