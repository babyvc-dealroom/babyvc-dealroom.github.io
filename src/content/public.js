// Public scenario content, bilingual. Confidential content lives in scenarios/<id>/private.js and reaches the app only from the database.
const L = (it, en) => ({ it, en });

export const ROUNDS = {
  1: {
    name: L('Pre-seed', 'Pre-seed'), color: 'var(--r1)', icon: 'sprout',
    ticket: '€600k', instrument: L('SAFE post-money', 'Post-money SAFE'),
    investors: L('Angel syndicate + Lanterna Pre-Seed Fund', 'Angel syndicate + Lanterna Pre-Seed Fund'),
    year: L('Anno 1: sei siti pilota, due mesi di cassa', 'Year 1: six pilot sites, two months of cash'),
    sheet: L(
      'Flussi Energy ha un prodotto funzionante in 6 siti industriali pilota e i primi due clienti paganti. I founder chiedono €600k per 18 mesi: tre ingegneri e la prima qualifica sul mercato del bilanciamento. La cassa dura altri due mesi. Gli investitori parlano con due voci: un angel syndicate guidato da Roberto Galli, ex manager di una utility (€250k), e Lanterna Pre-Seed Fund, fondo da €25M (€350k). Il cap table porta ancora il 10% di Luca Neri.',
      'Flussi Energy has a working product at 6 industrial pilot sites and the first two paying customers. The founders need €600k for 18 months: three engineers and the first qualification on the grid-balancing market. Cash lasts two more months. The investor side speaks with two voices: an angel syndicate led by Roberto Galli, a former utility executive (€250k), and Lanterna Pre-Seed Fund, a €25M fund (€350k). The cap table still carries Luca Neri\'s 10%.'),
    kpis: [[L('Trazione', 'Traction'), L('6 siti pilota, 2 paganti (€60k ARR), 15 lettere d\'intenti', '6 pilot sites, 2 paying (€60k ARR), 15 letters of intent')], [L('Burn e cassa', 'Burn and cash'), L('€35k/mese, cassa €70k', '€35k/month, cash €70k')], [L('Raccolta', 'Raise'), L('€600k: angels €250k, Lanterna €350k', '€600k: angels €250k, Lanterna €350k')]],
    levers: {
      cap: { label: L('Valuation cap', 'Valuation cap'), unit: L('€M post-money', '€M post-money'), opening: L('€3,5M post-money', '€3.5M post-money'), stake: L('Fissa la quota degli investitori: €600k / cap', 'Sets the investors\' stake: €600k / cap') },
      deadEquity: { label: L('Dead equity ed ESOP', 'Dead equity and ESOP'), opening: L('Luca a zero come condizione di closing; ESOP 10% solo sui founder', 'Luca to zero as a closing condition; ESOP 10% on the founders only'), stake: L('Chi paga un cap table pulito', 'Who pays for a clean cap table'),
        options: [L('Luca a zero; ESOP 10% creato solo sui founder', 'Luca to zero; ESOP 10% created on the founders only'), L('Luca al 2%; ESOP 10% solo sui founder', 'Luca at 2%; ESOP 10% on the founders only'), L('Buyback: Luca tiene il 3%, il 7% riacquistato nell\'ESOP, spese legali coperte', 'Buyback: Luca keeps 3%, 7% repurchased into the ESOP, legal fees covered'), L('Luca tiene il 5%; ESOP 5% dalle sue quote', 'Luca keeps 5%; 5% ESOP from his shares'), L('Luca tiene il 10%; nessun ESOP', 'Luca keeps 10%; no ESOP')] },
      rights: { label: L('Diritti di Lanterna', 'Lanterna rights'), opening: L('Board seat, super pro-rata 2x, veto sul budget', 'Board seat, 2x super pro-rata, veto on the budget'), stake: L('Il pro-rata di Lanterna prenderà parte del seed', 'Lanterna\'s pro-rata will take part of the seed'),
        options: [L('Board seat, super pro-rata 2x, veto sul budget', 'Board seat, 2x super pro-rata, veto on the budget'), L('Observer e super pro-rata 2x', 'Observer seat and 2x super pro-rata'), L('Observer e pro-rata standard', 'Observer seat and standard pro-rata'), L('Diritti di informazione e pro-rata con tetto a €150k', 'Information rights and pro-rata capped at €150k'), L('Solo diritti di informazione, niente pro-rata', 'Information rights only, no pro-rata')] },
    },
    preAgreed: [[L('Sconto e MFN', 'Discount and MFN'), L('20% sul prezzo del round successivo; MFN', '20% on the next round price; MFN')], [L('Informazioni', 'Information'), L('Report trimestrale: KPI, budget, cassa', 'Quarterly report: KPIs, budget, cash')], [L('Vesting founder', 'Founder vesting'), L('4 anni con 12 mesi di credito, good/bad leaver', '4 years with 12 months of credit, good/bad leaver')], [L('Angels', 'Angels'), L('Roberto Galli advisor, 0,5% con vesting a 24 mesi', 'Roberto Galli as advisor, 0.5% with 24-month vesting')]],
  },
  2: {
    name: L('Seed', 'Seed'), color: 'var(--r2)', icon: 'rocket',
    ticket: '€3.0M', instrument: L('Round priced, azioni Seed preferred', 'Priced round, Seed preferred'),
    investors: L('Lumen Seed Fund + Milano Energy Club (club deal)', 'Lumen Seed Fund + Milano Energy Club (club deal)'),
    year: L('18 mesi dopo: 40 siti e un business vero', '18 months later: 40 sites and a real business'),
    sheet: L(
      'I piloti sono diventati contratti. Flussi Energy gestisce 40 siti con €1,2M di ARR e chiede €3,0M per costruire il team commerciale. Lumen Seed Fund, fondo energy da €60M, guida con €1,8M. Il Milano Energy Club, 14 family office e imprenditori in un unico veicolo, prende il resto: almeno €800k. Il SAFE del pre-seed converte ora, al cap firmato al vostro tavolo, e il pro-rata di Lanterna esce dall\'allocazione del Club.',
      'The pilots became contracts. Flussi Energy now runs 40 sites with €1.2M ARR and needs €3.0M to build a sales team. Lumen Seed Fund, a €60M energy fund, leads with €1.8M. The Milano Energy Club, 14 family offices and entrepreneurs in one vehicle, takes the rest: at least €800k. The pre-seed SAFE converts now, at the cap your table signed, and Lanterna\'s pro-rata comes out of the Club\'s allocation.'),
    kpis: [[L('Trazione', 'Traction'), L('ARR €1,2M, 40 siti, NRR 120%, margine 70%, 15 persone', 'ARR €1.2M, 40 sites, NRR 120%, gross margin 70%, 15 people')], [L('Burn e cassa', 'Burn and cash'), L('€120k/mese, cassa €360k (3 mesi)', '€120k/month, cash €360k (3 months)')], [L('Raccolta', 'Raise'), L('€3,0M: Lumen €1,8M; Club fino a €1,2M meno il pro-rata di Lanterna', '€3.0M: Lumen €1.8M; Club up to €1.2M minus Lanterna\'s pro-rata')]],
    levers: {
      pre: { label: L('Pre-money', 'Pre-money'), unit: L('€M', '€M'), opening: L('€8,0M fully diluted, SAFE convertito e nuovo pool inclusi', '€8.0M fully diluted, including the converted SAFE and the new pool'), stake: L('Prezzo headline del round', 'Headline price of the round') },
      pool: { label: L('Option pool', 'Option pool'), unit: L('% post-money, ESOP esistente incluso', '% post-money, existing ESOP included'), opening: L('14% post-money, nel pre-money', '14% post-money, created in the pre-money'), stake: L('Chi paga il pool', 'Who pays for the pool'), check: L('Il 2% promesso verbalmente è incluso nel pool', 'The verbally promised 2% is included in the pool') },
      board: { label: L('Board e veti', 'Board and vetoes'), opening: L('5 seggi: 2 founder, 2 Lumen, 1 Club; veto su budget e assunzioni senior', '5 seats: 2 founders, 2 Lumen, 1 Club; veto on budget and senior hires'), stake: L('Il controllo dopo il seed e alla Series A', 'Control after the seed and at the Series A'),
        options: [L('5 seggi: 2 founder, 3 investitori; veti operativi', '5 seats: 2 founders, 3 investors; operational vetoes'), L('5 seggi: 2 founder, Lumen, Club, 1 indipendente concordato; veti operativi', '5 seats: 2 founders, Lumen, Club, 1 agreed independent; operational vetoes'), L('5 seggi: 2 founder, Lumen, 1 indipendente concordato; Club observer; veti solo su materie straordinarie', '5 seats: 2 founders, Lumen, 1 agreed independent; Club observer; vetoes on extraordinary items only'), L('3 seggi: 2 founder e Lumen; Club solo diritti di informazione', '3 seats: 2 founders and Lumen; Club information rights only'), L('Solo i 2 founder in board; Lumen observer', '2 founders on the board; Lumen observer only')] },
    },
    preAgreed: [[L('Economics', 'Economics'), L('Seed preferred 1x non partecipante, pari passu con il SAFE; broad-based weighted average', 'Seed preferred 1x non-participating, pari passu with the SAFE; broad-based weighted average')], [L('Founder', 'Founders'), L('25% vested al closing, il resto in 36 mesi, double trigger', '25% vested at closing, rest over 36 months, double trigger')], [L('Trasferimenti', 'Transfers'), L('Pro-rata standard alla Series A; drag-along a doppia maggioranza', 'Standard pro-rata at the Series A; drag-along by dual majority')], [L('Processo', 'Process'), L('No-shop 45 giorni; spese legali max €25k; validità 72 ore', 'No-shop 45 days; legal fees capped at €25k; validity 72 hours')]],
  },
  3: {
    name: L('Series A', 'Series A'), color: 'var(--r3)', icon: 'trend',
    ticket: '€15M', instrument: L('Series A preferred', 'Series A preferred'),
    investors: L('Verdis Climate Partners + NovaEnergia Ventures (CVC)', 'Verdis Climate Partners + NovaEnergia Ventures (CVC)'),
    year: L('Anno 4: 140 siti e una utility al tavolo', 'Year 4: 140 sites and a utility at the table'),
    sheet: L(
      'Flussi Energy gestisce 140 siti con €3,5M di ARR e chiede €15M per entrare in Spagna e Germania. Verdis Climate Partners, fondo climate Art. 9 SFDR, guida con €9M. NovaEnergia Ventures, il braccio venture di una utility che ora è anche cliente, aggiunge €6M e vuole diritti strategici. I founder arrivano con la quota firmata al vostro tavolo nei round precedenti e dopo questo round devono restare almeno al 38% combinato.',
      'Flussi Energy runs 140 sites with €3.5M ARR and wants €15M to enter Spain and Germany. Verdis Climate Partners, an Art. 9 SFDR climate fund, leads with €9M. NovaEnergia Ventures, the venture arm of a utility that is now a customer, adds €6M and wants strategic rights. The founders arrive with the stake your table signed in earlier rounds and must keep at least 38% combined after this round.'),
    kpis: [[L('Trazione', 'Traction'), L('ARR €3,5M, 2,5x YoY, NRR 125%, margine 68%, 38 persone', 'ARR €3.5M, 2.5x YoY, NRR 125%, gross margin 68%, 38 people')], [L('Burn e cassa', 'Burn and cash'), L('€350k/mese, cassa €2,1M (6 mesi)', '€350k/month, cash €2.1M (6 months)')], [L('Raccolta', 'Raise'), L('€15M: Verdis €9M, NovaEnergia €6M', '€15M: Verdis €9M, NovaEnergia €6M')]],
    levers: {
      pre: { label: L('Pre-money', 'Pre-money'), unit: L('€M', '€M'), opening: L('€40M (Verdis)', '€40M (Verdis)'), stake: L('Prezzo headline; il 38% dei founder', 'Headline price; the founders\' 38%') },
      mna: { label: L('Diritto M&A della CVC', 'CVC M&A right'), opening: L('ROFR su qualsiasi vendita della società, 60 giorni per pareggiare', 'ROFR on any sale of the company, 60 days to match'), stake: L('Se altri compratori faranno mai un\'offerta', 'Whether other buyers will ever bid'),
        options: [L('ROFR sulla vendita della società', 'ROFR on the sale of the company'), L('ROFN con elementi di matching, o 60 giorni o più', 'ROFN with matching elements, or 60 days or more'), L('ROFN di 30-45 giorni, niente matching, niente accesso alle offerte terze', 'ROFN of 30-45 days, no matching, no access to third-party bids'), L('Solo diritto di notifica, nessuna prima offerta', 'Notice right only, no first offer'), L('Nessun diritto M&A', 'No M&A right at all')] },
      partner: { label: L('Partnership commerciale', 'Commercial partnership'), opening: L('Esclusiva di 5 anni in Italia, accesso completo ai dati dei siti', '5-year exclusivity in Italy, full access to site data'), stake: L('Un cliente o una gabbia', 'A customer or a cage'),
        options: [L('Esclusiva 5 anni in Italia senza volumi; NovaEnergia vede tutti i dati', '5-year exclusivity in Italy, no volume commitment; NovaEnergia sees all site data'), L('Esclusiva 3-5 anni legata ai MW contrattualizzati; dati solo sui siti NovaEnergia', '3-5 year exclusivity tied to contracted MW; data on NovaEnergia sites only'), L('Esclusiva 24 mesi per partnership con utility in Italia, almeno 200 MW; dati solo sui siti congiunti', '24-month exclusivity for utility partnerships in Italy, at least 200 MW contracted; data on joint sites only'), L('Preferred partner per 12 mesi, nessuna esclusiva', 'Preferred-partner status for 12 months, no exclusivity'), L('Nessun accordo commerciale', 'No commercial agreement')] },
    },
    preAgreed: [[L('Economics', 'Economics'), L('Series A preferred 1x non partecipante, pari passu con il seed', 'Series A preferred 1x non-participating, pari passu with the seed')], [L('ESOP', 'ESOP'), L('Top-up al 12% post-money, nel pre-money', 'Top-up to 12% post-money, in the pre-money')], [L('Governance', 'Governance'), L('Verdis un seggio; NovaEnergia observer con firewall informativo', 'Verdis one board seat; NovaEnergia observer with an information firewall')], [L('Altro', 'Other'), L('IP a Flussi; key person disclosure; side letter d\'impatto con 3 KPI per Verdis', 'Flussi keeps its IP; key person disclosure; impact side letter with 3 KPIs for Verdis')]],
  },
};

