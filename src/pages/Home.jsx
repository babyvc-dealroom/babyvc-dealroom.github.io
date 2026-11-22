import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { api } from '../lib/api/index.js';
import { errText, isNetErr } from '../lib/net.js';
import { checkLastGame, forgetGame, resumeGame } from '../lib/resume.js';
import { PHASE_LABEL } from '../lib/phases.js';
import { ROUNDS } from '../content/public.js';
import { SOURCES } from '../content/learn.js';
import Shell from '../components/Shell.jsx';
import Playground from '../components/Playground.jsx';
import TermSheet from '../components/TermSheet.jsx';
import { CapBar } from '../components/Journey.jsx';
import { Term } from '../components/Coach.jsx';
import { journey, CASE } from '../engine/model.js';
import Icon from '../components/Icon.jsx';
import { openHelp } from '../components/Help.jsx';

const REPO = import.meta.env.VITE_REPO_URL;

function JoinForm({ invited, autoFocus }) {
  const { L } = useLang();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [code, setCode] = useState(sp.get('code') || '');
  const [pin, setPin] = useState(sp.get('pin') || '');
  const [edit, setEdit] = useState(!invited);
  const [name, setName] = useState(() => { try { return localStorage.getItem('bvc-name') || ''; } catch { return ''; } });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const pinRef = useRef(null), nameRef = useRef(null);
  useEffect(() => { if (sp.get('code')) setCode(sp.get('code')); if (sp.get('pin')) setPin(sp.get('pin')); }, [sp]);
  useEffect(() => { if (invited) nameRef.current?.focus(); }, [invited]);
  const join = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      try { localStorage.setItem('bvc-name', name); } catch { /* ignore */ }
      const r = await api.joinGame(code, pin, name.trim());
      nav('/g/' + r.game_id);
    } catch (x) {
      const m = x.message, MSG = {
        GAME_NOT_FOUND: L('Nessuna partita con questo codice. Controlla i 6 caratteri sulla tua join card o sullo schermo della sala.', 'No game with this code. Check the 6 characters on your join card or the room screen.'),
        WRONG_PIN: L('PIN non valido per questa partita. Chiedi il PIN della tua squadra al game master.', 'This PIN does not match the game. Ask the game master for your squad PIN.'),
        TEAM_LOCKED: L('La partita è iniziata: non puoi cambiare squadra. Se hai sbagliato, chiedi al game master di rimuoverti da «Accessi».', 'The game has started: you cannot switch squads. If you made a mistake, ask the game master to remove you from «Access».'),
        JOINS_LOCKED: L('Gli ingressi sono chiusi perché la partita è iniziata. Alza la mano: il game master li riapre per te con un clic.', 'Joins are closed because the game has started. Raise your hand: the game master reopens them for you in one click.'),
        TOO_MANY_ATTEMPTS: L('Troppi PIN sbagliati da questo dispositivo: riprova tra 10 minuti, oppure chiedi al game master il link della tua squadra.', 'Too many wrong PINs from this device: try again in 10 minutes, or ask the game master for your squad link.'),
        SIGNIN_LIMIT: L('Troppi ingressi dalla stessa rete in poco tempo. Avvisa il game master (limite degli accessi anonimi in Supabase) o entra con i dati del telefono.', 'Too many joins from the same network in a short time. Tell the game master (Supabase anonymous sign-in limit) or join on mobile data.'),
      };
      const k = Object.keys(MSG).find(c => m.includes(c));
      setErr(k ? MSG[k] : (isNetErr(x) ? errText(x, L) : L('Non riesco a entrare: ', 'Could not join: ') + m));
    }
    setBusy(false);
  };
  return (
    <form id="join" className={'joincard' + (invited ? ' invited' : '')} onSubmit={join}>
      {invited ? <>
        <span className="jc-tag"><Icon name="mail" /> {L('Sei invitato', 'You are invited')}</span>
        <h2>{L('Partita', 'Game')} <span className="bigcode">{code}</span></h2>
        <p className="hint">{L('Codice e PIN sono già inseriti. Manca solo il tuo nome.', 'Code and PIN are already filled in. Only your name is missing.')}</p>
      </> : <h2>{L('Ho un codice', 'I have a code')}</h2>}
      {edit && <div className="row2">
        <label className="field"><span>{L('Codice partita', 'Game code')}</span><input className="codeinput" value={code} autoFocus={autoFocus} onChange={e => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); setCode(v); if (v.length === 6) pinRef.current?.focus(); }} maxLength={6} placeholder="ABC123" autoComplete="off" required inputMode="text" /></label>
        <label className="field"><span>PIN</span><input ref={pinRef} className="codeinput" value={pin} onChange={e => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); setPin(v); if (v.length === 5) nameRef.current?.focus(); }} maxLength={5} placeholder="XY7Z9" autoComplete="off" required /></label>
      </div>}
      <label className="field"><span>{L('Il tuo nome', 'Your name')}</span><input ref={nameRef} value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder={L('es. Giulia', 'e.g. Giulia')} required /></label>
      {err && <p className="err" role="alert"><Icon name="alert" /> {err}</p>}
      <button className="btn primary big" disabled={busy}>{busy ? L('Entro…', 'Joining…') : L('Entra nella deal room', 'Enter the deal room')} <Icon name="send" /></button>
      <div className="jc-links">
        {invited && !edit && <button type="button" className="linkbtn small-link" onClick={() => setEdit(true)}>{L('Modifica codice o PIN', 'Change code or PIN')}</button>}
        <button type="button" className="small-link linkbtn" onClick={openHelp}><Icon name="coach" /> {L('Dove trovo codice e PIN?', 'Where do I find the code and PIN?')}</button>
      </div>
    </form>
  );
}

