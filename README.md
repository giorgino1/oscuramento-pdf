# Oscuramento assistito di atti amministrativi

Progettato e sviluppato da Giorgio La Malfa. © 2026. Licenza EUPL-1.2 (vedi `LICENZA.md`).

Applicazione web che assiste gli uffici pubblici nell'oscuramento dei dati
personali contenuti negli atti amministrativi prima della pubblicazione
online. L'utente carica l'atto, lo strumento individua i dati da trattare
secondo una base di regole con fonte normativa, l'utente rivede e scarica il
documento trattato insieme a un rapporto motivato.

**Il documento non lascia il dispositivo dell'utente.** Tutta l'elaborazione
(lettura del PDF, riconoscimento ottico, riconoscimento dei nomi, produzione
del documento e del rapporto) avviene nel browser. Nessun backend, nessun
database, nessun account, nessuna statistica.

Lo strumento assiste, non decide: la valutazione finale resta
dell'amministrazione.

**Versione in linea**: <https://giorgino1.github.io/oscuramento-pdf/>
(pagine statiche servite da GitHub Pages; il modello di riconoscimento dei
nomi viene scaricato una sola volta, con il consenso dell'utente, da
huggingface.co). Note legali, informativa e condizioni d'uso:
<https://giorgino1.github.io/oscuramento-pdf/note-legali.html>.

## Segnalazioni e contatti

Segnalazioni di errori, proposte di correzione alle regole e ogni
comunicazione prevista dalle note legali (informativa, licenza) vanno
inviate tramite le *Issues* di questo repository:
<https://github.com/giorgino1/oscuramento-pdf/issues>. Non indicare nelle
segnalazioni dati personali reali né allegare atti non ancora oscurati: un
frammento fittizio che riproduce il problema è sufficiente.

## Avvio

Il progetto è statico: basta servire la cartella con un qualunque server web.
Non funziona aprendo `index.html` direttamente dal disco (`file://`), perché i
moduli e i worker richiedono il protocollo HTTP.

Con Node.js installato:

```bash
node server.js
```

poi aprire <http://localhost:8080/>. Su Windows si può usare anche
`avvia.cmd`. `server.js` non ha dipendenze e si limita a consegnare i file al
browser; in alternativa la cartella può essere pubblicata su un server web
interno dell'ente (Apache, IIS, nginx) senza alcuna configurazione
particolare, purché i file `.mjs`, `.wasm` e `.onnx` siano serviti.

Requisiti: un browser recente (Chrome, Edge o Firefox aggiornati). Per i
documenti da scansione sono consigliati almeno 4 GB di memoria.

## Componenti di riconoscimento

Tutto ciò che serve è nella cartella del progetto:

| Componente | Cartella | Uso |
| --- | --- | --- |
| pdf.js | `vendor/pdfjs/` | lettura del PDF, estrazione del testo con posizione, resa delle pagine |
| pdf-lib | `vendor/pdf-lib/` | scrittura del documento trattato e del rapporto |
| tesseract.js + dati lingua italiana | `vendor/tesseract/`, `vendor/tessdata/` | riconoscimento ottico delle scansioni |
| transformers.js + onnxruntime | `vendor/transformers/` | esecuzione del modello NER in WebAssembly |
| modello NER multilingue (quantizzato, ~135 MB) | `modelli/` | riconoscimento dei nomi di persona |

Il modello è `Xenova/distilbert-base-multilingual-cased-ner-hrl`, conversione
ONNX del modello `Davlan/distilbert-base-multilingual-cased-ner-hrl`
(riconosce persone, organizzazioni, luoghi e date in dieci lingue, fra cui
l'italiano). Per la licenza consultare la scheda del modello.

Se la cartella `modelli/` non è presente (ad esempio perché l'applicazione è
stata copiata senza), l'interfaccia lo segnala e propone di scaricare il
modello una sola volta da huggingface.co, previo consenso esplicito; il
download riguarda solo il modello e viene conservato nella cache del browser.
In alternativa si può proseguire senza riconoscimento dei nomi: le altre
categorie di dati vengono comunque individuate.

## Verificare la promessa

La promessa "il documento non lascia il tuo dispositivo" è verificabile:

1. La pagina dichiara una Content Security Policy con `connect-src 'self'`
   (più i soli domini di huggingface.co per il download facoltativo del
   modello). Il browser blocca qualunque altra richiesta.
2. Aprendo gli strumenti di sviluppo del browser, scheda Rete, durante l'uso
   non devono comparire richieste: worker, CMap e font sono preparati prima
   della scelta del documento. Nessun file, testo o risultato viene trasmesso.
3. Il codice non contiene script di statistiche, tag pubblicitari, font
   remoti o servizi di segnalazione errori.

## Flusso d'uso

1. **Carica**: un documento per volta (con gli allegati nello stesso file):
   PDF, immagine JPG o PNG (incapsulata in una pagina PDF e trattata come
   scansione; in uscita anche come immagine), busta di firma CAdES .p7m (il
   PDF firmato viene estratto, senza verifica della firma; le buste
   annidate e quelle in base64 sono gestite). I file di Word, LibreOffice
   e simili non sono accettati: un messaggio spiega come salvarli in PDF.
   I PDF protetti da password vengono rifiutati, senza tentativi di forzatura.
   La domanda sullo scopo compare dopo la scelta del file e l'analisi parte
   da sola appena si risponde.
   L'utente indica lo **scopo** del trattamento (pubblicazione obbligatoria
   di un ente pubblico; invio, condivisione o pubblicazione facoltativa):
   determina le proposte di decisione, ciascuna con il motivo e la norma. Le
   componenti di riconoscimento vengono preparate al primo gesto sulla
   pagina. L'analisi (estrazione del testo; riconoscimento ottico per le
   pagine prive di testo estraibile, con avviso; regole; riconoscimento dei
   nomi; coerenza delle occorrenze) è interrompibile.
