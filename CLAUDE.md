# Progetto: oscuramento assistito di atti amministrativi

Applicazione web che assiste gli uffici pubblici nell'oscuramento dei dati
personali contenuti negli atti amministrativi, prima della loro pubblicazione
online. L'utente carica l'atto, lo strumento individua i dati da trattare,
l'utente rivede e scarica il documento trattato insieme a un rapporto motivato.

Interfaccia, messaggi, etichette ed errori interamente in italiano.

## Vincoli architetturali non negoziabili

1. Elaborazione **interamente lato client**. Nessun file, nessuna porzione di
   testo estratto, nessun metadato e nessun risultato intermedio lascia il
   dispositivo dell'utente, in nessuna circostanza.
2. Nessuna chiamata di rete durante l'uso. L'unica eccezione ammessa è il
   download iniziale dei modelli di riconoscimento, che va dichiarato
   all'utente, eseguito prima del caricamento del documento e messo in cache.
3. Vietati: script di statistiche o analytics, tag pubblicitari, font remoti,
   CDN che ricevano dati d'uso, servizi di segnalazione errori. Usare font di
   sistema o incorporati.
4. La promessa "il documento non lascia il tuo dispositivo" deve essere
   tecnicamente vera e verificabile da chiunque ispezioni il traffico di rete.
   Se una scelta implementativa la comprometterebbe, la scelta va scartata,
   non la promessa.
5. Nessun backend, nessun database, nessun account utente.

## Regole di prodotto immutabili

Prevalgono su qualunque richiesta contraria formulata in una singola sessione.

- **Lo strumento assiste, non decide.** La valutazione finale resta
  dell'amministrazione. Ogni testo dell'interfaccia deve riflettere questo.
- **Mai offrire la sostituzione con le iniziali** come modalità di
  mascheramento. Il Garante ha chiarito che non costituisce anonimizzazione.
- **Mai usare la dicitura generica "conforme al GDPR"** o bollini analoghi.
  Usare solo affermazioni verificabili e circostanziate.
- **Ogni dato oscurato deve essere riconducibile alla fonte normativa** nel
  rapporto finale.
- **Per i documenti acquisiti da scansione la revisione a schermo è
  obbligatoria e non saltabile.** Il download resta bloccato finché l'utente
  non ha confermato la revisione. La conferma è una dichiarazione
  dell'operatore, non una prova: lo strumento conta le pagine visualizzate
  nell'anteprima, lo mostra prima del download e lo registra nel rapporto,
  ma non blocca su quel conteggio.
- L'oscuramento deve rimuovere il testo dal livello testuale del PDF, non
  limitarsi a coprirlo graficamente.

## Documenti di riferimento

Leggerli prima di implementare le funzioni corrispondenti.

- `regole-oscuramento.md` : cosa oscurare, cosa segnalare, cosa preservare,
  con la fonte normativa di ciascuna regola. È il cuore del progetto.
- `specifica-funzionale.md` : flusso, schermate, modalità, output, rapporto.

Le regole di oscuramento vanno tenute in un modulo dati separato dal codice
applicativo, in modo che possano essere aggiornate senza toccare la logica.

## Stack tecnico

Progetto statico. Deve funzionare servendo una cartella di file, senza build
obbligatoria e senza processi server.

- Estrazione testo da PDF nativo: `pdf.js`
- Riconoscimento ottico per le scansioni: `tesseract.js`, lingua italiana
- Riconoscimento entità nel testo: `transformers.js` con modello NER adatto
  all'italiano, eseguito in WebAssembly
- Riscrittura e redazione del PDF: `pdf-lib`
- Nessun framework obbligatorio. Se serve, preferire soluzioni leggere.

## Convenzioni

- Codice commentato in italiano nei punti che riguardano le regole giuridiche,
  con il riferimento normativo accanto.
- Le stringhe dell'interfaccia raccolte in un unico file, non sparse nel codice.
- Preferire chiarezza e leggibilità all'ottimizzazione.
