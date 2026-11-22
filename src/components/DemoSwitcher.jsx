import { useNavigate } from 'react-router-dom';
import { useLang } from '../lib/i18n.jsx';
import { api } from '../lib/api/index.js';
import Icon from './Icon.jsx';

// Demo mode only: switch between game master, facilitator, every squad and the projector in one window.
function DemoSwitcher({ snap, screen }) {
  const { L } = useLang();
  const nav = useNavigate();
  if (api.mode !== 'demo' || !snap?.game) return null;
  const g = snap.game;
  const cur = screen ? 'screen' : api.whoAmI(g.id);
  const teams = [...snap.teams].sort((a, b) => a.table_no - b.table_no || (a.role > b.role ? -1 : 1));
  const go = async v => {
    if (v === 'screen') { await api.switchTo(g.id, 'admin'); nav('/screen/' + g.id); return; }
    await api.switchTo(g.id, v); nav('/g/' + g.id);
  };
  return (
    <label className="demo-switch">
      <Icon name="users" /> <span>{L('Guarda come', 'View as')}</span>
      <select value={cur} onChange={e => go(e.target.value)}>
        <option value="admin">{L('Game master', 'Game master')}</option>
        {Array.from({ length: g.n_tables }, (_, k) => <option key={'f' + k} value={'fac-' + (k + 1)}>Facilitator {L('tavolo', 'table')} {k + 1}</option>)}
        {teams.map(t => <option key={t.id} value={t.id}>{L('Tavolo', 'Table')} {t.table_no}: {t.name} ({t.role === 'startup' ? 'startup' : L('investitori', 'investors')})</option>)}
        <option value="screen">{L('Proiettore', 'Projector')}</option>
      </select>
    </label>
  );
}

// With Supabase configured the switcher is compiled out of the bundle entirely.
export default import.meta.env.VITE_SUPABASE_URL ? () => null : DemoSwitcher;
