# Specifica funzionale

## 1. Flusso

Due passaggi visibili, su pagina unica (revisione del 18 settembre 2026:
in origine erano cinque; analisi, modalità e download sono confluiti nei
due passi).

1. **Carica.** Trascinamento o selezione. Un documento per volta, con i suoi
   allegati. Formati: PDF nativo e da scansione, immagini JPG e PNG (una
   pagina PDF, trattata come scansione), buste di firma .p7m (PDF estratto).
   Word e simili: messaggio che spiega come salvare in PDF. Nessun limite
   di pagine imposto artificialmente. Dopo il file compare una sola domanda:
   a che cosa serve il documento (pubblicazione obbligatoria di un ente
   pubblico; invio, condivisione o pubblicazione facoltativa); l'analisi
   (estrazione del testo, riconoscimento ottico se necessario, individuazione
   dei dati) parte da sola, con avanzamento visibile e interrompibile.
2. **Controlla e scarica.** Anteprima del documento già coperto; riepilogo
   in linguaggio piano con le sole eccezioni (§ 3); un pulsante «Confermo e
   scarico» che conferma le proposte e genera documento e rapporto. Tipo di
   copertura e risoluzione sotto «Opzioni avanzate», con valori predefiniti.

Il caricamento di un nuovo documento azzera tutto. Nessuna persistenza fra
sessioni, nessuna cronologia.

## 2. Modalità di mascheramento

Scelta dell'utente, applicabile all'intero documento oppure per singolo rilievo.

- **Oscuramento pieno.** Rettangolo nero e rimozione effettiva del testo dal
  livello testuale. Impostazione predefinita.
- **OMISSIS.** Sostituzione con la dicitura `[OMISSIS]`, sobria e conforme alla
  prassi degli uffici.
- **Pseudonimizzazione coerente.** Sostituzione con etichetta stabile:
  `[SOGGETTO 1]`, `[SOGGETTO 2]`, mantenuta identica in tutto il fascicolo, così
  che il lettore possa seguire i riferimenti senza identificare le persone.

Avvertenza da mostrare quando l'utente sceglie la pseudonimizzazione: il dato
pseudonimizzato resta un dato personale e continua a essere soggetto alla
disciplina sulla protezione dei dati. Solo l'oscuramento pieno, se il
collegamento non è altrimenti ricostruibile, produce un documento anonimo.

La sostituzione con le iniziali non è offerta. Se l'utente la cerca, mostrare
una nota che ne spieghi la ragione, citando la FAQ n. 12 del Garante.

## 3. Schermata di revisione

- Anteprima fedele del documento, pagina per pagina, con i dati evidenziati
  (colore per natura del dato; le lettere delle fasce non compaiono sullo
  schermo, restano nelle regole e nel rapporto).
- **Riepilogo** in testa: numero dei dati oscurati automaticamente; elenco
  dei dati lasciati in chiaro perché la legge ne impone la pubblicazione,
  ciascuno con il motivo e un pulsante «Oscura»; elenco dei dati da
  controllare (pagine non leggibili); dati istituzionali in chiaro, ripiegati.
  Se non ci sono eccezioni lo dice.
