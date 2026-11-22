import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n.jsx';

// Two-step button for actions that cannot be undone: the first click arms it, the second runs it.
export default function ConfirmButton({ onConfirm, children, className = 'btn ghost', armedLabel, ...rest }) {
  const { L } = useLang();
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(t); }, [armed]);
  return (
    <button type="button" className={className + (armed ? ' armed' : '')} {...rest}
      onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}>
      {armed ? (armedLabel || L('Clicca di nuovo per confermare', 'Click again to confirm')) : children}
    </button>
  );
}
