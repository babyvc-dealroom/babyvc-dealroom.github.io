// Spots problems from what the devices report, and says how to fix each one.
// Pure functions: the ops console feeds them every game, the game master's room feeds them one.

export const ONLINE_MS = 45000;   // three missed heartbeats
const GONE_MS = 2 * 60 * 60 * 1000;   // after two hours without a signal a device has simply left

const live = g => !['ended'].includes(g.phase);
const timed = g => !['lobby', 'ended'].includes(g.phase);

// Device state from its last heartbeat: online | offline | unknown (never reported).
export function deviceState(m, now) {
  if (!m.last_seen) return 'unknown';
  const age = now - new Date(m.last_seen).getTime();
  if (age > ONLINE_MS || m.client?.on === false) return age > GONE_MS ? 'gone' : 'offline';
  return 'online';
}
export function deviceIssues(m, now) {
  const c = m.client || {}, out = [];
  if (deviceState(m, now) === 'offline') out.push('offline');
  else if (deviceState(m, now) === 'online') {
    if (c.rt && c.rt !== 'SUBSCRIBED') out.push('realtime');
    if (c.fails >= 2) out.push('failing');
    if (c.lat > 1500) out.push('slow');
    if (Math.abs(c.skew || 0) > 30000) out.push('skew');
    if (c.errs > 0) out.push('error');
    if (c.vis === false) out.push('hidden');
  }
  return out;
}

const SEV = { critical: 0, warn: 1, info: 2 };
const who = m => m.name || (m.role === 'admin' ? 'Game master' : '?');

// g: { game, teams, members (with last_seen, client), results, fails10, blocked }
export function diagnoseGame(x, now, { forGm = false } = {}) {
  const g = x.game, out = [];
  const add = (kind, sev, extra = {}) => out.push({ id: `${g.id}:${kind}:${extra.user || extra.table || ''}`, kind, sev, game: g, ...extra });
  if (!live(g)) return out;
  const teamOf = id => x.teams.find(t => t.id === id);
  for (const m of x.members) {
    const t = teamOf(m.team_id);
    const where = m.role === 'admin' ? '' : m.role === 'facilitator' ? `Facilitator · ${(m.tables || []).join(', ')}` : t ? `${t.name} · T${t.table_no}` : '';
    for (const k of deviceIssues(m, now)) {
      if (k === 'hidden' && !timed(g)) continue;
      if (m.role === 'admin' && k === 'offline') { if (!forGm) add('gm_offline', 'critical', { user: m.user_id, who: who(m), where }); continue; }
      add(k, k === 'offline' || k === 'failing' || k === 'realtime' ? 'warn' : 'info', { user: m.user_id, who: who(m), where, client: m.client, last_seen: m.last_seen });
    }
  }
  if (g.phase_ends_at && timed(g) && now - new Date(g.phase_ends_at).getTime() > 120000)
    add('overdue', 'warn', { minutes: Math.round((now - new Date(g.phase_ends_at).getTime()) / 60000) });
  if (x.fails10 >= 10) add('pin_guessing', x.fails10 >= 30 ? 'critical' : 'warn', { count: x.fails10 });
  if (x.blocked > 0) add('blocked', 'warn', { count: x.blocked });
  if (timed(g) && !g.joins_locked) add('joins_open', 'info');
  if (timed(g)) for (const t of x.teams) {
    const n = x.members.filter(m => m.team_id === t.id).length;
    if (n === 0) add('empty_squad', 'warn', { table: t.id, where: `${t.name} · T${t.table_no}` });
    else if (n > 6) add('crowded_squad', 'info', { table: t.id, where: `${t.name} · T${t.table_no}`, count: n });
  }
  if (g.phase === 'debrief') {
    const unscored = (x.results || []).filter(r => r.round === g.round && r.status !== 'scored').map(r => r.table_no);
    if (unscored.length) add('unscored', 'info', { tables: unscored });
  }
  return out;
}

