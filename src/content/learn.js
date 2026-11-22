// Learning layer: glossary, concepts per round, negotiation strategies, quizzes and sources. Public content (CC BY-SA 4.0).
// Explanations are original and simplified for teaching; they are not legal or investment advice.
import { journey, round1, exitProceeds } from '../engine/model.js';

const L = (it, en) => ({ it, en });

// ---------- SOURCES (open resources the game draws on) ----------
export const SOURCES = {
  ycSafe: { org: 'Y Combinator', title: L('Documenti SAFE e Post-Money SAFE User Guide', 'Safe financing documents and Post-Money Safe User Guide'), url: 'https://www.ycombinator.com/documents',
    what: L('I modelli gratuiti del SAFE e la guida con esempi di calcolo della quota.', 'The free SAFE templates and the guide with worked ownership examples.') },
  ycTerm: { org: 'Y Combinator', title: L('Un term sheet di Series A standard e pulito', 'A Standard and Clean Series A Term Sheet'), url: 'https://www.ycombinator.com/series_a_term_sheet',
    what: L('Un term sheet di una pagina con note su cosa è «buono» per i founder, board compreso.', 'A one-page term sheet with notes on what «good» looks like for founders, board included.') },
  ycGuide: { org: 'Y Combinator', title: L('YC Series A Guide', 'YC\'s Series A Guide'), url: 'https://blog.ycombinator.com/ycs-series-a-guide/',
    what: L('Come prepararsi, gestire il processo e chiudere una Series A.', 'How to prepare, run the process and close a Series A.') },
  nvca: { org: 'NVCA', title: L('Model Legal Documents', 'Model Legal Documents'), url: 'https://nvca.org/model-legal-documents/',
    what: L('I modelli di riferimento per term sheet e patti dei round VC negli Stati Uniti, gratuiti.', 'The free US reference models for VC term sheets and financing agreements.') },
  index: { org: 'Index Ventures', title: L('Rewarding Talent: guida alle stock option', 'Rewarding Talent: the founder\'s guide to stock options'), url: 'https://www.indexventures.com/rewardingtalent',
    what: L('Manuale open source su ESOP e stock option nelle startup europee.', 'Open-source handbook on ESOPs and stock options in European startups.') },
  ogec: { org: 'Open Guide', title: L('The Open Guide to Equity Compensation', 'The Open Guide to Equity Compensation'), url: 'https://github.com/jlevy/og-equity-compensation',
    what: L('Guida aperta e collaborativa a equity, opzioni, vesting e preference.', 'Open, collaborative guide to equity, options, vesting and preferences.') },
  gty: { org: 'Fisher, Ury, Patton', title: L('Getting to Yes (libro)', 'Getting to Yes (book)'), url: null,
    what: L('Il classico della negoziazione: interessi, opzioni, criteri oggettivi, BATNA.', 'The negotiation classic: interests, options, objective criteria, BATNA.') },
  vd: { org: 'Feld, Mendelson', title: L('Venture Deals (libro)', 'Venture Deals (book)'), url: null,
    what: L('Le clausole dei term sheet spiegate una per una, dal punto di vista di founder e VC.', 'Term sheet clauses explained one by one, from founders\' and VCs\' points of view.') },
};

