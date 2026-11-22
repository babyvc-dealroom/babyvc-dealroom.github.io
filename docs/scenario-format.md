# Scenario format

A scenario is one startup and up to three financing rounds. It has two parts.

## 1. Public part (open source)

`src/content/public.js`, `ROUNDS[round]`:

| Field | What it is |
|---|---|
| `name`, `color`, `icon` | Round label and colour |
| `ticket`, `instrument`, `investors`, `year` | The round in one line |
| `sheet`, `kpis` | Public sheet both squads read |
| `levers.<key>` | `label`, `unit`, `opening` (the investors' opening term), `stake` (what is at stake), and for ladder levers the five `options`, from investor-friendly to startup-friendly |
| `preAgreed` | Closed terms; reopening one costs a concession |

Learning content for the scenario goes in `src/content/learn.js`: three `CONCEPTS` per round with a live `example`, two `QUIZ` questions per round, glossary entries, sources.

The cap-table model is in `src/engine/model.js`: `LEVER_SHAPES` (keys, types, public slider ranges), `OPENING` (public reference terms) and the round functions. The ranges must match `bvc_valid_terms()` in the SQL migration.

**Never put a confidential number in the public part.** Worked examples must use terms that are not the sweet spot.

## 2. Confidential pack (not in the repository)

`scenarios/<id>/private.js` exports `SECRETS`, an array of rows `{ round, kind, audience, body }`:

| kind | audience | body |
|---|---|---|
| `card_startup`, `card_investor` | `startup` / `investor` | `{ walk, it: {...}, en: {...} }`: title, objectives, levers `[lever, target, walk-away]`, BATNA, private information, leverage, trade currency. `walk` drives the in-app walk-away warnings: `{ cap: { min }, pre: { max }, rights: { forbid: [0] }, founders: 0.5 }` |
| `env_A`, `env_B`, `env_spare` | `startup`, `investor` or `all` | `{ it: { title, text }, en: {...} }` |
| `solution` | `staff` | ZOPA, sweet spot, envelope handling, debrief questions, typical mistakes |
| `sweet` | `reveal` | `{ terms: {...} }`: the round's sweet spot. Players receive it once the round is over; it is the default for rounds a table did not sign |
| `scoring` | `staff` | `{ cards: [...] }`: one card per lever. Numeric: `{ key, type: 'num', lo, hi, dir: 'up'|'down', band: [a, b], noBreach?, check? }`. Ladder: `{ key, type: 'opt', pts: [[startupPoints, { band?, f?, i? }], ...] }` where `f` / `i` mark the option as breaching the startup's / investors' walk-away |

Keep a `private.sample.js` next to it with the same shape, placeholder text and different numbers, so that contributors can run the game.

## Loading a pack

```bash
npm run seed:build      # writes supabase/seed_content.sql from private.js (or the sample)
```

Run the generated file in the Supabase SQL editor. It is git-ignored: do not commit it.

## Checklist for a new scenario

- [ ] The sweet spot of each round is inside every scoring band (`npm test` checks it)
- [ ] Each walk-away in the cards matches the scoring cards' breach flags
- [ ] `npm run build:check` passes with the real pack in place
- [ ] Both languages are complete
- [ ] Concepts and quizzes cite open sources
