# Deploy for free (about 30 minutes)

Baby VC Deal Room is open source and costs nothing to run: a static site on a free host and a free Supabase project. Game data is deleted automatically 7 days after a game's last activity.

## 1. Supabase (database, sign-in, live updates)

1. Create a project at [supabase.com](https://supabase.com). Pick an **EU region** (for example Frankfurt): the region cannot be changed later.
2. **SQL Editor**: run `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_ops.sql`.
   0002 also turns on `pg_cron` and schedules the nightly deletion (`bvc-purge`, 03:17). If your project refuses the extension, enable it under **Integrations → Cron** and run 0002 again.
3. Load the scenario pack: put the real `private.js` in `scenarios/flussi-energy/`, run `npm run seed:build`, then run the generated `supabase/seed_content.sql`. Do not commit either file.
4. **Authentication → Sign In / Providers**: enable **Anonymous sign-ins** (players and facilitators join without an account) and keep **Email** enabled (organiser login).
5. **Authentication → Rate Limits**: raise **anonymous sign-ins** to at least **300 per hour**.
   The default is 30 per hour per IP address, and a whole classroom shares one Wi-Fi IP: with the default, the 31st player cannot get in. Players who hit it see «Troppi ingressi dalla stessa rete».
6. **Create the owner**: Authentication → Users → *Add user* → *Create new user* with your email and a strong password, tick *Auto Confirm User*. Put the same email in `supabase/organisers.sql` and run it. Only emails on that list can create games. There is no default password.
7. **Ops console password** (the hidden `/easteregg` page). In the SQL editor, never in the app:
   ```sql
   select ops_set_password('choose a long password');
   ```
   Only a bcrypt hash is stored. 5 wrong passwords lock the console for 15 minutes for everyone; to unlock it early run `update ops_config set locked_until = null;`.
8. **Project Settings → API**: copy the *Project URL* and the *anon public key* (never the `service_role` key).

### The free plan pauses idle projects

A Supabase Free project with no activity for 7 days is paused, and while paused nobody can join. The evening before each session, open `/easteregg`: if it loads, the server is awake. If it is paused, press **Restore project** in the Supabase dashboard (a few minutes).

## 2. Static hosting

The app uses hash routing, so any static host works without rewrite rules. Build command `npm run build`, output folder `dist`, environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

| Host | Free plan | Security headers |
|---|---|---|
| **GitHub Pages** (used by the official site) | Free for public repositories; `.github/workflows/pages.yml` publishes every push to `main` | No custom headers: the build adds the Content Security Policy as a `<meta>` tag |
| **Cloudflare Pages** | Unlimited static requests and bandwidth, 500 builds a month | `public/_headers`, applied automatically |
| Netlify | Free tier | `public/_headers`, applied automatically |
| Vercel Hobby | Personal and non-commercial use only: fine for a free, open-source initiative; a paid course needs Pro | `vercel.json`, applied automatically |

The headers set a strict Content Security Policy (scripts only from the site, connections only to `*.supabase.co`), HSTS, no framing, no camera, microphone or location. Fonts are bundled with the site, so no visitor IP goes to Google.

If you run your own copy, replace `babyvc-dealroom/babyvc-dealroom.github.io` in `public/.well-known/security.txt` and `SECURITY.md` with your repository, and put your Supabase URL and anon key in `.env.production`.

## 3. Before every session

Open `/easteregg` → **Before the session**. It checks the server, the nightly deletion, expired data and database space by itself, and lists what only you can check: sign-in limit, project awake, EU region, a test join from a phone on mobile data, the room Wi-Fi, two-factor on your accounts, printed join cards.

## 4. During the session

- **Joins lock themselves** when the game master starts round 1: a new device (a second phone, a private window) cannot join with a PIN seen on a table. For a latecomer, press **Joins locked** in the control room to reopen, then lock again.
- 8 wrong PINs from one device block it for 10 minutes; 60 wrong PINs on one game in 10 minutes block new attempts on that game.
- Every device sends a heartbeat every 15 seconds. The game master sees green and red dots next to each name and a **Room health** panel with how to fix each problem; the owner sees every game in `/easteregg`.
- If a phone loses the network it shows a red bar at once, keeps what the player was writing, and catches up by itself when the network is back.
- Timers follow the server clock, so phones with a wrong clock still show the same seconds.

## 5. After the session

Export the CSV from the control room if you want to keep the results. The game, its squads, offers, devices and the anonymous accounts created for it are deleted 7 days after the last activity, or at once with **Delete the game**.

## Updating

- Code: push to GitHub, the host redeploys.
- Database: run any new file in `supabase/migrations/` in order.
- Scenario text or numbers: edit the pack, run `npm run seed:build`, run the new `seed_content.sql`.
- Organisers: add or remove emails in the `organisers` table.