// ---------- GLOSSARY: every acronym and concept of the game. cat = section in the Learn tab ----------
const G = (cat, it, en, alias = []) => ({ cat, it, en, alias });
export const GLOSSARY = {
  // round economics
  'SAFE': G('round', 'Simple Agreement for Future Equity: l\'investitore paga oggi e riceve azioni al prossimo round. Nel SAFE post-money la quota è investimento / cap.', 'Simple Agreement for Future Equity: the investor pays today and gets shares at the next round. In a post-money SAFE the stake is investment / cap.'),
  'Valuation cap': G('round', 'Valutazione massima a cui il SAFE converte. Cap più alto = meno diluizione per i founder.', 'Maximum valuation at which the SAFE converts. Higher cap = less dilution for the founders.', ['cap']),
  'Discount': G('round', 'Sconto sul prezzo del round successivo per chi ha investito con il SAFE (qui 20%).', 'Discount on the next round\'s price for SAFE investors (20% here).', ['sconto']),
  'MFN': G('round', 'Most Favoured Nation: se più avanti dai condizioni migliori a un altro investitore SAFE, le ottiene anche lui.', 'Most Favoured Nation: if you later give better terms to another SAFE investor, this one gets them too.'),
  'Pre-money': G('round', 'Valore della società prima dei nuovi soldi.', 'Company value before the new money.'),
  'Post-money': G('round', 'Pre-money più i soldi del round. Quota del nuovo investitore = investimento / post-money.', 'Pre-money plus the round\'s money. New investor stake = investment / post-money.'),
  'Fully diluted': G('round', 'Conteggio delle azioni che include opzioni, pool e strumenti convertibili, come se fossero già azioni.', 'Share count that includes options, the pool and convertibles as if they were already shares.'),
  'Cap table': G('round', 'La tabella di chi possiede cosa: founder, investitori, team.', 'The table of who owns what: founders, investors, team.'),
  'Dilution': G('round', 'La riduzione della tua percentuale quando entrano nuove azioni. La quota scende, ma può valere di più.', 'The shrinking of your percentage when new shares come in. The stake falls, but it can be worth more.', ['diluizione']),
  'Ticket': G('round', 'L\'importo che un investitore mette nel round.', 'The amount an investor puts into the round.'),
  'Tranche': G('round', 'Soldi versati in più rate, legate a obiettivi (milestone).', 'Money paid in instalments tied to milestones.'),
  // team and equity
  'ESOP': G('team', 'Employee Stock Option Plan: le azioni riservate al team. Se le crei nel pre-money le pagano i soci attuali.', 'Employee Stock Option Plan: shares reserved for the team. Created in the pre-money, existing shareholders pay for it.'),
  'Option pool': G('team', 'Lo stesso pool dell\'ESOP. Ogni punto di pool creato nel pre-money costa ai founder circa un punto.', 'The same pool as the ESOP. Each point of pool created in the pre-money costs the founders about one point.', ['pool']),
  'Option pool shuffle': G('team', 'Il trucco di gonfiare il pool nel pre-money: il prezzo headline sale, quello reale per i founder scende.', 'The trick of inflating the pool in the pre-money: the headline price rises, the real one for founders falls.'),
  'Vesting': G('team', 'Le azioni si «guadagnano» nel tempo (spesso 4 anni). Chi se ne va prima ne perde una parte.', 'Shares are «earned» over time (often 4 years). Whoever leaves early loses part of them.'),
  'Cliff': G('team', 'Periodo iniziale (spesso 12 mesi) prima del quale non matura nulla.', 'Initial period (often 12 months) before anything vests.'),
  'Good/bad leaver': G('team', 'Regole su quanto vengono pagate le azioni di chi esce, a seconda del motivo.', 'Rules on what a leaver\'s shares are paid, depending on why they leave.', ['good/bad leaver', 'bad leaver']),
  'Dead equity': G('team', 'Quote di chi non lavora più nella società. Pesano sul cap table e spaventano i fondi successivi.', 'Shares held by people no longer working in the company. They weigh on the cap table and scare later funds.'),
  'Buyback': G('team', 'La società ricompra azioni da un socio, spesso per liberare spazio nel cap table.', 'The company buys shares back from a shareholder, often to free room in the cap table.'),
  // rights and protections
  'Pro-rata': G('rights', 'Diritto di investire nei round futuri per mantenere la propria quota.', 'Right to invest in future rounds to keep one\'s stake.', ['pro rata']),
  'Super pro-rata': G('rights', 'Diritto di investire più della propria quota nei round futuri. Toglie spazio ai nuovi investitori.', 'Right to invest beyond one\'s stake in future rounds. It takes room from new investors.'),
  'Preferred': G('rights', 'Azioni privilegiate degli investitori: hanno diritti che le azioni ordinarie dei founder non hanno.', 'Investors\' preferred shares: they carry rights the founders\' common shares do not.', ['preferred shares', 'azioni privilegiate']),
  'Liquidation preference': G('rights', 'All\'exit l\'investitore riprende prima i suoi soldi (1x) oppure converte e divide pro quota, se gli conviene di più.', 'At exit the investor first takes its money back (1x) or converts and shares pro rata, whichever pays more.', ['preference', '1x non-participating']),
  'Pari passu': G('rights', 'Sullo stesso piano: le diverse serie di investitori vengono rimborsate insieme, in proporzione.', 'On equal footing: different investor series are repaid together, in proportion.'),
  'Anti-dilution': G('rights', 'Protegge l\'investitore se un round futuro ha un prezzo più basso. La «broad-based weighted average» è la versione più equilibrata.', 'Protects the investor if a future round is priced lower. «Broad-based weighted average» is the most balanced version.', ['broad-based weighted average']),
  'Information rights': G('rights', 'Diritto di ricevere report periodici: KPI, budget, cassa.', 'Right to receive periodic reports: KPIs, budget, cash.', ['diritti di informazione']),
  // governance
  'Board': G('governance', 'Il consiglio che prende le decisioni importanti. Chi ha la maggioranza ha il controllo.', 'The council that takes the big decisions. Whoever holds the majority has control.', ['board seat']),
  'Observer': G('governance', 'Partecipa al board senza voto.', 'Attends the board without a vote.'),
  'Independent director': G('governance', 'Consigliere scelto di comune accordo, né founder né investitore. Spesso decide gli equilibri.', 'Director agreed by both sides, neither founder nor investor. Often the swing vote.', ['independent', 'indipendente']),
  'Veto': G('governance', 'Decisioni che richiedono il consenso degli investitori (protective provisions). Meglio se limitate alle materie straordinarie.', 'Decisions that need the investors\' consent (protective provisions). Best kept to extraordinary matters.', ['vetoes', 'veti']),
  'Drag-along': G('governance', 'Se la maggioranza vende, la minoranza deve vendere alle stesse condizioni.', 'If the majority sells, the minority must sell on the same terms.'),
  'Tag-along': G('governance', 'Se un socio vende, gli altri possono vendere insieme a lui.', 'If a shareholder sells, the others may sell alongside.'),
  'Key person': G('governance', 'Clausola legata alla permanenza delle persone chiave, come i founder.', 'Clause tied to key people, such as the founders, staying.'),
  // exit and strategic
  'ROFR': G('exit', 'Right of First Refusal: diritto di comprare alle stesse condizioni di un\'offerta terza. Scoraggia gli altri compratori.', 'Right of First Refusal: right to buy on the same terms as a third-party offer. It chills other buyers.'),
  'ROFN': G('exit', 'Right of First Negotiation: diritto di essere avvisati e trattare per primi, senza pareggiare. I compratori restano in gara.', 'Right of First Negotiation: right to be told and negotiate first, without matching. Buyers stay in the race.'),
  'Exclusivity': G('exit', 'Divieto di lavorare con i concorrenti del partner. Senza volumi garantiti è una gabbia.', 'Ban on working with the partner\'s competitors. Without guaranteed volumes it is a cage.', ['esclusiva']),
  'Take-or-pay': G('exit', 'Impegno a pagare un volume minimo anche se non lo si usa: il prezzo giusto per un\'esclusiva.', 'Commitment to pay for a minimum volume even if unused: the fair price of an exclusivity.'),
  'Exit': G('exit', 'La vendita della società (o la quotazione): il momento in cui le quote diventano euro.', 'The sale of the company (or IPO): when stakes turn into euros.'),
  'CVC': G('actors', 'Corporate Venture Capital: il fondo di una grande azienda. Porta clienti, ma ha interessi strategici.', 'Corporate Venture Capital: a large company\'s fund. It brings customers, but has strategic interests.'),
  // actors
  'VC': G('actors', 'Venture capital: fondi che investono in startup ad alto potenziale in cambio di quote.', 'Venture capital: funds investing in high-potential startups in exchange for stakes.'),
  'Angel': G('actors', 'Persona che investe soldi propri nelle prime fasi.', 'Individual investing their own money at the earliest stages.', ['angels', 'angel syndicate']),
  'Lead investor': G('actors', 'L\'investitore che guida il round: negozia i termini e mette il ticket più grande.', 'The investor leading the round: it negotiates the terms and writes the biggest ticket.', ['lead']),
  'Club deal': G('actors', 'Più investitori privati che entrano insieme attraverso un unico veicolo.', 'Several private investors coming in together through one vehicle.'),
  'LP': G('actors', 'Limited Partner: chi mette i soldi nel fondo VC (fondi pensione, family office…).', 'Limited Partner: whoever puts money in the VC fund (pension funds, family offices…).', ['LPs']),
  'IC': G('actors', 'Investment Committee: il comitato del fondo che approva gli investimenti e i loro limiti.', 'Investment Committee: the fund\'s committee that approves investments and their limits.'),
  'SFDR': G('actors', 'Regolamento europeo sulla sostenibilità dei fondi. Un fondo «Art. 9» deve avere obiettivi d\'impatto.', 'EU regulation on fund sustainability. An «Art. 9» fund must pursue impact objectives.'),
  // financing alternatives
  'Venture debt': G('round', 'Debito per startup finanziate da VC, spesso con warrant. Allunga la runway senza diluire molto.', 'Debt for VC-backed startups, often with warrants. Extends runway with little dilution.'),
  'Warrant': G('round', 'Diritto di comprare azioni in futuro a un prezzo fissato.', 'Right to buy shares in the future at a set price.', ['warrant coverage']),
  'RBF': G('round', 'Revenue-based financing: un prestito rimborsato con una percentuale dei ricavi.', 'Revenue-based financing: a loan repaid with a share of revenue.', ['revenue-based financing']),
  // metrics
  'ARR': G('metrics', 'Annual Recurring Revenue: ricavi ricorrenti su base annua.', 'Annual Recurring Revenue: recurring revenue on a yearly basis.'),
  'NRR': G('metrics', 'Net Revenue Retention: quanto spendono oggi i clienti di un anno fa. Sopra 100% = crescono da soli.', 'Net Revenue Retention: what last year\'s customers spend today. Above 100% = they grow by themselves.'),
  'Burn': G('metrics', 'Quanta cassa brucia la società ogni mese.', 'How much cash the company burns each month.', ['burn rate']),
  'Runway': G('metrics', 'Quanti mesi di vita restano con la cassa attuale: cassa / burn.', 'How many months the current cash lasts: cash / burn.'),
  'Gross margin': G('metrics', 'Quanto resta dei ricavi dopo i costi diretti.', 'What is left of revenue after direct costs.', ['margine']),
  'VPP': G('metrics', 'Virtual power plant: tanti impianti piccoli gestiti come una sola centrale.', 'Virtual power plant: many small assets run as one power plant.', ['virtual power plant']),
  // negotiation
  'Term sheet': G('negotiation', 'Il documento (quasi tutto non vincolante) con i termini principali dell\'investimento.', 'The (mostly non-binding) document with the main terms of the investment.'),
  'BATNA': G('negotiation', 'Best Alternative To a Negotiated Agreement: cosa fai se non firmi. Più è forte, più puoi spingere.', 'Best Alternative To a Negotiated Agreement: what you do if you do not sign. The stronger it is, the harder you can push.'),
  'ZOPA': G('negotiation', 'Zone Of Possible Agreement: lo spazio tra i walk-away delle due parti.', 'Zone Of Possible Agreement: the space between the two sides\' walk-aways.'),
  'Walk-away': G('negotiation', 'Il punto oltre il quale non firmi. Superarlo azzera i tuoi punti di valore conquistato.', 'The point beyond which you do not sign. Breaching it zeroes your claim-value points.'),
  'Anchoring': G('negotiation', 'Il primo numero sul tavolo condiziona tutta la trattativa.', 'The first number on the table shapes the whole negotiation.', ['ancoraggio']),
  'Sweet spot': G('negotiation', 'L\'accordo che resta dentro i limiti di entrambi e massimizza il valore comune.', 'The deal that stays within both sides\' limits and maximises joint value.'),
  'No-shop': G('negotiation', 'Periodo in cui la startup non può trattare con altri investitori.', 'Period during which the startup may not talk to other investors.'),
  'Exploding offer': G('negotiation', 'Term sheet con scadenza brevissima, per mettere pressione.', 'Term sheet with a very short expiry, to apply pressure.', ['exploding term sheet']),
};
export const GLOSSARY_CATS = {
  round: L('Economia del round', 'Round economics'), team: L('Team ed equity', 'Team and equity'), rights: L('Diritti degli investitori', 'Investor rights'),
  governance: L('Governance', 'Governance'), exit: L('Exit e accordi strategici', 'Exit and strategic deals'), actors: L('Chi c\'è al tavolo', 'Who is at the table'),
  metrics: L('Metriche', 'Metrics'), negotiation: L('Negoziazione', 'Negotiation'),
};

