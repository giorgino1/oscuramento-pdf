// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Rapporto di trattamento in formato PDF (specifica funzionale, § 5).
// Documento separato, da conservare agli atti: consente all'ufficio di
// dimostrare come ha operato. Generato con pdf-lib, interamente nel browser.

import { CATEGORIE, REGOLE_VERSIONE, SCOPI } from './regole/regole.js';
import { FONTI as BASE_FONTI, FONTI_VERSIONE, passaggio, passaggiOrdinati, CERTEZZA } from './regole/fonti.js';
import { certezzaDi } from './rilevamento.js';
import { T } from './stringhe.js';
import { descriviQualitaOcr } from './ocr.js';

const PAGINA = { larghezza: 595.28, altezza: 841.89 }; // A4
const MARGINE = 48;
const CORPO = 9.5;
const INTERLINEA = 1.35;

// Piccolo impaginatore a flusso: testo a capo automatico, titoli, tabelle,
// numerazione delle pagine.
class Impaginatore {
  constructor(doc, font, fontBold) {
    this.doc = doc;
    this.font = font;
    this.fontBold = fontBold;
    this.ammessi = new Set(font.getCharacterSet());
    this.pagina = null;
    this.y = 0;
    this.numero = 0;
    this.nuovaPagina();
  }

  sanifica(s) {
    let out = '';
    for (const c of String(s ?? '')) {
      if (this.ammessi.has(c.codePointAt(0))) out += c;
      else if (/\s/.test(c)) out += ' ';
      else if (c === '’' || c === '‘') out += "'";
      else if (c === '“' || c === '”') out += '"';
      else if (c === '–' || c === '—') out += '-';
      else out += '?';
    }
    return out;
  }

  nuovaPagina() {
    this.pagina = this.doc.addPage([PAGINA.larghezza, PAGINA.altezza]);
    this.numero++;
    this.y = PAGINA.altezza - MARGINE;
    // Piè di pagina.
    const pie = this.sanifica(T.rapporto.titolo + ' — ' + T.rapporto.pagina + ' ' + this.numero);
    this.pagina.drawText(pie, { x: MARGINE, y: MARGINE / 2, size: 7.5, font: this.font });
  }

  spazio(h) {
    if (this.y - h < MARGINE) this.nuovaPagina();
  }

  righeACapo(testo, font, corpo, larghezza) {
    const parole = this.sanifica(testo).split(/\s+/);
    const righe = [];
    let riga = '';
    for (const p of parole) {
      const prova = riga ? riga + ' ' + p : p;
      if (font.widthOfTextAtSize(prova, corpo) <= larghezza) riga = prova;
      else {
        if (riga) righe.push(riga);
        // Parola più lunga della riga: spezzata a forza.
        if (font.widthOfTextAtSize(p, corpo) > larghezza) {
          let pezzo = '';
          for (const c of p) {
            if (font.widthOfTextAtSize(pezzo + c, corpo) > larghezza) { righe.push(pezzo); pezzo = c; } else pezzo += c;
          }
          riga = pezzo;
        } else riga = p;
      }
    }
    if (riga) righe.push(riga);
    return righe.length ? righe : [''];
  }

  paragrafo(testo, { corpo = CORPO, grassetto = false, rientro = 0, dopo = 6 } = {}) {
    const font = grassetto ? this.fontBold : this.font;
    const larghezza = PAGINA.larghezza - 2 * MARGINE - rientro;
    const righe = this.righeACapo(testo, font, corpo, larghezza);
    const altezzaRiga = corpo * INTERLINEA;
    for (const r of righe) {
      this.spazio(altezzaRiga);
      this.y -= altezzaRiga;
      this.pagina.drawText(r, { x: MARGINE + rientro, y: this.y, size: corpo, font });
    }
    this.y -= dopo;
  }

  titolo(testo, livello = 1) {
    const corpo = livello === 1 ? 16 : livello === 2 ? 12 : 10.5;
    this.spazio(corpo * 3);
    this.y -= livello === 1 ? 8 : 10;
    this.paragrafo(testo, { corpo, grassetto: true, dopo: livello === 1 ? 6 : 5 });
  }

  coppia(etichetta, valore) {
    const corpo = CORPO;
    const larghezzaEtichetta = 170;
    const righe = this.righeACapo(valore, this.font, corpo, PAGINA.larghezza - 2 * MARGINE - larghezzaEtichetta);
    const altezzaRiga = corpo * INTERLINEA;
    this.spazio(altezzaRiga * righe.length);
    this.y -= altezzaRiga;
    this.pagina.drawText(this.sanifica(etichetta), { x: MARGINE, y: this.y, size: corpo, font: this.fontBold });
    this.pagina.drawText(righe[0], { x: MARGINE + larghezzaEtichetta, y: this.y, size: corpo, font: this.font });
    for (let i = 1; i < righe.length; i++) {
      this.y -= altezzaRiga;
      this.pagina.drawText(righe[i], { x: MARGINE + larghezzaEtichetta, y: this.y, size: corpo, font: this.font });
    }
    this.y -= 3;
  }

