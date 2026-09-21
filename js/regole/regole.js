// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Modulo dati delle regole di oscuramento.
//
// Traduce in forma operativa il documento `regole-oscuramento.md`, che resta
// la fonte di riferimento. Questo file contiene solo dati (categorie, fonti,
// espressioni di ricerca, parole chiave): nessuna logica applicativa, così da
// poter essere aggiornato quando intervengono nuove pronunce senza toccare il
// codice. Ogni modifica va datata e accompagnata dalla fonte.
//
// Architettura a tre fasce (regole-oscuramento.md, premessa metodologica):
//   A  divieto assoluto di diffusione: oscuramento automatico
//   B  dati mai pertinenti: oscuramento automatico, ripristinabile in revisione
//   C  da segnalare, non da decidere: la decisione spetta all'amministrazione
// Più due marcature di servizio:
//   P  dato da preservare in chiaro (elenco di esclusione)
//   M  oscuramento aggiunto manualmente dall'utente

export const REGOLE_VERSIONE = '18 settembre 2026';

import { FONTI as BASE_FONTI, etichettaPassaggio } from './fonti.js';

// Corrispondenza fra le chiavi usate nelle regole e i passaggi della base
// delle fonti (fonti.js): "fonte.passaggio".
export const PASSAGGI = {
  dlgs33_7bis4: 'dlgs33.7bis.4',
  dlgs33_7bis5: 'dlgs33.7bis.5',
  dlgs33_7bis6: 'dlgs33.7bis.6',
  dlgs33_15: 'dlgs33.15',
  dlgs33_19: 'dlgs33.19',
  dlgs33_23: 'dlgs33.23',
  dlgs33_26_2: 'dlgs33.26.2',
  dlgs33_26_4: 'dlgs33.26.4',
  dlgs33_27: 'dlgs33.27.1',
  dlgs33_27d: 'dlgs33.27.1',
  dlgs33_37: 'dlgs33.37',
  dlgs196_2septies8: 'dlgs196.2septies.8',
  gdpr4: 'gdpr.4.1',
  gdpr5: 'gdpr.5.1.c',
  gdpr9: 'gdpr.9.1',
  gdpr10: 'gdpr.10',
  gdprC26: 'gdpr.c26',
  gdpr4_5: 'gdpr.4.5',
  l69_32: 'l69.32.1',
  l190_1_32: 'l190.1.32',
  lrSicilia22_18: 'lrSicilia22.18',
  lineeGuida243: 'garante243.pertinenza',
  lineeGuida243_salute: 'garante243.salute',
  lineeGuida243_iniziali: 'garante243.iniziali',
  lineeGuida243_albo: 'garante243.albo',
  lineeGuida243_vantaggi: 'garante243.vantaggi',
  lineeGuida243_indicizzazione: 'garante243.indicizzazione',
  faq5: 'garanteFaq.5',
  faq8: 'garanteFaq.8',
  faq9: 'garanteFaq.9',
  faq10: 'garanteFaq.10',
  faq12: 'garanteFaq.12',
  faq14: 'garanteFaq.14',
  faq15: 'garanteFaq.15',
  faq16: 'garanteFaq.16',
  faq18: 'garanteFaq.18',
  anac1310: 'anac1310.identita',
  casoPatologia: 'garanteSanzionePatologia.caso',
  casoIban: 'garanteSanzioneIban.caso',
};

// Etichette brevi ("art. 26, comma 4, d.lgs. 33/2013"), usate nelle regole e
// nell'interfaccia; il rapporto cita anche il passaggio.
export const FONTI = Object.fromEntries(Object.entries(PASSAGGI).map(([k, id]) => [k, etichettaPassaggio(id)]));
// Dall'etichetta al passaggio, per risalire alla fonte.
const PASSAGGIO_DA_ETICHETTA = new Map(Object.entries(PASSAGGI).map(([k, id]) => [FONTI[k], id]));
export function passaggiDaEtichette(etichette) {
  return [...new Set(etichette.map((e) => PASSAGGIO_DA_ETICHETTA.get(e)).filter(Boolean))];
}
void BASE_FONTI;

// Fonte comune alla fascia B.
const FONTI_B = [FONTI.dlgs33_7bis4, FONTI.gdpr5];

