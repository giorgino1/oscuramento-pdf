// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Applicazione delle regole al testo estratto: produce l'elenco dei rilievi.
//
// Le regole sono dati (regole/regole.js); qui c'è solo la meccanica che le
// applica. Ogni rilievo conserva la categoria, e quindi la fascia e le fonti
// normative, che compariranno nel rapporto finale.

import {
  CATEGORIE, RILEVATORI, NOMINATIVI, RECAPITI_ISTITUZIONALI, DOCUMENTO_IDENTITA, PRIORITA_FASCE,
  SCOPI, SILENZIAMENTO, CERTEZZA_RILEVATORI,
} from './regole/regole.js';
import { VALIDATORI, LUNGHEZZE_IBAN, dominioIstituzionale } from './validatori.js';
import { boxPerIntervallo, unisciBox } from './testo.js';
import { candidateFirma } from './estrazione.js';
import { riconosciNomi, nerPronto } from './ner.js';

let contatoreId = 0;
export function nuovoId() {
  return 'r' + (++contatoreId);
}

const regexCompilate = RILEVATORI.map((r) => ({
  ...r,
  re: new RegExp(r.pattern, r.flag.replace('g', '') + 'gd'),
}));
const unione = (elenco) => '(?:' + elenco.join('|') + ')';
const reRuoli = new RegExp(unione(NOMINATIVI.ruoliPreservati), 'giu');
const reMinori = new RegExp(unione(NOMINATIVI.minori), 'giu');
const reBeneficiari = new RegExp(unione(NOMINATIVI.beneficiari), 'giu');
const reContraenti = new RegExp(unione(NOMINATIVI.contraenti), 'giu');
const rePersonaFisica = new RegExp(unione(NOMINATIVI.personaFisica), 'giu');
const reRuoliPrivati = new RegExp(unione(NOMINATIVI.ruoliPrivati), 'giu');
const reTerzi = new RegExp(unione(NOMINATIVI.terzi), 'giu');
const reCorrispettivi = new RegExp(unione(NOMINATIVI.corrispettivi), 'giu');
// Espressioni sanitarie e di disagio (A1, C4) che, riferite al beneficiario,
// escludono la pubblicazione (art. 26, comma 4, d.lgs. 33/2013).
const reSaluteDisagio = new RegExp(unione(RILEVATORI.filter((d) => d.categoria === 'A1' || d.categoria === 'C4').map((d) => d.pattern)), 'giu');
const reImporto = new RegExp(NOMINATIVI.importo, 'giu');
const reTitoli = new RegExp('^(?:' + NOMINATIVI.titoli.join('|') + ')\\s+', 'iu');
const reIndiziForti = DOCUMENTO_IDENTITA.indiziForti.map((p) => new RegExp(p, 'iu'));
const reIndiziDeboli = DOCUMENTO_IDENTITA.indiziDeboli.map((p) => new RegExp(p, 'iu'));
const reMrz = new RegExp(DOCUMENTO_IDENTITA.mrz, 'u');
const reStrutturali = DOCUMENTO_IDENTITA.strutturali.map((p) => new RegExp(p, 'iu'));
const reContestoSocietario = new RegExp('(?:' + RECAPITI_ISTITUZIONALI.contestoSocietario + '|' + RECAPITI_ISTITUZIONALI.contestoIstituzionale + ')', 'giu');
const reContestoPersonale = new RegExp(RECAPITI_ISTITUZIONALI.contestoPersonale, 'giu');

// Tutte le corrispondenze di `re` (globale) in `testo`: [{inizio, fine, testo}].
function corrispondenze(re, testo) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(testo)) !== null) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    out.push({ inizio: m.index, fine: m.index + m[0].length, testo: m[0], gruppi: m });
  }
  return out;
}

// Ultima posizione di una corrispondenza di `re` in `testo`, o -1.
function ultimaPosizione(re, testo) {
  const c = corrispondenze(re, testo);
  return c.length ? c[c.length - 1].inizio : -1;
}

// Crea un rilievo con i valori predefiniti della sua categoria.
export function creaRilievo(base) {
  const cat = CATEGORIE[base.categoria];
  const r = {
    id: nuovoId(),
    categoria: cat.id,
    fascia: cat.fascia,
    pagina: base.pagina,
    inizio: base.inizio ?? null,
    fine: base.fine ?? null,
    // Intervalli di testo coperti (per le selezioni manuali discontinue);
    // se assente vale [inizio, fine).
    intervalli: base.intervalli || null,
    testo: base.testo ?? '',
    box: base.box || [],
    origine: base.origine || 'automatico',
    rilevatore: base.rilevatore || null,
    decisione: null,
    proposto: false,
    modificato: false,
    motivazione: '',
    nota: base.nota || '',
    soggetto: null,
    chiave: base.chiave || null,
    modalita: null,
    azione: cat.azione || 'oscura',
    // Chiave con cui lo scopo del trattamento propone la decisione
    // (C1, C1_contraente, C2_sopra, ...). Impostata dal classificatore.
    chiaveProposta: base.chiaveProposta || cat.id,
    propostaDa: null,
    confermato: false,
  };
  // Decisione iniziale secondo la fascia (regole-oscuramento.md).
  if (cat.fascia === 'A' || cat.fascia === 'B' || cat.fascia === 'M') r.decisione = 'oscura';
  else if (cat.fascia === 'P') r.decisione = 'mantieni';
  else r.decisione = null; // fascia C: da decidere
  if (base.decisione !== undefined) r.decisione = base.decisione;
  if (base.proposto) r.proposto = true;
  // Decisione predefinita, per registrare nel rapporto se l'utente l'ha modificata.
  r.predefinita = r.decisione;
  // Chiave di raggruppamento per "applica a tutte le occorrenze".
  if (!r.chiave && r.testo && ['B1', 'B2', 'B3', 'B4', 'C6'].includes(r.categoria)) {
    r.chiave = r.categoria + ':' + r.testo.replace(/\s+/g, '').toLowerCase();
  }
  return r;
}

// Il punto è un confine di frase solo se chiude una frase, non se appartiene
// a un'abbreviazione come "n." o "art.".
function puntoFinale(testo, i) {
  if (testo[i] !== '.') return false;
  const seguente = testo.slice(i + 1, i + 3);
  if (!/^\s/.test(seguente) && seguente !== '') return false;
  const precedente = testo.slice(Math.max(0, i - 5), i);
  // Sigle puntate (C.F., s.r.l., P.E.C.) non chiudono la frase.
  if (/\p{L}\.\p{L}$/u.test(precedente)) return false;
  return !/(?:^|\s)(?:n|nn|art|artt|c|co|d|l|lgs|dott|sig|prot|rif|all|cap|pag|tel|cell|fax|ss|ing|avv|geom|arch|rag|prof)$/i.test(precedente);
}

