// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Pagina della suite di prova: esegue i casi nel browser, con i nomi simulati
// o con il modello reale di riconoscimento dei nomi (se presente in modelli/).

import { CASI } from './casi.js';
import { eseguiTutti } from './motore.js';
import { caricaNer, suEventoNer, nerPronto, riconosciNomi } from '../js/ner.js';

const el = (id) => document.getElementById(id);
const tabella = el('tabella');
const corpo = tabella.querySelector('tbody');

function riga(e) {
  const tr = document.createElement('tr');
  const esito = document.createElement('td');
  esito.textContent = e.ok ? 'OK' : 'ERRORE';
  esito.className = e.ok ? 'esito-ok' : 'esito-err';
  const caso = document.createElement('td');
  const id = document.createElement('div');
  id.className = 'id';
  id.textContent = e.id;
  caso.append(id, document.createTextNode(e.titolo));
  const dettagli = document.createElement('td');
  if (e.errori.length) {
    const ul = document.createElement('ul');
    for (const err of e.errori) {
      const li = document.createElement('li');
      li.textContent = err;
      ul.append(li);
    }
    dettagli.append(ul);
  }
  const det = document.createElement('details');
  const sum = document.createElement('summary');
  sum.textContent = 'Rilievi prodotti (' + e.rilievi.length + ')';
  const ul = document.createElement('ul');
  ul.className = 'rilievi';
  for (const r of e.rilievi) {
    const li = document.createElement('li');
    li.textContent = r;
    ul.append(li);
  }
  det.append(sum, ul);
  dettagli.append(det);
  tr.append(esito, caso, dettagli);
  return tr;
}

async function esegui(riconoscitore) {
  for (const b of document.querySelectorAll('button')) b.disabled = true;
  corpo.replaceChildren();
  tabella.hidden = false;
  const riepilogo = el('riepilogo');
  riepilogo.hidden = false;
  riepilogo.textContent = 'Esecuzione in corso…';
  let superati = 0, totale = 0;
  const esiti = await eseguiTutti(CASI, {
    riconoscitore,
    avanzamento: (e) => {
      totale++;
      if (e.ok) superati++;
      corpo.append(riga(e));
      riepilogo.textContent = superati + '/' + totale + ' casi superati' + (riconoscitore ? ' (modello dei nomi reale)' : ' (nomi simulati)');
    },
  });
  riepilogo.textContent = superati + '/' + esiti.length + ' casi superati' + (riconoscitore ? ' (modello dei nomi reale)' : ' (nomi simulati)');
  el('esegui-simulato').disabled = false;
  el('esegui-reale').disabled = !nerPronto();
  window.__proveEsiti = esiti;
}

el('esegui-simulato').addEventListener('click', () => esegui(null));
el('esegui-reale').addEventListener('click', () => esegui((testo) => riconosciNomi(testo)));

// Modello dei nomi: solo dalla cartella locale, nessuna richiesta esterna.
const statoModello = el('stato-modello');
suEventoNer((ev) => {
  if (ev.tipo === 'pronto') {
    statoModello.textContent = 'Modello dei nomi: pronto.';
    el('esegui-reale').disabled = false;
  } else if (ev.tipo === 'modello-assente') {
    statoModello.textContent = 'Modello dei nomi non presente in modelli/: disponibile solo la prova con nomi simulati.';
  } else if (ev.tipo === 'errore') {
    statoModello.textContent = 'Modello dei nomi: errore (' + ev.messaggio + ').';
  } else if (ev.tipo === 'progresso') {
    statoModello.textContent = 'Modello dei nomi: caricamento…';
  }
});
caricaNer({ consentiRemoto: false });

if (location.hash === '#auto') esegui(null);
