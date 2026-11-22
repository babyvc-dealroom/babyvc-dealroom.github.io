#!/bin/sh
# Database security tests on a throwaway Postgres database (local or CI).
# Usage: PGHOST=localhost PGUSER=postgres sh supabase/tests/run.sh
set -e
cd "$(dirname "$0")/../.."
node scripts/build-seed.mjs >/dev/null
DB=bvc_test_$$
psql -q -d postgres -c "create database $DB"
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null 2>&1' EXIT
for f in supabase/tests/stub.sql supabase/migrations/*.sql supabase/seed_content.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null 2>/tmp/bvc-sql.log || { echo "Failed loading $f"; cat /tmp/bvc-sql.log; exit 1; }
done
if psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/security.test.sql >/tmp/bvc-test.log 2>&1; then
  grep -o 'ok  .*' /tmp/bvc-test.log; echo "All database checks passed: $(grep -c 'ok  ' /tmp/bvc-test.log)"
else
  grep -o 'ok  .*' /tmp/bvc-test.log; grep -E 'ERROR|FAIL' /tmp/bvc-test.log; exit 1
fi
