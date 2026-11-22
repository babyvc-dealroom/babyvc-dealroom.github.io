import { createContext, useContext, useState, useCallback } from 'react';

const Ctx = createContext(null);
const initial = () => {
  try { const s = localStorage.getItem('bvc-lang'); if (s) return s; } catch { /* no storage */ }
  return (navigator.language || 'en').startsWith('it') ? 'it' : 'en';
};

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initial);
  const setLang = useCallback(l => { setLangState(l); try { localStorage.setItem('bvc-lang', l); } catch { /* ignore */ } document.documentElement.lang = l; }, []);
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(Ctx);
  const L = (it, en) => (lang === 'it' ? it : en);
  const lx = o => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en);
  const num = (x, d = 1) => new Intl.NumberFormat(lang === 'it' ? 'it-IT' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
  const pc = (x, d = 1) => num(x * 100, d) + '%';
  const eur = (x, d = 1) => '€' + num(x, d) + 'M';
  const eurk = x => '€' + num(x * 1000, 0) + 'k';
  return { lang, setLang, L, lx, num, pc, eur, eurk };
}

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="langsw" role="group" aria-label="Language">
      {['it', 'en'].map(l => <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
    </div>
  );
}