// «Back to your game»: one tap to return to the game this device was playing, no code or PIN.
function ResumeCard() {
  const { L } = useLang();
  const nav = useNavigate();
  const [g, setG] = useState(null);
  useEffect(() => { let on = true; checkLastGame().then(r => on && setG(r)); return () => { on = false; }; }, []);
  if (!g) return null;
  const who = g.role === 'admin' ? L('Sala di controllo', 'Control room')
    : g.role === 'facilitator' ? L(`Facilitator · Tavolo ${g.table}`, `Facilitator · Table ${g.table}`)
      : `${g.team} · ${g.side === 'startup' ? 'founder' : L('investitori', 'investors')} · ${L('Tavolo', 'Table')} ${g.table}`;
  return (
    <motion.section className="resume" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} aria-label={L('Partita in corso', 'Game in progress')}>
      <span className="resume-live"><i />{g.unchecked ? L('Partita salvata', 'Saved game') : g.phase === 'lobby' ? L('In sala d\'attesa', 'In the lobby') : L(...PHASE_LABEL[g.phase]) + (g.phase !== 'exit' ? `, round ${g.round}` : '')}</span>
      <div className="resume-who"><b>{g.name}</b><span>{who}</span></div>
      <button type="button" className="btn primary big" autoFocus onClick={async () => { await resumeGame(g); nav('/g/' + g.id); }}><Icon name="play" /> {L('Torna al gioco', 'Back to the game')}</button>
      <button type="button" className="linkbtn small-link" onClick={() => { forgetGame(); setG(null); }}>{L('Non sono io, entra con un altro codice', 'Not me, join with another code')}</button>
    </motion.section>
  );
}

// A tiny live cap table for the «consequences» step.
function MiniCaps() {
  const { L } = useLang();
  const [k, setK] = useState(0);
  useEffect(() => { const t = setInterval(() => setK(x => (x + 1) % 2), 2600); return () => clearInterval(t); }, []);
  const j = journey(k ? { cap: 6, deadEquity: 2, rights: 4 } : { cap: 3.5, deadEquity: 4, rights: 0 }, { pre: 10, pool: 12, board: 1 }, { pre: 47 });
  return <div className="evo mini"><CapBar t={CASE.start} label={L('Oggi', 'Today')} /><CapBar t={j.r2.table} label="Seed" color="var(--r2)" /><CapBar t={j.r3.table} label="Series A" color="var(--r3)" /></div>;
}

const CHIPS = {
  1: ['SAFE', 'Valuation cap', 'Dead equity', 'ESOP', 'Pro-rata', 'MFN'],
  2: ['Pre-money', 'Post-money', 'Option pool shuffle', 'Board', 'Veto', 'Club deal'],
  3: ['Liquidation preference', 'ROFR', 'ROFN', 'Exclusivity', 'CVC', 'Take-or-pay'],
  0: ['BATNA', 'ZOPA', 'Walk-away', 'Anchoring', 'Term sheet', 'Sweet spot'],
};