// ---------- CONCEPTS: three per round, each with a worked example computed by the game's own model ----------
// example(T) gets the language helpers { L, pc, eur, eurk } and returns a sentence with live numbers.
export const CONCEPTS = {
  1: [
    { id: 'safe', title: L('Il SAFE post-money: la quota è un\'equazione', 'The post-money SAFE: the stake is an equation'), source: 'ycSafe',
      body: L('Con il SAFE post-money la quota degli investitori è fissata subito: investimento diviso cap. Non dipende dal round successivo. Per questo il cap è la prima leva che guardano tutti.', 'With a post-money SAFE the investors\' stake is fixed at once: investment divided by cap. It does not depend on the next round. That is why everyone looks at the cap first.'),
      example: ({ L, pc }) => { const a = round1({ cap: 3.5 }).s, b = round1({ cap: 6 }).s; return L(`€600k con cap €3,5M = ${pc(a)}; con cap €6M = ${pc(b)}.`, `€600k at a €3.5M cap = ${pc(a)}; at €6M = ${pc(b)}.`); } },
    { id: 'pool', title: L('Chi paga l\'ESOP', 'Who pays for the ESOP'), source: 'index',
      body: L('Il team va pagato anche in azioni. La domanda vera non è «quanto pool» ma «dalle tasche di chi»: dai founder, da un socio uscito, o da tutti.', 'The team is paid in shares too. The real question is not «how big a pool» but «out of whose pocket»: the founders, a departed co-founder, or everyone.'),
      example: ({ L, pc }) => { const a = journey({ cap: 4.0, deadEquity: 0 }, { pre: 9.5, pool: 12 }).r2.founders, b = journey({ cap: 4.0, deadEquity: 4 }, { pre: 9.5, pool: 12 }).r2.founders; return L(`Luca a zero ed ESOP sui founder: founder al ${pc(a)} dopo il seed. Luca che tiene il 10%: ${pc(b)}.`, `Luca to zero and ESOP on the founders: founders at ${pc(a)} after the seed. Luca keeping 10%: ${pc(b)}.`); } },
    { id: 'prorata', title: L('Il pro-rata di oggi è lo spazio di domani', 'Today\'s pro-rata is tomorrow\'s room'), source: 'ycSafe',
      body: L('Un diritto di pro-rata lascia all\'investitore una parte del prossimo round. Un super pro-rata ne prende ancora di più: e gli altri investitori del round restano con meno spazio.', 'A pro-rata right reserves part of the next round for the investor. A super pro-rata takes even more, leaving less room for the round\'s other investors.'),
      example: ({ L, eurk }) => { const a = journey({ cap: 4.0, rights: 0 }).r2.clubM, b = journey({ cap: 4.0, rights: 2 }).r2.clubM; return L(`Al seed il Club avrebbe ${eurk(a)} con un super pro-rata 2x, ${eurk(b)} con un pro-rata standard.`, `At the seed the Club would get ${eurk(a)} with a 2x super pro-rata, ${eurk(b)} with a standard pro-rata.`); } },
  ],
  2: [
    { id: 'prepost', title: L('Pre-money, post-money e prezzo vero', 'Pre-money, post-money and the real price'), source: 'vd',
      body: L('Il nuovo investitore ottiene investimento / post-money. Ma se il pre-money «include» un pool nuovo, il prezzo che pagano davvero i founder è più basso di quello scritto.', 'The new investor gets investment / post-money. But if the pre-money «includes» a new pool, the price founders really get is lower than the headline.'),
      example: ({ L, pc }) => L(`€1,8M di Lumen su €8M pre (post €11M) = ${pc(1.8 / 11)}; su €12M pre (post €15M) = ${pc(1.8 / 15)}.`, `Lumen's €1.8M at €8M pre (post €11M) = ${pc(1.8 / 11)}; at €12M pre (post €15M) = ${pc(1.8 / 15)}.`) },
    { id: 'shuffle', title: L('L\'option pool shuffle', 'The option pool shuffle'), source: 'index',
      body: L('Ogni punto di pool creato nel pre-money lo pagano i soci di oggi. Dimensionare il pool su un piano di assunzioni reale è il modo pulito di negoziarlo.', 'Each point of pool created in the pre-money is paid by today\'s shareholders. Sizing the pool on a real hiring plan is the clean way to negotiate it.'),
      example: ({ L, pc }) => { const a = journey({ cap: 4.0, deadEquity: 1, rights: 1 }, { pre: 10, pool: 8 }).r2.founders, b = journey({ cap: 4.0, deadEquity: 1, rights: 1 }, { pre: 10, pool: 14 }).r2.founders; return L(`Stesso pre-money di €10M: pool 8% = founder al ${pc(a)}; pool 14% = ${pc(b)}.`, `Same €10M pre-money: 8% pool = founders at ${pc(a)}; 14% pool = ${pc(b)}.`); } },
    { id: 'board', title: L('Il board: chi decide quando le cose vanno male', 'The board: who decides when things go wrong'), source: 'ycTerm',
      body: L('Il board conta poco quando tutto va bene e moltissimo quando no. Il term sheet «pulito» di YC indica come favorevole ai founder un board in cui i founder hanno la maggioranza, e segnala il rischio dei board in cui decide l\'indipendente.', 'The board matters little when things go well and a lot when they do not. YC\'s «clean» term sheet points to a founder-majority board as founder-friendly, and flags the risk of boards where the independent decides.'),
      example: ({ L }) => L('Ricorda: alla Series A entrerà anche Verdis con un seggio. Conta i seggi di oggi più quello di domani.', 'Remember: at the Series A Verdis will take a seat too. Count today\'s seats plus tomorrow\'s.') },
  ],
  3: [
    { id: 'pref', title: L('La liquidation preference 1x', 'The 1x liquidation preference'), source: 'ogec',
      body: L('Con una preference 1x non partecipante, all\'exit l\'investitore sceglie: riprendersi i soldi o convertire e dividere. Conta soprattutto nelle exit piccole.', 'With a 1x non-participating preference, at exit the investor chooses: take its money back or convert and share. It matters most in small exits.'),
      example: ({ L, eur }) => { const j = journey({ cap: 4.0, deadEquity: 1, rights: 1 }, { pre: 9.5, pool: 12, board: 1 }, { pre: 47, mna: 3 }); const s = exitProceeds(j, 30), b = exitProceeds(j, 150); return L(`Con un'exit a €30M ai founder vanno ${eur(s.founders)}; a €150M ${eur(b.founders)}.`, `With a €30M exit the founders get ${eur(s.founders)}; at €150M ${eur(b.founders)}.`); } },
    { id: 'rofr', title: L('ROFR contro ROFN', 'ROFR versus ROFN'), source: null,
      body: L('Con un ROFR la CVC può pareggiare qualsiasi offerta: gli altri compratori sanno di poter essere scavalcati e spesso non ci provano nemmeno. Con un ROFN la CVC parla per prima, ma la gara resta aperta.', 'With a ROFR the CVC can match any offer: other buyers know they can be overtaken and often do not even try. With a ROFN the CVC talks first, but the race stays open.'),
      example: ({ L }) => L('Nel gioco un ROFR applica un -15% al prezzo di vendita all\'exit: un\'ipotesi didattica per far vedere il costo di un\'asta senza concorrenti.', 'In the game a ROFR applies -15% to the exit price: a teaching assumption to show the cost of an auction without bidders.') },
    { id: 'excl', title: L('Un\'esclusiva vale quanto i suoi volumi', 'An exclusivity is worth its volumes'), source: null,
      body: L('Dare un\'esclusiva a un partner significa rinunciare ai suoi concorrenti. Ha senso solo se in cambio arrivano volumi garantiti (take-or-pay) e una durata limitata.', 'Granting a partner exclusivity means giving up its competitors. It only makes sense in exchange for guaranteed volumes (take-or-pay) and a limited term.'),
      example: ({ L }) => L('Chiediti: se il partner sparisse domani, quanto fatturato perderei? E quanto me ne garantisce in cambio?', 'Ask yourself: if the partner vanished tomorrow, how much revenue would I lose? And how much does it guarantee in return?') },
  ],
};

