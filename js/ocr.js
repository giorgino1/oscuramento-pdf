// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Riconoscimento ottico dei caratteri con tesseract.js, lingua italiana.
// Motore, worker e dati di lingua sono caricati dalla cartella vendor: nessuna
// richiesta verso l'esterno.

import { rendiPagina } from './estrazione.js';

const base = new URL('../vendor/', import.meta.url).href;

// Scala di resa della pagina per il riconoscimento (circa 200 punti per pollice).
const SCALA_OCR = 200 / 72;

let worker = null;
let caricamento = null;

export function ocrDisponibile() {
  return typeof window !== 'undefined' && !!window.Tesseract;
}

// Crea il worker una sola volta. `avanzamento` riceve {stato, progresso}.
export async function preparaOcr(avanzamento = () => {}) {
  if (worker) return worker;
  if (caricamento) return caricamento;
  if (!ocrDisponibile()) throw new Error('tesseract non caricato');
  caricamento = (async () => {
    const w = await window.Tesseract.createWorker('ita', 1, {
      workerPath: base + 'tesseract/worker.min.js',
      corePath: base + 'tesseract/',
      langPath: base + 'tessdata',
      gzip: true,
      workerBlobURL: false,
      logger: (m) => avanzamento({ stato: m.status, progresso: m.progress }),
    });
    worker = w;
    return w;
  })();
  try {
    return await caricamento;
  } catch (e) {
    caricamento = null;
    throw e;
  }
}

// Riconosce il testo di una pagina e restituisce i segmenti (una parola per
// segmento) nello spazio utente del PDF, insieme alla confidenza media.
// Con un AbortSignal, l'interruzione termina subito il worker (recognize non
// è annullabile) e rifiuta la promessa; il worker viene ricreato al prossimo uso.
export async function riconosciPagina(paginaPdf, avanzamento = () => {}, segnale = null) {
  const w = await preparaOcr();
  if (segnale?.aborted) throw new Error('interrotto');
  const { canvas, viewport } = await rendiPagina(paginaPdf, SCALA_OCR);
  const risultato = await new Promise((risolvi, rifiuta) => {
    const suAbort = () => { chiudiOcr(); rifiuta(new Error('interrotto')); };
    segnale?.addEventListener('abort', suAbort, { once: true });
    w.recognize(canvas, {}, { blocks: true, text: true }).then(
      (r) => { segnale?.removeEventListener('abort', suAbort); risolvi(r); },
      (e) => { segnale?.removeEventListener('abort', suAbort); rifiuta(e); },
    );
  });
  const segmenti = [];
  let sommaConfidenza = 0;
  let parole = 0;
  const blocchi = risultato.data.blocks || [];
  for (const blocco of blocchi) {
    for (const paragrafo of blocco.paragraphs || []) {
      for (const riga of paragrafo.lines || []) {
        const paroleRiga = (riga.words || []).filter((p) => p.text && p.text.trim());
        paroleRiga.forEach((parola, i) => {
          const { x0, y0, x1, y1 } = parola.bbox;
          // Angoli del rettangolo in coordinate del viewport (pixel) → spazio
          // utente. La direzione del testo segue il lato inferiore della
          // parola: nelle pagine ruotate (/Rotate 90) diventa verticale nello
          // spazio utente, e la suddivisione in caratteri segue l'asse giusto.
          const [ox, oy] = viewport.convertToPdfPoint(x0, y1); // angolo inferiore sinistro
          const [fx, fy] = viewport.convertToPdfPoint(x1, y1); // angolo inferiore destro
          const [sx, sy] = viewport.convertToPdfPoint(x0, y0); // angolo superiore sinistro
          const larg = Math.hypot(fx - ox, fy - oy) || 1;
          const alt = Math.hypot(sx - ox, sy - oy) || 1;
          segmenti.push({
            str: parola.text,
            x: ox, y: oy, dx: (fx - ox) / larg, dy: (fy - oy) / larg,
            w: larg, h: alt,
            fineRiga: i === paroleRiga.length - 1,
            uniforme: true,
            confidenza: parola.confidence,
          });
          sommaConfidenza += parola.confidence || 0;
          parole++;
        });
      }
    }
  }
  // Libera la memoria del canvas.
  canvas.width = 0;
  canvas.height = 0;
  avanzamento({ stato: 'pagina', progresso: 1 });
  return { segmenti, confidenza: parole ? sommaConfidenza / parole : 0 };
}

// Qualità stimata del riconoscimento, in parole.
export function descriviQualitaOcr(confidenza) {
  if (confidenza == null) return null;
  if (confidenza >= 88) return { livello: 'buona', testo: 'buona (confidenza media ' + confidenza.toFixed(0) + '%)' };
  if (confidenza >= 75) return { livello: 'discreta', testo: 'discreta (confidenza media ' + confidenza.toFixed(0) + '%)' };
  return { livello: 'scarsa', testo: 'scarsa (confidenza media ' + confidenza.toFixed(0) + '%): verifica con particolare attenzione' };
}

export async function chiudiOcr() {
  if (worker) {
    try { await worker.terminate(); } catch { /* ignora */ }
    worker = null;
    caricamento = null;
  }
}
