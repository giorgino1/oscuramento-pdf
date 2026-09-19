// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Motore della suite di prova: costruisce un documento finto a partire dal
// testo di un caso, esegue il rilevamento e confronta i rilievi con le
// attese. Funziona sia in Node (prove/esegui.mjs) sia nel browser
// (prove/index.html); nel browser può usare il modello reale di
// riconoscimento dei nomi, altrimenti simula il modello con i nomi indicati
// nel caso (campo `nomi`).
//
// Un caso ha la forma:
//   {
//     id, titolo,
//     testo: 'una o più righe' | pagine: ['testo pagina 1', ...],
//     scopo: 'pubblica' (predefinito) | 'privato',
//     nomi: ['Mario Rossi', ...]   // entità PER che il modello dovrebbe trovare
//     attesi: [{ testo, categoria?, fascia?, chiave?, decisione?, esatto? }],
//     nonAttesi: [{ testo, categoria? }],
//     intestazione: true,          // il testo parte dal bordo superiore
//     soloSimulato: true           // non eseguire con il modello reale
//   }
//
// Un atteso è soddisfatto se esiste un rilievo il cui testo contiene `testo`
// (o coincide, con `esatto`) e i cui campi coincidono con quelli indicati.
// Un non atteso fallisce se esiste un rilievo che contiene `testo` con la
// categoria indicata oppure, senza categoria, con decisione di oscuramento
// (un rilievo preservato, fascia P, non è un oscuramento).

import { componiPagina } from '../js/estrazione.js';
import { rilevaDati } from '../js/rilevamento.js';

// Segmenti di testo con geometria plausibile: una riga per segmento, dall'alto
// in basso. Le righe vuote separano i paragrafi. Il testo parte sotto la zona
// d'intestazione della pagina (che ha regole proprie per i recapiti); un caso
// può chiedere di partire dall'alto con `intestazione: true`.
export function segmentiDaTesto(testo, { intestazione = false } = {}) {
  const righe = testo.split('\n');
  const segmenti = [];
  const h = 11, interlinea = 14;
  let y = intestazione ? 820 : 700;
  for (const riga of righe) {
    if (riga.trim()) {
      segmenti.push({ str: riga, x: 50, y, dx: 1, dy: 0, w: Math.max(1, riga.length * 5.5), h, fineRiga: true, uniforme: true });
    } else if (segmenti.length) {
      segmenti[segmenti.length - 1].str += '\n';
    }
    y -= interlinea;
  }
  return segmenti;
}

export function documentoDaCaso(caso) {
  const testi = caso.pagine || [caso.testo];
  const vista = { larghezza: 595.28, altezza: 841.89, rotazione: 0 };
  const pagine = testi.map((t, i) => componiPagina(i, vista, segmentiDaTesto(t, { intestazione: !!caso.intestazione }), { riordina: false }));
  return { nome: caso.id + '.pdf', dimensione: 0, numPagine: pagine.length, pagine, daScansione: false };
}

// Riconoscitore simulato: trova tutte le occorrenze dei nomi del caso.
export function riconoscitoreSimulato(nomi) {
  return async (testo) => {
    const entita = [];
    for (const nome of nomi || []) {
      let i = 0;
      while ((i = testo.indexOf(nome, i)) >= 0) {
        entita.push({ tipo: 'PER', inizio: i, fine: i + nome.length, punteggio: 0.99, testo: nome });
        i += nome.length;
      }
    }
    return entita.sort((a, b) => a.inizio - b.inizio);
  };
}

const norma = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

function corrisponde(r, atteso) {
  const t = norma(r.testo), a = norma(atteso.testo);
  if (atteso.esatto ? t !== a : !t.includes(a)) return false;
  if (atteso.categoria && r.categoria !== atteso.categoria) return false;
  if (atteso.fascia && r.fascia !== atteso.fascia) return false;
  if (atteso.chiave && r.chiaveProposta !== atteso.chiave) return false;
  if (atteso.decisione !== undefined && r.decisione !== atteso.decisione) return false;
  if (atteso.pagina && r.pagina !== atteso.pagina) return false;
  return true;
}

function descriviRilievo(r) {
  return '[' + r.categoria + '/' + r.fascia + (r.chiaveProposta !== r.categoria ? ' ' + r.chiaveProposta : '') + ' → ' + (r.decisione ?? 'da decidere') + '] "' + norma(r.testo).slice(0, 60) + '"';
}

function descriviAtteso(a) {
  const parti = [];
  if (a.categoria) parti.push(a.categoria);
  if (a.fascia) parti.push('fascia ' + a.fascia);
  if (a.chiave) parti.push(a.chiave);
  if (a.decisione !== undefined) parti.push('→ ' + (a.decisione ?? 'da decidere'));
  return '"' + a.testo + '"' + (parti.length ? ' (' + parti.join(', ') + ')' : '');
}

// Esegue un caso. `riconoscitore` null = simulato dai nomi del caso;
// altrimenti la funzione passata (nel browser, il modello reale).
export async function eseguiCaso(caso, { riconoscitore = null } = {}) {
  // Le regressioni tecniche esercitano i moduli reali con dipendenze simulate.
  if (caso.tecnica) {
    const { verificaTecnica } = await import('./tecniche.mjs');
    await verificaTecnica(caso.tecnica);
    return { id: caso.id, titolo: caso.titolo, ok: true, errori: [], rilievi: [] };
  }
  const documento = documentoDaCaso(caso);
  const rilievi = await rilevaDati(documento, {
    scopo: caso.scopo || 'pubblica',
    riconoscitore: riconoscitore || riconoscitoreSimulato(caso.nomi),
  });
  const errori = [];
  for (const a of caso.attesi || []) {
    if (!rilievi.some((r) => corrisponde(r, a))) {
      const vicini = rilievi.filter((r) => norma(r.testo).includes(norma(a.testo)) || norma(a.testo).includes(norma(r.testo)));
      errori.push('atteso ' + descriviAtteso(a) + (vicini.length ? '; trovato ' + vicini.map(descriviRilievo).join(', ') : '; nessun rilievo sul testo'));
    }
  }
  for (const n of caso.nonAttesi || []) {
    const t = norma(n.testo);
    const colpevoli = rilievi.filter((r) => norma(r.testo).includes(t) && (n.categoria ? r.categoria === n.categoria : r.decisione === 'oscura' && r.fascia !== 'P'));
    if (colpevoli.length) errori.push('non atteso "' + n.testo + '"' + (n.categoria ? ' (' + n.categoria + ')' : '') + '; trovato ' + colpevoli.map(descriviRilievo).join(', '));
  }
  return { id: caso.id, titolo: caso.titolo, ok: errori.length === 0, errori, rilievi: rilievi.map(descriviRilievo) };
}

export async function eseguiTutti(casi, opzioni = {}) {
  const esiti = [];
  for (const caso of casi) {
    if (caso.tecnica && typeof window !== 'undefined') continue;
    if (opzioni.riconoscitore && caso.soloSimulato) continue;
    if (opzioni.filtro && !opzioni.filtro(caso)) continue;
    try {
      esiti.push(await eseguiCaso(caso, opzioni));
    } catch (e) {
      esiti.push({ id: caso.id, titolo: caso.titolo, ok: false, errori: ['eccezione: ' + (e && e.message || e)], rilievi: [] });
    }
    if (opzioni.avanzamento) opzioni.avanzamento(esiti[esiti.length - 1]);
  }
  return esiti;
}