// ---------- STRATEGIES: what good negotiators do ----------
export const STRATEGIES = [
  { id: 'batna', title: L('Conosci la tua BATNA', 'Know your BATNA'), source: 'gty', body: L('Prima di trattare, sappi cosa fai se non firmi. Una BATNA forte ti permette di dire no; una debole va migliorata, non nascosta con bluff sui fatti.', 'Before negotiating, know what you do if you do not sign. A strong BATNA lets you say no; a weak one must be improved, not hidden behind invented facts.') },
  { id: 'interests', title: L('Interessi, non posizioni', 'Interests, not positions'), source: 'gty', body: L('«Vogliamo un board seat» è una posizione. «Vogliamo vedere i numeri e proteggere l\'investimento» è un interesse: si può soddisfare anche con un observer e buoni diritti di informazione.', '«We want a board seat» is a position. «We want to see the numbers and protect the investment» is an interest: an observer seat and good information rights can satisfy it too.') },
  { id: 'package', title: L('Tratta pacchetti, non leve', 'Trade packages, not levers'), source: 'gty', body: L('Se negozi le tre leve una alla volta, ognuna diventa una battaglia. Mettile insieme: concedi dove a te costa poco e all\'altra squadra vale molto. È così che si crea valore.', 'Negotiate the three levers one at a time and each becomes a fight. Put them together: give where it costs you little and is worth a lot to the other squad. That is how value is created.') },
  { id: 'anchor', title: L('Ancora, ma con un motivo', 'Anchor, with a reason'), source: 'vd', body: L('Il primo numero sul tavolo pesa. Se sei preparato, aprite voi, e accompagnate il numero con una ragione (trazione, comparabili, piano).', 'The first number on the table carries weight. If you are prepared, open first, and pair the number with a reason (traction, comparables, plan).') },
  { id: 'give', title: L('Give to get', 'Give to get'), source: 'gty', body: L('Ogni concessione ha un prezzo: «possiamo accettare il 12% di pool se il cap sale». Una concessione regalata insegna all\'altra parte a chiederne altre.', 'Every concession has a price: «we can accept a 12% pool if the cap goes up». A free concession teaches the other side to ask for more.') },
  { id: 'euros', title: L('Ragiona in euro, non in percentuali', 'Think in euros, not percentages'), source: null, body: L('Il 40% di una società da €150M vale più del 60% di una da €30M. Apri il Journey e guarda l\'exit: è lì che le percentuali diventano soldi.', '40% of a €150M company is worth more than 60% of a €30M one. Open the Journey and look at the exit: that is where percentages become money.') },
  { id: 'tworounds', title: L('Pensa due round avanti', 'Think two rounds ahead'), source: null, body: L('Un pro-rata, un pool o un board di oggi pesano sul prossimo round. Prima di firmare chiediti: cosa vedrà il prossimo investitore nel nostro cap table?', 'A pro-rata, a pool or a board you sign today weigh on the next round. Before signing ask: what will the next investor see in our cap table?') },
  { id: 'questions', title: L('Fai domande, poi ascolta', 'Ask, then listen'), source: 'gty', body: L('«Cosa vi servirebbe per dire sì?» rivela più informazioni di dieci controproposte. Il silenzio dopo una domanda lavora per te.', '«What would you need to say yes?» reveals more than ten counter-offers. Silence after a question works for you.') },
];