// Vero se fra le posizioni a e b (a < b) non c'è un confine forte di frase:
// punto finale, punto e virgola, o riga vuota. I ritorni a capo semplici sono
// ammessi (blocchi di firma, elenchi), fino a `massimoRighe`.
function stessaClausola(testo, a, b, massimoRighe = 2) {
  let righe = 0;
  for (let i = a; i < b; i++) {
    const c = testo[i];
    if (c === ';' || puntoFinale(testo, i)) return false;
    if (c === '\n') {
      righe++;
      if (righe > massimoRighe) return false;
      if (testo[i + 1] === '\n') return false;
    }
  }
  return true;
}

// Estende l'intervallo [inizio, fine) fino ai confini di clausola più vicini,
// entro i limiti indicati dalla categoria.
function estendi(testo, inizio, fine, estensione) {
  const confini = /[;:,\n()•\[\]]/;
  let a = inizio, b = fine;
  for (let i = 0; i < estensione.prima && a > 0; i++) {
    if (confini.test(testo[a - 1]) || puntoFinale(testo, a - 1)) break;
    a--;
  }
  for (let i = 0; i < estensione.dopo && b < testo.length; i++) {
    if (confini.test(testo[b]) || puntoFinale(testo, b)) break;
    b++;
  }
  // Non spezza le parole ai bordi dell'estensione.
  const lettera = (c) => c !== undefined && /[\p{L}\p{N}]/u.test(c);
  while (a < inizio && lettera(testo[a - 1]) && lettera(testo[a])) a++;
  while (b > fine && lettera(testo[b - 1]) && lettera(testo[b])) b--;
  while (a < inizio && /\s/.test(testo[a])) a++;
  while (b > fine && /\s/.test(testo[b - 1])) b--;
  return [a, b];
}

// Rilevatori a espressioni regolari su una pagina.
function rilevaConRegex(pagina) {
  const rilievi = [];
  const testo = pagina.testo;
  for (const d of regexCompilate) {
    for (const m of corrispondenze(d.re, testo)) {
      let inizio = m.inizio, fine = m.fine;
      if (d.gruppo) {
        const idx = m.gruppi.indices && m.gruppi.indices[d.gruppo];
        if (!idx) continue;
        [inizio, fine] = idx;
      }
      let trovato = testo.slice(inizio, fine);
      if (d.validatore === 'iban' && !VALIDATORI.iban(trovato)) {
        // La corrispondenza può aver inglobato parole maiuscole successive
        // ("… BANCA"): si ritaglia alla lunghezza prevista per il paese.
        const attesa = LUNGHEZZE_IBAN[trovato.slice(0, 2).toUpperCase()];
        if (attesa) {
          let n = 0, k = 0;
          while (k < trovato.length && n < attesa) { if (!/\s/.test(trovato[k])) n++; k++; }
          fine = inizio + k;
          trovato = testo.slice(inizio, fine);
        }
      }
      if (d.validatore && !VALIDATORI[d.validatore](trovato)) continue;
      if (d.nominativo) {
        const r = creaNominativo(pagina, { inizio, fine });
        if (r) { r.rilevatore = d.nome; rilievi.push(r); }
        continue;
      }
      let categoria = d.categoria;
      let chiaveProposta;
      let nota = d.contesto || '';
      if (d.nome === 'partita-iva') {
        // Partita IVA: di persona fisica (B1) se il contesto indica ditta
        // individuale, professionista o lavoratore autonomo; di società (C6
        // con proposta in chiaro) se il contesto indica una persona giuridica;
        // altrimenti C6 senza proposta.
        // Prevale il contesto più vicino al numero.
        // Il contesto precede l'etichetta ("P. IVA"), che non deve contare.
        const prima = testo.slice(Math.max(0, m.inizio - NOMINATIVI.raggioContraenti), m.inizio);
        const dopo = testo.slice(fine, fine + 80);
        const nellaClausola = (c) => stessaClausola(testo, fine, fine + c.inizio, 1);
        const fisicaPrima = ultimaPosizione(rePersonaFisica, prima);
        const fisicaDopo = corrispondenze(rePersonaFisica, dopo).some(nellaClausola);
        const societaPrima = ultimaPosizione(reContestoSocietario, prima);
        const societaDopo = corrispondenze(reContestoSocietario, dopo).some(nellaClausola);
        const fisica = fisicaDopo || (fisicaPrima >= 0 && fisicaPrima > societaPrima && !societaDopo);
        const societa = !fisica && (societaDopo || societaPrima >= 0);
        if (fisica) { categoria = 'B1'; nota = 'partita IVA nel contesto di una persona fisica (ditta individuale, professionista)'; }
        else if (societa) { chiaveProposta = 'C6_societa'; nota = 'partita IVA nel contesto di una società o di un ente'; }
      }
      const cat = CATEGORIE[categoria];
      if (cat.estensione && (cat.estensione.prima || cat.estensione.dopo)) {
        [inizio, fine] = estendi(testo, inizio, fine, cat.estensione);
      }
      rilievi.push(creaRilievo({
        categoria,
        pagina: pagina.numero,
        inizio, fine,
        testo: testo.slice(inizio, fine),
        rilevatore: d.nome,
        nota,
        chiaveProposta,
      }));
    }
  }
  return rilievi;
}

// Pagina costituita da un documento di riconoscimento (fascia B4, da espungere).
// Serve almeno un indizio forte: la zona a lettura ottica (MRZ), un'espressione
// propria del documento (carta d'identità, passaporto, statura, firma del
// titolare…) o, nelle scansioni, una regione con le proporzioni di una
// tessera ID-1. I campi anagrafici generici (nome, cognome, residenza) da soli
// non bastano: comparirebbero in qualunque modulo.
function rilevaPaginaIdentita(pagina) {
  if (pagina.testo.length > DOCUMENTO_IDENTITA.massimoCaratteri) return null;
  const forti = reIndiziForti.filter((re) => re.test(pagina.testo)).length;
  const deboli = reIndiziDeboli.filter((re) => re.test(pagina.testo)).length;
  const mrz = reMrz.test(pagina.testo);
  const tessere = pagina.daScansione ? (pagina.tessere || []).length : 0;
  // Sulle pagine di testo nativo la sola citazione del documento ("rinnovo
  // del passaporto") non basta: servono più indizi specifici o la MRZ.
  const minimoForti = pagina.daScansione ? DOCUMENTO_IDENTITA.minimoForti : DOCUMENTO_IDENTITA.minimoFortiNativo;
  const strutturale = pagina.daScansione || reStrutturali.some((re) => re.test(pagina.testo));
  const riconosciuta = mrz
    || (strutturale && forti >= minimoForti)
    || (strutturale && forti >= 2 && forti + deboli >= DOCUMENTO_IDENTITA.minimoIndizi)
    || (tessere > 0 && (forti + deboli >= DOCUMENTO_IDENTITA.minimoIndiziConTessera || (pagina.confidenzaOcr ?? 0) < 70));
  if (!riconosciuta) return null;
  const motivi = [];
  if (forti + deboli) motivi.push((forti + deboli) + ' espressioni tipiche di un documento di riconoscimento' + (forti ? ' (' + forti + ' specifiche)' : ''));
  if (mrz) motivi.push('zona a lettura ottica (MRZ)');
  if (tessere) motivi.push(tessere + (tessere === 1 ? ' regione' : ' regioni') + ' con le proporzioni di una tessera');
  return creaRilievo({
    categoria: 'B4P',
    pagina: pagina.numero,
    testo: 'Pagina ' + pagina.numero + ': ' + motivi.join('; '),
    box: [{ x: pagina.origineX || 0, y: pagina.origineY || 0, w: pagina.larghezza, h: pagina.altezza }],
    rilevatore: 'pagina-documento-identita',
  });
}