export function diagnose(ops, now) {
  const out = ops.games.flatMap(x => diagnoseGame(x, now));
  if (ops.badCodes10 >= 15) out.push({ id: 'bad_codes', kind: 'bad_codes', sev: 'warn', count: ops.badCodes10 });
  if (!ops.cron) out.push({ id: 'no_cron', kind: 'no_cron', sev: 'warn' });
  if (ops.oldGames > 0) out.push({ id: 'old_data', kind: 'old_data', sev: 'info', count: ops.oldGames });
  if (ops.dbBytes > 400 * 1024 * 1024) out.push({ id: 'db_size', kind: 'db_size', sev: 'warn' });
  if (ops.opsFails > 0) out.push({ id: 'ops_fails', kind: 'ops_fails', sev: 'info', count: ops.opsFails });
  return out.sort((a, b) => SEV[a.sev] - SEV[b.sev]);
}

// How to fix each problem: why it happens, the steps, and the console action that fixes it, if any.
// Entries without a detector are problems people report out loud; they are in the guide too.
export const PLAYBOOK = {
  offline: { t: ['Dispositivo offline', 'Device offline'], why: ['Il telefono non manda segnali da più di 45 secondi: Wi-Fi caduto, schermo spento o batteria scarica.', 'The phone has sent nothing for over 45 seconds: Wi-Fi dropped, screen off or low battery.'],
    steps: [['Chiedi alla persona se vede la barra rossa «Sei offline».', 'Ask the person whether they see the red «You are offline» bar.'], ['Riconnettere il Wi-Fi o passare ai dati del telefono; la pagina si riallinea da sola.', 'Reconnect the Wi-Fi or switch to mobile data; the page catches up by itself.'], ['Se il telefono è morto, il compagno di squadra continua: la squadra non perde nulla.', 'If the phone is dead, a teammate carries on: the squad loses nothing.']] },
  realtime: { t: ['Aggiornamenti in tempo reale fermi', 'Live updates stopped'], why: ['Il dispositivo è online ma il canale realtime è caduto (reti che bloccano i WebSocket, proxy aziendali).', 'The device is online but the realtime channel dropped (networks that block WebSockets, corporate proxies).'],
    steps: [['Non serve fare nulla subito: l\'app passa da sola al controllo ogni 5 secondi.', 'Nothing urgent: the app falls back to checking every 5 seconds by itself.'], ['Se dura, ricaricare la pagina.', 'If it lasts, reload the page.'], ['Se succede a molti, la rete della sala blocca i WebSocket: usare i dati del telefono.', 'If many devices have it, the room network blocks WebSockets: use mobile data.']] },
  failing: { t: ['Le richieste non arrivano', 'Requests not getting through'], why: ['Il dispositivo risulta online ma le ultime richieste al server sono fallite.', 'The device looks online but its last requests to the server failed.'],
    steps: [['Ricaricare la pagina.', 'Reload the page.'], ['Controllare la rete; se il problema è di tutti, controllare che il progetto Supabase non sia in pausa (vedi «Server in pausa»).', 'Check the network; if everyone has it, check that the Supabase project is not paused (see «Server paused»).']] },
  slow: { t: ['Rete lenta', 'Slow network'], why: ['Ogni richiesta impiega più di 1,5 secondi.', 'Each request takes more than 1.5 seconds.'],
    steps: [['Avvicinarsi al router o passare ai dati del telefono.', 'Move closer to the router or switch to mobile data.'], ['Se è lenta per tutti, la rete della sala è satura: chiedere di chiudere video e download.', 'If it is slow for everyone, the room network is saturated: ask people to stop videos and downloads.']] },
  skew: { t: ['Orologio del telefono sbagliato', 'Phone clock is wrong'], why: ['L\'ora del dispositivo differisce di oltre 30 secondi da quella del server.', 'The device time differs from the server by over 30 seconds.'],
    steps: [['Il timer è già corretto in automatico con l\'ora del server: nessuno resta indietro.', 'The timer is already corrected automatically with the server clock: nobody falls behind.'], ['Per sicurezza: Impostazioni → Data e ora → automatica.', 'To be safe: Settings → Date and time → automatic.']] },
  error: { t: ['Errore nell\'app', 'App error'], why: ['Sul dispositivo si è verificato un errore JavaScript.', 'A JavaScript error happened on the device.'],
    steps: [['Ricaricare la pagina: i dati sono sul server, non si perde nulla.', 'Reload the page: the data is on the server, nothing is lost.'], ['Se si ripete, annota il messaggio e il browser e apri una issue nel repository.', 'If it happens again, note the message and the browser and open an issue in the repository.']] },
  hidden: { t: ['App in secondo piano', 'App in the background'], why: ['La pagina non è visibile: la persona è su un\'altra app o ha bloccato lo schermo.', 'The page is not visible: the person is in another app or locked the screen.'],
    steps: [['Nessun problema tecnico: quando riapre la pagina si aggiorna subito.', 'No technical problem: when they reopen the page it refreshes at once.']] },
  gm_offline: { t: ['Il game master è offline', 'The game master is offline'], why: ['Senza game master le fasi non avanzano e il timer non si può allungare.', 'Without the game master phases do not move forward and the timer cannot be extended.'],
    steps: [['Su un altro dispositivo apri /admin e accedi con l\'email e la password da organizzatore.', 'On another device open /admin and sign in with the organiser email and password.'], ['Apri la partita dalla lista: la sala di controllo riprende esattamente dov\'era.', 'Open the game from the list: the control room picks up exactly where it was.']] },
  overdue: { t: ['Fase scaduta', 'Phase overdue'], why: ['Il timer è a zero da oltre 2 minuti e la fase non è avanzata.', 'The timer has been at zero for over 2 minutes and the phase has not moved on.'],
    steps: [['Ricorda al game master di premere «Avanti», o di aggiungere minuti se la sala ne ha bisogno.', 'Remind the game master to press «Next», or to add minutes if the room needs them.']] },
  pin_guessing: { t: ['Qualcuno prova PIN a caso', 'Someone is guessing PINs'], why: ['Molti PIN sbagliati in 10 minuti: errori di battitura in massa o un tentativo di entrare nella squadra avversaria.', 'Many wrong PINs in 10 minutes: mass typos or an attempt to get into the other squad.'],
    steps: [['Chiudere gli ingressi: chi è già dentro continua a giocare.', 'Lock joins: whoever is already in keeps playing.'], ['Se erano errori veri, far entrare le persone con il link della squadra (Accessi → Copia link).', 'If they were genuine typos, let people in with the squad link (Access → Copy link).']], action: 'lock_joins' },
  blocked: { t: ['Dispositivi bloccati', 'Devices blocked'], why: ['Dopo 8 PIN sbagliati un dispositivo non può entrare per 10 minuti.', 'After 8 wrong PINs a device cannot join for 10 minutes.'],
    steps: [['Se è una persona vera che ha sbagliato, sblocca i tentativi.', 'If it is a real person who mistyped, reset the attempts.'], ['Poi falle usare il link della squadra, così non digita il PIN.', 'Then have them use the squad link, so they do not type the PIN.']], action: 'reset_attempts' },
  joins_open: { t: ['Ingressi ancora aperti', 'Joins still open'], why: ['A partita iniziata un dispositivo nuovo (anche una finestra in incognito) può entrare con un PIN visto su un tavolo.', 'With the game running a new device (even a private window) can join with a PIN seen on a table.'],
    steps: [['Chiudi gli ingressi; li riapri in un clic per un ritardatario.', 'Lock joins; reopen them in one click for a latecomer.']], action: 'lock_joins' },
  empty_squad: { t: ['Squadra vuota', 'Empty squad'], why: ['Nessun dispositivo è entrato in questa squadra: il tavolo non può trattare.', 'No device has joined this squad: the table cannot negotiate.'],
    steps: [['Controlla che la join card di quella squadra sia sul tavolo giusto.', 'Check that the squad\'s join card is on the right table.'], ['Se gli ingressi sono chiusi, riaprili e fai entrare la squadra.', 'If joins are locked, reopen them and let the squad in.'], ['Se mancano persone, sposta i giocatori: a partita iniziata il game master li rimuove da «Accessi» e loro rientrano con il nuovo PIN.', 'If people are missing, move players: with the game running the game master removes them in «Access» and they rejoin with the new PIN.']], action: 'unlock_joins' },
  crowded_squad: { t: ['Squadra affollata', 'Crowded squad'], why: ['Più di 6 dispositivi nella stessa squadra: qualcuno potrebbe essere entrato con il PIN sbagliato.', 'Over 6 devices in one squad: someone may have used the wrong PIN.'],
    steps: [['Confronta i nomi con le persone al tavolo.', 'Compare the names with the people at the table.'], ['Chi è nel posto sbagliato si rimuove da «Accessi» e rientra con il PIN giusto.', 'Whoever is in the wrong place is removed from «Access» and rejoins with the right PIN.']] },
  unscored: { t: ['Tavoli firmati ma non valutati', 'Signed tables not scored yet'], why: ['Al debrief questi tavoli non hanno ancora i punti: la classifica è incompleta.', 'At the debrief these tables have no points yet: the leaderboard is incomplete.'],
    steps: [['Il facilitator del tavolo (o il game master in «Valuta i tavoli») compila la scheda.', 'The table facilitator (or the game master in «Score tables») fills in the form.']] },
  bad_codes: { t: ['Codici partita sbagliati', 'Wrong game codes'], why: ['Molti tentativi con codici inesistenti negli ultimi 10 minuti.', 'Many attempts with codes that do not exist in the last 10 minutes.'],
    steps: [['Se sei in sessione, controlla il codice proiettato: lettere come O e 0 non esistono nei codici, ma la gente le digita.', 'If a session is on, check the projected code: letters like O and 0 never appear in codes, but people type them.'], ['Se non c\'è sessione, è rumore dalla rete: i limiti bloccano chi insiste.', 'If no session is on, it is noise from the internet: the limits block whoever insists.']] },
  no_cron: { t: ['Cancellazione automatica non attiva', 'Automatic deletion not running'], why: ['Il job notturno che cancella le partite dopo 7 giorni non risulta programmato.', 'The nightly job that deletes games after 7 days is not scheduled.'],
    steps: [['In Supabase: Integrations → Cron → abilita pg_cron.', 'In Supabase: Integrations → Cron → enable pg_cron.'], ['Rilancia la migrazione 0002 oppure: select cron.schedule(\'bvc-purge\', \'17 3 * * *\', \'select public.bvc_purge(7)\');', 'Re-run migration 0002 or: select cron.schedule(\'bvc-purge\', \'17 3 * * *\', \'select public.bvc_purge(7)\');'], ['Nel frattempo usa «Cancella ora i dati vecchi».', 'Meanwhile use «Delete old data now».']], action: 'purge' },
  old_data: { t: ['Dati da cancellare', 'Data to delete'], why: ['Ci sono partite ferme da oltre 7 giorni: per la nostra informativa vanno cancellate.', 'Some games have been idle for over 7 days: our privacy notice says they get deleted.'],
    steps: [['Cancellale ora: partite, squadre, offerte, dispositivi e account anonimi collegati.', 'Delete them now: games, squads, offers, devices and the related anonymous accounts.']], action: 'purge' },
  db_size: { t: ['Database quasi pieno', 'Database almost full'], why: ['Il piano gratuito di Supabase arriva a 500 MB.', 'The Supabase free plan stops at 500 MB.'],
    steps: [['Cancella i dati vecchi.', 'Delete old data.'], ['Elimina le partite di prova che non servono più.', 'Delete test games you no longer need.']], action: 'purge' },
  ops_fails: { t: ['Password della console sbagliata', 'Wrong console password'], why: ['Qualcuno ha provato password sbagliate su questa console. Dopo 5 errori si blocca per 15 minuti.', 'Someone tried wrong passwords on this console. After 5 errors it locks for 15 minutes.'],
    steps: [['Se non eri tu, cambia la password dal SQL editor: select ops_set_password(\'…\');', 'If it was not you, change the password from the SQL editor: select ops_set_password(\'…\');']] },
  pending_requests: { t: ['Richieste di account in attesa', 'Account requests waiting'], why: ['Qualcuno ha creato un account per organizzare partite e aspetta la tua approvazione.', 'Someone created an account to run games and is waiting for your approval.'],
    steps: [['Apri la scheda «Account» e leggi chi è e come userà il gioco.', 'Open the «Accounts» tab and read who they are and how they will use the game.'], ['Approva solo chi conosci o chi ha un motivo credibile: un organizzatore vede le soluzioni del caso.', 'Approve only people you know or with a credible reason: an organiser sees the case solutions.']] },
  // Reported out loud, no detector:
  signin_limit: { t: ['«Troppi ingressi dalla stessa rete»', '«Too many joins from the same network»'], why: ['Supabase limita gli accessi anonimi per indirizzo IP: tutta l\'aula esce dallo stesso Wi-Fi.', 'Supabase caps anonymous sign-ins per IP address: the whole room shares one Wi-Fi.'],
    steps: [['Subito: chi è bloccato entra con i dati del telefono.', 'Right away: whoever is blocked joins on mobile data.'], ['Prima della prossima sessione: Supabase → Authentication → Rate Limits → alza gli accessi anonimi (es. 300 all\'ora).', 'Before the next session: Supabase → Authentication → Rate Limits → raise anonymous sign-ins (e.g. 300 per hour).']] },
  paused: { t: ['Server in pausa', 'Server paused'], why: ['Sul piano gratuito Supabase mette in pausa i progetti senza attività per 7 giorni: nessuno riesce a entrare.', 'On the free plan Supabase pauses projects idle for 7 days: nobody can get in.'],
    steps: [['Apri la dashboard di Supabase e premi «Restore project»: ci vogliono pochi minuti.', 'Open the Supabase dashboard and press «Restore project»: it takes a few minutes.'], ['La sera prima di ogni sessione apri questa console: se si carica, il server è sveglio.', 'The evening before every session open this console: if it loads, the server is awake.']] },
  wrong_squad: { t: ['«Sono nella squadra sbagliata»', '«I am in the wrong squad»'], why: ['In sala d\'attesa si cambia squadra liberamente; dopo l\'inizio no, per evitare che qualcuno legga la carta avversaria.', 'In the lobby people switch squads freely; after the start they cannot, so nobody reads the other side\'s card.'],
    steps: [['Il game master apre «Accessi» e rimuove la persona.', 'The game master opens «Access» and removes the person.'], ['Se gli ingressi sono chiusi, li riapre; la persona rientra con il PIN giusto; poi li richiude.', 'If joins are locked, reopen them; the person rejoins with the right PIN; then lock them again.']] },
  projector: { t: ['Il proiettore non si aggiorna', 'The projector does not update'], why: ['La scheda del proiettore ha perso la connessione o il computer è andato in standby.', 'The projector tab lost its connection or the computer went to sleep.'],
    steps: [['Ricarica la pagina del proiettore.', 'Reload the projector page.'], ['Disattiva lo standby del computer per la durata della sessione.', 'Turn off sleep on the computer for the session.']] },
};
