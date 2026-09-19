// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Interfaccia verso il worker di riconoscimento dei nomi (ner-worker.js).

let worker = null;
let pronto = false;
let disponibile = false;
let contatore = 0;
const inAttesa = new Map();
const ascoltatori = new Set();

function avvisa(evento) {
  for (const a of ascoltatori) a(evento);
}

export function suEventoNer(fn) {
  ascoltatori.add(fn);
  return () => ascoltatori.delete(fn);
}

export function nerPronto() {
  return pronto && disponibile;
}

function creaWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./ner-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (ev) => {
    const m = ev.data;
    if (m.tipo === 'risultato' || m.tipo === 'errore') {
      const attesa = inAttesa.get(m.id);
      if (attesa) {
        inAttesa.delete(m.id);
        if (m.tipo === 'errore') attesa.rifiuta(new Error(m.messaggio));
        else attesa.risolvi(m.entita);
      }
      if (m.tipo === 'errore' && !m.id) avvisa({ tipo: 'errore', messaggio: m.messaggio });
      return;
    }
    if (m.tipo === 'pronto') {
      pronto = true;
      disponibile = true;
    }
    avvisa(m);
  };
  worker.onerror = (e) => {
    // Errore irreversibile del worker (memoria esaurita, WASM): nessuna
    // richiesta in attesa deve restare sospesa.
    const messaggio = e.message || 'errore nel worker';
    for (const { rifiuta } of inAttesa.values()) rifiuta(new Error(messaggio));
    inAttesa.clear();
    pronto = false;
    disponibile = false;
    try { worker.terminate(); } catch { /* ignora */ }
    worker = null;
    avvisa({ tipo: 'errore', messaggio });
  };
  return worker;
}

// Avvia il caricamento del modello. Con consentiRemoto=false, se il modello
// non è in locale il worker risponde 'modello-assente' senza alcuna richiesta
// esterna.
export function caricaNer({ consentiRemoto = false } = {}) {
  const w = creaWorker();
  pronto = false;
  w.postMessage({ tipo: 'carica', consentiRemoto });
}

// L'utente ha scelto di proseguire senza riconoscimento dei nomi.
export function disattivaNer() {
  pronto = true;
  disponibile = false;
  avvisa({ tipo: 'disattivato' });
}

// Restituisce le entità PER trovate nel testo: [{inizio, fine, testo, punteggio}].
// Con un AbortSignal la richiesta viene rifiutata all'interruzione.
export function riconosciNomi(testo, segnale = null) {
  if (!nerPronto()) return Promise.resolve([]);
  if (segnale?.aborted) return Promise.reject(new Error('interrotto'));
  const id = ++contatore;
  return new Promise((risolvi, rifiuta) => {
    const suAbort = () => { inAttesa.delete(id); rifiuta(new Error('interrotto')); };
    segnale?.addEventListener('abort', suAbort, { once: true });
    inAttesa.set(id, {
      risolvi: (v) => { segnale?.removeEventListener('abort', suAbort); risolvi(v); },
      rifiuta: (e) => { segnale?.removeEventListener('abort', suAbort); rifiuta(e); },
    });
    worker.postMessage({ tipo: 'analizza', id, testo });
  });
}

// Interrompe ogni analisi in corso distruggendo il worker; al prossimo uso
// il modello verrà ricaricato dalla cache.
export function annullaNer() {
  if (!worker) return;
  worker.terminate();
  worker = null;
  pronto = false;
  for (const { rifiuta } of inAttesa.values()) rifiuta(new Error('interrotto'));
  inAttesa.clear();
}
