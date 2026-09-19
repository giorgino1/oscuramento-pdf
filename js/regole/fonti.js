// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Base delle fonti normative, di prassi e di casistica.
//
// Modulo di soli dati. Ogni fonte ha estremi, indirizzo ufficiale, data di
// consultazione, stato di verifica e uno o più PASSAGGI: le porzioni di testo
// che sorreggono le regole. Le categorie e gli scopi
// (regole.js) rimandano ai passaggi per identificativo, e il rapporto di
// trattamento li cita.
//
// Ogni passaggio dichiara il proprio `tipo`:
//   'testo'    riproduzione letterale del testo ufficiale
//   'sintesi'  riassunto fedele, non letterale: da leggere sul testo ufficiale
// Le fonti nascono con `verificata: false`. L'ufficio, dopo aver riscontrato
// il testo vigente all'indirizzo indicato, imposta `verificata: true` e
// `verificataIl: 'gg mese aaaa'`: il rapporto distingue le fonti verificate dall'ufficio da quelle
// non ancora riscontrate. Nessuna regola va dedotta per analogia senza un
// passaggio che la sorregga (regole-oscuramento.md, Manutenzione).
//
// I riferimenti interni delle Linee guida n. 243/2014 (parti e paragrafi) e
// la numerazione delle FAQ del Garante non sono stati riscontrati: i passaggi
// sono indicati per contenuto. Chi verifica la fonte può aggiungere il
// riferimento puntuale nel campo `rif`.

export const FONTI_VERSIONE = '18 settembre 2026';