export const STORY = L(
  'Flussi Energy è una startup software di Milano che trasforma batterie e carichi flessibili dei siti industriali in una virtual power plant: li aggrega e vende la loro flessibilità sui mercati di bilanciamento, dividendo i ricavi con le fabbriche. Andrea Conti (CEO, ex energy trader) e Chiara Bassi (CTO, ricercatrice in ottimizzazione) hanno il 45% a testa; Luca Neri, co-founder uscito dopo 10 mesi senza vesting, ha ancora il 10%.',
  'Flussi Energy is a Milan software startup that turns batteries and flexible loads at industrial sites into a virtual power plant: it aggregates them and sells their flexibility on grid-balancing markets, sharing the revenue with the factories. Andrea Conti (CEO, ex energy trader) and Chiara Bassi (CTO, optimization researcher) hold 45% each; Luca Neri, a co-founder who left after 10 months without vesting, still holds 10%.');

export const HOLDER_NAMES = { Andrea: 'Andrea (CEO)', Chiara: 'Chiara (CTO)', Luca: 'Luca', ESOP: 'ESOP', Angels: 'Angels', Lanterna: 'Lanterna', Lumen: 'Lumen', Club: 'Milano Energy Club', Verdis: 'Verdis', Nova: 'NovaEnergia' };

