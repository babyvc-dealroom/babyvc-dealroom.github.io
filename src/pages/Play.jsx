import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { api } from '../lib/api/index.js';
import { useNewItems, tableResults } from '../lib/useGame.js';
import { useCoach } from '../components/Coach.jsx';
import { sfx, burst } from '../lib/fx.js';
import { ROUNDS, STORY } from '../content/public.js';
import { LEVER_SHAPES, OPENING, WALK, foundersAfter, tablePath, walkBreaches } from '../engine/model.js';
import { sideName } from '../lib/format.js';
import TermSheet from '../components/TermSheet.jsx';
import LeverInput from '../components/LeverInput.jsx';
import Journey from '../components/Journey.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
import { RoundBrief, PrivateCard } from '../components/Cards.jsx';
import { EnvelopeOverlay, SignedOverlay, ScoreOverlay, Overlay } from '../components/Overlays.jsx';
import Icon from '../components/Icon.jsx';
import { useScenario } from '../lib/useScenario.js';
import { useBadges } from '../lib/badges.js';
import { tourSeen } from '../components/Spotlight.jsx';
import LearnHub, { ConceptOverlay, QuizOverlay, BadgeToast } from '../components/Learn.jsx';
import { errText } from '../lib/net.js';
import { useOffline } from '../components/Connection.jsx';

// Shows something once per game, squad and round (concept at the brief, quiz at the debrief).
const onceKey = (...a) => 'bvc-once-' + a.join('-');
const firstTime = k => { try { if (localStorage.getItem(k)) return false; localStorage.setItem(k, '1'); return true; } catch { return false; } };

const live = p => p === 'negotiate' || p === 'sign';

function Vote({ snap, team }) {
  const { L } = useLang();
  const g = snap.game;
  const mine = snap.votes.find(v => v.table_no === team.table_no && v.round === g.round && v.from_role === team.role);
  const [v, setV] = useState(mine?.value ?? 7);
  const [saved, setSaved] = useState(!!mine);
  const send = async () => { await api.vote({ game_id: g.id, table_no: team.table_no, round: g.round, from_role: team.role, value: v }); setSaved(true); burst(0.5, 0.7); };
  return (
    <div className="vote">
      <b>{L('Fareste un altro round con loro?', 'Would you do another round with them?')}</b>
      <div className="vote-scale">
        {Array.from({ length: 11 }, (_, k) => <button key={k} type="button" aria-pressed={v === k} onClick={() => { setV(k); setSaved(false); }}>{k}</button>)}
      </div>
      <button type="button" className="btn primary" onClick={send} disabled={saved}>{saved ? <><Icon name="check" /> {L('Voto inviato', 'Vote sent')}</> : L('Invia il voto', 'Send the vote')}</button>
      <p className="hint">{L('Il voto resta segreto: lo vede solo il facilitator, e l\'altra squadra lo scopre come punti relazione nel punteggio.', 'The vote stays secret: only the facilitator sees it; the other squad finds it as relationship points in its score.')}</p>
    </div>
  );
}