// ---------------------------------------------------------------------------
// Categorie
//
// Campi:
//   id, fascia, etichetta, descrizione
//   fonti            elenco delle fonti normative (stringhe)
//   messaggio        testo mostrato all'utente (obbligatorio per la fascia C)
//   ripristinabile   l'utente può riportare il dato in chiaro
//   motivazione      'obbligatoria' | 'facoltativa' | 'nessuna'
//   estensione       {prima, dopo}: quanti caratteri estendere il testo
//                    rilevato fino al confine di clausola più vicino
//   nominativo       true se il dato è un nome di persona (per la
//                    pseudonimizzazione coerente)
//   azione           'oscura' (predefinita) | 'espungi' (pagina intera)
// ---------------------------------------------------------------------------
export const CATEGORIE = {
  // FASCIA A --------------------------------------------------------------
  A1: {
    id: 'A1', fascia: 'A',
    etichetta: 'Dati sulla salute',
    descrizione:
      'Patologie, diagnosi, terapie, ricoveri, certificazioni mediche, esenzioni, inabilità, invalidità, disabilità, riferimenti alla legge 104/1992, TSO, assenze per malattia con indicazione dell’infermità, anche per riferimento indiretto.',
    fonti: [FONTI.dlgs196_2septies8, FONTI.gdpr9, FONTI.dlgs33_7bis6, FONTI.faq10, FONTI.lineeGuida243_salute, FONTI.casoPatologia],
    messaggio:
      'Il divieto di diffusione copre anche i riferimenti indiretti da cui si possa desumere lo stato di salute. Casistica sanzionatoria: determinazione pubblicata con l’indicazione della patologia dell’istante, sanzione di diecimila euro.',
    ripristinabile: true, motivazione: 'obbligatoria',
    estensione: { prima: 40, dopo: 70 },
  },
  A2: {
    id: 'A2', fascia: 'A',
    etichetta: 'Dati genetici e biometrici',
    descrizione: 'Dati genetici, impronte digitali, riconoscimento facciale e altri dati biometrici.',
    fonti: [FONTI.dlgs196_2septies8, FONTI.gdpr9],
    messaggio: '',
    ripristinabile: true, motivazione: 'obbligatoria',
    estensione: { prima: 30, dopo: 50 },
  },
  A3: {
    id: 'A3', fascia: 'A',
    etichetta: 'Vita sessuale e orientamento sessuale',
    descrizione: 'Dati relativi alla vita sessuale o all’orientamento sessuale.',
    fonti: [FONTI.dlgs196_2septies8, FONTI.gdpr9],
    messaggio: '',
    ripristinabile: true, motivazione: 'obbligatoria',
    estensione: { prima: 30, dopo: 50 },
  },
  A4: {
    id: 'A4', fascia: 'A',
    etichetta: 'Origine razziale o etnica, convinzioni religiose o filosofiche, opinioni politiche, appartenenza sindacale',
    descrizione:
      'Trattabili per finalità di pubblicazione solo se indispensabili, ipotesi residuale. Oscurati automaticamente, con facoltà di ripristino motivato.',
    fonti: [FONTI.gdpr9, FONTI.dlgs33_7bis4, FONTI.faq8],
    messaggio:
      'Oscuramento automatico con facoltà di ripristino motivato: il dato può restare in chiaro solo se indispensabile alla finalità della pubblicazione, ad esempio quando il riferimento è a un’organizzazione e non alla convinzione o appartenenza di una persona identificata.',
    ripristinabile: true, motivazione: 'obbligatoria',
    estensione: { prima: 30, dopo: 50 },
  },

  // FASCIA B --------------------------------------------------------------
  B1: {
    id: 'B1', fascia: 'B',
    etichetta: 'Identificativo fiscale di persona fisica',
    descrizione: 'Codice fiscale, partita IVA di persona fisica, numero di tessera sanitaria.',
    fonti: FONTI_B,
    messaggio: '',
    ripristinabile: true, motivazione: 'facoltativa',
    estensione: { prima: 0, dopo: 0 },
  },
  B2: {
    id: 'B2', fascia: 'B',
    etichetta: 'Coordinate bancarie e dati di pagamento',
    descrizione: 'IBAN, conto corrente, intestazione di conto, dati della carta, riferimenti di mandato riconducibili a una persona fisica.',
    fonti: [FONTI.faq14, ...FONTI_B, FONTI.casoIban],
    messaggio:
      'Il Garante indica di evitare la pubblicazione di dati eccedenti quali le coordinate bancarie utilizzate per i pagamenti. Casistica: pubblicazione dell’IBAN del professionista incaricato, sanzionata. Ripristina solo se le coordinate appartengono a una società o a un ente.',
    ripristinabile: true, motivazione: 'facoltativa',
    estensione: { prima: 0, dopo: 0 },
  },
  B3: {
    id: 'B3', fascia: 'B',
    etichetta: 'Recapito individuale',
    descrizione: 'Indirizzo di residenza o domicilio, telefono privato, cellulare, posta elettronica personale, PEC personale. Restano in chiaro i recapiti istituzionali dell’ente e degli uffici.',
    fonti: [FONTI.faq14, ...FONTI_B],
    messaggio: 'Se il recapito è quello istituzionale dell’ente o di un ufficio, ripristinalo in chiaro.',
    ripristinabile: true, motivazione: 'facoltativa',
    estensione: { prima: 0, dopo: 0 },
  },
  B4: {
    id: 'B4', fascia: 'B',
    etichetta: 'Documento di riconoscimento',
    descrizione: 'Numero di carta d’identità, passaporto, patente, permesso di soggiorno, e ogni loro riproduzione.',
    fonti: FONTI_B,
    messaggio: '',
    ripristinabile: true, motivazione: 'facoltativa',
    estensione: { prima: 0, dopo: 0 },
  },
  B4P: {
    id: 'B4P', fascia: 'B',
    etichetta: 'Allegato costituito da un documento di riconoscimento',
    descrizione: 'La pagina appare costituita dalla riproduzione di un documento di identità: va espunta dal fascicolo pubblicato, non semplicemente oscurata. Il Garante (Linee guida n. 243/2014) e l’ANAC (delibera n. 1310/2016) escludono la pubblicazione di copie di documenti di identità, dati eccedenti non richiesti da alcuna norma.',
    fonti: [...FONTI_B, FONTI.lineeGuida243, FONTI.anac1310],
    messaggio: 'Pagina segnalata come allegato da espungere. Se la valutazione è errata, ripristinala: verrà pubblicata con gli eventuali oscuramenti puntuali.',
    ripristinabile: true, motivazione: 'facoltativa',
    estensione: { prima: 0, dopo: 0 },
    azione: 'espungi',
  },
  B5: {
    id: 'B5', fascia: 'B',
    etichetta: 'Dato anagrafico accessorio',
    descrizione: 'Data e luogo di nascita, stato civile, composizione del nucleo familiare.',
    fonti: FONTI_B,
    messaggio: '',
    ripristinabile: true, motivazione: 'facoltativa',
    estensione: { prima: 0, dopo: 0 },
  },
  B6: {
    id: 'B6', fascia: 'B',
    etichetta: 'Firma autografa scansionata',
    descrizione: 'Immagine che potrebbe contenere una firma autografa o un timbro con dati del sottoscrittore. La firma autografa è un dato personale e il suo oscuramento previene un uso improprio della sottoscrizione grafica. Resta in chiaro l’indicazione dattilografa del firmatario.',
    fonti: [FONTI.gdpr4, ...FONTI_B, FONTI.lineeGuida243],
    messaggio: 'Immagine individuata nella pagina. Se non è una firma (ad esempio un logo o un timbro senza firma), ripristinala.',
    ripristinabile: true, motivazione: 'facoltativa',
    estensione: { prima: 0, dopo: 0 },
  },
  B7: {
    id: 'B7', fascia: 'B',
    etichetta: 'Dato di terzo estraneo al procedimento',
    descrizione: 'Familiari, testimoni, segnalanti, soggetti menzionati incidentalmente.',
    fonti: FONTI_B,
    messaggio: '',
    ripristinabile: true, motivazione: 'facoltativa',
    estensione: { prima: 0, dopo: 0 },
    nominativo: true,
  },
  B8: {
    id: 'B8', fascia: 'B',
    etichetta: 'Dato riferibile a minore',
    descrizione: 'Oscuramento integrale, compreso il nominativo.',
    fonti: FONTI_B,
    messaggio: 'Nominativo che, dal contesto, appare riferito a un minore.',
    ripristinabile: true, motivazione: 'obbligatoria',
    estensione: { prima: 0, dopo: 0 },
    nominativo: true,
  },

  // FASCIA C --------------------------------------------------------------
  C1: {
    id: 'C1', fascia: 'C',
    etichetta: 'Nominativo di persona fisica',
    descrizione: 'Nome di persona fisica individuato nel testo.',
    fonti: [FONTI.dlgs33_27, FONTI.faq16],
    messaggio:
      'Nominativo di persona fisica rilevato. Se l’atto è destinato ad Amministrazione Trasparente e il soggetto rientra fra quelli per i quali il d.lgs. 33/2013 impone la pubblicazione, ad esempio beneficiario di vantaggio economico superiore a mille euro annui, contraente, consulente, il dato deve restare in chiaro. Se l’atto è destinato all’albo pretorio, la diffusione è lecita solo se prevista da una specifica norma di legge o di regolamento. Se il soggetto è un terzo estraneo al procedimento (familiare, testimone, segnalante), il dato va oscurato.',
    ripristinabile: true, motivazione: 'nessuna',
    estensione: { prima: 0, dopo: 0 },
    nominativo: true,
  },
  C2: {
    id: 'C2', fascia: 'C',
    etichetta: 'Beneficiario di vantaggio economico',
    descrizione: 'Nominativo associato nel contesto a un importo erogato o da erogare.',
    fonti: [FONTI.dlgs33_26_2, FONTI.dlgs33_26_4, FONTI.faq15, FONTI.lineeGuida243_vantaggi],
    messaggio:
      'Beneficiario di vantaggio economico. Se l’importo è inferiore a mille euro nell’anno solare, i dati identificativi non sono pubblicabili e l’oscuramento è proposto come predefinito. Se dai dati identificativi si possono ricavare informazioni sullo stato di salute o sulla situazione di disagio economico-sociale, la pubblicazione è esclusa.',
    ripristinabile: true, motivazione: 'nessuna',
    estensione: { prima: 0, dopo: 0 },
    nominativo: true,
  },
  C3: {
    id: 'C3', fascia: 'C',
    etichetta: 'Dato giudiziario',
    descrizione: 'Riferimenti a procedimenti penali, civili, contabili, sentenze, ricorsi, condanne alle spese, iscrizioni nel casellario.',
    fonti: [FONTI.gdpr10, FONTI.faq8, FONTI.faq9, FONTI.faq18, FONTI.lineeGuida243_indicizzazione],
    messaggio:
      'Dato giudiziario rilevato: trattabile solo se indispensabile alla finalità della pubblicazione e da sottrarre in ogni caso all’indicizzazione. Se il riferimento è a giurisprudenza citata come precedente e non riguarda persone identificate, può restare in chiaro.',
    ripristinabile: true, motivazione: 'nessuna',
    estensione: { prima: 20, dopo: 60 },
  },
  C4: {
    id: 'C4', fascia: 'C',
    etichetta: 'Condizione di disagio economico-sociale',
    descrizione: 'Contributi assistenziali, morosità, sfratto, reddito di inclusione, sostegno alloggiativo, esenzioni per reddito.',
    fonti: [FONTI.dlgs33_26_4],
    messaggio:
      'La pubblicazione è esclusa quando dai dati è possibile ricavare informazioni sullo stato di salute o sulla situazione di disagio economico-sociale degli interessati. Se il riferimento è generico e non riconducibile a una persona identificata, può restare in chiaro.',
    ripristinabile: true, motivazione: 'nessuna',
    estensione: { prima: 20, dopo: 60 },
  },
  C5: {
    id: 'C5', fascia: 'C',
    etichetta: 'Dato sul rapporto di lavoro di dipendente',
    descrizione: 'Valutazioni, procedimenti disciplinari, motivi di astensione dal lavoro, provvedimenti individuali.',
    fonti: [FONTI.dlgs33_7bis5],
    messaggio:
      'Le notizie concernenti lo svolgimento delle prestazioni di chiunque sia addetto a una funzione pubblica sono pubblicabili, ma non quelle relative alla natura delle infermità e degli impedimenti personali o familiari che causino astensione dal lavoro, né le componenti della valutazione o le notizie sul rapporto di lavoro idonee a rivelare dati sensibili.',
    ripristinabile: true, motivazione: 'nessuna',
    estensione: { prima: 20, dopo: 60 },
  },
  C6: {
    id: 'C6', fascia: 'C',
    etichetta: 'Operatore economico persona fisica',
    descrizione: 'Ditta individuale, libero professionista, lavoratore autonomo: sono persone fisiche, quindi i loro dati sono dati personali, diversamente da quelli di una società.',
    fonti: [FONTI.dlgs33_7bis4, FONTI.faq14],
    messaggio:
      'Se il dato appartiene a una persona fisica (ditta individuale, professionista, lavoratore autonomo) valuta la pertinenza rispetto alla finalità della pubblicazione. Se appartiene a una società o a un ente, resta in chiaro.',
    ripristinabile: true, motivazione: 'nessuna',
    estensione: { prima: 0, dopo: 0 },
  },
  C7: {
    id: 'C7', fascia: 'C',
    etichetta: 'Pagina da scansione non leggibile',
    descrizione: 'Pagina acquisita da scansione di cui il riconoscimento ottico non ha letto testo utile: può contenere un documento di identità, una firma, un timbro o altri dati personali non rilevabili automaticamente.',
    fonti: [FONTI.dlgs33_7bis4, FONTI.gdpr5, FONTI.lineeGuida243],
    messaggio:
      'Il riconoscimento ottico non ha letto testo utile in questa pagina: lo strumento non può classificarne il contenuto. Verificala a schermo. Se contiene la copia di un documento di identità o altri dati non pertinenti, scegli «Oscura» per espungerla dal fascicolo pubblicato; altrimenti mantienila.',
    ripristinabile: true, motivazione: 'nessuna',
    estensione: { prima: 0, dopo: 0 },
    azione: 'espungi',
  },

  C8: {
    id: 'C8', fascia: 'C',
    etichetta: 'Riferimento sanitario senza persona identificata',
    descrizione: 'Espressione riferita alla salute (patologie, invalidità, legge 104/1992…) senza alcun nominativo nelle vicinanze: può essere una citazione normativa o un riferimento generico, oppure riguardare una persona identificata altrove nel testo.',
    fonti: [FONTI.dlgs196_2septies8, FONTI.gdpr9, FONTI.dlgs33_7bis6, FONTI.faq10],
    messaggio:
      'Se l\u2019espressione riguarda una persona identificabile, anche indirettamente, va oscurata (divieto assoluto di diffusione dei dati sulla salute). Se è una citazione normativa o un riferimento generico (ad esempio il titolo di un regolamento), può restare in chiaro.',
    ripristinabile: true, motivazione: 'nessuna',
    estensione: { prima: 40, dopo: 70 },
  },

  // MARCATURE DI SERVIZIO ---------------------------------------------------
  P: {
    id: 'P', fascia: 'P',
    etichetta: 'Dato da preservare in chiaro',
    descrizione: 'Elemento che rientra nell’elenco di esclusione: dirigente firmatario, responsabile del procedimento, titolari di incarichi politici nell’esercizio delle funzioni, recapiti istituzionali.',
    fonti: [FONTI.faq5, FONTI.dlgs33_27d],
    messaggio: 'Il nominativo appare riferito a un soggetto che le regole indicano di mantenere in chiaro. Puoi comunque oscurarlo se la classificazione è errata.',
    ripristinabile: true, motivazione: 'nessuna',
    estensione: { prima: 0, dopo: 0 },
    nominativo: true,
  },
  M: {
    id: 'M', fascia: 'M',
    etichetta: 'Oscuramento manuale',
    descrizione: 'Porzione selezionata dall’utente.',
    fonti: [FONTI.dlgs33_7bis4],
    messaggio: '',
    ripristinabile: true, motivazione: 'nessuna',
    estensione: { prima: 0, dopo: 0 },
  },
};