// The glossary lives in learn.js.

// Coach tips: shown as popups. Keys by context; the app picks one at random and never repeats it in a session.
export const TIPS = {
  'phase:brief': [
    L('Leggi prima il tuo walk-away, poi i numeri. Sapere dove ti fermi ti rende più coraggioso.', 'Read your walk-away first, then the numbers. Knowing where you stop makes you bolder.'),
    L('Apri il Journey: ogni concessione di oggi cambia il cap table di domani.', 'Open the Journey: every concession today changes tomorrow\'s cap table.'),
    L('Decidete chi parla per primo e chi tiene i conti. Due voci, un piano.', 'Decide who speaks first and who keeps the numbers. Two voices, one plan.'),
  ],
  'phase:negotiate': [
    L('Give to get: ogni concessione si scambia. Mai regalare una leva.', 'Give to get: every concession is traded. Never give a lever away.'),
    L('La prima offerta ancora la trattativa. Motivala con un numero, non con un aggettivo.', 'The first offer anchors the deal. Justify it with a number, not an adjective.'),
    L('Bluffare sulle intenzioni va bene, inventare fatti costa 10 punti.', 'Bluffing on intentions is fine, inventing facts costs 10 points.'),
    L('Negozia le tre leve insieme: un pacchetto crea più valore di tre battaglie separate.', 'Negotiate the three levers together: a package creates more value than three separate fights.'),
  ],
  'phase:sign': [
    L('Prima di firmare guarda la quota dei founder dopo il round: il walk-away si calcola sul vostro percorso.', 'Before signing check the founders\' stake after the round: the walk-away is computed on your path.'),
    L('Un «no deal» ben argomentato vale più di un cattivo accordo.', 'A well-argued «no deal» is worth more than a bad deal.'),
  ],
  'phase:debrief': [
    L('Quale vittoria di oggi il Journey mostra come una sconfitta domani?', 'Which win of today does the Journey show as a loss tomorrow?'),
    L('Vota la relazione con onestà: «faresti un altro round con loro?»', 'Vote the relationship honestly: «would you do another round with them?»'),
  ],
  'round:1': [L('Il cap non è l\'unica leva: chi paga l\'ESOP pesa quanto il prezzo.', 'The cap is not the only lever: who pays for the ESOP matters as much as the price.'), L('Un super pro-rata oggi prende spazio al prossimo round.', 'A super pro-rata today takes room in the next round.')],
  'round:2': [L('Ogni punto di pool creato nel pre-money costa ai founder circa 1 punto di quota.', 'Each point of pool created in the pre-money costs the founders about 1 point of ownership.'), L('Il club deal ha un ticket minimo: chi risolve il problema dei €800k?', 'The club deal has a minimum ticket: who solves the €800k problem?')],
  'round:3': [L('ROFR e ROFN sembrano simili, ma solo uno tiene in gara gli altri compratori.', 'ROFR and ROFN look alike, but only one keeps other buyers in the race.'), L('Un\'esclusiva legata ai MW si ripaga; una senza volumi no.', 'An exclusivity tied to MW pays for itself; one without volumes does not.')],
  'offer:compose': [L('Guarda l\'anteprima: come cambia la quota dei founder due round più avanti?', 'Look at the preview: how does the founders\' stake change two rounds ahead?'), L('Aggiungi una nota: spiega cosa chiedi in cambio.', 'Add a note: say what you want in return.')],
  'offer:incoming': [L('Non accettare la prima offerta solo per chiudere: controlla l\'impatto sul tuo walk-away.', 'Do not accept the first offer just to close: check the impact on your walk-away.'), L('Una controproposta che muove una sola leva segnala dove sei flessibile.', 'A counter-offer that moves one lever signals where you are flexible.')],
  'fac:envB': [L('Minuto 9: è il momento della busta B.', 'Minute 9: time for Envelope B.')],
  'fac:brief': [L('Leggi ad alta voce «cosa si porta dietro» dal Journey del tavolo.', 'Read the «what carries over» notes from the table\'s Journey aloud.')],
};

export const SQUAD_NAMES = {
  startup: ['Volt', 'Ampère', 'Kilowatt', 'Faraday', 'Joule', 'Ohm', 'Watt', 'Tesla Coil', 'Flux', 'Spark', 'Dynamo', 'Grid', 'Photon', 'Ion', 'Pulse', 'Current', 'Surge', 'Arc', 'Volta', 'Kelvin'],
  investor: ['Orion Capital', 'Polaris VC', 'Vega Partners', 'Lyra Fund', 'Atlas Ventures', 'Draco Capital', 'Sirius VC', 'Nova Partners', 'Andromeda', 'Cassiopea', 'Pegaso', 'Perseo', 'Altair', 'Rigel', 'Deneb', 'Antares', 'Aldebaran', 'Castore', 'Polluce', 'Mira'],
};
