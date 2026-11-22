import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { api } from '../lib/api/index.js';
import { ROUNDS, SQUAD_NAMES } from '../content/public.js';
import { DEFAULT_MINUTES, PHASE_LABEL } from '../lib/phases.js';
import Shell, { Loading } from '../components/Shell.jsx';
import Icon from '../components/Icon.jsx';

const shuffle = a => [...a].sort(() => Math.random() - 0.5);
const pickNames = n => { const s = shuffle(SQUAD_NAMES.startup), i = shuffle(SQUAD_NAMES.investor); return Array.from({ length: n }, (_, k) => [s[k % s.length], i[k % i.length]]).flat(); };

function Login({ onDone }) {
  const { L } = useLang();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api.organiserSignIn(email.trim(), pw); onDone(); }
    catch (x) { setErr(x.message === 'BAD_LOGIN' ? L('Email o password non corretti.', 'Wrong email or password.') : x.message === 'NOT_ORGANISER' ? L('Questo account non è abilitato come organizzatore. Chiedi a chi gestisce la piattaforma di aggiungerlo.', 'This account is not enabled as an organiser. Ask whoever runs the platform to add it.') : x.message); }
    setBusy(false);
  };
  return (
    <form className="joincard narrow" onSubmit={go}>
      <h2>{L('Area organizzatori', 'Organiser area')}</h2>
      {api.mode === 'demo'
        ? <p className="hint">{L('In modalità demo entri subito come game master.', 'In demo mode you enter as game master right away.')}</p>
        : <>
          <p className="hint">{L('Riservata a chi organizza le sessioni. I giocatori e i facilitator entrano dalla pagina iniziale con codice e PIN.', 'For session organisers only. Players and facilitators join from the home page with code and PIN.')}</p>
          <label className="field"><span>Email</span><input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@babyvc.it" /></label>
          <label className="field"><span>Password</span><input type="password" required autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} /></label>
        </>}
      {err && <p className="err" role="alert"><Icon name="alert" /> {err}</p>}
      <button className="btn primary big" disabled={busy}>{api.mode === 'demo' ? L('Entra come game master', 'Enter as game master') : busy ? L('Entro…', 'Signing in…') : L('Entra', 'Sign in')}</button>
      {api.mode !== 'demo' && <p className="hint">{L('Password dimenticata? Si reimposta dal pannello Supabase (Authentication → Users).', 'Forgot the password? Reset it from the Supabase dashboard (Authentication → Users).')}</p>}
    </form>
  );
}