for (const cat of Object.values(CATEGORIE)) cat.passaggi = passaggiDaEtichette(cat.fonti);

// Categorie proponibili per un oscuramento manuale (ordine di presentazione).
export const CATEGORIE_MANUALI = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'];

// Priorità in caso di sovrapposizione fra rilievi sullo stesso testo.
export const PRIORITA_FASCE = { A: 4, B: 3, C: 2, M: 5, P: 1 };

// ---------------------------------------------------------------------------
// Rilevatori basati su espressioni regolari e parole chiave.
//
// Ogni rilevatore: { categoria, nome, pattern, flag, gruppo?, validatore? }
//   pattern     espressione regolare (stringa)
//   flag        flag della RegExp (la 'g' viene aggiunta dal codice)
//   gruppo      indice del gruppo di cattura da oscurare (0 = intera corrispondenza)
//   validatore  nome della funzione di validazione in validatori.js
//   contesto    'intestazione-istituzionale' attiva l'euristica che tratta come
//               recapito istituzionale le corrispondenze in testa e piè di pagina
// ---------------------------------------------------------------------------

// Parole chiave della fascia A1, dati sulla salute (elenco non esaustivo,
// regole-oscuramento.md § A1). Le radici coprono le forme flesse.
const SALUTE = [
  'invalid(?:o|a|i|e|it[àa])(?:\\s+civile)?',
  'inabil(?:e|i|it[àa])',
  'infermit[àa]',
  'handicap',
  'disabil(?:e|i|it[àa])',
  'portator[ei]\\s+di\\s+handicap',
  '(?:legge|l\\.|ex\\s+l\\.)\\s*(?:n\\.?\\s*)?104(?:\\s*(?:/|del)\\s*(?:19)?92)?',
  'art\\.?\\s*3\\s*,?\\s*comma\\s*[13]\\s*,?\\s*(?:della\\s+)?(?:legge|l\\.)\\s*104',
  'patologi[ae]',
  'diagnos[ie]',
  'malatti[ae]',
  'terapi[ae]',
  'terapeutic[oaie]',
  'ricover(?:o|i|at[oa])',
  'intervent[oi]\\s+chirurgic[oi]',
  'certificat[oi]\\s+medic[oi]',
  'certificazion[ei]\\s+medic[ahe]',
  'esenzion[ei]\\s+(?:dal\\s+)?ticket',
  'codice\\s+(?:di\\s+)?esenzione',
  'causa\\s+di\\s+servizio',
  'equo\\s+indennizzo',
  'trattamento\\s+sanitario\\s+obbligatorio',
  '\\bTSO\\b',
  'psichiatric[oaie]',
  'psicolog(?:ic[oaie]|o|a)\\b',
  'tossicodipenden(?:te|ti|za)',
  'alcoldipenden(?:te|ti|za)',
  '\\bHIV\\b',
  'sieropositiv[oaie]',
  'tumor(?:e|i|ale)',
  'oncologic[oaie]',
  'diabet(?:e|ic[oaie])',
  'cardiopat(?:ia|ie|ic[oaie])',
  'depression[ei]',
  'disturb[oi]\\s+(?:mental[ei]|psichic[oi]|dell[oa]?\\s+\\w+)',
  'non\\s+autosufficien(?:te|ti|za)',
  'indennit[àa]\\s+di\\s+accompagnamento',
  'gravidanza',
  'protesi',
  'non\\s+vedent[ei]',
  'ipovedent[ei]',
  'ipoacusic[oaie]',
  'sordit[àa]',
  'invalidant[ei]',
  'sindrome\\s+(?:di\\s+)?\\w+',
  'inidone(?:o|a|i|e|it[àa])',
  'idoneit[àa]\\s+(?:psico)?fisica',
  'infortun(?:io|i|at[oa])',
  'dializ(?:zat[oa]|zati|zate|si)',
  'chemioterap(?:ia|ie|ic[oaie])',
  'radioterap(?:ia|ie|ic[oaie])',
  'visita\\s+fiscale',
  'commissione\\s+medic[ao]',
  'medico\\s+legale',
  'assenz[ae]\\s+per\\s+malattia',
  'stato\\s+di\\s+salute',
  'condizioni\\s+di\\s+salute',
  'salute\\s+mentale',
  'morbo\\s+di\\s+\\p{L}+',
  'alzheimer', 'parkinson', 'sclerosi', 'epile(?:ssia|ttic[oaie])', 'ictus', 'infart(?:o|i|uat[oa])',
  'leucemi[ae]', 'neoplasi[ae]', 'carcinom[ai]', 'demenz[ae]', 'autis(?:mo|tic[oaie])', 'celiach?[iae]a?',
  'asm(?:a|atic[oaie])', 'allergi[ae]', 'psicosi', 'schizofren(?:ia|ic[oaie])', 'bipolar[ei]',
  'anoressi[ae]', 'bulimi[ae]', 'obesit[àa]', 'ipertension[ei]', 'trapiant(?:o|i|at[oa])',
  'affett[oaie]\\s+da', 'pazient[ei]', 'cure\\s+mediche', 'cartella\\s+clinica', 'referto',
  'disturb[oi]\\s+(?:alimentar[ei]|del\\s+comportamento|dello\\s+spettro)', 'ludopati[ae]',
  'tossicodipendenz[ae]', 'invalidit[àa]\\s+permanente',
];

const GENETICI_BIOMETRICI = [
  'dat[oi]\\s+genetic[oi]',
  'test\\s+genetic[oi]',
  '\\bDNA\\b',
  'impront[ae]\\s+digital[ei]',
  'dat[oi]\\s+biometric[oi]',
  'biometric[oaie]',
  'riconoscimento\\s+facciale',
  'gruppo\\s+sanguigno',
];

const VITA_SESSUALE = [
  'orientamento\\s+sessuale',
  'vita\\s+sessuale',
  'omosessual(?:e|i|it[àa])',
  'transessual(?:e|i|it[àa])',
  'transgender',
  'identit[àa]\\s+di\\s+genere',
  '(?:rettificazione|attribuzione)\\s+di\\s+sesso',
];

const ORIGINE_CONVINZIONI = [
  'origin[ei]\\s+(?:razzial[ei]|etnic[ahe])',
  'etni[ae]',
  'comunit[àa]\\s+(?:rom|sinti)',
  'convinzion[ei]\\s+(?:religios[ae]|filosofich[ae])',
  'religion[ei]',
  'cattolic[oaie]',
  'musulman[oaie]',
  'islamic[oaie]',
  'ebraic[oaie]',
  'evangelic[oaie]',
  'testimon[ei]\\s+di\\s+geova',
  'opinion[ei]\\s+politich[ae]',
  'iscritt[oaie]\\s+al\\s+partito',
  'militant[ei]',
  'appartenenza\\s+sindacale',
  'iscritt[oaie]\\s+al\\s+sindacato',
  'rappresentant[ei]\\s+sindacal[ei]',
  'delegat[oaie]\\s+sindacal[ei]',
  '\\bRSU\\b',
  '\\b(?:CGIL|CISL|UIL|UGL|USB|COBAS|FIALS|NURSIND|DICCAP|CSA)\\b',
];

const GIUDIZIARI = [
  'sentenz[ae]',
  'ricors[oi]\\b',
  'procediment[oi]\\s+(?:penal[ei]|civil[ei]|contabil[ei])',
  'condann[ae]\\b',
  'condannat[oaie]',
  'casellario\\s+giudizi(?:al|ari)[eo]',
  'carichi\\s+pendenti',
  'decret[oi]\\s+ingiuntiv[oi]',
  'pignorament[oi]',
  'esecuzione\\s+forzata',
  'atto\\s+di\\s+citazione',
  'imputat[oaie]',
  'indagat[oaie]',
  'denunci[ae]\\b',
  'querel[ae]\\b',
  'atto\\s+di\\s+precetto',
  'contenzioso',
  'tribunale',
  'corte\\s+d[\'’]?\\s*appello',
  'corte\\s+dei\\s+conti',
  '\\bTAR\\b',
  'giudice\\s+di\\s+pace',
  'cassazione',
  'causa\\s+civile',
  '\\bR\\.?\\s?G\\.?\\s*(?:n\\.?)?\\s*\\d+(?:/\\d{2,4})?',
  'spese\\s+di\\s+lite',
  'condanna\\s+alle\\s+spese',
  'misur[ae]\\s+cautelar[ei]',
  'sorveglianza\\s+speciale',
  'interdittiva\\s+antimafia',
  'fedina\\s+penale',
];

