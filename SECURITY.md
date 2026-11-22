# Security and fair play

## Reporting a vulnerability

Please do **not** open a public issue for security problems or ways to cheat. Write to the maintainers at the private advisory form of the repository (**Security → Report a vulnerability**, also linked from `/.well-known/security.txt`) with steps to reproduce. We aim to answer within a week and will credit you if you wish.

In scope:

- Reading data your role should not see (another squad's card, an envelope not yet opened, a solution, sweet spots or scoring cards, another table's live deal, PINs).
- Writing data your role should not write (scores, phases, offers for the other squad, results of a table you do not facilitate).
- Becoming game master or facilitator without the right credentials.
- Confidential content reaching the production bundle.
- Getting into the ops console (`/easteregg`) without the password, or reading its data.

## What the platform guarantees

The rules are enforced by the database (Postgres row level security and security-definer functions), not only by the user interface. The full model, and what is deliberately out of scope, is in [docs/anti-cheat.md](docs/anti-cheat.md).

## Demo mode

The demo build (`npm run build:demo`) keeps everything in the browser and includes the confidential pack it was built from. It is a rehearsal tool for organisers: do not share a demo built from a real pack with players.
