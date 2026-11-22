import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LangSwitch, useLang } from '../lib/i18n.jsx';
import { CoachToggle } from './Coach.jsx';
import { isMuted, setMuted } from '../lib/fx.js';
import { api } from '../lib/api/index.js';
import Icon from './Icon.jsx';
import HelpDrawer, { openHelp } from './Help.jsx';
import { ConnectionBanner } from './Connection.jsx';

export function Brand() {
  return <Link to="/" className="brand"><span className="brand-mark"><Icon name="zap" /></span><span className="brand-name">baby vc<small>Deal Room</small></span></Link>;
}

export function MuteToggle() {
  const [m, setM] = useState(isMuted()); const { L } = useLang();
  return <button type="button" className="iconbtn" aria-pressed={!m} title={L('Suoni', 'Sounds')} onClick={() => { setMuted(!m); setM(!m); }}><Icon name={m ? 'mute' : 'volume'} /></button>;
}

export default function Shell({ children, right, stripe, help }) {
  const { L } = useLang();
  const [hideDemo, setHideDemo] = useState(() => { try { return !!sessionStorage.getItem('bvc-demo-ribbon'); } catch { return false; } });
  return (
    <div className="shell">
      <header className="topbar" style={stripe ? { '--stripe': stripe } : undefined}>
        <Brand />
        <div className="topbar-mid">{right}</div>
        <div className="topbar-tools"><button type="button" className="iconbtn help-btn labeled" onClick={openHelp} title={L('Istruzioni per te', 'Instructions for you')}><Icon name="coach" /><span>{L('Aiuto', 'Help')}</span></button><MuteToggle /><CoachToggle /><LangSwitch /></div>
      </header>
      <ConnectionBanner />
      {api.mode === 'demo' && !hideDemo && <div className="demo-ribbon"><button type="button" className="ribbon-x" aria-label={L('Chiudi', 'Close')} onClick={() => { setHideDemo(true); try { sessionStorage.setItem('bvc-demo-ribbon', '1'); } catch { /* ignore */ } }}><Icon name="x" /></button>{L('Modalità demo: i dati restano in questo browser. Dentro una partita usa «Guarda come» in basso a destra per giocare ogni ruolo.', 'Demo mode: data stays in this browser. Inside a game, use «View as» at the bottom right to play every role.')}</div>}
      <main className="main">{children}</main>
      <HelpDrawer ctx={help} />
    </div>
  );
}

export function Loading() { const { L } = useLang(); return <div className="loading"><span className="spark" /> {L('Carico la sala…', 'Loading the room…')}</div>; }
