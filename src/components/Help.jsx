import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { ROUNDS } from '../content/public.js';
import Icon from './Icon.jsx';
import { startTour } from './Spotlight.jsx';

// Instructions for ONE person: their role, their squad or tables, and the phase the game is in now.
// ctx: { role: 'join' | 'gm-home' } or { snap } from inside a game.
export function content(ctx, L, lx) {
  const snap = ctx.snap;
  const role = snap ? (snap.me.role === 'admin' ? 'gm' : snap.me.role === 'facilitator' ? 'fac' : 'player') : ctx.role;
  const g = snap?.game, phase = g?.phase;
  const team = snap?.teams.find(t => t.id === snap.me.team_id);
  const other = team && snap.teams.find(t => t.table_no === team.table_no && t.role !== team.role);
  const roundName = g && lx(ROUNDS[g.round].name);

  if (role === 'join') return {
    title: L('Come entrare', 'How to join'),
    now: L('Ti servono due codici, che ti dà il game master: il codice partita e il tuo PIN.', 'You need two codes from the game master: the game code and your PIN.'),
    steps: [
      L('Scrivi il codice partita: 6 caratteri, lo trovi anche sullo schermo della sala.', 'Type the game code: 6 characters, also shown on the room screen.'),
      L('Scrivi il tuo PIN: 5 caratteri. È il PIN della tua squadra, oppure del tuo tavolo se sei facilitator.', 'Type your PIN: 5 characters. It is your squad\'s PIN, or your table\'s if you are a facilitator.'),
      L('Scrivi il tuo nome e premi «Entra».', 'Type your name and press «Join».'),
      L('Hai una join card? Inquadra il QR: codice e PIN si compilano da soli.', 'Got a join card? Scan the QR: code and PIN fill in by themselves.'),
    ],
    note: L('Dentro la partita, questo stesso pulsante ti mostra le istruzioni del tuo ruolo.', 'Inside the game, this same button shows the instructions for your role.'),
    faq: [
      [L('Ho chiuso il browser: come rientro?', 'I closed the browser: how do I get back in?'), L('Riapri il sito dallo stesso telefono: in cima trovi «Torna al gioco». Un tocco e sei di nuovo nella tua squadra, senza codice né PIN.', 'Reopen the site on the same phone: at the top you find «Back to the game». One tap and you are back in your squad, no code or PIN.')],
      [L('Devo creare un account?', 'Do I need an account?'), L('No. L\'account serve solo a chi organizza la partita.', 'No. Only whoever runs the game needs an account.')],
    ],
  };

  if (role === 'gm-account') return {
    title: L('Account da organizzatore', 'Organiser account'),
    now: L('Serve solo a chi conduce una partita. I giocatori non si registrano.', 'Only whoever runs a game needs one. Players never sign up.'),
    steps: [
      L('«Crea un account»: nome, email e una password di almeno 8 caratteri. Scuola o azienda e come userai il gioco sono facoltativi, ma aiutano ad approvarti in fretta.', '«Create an account»: name, email and a password of at least 8 characters. School or company and how you will use the game are optional, but they help get you approved quickly.'),
      L('Chi gestisce la piattaforma approva ogni nuovo organizzatore a mano, perché chi conduce una partita vede le soluzioni del caso.', 'Whoever runs the platform approves each new organiser by hand, because whoever runs a game sees the case solutions.'),
      L('Una volta approvato, torna qui e accedi: trovi «Nuova partita».', 'Once approved, come back and sign in: «New game» is there.'),
    ],
    faq: [
      [L('Ho dimenticato la password', 'I forgot my password'), L('Scrivi a chi gestisce la piattaforma: la reimposta per te.', 'Write to whoever runs the platform: they reset it for you.')],
      [L('Come cancello i miei dati?', 'How do I delete my data?'), L('«Elimina il mio account» cancella l\'account e tutte le tue partite, subito.', '«Delete my account» deletes the account and all your games, at once.')],
    ],
  };

  if (role === 'gm-home') return {
    title: L('Sei l\'organizzatore', 'You are the organiser'),
    now: L('Crea una partita con «Nuova partita». Ci vogliono 30 secondi.', 'Create a game with «New game». It takes 30 seconds.'),
    steps: [
      L('Scegli quanti round (da 1 a 3) e quanti tavoli. Ogni tavolo ha una squadra startup e una squadra investitori.', 'Choose how many rounds (1 to 3) and tables. Each table has a startup squad and an investor squad.'),
      L('Dai un nome alle squadre, o tieni quelli proposti.', 'Name the squads, or keep the suggested names.'),
      L('Scegli quanto dura la sessione: 1 h, 1 h 30, 2 h o 2 h 30. I minuti di ogni fase si adattano e vedi a che ora finisci; puoi ritoccarli uno per uno.', 'Pick how long the session lasts: 1 h, 1 h 30, 2 h or 2 h 30. Each phase adapts and you see when you will finish; you can fine-tune them one by one.'),
      L('Premi «Crea la partita».', 'Press «Create the game».'),
      L('Dentro la partita trovi i codici da dare a tutti.', 'Inside the game you find the codes to hand out.'),
    ],
    faq: [
      [L('Quante partite posso avere?', 'How many games can I have?'), L('Fino a 5 in corso. Le partite ferme da 7 giorni si cancellano da sole.', 'Up to 5 running. Games idle for 7 days delete themselves.')],
      [L('Come elimino il mio account?', 'How do I delete my account?'), L('In fondo a questa pagina, «Elimina il mio account»: cancella anche tutte le tue partite.', 'At the bottom of this page, «Delete my account»: it also deletes all your games.')],
    ],
  };

  if (role === 'player') {
    const startup = team?.role === 'startup';
    const now = {
      lobby: L('Aspettate che il game master apra il primo round. Intanto potete cambiare il nome della squadra.', 'Wait for the game master to open the first round. Meanwhile you can rename your squad.'),
      brief: L('Aprite «Le carte» e leggete la vostra carta riservata. Segnatevi il vostro limite (walk-away).', 'Open «Your cards» and read your confidential card. Note your limit (walk-away).'),
      negotiate: L('In «Il tavolo» mandate un term sheet o rispondete a quello dell\'altra squadra.', 'In «The table» send a term sheet or answer the other squad\'s.'),
      sign: L('Se c\'è un accordo, firmatelo. Poi votate l\'altra squadra da 0 a 10.', 'If you have a deal, sign it. Then vote the other squad from 0 to 10.'),
      debrief: L('Guardate il punteggio e la classifica. Il prossimo round parte da quello che avete firmato.', 'Look at your score and the leaderboard. The next round starts from what you signed.'),
      exit: L('Aprite «Journey» e guardate quanto vale la vostra exit.', 'Open «Journey» and see what your exit is worth.'),
      ended: L('La partita è finita. In «Classifica» trovate il risultato finale.', 'The game is over. «Leaderboard» has the final result.'),
    }[phase];
    return {
      title: startup ? L(`Siete la startup ${team.name}`, `You are the startup ${team.name}`) : L(`Siete gli investitori ${team?.name}`, `You are the investors ${team?.name}`),
      sub: L(`Tavolo ${team?.table_no}, contro ${other?.name}. Giocate sempre questo ruolo.`, `Table ${team?.table_no}, against ${other?.name}. You always play this role.`),
      now, phaseLabel: g && !['lobby', 'exit', 'ended'].includes(phase) ? roundName : null,
      steps: [
        L('Leggete la vostra carta in «Le carte». È riservata: non mostratela all\'altra squadra.', 'Read your card in «Your cards». It is confidential: do not show it to the other squad.'),
        L('Per fare un\'offerta muovete le 3 leve in «Il tavolo» e premete «Manda il term sheet».', 'To make an offer, move the 3 levers in «The table» and press «Send the term sheet».'),
        L('Quando arriva un\'offerta avete tre scelte: Firma, Controproposta, Rifiuta.', 'When an offer arrives you have three choices: Sign, Counter, Reject.'),
        L('Dopo la firma votate l\'altra squadra da 0 a 10.', 'After signing, vote the other squad from 0 to 10.'),
        L('Il facilitator vi dà il punteggio: compare da solo sullo schermo.', 'The facilitator gives you your score: it appears on your screen by itself.'),
        L('Non conoscete una sigla? Le parole sottolineate si spiegano con un clic. In «Impara» trovate concetti, strategie e glossario.', 'Unknown acronym? Underlined words explain themselves with a click. «Learn» has concepts, strategies and the glossary.'),
      ],
      watch: startup
        ? L('Il vostro limite: dopo il seed i founder devono avere almeno il 50%, dopo la Series A il 38%. L\'anteprima sotto le leve ve lo mostra prima di mandare.', 'Your limit: after the seed the founders need at least 50%, after the Series A 38%. The preview under the levers shows it before you send.')
        : L('Il vostro limite è nella carta riservata (walk-away). Se una leva lo supera diventa rossa: firmarla vi fa perdere punti.', 'Your limit is on your confidential card (walk-away). A lever that breaches it turns red: signing it costs you points.'),
      points: L('Firmare vale 20 punti. Ogni leva vale 15 punti da dividere con l\'altra squadra. Bonus per entrambi se trovate un accordo equilibrato. Inventare un fatto costa 10 punti.', 'Signing is worth 20 points. Each lever is worth 15 points split with the other squad. Bonus for both if you find a balanced deal. Inventing a fact costs 10 points.'),
      faq: [
        [L('Ho chiuso la pagina', 'I closed the page'), L('Riapri lo stesso indirizzo dallo stesso telefono: sei ancora dentro.', 'Open the same address on the same phone: you are still in.')],
        [L('Sono nella squadra sbagliata', 'I am in the wrong squad'), L('Torna all\'ingresso e rientra con il PIN giusto.', 'Go back to the entrance and join with the right PIN.')],
        [L('Troppi consigli o suoni', 'Too many tips or sounds'), L('Spegnili con il fumetto e l\'altoparlante in alto.', 'Turn them off with the speech bubble and the speaker at the top.')],
      ],
    };
  }

  if (role === 'fac') {
    const tables = snap.me.tables || [];
    const now = {
      lobby: L('Controlla che le due squadre del tuo tavolo siano entrate.', 'Check that both squads at your table have joined.'),
      brief: L('Leggi ad alta voce «cosa si porta dietro» (in fondo, Journey del tavolo). Dai un\'occhiata alla soluzione.', 'Read aloud what carries over (bottom of the page, table journey). Glance at the solution.'),
      negotiate: L('Apri la busta A dopo le prime offerte e la busta B al minuto 9. Segui le offerte del tuo tavolo.', 'Open Envelope A after the first offers and Envelope B at minute 9. Follow your table\'s offers.'),
      sign: L('Controlla leve, scambi e voti, poi premi «Salva e mostra il punteggio».', 'Check levers, trades and votes, then press «Save and reveal the score».'),
      debrief: L('Fai le domande del debrief (sono nella soluzione). Suggerisci al game master lo scambio migliore.', 'Ask the debrief questions (in the solution). Suggest the best trade to the game master.'),
      exit: L('Aiuta le squadre a leggere la loro exit nel Journey.', 'Help the squads read their exit in the Journey.'),
      ended: L('La partita è finita. Grazie!', 'The game is over. Thank you!'),
    }[phase];
    return {
      title: L('Sei il facilitator', 'You are the facilitator'),
      sub: tables.length > 1 ? L(`Segui i tavoli ${tables.join(', ')}.`, `You follow tables ${tables.join(', ')}.`) : L(`Segui il tavolo ${tables[0]}.`, `You follow table ${tables[0]}.`),
      now, phaseLabel: g && !['lobby', 'exit', 'ended'].includes(phase) ? roundName : null,
      steps: [
        L('Vedi solo i tuoi tavoli: le loro offerte, le due carte riservate e la soluzione.', 'You only see your tables: their offers, both confidential cards and the solution.'),
        L('Apri le buste con i pulsanti gialli. Ogni busta arriva solo alla squadra giusta.', 'Open envelopes with the yellow buttons. Each one reaches only the right squad.'),
        L('Se il tavolo firma nell\'app, le leve sono già compilate. Se firma su carta, inseriscile tu.', 'If the table signs in the app, the levers are prefilled. If it signs on paper, enter them yourself.'),
        L('Scegli il voto per gli scambi e controlla i voti delle squadre: arrivano da soli.', 'Pick the trades score and check the squads\' votes: they arrive by themselves.'),
        L('Premi «Salva e mostra il punteggio». Puoi correggere e salvare di nuovo.', 'Press «Save and reveal the score». You can correct and save again.'),
      ],
      faq: [
        [L('Non vedo un tavolo', 'I cannot see a table'), L('Ti serve il PIN facilitator di quel tavolo: chiedilo al game master e rientra.', 'You need that table\'s facilitator PIN: ask the game master and join again.')],
        [L('Il tavolo non ha firmato', 'The table did not sign'), L('Scegli «No deal» o «No deal argomentato» e salva.', 'Pick «No deal» or «Well-argued no deal» and save.')],
      ],
    };
  }

  // game master inside a game
  const now = {
    lobby: L('Dai i codici a tutti (scheda «Accessi» o join card), apri il proiettore, poi premi «Avanti».', 'Hand out the codes («Access» tab or join cards), open the projector, then press «Next».'),
    brief: L('Le squadre leggono le carte. Premi «Avanti» quando sono pronte.', 'The squads read their cards. Press «Next» when they are ready.'),
    negotiate: L('Segui i tavoli nella scheda «Sala». Se serve, aggiungi tempo con «+1 min».', 'Follow the tables in the «Room» tab. Add time with «+1 min» if needed.'),
    sign: L('Valuta i tavoli senza facilitator in «Valuta i tavoli».', 'Score tables without a facilitator in «Score tables».'),
    debrief: L('Commenta la classifica al proiettore. «Avanti» apre il round successivo.', 'Comment on the leaderboard on the projector. «Next» opens the next round.'),
    exit: L('Il proiettore mostra la gara dell\'exit. Poi chiudi la partita.', 'The projector shows the exit race. Then close the game.'),
    ended: L('Scarica il CSV dei risultati. Elimina la partita quando non ti serve più.', 'Download the results CSV. Delete the game when you no longer need it.'),
  }[phase];
  return {
    title: L('Sei il game master', 'You are the game master'),
    sub: L(`Partita «${g.name}», codice ${g.code}.`, `Game «${g.name}», code ${g.code}.`),
    now, phaseLabel: !['lobby', 'exit', 'ended'].includes(phase) ? roundName : null,
    steps: [
      L('«Avanti» passa alla fase successiva e fa partire il timer.', '«Next» moves to the next phase and starts the timer.'),
      L('Nella scheda «Accessi» trovi i PIN: uno per squadra e uno per il facilitator di ogni tavolo.', 'The «Access» tab has the PINs: one per squad and one for each table\'s facilitator.'),
      L('«Proiettore» apre la vista per lo schermo della sala.', '«Projector» opens the view for the room screen.'),
      L('Puoi aprire una busta a tutti i tavoli insieme dalla barra in alto.', 'You can open an envelope at every table at once from the top bar.'),
      L('Doppio clic su una fase della barra per saltarci.', 'Double-click a phase in the bar to jump to it.'),
      L('Al via del round 1 gli ingressi si chiudono da soli. Il pulsante con il lucchetto li riapre per chi arriva tardi.', 'When round 1 starts, joins lock by themselves. The padlock button reopens them for latecomers.'),
      L('«Salute della sala» ti dice chi è offline e cosa fare: pallino verde collegato, rosso offline.', '«Room health» tells you who is offline and what to do: green dot connected, red offline.'),
      L('In alto vedi quanto manca alla fine della sessione e a che ora finirai: «+1 min» lo sposta.', 'At the top you see how much of the session is left and when it will end: «+1 min» moves it.'),
    ],
    faq: [
      [L('Come entrano gli altri?', 'How do the others join?'), L('Dalla pagina d\'ingresso, con il codice partita e il loro PIN. Le join card hanno il QR.', 'From the entrance page, with the game code and their PIN. Join cards have a QR.')],
      [L('Qualcuno è entrato nel posto sbagliato', 'Someone joined the wrong place'), L('Rimuovilo da «Accessi», riapri gli ingressi se sono chiusi e dagli il PIN giusto.', 'Remove them from «Access», reopen joins if they are locked and give them the right PIN.')],
      [L('Un ritardatario non riesce a entrare', 'A latecomer cannot join'), L('Gli ingressi sono chiusi: premi il lucchetto, fallo entrare, poi richiudi.', 'Joins are locked: press the padlock, let them in, then lock again.')],
      [L('Mi si è spento il computer', 'My computer died'), L('Da un altro dispositivo apri l\'area organizzatori, accedi con email e password e riapri la partita: riprende dov\'era.', 'From another device open the organiser area, sign in with email and password and reopen the game: it picks up where it was.')],
    ],
  };
}

