import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { api } from '../lib/api/index.js';
import { ROUNDS, SQUAD_NAMES } from '../content/public.js';
import { DEFAULT_MINUTES, PHASE_LABEL, sessionMinutes, fitMinutes, fmtMinutes } from '../lib/phases.js';
import Shell, { Loading } from '../components/Shell.jsx';
import Icon from '../components/Icon.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import { errText } from '../lib/net.js';

const shuffle = a => [...a].sort(() => Math.random() - 0.5);
const pickNames = n => { const s = shuffle(SQUAD_NAMES.startup), i = shuffle(SQUAD_NAMES.investor); return Array.from({ length: n }, (_, k) => [s[k % s.length], i[k % i.length]]).flat(); };

const ERR = (x, L) => {
  const M = {
    BAD_LOGIN: L('Email o password non corretti.', 'Wrong email or password.'),
    EMAIL_TAKEN: L('Esiste già un account con questa email: usa «Accedi».', 'An account with this email already exists: use «Sign in».'),
    WEAK_PASSWORD: L('La password deve avere almeno 8 caratteri.', 'The password needs at least 8 characters.'),
    SIGNUP_LIMIT: L('Troppe registrazioni dalla stessa rete in poco tempo: riprova tra qualche minuto.', 'Too many sign-ups from this network: try again in a few minutes.'),
    SIGNUP_CLOSED: L('Le registrazioni sono chiuse in questo momento.', 'Sign-ups are closed right now.'),
    CONFIRM_EMAIL_ON: L('Account creato, ma il server chiede ancora la conferma via email: chi gestisce la piattaforma deve disattivarla (vedi docs/deploy.md).', 'Account created, but the server still asks for email confirmation: whoever runs the platform must turn it off (see docs/deploy.md).'),
    EMAIL_NOT_CONFIRMED: L('Questo account non è stato confermato. Scrivi a chi gestisce la piattaforma.', 'This account is not confirmed. Write to whoever runs the platform.'),
    NAME_REQUIRED: L('Scrivi il tuo nome.', 'Write your name.'),
  };
  const k = Object.keys(M).find(c => x.message.includes(c));
  return k ? M[k] : errText(x, L);
};

// Sign up or sign in. Accounts are only for people who run games: players never register.
function Auth({ onDone }) {
  const { L } = useLang();
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('bvc-has-account') ? 'in' : 'up'; } catch { return 'up'; } });
  const [f, setF] = useState({ name: '', email: '', password: '', org: '', note: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }));
  const go = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'up') await api.organiserSignUp({ ...f, email: f.email.trim(), name: f.name.trim() });
      else await api.organiserSignIn(f.email.trim(), f.password);
      try { localStorage.setItem('bvc-has-account', '1'); } catch { /* ignore */ }
      onDone();
    } catch (x) { setErr(ERR(x, L)); }
    setBusy(false);
  };
  return (
    <form className="joincard narrow auth" onSubmit={go}>
      <div className="seg auth-seg" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'up'} onClick={() => { setMode('up'); setErr(''); }}>{L('Crea un account', 'Create an account')}</button>
        <button type="button" role="tab" aria-selected={mode === 'in'} onClick={() => { setMode('in'); setErr(''); }}>{L('Accedi', 'Sign in')}</button>
      </div>
      <h2>{mode === 'up' ? L('Organizza le tue partite', 'Run your own games') : L('Bentornato', 'Welcome back')}</h2>
      <p className="hint">{mode === 'up'
        ? L('L\'account serve solo a chi conduce una partita: i giocatori entrano con codice e PIN, senza registrarsi. Gratis, senza pubblicità.', 'The account is only for whoever runs a game: players join with a code and PIN, without signing up. Free, no ads.')
        : L('Con l\'email e la password del tuo account da organizzatore.', 'With your organiser account email and password.')}</p>
      {mode === 'up' && <label className="field"><span>{L('Nome e cognome', 'Full name')}</span><input required autoComplete="name" value={f.name} onChange={set('name')} maxLength={80} /></label>}
      <label className="field"><span>Email</span><input type="email" required autoComplete={mode === 'up' ? 'email' : 'username'} value={f.email} onChange={set('email')} placeholder="nome@scuola.it" /></label>
      <label className="field"><span>Password{mode === 'up' ? L(' (almeno 8 caratteri)', ' (at least 8 characters)') : ''}</span>
        <span className="pw"><input type={show ? 'text' : 'password'} required minLength={mode === 'up' ? 8 : undefined} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} />
          <button type="button" className="linkbtn" onClick={() => setShow(v => !v)} aria-pressed={show}>{show ? L('Nascondi', 'Hide') : L('Mostra', 'Show')}</button></span></label>
      {mode === 'up' && <>
        <label className="field"><span>{L('Scuola, università, acceleratore o azienda (facoltativo)', 'School, university, accelerator or company (optional)')}</span><input value={f.org} onChange={set('org')} maxLength={120} /></label>
        <label className="field"><span>{L('Come userai il gioco? (facoltativo)', 'How will you use the game? (optional)')}</span><textarea rows={2} value={f.note} onChange={set('note')} maxLength={500} placeholder={L('es. una lezione di 2 ore con 30 studenti', 'e.g. a 2-hour class with 30 students')} /></label>
        <p className="hint auth-why"><Icon name="shield" /> {L('Chi conduce una partita vede le soluzioni del caso: per questo ogni nuovo account viene approvato a mano, di solito in giornata. Così nessun giocatore può aprirne uno per sbirciare le risposte.', 'Whoever runs a game sees the case solutions: that is why every new account is approved by hand, usually within the day. This way no player can open one to peek at the answers.')} <Link to="/privacy">{L('Privacy', 'Privacy')}</Link></p>
      </>}
      {err && <p className="err" role="alert"><Icon name="alert" /> {err}</p>}
      <button className="btn primary big" disabled={busy}>{busy ? L('Un attimo…', 'One moment…') : mode === 'up' ? L('Crea l\'account', 'Create the account') : L('Accedi', 'Sign in')}</button>
      {mode === 'in' && api.mode !== 'demo' && <p className="hint">{L('Password dimenticata? Scrivi a chi gestisce la piattaforma: la reimposta dal pannello di Supabase.', 'Forgot your password? Write to whoever runs the platform: they reset it from the Supabase dashboard.')}</p>}
      {api.mode === 'demo' && <button type="button" className="btn ghost" onClick={async () => { await api.organiserSignIn(); onDone(); }}>{L('Entra come game master (demo, senza account)', 'Enter as game master (demo, no account)')}</button>}
    </form>
  );
}