const DISAGIO = [
  'morosit[àa]',
  'moros[oaie]\\b',
  'sfratt(?:o|i|at[oaie])',
  'reddito\\s+di\\s+(?:inclusione|cittadinanza)',
  'assegno\\s+di\\s+inclusione',
  '\\bISEE\\b',
  'indigen(?:te|ti|za)',
  'disagio\\s+(?:economico|sociale|abitativo|socio-economico)',
  'contribut[oi]\\s+(?:assistenzial[ei]|economic[oi]\\s+straordinar[oi]|per\\s+l[\'’]affitto|affitto)',
  'sostegno\\s+(?:alloggiativ[oa]|al\\s+reddito|all[\'’]affitto)',
  'esenzion[ei]\\s+per\\s+reddito',
  'emergenza\\s+abitativa',
  'bonus\\s+sociale',
  'povert[àa]',
  'inserimento\\s+in\\s+struttura',
  'casa\\s+famiglia',
  'assistenza\\s+domiciliare',
  'buon[oi]\\s+spesa',
  'stato\\s+di\\s+bisogno',
];

const RAPPORTO_LAVORO = [
  'procediment[oi]\\s+disciplinar[ei]',
  'sanzion[ei]\\s+disciplinar[ei]',
  'richiamo\\s+(?:scritto|verbale)',
  'censura\\b',
  'sospensione\\s+dal\\s+servizio',
  'licenziament[oi]',
  'valutazion[ei]\\s+(?:della\\s+|delle\\s+)?(?:performance|prestazion[ei])',
  'sched[ae]\\s+di\\s+valutazione',
  'aspettativa\\b',
  'conged[oi]\\b',
  'astensione\\s+dal\\s+lavoro',
  'assenz[ae]\\s+(?:dal\\s+servizio|per)',
  'permess[oi]\\s+(?:retribuit[oi]|ex\\s+lege)',
  'mobbing',
  'demansionament[oi]',
];

const unione = (elenco) => '(?:' + elenco.join('|') + ')';
// Confine di parola compatibile con le lettere accentate.
const INIZIO = '(?<![\\p{L}\\p{N}])';
const FINE = '(?![\\p{L}\\p{N}])';

// Parola di un nominativo con l'iniziale maiuscola, purché non sia una
// delle parole che aprono i campi anagrafici di un modulo (NATO A, RESIDENTE
// IN, CODICE FISCALE, VIA…) né una congiunzione o un ruolo.
const PAROLA_NOME = '(?!(?:NAT[OAI]|Nat[oai]|RESIDENTE|Residente|DOMICILIAT[OA]|Domiciliat[oa]|CODICE|Codice|C\\.?F\\.?|VIA|Via|PIAZZA|Piazza|CORSO|Corso|IN|In|A|Il|IL|LA|La|E|Ed|ED|CON|Con|NELLA|Nella|NEL|Nel|DELLA|Della|DEL|Del|CHE|Che|TITOLARE|Titolare|LEGALE|Legale|RAPPRESENTANTE|Rappresentante|QUALE|Quale)(?![\\p{L}]))[\\p{Lu}][\\p{L}\'’\\-]+';

