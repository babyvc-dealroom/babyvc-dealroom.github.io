// Prints the PBKDF2 hash for the ops console of the browser-only demo build.
// Usage: node scripts/ops-hash.mjs 'your password'  >> .env.demo.local
// In production the password is never in the build: run «select ops_set_password('…');» in the Supabase SQL editor.
import { pbkdf2Sync, randomBytes } from 'node:crypto';
const pw = process.argv[2];
if (!pw || pw.length < 10) { console.error('Give a password of at least 10 characters.'); process.exit(1); }
const salt = randomBytes(16);
console.log(`VITE_OPS_HASH=${salt.toString('hex')}:${pbkdf2Sync(pw, salt, 210000, 32, 'sha256').toString('hex')}`);