export default function Home() {
  const { L, lx } = useLang();
  const [sp] = useSearchParams();
  const invited = !!(sp.get('code') && sp.get('pin'));
  const playRef = useRef(null), howRef = useRef(null);
  const go = r => r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const toJoin = () => { document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => document.querySelector('#join input')?.focus(), 400); };

  if (invited) return <Shell><section className="invite"><JoinForm invited /><p className="lede small">{L('Un gioco per imparare il venture capital negoziandolo: la tua squadra porterà una startup dal pre-seed alla Series A.', 'A game to learn venture capital by negotiating it: your squad will take a startup from pre-seed to Series A.')}</p></section></Shell>;

  return (
    <Shell>
      <div className="landing">
        <ResumeCard />
        {/* hero */}
        <section className="hero">
          <div className="hero-copy">
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>{L('Impara il venture capital negoziandolo.', 'Learn venture capital by negotiating it.')}</motion.h1>
            <motion.p className="lede" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
              {L('Un gioco per aule, bootcamp e acceleratori. Squadre di founder e di investitori portano una startup dal pre-seed alla Series A: ogni clausola firmata cambia il cap table dei round successivi, fino all\'exit.', 'A game for classrooms, bootcamps and accelerators. Squads of founders and investors take a startup from pre-seed to Series A: every clause they sign changes the cap table of the next rounds, all the way to the exit.')}
            </motion.p>
            <ul className="facts">
              {[['clock', L('2 ore', '2 hours')], ['users', L('da 2 a 20 tavoli', '2 to 20 tables')], ['screen', L('dal telefono', 'on a phone')], ['book', L('italiano e inglese', 'Italian and English')]].map(([ic, t], i) => (
                <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.06 }}><Icon name={ic} />{t}</motion.li>
              ))}
            </ul>
            <div className="cta-row">
              <button type="button" className="btn primary big only-mobile" onClick={toJoin}><Icon name="key" /> {L('Ho un codice', 'I have a code')}</button>
              <button type="button" className="btn big" onClick={() => go(playRef)}><Icon name="play" /> {L('Prova in 30 secondi', 'Try it in 30 seconds')}</button>
              <Link to="/admin" className="btn big"><Icon name="plus" /> {L('Organizza una partita', 'Run a game')}</Link>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 20, rotate: 1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 140 }}>
            <JoinForm />
          </motion.div>
        </section>

        {/* playground */}
        <section className="band" ref={playRef}>
          <div className="band-h">
            <h2>{L('Prova: un term sheet, tre round dopo', 'Try it: one term sheet, three rounds later')}</h2>
            <p>{L('Muovi le leve del pre-seed e guarda quanto valgono per i founder all\'exit. È il cuore del gioco: le conseguenze arrivano dopo.', 'Move the pre-seed levers and see what they are worth to the founders at the exit. That is the heart of the game: consequences come later.')}</p>
          </div>
          <Playground onPlay={() => go(howRef)} />
          <p className="hint pg-note">{L('Seed e Series A seguono qui un percorso d\'esempio fisso. Nel gioco li negoziate voi.', 'Here the seed and the Series A follow a fixed example path. In the game you negotiate them.')}</p>
        </section>

        {/* how it works */}
        <section className="how" ref={howRef}>
          <h2>{L('Come funziona una partita', 'How a game works')}</h2>
          <ol className="how-steps">
            <li>
              <div className="how-vis vis-card"><span className="conf"><Icon name="key" /> {L('Riservato', 'Confidential')}</span><b>{L('Il tuo walk-away', 'Your walk-away')}</b><i /><i /><i className="short" /></div>
              <h3>{L('Ricevi la tua carta', 'Get your card')}</h3>
              <p>{L('Ogni squadra ha obiettivi, limiti e informazioni che l\'altra non conosce. Come in un vero round.', 'Each squad has targets, limits and information the other does not know. Like a real round.')}</p>
            </li>
            <li>
              <div className="how-vis vis-sheet"><TermSheet round={1} terms={{ cap: 4.2, deadEquity: 1, rights: 3 }} from="investor" fromName="Lanterna" /></div>
              <h3>{L('Negozia con term sheet veri', 'Negotiate with real term sheets')}</h3>
              <p>{L('Tre leve per round. Mandate offerte e controproposte dal telefono, discutete a voce, firmate quando siete pronti.', 'Three levers per round. Send offers and counter-offers from your phone, talk it through, sign when ready.')}</p>
            </li>
            <li>
              <div className="how-vis vis-caps"><MiniCaps /></div>
              <h3>{L('Vivi le conseguenze', 'Live with the consequences')}</h3>
              <p>{L('Quello che firmate resta firmato. Il round dopo parte da lì, fino a un\'exit in euro.', 'What you sign stays signed. The next round starts from there, up to an exit in euros.')}</p>
            </li>
          </ol>
          <div className="extras">
            {[['mail', L('Buste a sorpresa', 'Surprise envelopes'), L('Eventi che cambiano la trattativa a metà round.', 'Events that shake the negotiation mid-round.')],
              ['zap', L('Un coach in tasca', 'A coach in your pocket'), L('Consigli brevi al momento giusto e sigle spiegate con un clic.', 'Short tips at the right time and acronyms explained with a click.')],
              ['trophy', L('Due leghe live', 'Two live leagues'), L('Startup contro startup, investitori contro investitori, sul proiettore.', 'Startups versus startups, investors versus investors, on the projector.')],
              ['bulb', L('Quiz e badge', 'Quizzes and badges'), L('Per fissare i concetti, senza punti in palio.', 'To lock in the concepts, with no points at stake.')]].map(([ic, t, d]) => (
              <div key={t} className="extra"><span className="ex-ico"><Icon name={ic} /></span><b>{t}</b><p>{d}</p></div>
            ))}
          </div>
        </section>

        {/* roles */}
        <section className="roles-sec">
          <h2>{L('Chi sei?', 'Who are you?')}</h2>
          <div className="role-cards">
            <button type="button" className="role-card startup" onClick={toJoin}><Icon name="bulb" /><b>{L('Giocatore', 'Player')}</b><p>{L('Hai un codice partita e un PIN? Entra e trovi la tua squadra.', 'Got a game code and a PIN? Join and find your squad.')}</p><span>{L('Entra', 'Join')} <Icon name="next" /></span></button>
            <button type="button" className="role-card fac" onClick={toJoin}><Icon name="clipboard" /><b>Facilitator</b><p>{L('Con il PIN del tuo tavolo segui la trattativa, apri le buste e dai i punteggi.', 'With your table\'s PIN you follow the deal, open envelopes and score.')}</p><span>{L('Entra con il PIN del tavolo', 'Join with the table PIN')} <Icon name="next" /></span></button>
            <Link to="/admin" className="role-card org"><Icon name="screen" /><b>{L('Organizzatore', 'Organiser')}</b><p>{L('Crea una partita in 30 secondi: round, tavoli, tempi. Codici e QR pronti da stampare.', 'Create a game in 30 seconds: rounds, tables, timing. Codes and QR cards ready to print.')}</p><span>{L('Area organizzatori', 'Organiser area')} <Icon name="next" /></span></Link>
            {REPO ? <a href={REPO} target="_blank" rel="noreferrer" className="role-card oss"><Icon name="doc" /><b>{L('Contributore', 'Contributor')}</b><p>{L('È open source: traduzioni, scenari, contenuti didattici e codice sono benvenuti.', 'It is open source: translations, scenarios, learning content and code are welcome.')}</p><span>GitHub <Icon name="next" /></span></a>
              : <div className="role-card oss"><Icon name="doc" /><b>{L('Contributore', 'Contributor')}</b><p>{L('È open source: traduzioni, scenari, contenuti didattici e codice sono benvenuti.', 'It is open source: translations, scenarios, learning content and code are welcome.')}</p><span>{L('Licenza MIT', 'MIT license')}</span></div>}
          </div>
        </section>

        {/* learn */}
        <section className="learn-sec">
          <h2>{L('Cosa imparerai', 'What you will learn')}</h2>
          <p className="lede small">{L('Tocca un concetto per la spiegazione in una riga. Nel gioco li incontri quando servono, con i vostri numeri.', 'Tap a concept for a one-line explanation. In the game you meet them when they matter, with your own numbers.')}</p>
          <div className="chip-rows">
            {[1, 2, 3, 0].map(r => (
              <div key={r} className="chip-row" style={{ '--rc': r ? ROUNDS[r].color : 'var(--ink)' }}>
                <span className="chip-row-h">{r ? <><Icon name={ROUNDS[r].icon} /> {lx(ROUNDS[r].name)}</> : <><Icon name="users" /> {L('Negoziazione', 'Negotiation')}</>}</span>
                <div>{CHIPS[r].map(k => <span key={k} className="lchip"><Term k={k} /></span>)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* open source */}
        <section className="oss-sec">
          <div>
            <h2>{L('Open source, ispirato alle migliori risorse aperte', 'Open source, inspired by the best open resources')}</h2>
            <p>{L('Il codice è libero (MIT) e i contenuti didattici sono condivisi (CC BY-SA). Le spiegazioni si ispirano a:', 'The code is free (MIT) and the learning content is shared (CC BY-SA). Explanations draw on:')}</p>
            <ul className="src-pills">{Object.values(SOURCES).filter(s => s.url).map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.org}: {lx(s.title)}</a></li>)}</ul>
          </div>
          <div className="oss-fair">
            <Icon name="key" size={28} />
            <b>{L('Gioco leale per costruzione', 'Fair play by design')}</b>
            <p>{L('Carte riservate e soluzioni stanno sul server: ognuno riceve solo quello che il suo ruolo e la fase consentono.', 'Confidential cards and solutions live on the server: everyone receives only what their role and the phase allow.')}</p>
          </div>
        </section>
        <footer className="foot">{L('Aziende, persone e numeri del caso sono inventati a scopo didattico. Non è consulenza legale o finanziaria.', 'Companies, people and figures in the case are fictional, for teaching. Not legal or financial advice.')} <Link to="/privacy">{L('Privacy: cosa salviamo e quando lo cancelliamo', 'Privacy: what we store and when we delete it')}</Link></footer>
      </div>
    </Shell>
  );
}