function CreateGame({ onCreated }) {
  const { L, lx } = useLang();
  const [name, setName] = useState(L('Bootcamp, sessione 10', 'Bootcamp, session 10'));
  const [tables, setTables] = useState(4);
  const [rounds, setRounds] = useState(3);
  const [min, setMin] = useState(DEFAULT_MINUTES);
  const [names, setNames] = useState(() => pickNames(20));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const total = min.brief + min.negotiate + min.sign + min.debrief;
  const go = async () => {
    setBusy(true); setErr('');
    try { const id = await api.createGame({ name, tables, rounds, settings: { minutes: min }, names: names.slice(0, tables * 2) }); onCreated(id); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <div className="wizard">
      <label className="field"><span>{L('Nome della partita', 'Game name')}</span><input value={name} onChange={e => setName(e.target.value)} maxLength={60} /></label>

      <div className="wz-block">
        <div className="wz-h"><b>{L('Quanti round?', 'How many rounds?')}</b><span className="hint">{L('Si parte sempre dal pre-seed: ogni round eredita il precedente.', 'Always starts at the pre-seed: each round inherits the previous one.')}</span></div>
        <div className="rounds-pick">
          {[1, 2, 3].map(n => (
            <button key={n} type="button" aria-pressed={rounds === n} onClick={() => setRounds(n)} className="round-opt">
              <span className="ro-path">{[1, 2, 3].map(r => <i key={r} className={r <= n ? 'on' : ''} style={{ '--rc': ROUNDS[r].color }}><Icon name={ROUNDS[r].icon} /></i>)}</span>
              <b>{n} {n === 1 ? 'round' : L('round', 'rounds')}</b>
              <small>{[1, 2, 3].slice(0, n).map(r => lx(ROUNDS[r].name)).join(' + ')}{n === 3 ? ' + exit' : ''}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="wz-block">
        <div className="wz-h"><b>{L('Quanti tavoli?', 'How many tables?')} <output>{tables}</output></b><span className="hint">{L(`${tables * 2} squadre: a ogni tavolo una startup e un gruppo di investitori.`, `${tables * 2} squads: each table has one startup and one investor squad.`)}</span></div>
        <input type="range" min="1" max="20" value={tables} aria-label={L('Numero di tavoli', 'Number of tables')} onChange={e => setTables(+e.target.value)} style={{ '--p': ((tables - 1) / 19) * 100 + '%' }} />
        <div className="tables-viz">
          <AnimatePresence initial={false}>
            {Array.from({ length: tables }, (_, k) => (
              <motion.div key={k} className="tv" layout initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                <input aria-label={L('Startup tavolo ', 'Startup table ') + (k + 1)} className="tv-s" value={names[2 * k]} onChange={e => setNames(n => Object.assign([...n], { [2 * k]: e.target.value }))} maxLength={32} />
                <span className="tv-n">{k + 1}</span>
                <input aria-label={L('Investitori tavolo ', 'Investors table ') + (k + 1)} className="tv-i" value={names[2 * k + 1]} onChange={e => setNames(n => Object.assign([...n], { [2 * k + 1]: e.target.value }))} maxLength={32} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <button type="button" className="btn ghost" onClick={() => setNames(pickNames(20))}><Icon name="shuffle" /> {L('Altri nomi', 'Shuffle names')}</button>
      </div>

      <div className="wz-block">
        <div className="wz-h"><b>{L('Tempi per round', 'Timing per round')}</b><span className="hint">{L(`${total} minuti a round, circa ${Math.round((total * rounds + (rounds === 3 ? min.exit : 0)) / 5) * 5} in tutto.`, `${total} minutes per round, about ${Math.round((total * rounds + (rounds === 3 ? min.exit : 0)) / 5) * 5} in total.`)}</span></div>
        <div className="mins">
          {['brief', 'negotiate', 'sign', 'debrief', ...(rounds === 3 ? ['exit'] : [])].map(p => (
            <label key={p} className="field"><span>{L(...PHASE_LABEL[p])}</span><input type="number" min="1" max="60" value={min[p]} onChange={e => setMin(m => ({ ...m, [p]: Math.max(1, +e.target.value || 1) }))} /></label>
          ))}
        </div>
      </div>
      <p className="hint wz-privacy"><Icon name="shield" /> {L('Nessun account per i giocatori, nessun tracciamento. La partita e tutti i suoi dati si cancellano da soli dopo 7 giorni senza attività; puoi eliminarla prima da «Accessi».', 'No player accounts, no tracking. The game and all its data delete themselves after 7 days without activity; you can delete it sooner from «Access».')}</p>
      {err && <p className="err">{err}</p>}
      <button type="button" className="btn primary big" disabled={busy || !name.trim()} onClick={go}><Icon name="play" /> {busy ? L('Creo…', 'Creating…') : L('Crea la partita', 'Create the game')}</button>
    </div>
  );
}

export default function Admin() {
  const { L, lang } = useLang();
  const nav = useNavigate();
  const [state, setState] = useState({ loading: true });
  const [creating, setCreating] = useState(false);
  const load = async () => { const org = await api.isOrganiser(); setState({ org, games: org ? await api.myGames() : [] }); };
  useEffect(() => { load(); }, []);
  if (state.loading) return <Shell><Loading /></Shell>;
  return (
    <Shell help={state.org ? { role: 'gm-home' } : undefined} right={state.org && <button type="button" className="btn ghost" onClick={async () => { await api.signOut(); load(); }}><Icon name="logout" /> {L('Esci', 'Sign out')}</button>}>
      {!state.org ? <Login onDone={load} /> : (
        <div className="admin">
          <div className="admin-head">
            <h1>{L('Le tue partite', 'Your games')}</h1>
            {!creating && <button type="button" className="btn primary" onClick={() => setCreating(true)}><Icon name="plus" /> {L('Nuova partita', 'New game')}</button>}
          </div>
          <AnimatePresence>{creating && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><CreateGame onCreated={id => nav('/g/' + id)} /></motion.div>}</AnimatePresence>
          <ul className="gamelist">
            {state.games.map(g => (
              <li key={g.id}>
                <Link to={'/g/' + g.id}>
                  <b>{g.name}</b>
                  <span>{g.n_tables} {L('tavoli', 'tables')}, {g.n_rounds} round</span>
                  <span className="code">{g.code}</span>
                  <span className={'phase-chip ' + g.phase}>{L(...PHASE_LABEL[g.phase])}</span>
                  <time>{new Date(g.created_at).toLocaleDateString(lang)}</time>
                </Link>
              </li>
            ))}
            {!state.games.length && !creating && <li className="empty">{L('Nessuna partita ancora. Creane una: ci vogliono 30 secondi.', 'No games yet. Create one: it takes 30 seconds.')}</li>}
          </ul>
        </div>
      )}
    </Shell>
  );
}