export const RILEVATORI = [
  // Fascia A
  { categoria: 'A1', nome: 'salute', pattern: INIZIO + unione(SALUTE) + FINE, flag: 'iu' },
  { categoria: 'A2', nome: 'genetici-biometrici', pattern: INIZIO + unione(GENETICI_BIOMETRICI) + FINE, flag: 'iu' },
  { categoria: 'A3', nome: 'vita-sessuale', pattern: INIZIO + unione(VITA_SESSUALE) + FINE, flag: 'iu' },
  { categoria: 'A4', nome: 'origine-convinzioni', pattern: INIZIO + unione(ORIGINE_CONVINZIONI) + FINE, flag: 'iu' },

  // Fascia B1: codice fiscale, con verifica del carattere di controllo.
  {
    categoria: 'B1', nome: 'codice-fiscale',
    pattern: INIZIO + '[A-Z]{6}\\s?[0-9LMNPQRSTUV]{2}\\s?[ABCDEHLMPRST]\\s?[0-9LMNPQRSTUV]{2}\\s?[A-Z][0-9LMNPQRSTUV]{3}\\s?[A-Z]' + FINE,
    flag: 'iu', validatore: 'codiceFiscale',
  },
  // Fascia B1: numero di tessera sanitaria (20 cifre, inizia con 80380).
  { categoria: 'B1', nome: 'tessera-sanitaria', pattern: INIZIO + '80380\\s?\\d{5}\\s?\\d{5}\\s?\\d{5}' + FINE, flag: 'u' },

  // Fascia B2: IBAN italiano ed estero, con verifica mod 97.
  {
    categoria: 'B2', nome: 'iban',
    pattern: INIZIO + '[A-Za-z]{2}\\s?\\d{2}(?:\\s?[A-Za-z0-9]){11,30}' + FINE,
    flag: 'u', validatore: 'iban',
  },
  {
    categoria: 'B2', nome: 'conto-corrente',
    pattern: '(?:c/c|conto\\s+corrente|c\\.\\s?c\\.)\\s*(?:bancario|postale)?\\s*(?:n\\.?|n°|numero|nr\\.?)?\\s*[:.]?\\s*(\\d{6,13})',
    flag: 'iu', gruppo: 1,
  },
  {
    categoria: 'B2', nome: 'carta-di-pagamento',
    pattern: INIZIO + '(?:\\d[\\s-]?){12,18}\\d' + FINE,
    flag: 'u', validatore: 'luhn',
  },

  // Fascia B3: recapiti individuali.
  {
    categoria: 'B3', nome: 'cellulare',
    pattern: INIZIO + '(?:\\+39\\s?|0039\\s?)?3\\d{2}[\\s.\\-]?\\d{3}[\\s.\\-]?\\d{3,4}' + FINE,
    flag: 'u',
  },
  {
    categoria: 'B3', nome: 'telefono-fisso',
    pattern: '(?:tel(?:efono|\\.)?|fax|cell(?:ulare|\\.)?|recapito\\s+telefonico)\\s*[:.]?\\s*((?:\\+39\\s?)?0\\d{1,3}[\\s./\\-]?\\d{5,8})',
    flag: 'iu', gruppo: 1, contesto: 'intestazione-istituzionale',
  },
  {
    categoria: 'B3', nome: 'posta-elettronica',
    pattern: '[\\w.+\\-]+@[\\w\\-]+(?:\\.[\\w\\-]+)+',
    flag: 'iu', validatore: 'emailNonIstituzionale',
  },
  {
    categoria: 'B3', nome: 'residenza',
    pattern: '(?:residente|domiciliat[oa]|abitante|dimorante)\\s+(?:in|a|nel\\s+comune\\s+di|presso)\\s+([^,;\\n]{3,90}(?:,\\s*(?:via|viale|piazza|corso|largo|vicolo|contrada|c\\.da|strada|localit[àa]|loc\\.|frazione|salita|lungomare)\\s+[^,;\\n]{3,60})?)',
    flag: 'iu', gruppo: 1,
  },
  {
    categoria: 'B3', nome: 'indirizzo',
    pattern: INIZIO + '(?:[Vv]ia|VIA|[Vv]iale|VIALE|[Pp]iazza|PIAZZA|[Pp]iazzale|[Cc]orso|CORSO|[Ll]argo|LARGO|[Vv]icolo|[Vv]ico|[Cc]ontrada|[Cc]\\.da|[Ss]trada|[Ll]ocalit[àa]|[Ll]oc\\.|[Ff]razione|[Ff]raz\\.|[Ss]alita|[Dd]iscesa|[Ll]ungomare|[Tt]raversa)\\s+(?:[\\p{Lu}][\\p{L}\'’.]*\\s*|d[ei]\\s+|del(?:la|le|lo|l\')?\\s+|San(?:ta|to)?\\s+){1,5},?\\s*(?:n\\.?|n°|numero|nr\\.?|snc)?\\s*\\d{1,4}(?:\\s?/\\s?\\d{1,3})?(?:\\s?[A-Za-z](?![\\p{L}]))?(?:\\s*(?:CAP|cap|c\\.a\\.p\\.?)\\s*\\d{5})?' + FINE,
    flag: 'u', contesto: 'intestazione-istituzionale',
  },

  // Fascia B4: numeri di documenti di riconoscimento, solo se preceduti dal
  // nome del documento, per evitare falsi positivi.
  {
    categoria: 'B4', nome: 'documento-riconoscimento',
    pattern: '(?:carta\\s+d[\'’]?\\s*identit[àa]|c\\.\\s?i\\.|documento\\s+d[\'’]?\\s*identit[àa]|documento\\s+di\\s+riconoscimento|passaporto|patente(?:\\s+di\\s+guida)?|permesso\\s+di\\s+soggiorno|carta\\s+di\\s+soggiorno)\\s*(?:elettronica)?\\s*(?:n\\.?|n°|numero|nr\\.?)?\\s*[:.]?\\s*([A-Z]{2} ?\\d{5}[A-Z]{2}|[A-Z]{2} ?\\d{7}|(?=[A-Z0-9]*\\d)[A-Z0-9]{7,12})(?![\\p{L}\\p{N}])',
    flag: 'iu', gruppo: 1,
  },

  // Fascia B5: dati anagrafici accessori.
  {
    categoria: 'B5', nome: 'nascita',
    pattern: '(?:nat[oa](?:/[oa])?|nascit[ao])\\s+(?:a|in|il|ad)\\s+([^,;\\n]{2,60}?(?:\\s+(?:il|in\\s+data)\\s+)?(?:\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{2,4}|\\d{1,2}\\s+\\p{L}+\\s+\\d{4})?)(?=\\s*(?:[,;)\\n]|e\\s+residente|residente|C\\.?F\\.?|codice|$))',
    flag: 'iu', gruppo: 1,
  },
  // Data di nascita isolata: "il gg/mm/aaaa" a inizio riga o subito dopo il
  // luogo di nascita (moduli compilati), con anno compatibile con una nascita.
  {
    categoria: 'B5', nome: 'data-nascita-modulo',
    pattern: 'nat[oa](?:/[oa])?\\s+(?:a|in)\\s+[^\\n]{1,80}\\n\\s*il\\s+(\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{4})',
    flag: 'iu', gruppo: 1, validatore: 'dataDiNascitaPlausibile',
  },
  // Residenza nei moduli: "residente a X Prov. Y" con il valore separato da spazi.
  {
    categoria: 'B3', nome: 'residenza-modulo',
    pattern: '(?:residente|domiciliat[oa](?:/[oa])?)\\s+(?:a|in)\\s+([\\p{Lu}][^,;\\n]{1,60}?)\\s*(?=\\n|,|;|Prov|prov|\\(|$)',
    flag: 'u', gruppo: 1,
  },
  {
    categoria: 'B3', nome: 'indirizzo-modulo',
    pattern: '(?:^|\\n)\\s*(?:in\\s+)?(?:[Vv]ia|VIA|[Vv]iale|VIALE|[Pp]iazza|PIAZZA|[Pp]iazzale|[Cc]orso|CORSO|[Ll]argo|LARGO|[Vv]icolo|[Cc]ontrada|[Cc]\\.da|[Ss]trada|[Ll]ocalit[àa]|[Ff]razione)\\s+([\\p{Lu}][^\\n]{1,60}?(?:\\s*(?:n\\.|n°|numero|nr\\.?)?\\s*\\d{1,4}\\s?[A-Za-z]?)?(?:\\s*(?:CAP|cap)\\s*\\d{5})?)\\s*(?=\\n|$)',
    flag: 'u', gruppo: 1,
  },
  {
    categoria: 'B5', nome: 'data-di-nascita',
    pattern: '(?:data\\s+di\\s+nascita|luogo\\s+e\\s+data\\s+di\\s+nascita|luogo\\s+di\\s+nascita)\\s*[:.]?\\s*([^,;\\n]{2,60})',
    flag: 'iu', gruppo: 1,
  },
  {
    categoria: 'B5', nome: 'stato-civile',
    pattern: INIZIO + '(?:coniugat[oa]|celibe|nubile|vedov[oa]|divorziat[oa]|separat[oa]\\s+legalmente|stato\\s+civile\\s*[:.]?\\s*\\p{L}+)' + FINE,
    flag: 'iu',
  },
  {
    categoria: 'B5', nome: 'nucleo-familiare',
    pattern: 'nucleo\\s+familiare\\s+(?:(?:composto|formato|costituito)\\s+da[^.;\\n]{0,100}|di\\s+\\d+\\s+(?:component[ei]|person[ae]|unit[àa]))',
    flag: 'iu',
  },

  // Nominativi individuati dal contesto, in aggiunta al modello NER (utile per
  // i moduli compilati in maiuscolo, che il modello riconosce male). Vengono
  // classificati con le stesse regole dei nominativi del modello (ruoli
  // preservati, minori, beneficiari).
  {
    categoria: 'C1', nome: 'nominativo-dichiarante', nominativo: true,
    // Maiuscole esplicite: la corrispondenza resta sensibile alle maiuscole,
    // così le parole del nominativo devono iniziare con la maiuscola.
    // Le parole dei campi anagrafici che seguono (nato a, residente in, codice
    // fiscale, via…) chiudono il nominativo anche se scritte in maiuscolo.
    pattern: '(?:[Ss]ottoscritt[oa](?:/[oa])?|SOTTOSCRITT[OA](?:/[OA])?|[Dd]ichiarante|DICHIARANTE|[Rr]ichiedente|RICHIEDENTE|[Ii]stante|ISTANTE|[Ii]nteressat[oa]|INTERESSAT[OA])\\s+((?:' + PAROLA_NOME + '[ \\t]+){1,3}' + PAROLA_NOME + ')',
    flag: 'u', gruppo: 1,
  },
  {
    categoria: 'C1', nome: 'nominativo-titolato', nominativo: true,
    pattern: '(?:[Ss]ig\\.|[Ss]ig\\.ra|[Ss]ig\\.na|[Ss]ignor[ae]?|[Dd]ott\\.|[Dd]ott\\.ssa|[Dd]r\\.|[Ii]ng\\.|[Aa]rch\\.|[Aa]vv\\.|[Gg]eom\\.|[Rr]ag\\.|[Pp]rof\\.|[Pp]rof\\.ssa)\\s+((?:[\\p{Lu}][\\p{L}\'’\\-]+[ \\t]+){0,3}[\\p{Lu}][\\p{L}\'’\\-]{2,})',
    flag: 'u', gruppo: 1,
  },

  // Fascia C, segnalazioni per parole chiave.
  { categoria: 'C3', nome: 'giudiziari', pattern: INIZIO + unione(GIUDIZIARI) + FINE, flag: 'iu' },
  { categoria: 'C4', nome: 'disagio', pattern: INIZIO + unione(DISAGIO) + FINE, flag: 'iu' },
  { categoria: 'C5', nome: 'rapporto-lavoro', pattern: INIZIO + unione(RAPPORTO_LAVORO) + FINE, flag: 'iu' },
  // Partita IVA: può appartenere a una società (da preservare) o a una persona
  // fisica (B1). Non essendo distinguibile automaticamente, viene segnalata.
  {
    categoria: 'C6', nome: 'partita-iva',
    pattern: '(?:p\\.?\\s?iva|partita\\s+iva|p\\.\\s?i\\.|c\\.f\\.\\s*/\\s*p\\.?\\s?iva|cod\\.?\\s*fisc\\.?\\s*/\\s*p\\.?\\s?iva)\\s*[:.n°]*\\s*(?:IT\\s?)?(\\d{11})',
    flag: 'iu', gruppo: 1, validatore: 'partitaIva',
  },
];