// Pagina da scansione di cui l'OCR non ha letto testo utile (fascia C7): la
// decisione spetta all'utente, che deve guardarla. Per le pagine con livello
// testuale preesistente (scansione già sottoposta a OCR da altri) non c'è una
// confidenza: conta solo il numero di parole.
function rilevaPaginaIlleggibile(pagina) {
  if (!pagina.daScansione) return null;
  const parole = pagina.testo.split(/\s+/).filter((w) => /^[\p{L}]{3,}$/u.test(w)).length;
  const confidenza = pagina.confidenzaOcr;
  if (parole >= 12 && (confidenza == null || confidenza >= 60)) return null;
  return creaRilievo({
    categoria: 'C7',
    pagina: pagina.numero,
    testo: 'Pagina ' + pagina.numero + ': ' + parole + ' parole leggibili' + (confidenza != null ? ', confidenza OCR ' + confidenza.toFixed(0) + '%' : ', livello testuale preesistente'),
    box: [{ x: pagina.origineX || 0, y: pagina.origineY || 0, w: pagina.larghezza, h: pagina.altezza }],
    rilevatore: 'pagina-illeggibile',
  });
}

// Immagini candidate a firma autografa (fascia B6). Nelle pagine da scansione
// l'immagine è la pagina intera: la firma non è distinguibile e la revisione a
// schermo, obbligatoria, resta l'unico presidio.
function rilevaFirme(pagina) {
  if (pagina.daScansione) return [];
  return candidateFirma(pagina.immagini, pagina).map((im) => creaRilievo({
    categoria: 'B6',
    pagina: pagina.numero,
    testo: 'Immagine ' + Math.round(im.w) + '×' + Math.round(im.h) + ' pt',
    box: [{ x: im.x, y: im.y, w: im.w, h: im.h }],
    rilevatore: 'immagine',
  }));
}