function Composer({ snap, team, other, offers, results, myCard, onSent, seed, refs }) {
  const T = useLang(); const { L, pc } = T;
  const coach = useCoach();
  const g = snap.game, round = g.round, shapes = LEVER_SHAPES[round];
  const [terms, setTerms] = useState(() => ({ ...OPENING[round] }));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const offline = useOffline();
  useEffect(() => { if (seed) setTerms({ ...seed }); }, [seed]);
  useEffect(() => { coach.tip('offer:compose'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const breaches = walkBreaches(round, results, terms, myCard?.body?.walk, refs);
  const fNow = foundersAfter(round, results, terms, refs);
  const fEnd = round < 3 ? tablePath({ ...results, [round]: { outcome: 'signed', terms } }, refs).j.r3.founders : null;
  const send = async () => {
    setBusy(true); setErr('');
    try {
      const counter = offers.some(o => o.status === 'open' && o.from_role !== team.role), first = offers.length === 0;
      await api.sendOffer({ game_id: g.id, table_no: team.table_no, round, from_role: team.role, terms, note: note.trim() });
      sfx.send(); onSent({ terms, note: note.trim(), counter, first }); setNote('');
    } catch (x) { setErr(L('Offerta non inviata. ', 'Offer not sent. ') + errText(x, L)); }
    setBusy(false);
  };
  return (
    <div className="composer">
      <h3><Icon name="pen" /> {L('Scrivi il tuo term sheet', 'Write your term sheet')} <small>{L('per', 'to')} {other?.name}</small></h3>
      {shapes.map((s, i) => (
        <LeverInput key={s.key} idx={i} round={round} shape={s} value={terms[s.key]} onChange={v => setTerms(t => ({ ...t, [s.key]: v }))}
          check={terms[s.key + 'Check']} onCheck={c => setTerms(t => ({ ...t, [s.key + 'Check']: c }))} warn={breaches.includes(s.key)} />
      ))}
      <div className="impact">
        <div className={'imp' + (WALK[round] && fNow < WALK[round] ? ' bad' : '')}><small>{L('Founder dopo questo round', 'Founders after this round')}</small><motion.b key={fNow.toFixed(4)} initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }}>{pc(fNow)}</motion.b></div>
        {fEnd != null && <div className={'imp' + (fEnd < WALK[3] ? ' bad' : '')} title={L('I round futuri sono calcolati alle condizioni d\'apertura degli investitori.', 'Future rounds are computed at the investors\' opening terms.')}><small>{L('…dopo la Series A, se i prossimi round chiudessero all\'apertura', '…after the Series A, if the next rounds closed at the opening')}</small><motion.b key={fEnd.toFixed(4)} initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }}>{pc(fEnd)}</motion.b></div>}
      </div>
      <AnimatePresence>{breaches.length > 0 && (
        <motion.p className="walkwarn" initial={{ x: -8, opacity: 0 }} animate={{ x: [0, -6, 6, -3, 0], opacity: 1 }} exit={{ opacity: 0 }}>
          <Icon name="alert" /> {breaches.includes('founders') ? L('Questa offerta porta i founder sotto il loro walk-away.', 'This offer takes the founders below their walk-away.') : L('Questa offerta supera il vostro walk-away su una leva. Firmarla azzera i vostri punti claim value.', 'This offer breaches your walk-away on a lever. Signing it zeroes your claim-value points.')}
        </motion.p>)}
      </AnimatePresence>
      <label className="field"><span>{L('Nota per l\'altra squadra (cosa chiedete in cambio?)', 'Note to the other squad (what do you want in return?)')}</span>
        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={280} rows={2} placeholder={L('es. Accettiamo il pool al 10% se il cap sale a €4,7M', 'e.g. We accept a 10% pool if the cap goes to €4.7M')} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      {offline && <p className="err soft"><Icon name="wifiOff" /> {L('Sei offline: il term sheet resta qui, lo mandi appena torna la rete.', 'You are offline: your term sheet stays here, send it once the network is back.')}</p>}
      <button type="button" className="btn primary big send" onClick={send} disabled={busy || offline}><Icon name="send" /> {offers.some(o => o.status === 'open') ? L('Manda la controproposta', 'Send the counter-offer') : L('Manda il term sheet', 'Send the term sheet')}</button>
    </div>
  );
}