export const FONTI = {
  // -------------------------------------------------------------- Norme
  dlgs33: {
    id: 'dlgs33', tipo: 'norma',
    estremi: 'Decreto legislativo 14 marzo 2013, n. 33 (Riordino della disciplina riguardante il diritto di accesso civico e gli obblighi di pubblicità, trasparenza e diffusione di informazioni da parte delle pubbliche amministrazioni)',
    breve: 'd.lgs. 33/2013',
    url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2013-03-14;33',
    consultata: '2026-09-18', verificata: false,
    passaggi: {
      '7bis.4': {
        rif: 'art. 7-bis, comma 4', tipo: 'testo',
        testo: 'Nei casi in cui norme di legge o di regolamento prevedano la pubblicazione di atti o documenti, le pubbliche amministrazioni provvedono a rendere non intelligibili i dati personali non pertinenti o, se sensibili o giudiziari, non indispensabili rispetto alle specifiche finalità di trasparenza della pubblicazione.',
      },
      '7bis.5': {
        rif: 'art. 7-bis, comma 5', tipo: 'testo',
        testo: 'Le notizie concernenti lo svolgimento delle prestazioni di chiunque sia addetto a una funzione pubblica e la relativa valutazione sono rese accessibili dall’amministrazione di appartenenza. Non sono invece ostensibili, se non nei casi previsti dalla legge, le notizie concernenti la natura delle infermità e degli impedimenti personali o familiari che causino l’astensione dal lavoro, nonché le componenti della valutazione o le notizie concernenti il rapporto di lavoro tra il predetto dipendente e l’amministrazione, idonee a rivelare taluna delle informazioni di cui all’articolo 4, comma 1, lettera d), del decreto legislativo n. 196 del 2003.',
      },
      '7bis.6': {
        rif: 'art. 7-bis, comma 6', tipo: 'sintesi',
        testo: 'Restano fermi i limiti alla diffusione e all’accesso delle informazioni previsti dall’art. 24, commi 1 e 6, della legge 241/1990, dalla normativa sul segreto statistico, nonché quelli relativi alla diffusione dei dati idonei a rivelare lo stato di salute e la vita sessuale.',
      },
      '15': {
        rif: 'art. 15, comma 1', tipo: 'sintesi',
        testo: 'Per i titolari di incarichi di collaborazione o consulenza le amministrazioni pubblicano gli estremi dell’atto di conferimento, il curriculum vitae, i dati relativi allo svolgimento di incarichi o la titolarità di cariche in enti di diritto privato regolati o finanziati dalla pubblica amministrazione o lo svolgimento di attività professionali, e i compensi, comunque denominati, relativi al rapporto di consulenza o di collaborazione.',
      },
      '19': {
        rif: 'art. 19', tipo: 'sintesi',
        testo: 'Le amministrazioni pubblicano i bandi di concorso per il reclutamento del personale, i criteri di valutazione della commissione e le tracce delle prove, nonché le graduatorie finali, aggiornate con l’eventuale scorrimento degli idonei non vincitori.',
      },
      '23': {
        rif: 'art. 23', tipo: 'sintesi',
        testo: 'Le amministrazioni pubblicano e aggiornano ogni sei mesi gli elenchi dei provvedimenti adottati dagli organi di indirizzo politico e dai dirigenti, con particolare riferimento ai provvedimenti finali dei procedimenti di scelta del contraente per l’affidamento di lavori, forniture e servizi e di accordi stipulati con soggetti privati o con altre amministrazioni.',
      },
      '26.2': {
        rif: 'art. 26, comma 2', tipo: 'sintesi',
        testo: 'Le amministrazioni pubblicano gli atti di concessione di sovvenzioni, contributi, sussidi e ausili finanziari alle imprese, e comunque di vantaggi economici di qualunque genere a persone ed enti pubblici e privati, di importo superiore a mille euro.',
      },
      '26.4': {
        rif: 'art. 26, comma 4', tipo: 'testo',
        testo: 'È esclusa la pubblicazione dei dati identificativi delle persone fisiche destinatarie dei provvedimenti di cui al presente articolo, qualora da tali dati sia possibile ricavare informazioni relative allo stato di salute ovvero alla situazione di disagio economico-sociale degli interessati.',
      },
      '27.1': {
        rif: 'art. 27, comma 1', tipo: 'sintesi',
        testo: 'La pubblicazione degli atti di concessione comprende necessariamente: a) il nome dell’impresa o dell’ente e i rispettivi dati fiscali, o il nome di altro soggetto beneficiario; b) l’importo del vantaggio economico corrisposto; c) la norma o il titolo a base dell’attribuzione; d) l’ufficio e il funzionario o dirigente responsabile del relativo procedimento amministrativo; e) la modalità seguita per l’individuazione del beneficiario; f) il link al progetto selezionato e al curriculum del soggetto incaricato.',
      },
      '37': {
        rif: 'art. 37 (come modificato dal d.lgs. 36/2023)', tipo: 'sintesi',
        testo: 'Fermo restando quanto previsto dall’art. 9-bis e fermi restando gli obblighi di pubblicità legale, le pubbliche amministrazioni e le stazioni appaltanti pubblicano i dati, gli atti e le informazioni relativi ai contratti pubblici secondo quanto previsto dal codice dei contratti pubblici (d.lgs. 36/2023, art. 28): la trasparenza è assolta con la trasmissione alla Banca dati nazionale dei contratti pubblici; i dati e documenti che restano da pubblicare direttamente in Amministrazione trasparente sono indicati nell’allegato 1 della delibera ANAC n. 264/2023.',
      },
    },
  },

  dlgs196: {
    id: 'dlgs196', tipo: 'norma',
    estremi: 'Decreto legislativo 30 giugno 2003, n. 196 (Codice in materia di protezione dei dati personali), come modificato dal d.lgs. 101/2018',
    breve: 'd.lgs. 196/2003',
    url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-30;196',
    consultata: '2026-09-18', verificata: false,
    passaggi: {
      '2septies.8': {
        rif: 'art. 2-septies, comma 8', tipo: 'testo',
        testo: 'I dati genetici, biometrici e relativi alla salute, non possono essere diffusi.',
      },
      '2sexies': {
        rif: 'art. 2-sexies', tipo: 'sintesi',
        testo: 'Il trattamento delle categorie particolari di dati personali necessario per motivi di interesse pubblico rilevante è ammesso se previsto dal diritto dell’Unione o da disposizioni di legge o di regolamento che specifichino i tipi di dati, le operazioni eseguibili e le misure appropriate per tutelare i diritti dell’interessato.',
      },
    },
  },

  gdpr: {
    id: 'gdpr', tipo: 'norma',
    estremi: 'Regolamento (UE) 2016/679 del Parlamento europeo e del Consiglio, del 27 aprile 2016 (regolamento generale sulla protezione dei dati)',
    breve: 'Regolamento (UE) 2016/679',
    url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj/ita',
    consultata: '2026-09-18', verificata: false,
    passaggi: {
      '4.1': {
        rif: 'art. 4, punto 1)', tipo: 'testo',
        testo: '«dato personale»: qualsiasi informazione riguardante una persona fisica identificata o identificabile («interessato»); si considera identificabile la persona fisica che può essere identificata, direttamente o indirettamente, con particolare riferimento a un identificativo come il nome, un numero di identificazione, dati relativi all’ubicazione, un identificativo online o a uno o più elementi caratteristici della sua identità fisica, fisiologica, genetica, psichica, economica, culturale o sociale.',
      },
      '5.1.c': {
        rif: 'art. 5, par. 1, lett. c)', tipo: 'testo',
        testo: 'I dati personali sono: […] c) adeguati, pertinenti e limitati a quanto necessario rispetto alle finalità per le quali sono trattati («minimizzazione dei dati»).',
      },
      '9.1': {
        rif: 'art. 9, par. 1', tipo: 'testo',
        testo: 'È vietato trattare dati personali che rivelino l’origine razziale o etnica, le opinioni politiche, le convinzioni religiose o filosofiche, o l’appartenenza sindacale, nonché trattare dati genetici, dati biometrici intesi a identificare in modo univoco una persona fisica, dati relativi alla salute o alla vita sessuale o all’orientamento sessuale della persona.',
      },
      'c26': {
        rif: 'considerando 26', tipo: 'sintesi',
        testo: 'I principi di protezione dei dati non si applicano a informazioni anonime, cioè che non si riferiscono a una persona fisica identificata o identificabile o a dati resi anonimi in modo tale che l’interessato non sia più identificabile; per stabilire l’identificabilità si tiene conto di tutti i mezzi di cui il titolare o un terzo può ragionevolmente avvalersi. I dati pseudonimizzati, che potrebbero essere attribuiti a una persona fisica mediante informazioni aggiuntive, sono dati personali.',
      },
      '4.5': {
        rif: 'art. 4, punto 5)', tipo: 'testo',
        testo: '«pseudonimizzazione»: il trattamento dei dati personali in modo tale che i dati personali non possano più essere attribuiti a un interessato specifico senza l’utilizzo di informazioni aggiuntive, a condizione che tali informazioni aggiuntive siano conservate separatamente e soggette a misure tecniche e organizzative intese a garantire che tali dati personali non siano attribuiti a una persona fisica identificata o identificabile.',
      },
      '10': {
        rif: 'art. 10', tipo: 'sintesi',
        testo: 'Il trattamento dei dati personali relativi alle condanne penali e ai reati o a connesse misure di sicurezza avviene soltanto sotto il controllo dell’autorità pubblica o se autorizzato dal diritto dell’Unione o degli Stati membri che preveda garanzie appropriate.',
      },
    },
  },

  l69: {
    id: 'l69', tipo: 'norma',
    estremi: 'Legge 18 giugno 2009, n. 69 (Disposizioni per lo sviluppo economico, la semplificazione, la competitività nonché in materia di processo civile)',
    breve: 'l. 69/2009',
    url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2009-06-18;69',
    consultata: '2026-09-18', verificata: false,
    passaggi: {
      '32.1': {
        rif: 'art. 32, comma 1', tipo: 'testo',
        testo: 'A far data dal 1º gennaio 2010, gli obblighi di pubblicazione di atti e provvedimenti amministrativi aventi effetto di pubblicità legale si intendono assolti con la pubblicazione nei propri siti informatici da parte delle amministrazioni e degli enti pubblici obbligati.',
      },
    },
  },

  l190: {
    id: 'l190', tipo: 'norma',
    estremi: 'Legge 6 novembre 2012, n. 190 (Disposizioni per la prevenzione e la repressione della corruzione e dell’illegalità nella pubblica amministrazione)',
    breve: 'l. 190/2012',
    url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2012-11-06;190',
    consultata: '2026-09-18', verificata: false,
    passaggi: {
      '1.32': {
        rif: 'art. 1, comma 32 (abrogato dal d.lgs. 36/2023; contenuto trasferito nell’art. 28, comma 3, del codice dei contratti)', tipo: 'sintesi',
        testo: 'Le stazioni appaltanti pubblicavano nei propri siti: la struttura proponente; l’oggetto del bando; l’elenco degli operatori invitati; l’aggiudicatario; l’importo di aggiudicazione; i tempi di completamento; le somme liquidate. Dal 1° gennaio 2024 gli stessi dati (struttura proponente, oggetto, procedura, operatori invitati, aggiudicatario, importo, tempi, somme liquidate) sono resi pubblici tramite la Banca dati nazionale dei contratti pubblici (art. 28, comma 3, d.lgs. 36/2023).',
      },
    },
  },

  lrSicilia22: {
    id: 'lrSicilia22', tipo: 'norma',
    estremi: 'Legge regionale siciliana 16 dicembre 2008, n. 22 (Composizione delle giunte. Status degli amministratori locali e misure di contenimento della spesa pubblica. Soglia di sbarramento nelle elezioni comunali e provinciali della Regione. Disposizioni varie)',
    breve: 'l.r. Sicilia 22/2008',
    url: 'https://www.ars.sicilia.it/',
    consultata: '2026-09-18', verificata: false,
    passaggi: {
      '18': {
        rif: 'art. 18 (come modificato dall’art. 13, comma 5, l.r. 25 maggio 2022, n. 13)', tipo: 'sintesi',
        testo: 'Le amministrazioni comunali, i liberi consorzi comunali e le unioni di comuni pubblicano integralmente nel proprio sito, entro sette giorni dall’emanazione, tutte le delibere di giunta e consiglio, le determinazioni sindacali e dirigenziali e le ordinanze, ai fini di pubblicità notizia e nel rispetto delle disposizioni a tutela della privacy; alla pubblicazione si applica l’art. 8 del d.lgs. 33/2013. L’inosservanza dei termini è sanzionata dall’art. 6 della l.r. 11/2015. Il testo vigente va riscontrato sul sito dell’Assemblea regionale siciliana.',
      },
    },
  },

  // -------------------------------------------------------------- Prassi
  garante243: {
    id: 'garante243', tipo: 'prassi',
    estremi: 'Garante per la protezione dei dati personali, provvedimento 15 maggio 2014, n. 243, «Linee guida in materia di trattamento di dati personali, contenuti anche in atti e documenti amministrativi, effettuato per finalità di pubblicità e trasparenza sul web da soggetti pubblici e da altri enti obbligati» (G.U. n. 134 del 12 giugno 2014)',
    breve: 'Linee guida Garante n. 243/2014',
    url: 'https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/3134436',
    consultata: '2026-09-18', verificata: false,
    passaggi: {
      'pertinenza': {
        rif: 'Linee guida, principi di necessità, pertinenza e non eccedenza', tipo: 'sintesi',
        testo: 'Anche quando la pubblicazione di dati personali è prevista da norme, l’ente deve diffondere solo i dati pertinenti e non eccedenti rispetto alle finalità perseguite, evitando di mettere a disposizione informazioni ulteriori come recapiti, coordinate bancarie, dati di documenti di identità, e deve rendere non intelligibili i dati non pertinenti, sensibili o giudiziari non indispensabili.',
      },
      'salute': {
        rif: 'Linee guida, dati idonei a rivelare lo stato di salute', tipo: 'sintesi',
        testo: 'È vietata la diffusione di dati idonei a rivelare lo stato di salute; l’ente deve astenersi dal pubblicare qualsiasi informazione da cui si possa desumere, anche indirettamente, lo stato di malattia o l’esistenza di patologie dei soggetti interessati.',
      },
      'iniziali': {
        rif: 'Linee guida, tecniche di oscuramento (iniziali)', tipo: 'sintesi',
        testo: 'Per rendere non intelligibili i dati non basta sostituire il nome e cognome con le iniziali: occorre oscurare del tutto il nominativo e le altre informazioni riferite all’interessato che ne consentano l’identificazione anche a posteriori.',
      },
      'indicizzazione': {
        rif: 'Linee guida, indicizzazione dei motori di ricerca', tipo: 'sintesi',
        testo: 'I dati sensibili e giudiziari pubblicati in adempimento di obblighi di trasparenza vanno sottratti all’indicizzazione da parte dei motori di ricerca esterni.',
      },
      'albo': {
        rif: 'Linee guida, albo pretorio online', tipo: 'sintesi',
        testo: 'La pubblicazione all’albo pretorio online di atti contenenti dati personali è lecita solo se prevista da una norma di legge o di regolamento, nel rispetto dei principi di pertinenza e non eccedenza e per il tempo previsto dalla norma; i dati non pertinenti vanno omessi o oscurati.',
      },
      'vantaggi': {
        rif: 'Linee guida, sovvenzioni, contributi, sussidi e vantaggi economici', tipo: 'sintesi',
        testo: 'Per i vantaggi economici di importo superiore a mille euro annui la pubblicazione è dovuta, ma è esclusa quando dai dati identificativi si possano ricavare informazioni sullo stato di salute o sulla situazione di disagio economico-sociale dell’interessato; al di sotto della soglia i dati identificativi non vanno pubblicati.',
      },
    },
  },

  garanteFaq: {
    id: 'garanteFaq', tipo: 'prassi',
    estremi: 'Garante per la protezione dei dati personali, FAQ «Trasparenza online» (sito istituzionale)',
    breve: 'Garante, FAQ Trasparenza online',
    url: 'https://www.garanteprivacy.it/temi/trasparenza-online',
    consultata: '2026-09-18', verificata: false,
    // La numerazione delle FAQ può variare nel tempo: riscontrarla sul sito.
    passaggi: {
      '5': { rif: 'FAQ sui dirigenti responsabili degli uffici', tipo: 'sintesi', testo: 'Fra i dati oggetto di pubblicazione rientrano i nomi dei dirigenti responsabili dei singoli uffici e i loro recapiti istituzionali.' },
      '8': { rif: 'FAQ sui dati sensibili e giudiziari', tipo: 'sintesi', testo: 'I dati sensibili e giudiziari possono essere diffusi solo se indispensabili alle finalità di trasparenza e comunque non sono indicizzabili dai motori di ricerca.' },
      '9': { rif: 'FAQ sui dati giudiziari', tipo: 'sintesi', testo: 'I riferimenti a procedimenti penali o civili, sentenze e condanne vanno oscurati quando non indispensabili alla finalità della pubblicazione.' },
      '10': { rif: 'FAQ sui dati sulla salute', tipo: 'sintesi', testo: 'È vietato diffondere dati idonei a rivelare lo stato di salute, anche in forma indiretta, ad esempio attraverso il riferimento a benefici o permessi collegati a una patologia.' },
      '12': { rif: 'FAQ sulla sostituzione con le iniziali', tipo: 'sintesi', testo: 'La sostituzione di nome e cognome con le iniziali non costituisce anonimizzazione: occorre oscurare del tutto il nominativo e le informazioni che consentono l’identificazione.' },
      '14': { rif: 'FAQ sui dati eccedenti', tipo: 'sintesi', testo: 'Vanno evitati i dati eccedenti quali i recapiti individuali e le coordinate bancarie utilizzate per i pagamenti.' },
      '15': { rif: 'FAQ sui vantaggi economici', tipo: 'sintesi', testo: 'Per i vantaggi economici inferiori a mille euro nell’anno solare i dati identificativi delle persone fisiche non sono pubblicabili; sopra la soglia la pubblicazione è esclusa se rivela stato di salute o disagio economico-sociale.' },
      '16': { rif: 'FAQ sull’albo pretorio', tipo: 'sintesi', testo: 'Per l’albo pretorio online la diffusione di dati personali è lecita solo se prevista dalla normativa di settore, nel rispetto dei principi di pertinenza e non eccedenza.' },
      '18': { rif: 'FAQ sull’indicizzazione', tipo: 'sintesi', testo: 'I dati sensibili e giudiziari pubblicati vanno sottratti all’indicizzazione dei motori di ricerca esterni.' },
    },
  },

  anac1310: {
    id: 'anac1310', tipo: 'prassi',
    estremi: 'ANAC, delibera 28 dicembre 2016, n. 1310, «Prime linee guida recanti indicazioni sull’attuazione degli obblighi di pubblicità, trasparenza e diffusione di informazioni contenute nel d.lgs. 33/2013 come modificato dal d.lgs. 97/2016»',
    breve: 'ANAC, delibera n. 1310/2016',
    url: 'https://www.anticorruzione.it/',
    consultata: '2026-09-18', verificata: false,
    passaggi: {
      'identita': {
        rif: 'par. 3 (dati personali e documenti di identità)', tipo: 'sintesi',
        testo: 'Nelle sezioni di Amministrazione trasparente non vanno pubblicati dati personali eccedenti rispetto alle finalità, e in particolare non vanno pubblicate copie di documenti di identità.',
      },
    },
  },

  // -------------------------------------------------------------- Casistica
  garanteSanzionePatologia: {
    id: 'garanteSanzionePatologia', tipo: 'casistica',
    estremi: 'Garante per la protezione dei dati personali, provvedimento sanzionatorio nei confronti di un ente locale per la pubblicazione di una determinazione dirigenziale recante l’indicazione della patologia dell’istante (sanzione di diecimila euro). Estremi del provvedimento da integrare dall’ufficio.',
    breve: 'Garante, sanzione per patologia in determinazione pubblicata',
    url: 'https://www.garanteprivacy.it/',
    consultata: '2026-09-18', verificata: false,
    passaggi: {
      'caso': { rif: 'provvedimento', tipo: 'sintesi', testo: 'La pubblicazione online di una determinazione dirigenziale che riportava la patologia dell’istante è stata sanzionata come diffusione illecita di dati sulla salute.' },
    },
  },
  garanteSanzioneIban: {
    id: 'garanteSanzioneIban', tipo: 'casistica',
    estremi: 'Garante per la protezione dei dati personali, provvedimento sanzionatorio per la pubblicazione dell’IBAN del professionista incaricato in un atto di liquidazione. Estremi del provvedimento da integrare dall’ufficio.',
    breve: 'Garante, sanzione per IBAN del professionista',
    url: 'https://www.garanteprivacy.it/',
    consultata: '2026-09-18', verificata: false,
    passaggi: {
      'caso': { rif: 'provvedimento', tipo: 'sintesi', testo: 'La pubblicazione delle coordinate bancarie di un professionista, dato eccedente rispetto alla finalità di trasparenza, è stata sanzionata.' },
    },
  },
};