- **Un solo pulsante**, «Confermo e scarico»: conferma con lo stesso gesto le
  proposte dello strumento (la decisione resta dell'utente) e genera il
  documento trattato e il rapporto.
- Strumenti per aggiungere un oscuramento (area con il mouse, testo,
  coordinate) sopra l'anteprima.
- «Vedi e modifica tutti i dati trovati», su richiesta: elenco completo con
  tipo di dato, testo, pagina, stato, motivo e fonte; filtri; decisioni in
  blocco per categoria; per ogni dato conferma, ripristino (con motivazione,
  obbligatoria per i dati vietati), applicazione a tutte le occorrenze, tipo
  di copertura specifico. Un clic su un'evidenza dell'anteprima apre l'elenco
  sul dato corrispondente.

Il download resta bloccato finché restano dati da controllare.

Per i documenti acquisiti da scansione la revisione è obbligatoria e non
saltabile, e va mostrato un avviso: il riconoscimento ottico può non individuare
tutto il testo, in particolare su scansioni di scarsa qualità, e un dato letto
in modo errato non viene classificato come dato da oscurare.

## 4. Documento in uscita

- PDF con il testo effettivamente rimosso dal livello testuale, non coperto.
- Metadati ripuliti: autore, software di origine, cronologia delle revisioni.
- Nome file derivato dall'originale con suffisso riconoscibile.

Avviso da mostrare prima del download, formulato in modo esatto e non
allarmistico:

> Il documento prodotto è un file nuovo e non reca più la sottoscrizione
> digitale dell'originale. Valuta con il tuo ufficio come attestarne la
> conformità all'atto originale prima della pubblicazione.

## 5. Rapporto di trattamento

Documento separato, scaricabile, da conservare agli atti. Contiene:

- Data e ora del trattamento, nome del file originario, numero di pagine.
- Modalità di mascheramento adottata.
- Tabella dei dati trattati: pagina, tipo di dato, fascia, fonte normativa,
  esito, e se l'esito è stato modificato dall'utente.
- Elenco dei rilievi di fascia C con la decisione assunta.
- Per i documenti da scansione, indicazione della qualità del riconoscimento.
- Dichiarazione finale: il trattamento è stato eseguito localmente sul
  dispositivo dell'utente; lo strumento ha carattere di ausilio e la verifica
  finale è rimasta in capo all'amministrazione.

Il rapporto è ciò che consente all'ufficio di dimostrare come ha operato. Va
curato quanto il documento principale.

## 6. Testi di rassicurazione

Solo affermazioni verificabili. Da collocare in modo visibile ma non invadente.

- «Il documento non lascia il tuo dispositivo. L'elaborazione avviene
  interamente nel tuo browser.»
- «Nessun file viene caricato, nessun dato viene registrato, nessuna
  statistica viene raccolta.»
- «Regole fondate su: d.lgs. 33/2013, artt. 7-bis e 26; d.lgs. 196/2003,
  art. 2-septies; Regolamento (UE) 2016/679, artt. 5 e 9; Linee guida del
  Garante per la protezione dei dati personali n. 243 del 15 maggio 2014.»
- «Lo strumento assiste la valutazione. La verifica finale resta
  dell'amministrazione.»

Vietate le formule generiche di conformità.

## 7. Aspetto

Sobrio e istituzionale. Il riferimento non sono i convertitori di PDF, pieni di
pubblicità, ma i portali della pubblica amministrazione.

- Impaginazione ampia, ampio spazio bianco, larghezza di lettura contenuta.
- Tipografia di sistema, leggibile, corpo generoso.
- Tavolozza ridotta: un neutro dominante, un colore istituzionale, il rosso
  riservato agli avvisi.
- Nessuna animazione decorativa. L'unica animazione ammessa è l'indicatore di
  avanzamento.
- Identità visiva propria e riconoscibile, non ripresa da altri servizi.
- Funzionamento su schermo piccolo, contrasto adeguato, navigazione da
  tastiera, etichette leggibili dagli screen reader.

## 8. Casi limite da gestire

- PDF protetto da password: messaggio chiaro, nessun tentativo di forzatura.
- PDF privo di testo estraibile: passaggio automatico al riconoscimento ottico,
  con avviso.
- Documento molto esteso: elaborazione a blocchi, avanzamento visibile,
  possibilità di interruzione.
- Dispositivo con risorse insufficienti: avviso preventivo prima di avviare il
  riconoscimento ottico.
- Allegato costituito da un documento di identità: segnalazione come allegato da
  espungere, non come porzione da oscurare.
- Testo su due colonne, tabelle, timbri: verificare che le coordinate di
  oscuramento restino corrette.

## 9. Fuori perimetro

Da non implementare senza una decisione esplicita: registrazione utenti,
salvataggio dei documenti, elaborazione di più atti in blocco, integrazione con
i gestionali documentali, firma del documento in uscita.
