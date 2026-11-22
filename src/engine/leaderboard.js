// Leagues from saved results. Uses the totals the facilitator stored, so it needs no scoring card.
// results: rows { table_no, round, status, result: { f: {total, rel}, i: {total, rel} } }
export function leaderboard(teams, results, nRounds) {
  const rows = {};
  for (const t of teams) rows[t.id] = { team: t, role: t.role, rounds: {}, raw: 0, adj: 0, rel: 0 };
  for (let r = 1; r <= nRounds; r++) {
    for (const side of ['startup', 'investor']) {
      const s = side === 'startup' ? 'f' : 'i';
      const ent = results.filter(x => x.round === r && x.status === 'scored' && x.result).map(x => ({ x, team: teams.find(t => t.table_no === x.table_no && t.role === side) })).filter(e => e.team);
      const avg = ent.length ? ent.reduce((a, e) => a + e.x.result[s].total, 0) / ent.length : 0;
      for (const e of ent) {
        const row = rows[e.team.id], tot = e.x.result[s].total, adj = 50 + tot - avg;
        row.rounds[r] = { raw: tot, adj }; row.raw += tot; row.adj += adj; row.rel += e.x.result[s].rel;
      }
    }
  }
  const all = Object.values(rows);
  const byRaw = (a, b) => b.raw - a.raw || b.rel - a.rel;
  return {
    startup: all.filter(x => x.role === 'startup').sort(byRaw),
    investor: all.filter(x => x.role === 'investor').sort(byRaw),
    overall: [...all].sort((a, b) => b.adj - a.adj || b.rel - a.rel || b.raw - a.raw),
  };
}