export default function Play({ snap }) {
  const T = useLang(); const { L, lx } = T;
  const coach = useCoach();
  const g = snap.game;
  const team = snap.teams.find(t => t.id === snap.me.team_id);
  const other = snap.teams.find(t => t.table_no === team?.table_no && t.role !== team?.role);
  const [tab, setTab] = useState(live(g.phase) ? 'deal' : 'card');
  const sc = useScenario(snap);
  const cards = sc.rows;
  const [cardRound, setCardRound] = useState(g.round);
  const [env, setEnv] = useState(null);
  const [deal, setDeal] = useState(null);
  const [score, setScore] = useState(null);
  const [flying, setFlying] = useState(null);
  const [seed, setSeed] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { got: badges, award } = useBadges(g.id, team?.id);
  const [concept, setConcept] = useState(null);
  const [quiz, setQuiz] = useState(null);
  // Concept of the round at the brief, quiz at the debrief: once per squad and round.
  useEffect(() => {
    if (!team) return;
    if (g.phase === 'brief' && firstTime(onceKey('concept', g.id, team.id, g.round))) {
      // after the phase title card and, the first time, after the guided tour
      if (tourSeen('player')) setTimeout(() => setConcept(g.round), 3400);
      else { const on = () => { removeEventListener('bvc-tour-end', on); setConcept(g.round); }; addEventListener('bvc-tour-end', on); }
    }
    if (g.phase === 'debrief' && firstTime(onceKey('quiz', g.id, team.id, g.round))) setTimeout(() => setQuiz(g.round), 2500);
  }, [g.phase, g.round, team?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const on = e => e.detail >= 5 && award('curious'); addEventListener('bvc-term', on); return () => removeEventListener('bvc-term', on); }, [award]);
  useEffect(() => { if (tab === 'journey' && live(g.phase)) award('tworounds'); }, [tab, g.phase, award]);

  useEffect(() => { setCardRound(g.round); }, [g.round]);
  useEffect(() => { if (live(g.phase)) setTab('deal'); else if (g.phase === 'brief') setTab('card'); else if (['exit', 'ended'].includes(g.phase)) setTab('journey'); }, [g.phase, g.round]);

  const results = useMemo(() => tableResults(snap, team?.table_no), [snap, team]);
  const offers = useMemo(() => snap.offers.filter(o => o.table_no === team?.table_no && o.round === g.round).slice().reverse(), [snap.offers, team, g.round]);
  const envs = useMemo(() => snap.events.filter(e => e.kind === 'envelope' && e.table_no === team?.table_no), [snap.events, team]);
  const scored = useMemo(() => snap.events.filter(e => e.kind === 'scored' && e.table_no === team?.table_no), [snap.events, team]);
  const signedRows = useMemo(() => (snap.results || []).filter(r => r.table_no === team?.table_no && r.outcome === 'signed').map(r => ({ ...r, key: 'r' + r.round })), [snap.results, team]);
  const myCard = sc.card(g.round, 'card_' + team?.role);

  const [ping, setPing] = useState(null);
  const tabRef = useRef(tab); tabRef.current = tab;
  useNewItems(offers, useCallback(o => {
    if (o.from_role === team.role) return;
    sfx.receive(); coach.tip('offer:incoming');
    try { navigator.vibrate?.([60, 40, 60]); } catch { /* not supported */ }
    if (tabRef.current !== 'deal') { setPing(o); setTimeout(() => setPing(p => (p === o ? null : p)), 7000); }
  }, [team, coach]));
  useNewItems(envs, useCallback(e => setEnv(e), []));
  useNewItems(signedRows, useCallback(r => {
    setDeal(r);
    if (r.round === g.round) { award('closer'); if (!walkBreaches(r.round, tableResults(snap, team?.table_no), r.terms, sc.card(r.round, 'card_' + team?.role)?.body?.walk, sc.refs).length) award('limits'); }
  }, [g.round, award, snap, team, sc]));
  useNewItems(scored, useCallback(e => setScore({ round: e.round, role: team.role, s: e.payload[team.role === 'startup' ? 'f' : 'i'] }), [team]));

  if (!team) return <p className="empty">{L('La tua squadra non esiste più. Chiedi al game master.', 'Your squad no longer exists. Ask the game master.')}</p>;
  const signed = results[g.round];
  const openTheirs = offers.find(o => o.status === 'open' && o.from_role !== team.role);
  const openMine = offers.find(o => o.status === 'open' && o.from_role === team.role);
  const mates = snap.members.filter(m => m.team_id === team.id);
  const names = team.role === 'startup' ? [team.name, other?.name] : [other?.name, team.name];

  const accept = async o => { setConfirm(null); try { await api.acceptOffer(o.id); } catch (x) { coach.say(errText(x, L), 'warn'); } };
  const reject = async o => { try { await api.rejectOffer(o.id); sfx.reject(); } catch (x) { coach.say(errText(x, L), 'warn'); } };

  if (g.phase === 'lobby') return (
    <div className="lobby">
      <motion.div className="lobby-card" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <span className={'side-badge ' + team.role}><Icon name={team.role === 'startup' ? 'bulb' : 'briefcase'} /> {sideName(team.role, L)}, {L('tavolo', 'table')} {team.table_no}</span>
        <input className="teamname" aria-label={L('Nome della squadra', 'Squad name')} defaultValue={team.name} maxLength={32} onBlur={e => e.target.value.trim() && e.target.value !== team.name && api.renameTeam(team.id, e.target.value.trim())} />
        <p className="hint">{L('Potete cambiare il nome della squadra finché la partita non parte.', 'You can rename your squad until the game starts.')}</p>
        <div className="mates">{mates.map(m => <motion.span key={m.user_id} initial={{ scale: 0 }} animate={{ scale: 1 }}>{m.name || '?'}</motion.span>)}</div>
        <p className="vs">{L('Contro', 'Against')} <b>{other?.name}</b></p>
        <div className="waiting"><span className="spark" /> {L('In attesa che il game master apra il primo round…', 'Waiting for the game master to open the first round…')}</div>
      </motion.div>
      <p className="lede">{lx(STORY)}</p>
    </div>
  );

  const tabs = [['deal', 'doc', L('Il tavolo', 'The table')], ['card', 'key', L('Le carte', 'Your cards')], ['journey', 'route', 'Journey'], ['learn', 'bulb', L('Impara', 'Learn')], ['board', 'trophy', L('Classifica', 'Leaderboard')]];
  return (
    <div className={'play ' + team.role}>
      <div className="play-head">
        <span className={'side-badge ' + team.role}><Icon name={team.role === 'startup' ? 'bulb' : 'briefcase'} /> {team.name}</span>
        <span className="vs">vs <b>{other?.name}</b></span>
        {envs.length > 0 && <div className="env-chips">{envs.map(e => <button key={e.id} type="button" className="env-chip" onClick={() => setEnv(e)}><Icon name="mail" /> {e.payload.key === 'spare' ? L('Riserva', 'Spare') : e.payload.key} <small>R{e.round}</small></button>)}</div>}
      </div>
      <nav className="tabs" role="tablist">{tabs.map(([id, ic, t]) => <button key={id} type="button" role="tab" data-tab={id} aria-selected={tab === id} onClick={() => setTab(id)}><Icon name={ic} /><span>{t}</span>{id === 'deal' && openTheirs && <i className="dot" />}</button>)}</nav>

      {tab === 'deal' && (
        <div className="table-view">
          <section className="timeline">
            {signed ? (
              <div className="signed-banner"><TermSheet round={g.round} terms={signed.terms} from="startup" fromName={names[0]} toName={names[1]} status={signed.outcome === 'signed' ? 'accepted' : undefined} />
                {signed.outcome !== 'signed' && <p className="hint">{L('Il facilitator ha registrato: nessun accordo.', 'The facilitator recorded: no deal.')}</p>}</div>
            ) : !live(g.phase) ? (
              <div className="empty big"><Icon name="clock" size={36} /><p>{g.phase === 'brief' ? L('Leggete le carte: la trattativa si apre tra poco.', 'Read your cards: the negotiation opens shortly.') : L('Round chiuso senza firma.', 'Round closed without a signature.')}</p></div>
            ) : !offers.length ? (
              <div className="empty big"><Icon name="doc" size={36} /><p>{L('Il tavolo è vuoto. Chi apre per primo ancora la trattativa.', 'The table is empty. Whoever opens first anchors the deal.')}</p></div>
            ) : null}
            {!signed && (
              <ol className="offers">
                <AnimatePresence initial={false}>
                  {offers.map(o => {
                    const mine = o.from_role === team.role;
                    return (
                      <motion.li key={o.id} layout initial={mine ? { y: 80, opacity: 0, rotate: 3 } : { y: -120, opacity: 0, rotate: -8, scale: 1.05 }} animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
                        <TermSheet round={o.round} terms={o.terms} from={o.from_role} mine={mine} fromName={mine ? team.name : other?.name} note={o.note} status={o.status === 'open' ? null : o.status} time={o.created_at}>
                          {o.status === 'open' && live(g.phase) && (
                            <div className="sheet-actions">
                              {mine ? <button type="button" className="btn ghost" onClick={() => reject(o)}><Icon name="x" /> {L('Ritira', 'Withdraw')}</button> : <>
                                <button type="button" className="btn sign" onClick={() => setConfirm(o)}><Icon name="pen" /> {L('Firma', 'Sign')}</button>
                                <button type="button" className="btn" onClick={() => { setSeed(o.terms); document.querySelector('.composer')?.scrollIntoView({ behavior: 'smooth' }); }}><Icon name="sliders" /> {L('Controproposta', 'Counter')}</button>
                                <button type="button" className="btn ghost" onClick={() => reject(o)}><Icon name="x" /> {L('Rifiuta', 'Reject')}</button></>}
                            </div>
                          )}
                        </TermSheet>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ol>
            )}
          </section>
          <aside className="side-col">
            {live(g.phase) && !signed && <Composer snap={snap} team={team} other={other} offers={offers} results={results} myCard={myCard} seed={seed} refs={sc.refs} onSent={o => { setFlying(o.terms); setTimeout(() => setFlying(null), 900); if (o.first) award('anchor'); if (o.note) award('note'); if (o.counter) award('counter'); }} />}
            {openMine && !signed && <p className="hint waiting-their"><span className="spark" /> {L('Il vostro term sheet è sul tavolo. Aspettate la risposta…', 'Your term sheet is on the table. Waiting for the answer…')}</p>}
            {(['sign', 'debrief'].includes(g.phase)) && <Vote snap={snap} team={team} />}
          </aside>
        </div>
      )}

      {tab === 'card' && (
        <div className="cards-view">
          {g.round > 1 && <div className="seg small">{Array.from({ length: g.round }, (_, i) => i + 1).map(r => <button key={r} type="button" aria-pressed={cardRound === r} onClick={() => setCardRound(r)}>{lx(ROUNDS[r].name)}</button>)}</div>}
          <div className="cards-grid">
            <RoundBrief round={cardRound} />
            <PrivateCard row={sc.card(cardRound, 'card_' + team.role)} side={team.role} />
          </div>
        </div>
      )}
      {tab === 'journey' && <Journey results={results} nRounds={g.n_rounds} refs={sc.refs} revealed={sc.revealed} />}
      {tab === 'board' && <Leaderboard snap={snap} highlight={team.id} />}
      {tab === 'learn' && <LearnHub round={g.round} nRounds={g.n_rounds} badges={badges} onRead={() => award('student')} />}

      <AnimatePresence>{flying && (
        <motion.div className="flying" initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }} animate={{ x: -420, y: -260, rotate: -18, opacity: 0, scale: 0.5 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: [0.5, 0, 0.75, 0] }}>
          <TermSheet round={g.round} terms={flying} from={team.role} fromName={team.name} />
        </motion.div>)}
      </AnimatePresence>

      <Overlay open={!!confirm} onClose={() => setConfirm(null)} label={L('Conferma firma', 'Confirm signature')}>
        {confirm && (() => {
          const br = walkBreaches(g.round, results, confirm.terms, myCard?.body?.walk, sc.refs);
          return (
            <div className="confirm">
              <h2>{L('Firmate questo term sheet?', 'Sign this term sheet?')}</h2>
              <TermSheet round={g.round} terms={confirm.terms} from={confirm.from_role} fromName={other?.name} note={confirm.note} />
              {br.length > 0 && <p className="walkwarn"><Icon name="alert" /> {L('Attenzione: supera il vostro walk-away. Firmando perdete i punti claim value di questo round.', 'Careful: it breaches your walk-away. Signing loses your claim-value points for this round.')}</p>}
              <p className="hint">{L('Quello che firmate resta firmato: il prossimo round parte da qui.', 'What you sign stays signed: the next round starts from here.')}</p>
              <div className="row"><button type="button" className="btn ghost" onClick={() => setConfirm(null)}>{L('Non ancora', 'Not yet')}</button><button type="button" className="btn sign big" onClick={() => accept(confirm)}><Icon name="pen" /> {L('Firma il deal', 'Sign the deal')}</button></div>
            </div>
          );
        })()}
      </Overlay>
      <EnvelopeOverlay env={env} onClose={() => setEnv(null)} />
      <ConceptOverlay round={concept} onClose={() => setConcept(null)} onMore={() => { setConcept(null); setTab('learn'); }} />
      <QuizOverlay round={quiz} onClose={() => setQuiz(null)} onPerfect={() => award('quiz')} />
      <BadgeToast />
      <AnimatePresence>{ping && (
        <motion.div className={'ping ' + ping.from_role} role="status" initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 120, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}>
          <Icon name="doc" size={28} />
          <div><b>{L('Nuovo term sheet', 'New term sheet')}</b><small>{L('da', 'from')} {other?.name}</small></div>
          <button type="button" className="btn primary" onClick={() => { setTab('deal'); setPing(null); }}>{L('Apri', 'Open')}</button>
        </motion.div>)}
      </AnimatePresence>
      <SignedOverlay deal={deal} names={names} onClose={() => setDeal(null)}>
        <Vote snap={snap} team={team} />
      </SignedOverlay>
      <ScoreOverlay data={score} onClose={() => { setScore(null); setTab('board'); }} />
    </div>
  );
}
