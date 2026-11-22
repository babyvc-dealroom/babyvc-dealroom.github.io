import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { useNet, health, net } from '../lib/net.js';
import Icon from './Icon.jsx';

// Tells people at once when their device loses the room, what it means for them, and when it is back.
export function ConnectionBanner() {
  const { L } = useLang();
  const s = useNet(), h = health(s);
  const [back, setBack] = useState(false);
  const prev = useRef(h);
  useEffect(() => {
    if ((prev.current === 'offline' || prev.current === 'reconnecting') && h === 'ok') { setBack(true); const t = setTimeout(() => setBack(false), 3200); prev.current = h; return () => clearTimeout(t); }
    if (h !== 'ok') setBack(false);
    prev.current = h;
  }, [h]);
  const msg = {
    offline: [L('Sei offline', 'You are offline'), L('Le tue azioni non partono finché non torna la rete. Non chiudere la pagina: appena torna internet ci riconnettiamo da soli e recuperi tutto.', 'Nothing you do is sent until the network is back. Keep this page open: once you are online again it reconnects by itself and catches up.')],
    reconnecting: [L('Connessione instabile', 'Unstable connection'), L('Gli aggiornamenti della sala arrivano in ritardo. Riprovo da solo; se dura più di 30 secondi ricarica la pagina.', 'Room updates are late. Retrying by itself; if it lasts more than 30 seconds, reload the page.')],
    slow: [L('Rete lenta', 'Slow network'), L('Funziona, ma ogni azione impiega qualche secondo. Avvicinati al router o passa ai dati del telefono.', 'It works, but every action takes a few seconds. Move closer to the router or switch to mobile data.')],
  }[h];
  return (
    <div className="conn-wrap" aria-live="polite">
      <AnimatePresence>
        {msg && (
          <motion.div key={h} className={'conn ' + h} role="status" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}>
            <Icon name={h === 'offline' ? 'wifiOff' : 'wifi'} />
            <div><b>{msg[0]}</b><span>{msg[1]}</span></div>
            {h === 'reconnecting' && <button type="button" className="btn small" onClick={() => location.reload()}><Icon name="refresh" /> {L('Ricarica', 'Reload')}</button>}
          </motion.div>
        )}
        {back && !msg && (
          <motion.div key="back" className="conn back" role="status" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}>
            <Icon name="check" /><div><b>{L('Di nuovo online', 'Back online')}</b><span>{L('Sala aggiornata: non ti sei perso niente.', 'Room updated: you missed nothing.')}</span></div>
          </motion.div>
        )}
      </AnimatePresence>
      {s.sim && (
        <div className="sim-pill"><Icon name="bug" /> {L('Simulazione su questo dispositivo:', 'Simulation on this device:')} <b>{s.sim}</b>
          <button type="button" className="linkbtn" onClick={() => net.simulate(null)}>{L('Termina', 'Stop')}</button></div>
      )}
    </div>
  );
}

// True when actions cannot reach the server: buttons use it to say why they are disabled.
export function useOffline() { return health(useNet()) === 'offline'; }
