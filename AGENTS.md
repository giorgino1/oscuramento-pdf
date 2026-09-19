# Istruzioni per gli agenti di codice (Codex e altri)

Leggi per intero `CLAUDE.md`: contiene i vincoli architetturali non
negoziabili (elaborazione interamente nel browser, nessuna chiamata di rete
durante l'uso, nessun backend, nessuna statistica) e le regole di prodotto
immutabili (lo strumento assiste, non decide; mai le iniziali; mai "conforme
al GDPR"; ogni dato oscurato riconducibile alla fonte; revisione obbligatoria
per le scansioni; il testo oscurato deve sparire dal livello testuale del
PDF). Nessuna correzione può violarli, nemmeno per risolvere un difetto.

Poi leggi `regole-oscuramento.md` (le regole giuridiche, con le fonti),
`specifica-funzionale.md` e `README.md`.

## Come lavorare

- Progetto statico, senza build: file in `js/`, `css/`, `index.html`.
  Interfaccia interamente in italiano; tutte le stringhe visibili in
  `js/stringhe.js`; regole in `js/regole/regole.js` (dati) e fonti in
  `js/regole/fonti.js`; logica in `js/rilevamento.js`, `js/redazione.js`,
  `js/rapporto.js`, `js/revisione.js`, `js/app.js`.
- Non toccare `vendor/` né `modelli/`.
- Non aggiungere dipendenze, script esterni, font remoti, analytics.
- Prima di ogni modifica e dopo, esegui la suite: `node prove/esegui.mjs`.
  Deve restare a 100 %. Se una correzione cambia una scelta di regola,
  aggiorna il caso che la descrive in `prove/casi.js` con la fonte, e
  annota la modifica in `regole-oscuramento.md` (sezione Aggiornamenti).
- Controlla la sintassi di ogni file toccato: `node --check <file>`.
- Per provare l'interfaccia: `node server.js` e apri
  `http://localhost:8080/index.html#debug` (espone `window.__oscuramento`);
  il documento di prova è `esempi/determina-prova.pdf`. Non mettere mai
  documenti reali nella cartella del progetto.
- Commenti in italiano; nei punti che riguardano le regole giuridiche,
  cita la norma accanto.
- Modifiche piccole e motivate: per ogni correzione indica file, riga,
  difetto, causa, correzione e prova che la dimostra.