// ---------- QUIZ: two questions per round, shown at the debrief. They give no points. ----------
export const QUIZ = {
  1: [
    { q: L('Un SAFE post-money da €600k con cap €5M: che quota hanno gli investitori alla conversione?', 'A €600k post-money SAFE with a €5M cap: what stake do the investors hold at conversion?'),
      a: [L('12%', '12%'), L('10,7%', '10.7%'), L('Dipende dal prezzo del seed', 'It depends on the seed price')], ok: 0,
      why: L('Nel SAFE post-money la quota è investimento / cap: 0,6 / 5 = 12%. Il seed poi diluisce tutti, SAFE compreso.', 'In a post-money SAFE the stake is investment / cap: 0.6 / 5 = 12%. The seed then dilutes everyone, SAFE included.') },
    { q: L('Perché un super pro-rata può danneggiare anche l\'investitore che lo ottiene?', 'Why can a super pro-rata hurt even the investor who gets it?'),
      a: [L('Perché costa di più', 'Because it costs more'), L('Perché toglie spazio agli altri investitori del round successivo, che può non chiudersi', 'Because it takes room from the next round\'s other investors, and that round may not close'), L('Non lo danneggia mai', 'It never does')], ok: 1,
      why: L('Se il nuovo round non ha spazio per i suoi investitori (qui il Club con il suo minimo di €800k), rischia di saltare: e con lui il valore dell\'investimento.', 'If the new round has no room for its investors (here the Club with its €800k minimum), it may fall apart, and the investment\'s value with it.') },
  ],
  2: [
    { q: L('Il pool del 14% viene creato «nel pre-money». Chi lo paga?', 'A 14% pool is created «in the pre-money». Who pays for it?'),
      a: [L('Solo i nuovi investitori', 'Only the new investors'), L('Tutti in proporzione, dopo il round', 'Everyone pro rata, after the round'), L('I soci di prima del round, founder in testa', 'The pre-round shareholders, founders first')], ok: 2,
      why: L('Creare il pool nel pre-money diluisce solo chi c\'era prima. È l\'«option pool shuffle».', 'Creating the pool in the pre-money only dilutes whoever was there before. It is the «option pool shuffle».') },
    { q: L('Quale board lascia il controllo ai founder?', 'Which board keeps the founders in control?'),
      a: [L('2 founder, 2 investitori, 1 indipendente', '2 founders, 2 investors, 1 independent'), L('2 founder e 1 investitore', '2 founders and 1 investor'), L('2 founder e 3 investitori', '2 founders and 3 investors')], ok: 1,
      why: L('Con 2 su 3 i founder hanno la maggioranza. Nel 2-2-1 decide l\'indipendente.', 'With 2 of 3 the founders hold the majority. In a 2-2-1 the independent decides.') },
  ],
  3: [
    { q: L('Con una preference 1x non partecipante, quando conviene all\'investitore convertire?', 'With a 1x non-participating preference, when does the investor prefer to convert?'),
      a: [L('Sempre', 'Always'), L('Quando la sua quota dell\'exit vale più dei soldi investiti', 'When its share of the exit is worth more than the money invested'), L('Mai', 'Never')], ok: 1,
      why: L('Sceglie il valore più alto: 1x indietro oppure la sua percentuale dell\'exit.', 'It picks the higher value: 1x back or its percentage of the exit.') },
    { q: L('Perché un ROFR alla CVC può ridurre il valore dell\'exit per tutti?', 'Why can a CVC ROFR reduce the exit value for everyone?'),
      a: [L('Perché gli altri compratori, sapendo di poter essere pareggiati, spesso non fanno offerte', 'Because other buyers, knowing they can be matched, often do not bid'), L('Perché la CVC paga meno per legge', 'Because the CVC pays less by law'), L('Non lo riduce', 'It does not')], ok: 0,
      why: L('Meno compratori in gara significa meno pressione sul prezzo. Un ROFN lascia la gara aperta.', 'Fewer bidders in the race means less pressure on the price. A ROFN keeps the race open.') },
  ],
};

