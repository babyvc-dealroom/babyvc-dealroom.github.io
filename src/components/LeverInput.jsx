import { useLang } from '../lib/i18n.jsx';
import { ROUNDS } from '../content/public.js';

// One lever: slider for numbers, option chips for ladders. Shared by the offer composer, the score form and the what-if.
export default function LeverInput({ round, shape, value, onChange, check, onCheck, compact, warn, idx }) {
  const { L, lx, num } = useLang();
  const txt = ROUNDS[round].levers[shape.key];
  const id = `lv-${round}-${shape.key}-${compact ? 'c' : 'f'}`;
  if (shape.type === 'num') {
    const v = value === '' || value == null ? (shape.min + shape.max) / 2 : +value;
    return (
      <div className={'lever' + (warn ? ' warn' : '') + (compact ? ' compact' : '')}>
        <label htmlFor={id} className="lever-h">
          <span>{idx != null && <i className="lever-n">{idx + 1}</i>}{lx(txt.label)} <small>{lx(txt.unit)}</small></span>
          <output>{shape.unit === '%' ? num(v, 1) + '%' : '€' + num(v, 1) + 'M'}</output>
        </label>
        <input id={id} type="range" min={shape.min} max={shape.max} step={shape.step} value={v} onChange={e => onChange(+e.target.value)} style={{ '--p': ((v - shape.min) / (shape.max - shape.min)) * 100 + '%' }} />
        {!compact && <div className="lever-scale"><span>{shape.unit === '%' ? shape.min + '%' : '€' + shape.min + 'M'}</span><span>{L('Apertura', 'Opening')}: {lx(txt.opening)}</span><span>{shape.unit === '%' ? shape.max + '%' : '€' + shape.max + 'M'}</span></div>}
        {shape.check && onCheck && <label className="chk"><input type="checkbox" checked={!!check} onChange={e => onCheck(e.target.checked)} /> {lx(txt.check)}</label>}
      </div>
    );
  }
  if (compact) return (
    <label className="lever compact"><span className="lever-h"><span>{lx(txt.label)}</span></span>
      <select value={value ?? ''} onChange={e => onChange(+e.target.value)}>{txt.options.map((o, k) => <option key={k} value={k}>{lx(o)}</option>)}</select></label>
  );
  return (
    <fieldset className={'lever' + (warn ? ' warn' : '')}>
      <legend className="lever-h"><span>{idx != null && <i className="lever-n">{idx + 1}</i>}{lx(txt.label)}</span></legend>
      <div className="chips" role="radiogroup">
        {txt.options.map((o, k) => (
          <button type="button" key={k} role="radio" aria-checked={+value === k && value !== '' && value != null} className="chip" onClick={() => onChange(k)}>{lx(o)}</button>
        ))}
      </div>
      <div className="lever-scale"><span>{L('Apertura', 'Opening')}: {lx(txt.opening)}</span></div>
    </fieldset>
  );
}