// ---------------------------------------------------------------------------
// Riconoscimento dei nominativi (fascia C1, C2, B8, P).
// ---------------------------------------------------------------------------
export const NOMINATIVI = {
  // Soglia minima di confidenza del modello NER per considerare un'entità.
  sogliaConfidenza: 0.55,
  // Confidenza minima per accettare un nominativo scritto tutto in minuscolo.
  sogliaMinuscoli: 0.9,
  // Lunghezza minima del testo di un'entità.
  lunghezzaMinima: 3,
  // Parole che il modello scambia talvolta per nomi di persona (ruoli,
  // sostantivi comuni con l'iniziale maiuscola): un'entità fatta solo di
  // queste parole non è un nominativo, e nessuna di esse è un cognome per le
  // varianti.
  paroleNonNome: ['tecnico', 'tecnica', 'responsabile', 'direttore', 'direttrice', 'dirigente', 'funzionario', 'funzionaria', 'ufficio', 'comune', 'provincia', 'regione', 'settore', 'servizio', 'area', 'sindaco', 'presidente', 'segretario', 'segretaria', 'assessore', 'consigliere', 'dottore', 'dottoressa', 'ingegnere', 'architetto', 'avvocato', 'geometra', 'ragioniere', 'professore', 'signore', 'signora', 'commessa', 'progetto', 'project', 'manager', 'energie', 'rinnovabili', 'impianti', 'società', 'italia', 'europa', 'messina', 'catania', 'palermo', 'roma', 'milano', 'napoli', 'torino', 'diritti', 'certificato', 'casellario', 'tribunale', 'procura', 'generale', 'urgenza'],

  // Elenco di esclusione: ruoli che indicano soggetti da preservare in chiaro
  // (regole-oscuramento.md, "Da preservare sempre in chiaro"; Garante FAQ n. 5;
  // art. 27, lett. d), d.lgs. 33/2013). Le parole vengono cercate nelle
  // vicinanze del nominativo, prima o dopo.
  ruoliPreservati: [
    'dirigent[ei]', 'direttor[ei]', 'responsabile\\s+(?:unico\\s+)?del\\s+procedimento', '\\bRUP\\b',
    // Pubblici ufficiali e funzionari che sottoscrivono certificati e atti
    // (cancellieri, funzionari giudiziari, ufficiali di stato civile).
    'funzionari[oa]\\s+(?:giudiziari[oa]|amministrativ[oa]|responsabile|istruttore|delegat[oa]|incaricat[oa])',
    'cancellier[ei](?:\\s+esperto)?', 'ufficiale\\s+(?:giudiziario|rogante|di\\s+stato\\s+civile|d[\'\u2019]anagrafe)', 'notaio',
    // La denominazione dell'ufficio può seguire ("del servizio certificativo",
    // "del settore affari generali"): fino a due parole in più fanno parte del
    // ruolo, purché non siano un titolo (dott., sig.) che introduce il nome.
    'responsabile\\s+(?:del|dell[\'’]|della|dei)\\s+(?:servizio|ufficio|area|settore|unit[àa]|direzione|u\\.?o\\.?)(?:\\s+(?!dott|sig|ing|avv|arch|geom|prof|rag|dr\\b)\\p{L}{3,}){0,2}',
    'responsabile\\s+(?:unico|di\\s+p\\.?o\\.?)', 'posizione\\s+organizzativa', '\\bP\\.?O\\.?\\b',
    'segretari[oa]\\s+(?:generale|comunale|verbalizzante)?', 'sindac[oa]', 'vice\\s?sindac[oa]',
    'president[ei]', 'assessor[ei]', 'consiglier[ei]', 'commissari[oa]', 'presidente\\s+del\\s+consiglio',
    'capo\\s+(?:di\\s+)?gabinetto', 'sub\\s?commissari[oa]', 'istruttore\\s+direttivo',
    'sottoscritt[oa]\\s+dirigent[ei]', 'il\\s+funzionario', 'la\\s+funzionaria',
    'proponente', 'estensore', 'relatore', 'redatto\\s+da', 'visto\\s+di\\s+regolarit[àa]',
  ],
  // Raggio di ricerca, in caratteri, dei ruoli intorno al nominativo.
  raggioRuoli: 70,
  // Contesto privato: il ruolo (presidente, segretario, direttore…) è di un
  // soggetto privato, non dell'ente. Nelle vicinanze del ruolo, esclude la
  // preservazione.
  ruoliPrivati: ['associazion[ei]', 'societ[àa]', 's\\.?\\s?r\\.?\\s?l', 's\\.?\\s?p\\.?\\s?a', 'cooperativ[ae]', 'fondazion[ei]', 'comitat[oi]', 'condomini[oi]', 'parrocchi[ae]', 'ditt[ae]', 'impres[ae]', 'consorzi[oi]', 'circol[oi]', 'club', 'onlus', 'aps\\b', 'odv\\b', 'sindacat[oi]', 'assemblea\\s+dei\\s+soci', 'consiglio\\s+di\\s+amministrazione', 'cda\\b'],
  raggioRuoliPrivati: 60,
  // Terzi estranei al procedimento (B7): testimoni, familiari, segnalanti.
  terzi: ['testimon[ei]', 'segnalant[ei]', 'denunciant[ei]', 'esponent[ei]', 'coniuge', 'moglie', 'marito', 'convivent[ei]', 'figli[oa]', 'genitor[ei]', 'madre', 'padre', 'fratell[oi]', 'sorell[ae]', 'erede', 'eredi', 'familiar[ei]', 'parent[ei]', 'controinteressat[oaie]', 'vicin[oaie]\\s+di\\s+casa'],
  raggioTerzi: 40,

  // Contesto che indica un minore (fascia B8).
  minori: ['minor[ei]\\b', 'minorenn[ei]', 'figli[oa]\\s+minor[ei]', 'bambin[oaie]', 'alunn[oaie]', 'tutela\\s+del\\s+minore', 'affid[oa]\\s+(?:del|della|dei)\\s+minor'],
  raggioMinori: 90,

  // Contesto che indica un beneficiario di vantaggio economico (fascia C2).
  beneficiari: ['beneficiari[oa]', 'contribut[oi]', 'liquid(?:are|azione|a)', 'erog(?:are|azione|a)', 'sussidi[oi]', 'rimbors[oi]', 'indennit[àa]', 'sovvenzion[ei]', 'vantaggi[oi]\\s+economic[oi]', 'ausili[oi]\\s+finanziar[oi]', 'assegn[oi]', 'buon[oi]', 'voucher', 'borsa\\s+di\\s+studio', 'somma\\s+di', 'importo\\s+di', 'a\\s+favore\\s+di', 'in\\s+favore\\s+di', 'concessione'],
  raggioBeneficiari: 250,
  // Stato di salute o disagio riferito a un nominativo: la frase che lo rivela
  // ("Vista la richiesta del sig. …, nato …, residente …, affetto da …")
  // occupa spesso più righe; il legame vale entro la stessa frase (punto,
  // punto e virgola o riga vuota) fino a questi limiti.
  raggioSalute: 400,
  righeSalute: 6,
  // Parole che qualificano l'importo come corrispettivo di un rapporto
  // contrattuale o professionale, non come sovvenzione: prevale il contesto
  // del contraente (art. 15 e 37 d.lgs. 33/2013), non la soglia dei mille euro.
  corrispettivi: ['compens[oi]', 'corrispettiv[oi]', 'onorari[oi]', 'parcell[ae]', 'fattur[ae]', 'canone', 'prezzo', 'importo\\s+contrattuale', 'liquidazione\\s+(?:della\\s+)?(?:fattura|parcella|competenz)', 'saldo\\s+(?:della\\s+|del\\s+)?(?:fattura|parcella|corrispettivo|compenso)', 'acconto\\s+(?:sul|sulla|del|della)\\s+(?:corrispettivo|compenso|fattura|parcella)', 'SAL\\b', 'stato\\s+di\\s+avanzamento'],
  // Contesto che indica un contraente, affidatario, consulente o incaricato:
  // soggetti per i quali il d.lgs. 33/2013 e la l. 190/2012 impongono la
  // pubblicazione del nominativo in Amministrazione trasparente.
  contraenti: ['affidatari[oa]', 'aggiudicatari[oa]', 'contraente', 'appaltat(?:ore|rice)', 'consulent[ei]', 'incaricat[oa]', 'incarico\\s+(?:a|al|alla|professionale)',
    // Forme verbali del dispositivo: "di affidare al geom. …", "aggiudica alla ditta …", "conferire l'incarico a …".
    'affid(?:are|a|ato|amento)\\s+(?:a|al|allo|alla|all[’\']|ai|agli|alle)\\b', 'aggiudic(?:are|a|ato|azione)\\s+(?:a|al|allo|alla|all[’\']|ai|agli|alle)\\b', 'conferi(?:re|sce|to|mento)\\s+(?:l[’\']|dell[’\']|un\\s+)?incaric[oh]', 'fornitor[ei]', 'esecutor[ei]', 'operatore\\s+economico', 'ditta\\s+individuale', 'liber[oa]\\s+professionist[ai]', 'lavorator[ei]\\s+autonom[oi]', 'impresa\\s+individuale', 'titolare\\s+(?:della\\s+)?(?:ditta|omonima)'],
  raggioContraenti: 200,
  // Contesto che indica una persona fisica titolare di partita IVA.
  personaFisica: ['ditt[ae]\\s+individual[ei]', 'impres[ae]\\s+individual[ei]', 'liber[oi]\\s+professionist[ai]', 'professionist[ai]', 'lavorator[ei]\\s+autonom[oi]', 'titolare[ \\t]+(?:della[ \\t]+)?(?:ditta|omonima)', 'studio\\s+(?:legale|tecnico|professionale|commerciale)\\s+(?:dott|avv|ing|arch|geom|rag)', 'nat[oa](?:/[oa])?\\s+(?:a|il)', 'codice\\s+fiscale\\s+[A-Z]{6}\\d{2}'],
  // Soglia sotto la quale l'oscuramento del beneficiario è proposto come
  // predefinito (art. 26, comma 4, d.lgs. 33/2013; Garante FAQ n. 15).
  sogliaImporto: 1000,
  importo: '(?:€|euro|eur)\\s*(\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d+(?:,\\d{1,2})?)(?!\\d|\\.\\d)|(?<!\\d|\\d\\.)(\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d+(?:,\\d{1,2})?)\\s*(?:€|euro\\b|eur\\b)',

  // Titoli che precedono spesso un nominativo e non ne fanno parte.
  titoli: ['sig\\.?', 'sig\\.ra', 'sig\\.na', 'signor[ae]?', 'dott\\.?', 'dott\\.ssa', 'dr\\.?', 'ing\\.?', 'arch\\.?', 'avv\\.?', 'geom\\.?', 'prof\\.?', 'prof\\.ssa', 'rag\\.?', 'on\\.?', 'sen\\.?'],
};

