# Contributing to Baby VC Deal Room

Thank you for helping people learn venture capital by playing it. Every kind of contribution counts: a typo, a translation, a clearer explanation, a new scenario, a bug fix.

## Ground rules

1. **Never commit a confidential pack.** `scenarios/*/private.js` and `supabase/seed_content.sql` are git-ignored. If you are working with a real pack, double-check `git status` before every commit. CI fails if confidential text reaches the production bundle (`npm run build:check`).
2. **Learning content is original.** Write explanations in your own words, keep them short, and cite the open source that inspired them (`SOURCES` in `src/content/learn.js`). Do not copy text from books, articles or legal templates.
3. **Not advice.** The game simplifies on purpose. Mark teaching assumptions as such in the UI (see the ROFR haircut in the exit).
4. **Fair play first.** Anything a player could use to read the other squad's card, a solution or another table's live deal is a bug: report it privately (see [SECURITY.md](SECURITY.md)).
5. Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

```bash
npm install
npm run dev            # demo mode: no backend, everything in your browser
npm test               # engine and scoring tests (kit-solution tests are skipped on the sample pack)
npm run build:check    # production build + confidential-content leak check
```

To work against Supabase, copy `.env.example` to `.env.local` and follow [docs/deploy.md](docs/deploy.md).

## Where things live

| You want to change | Look at |
|---|---|
| Cap-table math, conversion, waterfall | `src/engine/model.js` + `engine.test.js` |
| Scoring rules (not the numbers) | `src/engine/scoring.js` |
| Public scenario text, levers, options, coach tips | `src/content/public.js` |
| Glossary, concepts, strategies, quizzes, badges, sources | `src/content/learn.js` |
| Who can read or write what | `supabase/migrations/0001_init.sql` (row level security and RPCs) |
| Role-specific instructions | `src/components/Help.jsx` |

## Translations

Every text is a pair `L('italiano', 'English')` or `{ it, en }`. To add a language, extend the pairs with a new key, add it to `LangSwitch` in `src/lib/i18n.jsx`, and translate the public content and the sample pack. Keep sentences short: players read them on a phone during a timed negotiation.

## Writing a scenario

Read [docs/scenario-format.md](docs/scenario-format.md). Open an issue with the «Scenario proposal» template first: we will agree on the case, the levers and who maintains the confidential pack.

## Pull requests

- One topic per PR, with a short description of what changes for players, facilitators or game masters.
- Tests pass (`npm test`) and the leak check passes (`npm run build:check`).
- Screenshots for visible changes, in Italian and English.
- New learning content cites its source.
