import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { useGame } from '../lib/useGame.js';
import { useLang } from '../lib/i18n.jsx';
import { Loading } from '../components/Shell.jsx';
import Icon from '../components/Icon.jsx';

// Printable join cards: one per squad with a QR code, plus the facilitator card.
export default function JoinCards() {
  const { id } = useParams();
  const [snap] = useGame(id);
  const { L } = useLang();
  const [qr, setQr] = useState({});
  const base = location.origin + location.pathname + '#/join';
  useEffect(() => {
    if (!snap?.pins) return;
    const items = [...snap.teams.map(t => [t.id, snap.pins[t.id]]), ...Object.entries(snap.facPins || {}).map(([t, p]) => ['f' + t, p])];
    Promise.all(items.map(async ([k, p]) => [k, await QRCode.toDataURL(`${base}?code=${snap.game.code}&pin=${p}`, { margin: 1, width: 240 })])).then(x => setQr(Object.fromEntries(x)));
  }, [snap?.pins]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!snap) return <Loading />;
  if (!snap.pins) return <p className="empty">{L('Solo il game master può stampare le join card.', 'Only the game master can print join cards.')}</p>;
  const teams = [...snap.teams].sort((a, b) => a.table_no - b.table_no || (a.role > b.role ? -1 : 1));
  return (
    <div className="print">
      <div className="noprint row"><button type="button" className="btn primary" onClick={() => print()}><Icon name="download" /> {L('Stampa', 'Print')}</button><span className="hint">{L('Ritaglia una card per squadra. Il QR apre la deal room con codice e PIN già inseriti.', 'Cut one card per squad. The QR opens the deal room with code and PIN filled in.')}</span></div>
      <div className="jc-grid">
        {teams.map(t => (
          <div key={t.id} className={'jc ' + t.role}>
            <div className="jc-side"><Icon name={t.role === 'startup' ? 'bulb' : 'briefcase'} /> {t.role === 'startup' ? 'Startup: Flussi Energy' : L('Investitori', 'Investors')}</div>
            <h2>{t.name}</h2>
            <p>{L('Tavolo', 'Table')} {t.table_no}</p>
            {qr[t.id] && <img src={qr[t.id]} alt="QR" />}
            <dl><div><dt>{L('Codice', 'Code')}</dt><dd>{snap.game.code}</dd></div><div><dt>PIN</dt><dd>{snap.pins[t.id]}</dd></div></dl>
          </div>
        ))}
        {Array.from({ length: snap.game.n_tables }, (_, k) => k + 1).map(t => (
          <div key={'f' + t} className="jc fac">
            <div className="jc-side"><Icon name="clipboard" /> Facilitator</div>
            <h2>{L('Tavolo', 'Table')} {t}</h2>
            <p>{L('Solo per il facilitator di questo tavolo', 'For this table\'s facilitator only')}</p>
            {qr['f' + t] && <img src={qr['f' + t]} alt="QR" />}
            <dl><div><dt>{L('Codice', 'Code')}</dt><dd>{snap.game.code}</dd></div><div><dt>PIN</dt><dd>{snap.facPins?.[t]}</dd></div></dl>
          </div>
        ))}
      </div>
    </div>
  );
}