// Waiting for approval (or turned down): what happens next, and a way out.
function Pending({ status, email, onRefresh, onSignOut }) {
  const { L } = useLang();
  const [busy, setBusy] = useState(false);
  const ok = status === 'pending';
  return (
    <div className="joincard narrow pending">
      <motion.span className={'pend-ico ' + status} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Icon name={ok ? 'clock' : 'x'} /></motion.span>
      <h2>{ok ? L('Account creato: in attesa di approvazione', 'Account created: waiting for approval') : status === 'rejected' ? L('Richiesta non approvata', 'Request not approved') : L('Completa la richiesta', 'Complete your request')}</h2>
      {ok ? <>
        <p>{L('Chi gestisce la piattaforma approva a mano ogni organizzatore, perché chi conduce una partita vede le soluzioni del caso. Di solito succede in giornata.', 'Whoever runs the platform approves each organiser by hand, because whoever runs a game sees the case solutions. It usually happens within the day.')}</p>
        <p className="hint">{L('Non devi fare nulla: torna qui con', 'Nothing to do: come back here with')} <b>{email}</b>{L(' e, se è approvata, trovi subito «Nuova partita».', ' and, once approved, «New game» is right there.')}</p>
        <button type="button" className="btn primary" disabled={busy} onClick={async () => { setBusy(true); await onRefresh(); setBusy(false); }}><Icon name="refresh" /> {L('Controlla di nuovo', 'Check again')}</button>
      </> : status === 'rejected'
        ? <p>{L('Puoi comunque provare il gioco nella demo, oppure scrivere a chi gestisce la piattaforma.', 'You can still try the game in the demo, or write to whoever runs the platform.')}</p>
        : <RequestForm onDone={onRefresh} />}
      <div className="row"><button type="button" className="btn ghost" onClick={onSignOut}><Icon name="logout" /> {L('Esci', 'Sign out')}</button><DeleteAccount onDone={onSignOut} /></div>
    </div>
  );
}

// For an account that exists but never asked (for example one created from the Supabase dashboard).
function RequestForm({ onDone }) {
  const { L } = useLang();
  const [f, setF] = useState({ name: '', org: '', note: '' }); const [err, setErr] = useState('');
  return (
    <form className="stack" onSubmit={async e => { e.preventDefault(); try { await api.requestOrganiser(f); onDone(); } catch (x) { setErr(ERR(x, L)); } }}>
      <label className="field"><span>{L('Nome e cognome', 'Full name')}</span><input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} maxLength={80} /></label>
      <label className="field"><span>{L('Organizzazione (facoltativo)', 'Organisation (optional)')}</span><input value={f.org} onChange={e => setF({ ...f, org: e.target.value })} maxLength={120} /></label>
      {err && <p className="err">{err}</p>}
      <button className="btn primary">{L('Chiedi di organizzare partite', 'Ask to run games')}</button>
    </form>
  );
}