// ---------- BADGES: for learning, never for points ----------
export const BADGES = {
  anchor: { icon: 'flag', title: L('Primo ancoraggio', 'First anchor'), text: L('Avete messo il primo numero sul tavolo.', 'You put the first number on the table.') },
  note: { icon: 'pen', title: L('Give to get', 'Give to get'), text: L('Avete spiegato cosa chiedete in cambio.', 'You said what you want in return.') },
  counter: { icon: 'sliders', title: L('Controproposta', 'Counter-offer'), text: L('Avete risposto con un\'offerta, non con un no.', 'You answered with an offer, not a no.') },
  tworounds: { icon: 'route', title: L('Due round avanti', 'Two rounds ahead'), text: L('Avete guardato il Journey durante la trattativa.', 'You checked the Journey during the negotiation.') },
  closer: { icon: 'check', title: L('Deal chiuso', 'Deal closed'), text: L('Avete firmato un accordo.', 'You signed a deal.') },
  limits: { icon: 'key', title: L('Dentro i limiti', 'Within limits'), text: L('Avete firmato senza superare il vostro walk-away.', 'You signed without breaching your walk-away.') },
  curious: { icon: 'bulb', title: L('Curioso', 'Curious'), text: L('Avete aperto 5 voci del glossario.', 'You opened 5 glossary entries.') },
  student: { icon: 'book', title: L('Studioso', 'Scholar'), text: L('Avete letto i concetti del round.', 'You read the round\'s concepts.') },
  quiz: { icon: 'trophy', title: L('Quiz perfetto', 'Perfect quiz'), text: L('Due risposte giuste su due.', 'Two right answers out of two.') },
};