  // Tabella con intestazione ripetuta a ogni pagina.
  tabella(intestazioni, righe, larghezze) {
    const corpo = 8;
    const altezzaRiga = corpo * INTERLINEA;
    const padding = 3;
    const disegnaIntestazione = () => {
      this.spazio(altezzaRiga + 8);
      this.y -= altezzaRiga + 2;
      let x = MARGINE;
      intestazioni.forEach((h, i) => {
        this.pagina.drawText(this.sanifica(h), { x: x + padding, y: this.y + 2, size: corpo, font: this.fontBold });
        x += larghezze[i];
      });
      this.pagina.drawLine({ start: { x: MARGINE, y: this.y - 2 }, end: { x: PAGINA.larghezza - MARGINE, y: this.y - 2 }, thickness: 0.8 });
      this.y -= 4;
    };
    disegnaIntestazione();
    for (const riga of righe) {
      const celle = riga.map((v, i) => this.righeACapo(v, this.font, corpo, larghezze[i] - 2 * padding));
      const nRighe = Math.max(...celle.map((c) => c.length));
      const altezza = nRighe * altezzaRiga + 4;
      if (this.y - altezza < MARGINE) {
        this.nuovaPagina();
        disegnaIntestazione();
      }
      let x = MARGINE;
      celle.forEach((c, i) => {
        c.forEach((linea, j) => {
          this.pagina.drawText(linea, { x: x + padding, y: this.y - altezzaRiga * (j + 1) + 3, size: corpo, font: this.font });
        });
        x += larghezze[i];
      });
      this.y -= altezza;
      this.pagina.drawLine({ start: { x: MARGINE, y: this.y + 1 }, end: { x: PAGINA.larghezza - MARGINE, y: this.y + 1 }, thickness: 0.3, opacity: 0.5 });
    }
    this.y -= 8;
  }
}

// Modalità effettiva di un rilievo: quella scelta per il singolo rilievo, o
// quella generale del documento.
function modalitaEffettiva(r, modalita) {
  const m = r.modalita || modalita;
  if (m === 'pseudonimo' && !(CATEGORIE[r.categoria].nominativo && r.soggetto)) return 'omissis';
  return m;
}

function descriviEsito(r, modalita) {
  if (r.decisione === 'oscura') {
    if (r.azione === 'espungi') return T.rapporto.esitoEspunto;
    const base = r.origine === 'manuale' ? T.rapporto.esitoManuale : T.rapporto.esitoOscurato;
    const m = modalitaEffettiva(r, modalita);
    const etichetta = m === 'omissis' ? T.rapporto.modalitaOmissis : m === 'pseudonimo' ? T.rapporto.modalitaPseudonimo + ' [SOGGETTO ' + r.soggetto + ']' : T.rapporto.modalitaPieno;
    return base + ', ' + etichetta;
  }
  return T.rapporto.esitoMantenuto;
}

function descriviModalita(m) {
  return m === 'omissis' ? T.modalita.omissis : m === 'pseudonimo' ? T.modalita.pseudonimo : T.modalita.pieno;
}