// ---------------------------------------------------------------------------
// Recapiti istituzionali: la posta elettronica che soddisfa questi criteri
// resta in chiaro (regole-oscuramento.md § B3).
// ---------------------------------------------------------------------------
export const RECAPITI_ISTITUZIONALI = {
  // Etichette di dominio (fra i punti) che iniziano con questi prefissi, o
  // domini completi che terminano con questi suffissi (voci con il punto).
  dominiParziali: ['comune', 'cittametropolitana', 'citta-metropolitana', 'provincia', 'regione', '.gov.it', '.governo.it', '.istruzione.it', 'unione', 'consorzio', 'asp', 'ausl', 'asl', 'aou', 'policlinico', 'camera', 'ordine', '.inps.it', '.inail.it', 'agenziaentrate', '.giustizia.it', '.interno.it', '.mit.gov.it', '.anac.it', 'garanteprivacy', '.unime.it', 'univ', '.edu.it', 'ministero', 'tribunale', 'corteconti', 'prefettura', 'protezionecivile', 'arpa', 'assemblea'],
  // Domini di posta personale: una casella su questi domini è sempre individuale.
  dominiPersonali: ['gmail.com', 'libero.it', 'hotmail.com', 'hotmail.it', 'yahoo.com', 'yahoo.it', 'outlook.com', 'outlook.it', 'live.com', 'live.it', 'tiscali.it', 'virgilio.it', 'alice.it', 'tin.it', 'email.it', 'icloud.com', 'me.com', 'pec.it', 'legalmail.it', 'arubapec.it', 'postecert.it', 'pec.libero.it', 'mypec.eu', 'pecimprese.it', 'protonmail.com', 'proton.me', 'fastwebnet.it', 'inwind.it', 'poste.it', 'msn.com', 'aol.com'],
  localiIstituzionali: ['protocollo', 'urp', 'segreteria', 'ufficio', 'servizio', 'servizi', 'direzione', 'area', 'settore', 'info', 'pec', 'sindaco', 'giunta', 'consiglio', 'gabinetto', 'personale', 'ragioneria', 'tributi', 'anagrafe', 'polizia', 'lavori', 'ambiente', 'urbanistica', 'trasparenza', 'privacy', 'dpo', 'rpd', 'contratti', 'gare', 'appalti', 'legale', 'avvocatura', 'affarigenerali', 'affari', 'presidenza', 'segretario', 'dirigente', 'staff', 'sportello', 'suap', 'sue', 'cultura', 'sport', 'scuola', 'istruzione', 'sociale', 'sociali', 'bilancio', 'economato', 'patrimonio', 'viabilita', 'trasporti', 'ced', 'sistemi', 'informatica', 'comunicazione', 'stampa', 'albo', 'notifiche', 'messi', 'elettorale', 'statocivile', 'demografici', 'cimiteri', 'edilizia', 'manutenzione', 'territorio', 'pianificazione', 'ambiente', 'rifiuti', 'verde', 'noreply', 'no-reply', 'amministrazione', 'ufficiotecnico'],
  // Espressioni che, nelle vicinanze di un recapito telefonico, indicano il
  // blocco dei dati di una società o di un ente (dati da preservare).
  contestoSocietario: '(?<![\\p{L}])(?:ditta(?!\\s+individuale)|societ[àa]|s\\.?\\s?r\\.?\\s?l\\.?|s\\.?\\s?p\\.?\\s?a\\.?|s\\.?\\s?n\\.?\\s?c\\.?|s\\.?\\s?a\\.?\\s?s\\.?|s\\.?\\s?c\\.?\\s?a\\.?\\s?r\\.?\\s?l\\.?|sede\\s+legale|ragione\\s+sociale|denominazione\\s+sociale|impresa(?!\\s+individuale)|azienda|cooperativa|consorzio|associazione|fondazione)(?![\\p{L}])',
  // Espressioni che indicano il blocco dei recapiti di un ente pubblico o di
  // un suo ufficio (FAQ n. 5: i recapiti istituzionali si pubblicano).
  contestoIstituzionale: '(?<![\\p{L}])(?:comune|provincia|regione|citt[àa]\\s+metropolitana|unione\\s+(?:dei\\s+)?comuni|ente|ufficio|settore|servizio|direzione|dipartimento|ripartizione|amministrazione|ministero|agenzia|prefettura|questura|tribunale|asp|asl|protocollo|segreteria|u\\.?r\\.?p\\.?)(?![\\p{L}])',
  // Espressioni che invece indicano un recapito personale: se compaiono più
  // vicine al recapito del contesto societario, il dato resta personale.
  contestoPersonale: '(?<![\\p{L}])(?:residente|residenza|domiciliat[oa]|domicilio|abitante|dimorante|nat[oa]|sig\\.|sig\\.ra|signor[ae]?|dott\\.|dott\\.ssa|codice\\s+fiscale|c\\.f\\.|individuale|professionista|titolare)(?![\\p{L}])',
  raggioContestoSocietario: 320,
  // Distanza massima, in caratteri, fra il nome di chi ricopre un ruolo
  // pubblico e il suo recapito istituzionale (stesso blocco, al più tre righe).
  raggioRuoloRecapito: 250,
  // Zona della pagina (frazione dell'altezza, dall'alto e dal basso) in cui i
  // recapiti sono con ogni probabilità quelli istituzionali dell'ente.
  zonaIntestazione: 0.13,
  zonaPiede: 0.07,
};

// ---------------------------------------------------------------------------
// Immagini: euristica per le firme autografe scansionate (fascia B6).
// ---------------------------------------------------------------------------
export const IMMAGINI = {
  // Un'immagine è candidata a firma se occupa meno di questa frazione dell'area
  // di pagina, non si trova nella zona di intestazione (stemmi, loghi) e ha
  // dimensioni minime plausibili.
  areaMassima: 0.25,
  zonaIntestazione: 0.15,
  larghezzaMinima: 40,
  altezzaMinima: 12,
  // Pagina considerata da scansione se l'unica immagine copre almeno questa
  // frazione dell'area.
  areaPaginaIntera: 0.8,
  // Riproduzione di una tessera (formato ID-1, proporzione 1,586) su una
  // pagina scansionata: intervallo di proporzioni ammesso, larghezza rispetto
  // alla pagina e riempimento minimo della regione.
  tesseraProporzioneMin: 1.4,
  tesseraProporzioneMax: 1.8,
  tesseraLarghezzaMin: 0.25,
  tesseraLarghezzaMax: 0.7,
  tesseraRiempimentoMin: 0.6,
};

// ---------------------------------------------------------------------------
// Pagina costituita da un documento di riconoscimento (fascia B4, allegato da
// espungere). Se il testo di una pagina contiene almeno `minimoIndizi` di
// queste espressioni, la pagina viene segnalata.
// ---------------------------------------------------------------------------
export const DOCUMENTO_IDENTITA = {
  // Indizi forti: espressioni proprie di un documento di riconoscimento, che
  // non compaiono nei moduli e nelle domande ordinarie.
  indiziForti: [
    'carta\\s+d[\'’]?\\s*identit[àa]', 'identity\\s+card', 'passaporto', 'passport', 'patente\\s+di\\s+guida',
    'permesso\\s+di\\s+soggiorno', 'ministero\\s+dell[\'’]\\s*interno', 'repubblica\\s+italiana',
    'statura', 'capelli', 'occhi', 'segni\\s+particolari', 'height',
    'impronta', 'tessera\\s+sanitaria', 'documento\\s+n\\.?\\s*\\d', 'n\\.?\\s*documento\\s*:?\\s*[A-Z0-9]{5,}',
    'issuing', 'surname', 'place\\s+of\\s+birth', 'date\\s+of\\s+birth',
  ],
  // Indizi deboli: campi anagrafici che compaiono anche nei moduli.
  indiziDeboli: [
    'cognome', 'nome', 'cittadinanza', 'nazionalit[àa]', 'luogo\\s+e\\s+data\\s+di\\s+nascita', 'data\\s+di\\s+nascita',
    'il\\s+sindaco', 'codice\\s+fiscale', 'validit[àa]', 'comune\\s+di', 'emissione', 'sex', 'residenza',
    'indirizzo\\s+di\\s+residenza', 'firma\\s+del\\s+titolare', 'scadenza', 'expiry', 'rilasciat[ao]\\s+(?:il|dal)',
  ],
  // Zona a lettura ottica (MRZ) delle carte e dei passaporti: sequenze di
  // maiuscole, cifre e "<". Un solo riscontro basta.
  mrz: '[A-Z0-9<]{2,}<{3,}[A-Z0-9<]*|<<[A-Z]{2,}<<',
  // Indizi forti sufficienti da soli.
  minimoForti: 2,
  // Sulle pagine di testo nativo (non scansioni).
  minimoFortiNativo: 3,
  // Sulle pagine native serve inoltre almeno un indizio strutturale: numero
  // di documento, campo tipico della tessera (statura, capelli, occhi,
  // impronta, firma del titolare) o MRZ.
  strutturali: ['statura', 'capelli', 'occhi', 'segni\\s+particolari', 'impronta', 'firma\\s+del\\s+titolare', 'documento\\s+n\\.?\\s*[A-Z0-9]', 'n\\.?\\s*documento\\s*:?\\s*[A-Z0-9]{5,}', 'carta\\s+d[\'’]?\\s*identit[àa]\\s+n\\.?\\s*[A-Z0-9]', 'passaporto\\s+n\\.?\\s*[A-Z0-9]', 'patente\\s+n\\.?\\s*[A-Z0-9]', 'height', 'identity\\s+card'],
  // Con almeno un indizio forte, totale minimo di indizi.
  minimoIndizi: 5,
  // Con una regione a forma di tessera nella pagina bastano meno indizi.
  minimoIndiziConTessera: 2,
  // La pagina deve inoltre essere breve: un documento di identità contiene poco testo.
  massimoCaratteri: 1500,
};

// Scansioni: una pagina con meno di questi caratteri estraibili viene
// sottoposta a riconoscimento ottico.
export const SOGLIA_TESTO_SCANSIONE = 25;

