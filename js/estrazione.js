// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Lettura del PDF con pdf.js: apertura, estrazione del testo con posizione,
// individuazione delle immagini, resa delle pagine su canvas.
// Tutto avviene nel browser; pdf.js è caricato dalla cartella vendor.

import * as pdfjsLib from '../vendor/pdfjs/pdf.min.mjs';
import { costruisciTesto } from './testo.js';
import { IMMAGINI, SOGLIA_TESTO_SCANSIONE } from './regole/regole.js';
import { RISORSE_PDF } from './risorse-pdf.js';

const base = new URL('../vendor/pdfjs/', import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';

let workerPdf = null;
let preparazionePdf = null;
const risorsePdf = new Map();

export async function preparaPdf() {
  if (preparazionePdf) return preparazionePdf;
  preparazionePdf = (async () => {
    const cartelle = { cMapUrl: 'cmaps/', standardFontDataUrl: 'standard_fonts/' };
    for (const [tipo, nomi] of Object.entries(RISORSE_PDF)) {
      // Piccoli blocchi: nessuna richiesta dipende dal contenuto di un documento.
      for (let i = 0; i < nomi.length; i += 8) {
        await Promise.all(nomi.slice(i, i + 8).map(async (nome) => {
          const risposta = await fetch(base + cartelle[tipo] + nome);
          if (!risposta.ok) throw new Error('risorsa PDF non disponibile');
          risorsePdf.set(tipo + ':' + nome, new Uint8Array(await risposta.arrayBuffer()));
        }));
      }
    }
    workerPdf = new pdfjsLib.PDFWorker();
    await workerPdf.promise;
  })();
  return preparazionePdf;
}

class RisorsePdfInMemoria {
  async fetch({ kind, filename }) {
    const dati = risorsePdf.get(kind + ':' + filename);
    if (!dati) throw new Error('risorsa PDF non preparata');
    return dati.slice();
  }
}

export class PdfProtettoError extends Error {}
export class PdfDanneggiatoError extends Error {}

// Apre il PDF a partire dai byte. Non tenta mai di forzare una password.
export async function apriPdf(bytes) {
  if (!workerPdf) throw new PdfDanneggiatoError('componenti PDF non preparati');
  const compito = pdfjsLib.getDocument({
    data: bytes,
    worker: workerPdf,
    BinaryDataFactory: RisorsePdfInMemoria,
    useWorkerFetch: false,
    useWasm: false,
    cMapUrl: base + 'cmaps/',
    cMapPacked: true,
    standardFontDataUrl: base + 'standard_fonts/',
    iccUrl: base + 'iccs/',
    isEvalSupported: false,
    disableAutoFetch: true,
  });
  // Nessun gestore di password: pdf.js rifiuta la promessa con
  // PasswordException e il file viene segnalato come protetto.
  try {
    return await compito.promise;
  } catch (e) {
    if (e instanceof PdfProtettoError || e?.name === 'PasswordException') throw new PdfProtettoError();
    throw new PdfDanneggiatoError(e?.message || '');
  }
}

// Estrae i segmenti di testo di una pagina nello spazio utente del PDF.
export async function estraiSegmenti(pagina) {
  const contenuto = await pagina.getTextContent();
  const segmenti = [];
  for (const item of contenuto.items) {
    if (!('str' in item) || item.str.length === 0) continue;
    const [a, b, , d, e, f] = item.transform;
    const hyp = Math.hypot(a, b) || 1;
    const dx = a / hyp, dy = b / hyp;
    const h = item.height || Math.abs(d) || hyp;
    const w = item.width || 0;
    if (w <= 0 && item.str.trim()) continue;
    // La trasformazione posiziona la linea di base; si abbassa l'origine di
    // una frazione dell'altezza per includere le parti discendenti dei glifi.
    const discesa = h * 0.22;
    const px = -dy, py = dx;
    segmenti.push({
      str: item.str,
      x: e - px * discesa,
      y: f - py * discesa,
      dx, dy,
      w,
      h: h * 1.12,
      fineRiga: !!item.hasEOL,
      uniforme: false,
    });
  }
  // Campi compilabili (AcroForm) e annotazioni di testo libero: i loro valori
  // non fanno parte del contenuto della pagina ma vengono resi nel documento.
  segmenti.push(...await segmentiAnnotazioni(pagina));
  return segmenti;
}

// Valori dei campi modulo (testo, scelte) e delle annotazioni FreeText, come
// segmenti orizzontali posizionati sul rettangolo dell'annotazione.
async function segmentiAnnotazioni(pagina) {
  let annotazioni = [];
  try { annotazioni = await pagina.getAnnotations(); } catch { return []; }
  const segmenti = [];
  for (const a of annotazioni) {
    let valore = null;
    if (a.subtype === 'Widget' && a.fieldType === 'Tx') valore = a.fieldValue;
    else if (a.subtype === 'Widget' && a.fieldType === 'Ch') valore = Array.isArray(a.fieldValue) ? a.fieldValue.join(' ') : a.fieldValue;
    else if (a.subtype === 'FreeText') valore = a.contentsObj?.str ?? a.contents;
    if (typeof valore !== 'string' || !valore.trim() || !a.rect) continue;
    const [x0, y0, x1, y1] = a.rect;
    const x = Math.min(x0, x1), y = Math.min(y0, y1);
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
    if (w <= 0 || h <= 0) continue;
    for (const [i, riga] of valore.split(/\r?\n/).entries()) {
      if (!riga.trim()) continue;
      const righe = valore.split(/\r?\n/).length;
      const hr = h / righe;
      // La posizione dei singoli caratteri nel campo non è nota (allineamento,
      // a capo automatici): qualunque oscuramento di una parte del valore
      // copre l'intero campo (vedi redazione.js e rilevamento.js).
      segmenti.push({ str: riga, x, y: y + h - hr * (i + 1), dx: 1, dy: 0, w, h: hr, fineRiga: true, uniforme: true, campoIntero: true, campo: { x, y, w, h } });
    }
  }
  return segmenti;
}

// Costruisce la struttura di pagina usata da tutta l'applicazione.
export function componiPagina(indice, vista, segmentiGrezzi, opzioni = {}) {
  // Le pagine da OCR sono già in ordine di lettura; quelle native vengono
  // riordinate geometricamente (i campi compilati dei moduli, in particolare,
  // arrivano spesso in coda al testo della pagina).
  const { segmenti, testo, inizi } = costruisciTesto(segmentiGrezzi, { riordina: opzioni.riordina ?? !opzioni.daScansione });
  return {
    indice, // base 0
    numero: indice + 1,
    larghezza: vista.larghezza,
    altezza: vista.altezza,
    rotazione: vista.rotazione,
    // Origine della vista (CropBox) nello spazio utente: i rettangoli di
    // pagina intera partono da qui, non da (0, 0).
    origineX: vista.origineX || 0,
    origineY: vista.origineY || 0,
    segmenti,
    inizi,
    testo,
    daScansione: !!opzioni.daScansione,
    confidenzaOcr: opzioni.confidenzaOcr ?? null,
    immagini: opzioni.immagini || [],
    tessere: opzioni.tessere || [],
  };
}

// Dimensioni della pagina nello spazio utente (non ruotato) e rotazione.
export function vistaPagina(pagina) {
  const vp = pagina.getViewport({ scale: 1 });
  const [x0, y0, x1, y1] = pagina.view;
  return { larghezza: x1 - x0, altezza: y1 - y0, rotazione: vp.rotation, origineX: x0, origineY: y0 };
}

// Vero se la pagina non contiene testo estraibile a sufficienza e va
// sottoposta a riconoscimento ottico (specifica, § 8).
export function richiedeOcr(segmenti) {
  const caratteri = segmenti.reduce((n, s) => n + s.str.trim().length, 0);
  return caratteri < SOGLIA_TESTO_SCANSIONE;
}

// Individua le immagini disegnate nel contenuto della pagina, anche dentro i
// form XObject, con il loro rettangolo nello spazio utente. È un'euristica di
// supporto per la fascia B6 (firme autografe scansionate), non una garanzia.
export async function estraiImmagini(pagina, vista) {
  const ops = await pagina.getOperatorList();
  const OPS = pdfjsLib.OPS;
  let ctm = [1, 0, 0, 1, 0, 0];
  const pila = [];
  const immagini = [];
  const areaPagina = vista.larghezza * vista.altezza;
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === OPS.save) pila.push(ctm.slice());
    else if (fn === OPS.restore) ctm = pila.pop() || [1, 0, 0, 1, 0, 0];
    // I form XObject (ad esempio le apparenze dei campi compilati o i timbri
    // inseriti da un editor) applicano una propria matrice al contenuto.
    else if (fn === OPS.paintFormXObjectBegin) { pila.push(ctm.slice()); if (args && args[0]) ctm = moltiplica(ctm, args[0]); }
    else if (fn === OPS.paintFormXObjectEnd) ctm = pila.pop() || [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = moltiplica(ctm, args);
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject || fn === OPS.paintImageXObjectRepeat) {
      // L'immagine occupa il quadrato unitario trasformato dalla CTM.
      const punti = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [
        ctm[0] * x + ctm[2] * y + ctm[4],
        ctm[1] * x + ctm[3] * y + ctm[5],
      ]);
      const xs = punti.map((p) => p[0]), ys = punti.map((p) => p[1]);
      // Coordinate nello spazio utente del PDF, come quelle del testo (la
      // conversione in viewport tiene conto da sé dell'origine del CropBox);
      // intersezione con la vista: ciò che sta fuori non viene reso.
      const ox = vista.origineX || 0, oy = vista.origineY || 0;
      const x0 = Math.max(ox, Math.min(...xs)), y0 = Math.max(oy, Math.min(...ys));
      const x1 = Math.min(ox + vista.larghezza, Math.max(...xs)), y1 = Math.min(oy + vista.altezza, Math.max(...ys));
      const box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      if (box.w <= 0 || box.h <= 0) continue;
      immagini.push({ ...box, frazioneArea: (box.w * box.h) / areaPagina });
    }
  }
  return immagini;
}

