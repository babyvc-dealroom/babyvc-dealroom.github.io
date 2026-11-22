import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { PLAYBOOK, diagnoseGame, deviceState } from '../lib/diagnose.js';
import { serverNow } from '../lib/net.js';
import { Overlay } from './Overlays.jsx';
import Icon from './Icon.jsx';

const ICON = { critical: 'alert', warn: 'alert', info: 'bulb' };
export const ACTION_LABEL = {
  lock_joins: ['Chiudi gli ingressi', 'Lock joins'], unlock_joins: ['Riapri gli ingressi', 'Reopen joins'],
  reset_attempts: ['Sblocca i tentativi di PIN', 'Reset PIN attempts'], purge: ['Cancella ora i dati vecchi', 'Delete old data now'],
};

// One line that says who and what, under the problem's title.
export function issueLine(x, L) {
  const ago = x.last_seen ? Math.round((serverNow() - new Date(x.last_seen).getTime()) / 1000) : null;
  const bits = [x.who, x.where].filter(Boolean).join(' · ');
  switch (x.kind) {
    case 'offline': return `${bits} · ${L('ultimo segnale', 'last signal')} ${ago < 120 ? ago + ' s' : Math.round(ago / 60) + ' min'} ${L('fa', 'ago')}`;
    case 'slow': return `${bits} · ${x.client?.lat} ms`;
    case 'skew': return `${bits} · ${Math.round((x.client?.skew || 0) / 1000)} s`;
    case 'error': return `${bits} · ${x.client?.err || ''}`;
    case 'overdue': return L(`Timer a zero da ${x.minutes} minuti`, `Timer at zero for ${x.minutes} minutes`);
    case 'pin_guessing': case 'bad_codes': return L(`${x.count} tentativi sbagliati negli ultimi 10 minuti`, `${x.count} wrong attempts in the last 10 minutes`);
    case 'blocked': return L(`${x.count} dispositivi bloccati`, `${x.count} devices blocked`);
    case 'crowded_squad': return `${x.where} · ${x.count} ${L('dispositivi', 'devices')}`;
    case 'unscored': return L('Tavoli', 'Tables') + ' ' + x.tables.join(', ');
    case 'pending_requests': return L(`${x.count} da approvare`, `${x.count} to approve`);
    case 'old_data': return L(`${x.count} partite ferme da oltre 7 giorni`, `${x.count} games idle for over 7 days`);
    default: return bits;
  }
}

export function IssueRow({ x, onOpen, showGame }) {
  const { L, lx } = useLang();
  const p = PLAYBOOK[x.kind];
  return (
    <motion.li layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className={'issue ' + x.sev}>
      <Icon name={ICON[x.sev]} />
      <div><b>{L(...p.t)}</b><small>{showGame && x.game ? x.game.name + ' · ' : ''}{issueLine(x, L)}</small></div>
      <button type="button" className="btn small" onClick={() => onOpen(x)}>{L('Come si risolve', 'How to fix')}</button>
    </motion.li>
  );
}

// The fix, in plain steps, with the one-click action when there is one.
export function FixDialog({ issue, kind, onClose, onAction, actions = [] }) {
  const { L, lx } = useLang();
  const k = issue?.kind || kind, p = k && PLAYBOOK[k];
  const [busy, setBusy] = useState(false); const [done, setDone] = useState('');
  const act = p?.action && actions.includes(p.action) ? p.action : null;
  return (
    <Overlay open={!!p} onClose={() => { setDone(''); onClose(); }} label={p ? L(...p.t) : ''}>
      {p && <div className="fix">
        <span className={'fix-sev ' + (issue?.sev || 'info')}><Icon name={issue ? ICON[issue.sev] : 'book'} /> {issue ? { critical: L('Critico', 'Critical'), warn: L('Da sistemare', 'Needs a fix'), info: L('Da sapere', 'Good to know') }[issue.sev] : L('Guida', 'Guide')}</span>
        <h2>{L(...p.t)}</h2>
        {issue && <p className="fix-who">{issueLine(issue, L)}</p>}
        <p className="fix-why">{L(...p.why)}</p>
        <ol className="fix-steps">{p.steps.map((s, i) => <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}>{L(...s)}</motion.li>)}</ol>
        {act && (done ? <p className="ok-line"><Icon name="check" /> {done}</p> : (
          <button type="button" className="btn primary" disabled={busy} onClick={async () => { setBusy(true); try { await onAction(act, issue); setDone(L('Fatto.', 'Done.')); } catch (e) { setDone(e.message); } setBusy(false); }}>
            <Icon name="zap" /> {L(...ACTION_LABEL[act])}</button>))}
        <button type="button" className="btn ghost" onClick={() => { setDone(''); onClose(); }}>{L('Ho capito', 'Got it')}</button>
      </div>}
    </Overlay>
  );
}

// The game master's view of the room's health: who is offline, what is stuck, how to fix it.
export function RoomHealth({ snap, onLock }) {
  const { L } = useLang();
  const [open, setOpen] = useState(null);
  const now = serverNow();
  const issues = useMemo(() => {
    const members = snap.members.map(m => ({ ...m, ...(snap.presence?.[m.user_id] || {}) }));
    return diagnoseGame({ game: snap.game, teams: snap.teams, members, results: snap.results }, now, { forGm: true })
      .filter(x => x.kind !== 'hidden');
  }, [snap, Math.floor(now / 10000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const online = snap.members.filter(m => m.role !== 'admin' && deviceState({ ...m, ...(snap.presence?.[m.user_id] || {}) }, now) === 'online').length;
  const total = snap.members.filter(m => m.role !== 'admin').length;
  return (
    <div className={'health ' + (issues.some(x => x.sev !== 'info') ? 'bad' : 'good')}>
      <div className="health-h"><Icon name="pulse" /><b>{L('Salute della sala', 'Room health')}</b>
        <span className="hint">{online}/{total} {L('dispositivi collegati', 'devices connected')}</span>
        {!issues.length && <span className="ok-line"><Icon name="check" /> {L('Tutto in ordine', 'All good')}</span>}</div>
      {issues.length > 0 && <ul className="issues"><AnimatePresence>{issues.slice(0, 5).map(x => <IssueRow key={x.id} x={x} onOpen={setOpen} />)}</AnimatePresence></ul>}
      {issues.length > 5 && <p className="hint">+{issues.length - 5} {L('altri', 'more')}</p>}
      <FixDialog issue={open} onClose={() => setOpen(null)} actions={['lock_joins', 'unlock_joins']} onAction={a => onLock(a === 'lock_joins')} />
    </div>
  );
}

// Coloured dot for a device: online, offline, never seen.
export function Dot({ m, presence }) {
  const { L } = useLang();
  const st = deviceState({ ...m, ...(presence || {}) }, serverNow());
  const t = { online: L('collegato', 'connected'), offline: L('offline', 'offline'), gone: L('uscito', 'left'), unknown: L('nessun segnale', 'no signal') }[st];
  return <i className={'pdot ' + st} title={t} aria-label={t} />;
}
