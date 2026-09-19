// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Worker per il riconoscimento delle entità (nomi di persona) con
// transformers.js, eseguito in WebAssembly. Lavora in un thread separato per
// non bloccare l'interfaccia.
//
// Il modello viene cercato prima nella cartella locale `modelli/`. Solo se
// assente, e solo dopo il consenso esplicito dell'utente, può essere scaricato
// da huggingface.co e conservato nella cache del browser. Il testo analizzato
// non lascia mai il dispositivo.

import { env, pipeline } from '../vendor/transformers/transformers.min.js';

const MODELLO = 'Xenova/distilbert-base-multilingual-cased-ner-hrl';
const baseVendor = new URL('../vendor/transformers/', import.meta.url).href;

env.allowLocalModels = true;
// Percorso senza origine: transformers.js verifica la presenza dei file in
// locale solo se il percorso non è un URL assoluto.
env.localModelPath = new URL('../modelli/', import.meta.url).pathname;
env.allowRemoteModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = {
  mjs: baseVendor + 'ort-wasm-simd-threaded.asyncify.mjs',
  wasm: baseVendor + 'ort-wasm-simd-threaded.asyncify.wasm',
};
// Nessun proxy: tutto resta in questo worker.
env.backends.onnx.wasm.proxy = false;

let riconoscitore = null;

// Verifica se il modello è presente in locale (sola lettura dell'indice).
async function modelloLocale() {
  try {
    const r = await fetch(new URL(env.localModelPath + MODELLO + '/tokenizer_config.json', self.location.href), { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}

async function carica({ consentiRemoto }) {
  const locale = await modelloLocale();
  if (!locale && !consentiRemoto) {
    postMessage({ tipo: 'modello-assente' });
    return;
  }
  env.allowRemoteModels = !locale && consentiRemoto;
  env.allowLocalModels = locale;
  riconoscitore = await pipeline('token-classification', MODELLO, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p) => {
      if (p.status === 'progress' || p.status === 'download' || p.status === 'done' || p.status === 'initiate') {
        postMessage({ tipo: 'progresso', file: p.file, progresso: p.progress ?? null, stato: p.status });
      }
    },
  });
  postMessage({ tipo: 'pronto', origine: locale ? 'locale' : 'remoto' });
}

// Suddivide il testo in blocchi di dimensione contenuta, preferendo i confini
// di riga e di frase, e restituisce [{testo, offset}].
function suddividi(testo, massimo = 1100) {
  const blocchi = [];
  let i = 0;
  while (i < testo.length) {
    let fine = Math.min(i + massimo, testo.length);
    if (fine < testo.length) {
      const finestra = testo.slice(i + Math.floor(massimo * 0.5), fine);
      let taglio = Math.max(finestra.lastIndexOf('\n'), finestra.lastIndexOf('. '), finestra.lastIndexOf('; '));
      if (taglio < 0) taglio = finestra.lastIndexOf(' ');
      if (taglio >= 0) fine = i + Math.floor(massimo * 0.5) + taglio + 1;
    }
    blocchi.push({ testo: testo.slice(i, fine), offset: i });
    i = fine;
  }
  return blocchi;
}

// Riporta le entità alle posizioni nel testo originale. transformers.js non
// restituisce gli offset dei token: si ricostruiscono cercando in sequenza
// ogni token nel testo, a partire dall'ultima posizione raggiunta.
function allinea(testo, token) {
  const entita = [];
  let cursore = 0;
  let corrente = null;
  const chiudi = () => {
    if (corrente) {
      corrente.punteggio = corrente.somma / corrente.n;
      entita.push(corrente);
      corrente = null;
    }
  };
  const testoMinuscolo = testo.toLowerCase();
  for (const t of token) {
    let parola = t.word;
    if (!parola) continue;
    const continuazione = parola.startsWith('##');
    if (continuazione) parola = parola.slice(2);
    if (!parola || parola === '[UNK]') continue;
    let pos = testo.indexOf(parola, cursore);
    if (pos < 0 || pos - cursore > 60) {
      const alt = testoMinuscolo.indexOf(parola.toLowerCase(), cursore);
      if (alt >= 0 && alt - cursore <= 60) pos = alt; else continue;
    }
    const inizio = pos, fine = pos + parola.length;
    cursore = fine;
    const etichetta = t.entity || 'O';
    const tipo = etichetta.length > 2 && etichetta[1] === '-' ? etichetta.slice(2) : etichetta;
    const prefisso = etichetta[0];
    if (tipo === 'PER') {
      // Un token che continua la parola precedente prosegue l'entità; un
      // token con prefisso B, non di continuazione, ne apre una nuova.
      const nuova = !corrente || (prefisso === 'B' && !continuazione && inizio > corrente.fine + 1) || inizio > corrente.fine + 2;
      if (nuova) {
        chiudi();
        corrente = { tipo, inizio, fine, somma: t.score, n: 1 };
      } else {
        corrente.fine = fine;
        corrente.somma += t.score;
        corrente.n++;
      }
    } else if (corrente) {
      // Un token di continuazione non etichettato prolunga la parola in corso.
      if (continuazione && inizio === corrente.fine) {
        corrente.fine = fine;
      } else {
        chiudi();
      }
    }
  }
  chiudi();
  return entita.map((e) => ({ tipo: e.tipo, inizio: e.inizio, fine: e.fine, punteggio: e.punteggio, testo: testo.slice(e.inizio, e.fine) }));
}

async function analizza({ id, testo }) {
  if (!riconoscitore) {
    postMessage({ tipo: 'risultato', id, entita: [], nerAssente: true });
    return;
  }
  const entita = [];
  for (const blocco of suddividi(testo)) {
    if (!blocco.testo.trim()) continue;
    const token = await riconoscitore(blocco.testo, { ignore_labels: [] });
    for (const e of allinea(blocco.testo, token)) {
      entita.push({ ...e, inizio: e.inizio + blocco.offset, fine: e.fine + blocco.offset });
    }
  }
  postMessage({ tipo: 'risultato', id, entita });
}

onmessage = async (ev) => {
  const m = ev.data;
  try {
    if (m.tipo === 'carica') await carica(m);
    else if (m.tipo === 'analizza') await analizza(m);
  } catch (e) {
    postMessage({ tipo: 'errore', id: m.id, messaggio: String(e?.message || e) });
  }
};
