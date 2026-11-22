#!/bin/sh
# Builds the browser-only demo with the public sample pack and plays it in Chromium.
# Needs: pip install playwright && playwright install chromium
set -e
cd "$(dirname "$0")/../.."
BVC_PACK=sample VITE_OPS_HASH="$(node scripts/ops-hash.mjs 'e2e-console-password' | cut -d= -f2)" npx vite build --mode demo >/dev/null
mkdir -p "${SHOTS:-/tmp/bvc-shots/}"
(cd dist-demo && python3 -m http.server 8765 >/dev/null 2>&1) & SRV=$!
trap 'kill $SRV' EXIT
sleep 1
OPS_PASSWORD=e2e-console-password python3 tests/e2e/game.py
OPS_PASSWORD=e2e-console-password python3 tests/e2e/resilience.py
python3 tests/e2e/resume.py
OPS_PASSWORD=e2e-console-password python3 tests/e2e/accounts.py
