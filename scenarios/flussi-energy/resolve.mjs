// Picks the real confidential pack when present, otherwise the public sample.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
// BVC_PACK=sample forces the public sample (CI, or to test what contributors see).
export const PRIVATE_PACK = process.env.BVC_PACK !== 'sample' && existsSync(here + 'private.js') ? here + 'private.js' : here + 'private.sample.js';
export const IS_REAL_PACK = PRIVATE_PACK.endsWith('private.js') && !PRIVATE_PACK.endsWith('sample.js');