// Genera il rapporto. `dati` contiene: documento, rilievi, modalita, dpi,
// statistiche, dataOra.
export async function generaRapporto(dati) {
  const { PDFDocument, StandardFonts } = window.PDFLib;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle(T.rapporto.titolo);
  doc.setProducer(T.nomeApp);
  doc.setCreator(T.nomeApp);
  doc.setCreationDate(dati.dataOra);
  doc.setModificationDate(dati.dataOra);

  const im = new Impaginatore(doc, font, fontBold);
  const { documento, rilievi, modalita, statistiche } = dati;
  const R = T.rapporto;

  im.titolo(R.titolo, 1);
  im.paragrafo(R.sottotitolo, { corpo: 10.5, dopo: 12 });

  im.coppia(R.dataOra, dati.dataOra.toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'medium' }));
  im.coppia(R.file, documento.nome);
  im.coppia(R.pagine, String(documento.pagine.length));
  if (statistiche.pagineEspunte.length) im.coppia(R.pagineEspunte, statistiche.pagineEspunte.join(', '));
  const nScans = documento.pagine.filter((p) => p.daScansione).length;
  im.coppia(R.tipoDocumento, nScans === 0 ? R.nativo : nScans === documento.pagine.length ? R.scansione : R.misto);
  if (nScans > 0) {
    const conf = documento.pagine.filter((p) => p.daScansione && p.confidenzaOcr != null).map((p) => p.confidenzaOcr);
    const media = conf.length ? conf.reduce((a, b) => a + b, 0) / conf.length : null;
    const q = descriviQualitaOcr(media);
    im.coppia(R.qualitaOcr, q ? q.testo : '-');
    // Revisione a schermo obbligatoria per le scansioni: il rapporto registra
    // la conferma dell'operatore e quante pagine risultano visualizzate
    // nell'anteprima, così che la responsabilità della revisione sia
    // documentata (specifica funzionale, § 3).
    if (dati.pagineViste != null) {
      const tutte = dati.pagineViste >= documento.pagine.length;
      im.coppia(R.revisioneSchermo, R.revisioneConfermata + '; ' + R.revisionePagineViste + ' ' + dati.pagineViste + ' ' + T.analisi.di + ' ' + documento.pagine.length + (tutte ? '' : ' ' + R.revisionePagineNonTutte));
    }
  }
  const dest = dati.scopo ? SCOPI[dati.scopo] : null;
  if (dest) im.coppia(R.scopo, dest.etichetta);
  if (dati.ente) im.coppia(R.ente, dati.ente);
  im.coppia(R.modalita, descriviModalita(modalita));
  im.coppia(R.risoluzione, dati.dpi + ' punti per pollice');
  im.coppia(R.versioneRegole, REGOLE_VERSIONE);
  im.coppia(R.strumento, T.nomeApp + ' — ' + R.strumentoAutore + ' ' + T.autore);

  // Gradi di certezza del riconoscimento.
  im.titolo(R.certezzaTitolo, 2);
  im.paragrafo(R.certezzaNota, { corpo: 8.5 });
  for (const g of Object.values(CERTEZZA)) {
    const n = rilievi.filter((r) => (r.certezza || certezzaDi(r)) === g.id).length;
    if (n) im.paragrafo('• ' + g.etichetta + ': ' + n + ' — ' + g.descrizione, { rientro: 8, dopo: 2 });
  }

  // Tabella dei dati trattati.
  im.titolo(R.tabellaTitolo, 2);
  const ordinati = rilievi.slice().sort((a, b) => a.pagina - b.pagina || (a.inizio ?? -1) - (b.inizio ?? -1));
  const esiti = dati.esiti || {};
  // Identificativo progressivo del rilievo nel rapporto e posizione sulla
  // pagina (in percentuale dal bordo sinistro e dall'alto), per ricondurre
  // ogni riga a un oscuramento preciso senza riportare il dato.
  const posizione = (r) => {
    if (!r.box.length) return '';
    const pag = documento.pagine[r.pagina - 1];
    const b = r.box[0];
    return Math.round((b.x / pag.larghezza) * 100) + '% / ' + Math.round(((pag.altezza - b.y - b.h) / pag.altezza) * 100) + '%';
  };
  const righe = ordinati.map((r, i) => {
    const cat = CATEGORIE[r.categoria];
    const tipo = cat.etichetta + (r.origine === 'manuale' ? ' (manuale)' : r.origine === 'variante' ? ' (variante)' : '');
    let modificato = r.modificato ? R.si : R.no;
    const fascia = r.fascia === 'P' ? 'preservato' : r.fascia === 'M' ? 'manuale' : r.fascia;
    const effettivo = esiti[r.id];
    let esito = descriviEsito(r, modalita);
    if (effettivo?.esito === 'espunto') esito = R.esitoEspunto;
    if (effettivo?.note) esito += ' (' + effettivo.note + ')';
    // In tabella le note sono accorciate; il testo integrale delle motivazioni
    // sta nella sezione dei ripristini.
    const accorcia = (x) => (x.length > 220 ? x.slice(0, 217) + '…' : x);
    const note = accorcia([r.origine === 'manuale' && r.nota ? r.nota : '', r.motivazione ? R.motivazione + ': ' + r.motivazione : ''].filter(Boolean).join('; '));
    const certezza = CERTEZZA[r.certezza || certezzaDi(r)];
    return ['#' + (i + 1), String(r.pagina) + (posizione(r) ? ' · ' + posizione(r) : ''), tipo + ' [' + certezza.etichetta + ']' + (note ? ' — ' + note : ''), fascia, cat.fonti.join('; '), esito, modificato];
  });
  const larghezzaUtile = PAGINA.larghezza - 2 * MARGINE;
  im.tabella(R.colonne, righe, [26, 52, 118, 44, larghezzaUtile - 26 - 52 - 118 - 44 - 78 - 40, 78, 40]);
  im.paragrafo(R.posizioneNota + ' ' + R.fasciaNota + ' ' + R.coperturaNota, { corpo: 8 });

  // Rilievi di fascia C con la decisione assunta.
  im.titolo(R.fasciaCTitolo, 2);
  const fasciaC = ordinati.filter((r) => r.fascia === 'C');
  if (dest) im.paragrafo(R.proposteNota + ' ' + R.scopo + ': ' + dest.etichetta + '. ' + dest.descrizione, { corpo: 8.5 });
  if (!fasciaC.length) im.paragrafo(R.nessuno);
  for (const r of fasciaC) {
    const cat = CATEGORIE[r.categoria];
    const esito = r.decisione === 'oscura' ? R.decisioneOscura : R.decisioneMantieni;
    const decisione = esito + (r.proposto ? ' (' + (r.modificato ? R.decisioneModificata : R.decisioneProposta) + ')' : '');
    const m = modalitaEffettiva(r, modalita);
    const descrizione = r.decisione === 'oscura' ? (m === 'pseudonimo' ? '[SOGGETTO ' + r.soggetto + ']' : '(testo oscurato, non riportato)') : '"' + r.testo + '"';
    im.paragrafo('Pag. ' + r.pagina + ' — ' + cat.etichetta + ' — ' + descrizione + ' — ' + decisione + (r.nota ? ' — ' + r.nota : '') + (r.motivoProposta ? ' — ' + r.motivoProposta : ''), { rientro: 8, dopo: 3 });
  }

  // Ripristini decisi dall'utente.
  im.titolo(R.ripristiniTitolo, 2);
  const ripristini = ordinati.filter((r) => r.decisione === 'mantieni' && r.modificato);
  if (!ripristini.length) im.paragrafo(R.nessuno);
  for (const r of ripristini) {
    const cat = CATEGORIE[r.categoria];
    im.paragrafo('Pag. ' + r.pagina + ' — ' + cat.etichetta + ' (fascia ' + r.fascia + ') — "' + r.testo + '"' + (r.motivazione ? ' — ' + R.motivazione + ': ' + r.motivazione : ''), { rientro: 8, dopo: 3 });
  }

  // Pseudonimizzazione: etichette attribuite, senza corrispondenza.
  const conPseudonimo = rilievi.filter((r) => r.decisione === 'oscura' && modalitaEffettiva(r, modalita) === 'pseudonimo');
  if (conPseudonimo.length) {
    im.titolo(R.soggetti, 2);
    const soggetti = new Set(conPseudonimo.map((r) => r.soggetto));
    im.paragrafo(soggetti.size ? Array.from(soggetti).sort((a, b) => a - b).map((s) => '[SOGGETTO ' + s + ']').join(', ') : R.nessuno);
    im.paragrafo(R.soggettiNota, { corpo: 8.5 });
  }

  // Fonti richiamate.
  im.titolo(R.fontiTitolo, 2);
  im.paragrafo(R.fontiNota, { corpo: 8.5 });
  const passaggiUsati = new Set();
  for (const r of rilievi) for (const id of CATEGORIE[r.categoria].passaggi || []) passaggiUsati.add(id);
  if (dest) for (const id of dest.passaggi || []) passaggiUsati.add(id);
  // Raggruppati per fonte, nell'ordine della base delle fonti.
  let citate = 0;
  for (const fonte of Object.values(BASE_FONTI)) {
    const ids = passaggiOrdinati(fonte).filter((id) => passaggiUsati.has(id));
    if (!ids.length) continue;
    citate++;
    im.paragrafo(fonte.estremi + (fonte.verificata ? ' — ' + R.fonteVerificata + (fonte.verificataIl ? ' ' + fonte.verificataIl : '') : ' — ' + R.fonteNonVerificata) + '. ' + fonte.url, { corpo: 8.5, dopo: 2 });
    for (const id of ids) {
      const x = passaggio(id);
      im.paragrafo('• ' + x.passaggio.rif + (x.passaggio.tipo === 'sintesi' ? ' (' + R.passaggioSintesi + ')' : '') + ': «' + x.passaggio.testo + '»', { corpo: 8, rientro: 10, dopo: 2 });
    }
  }
  if (!citate) im.paragrafo(R.nessuno);
  im.paragrafo(R.fontiVersione + ' ' + FONTI_VERSIONE + '.', { corpo: 8 });

  // Dichiarazione finale.
  im.titolo(R.dichiarazioneTitolo, 2);
  im.paragrafo(R.dichiarazione);
  im.paragrafo(R.regoleFondate, { corpo: 8.5 });
  im.paragrafo(R.generatoCon + ' ' + T.nomeApp + '.', { corpo: 8.5 });

  return doc.save({ useObjectStreams: true });
}