function DeleteAccount({ onDone }) {
  const { L } = useLang();
  return <ConfirmButton className="btn ghost danger" armedLabel={L('Elimina account e partite: definitivo', 'Delete account and games: final')} onConfirm={async () => { await api.deleteMyAccount(); try { localStorage.removeItem('bvc-has-account'); } catch { /* ignore */ } onDone(); }}><Icon name="x" /> {L('Elimina il mio account', 'Delete my account')}</ConfirmButton>;
}

function CreateGame({ onCreated }) {
  const { L, lx } = useLang();
  const [name, setName] = useState(L('Bootcamp, sessione 10', 'Bootcamp, session 10'));
  const [tables, setTables] = useState(4);
  const [rounds, setRounds] = useState(3);
  const [min, setMin] = useState(DEFAULT_MINUTES);
  const [names, setNames] = useState(() => pickNames(20));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const perRound = min.brief + min.negotiate + min.sign + min.debrief;
  const total = sessionMinutes(rounds, min);
  const endsAt = new Date(Date.now() + total * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const go = async () => {
    setBusy(true); setErr('');
    try { const id = await api.createGame({ name, tables, rounds, settings: { minutes: min }, names: names.slice(0, tables * 2) }); onCreated(id); }
    catch (x) { setErr(x.message.includes('TOO_MANY_GAMES') ? L('Hai già 5 partite in corso: elimina o chiudi quelle che non ti servono, poi riprova.', 'You already have 5 games running: delete or end the ones you do not need, then try again.') : errText(x, L)); setBusy(false); }
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
        <div className="wz-h"><b>{L('Durata della sessione', 'Session length')}</b><span className="hint">{L('Scegli quanto tempo hai: i minuti di ogni fase si adattano. Puoi ritoccarli uno per uno.', 'Pick how much time you have: each phase adapts. You can fine-tune them one by one.')}</span></div>
        <div className="session-total">
          <motion.b key={total} initial={{ y: -8, opacity: 0.3 }} animate={{ y: 0, opacity: 1 }}>{fmtMinutes(total)}</motion.b>
          <span>{rounds} × {perRound} min{rounds === 3 ? ` + exit ${min.exit} min` : ''}<br />{L(`Se inizi ora, finisci verso le ${endsAt}`, `If you start now, you finish around ${endsAt}`)}</span>
          <div className="seg fit" role="group" aria-label={L('Durata totale', 'Total length')}>
            {[60, 90, 120, 150].map(t => <button key={t} type="button" aria-pressed={Math.abs(total - t) <= 3} onClick={() => setMin(m => fitMinutes(rounds, m, t))}>{fmtMinutes(t)}</button>)}
          </div>
        </div>
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
  const load = async () => {
    const st = await api.organiserStatus();
    const org = st.status === 'approved' && await api.isOrganiser();
    setState({ org, status: st.status, email: st.email, games: org ? await api.myGames() : [] });
  };
  const out = async () => { await api.signOut(); load(); };
  useEffect(() => { load(); }, []);
  if (state.loading) return <Shell><Loading /></Shell>;
  return (
    <Shell help={{ role: state.org ? 'gm-home' : 'gm-account' }} right={state.org && <button type="button" className="btn ghost" onClick={out}><Icon name="logout" /> {L('Esci', 'Sign out')}</button>}>
      {!state.org ? (state.status === 'none' && !state.email ? <Auth onDone={load} /> : <Pending status={state.status} email={state.email} onRefresh={load} onSignOut={out} />) : (
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
                  <span>{g.n_tables} {L('tavoli', 'tables')}, {g.n_rounds} round, <Icon name="clock" /> {fmtMinutes(sessionMinutes(g.n_rounds, g.settings?.minutes))}</span>
                  <span className="code">{g.code}</span>
                  <span className={'phase-chip ' + g.phase}>{L(...PHASE_LABEL[g.phase])}</span>
                  <time>{new Date(g.created_at).toLocaleDateString(lang)}</time>
                </Link>
              </li>
            ))}
            {!state.games.length && !creating && <li className="empty">{L('Nessuna partita ancora. Creane una: ci vogliono 30 secondi.', 'No games yet. Create one: it takes 30 seconds.')}</li>}
          </ul>
          <footer className="account-foot"><span><Icon name="users" /> {state.email}</span><DeleteAccount onDone={out} /></footer>
        </div>
      )}
    </Shell>
  );
}
