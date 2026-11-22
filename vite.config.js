import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { PRIVATE_PACK } from './scenarios/flussi-energy/resolve.mjs';

// Content Security Policy as a <meta> tag, for hosts that cannot send headers (GitHub Pages).
// Hosts that can (Cloudflare Pages, Netlify, Vercel) also get it from public/_headers or vercel.json.
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'";
const csp = { name: 'bvc-csp', transformIndexHtml: html => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`) };

// `npm run build` → static site (reads confidential content from Supabase only).
// `npm run build:demo` → one self-contained HTML file in demo mode, with the confidential pack bundled in:
//   keep demo builds made from the real pack private.
export default defineConfig(({ mode }) => ({
  base: './',   // works at a domain root and in a sub-folder alike (hash routing)
  plugins: [react(), ...(mode === 'demo' ? [viteSingleFile()] : mode === 'production' ? [csp] : [])],
  resolve: { alias: { '@private-pack': PRIVATE_PACK } },
  build: { target: 'es2022', outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
  test: { alias: { '@private-pack': PRIVATE_PACK } },
}));