function moltiplica(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

// Immagini candidate a firma autografa secondo l'euristica della base di regole.
export function candidateFirma(immagini, vista) {
  return immagini.filter((im) => {
    if (im.frazioneArea > IMMAGINI.areaMassima) return false;
    if (im.w < IMMAGINI.larghezzaMinima || im.h < IMMAGINI.altezzaMinima) return false;
    // Esclude la zona di intestazione (stemmi e loghi).
    if (im.y > vista.altezza * (1 - IMMAGINI.zonaIntestazione)) return false;
    return true;
  });
}

// Analisi della forma di una pagina da scansione: individua le regioni non
// bianche e ne stima le proporzioni, per riconoscere la riproduzione di una
// tessera (carta d'identità, patente, permesso di soggiorno: formato ID-1,
// 85,6 × 54 mm) fotocopiata su un foglio. Restituisce {regioni, tessere}.
export async function analizzaFormaScansione(paginaPdf) {
  const { canvas, viewport } = await rendiPagina(paginaPdf, 0.4);
  const ctx = canvas.getContext('2d');
  const { width: W, height: H } = canvas;
  const dati = ctx.getImageData(0, 0, W, H).data;
  const cella = 4;
  const cw = Math.ceil(W / cella), ch = Math.ceil(H / cella);
  const occupata = new Uint8Array(cw * ch);
  // Una cella è occupata se contiene abbastanza pixel non bianchi.
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      let scuri = 0, tot = 0;
      for (let y = cy * cella; y < Math.min(H, (cy + 1) * cella); y++) {
        for (let x = cx * cella; x < Math.min(W, (cx + 1) * cella); x++) {
          const i = (y * W + x) * 4;
          const r = dati[i], g = dati[i + 1], b = dati[i + 2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          const satur = Math.max(r, g, b) - Math.min(r, g, b);
          if (luma < 225 || satur > 40) scuri++;
          tot++;
        }
      }
      occupata[cy * cw + cx] = scuri >= tot * 0.15 ? 1 : 0;
    }
  }
  // Chiusura morfologica leggera: le celle vuote circondate da celle piene
  // (spazi bianchi dentro la tessera) vengono riempite.
  const chiusa = new Uint8Array(occupata);
  const raggio = 3;
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      if (occupata[cy * cw + cx]) continue;
      let sx = false, dx = false, su = false, giu = false;
      for (let k = 1; k <= raggio; k++) {
        if (cx - k >= 0 && occupata[cy * cw + cx - k]) sx = true;
        if (cx + k < cw && occupata[cy * cw + cx + k]) dx = true;
        if (cy - k >= 0 && occupata[(cy - k) * cw + cx]) su = true;
        if (cy + k < ch && occupata[(cy + k) * cw + cx]) giu = true;
      }
      if ((sx && dx) || (su && giu)) chiusa[cy * cw + cx] = 1;
    }
  }
  // Componenti connesse (4-vicinanza) con riquadro.
  const etichetta = new Int32Array(cw * ch).fill(-1);
  const regioni = [];
  const pila = [];
  for (let inizio = 0; inizio < cw * ch; inizio++) {
    if (!chiusa[inizio] || etichetta[inizio] >= 0) continue;
    const id = regioni.length;
    const reg = { minX: cw, minY: ch, maxX: 0, maxY: 0, celle: 0 };
    pila.push(inizio);
    etichetta[inizio] = id;
    while (pila.length) {
      const c = pila.pop();
      const cx = c % cw, cy = (c / cw) | 0;
      reg.celle++;
      if (cx < reg.minX) reg.minX = cx;
      if (cx > reg.maxX) reg.maxX = cx;
      if (cy < reg.minY) reg.minY = cy;
      if (cy > reg.maxY) reg.maxY = cy;
      const vicini = [c - 1, c + 1, c - cw, c + cw];
      if (cx === 0) vicini[0] = -1;
      if (cx === cw - 1) vicini[1] = -1;
      for (const v of vicini) {
        if (v >= 0 && v < cw * ch && chiusa[v] && etichetta[v] < 0) { etichetta[v] = id; pila.push(v); }
      }
    }
    regioni.push(reg);
  }
  canvas.width = 0; canvas.height = 0;
  const larghezzaPagina = viewport.width, altezzaPagina = viewport.height;
  const descritte = regioni.map((r) => {
    const w = (r.maxX - r.minX + 1) * cella, h = (r.maxY - r.minY + 1) * cella;
    const area = w * h;
    return {
      larghezza: w / larghezzaPagina,
      altezza: h / altezzaPagina,
      proporzione: w / h,
      riempimento: (r.celle * cella * cella) / area,
      frazioneArea: area / (larghezzaPagina * altezzaPagina),
      // Rettangolo nello spazio del viewport a scala 1, per l'evidenziazione.
      box: { left: (r.minX * cella) / 0.4, top: (r.minY * cella) / 0.4, width: w / 0.4, height: h / 0.4 },
    };
  });
  const tessere = descritte.filter((d) => {
    const p = d.proporzione;
    const orizz = p >= IMMAGINI.tesseraProporzioneMin && p <= IMMAGINI.tesseraProporzioneMax;
    const vert = 1 / p >= IMMAGINI.tesseraProporzioneMin && 1 / p <= IMMAGINI.tesseraProporzioneMax;
    return (orizz || vert) && d.larghezza >= IMMAGINI.tesseraLarghezzaMin && d.larghezza <= IMMAGINI.tesseraLarghezzaMax && d.riempimento >= IMMAGINI.tesseraRiempimentoMin;
  });
  return { regioni: descritte, tessere };
}

