import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang, LangSwitch } from '../lib/i18n.jsx';
import { api } from '../lib/api/index.js';
import { net, useNet, health, serverNow, isNetErr } from '../lib/net.js';
import { diagnose, deviceIssues, deviceState, PLAYBOOK } from '../lib/diagnose.js';
import { PHASE_LABEL } from '../lib/phases.js';
import { ConnectionBanner } from '../components/Connection.jsx';
import { IssueRow, FixDialog, Dot } from '../components/Health.jsx';
import { Overlay } from '../components/Overlays.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import Icon from '../components/Icon.jsx';
import { Brand } from '../components/Shell.jsx';

// /easteregg: the owner's console. Not linked anywhere; the password is checked by the database.
export default function Ops() {
  const [state, setState] = useState('checking');
  useEffect(() => { api.opsCheck().then(ok => setState(ok ? 'open' : 'locked')).catch(() => setState('locked')); }, []);
  return (
    <div className="ops">
      <header className="ops-top"><Brand /><span className="ops-tag"><Icon name="egg" /> {state === 'open' ? 'Ops console' : ''}</span><LangSwitch /></header>
      <ConnectionBanner />
      {state === 'checking' && <div className="loading"><span className="spark" /></div>}
      {state === 'locked' && <Gate onOpen={() => setState('open')} />}
      {state === 'open' && <Console onExit={() => setState('locked')} />}
    </div>
  );
}

function Gate({ onOpen }) {
  const { L } = useLang();
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (await api.opsUnlock(pw)) { onOpen(); return; }
      setErr(L('Password sbagliata. Dopo 5 errori la console si blocca per 15 minuti.', 'Wrong password. After 5 errors the console locks for 15 minutes.')); setShake(s => s + 1); setPw('');
    } catch (x) {
      setErr(x.message === 'OPS_LOCKED' ? L('Troppi tentativi: la console è bloccata per 15 minuti.', 'Too many attempts: the console is locked for 15 minutes.')
        : x.message === 'OPS_NOT_SET' ? L('Password non ancora impostata. Nel SQL editor di Supabase esegui: select ops_set_password(\'…\');', 'No password set yet. In the Supabase SQL editor run: select ops_set_password(\'…\');')
          : isNetErr(x) ? L('Server non raggiungibile. Se è il piano gratuito, il progetto potrebbe essere in pausa: riattivalo dalla dashboard di Supabase.', 'Server unreachable. On the free plan the project may be paused: restore it from the Supabase dashboard.') : x.message);
    }
    setBusy(false);
  };
  return (
    <motion.form className="ops-gate" onSubmit={submit} key={shake} animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
      <motion.span className="egg" initial={{ rotate: -8, scale: 0.8 }} animate={{ rotate: [-8, 8, -4, 0], scale: 1 }} transition={{ duration: 0.9 }}><Icon name="egg" /></motion.span>
      <h1>{L('Hai trovato l\'uovo.', 'You found the egg.')}</h1>
      <p className="hint">{L('Qui dentro vedi tutto: partite, squadre, dispositivi, chi ha problemi e come risolverli.', 'In here you see everything: games, squads, devices, who has problems and how to fix them.')}</p>
      <label className="field"><span>{L('Password della console', 'Console password')}</span>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" autoFocus required /></label>
      {err && <p className="err" role="alert"><Icon name="alert" /> {err}</p>}
      <button className="btn sign big" disabled={busy || !pw}><Icon name="unlock" /> {busy ? L('Controllo…', 'Checking…') : L('Apri la console', 'Open the console')}</button>
    </motion.form>
  );
}

const FIX_ACTIONS = ['lock_joins', 'unlock_joins', 'reset_attempts', 'purge'];

