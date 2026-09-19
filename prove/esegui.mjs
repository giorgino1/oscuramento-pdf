// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Esecuzione della suite di prova da riga di comando (Node 18 o successivo):
//
//   node prove/esegui.mjs            tutti i casi
//   node prove/esegui.mjs iban       solo i casi il cui id contiene "iban"
//   node prove/esegui.mjs -v         mostra anche i rilievi dei casi superati
//
// Il riconoscimento dei nomi è simulato con i nomi dichiarati in ciascun
// caso: qui si provano le regole, non il modello. Per la prova con il modello
// reale aprire prove/index.html nel browser.

import { CASI } from './casi.js';
import { eseguiTutti } from './motore.js';

const argomenti = process.argv.slice(2);
const dettagli = argomenti.includes('-v');
const filtri = argomenti.filter((a) => !a.startsWith('-'));

const esiti = await eseguiTutti(CASI, {
  filtro: (c) => !filtri.length || filtri.some((f) => c.id.includes(f)),
});

let superati = 0;
for (const e of esiti) {
  if (e.ok) superati++;
  console.log((e.ok ? 'OK   ' : 'ERR  ') + e.id + ' — ' + e.titolo);
  for (const err of e.errori) console.log('       ' + err);
  if (dettagli || !e.ok) for (const r of e.rilievi) console.log('         ' + r);
}
console.log('\n' + superati + '/' + esiti.length + ' casi superati');
process.exit(superati === esiti.length ? 0 : 1);
