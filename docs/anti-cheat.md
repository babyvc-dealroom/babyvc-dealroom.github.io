# Fair play: the anti-cheat model

Players are smart and curious, and some will open the browser's developer tools. The rule of the Deal Room is simple: **whatever a player must not know is never sent to their browser.** The database decides, not the screen.

## Who receives what, and when

| Information | Players | Facilitator | Game master |
|---|---|---|---|
| Public sheet of the round, lever options, learning content | always (it is in the open-source bundle) | always | always |
| Own squad's confidential card | from the round's start (not in the lobby, never future rounds) | both squads' cards | both |
| The other squad's card | **never** | yes | yes |
| Envelopes | only when opened, only the squads they are addressed to | own tables | all |
| Solution (ZOPA, debrief) | **never** | yes | yes |
| Scoring cards (ZOPA bounds, bands, ladders) | **never** | yes | yes |
| Sweet spot of a round | only **after** that round is over | yes | yes |
| Offers | own table only | own tables only | all |
| Another table's signed deal and score | only after the round is over (debrief) | yes | yes |
| Relationship votes | own vote only, then the received vote as points | own tables | all |
| PINs and organiser allow-list | **never** | **never** | PINs yes, allow-list in Supabase only |

All of this is implemented in `supabase/migrations/0001_init.sql`:

- Confidential content sits in `scenario_secrets`, a table with row level security and **no policies**: clients cannot read it at all. It reaches people only through `my_cards()` and `open_envelope()`, which check the caller's role, squad, tables and the game phase.
- Every other table has row level security. Helper functions (`bvc_team`, `bvc_can_table`, `bvc_round_over`) are `security definer` to avoid recursion and are the single source of truth for permissions.

## Rules that stop the usual tricks

| Trick | What stops it |
|---|---|
| Reading the solution or the scoring cards in the JavaScript bundle | They are not in the code. The engine is generic; numbers come from the database to staff only. CI runs `npm run build:check`, which fails if any confidential string from the pack appears in `dist/`. |
| Reading the real pack on GitHub | `scenarios/*/private.js` is git-ignored; the repository ships a sample with different numbers. |
| Joining the other squad with its PIN to read its card | After the lobby, a player cannot switch squad or table (`TEAM_LOCKED`). Only the game master can remove someone. PINs are visible to the game master only. |
| …from a private window or a second phone (a new identity) | Joins lock themselves when round 1 starts (`JOINS_LOCKED`): only devices already in the game can come back. The game master reopens them in one click for a latecomer. |
| Guessing PINs | 8 wrong PINs per device in 10 minutes, 60 per game, then `TOO_MANY_ATTEMPTS`. A PIN has 32⁵ ≈ 33 million combinations. Attempts are logged and shown in the ops console. |
| Renaming your squad mid-game to confuse the leaderboard | Players rename only in the lobby; the game master always. |
| Becoming facilitator or game master | Facilitator PINs are per table and only unlock that table. No PIN ever grants game master rights. |
| Opening an organiser account during a session to read the solutions | Anyone can create an account, but it can create games (and so see solutions and cards) only after the owner approves it in `/easteregg` → Accounts. Auto-approve exists and is off by default, with a warning. |
| Sending a forged offer (absurd values, extra clauses, missing levers) | `bvc_valid_terms()` accepts only the round's three levers, inside the public slider ranges, with integer option indexes. |
| Signing your own offer, or the other squad's on its behalf | `accept_offer()` only accepts an open offer from the other squad of your own table, in the current round and phase. |
| Peeking at other tables' deals to anchor | Other tables' results are hidden until the debrief; the «signed» announcement carries no terms. |
| Changing scores or phases | Results are written by the facilitator of that table or the game master; phases by the game master only. |
| Inflating relationship votes | One vote per squad per round, only for your own table, and only the other squad's vote counts for you. |
| Farming badges | Badges give no points. |
| Opening the ops console (`/easteregg`) | The password is checked by the database against a bcrypt hash; it is never in the code. 5 wrong passwords lock the console for 15 minutes for everyone. |
| Reading other devices' health data | Heartbeats are written only through `bvc_heartbeat()`, for games you belong to; only the game master and the ops console can read them. |

## Out of scope (by design)

- **Talking.** Squads negotiate out loud; what they choose to reveal is part of the game. Bluffing on intentions is allowed, inventing facts costs points and is judged by the facilitator.
- **Physical cards.** If you print cards, keep them face down.
- **Demo mode.** A demo build keeps everything in the browser and includes the pack it was built from. It is for organisers' rehearsals.
- **Supabase project access.** Anyone with access to your Supabase dashboard can read everything: give it only to organisers.

Found a gap? Please report it privately: [SECURITY.md](../SECURITY.md).