// Restituisce {fonte, passaggio} da un identificativo "fonte.passaggio".
export function passaggio(id) {
  const [f, ...resto] = id.split('.');
  const fonte = FONTI[f];
  const chiave = resto.join('.');
  const p = fonte?.passaggi[chiave];
  if (!fonte || !p) return null;
  return { id, fonte, passaggio: p };
}

// Identificativi dei passaggi di una fonte nell'ordine dell'articolato.
// (Le chiavi numeriche degli oggetti JavaScript perdono l'ordine di
// scrittura: "15" verrebbe prima di "7bis.4".)
export function passaggiOrdinati(fonte) {
  const parti = (k) => (k.match(/\d+|[a-z]+/gi) || []).map((t) => (/^\d+$/.test(t) ? Number(t) : t));
  const chiavi = Object.keys(fonte.passaggi);
  const numerica = chiavi.every((k) => /^\d/.test(k));
  if (!numerica) return chiavi.map((k) => fonte.id + '.' + k);
  return chiavi.sort((a, b) => {
    const pa = parti(a), pb = parti(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if (pa[i] === undefined) return -1;
      if (pb[i] === undefined) return 1;
      if (pa[i] === pb[i]) continue;
      if (typeof pa[i] === 'number' && typeof pb[i] === 'number') return pa[i] - pb[i];
      // "7" precede "7bis"; una lettera dopo il numero è un articolo aggiunto.
      if (typeof pa[i] === 'number') return -1;
      if (typeof pb[i] === 'number') return 1;
      return String(pa[i]).localeCompare(String(pb[i]));
    }
    return 0;
  }).map((k) => fonte.id + '.' + k);
}

// Etichetta breve di un passaggio: "art. 26, comma 4, d.lgs. 33/2013".
export function etichettaPassaggio(id) {
  const x = passaggio(id);
  if (!x) return id;
  return x.passaggio.rif + ', ' + x.fonte.breve;
}

// Gradi di certezza del riconoscimento di un rilievo. Il rapporto li
// distingue, e l'attestazione finale dell'operatore riguarda in particolare
// i rilievi statistici.
export const CERTEZZA = {
  formale: { id: 'formale', etichetta: 'riconoscimento formale', descrizione: 'identificativo con struttura e carattere di controllo verificati (codice fiscale, IBAN, partita IVA, zona a lettura ottica)' },
  contestuale: { id: 'contestuale', etichetta: 'riconoscimento contestuale', descrizione: 'dato individuato da un’etichetta o da un contesto esplicito (nato a, residente in, tel., carta d’identità n.)' },
  statistico: { id: 'statistico', etichetta: 'riconoscimento statistico', descrizione: 'modello di riconoscimento dei nomi, parole chiave o euristiche geometriche: da verificare a schermo' },
  manuale: { id: 'manuale', etichetta: 'indicato dall’utente', descrizione: 'oscuramento aggiunto manualmente' },
};