export function openHelp() { window.dispatchEvent(new Event('bvc-help')); }

export default function HelpDrawer({ ctx }) {
  const { L, lx } = useLang();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true), key = e => e.key === 'Escape' && setOpen(false);
    addEventListener('bvc-help', on); addEventListener('keydown', key);
    return () => { removeEventListener('bvc-help', on); removeEventListener('keydown', key); };
  }, []);
  const c = content(ctx || { role: 'join' }, L, lx);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="help-veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <motion.aside className="help" role="dialog" aria-modal="true" aria-label={c.title} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
            <div className="help-head">
              <div><h2>{c.title}</h2>{c.sub && <p>{c.sub}</p>}</div>
              <button type="button" className="iconbtn" onClick={() => setOpen(false)} aria-label={L('Chiudi', 'Close')}><Icon name="x" /></button>
            </div>
            {c.now && <div className="help-now"><b>{L('Adesso', 'Right now')}{c.phaseLabel ? `, ${c.phaseLabel}` : ''}</b><p>{c.now}</p></div>}
            <h3>{L('Cosa fai', 'What you do')}</h3>
            <ol className="help-steps">{c.steps.map((s, i) => <li key={i}><span>{i + 1}</span><p>{s}</p></li>)}</ol>
            {c.watch && <div className="help-watch"><Icon name="alert" /><p>{c.watch}</p></div>}
            {c.points && <><h3>{L('I punti, in breve', 'Points, in short')}</h3><p className="help-p">{c.points}</p></>}
            {c.faq && <><h3>{L('Se qualcosa non va', 'If something goes wrong')}</h3><dl className="help-faq">{c.faq.map(([q, a], i) => <div key={i}><dt>{q}</dt><dd>{a}</dd></div>)}</dl></>}
            {c.note && <p className="help-p muted">{c.note}</p>}
            {ctx?.snap && <button type="button" className="btn ghost" onClick={() => { setOpen(false); startTour(); }}><Icon name="play" /> {L('Rivedi il tour guidato', 'Replay the guided tour')}</button>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Short tour shown once per role on first entry.
const L2 = (it, en) => ({ it, en });
export const TOUR = {
  player: [L2('Leggete la vostra carta riservata nella scheda «Le carte».', 'Read your confidential card in the «Your cards» tab.'), L2('In «Il tavolo» mandate term sheet e controproposte con le 3 leve.', 'In «The table» send term sheets and counter-offers with the 3 levers.'), L2('Firma la squadra che riceve l\'offerta. Poi votate la relazione.', 'The squad receiving the offer signs it. Then vote the relationship.'), L2('Il libro in alto vi dice sempre cosa fare adesso.', 'The book at the top always tells you what to do now.')],
  facilitator: [L2('Vedi solo i tavoli del tuo PIN.', 'You only see the tables of your PIN.'), L2('Apri le buste A, B e riserva al momento giusto: arrivano solo alla squadra destinataria.', 'Open Envelopes A, B and spare at the right moment: they reach only the intended squad.'), L2('Dopo la firma valuta il tavolo e premi «Salva e mostra il punteggio».', 'After signing, score the table and press «Save and reveal the score».'), L2('Il libro in alto ti dice sempre cosa fare adesso.', 'The book at the top always tells you what to do now.')],
  admin: [L2('In «Accessi» trovi i PIN delle squadre e un PIN facilitator per tavolo.', 'In «Access» you find the squad PINs and one facilitator PIN per table.'), L2('Apri il proiettore sullo schermo della sala.', 'Open the projector on the room screen.'), L2('«Avanti» passa alla fase successiva e fa partire il timer.', '«Next» moves to the next phase and starts the timer.'), L2('Il libro in alto ti dice sempre cosa fare adesso.', 'The book at the top always tells you what to do now.')],
};
