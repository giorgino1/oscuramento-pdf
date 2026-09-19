# Componenti di terze parti e loro licenze

Il progetto incorpora le componenti elencate. Tutte hanno licenze aperte che
consentono l'uso, la modifica e la ridistribuzione, anche a fini
commerciali, a condizione di conservare le note di copyright e i testi di
licenza (che sono nella cartella `vendor/` accanto a ciascuna componente).
Questo file va pubblicato insieme all'applicazione (pagina "Note legali").

| Componente | Uso | Licenza | Testo |
|---|---|---|---|
| pdf.js (Mozilla) | lettura del PDF, testo con posizione, resa delle pagine | Apache 2.0 | `vendor/pdfjs/LICENSE` |
| Caratteri standard di pdf.js (Foxit/PDFium; Liberation) | resa dei PDF privi di caratteri incorporati | BSD a 3 clausole (Foxit/PDFium); SIL Open Font License (Liberation) | `vendor/pdfjs/standard_fonts/LICENSE_FOXIT`, `LICENSE_LIBERATION` |
| CMap di Adobe (in pdf.js) | codifiche dei caratteri CJK | licenza BSD di Adobe | `vendor/pdfjs/cmaps/LICENSE` |
| pdf-lib (Andrew Dillon) | scrittura del PDF trattato e del rapporto | MIT | `vendor/pdf-lib/LICENSE.md` |
| tesseract.js e tesseract-core | riconoscimento ottico delle scansioni | Apache 2.0 | `vendor/tesseract/LICENSE.md`, `LICENSE-core` |
| Dati addestrati Tesseract, lingua italiana (`ita.traineddata`) | riconoscimento ottico | Apache 2.0 | (progetto tessdata) |
| transformers.js (Hugging Face) | esecuzione del modello di riconoscimento dei nomi | Apache 2.0 | `vendor/transformers/LICENSE` |
| ONNX Runtime Web (Microsoft), incluso in transformers.js | motore WebAssembly del modello | MIT | (progetto onnxruntime) |
| Modello `distilbert-base-multilingual-cased-ner-hrl` (David Adelani, "Davlan"), conversione ONNX di Xenova | riconoscimento dei nomi di persona | Academic Free License 3.0 (AFL-3.0): licenza aperta approvata OSI, permette uso commerciale e ridistribuzione con attribuzione | scheda del modello su huggingface.co |

Note:

- La "Academic Free License" non è una licenza per soli usi accademici: è una
  licenza permissiva che richiede di conservare l'attribuzione all'autore e
  il testo della licenza.
- I testi normativi e i provvedimenti del Garante e dell'ANAC citati in
  `js/regole/fonti.js` sono atti ufficiali dello Stato e delle pubbliche
  amministrazioni, non protetti dal diritto d'autore (art. 5 l. 633/1941).
- I caratteri dell'interfaccia sono quelli di sistema; nessun carattere è
  incorporato o scaricato.