// ---------------------------------------------------------------------------
// Scopo del trattamento (scelto una volta per documento).
//
// Lo scopo determina le PROPOSTE di decisione per i rilievi di fascia C: lo
// strumento le applica in blocco, l'utente le conferma in blocco dopo averle
// viste, e il rapporto registra che la decisione è stata proposta dallo
// strumento per quello scopo e confermata (o modificata) dall'utente.
//
// Le proposte seguono un criterio prudenziale: dove la norma non impone la
// pubblicazione del dato, la proposta è l'oscuramento. Un dato oscurato in
// eccesso è rimediabile; un dato personale diffuso senza base giuridica no.
//
// Chiavi delle proposte:
//   C1            nominativo senza contesto qualificante
//   C1_contraente nominativo nel contesto di affidatario, contraente,
//                 consulente, incaricato
//   C2_sopra      beneficiario con importo pari o superiore a mille euro
//   C2_sotto      beneficiario con importo inferiore a mille euro
//   C2_salute     beneficiario il cui contesto rivela salute o disagio:
//                 pubblicazione esclusa (art. 26, comma 4)
//   C3, C4, C5    dato giudiziario, disagio economico-sociale, rapporto di lavoro
//   C6            partita IVA di natura indeterminata: mai proposta, va decisa
//   C6_societa    partita IVA nel contesto di una società o di un ente
//   C7            pagina da scansione non leggibile: mai proposta, va vista
//   C8            riferimento sanitario senza persona identificata vicina
// ---------------------------------------------------------------------------
// Scopo del trattamento: una sola scelta per documento, che orienta le
// proposte di decisione per la fascia C. Non dipende dal tipo di atto: le
// situazioni in cui una norma impone di lasciare un nominativo in chiaro
// (contraenti, beneficiari sopra soglia, titolari di incarichi) sono
// riconosciute dal testo dell'atto e spiegate rilievo per rilievo (`motivi`).
// Criterio prudenziale: dove nessuna norma impone la pubblicazione, la
// proposta è l'oscuramento.
export const SCOPI = {
  pubblica: {
    id: 'pubblica',
    etichetta: 'Pubblicazione obbligatoria di un ente pubblico',
    breve: 'albo pretorio, Amministrazione trasparente, sito istituzionale, obblighi regionali',
    descrizione:
      'L\u2019atto va pubblicato perché una norma lo impone. I dati delle fasce A e B vengono oscurati; fra i nominativi lo strumento propone di lasciare in chiaro solo quelli che la legge impone di pubblicare (contraenti e titolari di incarichi, beneficiari di vantaggi economici sopra mille euro) e indica la norma. Tutto il resto viene proposto per l\u2019oscuramento (art. 7-bis, comma 4, d.lgs. 33/2013).',
    fonti: [FONTI.dlgs33_7bis4, FONTI.dlgs33_26_2, FONTI.dlgs33_26_4, FONTI.dlgs33_27, FONTI.dlgs33_15, FONTI.dlgs33_37, FONTI.l190_1_32, FONTI.l69_32, FONTI.faq15, FONTI.faq16, FONTI.lineeGuida243_albo, FONTI.lrSicilia22_18],
    proposte: { C1: 'oscura', C1_contraente: 'mantieni', C2_sopra: 'mantieni', C2_sotto: 'oscura', C2_salute: 'oscura', C3: 'oscura', C4: 'oscura', C5: 'oscura', C6: 'oscura', C6_societa: 'mantieni', C7: null, C8: 'oscura' },
    motivi: {
      C1: 'Nominativo per cui lo strumento non ha riconosciuto un obbligo di pubblicazione (contraente, titolare di incarico, beneficiario sopra soglia): senza base giuridica la diffusione non è consentita (art. 7-bis, comma 4, d.lgs. 33/2013). Se l’atto è una graduatoria o un altro elenco che la legge impone di pubblicare con i nomi (art. 19 d.lgs. 33/2013), lascialo in chiaro.',
      C1_contraente: 'Contraente, affidatario o titolare di incarico: il nome va pubblicato (artt. 15 e 37 d.lgs. 33/2013; art. 28 d.lgs. 36/2023). Se l\u2019atto non è pubblicato per questi obblighi, oscurare.',
      C2_sopra: 'Vantaggio economico superiore a mille euro: il nome del beneficiario va pubblicato (art. 26, comma 2, e art. 27 d.lgs. 33/2013). Oscurare se l\u2019importo complessivo nell\u2019anno non supera i mille euro o se il beneficio rivela salute o disagio (art. 26, comma 4).',
      C2_sotto: 'Vantaggio economico non superiore a mille euro: il nome del beneficiario non va pubblicato (art. 26, comma 4, d.lgs. 33/2013; Garante, FAQ n. 15).',
      C2_salute: 'Il beneficio rivela lo stato di salute o una condizione di disagio economico-sociale: la pubblicazione del nome è esclusa qualunque sia l\u2019importo (art. 26, comma 4, d.lgs. 33/2013).',
      C3: 'Dato giudiziario: pubblicabile solo se indispensabile allo scopo della pubblicazione (art. 7-bis, comma 4, d.lgs. 33/2013; Garante, FAQ n. 9).',
      C4: 'Condizione di disagio economico-sociale: da oscurare (art. 26, comma 4, d.lgs. 33/2013).',
      C5: 'Dato sul rapporto di lavoro non compreso negli obblighi di pubblicazione: da oscurare (Linee guida del Garante n. 243/2014).',
      C6: 'Partita IVA di una persona fisica senza un contesto di contratto o di vantaggio economico riconosciuto: identificativo personale, proposto per l’oscuramento (art. 7-bis, comma 4, d.lgs. 33/2013). Lasciala in chiaro se il titolare è contraente o beneficiario (art. 27 d.lgs. 33/2013; art. 28 d.lgs. 36/2023).',
      C6_societa: 'Partita IVA di una società o di un ente: non è un dato personale.',
      C7: 'Pagina non leggibile automaticamente: va esaminata a schermo.',
      C8: 'Riferimento sanitario senza una persona identificata nella stessa frase: se riferibile a una persona, va oscurato (art. 2-septies, comma 8, d.lgs. 196/2003).',
    },
  },
  privato: {
    id: 'privato',
    etichetta: 'Invio, condivisione o pubblicazione facoltativa',
    breve: 'cittadini, professionisti, imprese, associazioni, uffici per usi diversi dalla pubblicazione obbligatoria',
    descrizione:
      'Nessuna norma impone di lasciare in chiaro un dato: vale il principio di minimizzazione (art. 5, par. 1, lett. c, Regolamento (UE) 2016/679). Tutto ciò che viene riconosciuto è proposto per l\u2019oscuramento; i dati di società ed enti restano in chiaro perché non sono dati personali. Ciò che ti serve in chiaro lo ripristini con un clic.',
    fonti: [FONTI.gdpr5, FONTI.gdpr4, FONTI.lineeGuida243],
    proposte: { C1: 'oscura', C1_contraente: 'oscura', C2_sopra: 'oscura', C2_sotto: 'oscura', C2_salute: 'oscura', C3: 'oscura', C4: 'oscura', C5: 'oscura', C6: 'oscura', C6_societa: 'mantieni', C7: null, C8: 'oscura' },
    motivi: {
      C1: 'Nessun obbligo impone di lasciare il nominativo in chiaro: minimizzazione (art. 5, par. 1, lett. c, Regolamento (UE) 2016/679).',
      C1_contraente: 'Nominativo di un contraente o incaricato: in assenza di un obbligo di pubblicazione vale la minimizzazione; ripristinare se il destinatario deve conoscerlo.',
      C2_sopra: 'Beneficiario di un vantaggio economico: l\u2019obbligo di pubblicare il nome vale solo per la pubblicazione nella sezione Amministrazione trasparente; qui vale la minimizzazione.',
      C2_sotto: 'Beneficiario di un vantaggio economico non superiore a mille euro: il nome non va diffuso (art. 26, comma 4, d.lgs. 33/2013).',
      C2_salute: 'Il beneficio rivela lo stato di salute o una condizione di disagio: non va diffuso (art. 26, comma 4, d.lgs. 33/2013; art. 9 Regolamento (UE) 2016/679).',
      C3: 'Dato giudiziario: non va diffuso senza una base giuridica (art. 10 Regolamento (UE) 2016/679).',
      C4: 'Condizione di disagio economico-sociale: da oscurare.',
      C5: 'Dato sul rapporto di lavoro: da oscurare.',
      C6: 'Partita IVA di una persona fisica: identificativo personale, da oscurare in assenza di necessità.',
      C6_societa: 'Partita IVA di una società o di un ente: non è un dato personale.',
      C7: 'Pagina non leggibile automaticamente: va esaminata a schermo.',
      C8: 'Riferimento sanitario senza una persona identificata nella stessa frase: se riferibile a una persona, va oscurato (art. 9 Regolamento (UE) 2016/679).',
    },
  },
};
export const ORDINE_SCOPI = ['pubblica', 'privato'];
for (const d of Object.values(SCOPI)) d.passaggi = passaggiDaEtichette(d.fonti);

// Grado di certezza del riconoscimento per ciascun rilevatore (fonti.js,
// CERTEZZA): formale = struttura e carattere di controllo verificati;
// contestuale = etichetta o contesto esplicito; statistico = modello, parole
// chiave, euristiche. I rilevatori non elencati sono statistici.
export const CERTEZZA_RILEVATORI = {
  'codice-fiscale': 'formale', 'tessera-sanitaria': 'formale', 'iban': 'formale', 'carta-di-pagamento': 'formale', 'partita-iva': 'formale',
  'conto-corrente': 'contestuale', 'telefono-fisso': 'contestuale', 'posta-elettronica': 'contestuale', 'residenza': 'contestuale',
  'residenza-modulo': 'contestuale', 'documento-riconoscimento': 'contestuale', 'nascita': 'contestuale', 'data-nascita-modulo': 'contestuale',
  'data-di-nascita': 'contestuale', 'stato-civile': 'contestuale', 'nucleo-familiare': 'contestuale', 'nominativo-dichiarante': 'contestuale',
  'nominativo-titolato': 'contestuale', 'pagina-documento-identita': 'contestuale',
  'manuale': 'manuale', 'manuale-testo': 'manuale',
};

// Segnalazioni per parole chiave (dato giudiziario, disagio, rapporto di
// lavoro) prive di un nominativo nelle vicinanze: non riguardano una persona
// identificata e vengono silenziate, cioè non generano rilievi.
export const SILENZIAMENTO = {
  categorie: ['C3', 'C4', 'C5'],
  // Raggio, in caratteri, entro cui cercare un nominativo (fasce C, B8, P).
  raggioNominativo: 300,
};

// Ordine di presentazione delle fasce nel pannello di revisione.
export const ORDINE_FASCE = ['C', 'A', 'B', 'P', 'M'];