function Console({ onExit }) {
  const { L, lx } = useLang();
  const [ops, setOps] = useState(null); const [err, setErr] = useState('');
  const [srv, setSrv] = useState({ lat: null, at: 0, down: 0 });
  const [tab, setTab] = useState('issues');
  const [fix, setFix] = useState(null); const [guide, setGuide] = useState(null); const [device, setDevice] = useState(null);
  const [toast, setToast] = useState('');
  const say = t => { setToast(t); setTimeout(() => setToast(''), 2600); };
  const load = useCallback(async () => {
    const t0 = Date.now();
    try {
      const o = await api.opsSnapshot(); const t1 = Date.now();
      net.clock(o.now, t0, t1); setOps(o); setErr(''); setSrv({ lat: t1 - t0, at: t1, down: 0 });
    } catch (x) {
      if (x.message.includes('OPS_ONLY')) { onExit(); return; }
      setSrv(s => ({ ...s, down: s.down + 1 })); setErr(x.message);
    }
  }, [onExit]);
  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 4000);
    return () => clearInterval(t);
  }, [load]);
  const act = async (kind, gameId, arg) => { await api.opsAction(kind, gameId, arg); await load(); };
  const now = serverNow();
  const issues = useMemo(() => (ops ? diagnose(ops, now) : []), [ops]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ops) return <div className="ops-body">{err ? <ServerDown err={err} onRetry={load} /> : <div className="loading"><span className="spark" /></div>}</div>;

  const live = ops.games.filter(x => x.game.phase !== 'ended');
  const devices = live.flatMap(x => x.members);
  const online = devices.filter(m => deviceState(m, now) === 'online').length;
  const count = s => issues.filter(x => x.sev === s).length;
  const tabs = [['issues', 'alert', L('Problemi', 'Problems'), issues.filter(x => x.sev !== 'info').length], ['games', 'users', L('Partite', 'Games'), live.length], ['sim', 'bug', L('Simula', 'Simulate')], ['guide', 'book', L('Guida ai problemi', 'Troubleshooting')], ['prep', 'shield', L('Prima della sessione', 'Before the session')]];

  return (
    <div className="ops-body">
      <div className="ops-stats">
        <Stat icon="pulse" tone={srv.down ? 'bad' : srv.lat > 1500 ? 'warn' : 'good'} k={L('Server', 'Server')} v={srv.down ? L('non risponde', 'not answering') : srv.lat + ' ms'} sub={ops.demo ? L('demo nel browser', 'browser demo') : L('aggiornato ogni 4 s', 'refreshed every 4 s')} />
        <Stat icon="play" k={L('Partite in corso', 'Games running')} v={live.length} sub={`${ops.games.length} ${L('negli ultimi 30 giorni', 'in the last 30 days')}`} />
        <Stat icon="wifi" tone={online < devices.length ? 'warn' : 'good'} k={L('Dispositivi collegati', 'Devices connected')} v={`${online}/${devices.length}`} sub={ops.anonUsers != null ? `${ops.anonUsers} ${L('account anonimi', 'anonymous accounts')}` : ''} />
        <Stat icon="alert" tone={count('critical') ? 'bad' : count('warn') ? 'warn' : 'good'} k={L('Problemi aperti', 'Open problems')} v={issues.length ? `${count('critical')} · ${count('warn')} · ${count('info')}` : '0'} sub={L('critici · da sistemare · da sapere', 'critical · to fix · to know')} />
        <button type="button" className="btn ghost ops-exit" onClick={async () => { await api.opsAction('logout'); onExit(); }}><Icon name="logout" /> {L('Esci', 'Sign out')}</button>
      </div>
      {srv.down > 0 && <ServerDown err={err} onRetry={load} compact />}

      <nav className="tabs ops-tabs" role="tablist">
        {tabs.map(([id, ic, t, n]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}><Icon name={ic} /><span>{t}</span>{n ? <em className={'count' + (id === 'issues' ? '' : ' n')}>{n}</em> : null}</button>)}
      </nav>

      {tab === 'issues' && (issues.length
        ? <ul className="issues big"><AnimatePresence>{issues.map(x => <IssueRow key={x.id} x={x} showGame onOpen={setFix} />)}</AnimatePresence></ul>
        : <div className="ops-calm"><span className="calm-ring" /><b>{L('Tutto tranquillo.', 'All quiet.')}</b><p className="hint">{L('Nessun problema rilevato. Vuoi vedere come appaiono? Vai su «Simula».', 'No problems detected. Want to see what they look like? Go to «Simulate».')}</p></div>)}

      {tab === 'games' && <div className="ops-games">{ops.games.length ? ops.games.map(x => <GameCard key={x.game.id} x={x} now={now} act={act} onDevice={setDevice} say={say} />) : <p className="empty">{L('Nessuna partita negli ultimi 30 giorni.', 'No games in the last 30 days.')}</p>}</div>}

      {tab === 'sim' && <Simulator ops={ops} reload={load} say={say} />}

      {tab === 'guide' && (
        <div className="guide-grid">{Object.entries(PLAYBOOK).map(([k, p]) => (
          <button key={k} type="button" className="guide-card" onClick={() => setGuide(k)}><b>{L(...p.t)}</b><small>{L(...p.why)}</small></button>))}
        </div>)}

      {tab === 'prep' && <Prep ops={ops} srv={srv} act={act} say={say} />}

      <FixDialog issue={fix} onClose={() => setFix(null)} actions={FIX_ACTIONS} onAction={(a, x) => act(a, x?.game?.id)} />
      <FixDialog kind={guide} onClose={() => setGuide(null)} />
      <DeviceDialog d={device} now={now} onClose={() => setDevice(null)} onKick={async () => { await act('kick', device.game_id, { user_id: device.user_id }); setDevice(null); say(L('Dispositivo rimosso dalla partita.', 'Device removed from the game.')); }} onFix={k => { setDevice(null); setGuide(k); }} />
      <AnimatePresence>{toast && <motion.div className="ops-toast" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}><Icon name="check" /> {toast}</motion.div>}</AnimatePresence>
    </div>
  );
}