2. **Controlla e scarica**: anteprima del documento già coperto e riepilogo
   con le sole eccezioni: dati lasciati in chiaro perché la legge ne impone la
   pubblicazione (con motivo e pulsante «Oscura»), dati da controllare, dati
   istituzionali. «Confermo e scarico» conferma le proposte e genera documento
   trattato e rapporto. Su richiesta, «Vedi e modifica tutti i dati trovati»
   apre l'elenco completo con filtri, decisioni in blocco, ripristino con
   motivazione (obbligatoria per i dati vietati), applicazione a tutte le
   occorrenze, copertura specifica; strumenti per aggiungere oscuramenti a
   mano (area, testo, coordinate). Per i documenti da scansione la revisione è
   obbligatoria: il download resta bloccato finché l'utente non l'ha
   confermata; il numero di pagine visualizzate nell'anteprima viene mostrato
   prima del download e registrato nel rapporto. Sotto «Opzioni avanzate»:
   tipo di copertura (oscuramento pieno, OMISSIS, pseudonimizzazione coerente
   con avvertenza; le iniziali non sono offerte, Garante FAQ n. 12) e
   risoluzione. Copertura predefinita: [OMISSIS] per la pubblicazione
   obbligatoria, oscuramento pieno per gli altri usi.

## Documento in uscita

Ogni pagina viene ricostruita come immagine con gli oscuramenti impressi nei
pixel; sopra viene scritto un livello testuale invisibile che contiene solo il
testo rimasto in chiaro, così il PDF resta ricercabile e accessibile. Il testo
oscurato non è coperto: non esiste più nel file. Le pagine segnalate come
allegato costituito da documento di identità vengono espunte. I metadati
dell'originale (autore, software, date) non vengono riportati.

Il documento prodotto è un file nuovo e non reca più la sottoscrizione
digitale dell'originale: l'ufficio valuta come attestarne la conformità.

## Struttura del progetto

```
index.html               pagina unica (strumento e testo informativo)
note-legali.html         licenza, componenti, informativa, condizioni d'uso
css/stile.css            aspetto
js/app.js                orchestrazione del flusso
js/stringhe.js           tutte le stringhe dell'interfaccia
js/regole/regole.js      base di regole (solo dati: categorie, fonti, espressioni)
js/regole/fonti.js       base delle fonti: estremi, passaggi citati, stato di verifica
js/validatori.js         controlli formali (codice fiscale, IBAN, partita IVA, Luhn)
js/ingresso.js           formati in ingresso: immagini → PDF, buste .p7m → PDF
js/estrazione.js         pdf.js: apertura, testo con posizione, immagini, resa
js/testo.js              testo di pagina e corrispondenza testo → rettangoli
js/ocr.js                tesseract.js
js/ner.js, ner-worker.js transformers.js in un worker
js/rilevamento.js        applicazione delle regole → rilievi
js/revisione.js          schermata di revisione
js/redazione.js          documento trattato (pdf-lib)
js/rapporto.js           rapporto di trattamento (pdf-lib)
regole-oscuramento.md    base di regole in forma discorsiva, con le fonti
studio-lancio.md         studio di posizionamento e lancio
LICENZA.md, LICENZE-TERZE-PARTI.md   licenza del progetto e delle componenti
specifica-funzionale.md  flusso, schermate, modalità, output
esempi/                  documento di prova con dati fittizi e script che lo genera
prove/                   suite di prova delle regole (casi, motore, esecuzione)
```

## Manutenzione delle regole

Le regole vivono in `js/regole/regole.js`, separato dal codice applicativo,
e traducono `regole-oscuramento.md`. Per aggiornare una regola:

- modificare la categoria (etichetta, descrizione, fonti, messaggio,
  ripristinabilità, obbligo di motivazione) o le espressioni di ricerca;
- aggiornare `REGOLE_VERSIONE` con la data;
- annotare in `regole-oscuramento.md` la modifica e la fonte.

Le espressioni regolari dei rilevatori possono essere provate rapidamente
nella console del browser o con Node.js. Nessuna regola va dedotta per
analogia senza un riferimento che la sorregga.

### Base delle fonti

