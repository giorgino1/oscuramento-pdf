// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Prepara la cartella da pubblicare su GitHub Pages: copia i soli file che
// servono al sito (niente modello, che viene scaricato con il consenso;
// niente documenti di lavoro interni), in una cartella accanto al progetto.
//
//   node prepara-sito.mjs            → ..\oscuramento-pdf-sito
//   node prepara-sito.mjs <cartella> → cartella indicata

import { cpSync, rmSync, mkdirSync, existsSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const qui = dirname(fileURLToPath(import.meta.url));
const destinazione = resolve(process.argv[2] || join(qui, '..', 'oscuramento-pdf-sito'));

// Cosa pubblicare (cartelle e file, relativi al progetto).
const DA_COPIARE = [
  'index.html', 'note-legali.html', 'robots.txt', '.nojekyll',
  'css', 'js', 'vendor', 'prove', 'esempi',
  'README.md', 'LICENZA.md', 'LICENZE-TERZE-PARTI.md', 'AGENTS.md', 'CLAUDE.md',
  'regole-oscuramento.md', 'specifica-funzionale.md',
  'server.js', 'avvia.cmd', 'prepara-sito.mjs',
];
// Esclusi di proposito: modelli/ (135 MB: scaricato da huggingface.co con il
// consenso), studio-lancio.md, prompt-*.md, revisione-codex-*.md (documenti
// di lavoro), .git, .claude.

mkdirSync(destinazione, { recursive: true });
// Svuota la destinazione tranne il suo .git, così gli aggiornamenti restano
// commit successivi dello stesso repository.
for (const voce of readdirSync(destinazione)) {
  if (voce === '.git') continue;
  rmSync(join(destinazione, voce), { recursive: true, force: true });
}
let copiati = 0;
for (const voce of DA_COPIARE) {
  const origine = join(qui, voce);
  if (!existsSync(origine)) { console.warn('manca:', voce); continue; }
  cpSync(origine, join(destinazione, voce), { recursive: true });
  copiati++;
}
// Il modello non c'è: lo dice un file, per chi apre la cartella.
mkdirSync(join(destinazione, 'modelli'), { recursive: true });
writeFileSync(join(destinazione, 'modelli', 'LEGGIMI.txt'), 'Il modello di riconoscimento dei nomi non è incluso: viene scaricato da huggingface.co, una sola volta e solo con il consenso dell\'utente, e conservato nella cache del browser. Per includerlo in locale copiare qui la cartella Xenova/ del progetto.\n');

// Controllo dei limiti di GitHub: nessun file oltre 100 MB.
let grandi = [];
const visita = (d) => { for (const v of readdirSync(d)) { const p = join(d, v); const st = statSync(p); if (st.isDirectory()) { if (v !== '.git') visita(p); } else if (st.size > 100 * 1024 * 1024) grandi.push(p); } };
visita(destinazione);
if (grandi.length) console.warn('ATTENZIONE, file oltre 100 MB (GitHub li rifiuta):', grandi);
console.log('Cartella pronta:', destinazione, '(' + copiati + ' voci copiate)');
