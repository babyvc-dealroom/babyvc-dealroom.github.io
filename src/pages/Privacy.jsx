import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n.jsx';
import Shell from '../components/Shell.jsx';
import Icon from '../components/Icon.jsx';

// Short privacy notice. The organisation running a session is the data controller and fills in its name.
export default function Privacy() {
  const { L } = useLang();
  const rows = [
    [L('Cosa salviamo', 'What we store'), L('Il nome che scrivi entrando (puoi usare un soprannome), la squadra, le offerte e le note che mandi, i punteggi. Per tenere in piedi la connessione ogni dispositivo manda ogni 15 secondi un segnale con stato della rete, latenza, tipo di dispositivo e browser, ultimo errore dell\'app.', 'The name you type when joining (a nickname is fine), your squad, the offers and notes you send, the scores. To keep the connection healthy each device sends a signal every 15 seconds with network state, latency, device type and browser, the last app error.')],
    [L('Cosa non salviamo', 'What we do not store'), L('Nessun account, email o password per chi gioca: entri con un codice e un PIN. Nessun cookie pubblicitario, nessun tracciamento, nessuna analisi di terze parti.', 'No account, email or password for players: you join with a code and a PIN. No advertising cookies, no tracking, no third-party analytics.')],
    [L('Chi organizza le partite', 'People who run games'), L('Chi crea un account da organizzatore ci lascia nome, email, password (salvata cifrata da Supabase) e, se vuole, organizzazione e una nota su come userà il gioco. Servono solo a far entrare l\'account e a decidere se approvarlo. L\'account si elimina in qualsiasi momento da «Elimina il mio account», insieme a tutte le sue partite; un account mai approvato e non usato per 12 mesi si cancella da solo.', 'Whoever creates an organiser account gives us a name, email, password (stored hashed by Supabase) and, optionally, an organisation and a note on how they will use the game. They are used only to sign in and to decide whether to approve the account. The account can be deleted at any time from «Delete my account», with all its games; an account never approved and unused for 12 months deletes itself.')],
    [L('Quando lo cancelliamo', 'When we delete it'), L('Tutto ciò che riguarda una partita si cancella da solo 7 giorni dopo l\'ultima attività, insieme agli account anonimi creati per giocare. Il game master può cancellare la partita prima, in qualsiasi momento.', 'Everything about a game deletes itself 7 days after its last activity, together with the anonymous accounts created to play. The game master can delete the game sooner, at any time.')],
    [L('Dove sono i dati', 'Where the data is'), L('Nel database Supabase dell\'organizzazione che gestisce la sessione, in una regione dell\'Unione europea. Il sito è servito da un hosting statico. I font sono ospitati sul sito stesso: nessuna richiesta a Google.', 'In the Supabase database of the organisation running the session, in a European Union region. The site is served by static hosting. Fonts are hosted on the site itself: no requests to Google.')],
    [L('Perché', 'Why'), L('Solo per far funzionare il gioco durante la sessione formativa.', 'Only to run the game during the training session.')],
    [L('I tuoi diritti', 'Your rights'), L('Puoi chiedere al game master o all\'organizzazione della sessione di vedere o cancellare subito i tuoi dati.', 'You can ask the game master or the organisation running the session to see or delete your data at once.')],
  ];
  return (
    <Shell>
      <article className="privacy">
        <h1><Icon name="shield" /> {L('Privacy, in breve', 'Privacy, in short')}</h1>
        <p className="hint">{L('Baby VC Deal Room è un progetto open source e gratuito. Nessuno paga, nessuno vende dati.', 'Baby VC Deal Room is a free, open-source project. Nobody pays, nobody sells data.')}</p>
        <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <Link className="btn" to="/">{L('Torna all\'ingresso', 'Back to the entrance')}</Link>
      </article>
    </Shell>
  );
}
