import { net, isNetErr } from '../net.js';

let impl;
if (import.meta.env.VITE_SUPABASE_URL) impl = (await import('./supabase.js')).api; else impl = (await import('./demo.js')).api;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const SYNC = new Set(['subscribe', 'whoAmI', 'mode', 'userId']);

// Every call reports to the connection store: a request that never reaches the server counts as a failure,
// a refusal from the server still proves the connection works. Simulated failures are applied here.
export const api = new Proxy(impl, {
  get(t, k) {
    const v = t[k];
    if (typeof v !== 'function' || SYNC.has(k)) return v;
    return async (...a) => {
      const s = net.get();
      if (s.sim === 'offline' || (impl.mode === 'demo' && !s.online)) { await sleep(300); net.fail(); throw new Error('NETWORK'); }
      if (s.sim === 'slow') await sleep(2400);
      try { const r = await v.apply(t, a); net.ok(); return r; }
      catch (e) { if (isNetErr(e)) net.fail(); else net.ok(); throw e; }
    };
  },
});
