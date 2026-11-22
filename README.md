# Baby VC Deal Room

**An open-source game to learn venture capital by negotiating it.**
Squads of founders and investors take one startup, Flussi Energy, from a pre-seed SAFE to a Series A and an exit. Every term they sign becomes the starting point of the next round, so the cap table, the dilution and the exit value are the consequence of their own deals.

**Live: [babyvc-dealroom.github.io](https://babyvc-dealroom.github.io)**

[Italiano](README.it.md) | MIT (code) | CC BY-SA 4.0 (public learning content)

## Why

Founders usually see their first term sheet when it matters most. Investors learn the trade one deal at a time. The Deal Room turns that learning into a game you can run in a classroom, a bootcamp or an accelerator in two hours:

- **Real mechanics.** Post-money SAFE conversion, option pool shuffle, pro-rata, board control, 1x non-participating preferences, CVC rights. A tested cap-table engine computes every number live.
- **Consequences you can see.** A lever won today can cost you tomorrow. The Journey shows the cap table round after round and what it is worth at the exit.
- **Learning built in.** Every acronym is clickable, each round opens with a concept and a worked example from the game's own numbers, the coach suggests negotiation strategies, the debrief has a quiz, and badges reward good negotiating habits (never points).
- **Fair play by design.** Confidential cards, envelopes, solutions and scoring cards live in the database, and each person receives only what their role and the game phase allow. See [docs/anti-cheat.md](docs/anti-cheat.md).

## Roles

| Role | Joins with | Sees and does |
|---|---|---|
| **Game master** | A free account (name, email, password), approved by the owner in the ops console | Creates games (1-3 rounds, 1-20 tables), runs phases and timer, projector, join cards with QR, CSV export |
| **Facilitator** | Game code + the PIN of their table | Only their tables: envelopes, live offers, both cards, the solution, the score form |
| **Squad** (startup or investors) | Game code + squad PIN (or QR) | Their own confidential card, term sheets and counter-offers, signing, the relationship vote, Journey, Learn, leaderboard |
| **Projector** | The game master's session | Timer, table status, rotating leagues, an announcement for every signature, the exit race |

The in-app instructions (book icon) show **only your role**, with a «right now» box that follows the game phase.

## Built for a real room

- **Connection.** If a phone loses the network it shows a red bar at once; what the player was writing stays put and the page catches up by itself when the network is back. If the realtime channel drops, the app checks every 5 seconds.
- **Same timer for everyone.** Timers follow the server clock, even on phones with the wrong time.
- **Room health.** Every device sends a heartbeat every 15 seconds: the game master sees green and red dots next to each name and a panel listing problems and how to fix them.
- **Joins lock.** Joins close by themselves when round 1 starts; the game master reopens them in one click for a latecomer.
- **Ops console (`/easteregg`).** An unlinked page, behind a password checked by the database, where the owner sees every game, squad, PIN and device, problems ranked by severity with how-to-fix popups, quick actions, a failure simulator and the pre-session checklist. Set the password in the Supabase SQL editor with `select ops_set_password('…');`: it never appears in the code.

## Free, and nothing kept

Nobody pays: the game runs on free static hosting and the Supabase free plan. Players create no accounts. Everything about a game, anonymous accounts included, **deletes itself 7 days after its last activity** (nightly `bvc_purge` job), or at once with «Delete the game». A short privacy notice is in the app at `/privacy`.

## Quick start

```bash
npm install
npm run dev        # without Supabase keys the app runs in demo mode, in your browser
npm test           # engine, scoring, phases, problem diagnosis
npm run test:db    # database security on a local Postgres (PGHOST, PGUSER)
npm run test:e2e   # full game and simulated failures in a browser (Playwright)
```

In demo mode, create a game from the organiser area and use **View as** (bottom right) to play every role from one window. The demo's `/easteregg` console uses the password `demo-ops-console`, or the one whose hash you put in `.env.demo.local` with `npm run ops:hash -- 'password'`.

## Deploy

Static frontend (Vite + React) on Cloudflare Pages, Netlify or Vercel, with security headers ready; Supabase for Postgres, auth and realtime. Step by step: [docs/deploy.md](docs/deploy.md).

## The scenario pack

A scenario has a **public part** (the story, the rounds, the levers and their options, learning content) and a **confidential pack** (squad cards, envelopes, solutions, sweet spots, scoring cards).

- The public part is in `src/content/` and is open.
- The confidential pack is `scenarios/<id>/private.js`. It is **git-ignored and never published**: the repository ships `private.sample.js`, with the same shape, placeholder text and different numbers, so the game runs and the tests pass without the real solutions. Organisers get the real pack from the scenario's maintainers.

How to write a scenario: [docs/scenario-format.md](docs/scenario-format.md).

## Learning design and sources

The game draws on open resources: Y Combinator's SAFE documents and user guide, YC's «Standard and Clean Series A Term Sheet» and Series A Guide, the NVCA Model Legal Documents, Index Ventures' open-source «Rewarding Talent» handbook and the Open Guide to Equity Compensation, plus classics such as *Getting to Yes* and *Venture Deals*. Explanations are original and simplified for teaching; they are not legal or financial advice. More: [docs/learning-design.md](docs/learning-design.md).

## Contributing

Translations, scenarios, learning content, accessibility and code are all welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Security or fair-play issues: [SECURITY.md](SECURITY.md).

## Project layout

```
src/engine/        cap-table model, scoring engine, leagues (+ tests). No confidential numbers.
src/content/       public scenario content and the learning layer (glossary, concepts, strategies, quizzes, badges)
src/lib/api/       supabase.js (production) and demo.js (same interface, in the browser)
src/pages/         Home, Admin, ControlRoom, Play, Facilitate, Screen, JoinCards
src/components/    TermSheet, Journey, Leaderboard, Learn, Coach, Help, Overlays
scenarios/<id>/    confidential pack (private.js, git-ignored) and its public sample
supabase/          schema with row level security, organiser allow-list, generated seed
scripts/           seed builder and the bundle leak check
docs/              deploy, scenario format, anti-cheat model, learning design
```

## Roadmap

- A scenario-agnostic engine, so new cases (biotech, deeptech, a down round) need data, not code
- Server-side scoring in a Supabase Edge Function
- More languages beyond Italian and English
- Facilitator analytics across editions

## License

Code: [MIT](LICENSE). Public learning and scenario content in `src/content/` and `docs/`: [CC BY-SA 4.0](LICENSE-CONTENT.md). Confidential scenario packs are not part of the open-source release. «Baby VC» and its logo are not covered by these licenses.