// Rende una pagina su un canvas alla scala indicata. Restituisce canvas e viewport.
export async function rendiPagina(pagina, scala, canvas = null) {
  const viewport = pagina.getViewport({ scale: scala });
  const c = canvas || document.createElement('canvas');
  c.width = Math.ceil(viewport.width);
  c.height = Math.ceil(viewport.height);
  const ctx = c.getContext('2d', { alpha: false });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  // Intento di stampa: resa completa e sincrona rispetto al ciclo di
  // animazione del browser, così da funzionare anche in schede in secondo piano.
  await pagina.render({ canvasContext: ctx, viewport, intent: 'print', annotationMode: 1 }).promise;
  return { canvas: c, viewport };
}

// Converte un rettangolo dello spazio utente in coordinate del viewport
// (pixel, origine in alto a sinistra).
export function boxVersoViewport(box, viewport) {
  const [x1, y1] = viewport.convertToViewportPoint(box.x, box.y);
  const [x2, y2] = viewport.convertToViewportPoint(box.x + box.w, box.y + box.h);
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

// Converte un rettangolo del viewport (pixel) nello spazio utente.
export function rettangoloVersoUtente(rett, viewport) {
  const [ax, ay] = viewport.convertToPdfPoint(rett.left, rett.top);
  const [bx, by] = viewport.convertToPdfPoint(rett.left + rett.width, rett.top + rett.height);
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
}

export { pdfjsLib };