// Importo in euro come numero, da una corrispondenza di reImporto.
function valoreImporto(m) {
  const grezzo = m.gruppi[1] || m.gruppi[2];
  if (!grezzo) return null;
  const n = Number(grezzo.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Normalizzazione di un nominativo per confrontare le occorrenze: minuscole,
// senza accenti, apostrofi unificati.
export function chiaveNominativo(testo) {
  return testo
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[\u2019\u2018`´]/g, "'")
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Crea il rilievo di un nominativo (fascia C1 in partenza), ripulito da titoli
// e punteggiatura ai bordi. La classificazione per contesto avviene dopo, in
// assegnaContesti(), quando tutti i nominativi della pagina sono noti.
function creaNominativo(pagina, e) {
  const testo = pagina.testo;
  let inizio = e.inizio, fine = e.fine;
  const lettera = (c) => c !== undefined && /[\p{L}'’-]/u.test(c);
  while (inizio > 0 && lettera(testo[inizio - 1]) && lettera(testo[inizio])) inizio--;
  while (fine < testo.length && lettera(testo[fine]) && lettera(testo[fine - 1])) fine++;
  let frammento = testo.slice(inizio, fine);
  const t = frammento.match(reTitoli);
  if (t) { inizio += t[0].length; frammento = testo.slice(inizio, fine); }
  while (fine > inizio && !/[\p{L}\p{N}.]/u.test(testo[fine - 1])) fine--;
  while (inizio < fine && !/[\p{L}\p{N}]/u.test(testo[inizio])) inizio++;
  frammento = testo.slice(inizio, fine);
  if (frammento.length < NOMINATIVI.lunghezzaMinima) return null;
  if (!/\p{Lu}/u.test(frammento) && !(e.punteggio >= NOMINATIVI.sogliaMinuscoli)) return null;
  if (!/\p{L}{2,}/u.test(frammento)) return null;
  if (/\p{N}/u.test(frammento)) return null; // un nominativo non contiene cifre
  const parole = frammento.toLowerCase().split(/[\s\-/]+/).filter(Boolean);
  if (parole.every((w) => NOMINATIVI.paroleNonNome.includes(w))) return null;
  return creaRilievo({
    categoria: 'C1',
    pagina: pagina.numero,
    inizio, fine,
    testo: frammento,
    rilevatore: 'ner',
    chiave: chiaveNominativo(frammento),
    chiaveProposta: 'C1',
  });
}

// Vero se le parole comprese fra le posizioni a e b sono compatibili con un
// legame diretto fra un ruolo e un nominativo: poche parole, oppure solo
// parole con l'iniziale maiuscola e abbreviazioni di titolo (blocchi di
// firma: "Il Dirigente / dott.ssa Anna Bianchi"). Un'intestazione seguita da
// testo corrente ("IL DIRIGENTE / Premesso che con istanza ... il sig. Mario
// Rossi") non lega il ruolo al nome.
function parolePonte(testo, a, b) {
  const parole = testo.slice(a, b).split(/\s+/).filter(Boolean);
  // Ammessi: parole con l'iniziale maiuscola, abbreviazioni di titolo,
  // articoli e preposizioni, punteggiatura. Un verbo o un sostantivo
  // minuscolo ("autorizza", "convoca", "nei confronti") interrompe il legame.
  const funzionale = /^(?:il|lo|la|i|gli|le|l'|un|una|uno|di|del|dello|della|dei|degli|delle|a|al|allo|alla|ai|agli|alle|da|dal|dallo|dalla|dai|dagli|dalle|in|nel|nello|nella|nei|negli|nelle|e|ed|o|con|per|su)$/iu;
  const titolo = new RegExp('^(?:' + NOMINATIVI.titoli.join('|') + ')$', 'iu');
  // Ammesse le parole con la sola iniziale maiuscola (nomi nei blocchi di
  // firma: "Il Dirigente / dott.ssa Anna Bianchi dott. Carlo Esposito"), non
  // quelle tutte in maiuscolo ("AUTORIZZA").
  const nome = /^[\p{Lu}][\p{Ll}'’.-]+$/u;
  // Sigle brevi tutte in maiuscolo (P.O., SAS, rumore del riconoscimento
  // ottico) sono ammesse; una parola lunga in maiuscolo ("AUTORIZZA") no.
  const sigla = /^[\p{Lu}.]{1,4}$/u;
  return parole.every((w) => funzionale.test(w) || titolo.test(w) || nome.test(w) || sigla.test(w) || /^(?:f\.to|firmato|[-–—:,()/]+|n\.|\d+)$/iu.test(w));
}

// Distanza in caratteri fra una parola chiave e un nominativo (0 se contigui).
function distanza(a, b) {
  if (a.fine <= b.inizio) return b.inizio - a.fine;
  if (b.fine <= a.inizio) return a.inizio - b.fine;
  return 0;
}

// Associa ogni parola chiave (ruolo, minore, contraente, importo) al
// nominativo più vicino nella stessa clausola, entro il raggio previsto.
// Ogni parola chiave si lega a un solo nominativo; le coppie vengono
// esaminate per distanza crescente, così che "Responsabile del procedimento:
// Anna Verdi. Controinteressato: Mario Rossi" preservi solo Anna Verdi, e
// "il minore Luca Bianchi è accompagnato dalla madre Maria Rossi" segni come
// minore solo Luca Bianchi. Restituisce Map(nominativo → [{tipo, parola, valore}]).
function associaParoleChiave(testo, nominativi, re, raggio, tipo, { esclusivoNome = false, massimoRighe = 2, valore = null, ponte = false } = {}) {
  const esito = new Map();
  if (!nominativi.length) return esito;
  const parole = corrispondenze(re, testo);
  const coppie = [];
  for (const p of parole) {
    for (const n of nominativi) {
      const d = distanza(p, n);
      if (d > raggio) continue;
      const a = Math.min(p.fine, n.fine), b = Math.max(p.inizio, n.inizio);
      if (!stessaClausola(testo, a, b, massimoRighe)) continue;
      if (ponte && !parolePonte(testo, a, b)) continue;
      // A parità di vicinanza prevale la coppia sulla stessa riga e quella in
      // cui la parola chiave precede il nome ("Il Dirigente dott. Rossi"):
      // in un blocco di firme su più righe ogni ruolo trova così il suo nome.
      const righe = (testo.slice(a, b).match(/\n/g) || []).length;
      const nomePrima = n.fine <= p.inizio;
      coppie.push({ p, n, d, punteggio: d + righe * 20 + (nomePrima ? 5 : 0) });
    }
  }
  coppie.sort((x, y) => x.punteggio - y.punteggio);
  const paroleUsate = new Set();
  const nomiUsati = new Set();
  for (const { p, n } of coppie) {
    if (paroleUsate.has(p)) continue;
    if (esclusivoNome && nomiUsati.has(n)) continue;
    paroleUsate.add(p);
    nomiUsati.add(n);
    if (!esito.has(n)) esito.set(n, []);
    esito.get(n).push({ tipo, parola: p.testo.trim(), valore: valore ? valore(p) : null });
  }
  return esito;
}

// Vero se il nominativo è introdotto come rappresentante o amministratore di
// un soggetto (legale rappresentante, amministratore unico, procuratore…).
const reRappresentante = /(?:legale\s+rappresentante|rappresentante\s+legale|amministratore\s+(?:unico|delegato)|procuratore|in\s+persona\s+del|nella\s+persona\s+di|rappresentat[oa]\s+da)\s*[:,]?\s*(?:sig\.?\s*|sig\.ra\s*|dott\.?\s*|dott\.ssa\s*|ing\.?\s*|avv\.?\s*|geom\.?\s*)?$/iu;
function rappresentante(testo, r) {
  return reRappresentante.test(testo.slice(Math.max(0, r.inizio - 60), r.inizio));
}

// Classificazione dei nominativi di una pagina per contesto. Priorità:
// minore (B8) > ruolo preservato (P) > beneficiario con importo (C2) >
// contraente (C1_contraente) > nominativo generico (C1).
function assegnaContesti(pagina, rilievi) {
  const testo = pagina.testo;
  const nominativi = rilievi.filter((r) => r.pagina === pagina.numero && r.categoria === 'C1' && r.inizio != null).sort((a, b) => a.inizio - b.inizio);
  if (!nominativi.length) return;
  const minori = associaParoleChiave(testo, nominativi, reMinori, NOMINATIVI.raggioMinori, 'minore', { massimoRighe: 1 });
  const ruoli = associaParoleChiave(testo, nominativi, reRuoli, NOMINATIVI.raggioRuoli, 'ruolo', { esclusivoNome: true, ponte: true });
  // Un ruolo nelle vicinanze di un soggetto privato (associazione, società,
  // condominio…) non è un ruolo pubblico.
  for (const n of [...ruoli.keys()]) {
    const zona = testo.slice(Math.max(0, n.inizio - NOMINATIVI.raggioRuoli - NOMINATIVI.raggioRuoliPrivati), n.fine + NOMINATIVI.raggioRuoli + NOMINATIVI.raggioRuoliPrivati);
    if (corrispondenze(reRuoliPrivati, zona).length) ruoli.delete(n);
  }
  const terzi = associaParoleChiave(testo, nominativi, reTerzi, NOMINATIVI.raggioTerzi, 'terzo', { massimoRighe: 0 });
  const corrispettivi = associaParoleChiave(testo, nominativi, reCorrispettivi, NOMINATIVI.raggioBeneficiari, 'corrispettivo');
  const salute = associaParoleChiave(testo, nominativi, reSaluteDisagio, NOMINATIVI.raggioSalute, 'salute', { massimoRighe: NOMINATIVI.righeSalute });
  const contraenti = associaParoleChiave(testo, nominativi, reContraenti, NOMINATIVI.raggioContraenti, 'contraente');
  const importi = associaParoleChiave(testo, nominativi, reImporto, NOMINATIVI.raggioBeneficiari, 'importo', { massimoRighe: 1, valore: valoreImporto });
  const beneficiari = associaParoleChiave(testo, nominativi, reBeneficiari, NOMINATIVI.raggioBeneficiari, 'beneficiario');
  for (const r of nominativi) {
    // Il contesto di salute o disagio viene annotato su ogni occorrenza,
    // qualunque sia la classificazione: serve alla coerenza fra le
    // occorrenze dello stesso soggetto (coerenzaSoggetti).
    if (salute.has(r)) r.contestoSalute = salute.get(r)[0].parola;
    if (minori.has(r)) {
      r.categoria = 'B8'; r.fascia = 'B'; r.decisione = 'oscura'; r.predefinita = 'oscura'; r.chiaveProposta = 'B8';
      r.nota = 'contesto: ' + minori.get(r)[0].parola;
    } else if (terzi.has(r)) {
      // Terzo estraneo al procedimento (B7): familiare, testimone, segnalante.
      r.categoria = 'B7'; r.fascia = 'B'; r.decisione = 'oscura'; r.predefinita = 'oscura'; r.chiaveProposta = 'B7';
      r.nota = 'contesto: ' + terzi.get(r)[0].parola;
    } else if (ruoli.has(r)) {
      r.categoria = 'P'; r.fascia = 'P'; r.decisione = 'mantieni'; r.predefinita = 'mantieni'; r.chiaveProposta = 'P';
      r.nota = 'ruolo indicato nel contesto: ' + ruoli.get(r)[0].parola;
    } else if (importi.has(r) && corrispettivi.has(r)) {
      // Compenso o corrispettivo contrattuale: non è un vantaggio economico,
      // vale il contesto del contraente/consulente (artt. 15 e 37 d.lgs. 33/2013).
      r.chiaveProposta = rappresentante(testo, r) ? 'C1' : 'C1_contraente';
      r.nota = 'corrispettivo: ' + corrispettivi.get(r)[0].parola;
    } else if (importi.has(r) && beneficiari.has(r)) {
      // Beneficiario di vantaggio economico: la soglia dei mille euro decide la
      // proposta (art. 26, comma 4, d.lgs. 33/2013; Garante FAQ n. 15).
      // L'importo è quello più vicino al nominativo, non il minimo della zona.
      const valori = importi.get(r).map((i) => i.valore).filter((v) => v != null);
      const importo = valori[0];
      r.categoria = 'C2';
      // L'obbligo riguarda gli importi superiori a mille euro (art. 26, comma 2):
      // mille euro esatti restano sotto soglia.
      const sotto = importo <= NOMINATIVI.sogliaImporto;
      if (salute.has(r)) {
        // Dal contesto si ricava lo stato di salute o di disagio del
        // beneficiario: la pubblicazione è esclusa (art. 26, comma 4).
        r.chiaveProposta = 'C2_salute';
        r.nota = 'importo associato: ' + importo.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) + '; contesto di salute o disagio: ' + salute.get(r)[0].parola;
      } else {
        r.chiaveProposta = sotto ? 'C2_sotto' : 'C2_sopra';
        r.nota = 'importo associato: ' + importo.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) + (sotto ? ', non superiore a mille euro' : '') + '; contesto: ' + beneficiari.get(r)[0].parola;
      }
    } else if (contraenti.has(r) && !rappresentante(testo, r)) {
      // Contraente, affidatario, consulente, incaricato: il nominativo è
      // contenuto necessario dell'atto (artt. 15 e 37 d.lgs. 33/2013; art. 1,
      // comma 32, l. 190/2012). Il legale rappresentante di una società
      // contraente non è il contraente: resta nominativo generico.
      r.chiaveProposta = 'C1_contraente';
      r.nota = 'contesto: ' + contraenti.get(r)[0].parola;
    }
  }
}

// Coerenza del trattamento fra le occorrenze dello stesso soggetto in tutto
// il fascicolo (regole-oscuramento.md, «Coerenza del trattamento»): la
// qualifica ricavata dal contesto in un punto (minore, terzo, ruolo
// preservato, beneficiario, contraente) vale per la persona, non per la
// riga, e viene trasmessa alle occorrenze rimaste generiche (C1). Lo stato di
// salute o di disagio, ovunque compaia accanto al nome, esclude la
// pubblicazione del beneficiario qualunque sia l'importo (art. 26, comma 4,
// d.lgs. 33/2013) e prevale quindi su C2_sopra e C2_sotto.
const PESO_QUALIFICA = { B8: 7, B7: 6, P: 5, C2_salute: 4, C2_sotto: 3, C2_sopra: 2, C1_contraente: 1 };
function coerenzaSoggetti(rilievi) {
  const perChiave = new Map();
  for (const r of rilievi) {
    if (!CATEGORIE[r.categoria].nominativo || !r.chiave || r.inizio == null) continue;
    if (!perChiave.has(r.chiave)) perChiave.set(r.chiave, []);
    perChiave.get(r.chiave).push(r);
  }
  const qualifica = (r) => (r.fascia === 'P' ? 'P' : r.chiaveProposta);
  for (const [, occorrenze] of perChiave) {
    if (occorrenze.length < 2) continue;
    const salute = occorrenze.find((r) => r.contestoSalute);
    if (salute) {
      for (const r of occorrenze) {
        if (r.categoria !== 'C2' || r.chiaveProposta === 'C2_salute') continue;
        r.chiaveProposta = 'C2_salute';
        r.nota = (r.nota ? r.nota + '; ' : '') + 'contesto di salute o disagio dello stesso soggetto: ' + salute.contestoSalute;
      }
    }
    // La qualifica di peso maggiore fra quelle trovate si estende alle
    // occorrenze generiche; le altre qualifiche esplicite restano com'erano.
    let guida = null;
    for (const r of occorrenze) {
      const q = qualifica(r);
      if (PESO_QUALIFICA[q] && (!guida || PESO_QUALIFICA[q] > PESO_QUALIFICA[qualifica(guida)])) guida = r;
    }
    if (!guida) continue;
    for (const r of occorrenze) {
      if (r === guida || r.categoria !== 'C1' || r.chiaveProposta !== 'C1' || r.fascia === 'P') continue;
      r.categoria = guida.categoria; r.fascia = guida.fascia;
      r.chiaveProposta = guida.chiaveProposta;
      r.decisione = guida.decisione; r.predefinita = guida.predefinita;
      r.nota = 'stesso soggetto' + (guida.nota ? ' (' + guida.nota + ')' : '');
    }
  }
}

// Segnalazioni per parole chiave (C3, C4, C5) prive di un nominativo nelle
// vicinanze: non riguardano una persona identificata e vengono silenziate.
// Con il riconoscimento dei nomi non disponibile il silenziamento è sospeso:
// l'assenza di un nominativo non sarebbe significativa.
function silenziaSenzaNominativo(rilievi, nerAttivo) {
  if (!nerAttivo) return rilievi;
  const nominativi = rilievi.filter((r) => CATEGORIE[r.categoria].nominativo && r.inizio != null);
  const vicino = (r) => nominativi.some((n) => n.pagina === r.pagina && n.fine >= r.inizio - SILENZIAMENTO.raggioNominativo && n.inizio <= r.fine + SILENZIAMENTO.raggioNominativo);
  return rilievi.filter((r) => {
    if (r.inizio == null) return true;
    if (SILENZIAMENTO.categorie.includes(r.categoria)) return vicino(r);
    return true;
  });
}

// Riferimenti sanitari (A1) senza persona identificata nelle vicinanze:
// possono essere citazioni normative o generiche ("regolamento per i permessi
// ai sensi della legge 104/1992"). Diventano segnalazioni di fascia C (C8)
// con proposta prudenziale di oscuramento, invece di oscuramenti automatici.
// Il nominativo deve trovarsi nella stessa frase o nel periodo contiguo
// (nessun punto fermo in mezzo, al più due ritorni a capo), entro il raggio.
function declassaSaluteSenzaPersona(pagine, rilievi, nerAttivo) {
  if (!nerAttivo) return;
  const nominativi = rilievi.filter((r) => CATEGORIE[r.categoria].nominativo && r.inizio != null);
  for (const r of rilievi) {
    if (r.categoria !== 'A1' || r.inizio == null) continue;
    const testo = pagine[r.pagina - 1].testo;
    const vicino = nominativi.some((n) => {
      if (n.pagina !== r.pagina || n.fine < r.inizio - NOMINATIVI.raggioSalute || n.inizio > r.fine + NOMINATIVI.raggioSalute) return false;
      const a = Math.min(n.fine, r.fine), b = Math.max(n.inizio, r.inizio);
      return a >= b || stessaClausola(testo, a, b, NOMINATIVI.righeSalute);
    });
    if (vicino) continue;
    r.categoria = 'C8'; r.fascia = 'C'; r.decisione = null; r.predefinita = null; r.chiaveProposta = 'C8';
    r.nota = 'nessun nominativo nelle vicinanze: possibile riferimento normativo o generico';
  }
}

// Applica le proposte di decisione previste dallo scopo del trattamento ai
// rilievi di fascia C ancora privi di decisione, con il motivo (norma).
export function applicaScopo(rilievi, idScopo) {
  const d = SCOPI[idScopo];
  if (!d) return;
  for (const r of rilievi) {
    if (r.fascia !== 'C' || r.decisione !== null) continue;
    r.motivoProposta = d.motivi[r.chiaveProposta] || '';
    const proposta = d.proposte[r.chiaveProposta] ?? null;
    if (!proposta) continue;
    r.decisione = proposta;
    r.predefinita = proposta;
    r.proposto = true;
    r.propostaDa = d.id;
    r.confermato = false;
  }
}

// Rilievi con proposta dello strumento non ancora confermata dall'utente.
export function daConfermare(rilievi) {
  return rilievi.filter((r) => r.proposto && !r.confermato && !r.modificato);
}

// Conferma in blocco tutte le proposte.
export function confermaProposte(rilievi) {
  for (const r of rilievi) if (r.proposto) r.confermato = true;
}

function sovrapposti(a, b) {
  return a.pagina === b.pagina && a.inizio != null && b.inizio != null && a.inizio < b.fine && b.inizio < a.fine;
}

// Elimina le sovrapposizioni fra rilievi sullo stesso testo: prevale la fascia
// con priorità maggiore; a parità, il rilievo più esteso. Un nominativo e un
// rilievo di altra natura (dato giudiziario, sanitario…) possono coesistere
// sullo stesso testo: il nominativo conserva la sua classificazione e la
// ricerca delle varianti, l'altro rilievo la sua fonte normativa.
function risolviSovrapposizioni(rilievi) {
  const testuali = rilievi.filter((r) => r.inizio != null).sort((a, b) => a.pagina - b.pagina || a.inizio - b.inizio);
  const nominativo = (r) => !!CATEGORIE[r.categoria].nominativo;
  const tenuti = [];
  for (const r of testuali) {
    let scarta = false;
    for (let i = tenuti.length - 1; i >= 0; i--) {
      const k = tenuti[i];
      if (k.pagina !== r.pagina) break;
      if (!sovrapposti(k, r)) continue;
      if (nominativo(k) !== nominativo(r)) continue;
      const pk = PRIORITA_FASCE[k.fascia], pr = PRIORITA_FASCE[r.fascia];
      const contenuto = (a, b) => a.inizio >= b.inizio && a.fine <= b.fine;
      // Sovrapposizione parziale fra rilievi con lo stesso peso: la
      // copertura si estende all'unione, così nessuna porzione resta scoperta.
      if (pk === pr && !contenuto(r, k) && !contenuto(k, r) && k.inizio != null) {
        const testo = pagineCorrenti[k.pagina - 1]?.testo;
        k.fine = Math.max(k.fine, r.fine);
        if (testo) k.testo = testo.slice(k.inizio, k.fine);
        if (k.categoria !== r.categoria) k.nota = (k.nota ? k.nota + '; ' : '') + 'sovrapposto a ' + CATEGORIE[r.categoria].etichetta;
        scarta = true;
        break;
      }
      // Un rilievo scompare solo se è interamente contenuto in uno di peso
      // maggiore o uguale: se sporge, resta, così nessuna porzione (la coda di
      // un indirizzo, ad esempio) rimane scoperta e ogni categoria conserva la
      // propria fonte nel rapporto.
      // Categorie diverse restano entrambe anche se una contiene l'altra
      // (la data di nascita dentro un riferimento sanitario): il rapporto
      // conserva così la fonte propria di ciascun dato.
      if (k.categoria !== r.categoria) continue;
      if (contenuto(r, k) && pk >= pr) { scarta = true; break; }
      if (contenuto(k, r) && pr >= pk) { tenuti.splice(i, 1); continue; }
    }
    if (!scarta) tenuti.push(r);
  }
  return [...tenuti, ...rilievi.filter((r) => r.inizio == null)];
}

// Cognome di un nominativo, con le particelle (De, Di, Della, D', La, Lo…).
// Se il nominativo è tutto in maiuscolo si assume l'ordine COGNOME NOME dei
// moduli e degli elenchi; altrimenti l'ordine Nome Cognome.
const PARTICELLE = /^(?:d[aeio]|d'|da[il]|dall[ao]?|dell[aeio]|del|de[il]|d[eu]s|l[ao]|le|san|santa|santo|van|von|mac|mc)$/iu;
export function cognomeDi(nominativo) {
  const parti = nominativo.replace(/[\u2019\u2018`´]/g, "'").split(/\s+/).filter((p) => p.length >= 2 && !/\.$/.test(p));
  if (parti.length < 2) return null;
  const maiuscolo = nominativo === nominativo.toUpperCase();
  if (maiuscolo) {
    // COGNOME NOME: il cognome è in testa, con le eventuali particelle.
    let k = 1;
    while (k < parti.length - 1 && PARTICELLE.test(parti[k - 1])) k++;
    return parti.slice(0, k).join(' ');
  }
  // Nome Cognome: il cognome è in coda, precedute dalle particelle.
  let k = parti.length - 1;
  while (k > 1 && PARTICELLE.test(parti[k - 1])) k--;
  const cognome = parti.slice(k).join(' ');
  return cognome.length >= 3 ? cognome : null;
}

// Varianti dei nominativi (cognome isolato, nome puntato) in tutto il
// fascicolo, per la coerenza del trattamento (regole-oscuramento.md,
// "Coerenza del trattamento"). La variante eredita categoria, fonti e
// chiave di proposta del nominativo d'origine.
function aggiungiVarianti(pagine, rilievi) {
  const nominativi = rilievi.filter((r) => CATEGORIE[r.categoria].nominativo && r.fascia !== 'P' && r.chiave);
  const perCognome = new Map();
  for (const r of nominativi) {
    const candidati = [cognomeDi(r.testo)];
    // Nei nominativi tutti in maiuscolo l'ordine non è determinabile con
    // certezza: si considerano entrambe le estremità.
    if (r.testo === r.testo.toUpperCase()) candidati.push(cognomeDi(r.testo.toLowerCase()));
    for (const cognome of candidati) {
      if (!cognome) continue;
      const k = chiaveNominativo(cognome);
      if (k.length < 3) continue;
      if (NOMINATIVI.paroleNonNome.includes(cognome.toLowerCase())) continue;
      // Iniziale del nome, per distinguere "M. Rossi" da "L. Rossi".
      const nome = r.testo.replace(/[\u2019\u2018`´]/g, "'").split(/\s+/).filter((x) => x.length >= 2 && !/\.$/.test(x)).find((x) => chiaveNominativo(x) !== k);
      const iniziale = nome ? nome[0].toUpperCase() : null;
      if (!perCognome.has(k)) perCognome.set(k, { parola: cognome, persone: [] });
      const persone = perCognome.get(k).persone;
      if (!persone.some((x) => x.chiave === r.chiave)) persone.push({ chiave: r.chiave, categoria: r.categoria, chiaveProposta: r.chiaveProposta, iniziale });
    }
  }
  const nuovi = [];
  for (const [, v] of perCognome) {
    const cognome = v.parola.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['\u2019]").replace(/\s+/g, '\\s+');
    const re = new RegExp('(?<![\\p{L}])(?:(\\p{Lu})\\.\\s?)?' + cognome + '(?![\\p{L}])', 'giu');
    for (const pagina of pagine) {
      for (const m of corrispondenze(re, pagina.testo)) {
        // Solo occorrenze con l'iniziale maiuscola: "rossi" minuscolo è un'altra parola.
        if (!/\p{Lu}/u.test(m.testo[0])) continue;
        const candidato = { pagina: pagina.numero, inizio: m.inizio, fine: m.fine };
        const nominativoEsistente = (r) => CATEGORIE[r.categoria].nominativo && sovrapposti(r, candidato);
        if (rilievi.some(nominativoEsistente) || nuovi.some(nominativoEsistente)) continue;
        // Con più persone dello stesso cognome, l'iniziale puntata decide se è
        // univoca; altrimenti il cognome è ambiguo e non eredita né l'identità né
        // una proposta favorevole alla pubblicazione: nominativo generico.
        const inizialeTrovata = m.gruppi[1] ? m.gruppi[1].toUpperCase() : null;
        let persona = v.persone.length === 1 ? v.persone[0] : null;
        if (!persona && inizialeTrovata) {
          const compatibili = v.persone.filter((x) => x.iniziale === inizialeTrovata);
          if (compatibili.length === 1) persona = compatibili[0];
        }
        nuovi.push(creaRilievo({
          categoria: persona ? persona.categoria : 'C1',
          pagina: pagina.numero,
          inizio: candidato.inizio, fine: candidato.fine,
          testo: m.testo,
          origine: 'variante',
          rilevatore: 'variante',
          chiave: persona ? persona.chiave : null,
          chiaveProposta: persona ? persona.chiaveProposta : 'C1',
          nota: persona ? '' : 'cognome condiviso da più persone nel documento: attribuzione incerta',
        }));
      }
    }
  }
  return nuovi;
}

// Un cognome isolato rilevato autonomamente ("Rossi", "M. Rossi") prende la
// chiave del nominativo completo con quel cognome, se nel fascicolo ce n'è
// uno solo: stesso soggetto, stesso pseudonimo, stessa "applica a tutte le
// occorrenze". Con più nominativi completi possibili resta distinto.
function riconciliaCognomi(rilievi) {
  const nominativi = rilievi.filter((r) => CATEGORIE[r.categoria].nominativo && r.chiave);
  const perCognome = new Map();
  for (const r of nominativi) {
    const cognome = cognomeDi(r.testo);
    if (!cognome) continue;
    const k = chiaveNominativo(cognome);
    if (!perCognome.has(k)) perCognome.set(k, new Set());
    perCognome.get(k).add(r.chiave);
  }
  for (const r of nominativi) {
    if (r.chiave.includes(' ') && !/^\p{Lu}\.\s?/u.test(r.testo)) continue;
    const k = chiaveNominativo(r.testo.replace(/^\p{Lu}\.\s?/u, ''));
    const chiavi = perCognome.get(k);
    if (chiavi && chiavi.size === 1) r.chiave = [...chiavi][0];
  }
}

// Attribuisce un indice di soggetto stabile a ogni nominativo, per la
// pseudonimizzazione coerente. Soggetti preservati (P) inclusi, così che un
// eventuale oscuramento deciso dall'utente riceva la stessa etichetta.
export function assegnaSoggetti(rilievi) {
  riconciliaCognomi(rilievi);
  const indici = new Map();
  const ordinati = rilievi.filter((r) => CATEGORIE[r.categoria].nominativo && r.chiave).sort((a, b) => a.pagina - b.pagina || (a.inizio ?? 0) - (b.inizio ?? 0));
  for (const r of ordinati) {
    if (!indici.has(r.chiave)) indici.set(r.chiave, indici.size + 1);
    r.soggetto = indici.get(r.chiave);
  }
}

// Recapiti in testa o piè di pagina, o nel blocco dei dati di una società:
// con ogni probabilità sono quelli dell'ente o dell'operatore economico e
// vanno preservati (regole-oscuramento.md § B3). L'euristica non si applica
// ai cellulari né ai recapiti in contesto personale.
function applicaZonaIstituzionale(pagina, r, rilievi = []) {
  const recapito = r.nota === 'intestazione-istituzionale' || r.rilevatore === 'posta-elettronica';
  if (!recapito || !r.box.length || r.fascia !== 'B') return r;
  if (r.nota === 'intestazione-istituzionale') r.nota = '';
  if (r.inizio == null) return r;
  // Contesto: le righe che precedono il recapito (al più quattro, entro il
  // raggio in caratteri), dove stanno i dati del soggetto cui appartiene.
  const t = pagina.testo;
  const ACAPO = String.fromCharCode(10);
  const inizioRigaCorrente = t.lastIndexOf(ACAPO, r.inizio - 1) + 1;
  let inizioFinestra = inizioRigaCorrente;
  for (let k = 0; k < 3 && inizioFinestra > 0; k++) inizioFinestra = t.lastIndexOf(ACAPO, inizioFinestra - 2) + 1;
  const rigaCorrente = t.slice(inizioRigaCorrente, r.inizio);
  const dueRighe = t.slice(Math.max(inizioFinestra, r.inizio - RECAPITI_ISTITUZIONALI.raggioContestoSocietario), r.inizio);
  // Una casella d'ufficio su dominio istituzionale è già preservata dal
  // validatore; qui si valuta il contesto societario per le altre.
  // In testa e piè di pagina prevale la posizione, salvo un contesto
  // personale sulla stessa riga ("residente in via…" in intestazione).
  const alto = pagina.altezza * (1 - RECAPITI_ISTITUZIONALI.zonaIntestazione);
  const basso = pagina.altezza * RECAPITI_ISTITUZIONALI.zonaPiede;
  const tuttiInZona = r.box.every((b) => b.y > alto || b.y + b.h < basso);
  // Una casella su un dominio di posta personale (gmail, pec.it…) è sempre
  // individuale: né la posizione né un ruolo vicino la rendono istituzionale.
  const dominioPersonale = r.rilevatore === 'posta-elettronica' && RECAPITI_ISTITUZIONALI.dominiPersonali.some((d) => { const dom = r.testo.toLowerCase().split('@')[1] || ''; return dom === d || dom.endsWith('.' + d); });
  // Casella o telefono su dominio o contesto istituzionale accanto al nome di
  // chi ricopre un ruolo pubblico (RUP, dirigente, funzionario): è il recapito
  // istituzionale della persona, pubblicabile (Garante, FAQ n. 5), anche se
  // nominativo (nome.cognome@ente.it).
  const istituzionale = r.rilevatore === 'posta-elettronica' ? dominioIstituzionale(r.testo) : ultimaPosizione(reContestoPersonale, rigaCorrente) < 0;
  if (istituzionale && !dominioPersonale) {
    const ruolo = rilievi.find((x) => x !== r && x.pagina === r.pagina && x.categoria === 'P' && /^ruolo /.test(x.nota || '') && x.inizio != null
      && Math.min(Math.abs(x.inizio - r.fine), Math.abs(r.inizio - x.fine)) <= RECAPITI_ISTITUZIONALI.raggioRuoloRecapito
      && (pagina.testo.slice(Math.min(x.inizio, r.inizio), Math.max(x.fine, r.fine)).match(/\n/g) || []).length <= 3);
    if (ruolo && r.rilevatore !== 'cellulare') {
      return creaRilievo({
        categoria: 'P', pagina: r.pagina, inizio: r.inizio, fine: r.fine, testo: r.testo, box: r.box, rilevatore: r.rilevatore,
        nota: 'recapito istituzionale di chi ricopre un ruolo pubblico (Garante, FAQ n. 5)',
      });
    }
  }
  // In testata o piè di pagina la posizione da sola non basta: serve che
  // nella zona compaia il nome di un ente, di un ufficio o di una società
  // (una testata di curriculum non è una carta intestata).
  const zonaTesto = r.box.every((b) => b.y > alto) ? t.slice(0, 400) : t.slice(Math.max(0, t.length - 400));
  const zonaIstituzionale = corrispondenze(reContestoSocietario, zonaTesto).length > 0;
  if (tuttiInZona && zonaIstituzionale && !dominioPersonale && r.rilevatore !== 'cellulare' && ultimaPosizione(reContestoPersonale, rigaCorrente) < 0) {
    return creaRilievo({
      categoria: 'P', pagina: r.pagina, inizio: r.inizio, fine: r.fine, testo: r.testo, box: r.box, rilevatore: r.rilevatore,
      nota: 'recapito in intestazione o piè di pagina: probabile recapito istituzionale',
    });
  }
  // Una persona fisica titolare di partita IVA (ditta individuale,
  // professionista) resta persona fisica anche se il blocco cita la partita
  // IVA; ma un blocco societario o istituzionale che segue i dati della
  // persona ("legale rappresentante della società…, con sede legale in…")
  // appartiene alla società.
  const societario = ultimaPosizione(reContestoSocietario, dueRighe);
  const personaFisica = corrispondenze(rePersonaFisica, dueRighe).pop();
  if (personaFisica && personaFisica.fine >= societario) return r;
  const personale = ultimaPosizione(reContestoPersonale, dueRighe);
  if (personale >= 0 && personale >= societario) return r;
  if (societario >= 0) {
    return creaRilievo({
      categoria: 'P', pagina: r.pagina, inizio: r.inizio, fine: r.fine, testo: r.testo, box: r.box, rilevatore: r.rilevatore,
      nota: 'recapito nel blocco dei dati di una società o di un ente: probabile recapito dell\u2019operatore economico',
    });
  }
  return r;
}

// Analisi completa del documento. `avanzamento(fase, pagina)` viene chiamata
// a ogni passo; `segnale` è un AbortSignal per l'interruzione.
let pagineCorrenti = [];
// `riconoscitore` (opzionale) sostituisce il modello di riconoscimento dei
// nomi: lo usa la suite di prova (prove/) per casi deterministici.
export async function rilevaDati(documento, { avanzamento = () => {}, segnale, scopo = null, riconoscitore = null } = {}) {
  contatoreId = 0;
  pagineCorrenti = documento.pagine;
  const controlla = () => { if (segnale?.aborted) throw new Error('interrotto'); };
  let rilievi = [];
  const pagine = documento.pagine;
  const nerAttivo = riconoscitore ? true : nerPronto();

  for (const pagina of pagine) {
    controlla();
    avanzamento('regole', pagina.numero);
    rilievi.push(...rilevaConRegex(pagina));
    const identita = rilevaPaginaIdentita(pagina);
    if (identita) rilievi.push(identita);
    else {
      const illeggibile = rilevaPaginaIlleggibile(pagina);
      if (illeggibile) rilievi.push(illeggibile);
    }
    rilievi.push(...rilevaFirme(pagina));
    // Cede il controllo all'interfaccia fra una pagina e l'altra.
    await new Promise((r) => setTimeout(r, 0));
  }

  if (nerAttivo) {
    for (const pagina of pagine) {
      controlla();
      avanzamento('nomi', pagina.numero);
      if (!pagina.testo.trim()) continue;
      const entita = riconoscitore ? await riconoscitore(pagina.testo) : await riconosciNomi(pagina.testo, segnale);
      for (const e of entita) {
        if (e.punteggio < NOMINATIVI.sogliaConfidenza) continue;
        const r = creaNominativo(pagina, e);
        if (r) rilievi.push(r);
      }
    }
  }

  controlla();
  avanzamento('coerenza', null);
  rilievi = risolviSovrapposizioni(rilievi);
  for (const pagina of pagine) assegnaContesti(pagina, rilievi);
  // Prima della coerenza, i cognomi isolati riconosciuti dal modello
  // ("Rossi") prendono la chiave del nominativo completo, se univoco.
  riconciliaCognomi(rilievi);
  coerenzaSoggetti(rilievi);
  const varianti = aggiungiVarianti(pagine, rilievi);
  rilievi.push(...varianti);
  if (varianti.length) {
    // Anche le varianti ("M. Rossi", "Rossi") possono trovarsi in un contesto
    // qualificante ("di concedere al sig. M. Rossi un contributo di euro
    // 1.500") che il nominativo completo non aveva: si classificano e la
    // qualifica si estende al soggetto.
    for (const pagina of pagine) assegnaContesti(pagina, rilievi);
    coerenzaSoggetti(rilievi);
  }
  rilievi = risolviSovrapposizioni(rilievi);
  rilievi = silenziaSenzaNominativo(rilievi, nerAttivo);
  declassaSaluteSenzaPersona(pagine, rilievi, nerAttivo);

  // Rettangoli e correzioni geometriche.
  const finali = [];
  for (const r of rilievi) {
    const pagina = pagine[r.pagina - 1];
    if (r.inizio != null && !r.box.length) {
      r.box = unisciBox(boxPerIntervallo(pagina, r.inizio, r.fine));
      if (!r.box.length) continue; // testo senza geometria (solo spazi)
    }
    finali.push(applicaZonaIstituzionale(pagina, r, rilievi));
  }
  assegnaSoggetti(finali);
  for (const r of finali) r.certezza = certezzaDi(r);
  finali.sort((a, b) => a.pagina - b.pagina || (a.inizio ?? -1) - (b.inizio ?? -1));
  if (scopo) applicaScopo(finali, scopo);
  return finali;
}

// Grado di certezza del riconoscimento (fonti.js, CERTEZZA). Un rilievo
// riclassificato dal contesto (ruolo, minore, beneficiario) o esteso alla
// clausola resta al grado del suo rilevatore; le varianti sono statistiche.
export function certezzaDi(r) {
  if (r.origine === 'manuale') return 'manuale';
  if (r.origine === 'variante') return 'statistico';
  if (r.rilevatore === 'pagina-documento-identita' && /MRZ/.test(r.testo)) return 'formale';
  return CERTEZZA_RILEVATORI[r.rilevatore] || 'statistico';
}

// Rilievi di fascia C ancora privi di decisione.
export function daDecidere(rilievi) {
  return rilievi.filter((r) => r.fascia === 'C' && r.decisione === null);
}