function Stat({ icon, k, v, sub, tone = '' }) {
  return <div className={'stat ' + tone}><Icon name={icon} /><span>{k}</span><motion.b key={String(v)} initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }}>{v}</motion.b>{sub && <small>{sub}</small>}</div>;
}

function ServerDown({ err, onRetry, compact }) {
  const { L, lx } = useLang();
  const p = PLAYBOOK.paused;
  return (
    <div className={'server-down' + (compact ? ' compact' : '')}>
      <Icon name="wifiOff" />
      <div><b>{L('Il server non risponde', 'The server is not answering')}</b>
        <p>{isNetErr({ message: err }) && health() !== 'offline' ? L(...p.why) : health() === 'offline' ? L('Sei tu a essere offline: controlla la rete di questo computer.', 'You are the one offline: check this computer\'s network.') : err}</p>
        {!compact && <ol>{p.steps.map((s, i) => <li key={i}>{L(...s)}</li>)}</ol>}</div>
      <button type="button" className="btn small" onClick={onRetry}><Icon name="refresh" /> {L('Riprova', 'Retry')}</button>
    </div>
  );
}

function GameCard({ x, now, act, onDevice, say }) {
  const { L } = useLang();
  const g = x.game;
  const left = g.phase_ends_at ? Math.round((new Date(g.phase_ends_at).getTime() - now) / 1000) : null;
  const tables = Array.from({ length: g.n_tables }, (_, k) => k + 1);
  const gm = x.members.find(m => m.role === 'admin');
  return (
    <motion.section layout className={'ops-game' + (g.phase === 'ended' ? ' ended' : '')}>
      <div className="og-h">
        <div><h2>{g.name}</h2>
          <p className="hint"><b className="bigcode">{g.code}</b> · {L(...PHASE_LABEL[g.phase])}{!['lobby', 'ended'].includes(g.phase) ? ` · round ${g.round}/${g.n_rounds}` : ''}{left != null ? ` · ${left >= 0 ? Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : L('scaduto da ', 'overdue by ') + Math.round(-left / 60) + ' min'}` : ''} · {x.offers} {L('offerte', 'offers')}</p></div>
        <div className="row">
          {gm && <button type="button" className="chip dev" onClick={() => onDevice({ ...gm, game: g })}><Dot m={gm} /> Game master</button>}
          <button type="button" className={'btn lockbtn' + (g.joins_locked ? ' on' : '')} onClick={async () => { await act(g.joins_locked ? 'unlock_joins' : 'lock_joins', g.id); say(g.joins_locked ? L('Ingressi riaperti.', 'Joins reopened.') : L('Ingressi chiusi.', 'Joins locked.')); }}><Icon name={g.joins_locked ? 'lock' : 'unlock'} /> {g.joins_locked ? L('Ingressi chiusi', 'Joins locked') : L('Ingressi aperti', 'Joins open')}</button>
          {x.fails10 > 0 && <button type="button" className="btn" onClick={async () => { await act('reset_attempts', g.id); say(L('Tentativi di PIN azzerati.', 'PIN attempts reset.')); }}><Icon name="key" /> {L('Sblocca PIN', 'Reset PINs')} ({x.fails10})</button>}
          <ConfirmButton className="btn ghost danger" aria-label={L('Elimina la partita', 'Delete the game')} title={L('Elimina la partita', 'Delete the game')} armedLabel={L('Elimina tutto: definitivo', 'Delete everything: final')} onConfirm={async () => { await act('delete_game', g.id); say(L('Partita eliminata.', 'Game deleted.')); }}><Icon name="x" /></ConfirmButton>
        </div>
      </div>
      <div className="og-tables">
        {tables.map(t => {
          const facs = x.members.filter(m => m.role === 'facilitator' && (m.tables || []).includes(t));
          const res = (x.results || []).find(r => r.table_no === t && r.round === g.round);
          return (
            <div key={t} className="og-table">
              <div className="ogt-h"><b>{L('Tavolo', 'Table')} {t}</b>{res && <span className={'pill ' + res.status}>{res.status === 'scored' ? L('valutato', 'scored') : L('firmato', 'signed')}</span>}</div>
              {x.teams.filter(s => s.table_no === t).map(s => (
                <div key={s.id} className={'ogt-squad ' + s.role}>
                  <span className="ogt-name"><Icon name={s.role === 'startup' ? 'bulb' : 'briefcase'} />{s.name}<code>{s.pin}</code></span>
                  <span className="chips">{x.members.filter(m => m.team_id === s.id).map(m => <DeviceChip key={m.user_id} m={m} now={now} onClick={() => onDevice({ ...m, game: g })} />)}
                    {!x.members.some(m => m.team_id === s.id) && <small className="hint">{L('nessuno', 'nobody')}</small>}</span>
                </div>))}
              <div className="ogt-fac"><Icon name="clipboard" /> <code>{x.facPins?.[t]}</code> {facs.map(m => <DeviceChip key={m.user_id} m={m} now={now} onClick={() => onDevice({ ...m, game: g })} />)}{!facs.length && <small className="hint">{L('nessun facilitator', 'no facilitator')}</small>}</div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function DeviceChip({ m, now, onClick }) {
  const n = deviceIssues(m, now).filter(k => k !== 'hidden').length;
  return <button type="button" className={'chip dev ' + (n ? 'has' : '')} onClick={onClick}><Dot m={m} />{m.name || '?'}{m.client?.dev === 'desktop' && <Icon name="screen" />}{n ? <em>{n}</em> : null}</button>;
}

function DeviceDialog({ d, now, onClose, onKick, onFix }) {
  const { L, lx } = useLang();
  const c = d?.client || {};
  const ago = d?.last_seen ? Math.round((now - new Date(d.last_seen).getTime()) / 1000) : null;
  const st = d ? deviceState(d, now) : null;
  const rows = d ? [
    [L('Stato', 'State'), { online: L('collegato', 'connected'), offline: L('offline', 'offline'), gone: L('uscito', 'left'), unknown: L('nessun segnale ricevuto', 'no signal received') }[st]],
    [L('Ultimo segnale', 'Last signal'), ago == null ? '—' : ago < 120 ? ago + ' s' : Math.round(ago / 60) + ' min'],
    [L('Rete del dispositivo', 'Device network'), c.on === false ? L('offline', 'offline') : c.on ? 'online' : '—'],
    [L('Tempo reale', 'Live updates'), c.rt || '—'],
    [L('Latenza', 'Latency'), c.lat != null ? c.lat + ' ms' : '—'],
    [L('Richieste fallite di fila', 'Failed requests in a row'), c.fails ?? '—'],
    [L('Orologio rispetto al server', 'Clock vs server'), c.skew != null ? Math.round(c.skew / 1000) + ' s' : '—'],
    [L('Errori nell\'app', 'App errors'), c.errs ? `${c.errs} · ${c.err}` : '0'],
    [L('Dispositivo', 'Device'), [c.dev, c.br].filter(Boolean).join(' · ') || '—'],
    [L('Schermo sempre acceso', 'Screen kept on'), c.wl == null ? '—' : c.wl ? L('sì', 'yes') : L('no: il telefono può andare in standby', 'no: the phone may go to sleep')],
    [L('Pagina in primo piano', 'Page in front'), c.vis == null ? '—' : c.vis ? L('sì', 'yes') : L('no', 'no')],
    [L('Versione app', 'App version'), c.v || '—'],
  ] : [];
  const probs = d ? deviceIssues(d, now) : [];
  return (
    <Overlay open={!!d} onClose={onClose} label={d?.name || ''}>
      {d && <div className="fix device">
        <h2><Dot m={d} /> {d.name || '?'}</h2>
        <p className="hint">{d.game?.name} · {d.role === 'admin' ? 'Game master' : d.role === 'facilitator' ? 'Facilitator, ' + L('tavoli', 'tables') + ' ' + (d.tables || []).join(', ') : L('Giocatore', 'Player')}</p>
        <dl className="kv">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {probs.length > 0 && <div className="row">{probs.map(k => <button key={k} type="button" className="btn small" onClick={() => onFix(k)}><Icon name="alert" /> {L(...PLAYBOOK[k].t)}</button>)}</div>}
        {d.role !== 'admin' && <ConfirmButton className="btn ghost danger" armedLabel={L('Rimuovere dalla partita?', 'Remove from the game?')} onConfirm={onKick}><Icon name="x" /> {L('Rimuovi questo dispositivo', 'Remove this device')}</ConfirmButton>}
      </div>}
    </Overlay>
  );
}

const LOCAL_SIMS = [['offline', 'wifiOff', ['Offline', 'Offline']], ['slow', 'clock', ['Rete lenta', 'Slow network']], ['realtime', 'pulse', ['Tempo reale fermo', 'Live updates down']], ['skew', 'clock', ['Orologio sbagliato', 'Wrong clock']]];
const DATA_SIMS = [['offline', ['Un telefono si spegne', 'A phone dies']], ['realtime', ['WebSocket bloccati', 'WebSockets blocked']], ['failing', ['Richieste che falliscono', 'Failing requests']], ['slow', ['Wi-Fi saturo', 'Saturated Wi-Fi']], ['skew', ['Orologio del telefono avanti', 'Phone clock ahead']], ['error', ['Errore JavaScript', 'JavaScript error']], ['gm_offline', ['Il game master sparisce', 'The game master vanishes']], ['pins', ['Qualcuno prova PIN a caso', 'Someone guesses PINs']], ['overdue', ['Fase dimenticata', 'Forgotten phase']]];

function Simulator({ ops, reload, say }) {
  const { L } = useLang();
  const s = useNet();
  const latest = ops.games[0]?.game;
  const run = async k => {
    try { const r = await api.opsSimulate(k); await reload(); say(k === 'clear' ? L('Simulazioni rimosse.', 'Simulations removed.') : L(`Problema inserito in «${r.game}». Guarda «Problemi».`, `Problem added to «${r.game}». Check «Problems».`)); }
    catch (x) { say(x.message === 'NO_GAME' ? L('Crea prima una partita demo da /admin.', 'Create a demo game from /admin first.') : x.message === 'NEEDS_ROUND' ? L('Avvia un round: in sala d\'attesa non c\'è timer.', 'Start a round: the lobby has no timer.') : x.message); }
  };
  return (
    <div className="sim">
      <div className="panel">
        <h3><Icon name="screen" /> {L('Su questo dispositivo', 'On this device')}</h3>
        <p className="hint">{L('Rompe la connessione solo in questa scheda. Poi apri la partita qui stesso (o «Guarda come» nella demo) per vedere esattamente cosa vede un giocatore: barra rossa, pulsanti bloccati, ripresa automatica.', 'Breaks the connection in this tab only. Then open the game in this same tab (or «View as» in the demo) to see exactly what a player sees: red bar, blocked buttons, automatic recovery.')}</p>
        <div className="sim-row">
          {LOCAL_SIMS.map(([k, ic, t]) => <button key={k} type="button" className={'btn' + (s.sim === k ? ' sign' : '')} aria-pressed={s.sim === k} onClick={() => net.simulate(s.sim === k ? null : k)}><Icon name={ic} /> {L(...t)}</button>)}
          {s.sim && <button type="button" className="btn ghost" onClick={() => net.simulate(null)}>{L('Torna normale', 'Back to normal')}</button>}
          {latest && <Link className="btn ghost" to={'/g/' + latest.id}>{L('Apri', 'Open')} «{latest.name}»</Link>}
        </div>
      </div>
      <div className="panel">
        <h3><Icon name="users" /> {L('Nella partita', 'In the game')} {latest ? `«${latest.name}»` : ''}</h3>
        {api.opsSimulate ? <>
          <p className="hint">{L('Aggiunge dispositivi finti con un problema realistico (durano 10 minuti). Li vedi qui, nella «Salute della sala» del game master e nella guida su come risolverli.', 'Adds fake devices with a realistic problem (they last 10 minutes). You see them here, in the game master\'s «Room health» and in the fix guide.')}</p>
          <div className="sim-row">{DATA_SIMS.map(([k, t]) => <button key={k} type="button" className="btn" onClick={() => run(k)} disabled={!latest}><Icon name="bug" /> {L(...t)}</button>)}
            <button type="button" className="btn ghost" onClick={() => run('clear')} disabled={!latest}><Icon name="x" /> {L('Togli le simulazioni', 'Remove simulations')}</button></div>
        </> : <p className="hint">{L('Con il server vero la console non scrive dati finti nelle partite. Per provare i guasti nei dati usa la demo (npm run build:demo); qui usa i guasti «su questo dispositivo».', 'With the real server the console never writes fake data into games. To try data failures use the demo (npm run build:demo); here use the «on this device» failures.')}</p>}
      </div>
    </div>
  );
}

const MANUAL = [
  ['signin', ['Accessi anonimi: limite alzato', 'Anonymous sign-ins: limit raised'], ['Supabase → Authentication → Rate Limits: almeno 300 all\'ora. Con il valore predefinito (30 all\'ora per IP) dal 31° giocatore sullo stesso Wi-Fi nessuno entra.', 'Supabase → Authentication → Rate Limits: at least 300 per hour. With the default (30 per hour per IP) nobody gets in after the 31st player on the same Wi-Fi.']],
  ['awake', ['Progetto sveglio la sera prima', 'Project awake the evening before'], ['Sul piano gratuito Supabase mette in pausa dopo 7 giorni senza attività: apri questa console la sera prima. Se si carica, è sveglio.', 'On the free plan Supabase pauses after 7 days idle: open this console the evening before. If it loads, it is awake.']],
  ['region', ['Dati in Europa', 'Data in Europe'], ['Il progetto Supabase deve essere in una regione UE (es. Frankfurt). Si sceglie solo alla creazione.', 'The Supabase project must be in an EU region (e.g. Frankfurt). It can only be chosen at creation.']],
  ['phone', ['Prova da un telefono con i dati mobili', 'Test from a phone on mobile data'], ['Entra in una partita di prova da fuori dalla rete della sala: è la prova che il sito è raggiungibile da tutti.', 'Join a test game from outside the room network: it proves the site is reachable by everyone.']],
  ['wifi', ['Wi-Fi della sala', 'Room Wi-Fi'], ['Chiedi se la rete blocca i WebSocket (reti aziendali, scuole). Se sì, l\'app va lo stesso ma più lenta: suggerisci i dati mobili.', 'Ask whether the network blocks WebSockets (corporate, schools). If so the app still works, more slowly: suggest mobile data.']],
  ['twofa', ['Due fattori sugli account', 'Two-factor on the accounts'], ['GitHub, Supabase e hosting con autenticazione a due fattori.', 'GitHub, Supabase and hosting with two-factor authentication.']],
  ['cards', ['Join card stampate', 'Join cards printed'], ['Una per squadra e una per facilitator, dalla sala di controllo.', 'One per squad and one per facilitator, from the control room.']],
];

function Prep({ ops, srv, act, say }) {
  const { L } = useLang();
  const [done, setDone] = useState(() => { try { return JSON.parse(localStorage.getItem('bvc-ops-prep')) || {}; } catch { return {}; } });
  const tick = k => { const n = { ...done, [k]: !done[k] }; setDone(n); try { localStorage.setItem('bvc-ops-prep', JSON.stringify(n)); } catch { /* ignore */ } };
  const auto = [
    [!srv.down, L('Server raggiungibile', 'Server reachable'), srv.lat != null ? srv.lat + ' ms' : ''],
    [true, L('Password della console impostata', 'Console password set'), L('sei dentro', 'you are in')],
    [ops.cron, L('Cancellazione automatica ogni notte', 'Automatic deletion every night'), ops.cron ? L('pg_cron attivo: partite ferme da 7 giorni cancellate alle 03:17', 'pg_cron on: games idle for 7 days deleted at 03:17') : L('non programmata: vedi la guida', 'not scheduled: see the guide')],
    [!ops.oldGames, L('Nessun dato scaduto', 'No expired data'), ops.oldGames ? `${ops.oldGames} ${L('partite da cancellare', 'games to delete')}` : ''],
    [ops.dbBytes < 400 * 1024 * 1024, L('Spazio nel database', 'Database space'), Math.round(ops.dbBytes / 1024 / 1024 * 10) / 10 + ' MB / 500 MB'],
  ];
  return (
    <div className="prep">
      <div className="panel"><h3><Icon name="pulse" /> {L('Controlli automatici', 'Automatic checks')}</h3>
        <ul className="checks">{auto.map(([ok, t, sub]) => <li key={t} className={ok ? 'yes' : 'no'}><Icon name={ok ? 'check' : 'alert'} /><b>{t}</b><small>{sub}</small></li>)}</ul>
        {ops.oldGames > 0 && <button type="button" className="btn" onClick={async () => { const r = await act('purge'); say(L('Dati vecchi cancellati.', 'Old data deleted.')); return r; }}><Icon name="x" /> {L('Cancella ora i dati vecchi', 'Delete old data now')}</button>}
      </div>
      <div className="panel"><h3><Icon name="clipboard" /> {L('Da controllare tu', 'For you to check')}</h3>
        <ul className="checks manual">{MANUAL.map(([k, t, d]) => <li key={k} className={done[k] ? 'yes' : ''}><label><input type="checkbox" checked={!!done[k]} onChange={() => tick(k)} /><b>{L(...t)}</b></label><small>{L(...d)}</small></li>)}</ul>
      </div>
    </div>
  );
}
