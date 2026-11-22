// Anti-cheat guard: fails if any confidential text or number set of the scenario pack ends up in the production bundle.
// Run after `npm run build`: npm run check:bundle
import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PRIVATE_PACK, IS_REAL_PACK } from '../scenarios/flussi-energy/resolve.mjs';

const { SECRETS } = await import(pathToFileURL(PRIVATE_PACK).href);
// Text that is public anyway (lever options, sheets, learning content) is not a leak even if a solution quotes it.
const pub = JSON.stringify([await import('../src/content/public.js'), await import('../src/content/learn.js')].map(m => ({ ...m })));
const dir = new URL('../dist/assets/', import.meta.url);
const bundle = readdirSync(dir).filter(f => f.endsWith('.js')).map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n');

const needles = new Set();
const walk = v => { if (typeof v === 'string') { if (v.length >= 24) needles.add(v.slice(0, 60)); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
SECRETS.forEach(s => walk(s.body));
for (const n of [...needles]) if (pub.includes(n)) needles.delete(n);
// number sets: scoring cards and sweet spots, serialised the way a bundler would print them
for (const s of SECRETS) {
  if (s.kind === 'scoring') for (const c of s.body.cards) if (c.type === 'num') needles.add(`lo:${c.lo},hi:${c.hi}`);
}
const leaks = [...needles].filter(n => bundle.includes(n));
console.log(`Checked ${needles.size} confidential strings from the ${IS_REAL_PACK ? 'real' : 'sample'} pack against the bundle.`);
if (leaks.length) { console.error('LEAK: confidential content found in dist/:\n' + leaks.map(l => '  - ' + l).join('\n')); process.exit(1); }
console.log('OK: no confidential content in the production bundle.');