`js/regole/fonti.js` raccoglie le fonti normative e di prassi: estremi,
indirizzo del testo ufficiale, passaggi citati (testo letterale o sintesi) e
stato di verifica. Le regole vi rimandano per chiave (`PASSAGGI` in
`regole.js`) e il rapporto riporta per esteso i passaggi che sorreggono ogni
dato trattato, con lo stato di verifica della fonte.

Per riscontrare una fonte: aprire il testo vigente all'indirizzo indicato,
confrontare i passaggi, correggerli se serve, poi impostare `verificata: true`
e `verificataIl: 'gg mese aaaa'` nella voce della fonte e aggiornare
`FONTI_VERSIONE`. Finché una fonte non è riscontrata il rapporto lo dichiara.

### Suite di prova

`prove/casi.js` contiene i casi: frammenti di atto con i nomi attesi dal
modello e i rilievi che le regole devono produrre. Per eseguirli:

- da riga di comando, con i nomi simulati (prova delle sole regole):

  ```
  node prove/esegui.mjs            tutti i casi
  node prove/esegui.mjs iban       solo i casi con "iban" nell'identificativo
  node prove/esegui.mjs -v         mostra anche i rilievi dei casi superati
  ```

- nel browser, aprendo `prove/index.html` dal server locale
  (`http://localhost:8080/prove/`): pulsante "nomi simulati" per le regole,
  "modello dei nomi" per provare anche il riconoscimento reale.

Ogni modifica alle regole va accompagnata dall'esecuzione della suite; se una
scelta cambia, va aggiornato il caso che la descrive, con la fonte accanto.

## Euristiche di supporto

Oltre alle espressioni regolari e al modello NER, alcune situazioni ricorrenti
sono trattate con euristiche dichiarate, tutte rivedibili in revisione:

- **Moduli compilati**: i valori dei campi (spesso in un livello separato del
  PDF) vengono rimessi accanto alle etichette con un ordinamento geometrico di
  lettura, e i nominativi introdotti da "sottoscritto/a", "dichiarante" o da un
  titolo di cortesia vengono riconosciuti anche se in maiuscolo.
- **Copie di documenti di identità**: una pagina è segnalata come allegato da
  espungere se contiene indizi forti (carta d'identità, passaporto, statura,
  numero del documento…), una zona a lettura ottica (MRZ) oppure, nelle
  scansioni, regioni con le proporzioni di una tessera ID-1 su fondo bianco.
- **Oscuramento manuale per testo o per coordinate**: dal pannello di
  revisione si può cercare un testo esatto e oscurarne tutte le occorrenze,
  oppure indicare un'area con numero di pagina e coordinate in percentuale,
  entrambi utilizzabili senza mouse.
- **Campi compilabili**: i valori dei campi AcroForm e delle annotazioni di
  testo libero vengono analizzati come testo della pagina; l'oscuramento di
  una parte del valore copre l'intero campo.
- **Pagine miste**: una pagina con testo nativo e un'immagine estesa viene
  anche letta con il riconoscimento ottico, ed è trattata come scansione.
- **Pagine scansionate illeggibili**: se l'OCR non legge testo utile, la pagina
  è un rilievo di fascia C che l'utente deve guardare e decidere.
- **Firme e timbri**: immagini di dimensioni contenute fuori dall'intestazione,
  anche dentro form XObject.
- **Recapiti di società ed enti**: telefoni e indirizzi nel blocco dei dati di
  una persona giuridica (s.r.l., sede legale, partita IVA…) o in testa e piè di
  pagina sono proposti come dati da preservare, con nota.

## Revisione del codice con Codex

`prompt-revisione-codex.md` contiene il prompt per una revisione indipendente
del codice con Codex CLI, da lanciare dalla cartella del progetto in sola
lettura (`codex --sandbox read-only`). Il codice viene inviato ai server di
OpenAI: prima di una revisione la cartella `esempi/` deve contenere solo il
documento fittizio.

## Limiti noti

- Il riconoscimento dei nomi è statistico: può ignorare nomi o segnalare
  parole comuni; per questo i nominativi sono in fascia C e la decisione è
  dell'utente. La revisione a schermo resta indispensabile.
- Per i PDF nativi, la posizione dei singoli caratteri all'interno di un
  frammento di testo è stimata dalla larghezza del frammento; i rettangoli
  includono un margine di sicurezza e il livello testuale esclude comunque
  ogni porzione che ricada sotto un oscuramento.
- Nelle pagine da scansione (anche con livello testuale preesistente) la firma
  non è distinguibile dall'immagine: la revisione a schermo, obbligatoria,
  resta l'unico presidio; l'oscuramento manuale per area o per testo è sempre
  disponibile.
- L'ordine di lettura ricostruito è per righe: in un impaginato a due colonne
  le righe delle due colonne si alternano, e le finestre di contesto possono
  associare elementi della colonna accanto. Verificare con attenzione i
  documenti a colonne e le tabelle.
- Un documento molto esteso richiede tempo e memoria proporzionali; il
  riconoscimento ottico è la fase più onerosa.
