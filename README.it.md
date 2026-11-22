# Baby VC Deal Room

**Un gioco open source per imparare il venture capital negoziandolo.**
Squadre di founder e di investitori portano una startup, Flussi Energy, da un SAFE pre-seed alla Series A e all'exit. Quello che firmano diventa il punto di partenza del round successivo: cap table, diluizione e valore dell'exit sono la conseguenza dei loro accordi.

**Online: [babyvc-dealroom.github.io](https://babyvc-dealroom.github.io)**

[English](README.md) | MIT (codice) | CC BY-SA 4.0 (contenuti didattici pubblici)

## Perché

I founder vedono il primo term sheet quando conta di più. Gli investitori imparano un deal alla volta. La Deal Room trasforma questo apprendimento in un gioco da due ore, per un'aula, un bootcamp o un acceleratore:

- **Meccaniche vere.** Conversione del SAFE post-money, option pool shuffle, pro-rata, controllo del board, preference 1x non partecipante, diritti della CVC. Un motore di cap table testato calcola ogni numero dal vivo.
- **Conseguenze visibili.** Una leva vinta oggi può costare domani. Il Journey mostra il cap table round dopo round e quanto vale all'exit.
- **Apprendimento integrato.**
  - ogni sigla è cliccabile;
  - ogni round si apre con un concetto e un esempio calcolato sui numeri del gioco;
  - il coach suggerisce strategie di negoziazione;
  - il debrief ha un quiz;
  - i badge premiano le buone abitudini, senza mai dare punti.
- **Gioco leale per costruzione.** Carte riservate, buste, soluzioni e griglie di punteggio stanno nel database: ognuno riceve solo ciò che il suo ruolo e la fase consentono. Vedi [docs/anti-cheat.md](docs/anti-cheat.md).

## Come accede ognuno

| Chi | Dove | Con cosa |
|---|---|---|
| Game master | «Organizza una partita» | un account gratuito (nome, email, password), approvato dall'owner nella console |
| Facilitator | pagina iniziale | codice partita + PIN del suo tavolo (vede solo quel tavolo) |
| Squadra | pagina iniziale | codice partita + PIN della squadra, oppure il QR della join card |
| Proiettore | pulsante del game master | la sessione del game master |

**Non esiste una password predefinita.** Ogni organizzatore crea il proprio account dal sito e l'owner lo approva nella console `/easteregg`; l'owner stesso è nella lista `organisers`. Codici e PIN si generano a ogni partita e li vede solo il game master, nella scheda «Accessi».

Le istruzioni nell'app (icona del libro) mostrano **solo il tuo ruolo**, con un riquadro «Adesso» che segue la fase.

## Pensato per un'aula vera

- **Connessione.** Se un telefono perde la rete compare subito una barra rossa; quello che il giocatore stava scrivendo resta lì e la pagina si riallinea da sola quando torna internet. Se il canale in tempo reale cade, l'app controlla ogni 5 secondi.
- **Timer uguali per tutti.** Seguono l'orologio del server, anche sui telefoni con l'ora sbagliata.
- **Durata della sessione.** Scegli 1 h, 1 h 30, 2 h o 2 h 30 e i minuti di ogni fase si adattano; nella sala di controllo vedi quanto manca e a che ora finisci.
- **Rientro con un tocco.** Chi chiude il browser riapre il sito e trova «Torna al gioco», senza codice né PIN. Durante la partita lo schermo del telefono resta acceso.
- **Salute della sala.** Ogni dispositivo manda un segnale ogni 15 secondi: il game master vede pallini verdi e rossi accanto ai nomi e un pannello con i problemi e come risolverli.
- **Ingressi chiusi.** All'inizio del round 1 gli ingressi si chiudono da soli; il game master li riapre in un clic per chi arriva tardi.
- **Console operativa (`/easteregg`).** Una pagina non linkata, protetta da password verificata dal database, dove l'owner vede tutte le partite, le squadre, i PIN e i dispositivi, con un elenco dei problemi in ordine di gravità, popup su come risolverli, azioni rapide, un simulatore di guasti e la lista di controllo prima della sessione. La password si imposta nel SQL editor di Supabase con `select ops_set_password('…');` e non compare mai nel codice.

## Gratis e senza dati da conservare

Nessuno paga: il gioco gira su un hosting statico gratuito e sul piano gratuito di Supabase. I giocatori non creano account. Tutti i dati di una partita, compresi gli account anonimi, si **cancellano da soli 7 giorni dopo l'ultima attività** (job notturno `bvc_purge`), oppure subito con «Elimina la partita». L'[informativa breve](src/pages/Privacy.jsx) è nell'app, alla pagina `/privacy`.

## Avvio rapido

```bash
npm install
npm run dev        # senza chiavi Supabase parte in modalità demo, nel browser
npm test           # motore, punteggio, fasi, diagnosi dei problemi
npm run test:db    # sicurezza del database su un Postgres locale (PGHOST, PGUSER)
npm run test:e2e   # partita completa e guasti simulati nel browser (Playwright)
```

In demo crea una partita dall'area organizzatori e usa **Guarda come** (in basso a destra) per giocare ogni ruolo dalla stessa finestra. La console `/easteregg` della demo usa la password `demo-ops-console`, oppure quella di cui metti l'hash in `.env.demo.local` con `npm run ops:hash -- 'password'`.

## Deploy

Frontend statico (Vite + React) su Cloudflare Pages, Netlify o Vercel, con intestazioni di sicurezza già pronte; Supabase per database, login e tempo reale. I passi sono in [docs/deploy.md](docs/deploy.md).

## Il pacchetto dello scenario

Uno scenario ha una **parte pubblica** (storia, round, leve e opzioni, contenuti didattici) e un **pacchetto riservato** (carte delle squadre, buste, soluzioni, sweet spot, griglie di punteggio).

- La parte pubblica è in `src/content/` ed è aperta.
- Il pacchetto riservato è `scenarios/<id>/private.js`: è **escluso da git e mai pubblicato**. Il repository contiene `private.sample.js`, con la stessa struttura, testi segnaposto e numeri diversi, così il gioco gira e i test passano senza le soluzioni vere. Gli organizzatori ricevono il pacchetto vero da chi mantiene lo scenario.

Come si scrive uno scenario: [docs/scenario-format.md](docs/scenario-format.md).

## Fonti

Il gioco si ispira a risorse aperte:
- i documenti SAFE di Y Combinator con la loro user guide;
- il «Standard and Clean Series A Term Sheet» e la Series A Guide di YC;
- gli NVCA Model Legal Documents;
- «Rewarding Talent» di Index Ventures;
- la Open Guide to Equity Compensation;
- i classici *Getting to Yes* e *Venture Deals*.

Le spiegazioni sono originali e semplificate a scopo didattico: non sono consulenza legale o finanziaria. Vedi [docs/learning-design.md](docs/learning-design.md).

## Contribuire

Traduzioni, scenari, contenuti didattici, accessibilità e codice sono benvenuti: leggi [CONTRIBUTING.md](CONTRIBUTING.md) e il [Codice di condotta](CODE_OF_CONDUCT.md). Problemi di sicurezza o modi per imbrogliare vanno segnalati in privato: [SECURITY.md](SECURITY.md).

## Licenza

Codice: [MIT](LICENSE). Contenuti didattici e di scenario pubblici: [CC BY-SA 4.0](LICENSE-CONTENT.md). I pacchetti riservati non fanno parte del rilascio open source. Il nome e il logo «Baby VC» non sono coperti da queste licenze.
