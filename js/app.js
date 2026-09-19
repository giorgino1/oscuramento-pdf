// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Orchestrazione del flusso (specifica funzionale, § 1): caricamento,
// analisi, revisione, scelta della modalità, download. Tutto lo stato vive
// in memoria e viene azzerato al caricamento di un nuovo documento.

import { el, crea, svuota, mostra, testo, formattaByte } from './dom.js';
import { T } from './stringhe.js';
import {
  apriPdf, preparaPdf, estraiSegmenti, componiPagina, vistaPagina, richiedeOcr, estraiImmagini, analizzaFormaScansione,
  PdfProtettoError, PdfDanneggiatoError,
} from './estrazione.js';
import { preparaOcr, riconosciPagina, descriviQualitaOcr, ocrDisponibile, chiudiOcr } from './ocr.js';
import { caricaNer, disattivaNer, suEventoNer, nerPronto, annullaNer } from './ner.js';
import { rilevaDati, daDecidere, daConfermare } from './rilevamento.js';
import { SCOPI, ORDINE_SCOPI, IMMAGINI, CATEGORIE } from './regole/regole.js';
import { generaDocumento } from './redazione.js';
import { generaRapporto } from './rapporto.js';
import { Revisione } from './revisione.js';
import { tipoFile, nomeBaseFile, pdfDaImmagine, pdfDaP7m, P7mSenzaContenutoError } from './ingresso.js';

const stato = {
  file: null,
  documento: null,
  rilievi: [],
  modalita: 'pieno',
  dpi: 200,
  filtro: 'tutti',
  attivo: null,
  selezioneManuale: false,
  pagineViste: new Set(),
  controller: null,
  ner: 'verifica', // verifica | caricamento | pronto | assente | errore | disattivato
  ocr: 'verifica',
  pdfPronto: false,
  risultato: null,
  scopo: null,
  ente: '',
  inAnalisi: false,
  inGenerazione: false,
};

let revisione = null;
let contatoreCaricamenti = 0;

// ---------------------------------------------------------------------------
// Avvio
// ---------------------------------------------------------------------------
function riempiTesti() {
  // Il titolo della scheda resta quello dell'HTML (descrittivo, per i motori di ricerca).
  testo('titolo-app', T.nomeApp);
  testo('sottotitolo-app', T.sottotitolo);
  testo('rassicurazione-locale', T.rassicurazione.locale);

  const passi = el('passi');
  svuota(passi);
  for (const p of T.passi) {
    passi.append(crea('li', { dataset: { passo: String(p.numero) } }, [
      crea('span', { classe: 'passo-numero', testo: String(p.numero) }),
      crea('span', { classe: 'passo-titolo', testo: p.titolo }),
      crea('span', { classe: 'passo-descrizione', testo: p.descrizione }),
    ]));
  }

  const C = T.componenti;
  testo('ner-remoto-spiegazione', C.remotoSpiegazione);
  testo('ner-remoto-scarica', C.remotoPulsante);
  testo('ner-remoto-rifiuta', C.proseguiSenzaNer);
  testo('ner-remoto-rifiuto-nota', C.remotoRifiuto);

  const K = T.caricamento;
  testo('titolo-caricamento', K.titolo);
  testo('caricamento-trascina', K.trascina);
  testo('caricamento-scegli', K.scegli);
  testo('caricamento-formati', K.formati);
  testo('file-scelto-etichetta', K.fileScelto);
  testo('attesa-componenti', K.attesaComponenti);
  testo('scopo-titolo', K.scopoTitolo);
  testo('scopo-spiegazione', K.scopoSpiegazione);
  testo('scopo-ente-etichetta', K.scopoEnte);
  el('scopo-ente').placeholder = K.scopoEnteSegnaposto;
  const opzioni = el('scopo-opzioni');
  svuota(opzioni);
  for (const id of ORDINE_SCOPI) {
    const d = SCOPI[id];
    const input = crea('input', { type: 'radio', name: 'scopo', value: id });
    input.addEventListener('change', () => scegliScopo(id));
    opzioni.append(crea('label', { classe: 'opzione' }, [input, crea('span', {}, [
      crea('strong', { testo: d.etichetta }),
      crea('span', { classe: 'opzione-breve', testo: d.breve }),
      crea('span', { classe: 'opzione-descrizione', testo: d.descrizione }),
    ])]));
  }
  el('scopo-ente').addEventListener('input', () => { stato.ente = el('scopo-ente').value.trim(); });

  testo('titolo-analisi', T.analisi.titolo);
  testo('analisi-interrompi', T.analisi.interrompi);
  testo('analisi-avviso-scansione', T.analisi.avvisoScansione);
  testo('analisi-avviso-risorse-testo', T.analisi.avvisoRisorse);
  testo('analisi-avviso-risorse-prosegui', T.analisi.avvisoRisorseProsegui);

  testo('titolo-revisione', T.revisione.titolo);
  testo('revisione-introduzione', T.revisione.introduzione);
  testo('revisione-avviso-scansione-testo', T.revisione.avvisoScansione);
  testo('revisione-qualita-etichetta', T.revisione.qualitaOcr);
  testo('revisione-ner-assente', T.errori.nerNonDisponibile);
  testo('contatore-c-testo', T.revisione.daDecidere);
  testo('opzioni-avanzate-titolo', T.revisione.opzioniAvanzate);
  testo('strumenti-etichetta', T.revisione.strumenti);
  const RP = T.riepilogo;
  testo('riepilogo-controllare-titolo', RP.controllareTitolo);
  testo('riepilogo-ripristinati-titolo', RP.ripristinatiTitolo);
  testo('riepilogo-nessuno', RP.nessuno);

  const M = T.modalita;
  testo('titolo-modalita', M.titolo);
  testo('modalita-introduzione', M.introduzione);
  testo('modalita-pieno', M.pieno);
  testo('modalita-pieno-descrizione', M.pienoDescrizione);
  testo('modalita-omissis', M.omissis);
  testo('modalita-omissis-descrizione', M.omissisDescrizione);
  testo('modalita-pseudonimo', M.pseudonimo);
  testo('modalita-pseudonimo-descrizione', M.pseudonimoDescrizione);
  testo('modalita-avvertenza', M.pseudonimoAvvertenza);
  testo('iniziali-domanda', M.inizialiDomanda);
  testo('iniziali-risposta', M.inizialiRisposta);
  testo('risoluzione-etichetta', M.risoluzione);
  testo('risoluzione-descrizione', M.risoluzioneDescrizione);
  const ris = el('risoluzione');
  svuota(ris);
  for (const [v, t] of Object.entries(M.risoluzioni)) ris.append(crea('option', { value: v, testo: t, selected: Number(v) === stato.dpi }));

  const D = T.download;
  testo('download-avviso-firma', D.avvisoFirma);
  testo('download-bloccato', '');
  testo('conferma-scansione-testo', D.confermaScansione);
  testo('conferma-scansione-nota', D.confermaScansioneBloccata);
  testo('genera', D.genera);
  testo('generazione-interrompi', T.analisi.interrompi);
  testo('download-riepilogo-titolo', D.riepilogo);
  testo('scarica-documento', D.scaricaDocumento);
  testo('scarica-rapporto', D.scaricaRapporto);
  testo('scarica-immagine', D.scaricaImmagine);
  testo('download-nota', D.nota);
  testo('nuovo-documento', D.nuovo);
}

function impostaPasso(n) {
  // Due passi visibili: caricamento (1) e controllo con download (2 e oltre).
  n = n >= 2 ? 2 : 1;
  for (const li of el('passi').children) {
    const k = Number(li.dataset.passo);
    li.classList.toggle('completato', k < n);
    if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  }
}

function statoComponente(id, classe, messaggio) {
  const e = el(id);
  e.className = 'stato stato--' + classe;
  e.textContent = messaggio;
  // Una sola riga visibile: in preparazione finché un componente non è
  // pronto, in errore se uno ha fallito, nascosta quando tutto è pronto.
  const riga = el('componenti-stato');
  const stati = ['comp-pdf-stato', 'comp-ocr-stato', 'comp-ner-stato'].map((k) => el(k));
  // Il modello assente o rifiutato non è un errore: ha un avviso proprio.
  const errori = stati.filter((x) => x.className.includes('stato--errore') && !(x.id === 'comp-ner-stato' && (stato.ner === 'assente' || stato.ner === 'disattivato')));
  const inCorso = stati.some((x) => x.className.includes('stato--attesa'));
  const C = T.componenti;
  if (errori.length) {
    riga.textContent = C.preparazioneErrore + ' ' + errori.map((x) => x.textContent).join('; ');
    riga.classList.add('errore');
    mostra(riga, true);
  } else if (inCorso) {
    riga.textContent = C.preparazione;
    riga.classList.remove('errore');
    mostra(riga, true);
  } else {
    mostra(riga, false);
  }
}

// Verifica e caricamento dei componenti di riconoscimento.
async function preparaComponenti() {
  const C = T.componenti;
  statoComponente('comp-pdf-stato', 'attesa', C.statoCaricamento);
  try {
    if (!window.PDFLib) throw new Error(C.statoErrore);
    await preparaPdf();
    stato.pdfPronto = true;
    statoComponente('comp-pdf-stato', 'pronto', C.statoPronto);
  } catch {
    statoComponente('comp-pdf-stato', 'errore', C.statoErrore);
    return;
  }

  // OCR: verifica della presenza dei dati di lingua in locale.
  statoComponente('comp-ocr-stato', 'attesa', C.statoVerifica);
  try {
    const r = await fetch(new URL('../vendor/tessdata/ita.traineddata.gz', import.meta.url), { method: 'HEAD' });
    stato.ocr = r.ok && ocrDisponibile() ? 'locale' : 'errore';
  } catch {
    stato.ocr = 'errore';
  }
  if (stato.ocr === 'locale') {
    // Caricamento del motore e dei dati di lingua ora, prima di qualunque
    // documento: durante l'elaborazione non resta nulla da richiedere.
    statoComponente('comp-ocr-stato', 'attesa', C.statoCaricamento);
    try {
      await preparaOcr();
      statoComponente('comp-ocr-stato', 'pronto', C.statoPronto + ' (' + C.statoLocale + ')');
    } catch {
      stato.ocr = 'errore';
      statoComponente('comp-ocr-stato', 'errore', C.statoErrore);
    }
  } else {
    statoComponente('comp-ocr-stato', 'errore', C.statoErrore);
  }

  // NER: il worker verifica il modello in locale; nessuna richiesta esterna.
  statoComponente('comp-ner-stato', 'attesa', C.statoVerifica);
  suEventoNer((ev) => {
    if (ev.tipo === 'progresso') {
      stato.ner = 'caricamento';
      const pct = ev.progresso != null ? ' ' + Math.round(ev.progresso) + '%' : '';
      statoComponente('comp-ner-stato', 'attesa', C.statoCaricamento + (ev.file ? ' ' + C.caricamentoDi + ' ' + ev.file.split('/').pop() + pct : ''));
    } else if (ev.tipo === 'pronto') {
      stato.ner = 'pronto';
      statoComponente('comp-ner-stato', 'pronto', C.statoPronto + ' (' + (ev.origine === 'locale' ? C.statoLocale : 'huggingface.co') + ')');
      mostra(el('ner-remoto'), false);
      aggiornaAvvio();
    } else if (ev.tipo === 'modello-assente') {
      stato.ner = 'assente';
      statoComponente('comp-ner-stato', 'errore', C.statoRemoto);
      mostra(el('ner-remoto'), true);
      aggiornaAvvio();
    } else if (ev.tipo === 'disattivato') {
      stato.ner = 'disattivato';
      statoComponente('comp-ner-stato', 'errore', C.statoRemoto + ' · ' + T.componenti.proseguiSenzaNer.toLowerCase());
      mostra(el('ner-remoto'), false);
      aggiornaAvvio();
    } else if (ev.tipo === 'errore') {
      stato.ner = 'errore';
      statoComponente('comp-ner-stato', 'errore', C.statoErrore);
      mostra(el('ner-errore'), true);
      el('ner-errore').textContent = C.statoErrore + ': ' + ev.messaggio;
      aggiornaAvvio();
    }
  });
  el('ner-remoto-scarica').addEventListener('click', () => {
    // Consenso esplicito dell'utente al download del modello.
    mostra(el('ner-remoto'), false);
    stato.ner = 'caricamento';
    statoComponente('comp-ner-stato', 'attesa', C.statoCaricamento);
    caricaNer({ consentiRemoto: true });
  });
  el('ner-remoto-rifiuta').addEventListener('click', () => disattivaNer());
  caricaNer({ consentiRemoto: false });
}

// ---------------------------------------------------------------------------
// 1. Caricamento
// ---------------------------------------------------------------------------
function preparaCaricamento() {
  const zona = el('zona-caricamento');
  const input = el('file-input');
  zona.addEventListener('click', (ev) => { if (ev.target !== input && !ev.target.closest('label')) input.click(); });
  zona.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); input.click(); } });
  for (const evento of ['dragenter', 'dragover']) {
    zona.addEventListener(evento, (ev) => { ev.preventDefault(); zona.classList.add('trascinamento'); });
  }
  for (const evento of ['dragleave', 'drop']) {
    zona.addEventListener(evento, (ev) => { ev.preventDefault(); zona.classList.remove('trascinamento'); });
  }
  zona.addEventListener('drop', (ev) => {
    const f = ev.dataTransfer?.files?.[0];
    if (f) scegliFile(f);
  });
  input.addEventListener('change', () => { if (input.files[0]) scegliFile(input.files[0]); input.value = ''; });
}

async function scegliFile(file) {
  const K = T.caricamento;
  const errore = el('caricamento-errore');
  mostra(errore, false);
  if (el('zona-caricamento').getAttribute('aria-disabled') === 'true') {
    errore.textContent = stato.inGenerazione ? K.attesaGenerazione : K.attesaComponenti;
    mostra(errore, true);
    return;
  }
  azzeraDocumento();
  const tipo = tipoFile(file);
  if (tipo === 'ufficio' || tipo === 'altro') {
    errore.textContent = tipo === 'ufficio' ? K.formatoUfficio : K.nonPdf;
    mostra(errore, true);
    return;
  }
  const caricamento = ++contatoreCaricamenti;
  let pdf;
  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    if (caricamento !== contatoreCaricamenti) return;
    errore.textContent = K.danneggiato;
    mostra(errore, true);
    return;
  }
  let daImmagine = false;
  try {
    // Busta di firma: si estrae il documento firmato (PDF o immagine).
    if (tipo === 'p7m') {
      bytes = pdfDaP7m(bytes);
      if (!(bytes[0] === 0x25 && bytes[1] === 0x50)) {
        // Non è un PDF: un'immagine firmata?
        const jpg = bytes[0] === 0xff && bytes[1] === 0xd8;
        const png = bytes[0] === 0x89 && bytes[1] === 0x50;
        if (!jpg && !png) throw new Error('p7m-non-pdf');
        bytes = new Uint8Array(await pdfDaImmagine(bytes));
        daImmagine = true;
      }
    } else if (tipo === 'immagine') {
      bytes = new Uint8Array(await pdfDaImmagine(bytes));
      daImmagine = true;
    }
  } catch (e) {
    if (caricamento !== contatoreCaricamenti) return;
    errore.textContent = e instanceof P7mSenzaContenutoError ? K.p7mSenzaContenuto : e?.message === 'p7m-non-pdf' ? K.p7mNonPdf : tipo === 'immagine' ? K.immagineNonLetta : K.danneggiato;
    mostra(errore, true);
    return;
  }
  try {
    pdf = await apriPdf(bytes);
  } catch (e) {
    if (caricamento !== contatoreCaricamenti) return;
    errore.textContent = e instanceof PdfProtettoError ? K.protetto : K.danneggiato;
    mostra(errore, true);
    return;
  }
  // Nel frattempo è stato scelto un altro file: questo risultato è superato.
  if (caricamento !== contatoreCaricamenti) {
    try { pdf.loadingTask?.destroy?.(); } catch { /* ignora */ }
    return;
  }
  stato.file = file;
  stato.documento = { nome: nomeBaseFile(file.name) + '.pdf', nomeOriginale: file.name, dimensione: file.size, pdf, numPagine: pdf.numPages, pagine: [], daScansione: false, daImmagine };
  testo('file-nome', file.name);
  testo('file-dettagli', '(' + formattaByte(file.size) + ', ' + pdf.numPages + ' ' + K.pagine + ')');
  mostra(el('file-scelto'), true);
  // La domanda sullo scopo compare solo ora, dopo il file.
  mostra(el('scopo'), true);
  aggiornaAvvio();
}

// Frazione dell'area di `a` coperta da `b` (rettangoli nello spazio utente).
function sovrapposizione(a, b) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (x * y) / Math.max(1e-6, a.w * a.h);
}

// Frazione della pagina coperta dall'unione delle immagini (una scansione
// può essere composta da più immagini affiancate). Calcolo su una griglia.
function coperturaImmagini(immagini, vista) {
  if (!immagini.length) return 0;
  const N = 40;
  const celle = new Uint8Array(N * N);
  const ox = vista.origineX || 0, oy = vista.origineY || 0;
  for (const im of immagini) {
    const x0 = Math.max(0, Math.floor(((im.x - ox) / vista.larghezza) * N)), x1 = Math.min(N, Math.ceil(((im.x - ox + im.w) / vista.larghezza) * N));
    const y0 = Math.max(0, Math.floor(((im.y - oy) / vista.altezza) * N)), y1 = Math.min(N, Math.ceil(((im.y - oy + im.h) / vista.altezza) * N));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) celle[y * N + x] = 1;
  }
  let n = 0;
  for (const c of celle) n += c;
  return n / (N * N);
}

// Scelta dello scopo del trattamento, una volta per documento.
function scegliScopo(id) {
  stato.scopo = id;
  mostra(el('scopo-ente-campo'), id === 'pubblica');
  // Copertura predefinita: [OMISSIS] per le pubblicazioni obbligatorie
  // (convenzione degli atti, frase leggibile), pieno per gli altri usi.
  impostaModalita(id === 'pubblica' ? 'omissis' : 'pieno');
  aggiornaAvvio();
}

function impostaModalita(m) {
  stato.modalita = m;
  for (const r of document.querySelectorAll('input[name="modalita"]')) r.checked = r.value === m;
  aggiornaAvvertenzaPseudonimo();
}

function bloccaScopo(blocco) {
  for (const r of document.querySelectorAll('input[name="scopo"]')) r.disabled = blocco;
  el('scopo-ente').disabled = blocco;
}

function scopoScelto() {
  return !!stato.scopo;
}

function aggiornaAvvio() {
  bloccaCaricamento(false);
  const pronto = ['pronto', 'disattivato', 'errore'].includes(stato.ner) && stato.ner !== 'assente';
  const scopo = scopoScelto();
  const attesa = el('attesa-componenti');
  if (stato.documento && !pronto) { attesa.textContent = T.caricamento.attesaComponenti; mostra(attesa, true); }
  else if (stato.documento && !scopo) { attesa.textContent = T.caricamento.scopoObbligatorio; mostra(attesa, true); }
  else mostra(attesa, false);
  // L'analisi parte da sola appena documento, scopo e componenti ci sono.
  if (stato.documento && scopo && pronto && !stato.inAnalisi && !stato.analisiAvviata) {
    stato.analisiAvviata = true;
    avviaAnalisi();
  }
}

// ---------------------------------------------------------------------------
// 2. Analisi
// ---------------------------------------------------------------------------
function avanzamentoAnalisi(fase, pagina, totale, residuoSecondi = null) {
  testo('analisi-fase', fase);
  const A = T.analisi;
  const residuo = residuoSecondi == null ? '' : ' · ' + (residuoSecondi >= 90 ? A.residuoMinuti.replace('{n}', String(Math.ceil(residuoSecondi / 60))) : A.residuoSecondi.replace('{n}', String(Math.max(5, Math.round(residuoSecondi / 5) * 5))));
  testo('analisi-pagina', pagina ? A.pagina + ' ' + pagina + ' ' + A.di + ' ' + totale + residuo : '');
  const barra = el('analisi-barra');
  if (pagina && totale) {
    barra.classList.remove('indeterminata');
    barra.style.width = Math.round((pagina / totale) * 100) + '%';
  } else {
    barra.classList.add('indeterminata');
  }
}

async function avviaAnalisi() {
  if (!stato.documento || stato.inAnalisi) return;
  stato.inAnalisi = true;
  stato.controller = new AbortController();
  const segnale = stato.controller.signal;
  aggiornaAvvio();
  // Lo scopo qualifica il documento: dopo l'avvio non cambia più (per
  // cambiarlo si ricarica il documento).
  bloccaScopo(true);
  impostaPasso(2);
  const sezione = el('sezione-analisi');
  mostra(sezione, true);
  mostra(el('analisi-errore'), false);
  mostra(el('analisi-avviso-scansione'), false);
  mostra(el('analisi-avviso-risorse'), false);
  mostra(el('sezione-revisione'), false);
  mostra(el('sezione-modalita'), false);
  mostra(el('sezione-download'), false);
  sezione.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el('analisi-interrompi').onclick = () => stato.controller?.abort();

  const doc = stato.documento;
  const F = T.analisi.fasi;
  const controlla = () => { if (segnale.aborted) throw new Error('interrotto'); };
  try {
    // Estrazione del testo nativo.
    const grezze = [];
    for (let i = 1; i <= doc.numPagine; i++) {
      controlla();
      avanzamentoAnalisi(F.estrazione, i, doc.numPagine);
      const paginaPdf = await doc.pdf.getPage(i);
      const vista = vistaPagina(paginaPdf);
      const segmenti = await estraiSegmenti(paginaPdf);
      const immagini = await estraiImmagini(paginaPdf, vista).catch(() => []);
      // Pagina raster: un'immagine copre quasi tutta la pagina. È una
      // scansione anche se ha un livello testuale (OCR eseguito altrove): la
      // revisione a schermo resta obbligatoria e le firme non sono
      // distinguibili dall'immagine.
      const copertura = coperturaImmagini(immagini, vista);
      const raster = copertura >= IMMAGINI.areaPaginaIntera;
      // Pagina mista: testo nativo più un'immagine estesa (più grande di una
      // firma), che può contenere testo scansionato. L'immagine viene letta
      // con il riconoscimento ottico e la pagina trattata come scansione.
      // Anche una pagina raster con livello testuale preesistente viene letta
      // con il riconoscimento ottico: il livello potrebbe non coprire tutto.
      const mista = immagini.some((im) => im.frazioneArea > IMMAGINI.areaMassima) && !richiedeOcr(segmenti);
      // Anche una pagina raster con un livello testuale preesistente (OCR di
      // un altro programma, spesso incompleto) viene riletta.
      const ocr = richiedeOcr(segmenti) || mista || raster;
      grezze.push({ indice: i - 1, paginaPdf, vista, segmenti, immagini, ocr, raster, mista });
    }

    // Riconoscimento ottico dove serve.
    const daOcr = grezze.filter((g) => g.ocr);
    if (daOcr.length) {
      mostra(el('analisi-avviso-scansione'), true);
      if (stato.ocr !== 'locale') throw new Error(T.errori.ocrNonDisponibile);
      // Avviso preventivo sulle risorse (specifica, § 8).
      const memoria = navigator.deviceMemory || 4;
      if (daOcr.length > 15 || memoria < 4) {
        await new Promise((ok, no) => {
          mostra(el('analisi-avviso-risorse'), true);
          el('analisi-avviso-risorse-prosegui').onclick = () => { mostra(el('analisi-avviso-risorse'), false); ok(); };
          segnale.addEventListener('abort', () => no(new Error('interrotto')), { once: true });
        });
      }
      avanzamentoAnalisi(F.ocr, null, null);
      await preparaOcr((p) => {
        if (p.stato && p.stato !== 'pagina') testo('analisi-pagina', p.stato + (p.progresso != null ? ' ' + Math.round(p.progresso * 100) + '%' : ''));
      });
      let n = 0;
      const inizioOcr = Date.now();
      for (const g of daOcr) {
        controlla();
        n++;
        // Stima del tempo residuo dal ritmo delle pagine già lette.
        const residuo = n > 1 ? Math.round((Date.now() - inizioOcr) / (n - 1) * (daOcr.length - n + 1) / 1000) : null;
        avanzamentoAnalisi(F.ocr, n, daOcr.length, residuo);
        const esito = await riconosciPagina(g.paginaPdf, () => {}, segnale);
        // Nelle pagine miste il testo OCR si aggiunge a quello nativo, senza
        // duplicare le parole già presenti nel livello testuale.
        g.segmenti = g.mista ? [...g.segmenti, ...esito.segmenti.filter((seg) => !g.segmenti.some((n) => sovrapposizione(seg, n) > 0.5))] : esito.segmenti;
        g.confidenza = esito.confidenza;
        // Le immagini decodificate della pagina non servono più fino alla
        // revisione: si libera la memoria di pdf.js.
        try { g.paginaPdf.cleanup(); } catch { /* ignora */ }
      }
    }

    // Immagini (per le pagine native) e composizione delle pagine.
    doc.pagine = [];
    for (const g of grezze) {
      controlla();
      avanzamentoAnalisi(F.immagini, g.indice + 1, doc.numPagine);
      const scansione = g.ocr || g.raster;
      // Per le scansioni: ricerca di regioni con le proporzioni di una tessera.
      const forma = scansione ? await analizzaFormaScansione(g.paginaPdf).catch(() => ({ tessere: [] })) : { tessere: [] };
      doc.pagine.push(componiPagina(g.indice, g.vista, g.segmenti, {
        daScansione: scansione,
        // Le pagine miste conservano il testo nativo: va riordinato.
        riordina: !g.ocr || g.mista,
        // Livello testuale preesistente su pagina raster: nessuna confidenza propria.
        confidenzaOcr: g.confidenza ?? null,
        immagini: scansione ? [] : g.immagini,
        tessere: forma.tessere,
      }));
    }
    doc.daScansione = doc.pagine.some((p) => p.daScansione);

    // Regole e riconoscimento dei nomi.
    stato.rilievi = await rilevaDati(doc, {
      segnale,
      scopo: stato.scopo,
      avanzamento: (fase, pagina) => avanzamentoAnalisi(F[fase] || fase, pagina, doc.numPagine),
    });
    avanzamentoAnalisi(F.completata, null, null);
    el('analisi-barra').classList.remove('indeterminata');
    el('analisi-barra').style.width = '100%';
    stato.inAnalisi = false;
    await mostraRevisione();
  } catch (e) {
    stato.inAnalisi = false;
    aggiornaAvvio();
    el('analisi-barra').classList.remove('indeterminata');
    const interrotto = e?.message === 'interrotto';
    avanzamentoAnalisi(interrotto ? F.interrotta : T.analisi.errore, null, null);
    if (!interrotto) {
      console.error(e);
      el('analisi-errore').textContent = T.analisi.errore + ': ' + (e?.message || T.errori.generico);
      mostra(el('analisi-errore'), true);
    } else {
      annullaNer();
      // La preparazione di un nuovo motore precede sempre il prossimo file.
      azzeraDocumento();
      stato.ner = 'verifica';
      bloccaCaricamento(true);
      await chiudiOcr();
      try { await preparaOcr(); stato.ocr = 'locale'; }
      catch { stato.ocr = 'errore'; }
      caricaNer({ consentiRemoto: false });
    }
    bloccaScopo(false);
    impostaPasso(1);
  }
}

// ---------------------------------------------------------------------------
// 3. Revisione
// ---------------------------------------------------------------------------
async function mostraRevisione() {
  const doc = stato.documento;
  mostra(el('sezione-revisione'), true);
  mostra(el('sezione-modalita'), true);
  mostra(el('sezione-download'), true);
  mostra(el('revisione-ner-assente'), !nerPronto());
  mostra(el('revisione-avviso-scansione'), doc.daScansione);
  mostra(el('download-scansione'), doc.daScansione);
  if (doc.daScansione) {
    const conf = doc.pagine.filter((p) => p.daScansione && p.confidenzaOcr != null).map((p) => p.confidenzaOcr);
    const media = conf.length ? conf.reduce((a, b) => a + b, 0) / conf.length : null;
    testo('revisione-qualita', descriviQualitaOcr(media)?.testo || '—');
  }
  el('conferma-scansione').checked = false;
  stato.filtro = 'tutti';
  el('filtro-fascia').value = 'tutti';
  if (!revisione) revisione = new Revisione(stato, suCambioRevisione);
  revisione.attivaDettagli(false);
  el('opzioni-avanzate').open = false;
  await revisione.costruisci();
  aggiornaRiepilogo();
  aggiornaDownload();
  impostaPasso(3);
  el('sezione-revisione').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function aggiornaAvvertenzaPseudonimo() {
  const attiva = stato.modalita === 'pseudonimo' || stato.rilievi.some((r) => r.modalita === 'pseudonimo' && r.decisione === 'oscura');
  mostra(el('modalita-avvertenza'), attiva);
}

function suCambioRevisione(tipo) {
  if (tipo === 'decisione' || tipo === 'modalita') invalidaRisultato();
  aggiornaAvvertenzaPseudonimo();
  aggiornaRiepilogo();
  aggiornaDownload();
}

// Riepilogo in linguaggio piano: i dati oscurati sono un numero; ciò che
// resta in chiaro per legge e ciò che è da controllare sono elencati, con
// il motivo e un pulsante per cambiare idea.
function aggiornaRiepilogo() {
  const RP = T.riepilogo;
  const ril = stato.rilievi;
  const oscurati = ril.filter((r) => r.decisione === 'oscura').length;
  testo('riepilogo-oscurati-numero', String(oscurati));
  testo('riepilogo-oscurati-testo', oscurati === 1 ? RP.oscurato : RP.oscurati);
  const voce = (r, azioni) => {
    const cat = CATEGORIE[r.categoria];
    const titolo = crea('button', { type: 'button', testo: r.testo ? r.testo.replace(/\s+/g, ' ').slice(0, 80) : cat.etichetta, onclick: () => revisione?.vaiAllaPagina(r) });
    const testata = crea('p', { classe: 'voce-testo' }, [titolo, crea('span', { classe: 'voce-tipo', testo: cat.etichetta + ' · ' + RP.pagina + ' ' + r.pagina })]);
    const dettagli = crea('div', {}, [testata]);
    if (r.motivoProposta || r.nota) dettagli.append(crea('p', { classe: 'voce-motivo', testo: r.motivoProposta || r.nota }));
    const az = crea('div', { classe: 'azioni' });
    for (const [etichetta, fn, principale] of azioni) az.append(crea('button', { type: 'button', classe: 'pulsante pulsante--piccolo' + (principale ? '' : ' pulsante--secondario'), testo: etichetta, onclick: fn, disabled: stato.inGenerazione }));
    return crea('li', {}, [dettagli, az]);
  };
  const riempi = (id, elenco, azioni) => {
    const ul = el(id);
    svuota(ul);
    for (const r of elenco) ul.append(voce(r, azioni(r)));
  };
  // La partita IVA di una società non è un dato personale: sta con i dati istituzionali.
  // "Per legge" solo ciò che lo strumento ha proposto; ciò che l'utente ha
  // ripristinato di sua iniziativa sta in un elenco proprio.
  const chiaro = ril.filter((r) => r.fascia === 'C' && r.decisione === 'mantieni' && r.chiaveProposta !== 'C6_societa' && !r.modificato);
  const ripristinati = ril.filter((r) => r.decisione === 'mantieni' && r.modificato && r.fascia !== 'P');
  riempi('elenco-ripristinati', ripristinati, (r) => [[RP.oscura, () => revisione?.decidi(r, 'oscura'), false]]);
  mostra(el('riepilogo-ripristinati'), ripristinati.length > 0);
  const privato = stato.scopo === 'privato';
  testo('riepilogo-chiaro-titolo', privato ? RP.chiaroTitoloPrivato : RP.chiaroTitolo);
  testo('riepilogo-chiaro-nota', privato ? RP.chiaroNotaPrivato : RP.chiaroNota);
  riempi('elenco-chiaro', chiaro, (r) => [[RP.oscura, () => revisione?.decidi(r, 'oscura'), false]]);
  mostra(el('riepilogo-chiaro'), chiaro.length > 0);
  const controllare = daDecidere(ril);
  riempi('elenco-controllare', controllare, (r) => [
    [r.azione === 'espungi' || r.categoria === 'C7' ? RP.oscuraPagina : RP.oscura, () => revisione?.decidi(r, 'oscura'), false],
    [RP.lascia, () => revisione?.decidi(r, 'mantieni'), false],
  ]);
  mostra(el('riepilogo-controllare'), controllare.length > 0);
  const istituzionali = ril.filter((r) => r.decisione === 'mantieni' && (r.fascia === 'P' || r.chiaveProposta === 'C6_societa'));
  testo('riepilogo-istituzionali-titolo', istituzionali.length + ' ' + (istituzionali.length === 1 ? RP.istituzionale : RP.istituzionali));
  riempi('elenco-istituzionali', istituzionali, (r) => [[RP.oscura, () => revisione?.decidi(r, 'oscura'), false]]);
  mostra(el('riepilogo-istituzionali'), istituzionali.length > 0);
  mostra(el('riepilogo-nessuno'), chiaro.length === 0 && controllare.length === 0 && ripristinati.length === 0);
  aggiornaContatore();
}

function aggiornaContatore() {
  const n = daDecidere(stato.rilievi).length;
  const c = el('contatore-c');
  testo('contatore-c-numero', String(n));
  testo('contatore-c-testo', n === 0 ? T.revisione.tuttiDecisi : T.revisione.daDecidere);
  c.classList.toggle('zero', n === 0);
  const m = daConfermare(stato.rilievi).length;
  const cp = el('contatore-proposte');
  testo('contatore-proposte-numero', String(m));
  testo('contatore-proposte-testo', m === 0 ? T.revisione.proposteConfermate : T.revisione.proposteDaConfermare);
  cp.classList.toggle('zero', m === 0);
  el('conferma-proposte').disabled = m === 0;
}

// ---------------------------------------------------------------------------
// 4. Modalità
// ---------------------------------------------------------------------------
function preparaModalita() {
  for (const radio of document.querySelectorAll('input[name="modalita"]')) {
    radio.addEventListener('change', () => {
      stato.modalita = radio.value;
      aggiornaAvvertenzaPseudonimo();
      invalidaRisultato();
      revisione?.aggiornaPannello();
    });
  }
  el('risoluzione').addEventListener('change', () => { stato.dpi = Number(el('risoluzione').value); invalidaRisultato(); });
}

// ---------------------------------------------------------------------------
// 5. Download
// ---------------------------------------------------------------------------
function preparaDownload() {
  el('conferma-scansione').addEventListener('change', () => {
    // Senza la conferma della revisione non resta disponibile alcun download.
    if (!el('conferma-scansione').checked) invalidaRisultato();
    aggiornaDownload();
  });
  // "Confermo e scarico": conferma in blocco le proposte ancora aperte (la
  // decisione è dell'utente, con un solo gesto) e genera il documento.
  el('genera').addEventListener('click', () => {
    if (daConfermare(stato.rilievi).length) revisione?.confermaTutteLeProposte();
    genera();
  });
  el('nuovo-documento').addEventListener('click', () => {
    if (window.confirm(T.download.nuovoConferma)) nuovoDocumento();
  });
}

function requisitiDownload({ conProposte = false } = {}) {
  const doc = stato.documento;
  if (!doc) return { ok: false, motivo: '' };
  if (!scopoScelto()) return { ok: false, motivo: T.caricamento.scopoObbligatorio };
  const pendenti = daDecidere(stato.rilievi).length;
  if (pendenti > 0) return { ok: false, motivo: T.download.bloccatoC };
  // Le proposte dello strumento vanno confermate (anche in blocco) prima
  // del download: la decisione resta dell'utente. Il pulsante "Confermo e
  // scarico" le conferma con lo stesso gesto.
  if (!conProposte && daConfermare(stato.rilievi).length > 0) return { ok: false, motivo: T.download.bloccatoProposte };
  if (doc.daScansione) {
    // Revisione obbligatoria e non saltabile per le scansioni.
    const tutteViste = doc.pagine.every((p) => stato.pagineViste.has(p.numero));
    if (!tutteViste) return { ok: false, motivo: T.download.confermaScansioneBloccata };
    if (!el('conferma-scansione').checked) return { ok: false, motivo: T.download.confermaScansione };
  }
  return { ok: true, motivo: '' };
}

function aggiornaDownload() {
  const doc = stato.documento;
  if (!doc) return;
  const req = requisitiDownload({ conProposte: true });
  const tutteViste = doc.pagine.every((p) => stato.pagineViste.has(p.numero));
  el('conferma-scansione').disabled = !tutteViste;
  mostra(el('conferma-scansione-nota'), !tutteViste);
  el('genera').disabled = !req.ok || stato.inGenerazione;
  el('genera').textContent = stato.risultato ? T.download.rigenera : T.download.genera;
  mostra(el('download-bloccato'), !req.ok && !!req.motivo);
  el('download-bloccato').textContent = req.motivo;
  impostaPasso(2);
}

function invalidaRisultato() {
  if (!stato.risultato) return;
  URL.revokeObjectURL(stato.risultato.documentoUrl);
  URL.revokeObjectURL(stato.risultato.rapportoUrl);
  if (stato.risultato.immagineUrl) URL.revokeObjectURL(stato.risultato.immagineUrl);
  mostra(el('scarica-immagine'), false);
  stato.risultato = null;
  mostra(el('download-pronto'), false);
}

function nomeBase() {
  return stato.documento.nome.replace(/\.pdf$/i, '');
}

async function genera() {
  const req = requisitiDownload();
  if (!req.ok || stato.inGenerazione) return;
  stato.inGenerazione = true;
  stato.controllerGenerazione = new AbortController();
  invalidaRisultato();
  mostra(el('download-errore'), false);
  mostra(el('generazione'), true);
  el('genera').disabled = true;
  el('generazione-interrompi').onclick = () => stato.controllerGenerazione?.abort();
  bloccaCaricamento(true);
  for (const r of document.querySelectorAll('input[name="modalita"]')) r.disabled = true;
  el('risoluzione').disabled = true;
  const D = T.download;
  // Istantanea di documento, rilievi e nome: un nuovo caricamento durante la
  // generazione non deve mescolare due documenti.
  const documento = stato.documento;
  // Copia profonda: le decisioni prese durante la generazione non devono
  // riflettersi nel rapporto di un documento già in corso di scrittura.
  const rilievi = structuredClone(stato.rilievi);
  revisione?.bloccaDecisioni(true);
  const nome = nomeBase();
  const modalita = stato.modalita;
  const dpi = stato.dpi;
  const scopo = stato.scopo;
  const ente = stato.ente;
  try {
    const dataOra = new Date();
    const { bytes, statistiche, immagini } = await generaDocumento(documento, rilievi, {
      modalita,
      dpi,
      raccogliImmagini: !!documento.daImmagine,
      segnale: stato.controllerGenerazione.signal,
      avanzamento: (p, n) => {
        testo('generazione-testo', D.generazione + ' ' + D.generazionePagina + ' ' + p + ' ' + T.analisi.di + ' ' + n);
        el('generazione-barra').style.width = Math.round((p / n) * 100) + '%';
      },
    });
    const rapporto = await generaRapporto({ documento, rilievi, modalita, dpi, statistiche, dataOra, scopo, ente, esiti: statistiche.esiti });
    if (stato.documento !== documento) throw new Error('interrotto');
    const documentoUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const rapportoUrl = URL.createObjectURL(new Blob([rapporto], { type: 'application/pdf' }));
    // I byte restano in memoria solo in modalità diagnostica (#debug).
    stato.risultato = { documentoUrl, rapportoUrl, statistiche, ...(location.hash === '#debug' ? { bytes, rapporto } : {}) };
    const a = el('scarica-documento');
    a.href = documentoUrl;
    a.download = nome + D.suffissoDocumento + '.pdf';
    const b = el('scarica-rapporto');
    b.href = rapportoUrl;
    b.download = nome + D.suffissoRapporto + '.pdf';
    // Chi ha caricato un'immagine può riscaricare un'immagine.
    const c = el('scarica-immagine');
    if (immagini && immagini.length === 1 && statistiche.pagineEspunte.length === 0) {
      c.href = URL.createObjectURL(immagini[0]);
      c.download = nome + D.suffissoDocumento + '.jpg';
      stato.risultato && (stato.risultato.immagineUrl = c.href);
      mostra(c, true);
    } else {
      mostra(c, false);
    }
    const riepilogo = el('download-riepilogo');
    svuota(riepilogo);
    const oscurati = rilievi.filter((r) => r.decisione === 'oscura' && r.azione !== 'espungi').length;
    const mantenuti = rilievi.filter((r) => r.decisione === 'mantieni').length;
    riepilogo.append(crea('li', { testo: oscurati + ' ' + D.oscurati }));
    riepilogo.append(crea('li', { testo: mantenuti + ' ' + D.mantenuti }));
    if (statistiche.pagineEspunte.length) riepilogo.append(crea('li', { testo: statistiche.pagineEspunte.length + ' ' + D.espunte + ' (' + statistiche.pagineEspunte.join(', ') + ')' }));
    riepilogo.append(crea('li', { testo: formattaByte(bytes.length) + ' · ' + dpi + ' dpi · ' + (modalita === 'pieno' ? T.modalita.pieno : modalita === 'omissis' ? T.modalita.omissis : T.modalita.pseudonimo) }));
    mostra(el('download-pronto'), true);
    impostaPasso(2);
    el('download-pronto').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) {
    if (e?.message !== 'interrotto') {
      console.error(e);
      el('download-errore').textContent = D.errore + ': ' + (e?.message || T.errori.generico);
      mostra(el('download-errore'), true);
    }
  } finally {
    stato.inGenerazione = false;
    stato.controllerGenerazione = null;
    revisione?.bloccaDecisioni(false);
    for (const r of document.querySelectorAll('input[name="modalita"]')) r.disabled = false;
    el('risoluzione').disabled = false;
    bloccaCaricamento(false);
    mostra(el('generazione'), false);
    if (stato.documento === documento) aggiornaDownload();
  }
}

// Blocca la scelta di un nuovo file mentre la generazione è in corso, o
// finché i componenti di riconoscimento non sono pronti o esplicitamente
// rifiutati (il download del modello deve precedere il caricamento).
function bloccaCaricamento(blocco) {
  const zona = el('zona-caricamento');
  const componentiPronti = ['pronto', 'disattivato', 'errore'].includes(stato.ner);
  const bloccata = blocco || stato.inGenerazione || !stato.pdfPronto || !componentiPronti;
  zona.setAttribute('aria-disabled', bloccata ? 'true' : 'false');
  el('file-input').disabled = bloccata;
}

// ---------------------------------------------------------------------------
// Azzeramento
// ---------------------------------------------------------------------------
function azzeraDocumento() {
  invalidaRisultato();
  stato.controller?.abort();
  // Una generazione in corso non deve sopravvivere al documento.
  stato.controllerGenerazione?.abort();
  if (stato.documento?.pdf) {
    const pdf = stato.documento.pdf;
    try { (pdf.loadingTask?.destroy ? pdf.loadingTask.destroy() : pdf.destroy?.())?.catch?.(() => {}); } catch { /* ignora */ }
  }
  revisione?.distruggi();
  stato.file = null;
  stato.documento = null;
  stato.rilievi = [];
  stato.attivo = null;
  stato.pagineViste = new Set();
  stato.selezioneManuale = false;
  stato.scopo = null;
  stato.ente = '';
  stato.analisiAvviata = false;
  stato.modalita = 'pieno';
  stato.dpi = 200;
  stato.filtro = 'tutti';
  for (const r of document.querySelectorAll('input[name="modalita"]')) r.checked = r.value === 'pieno';
  el('risoluzione').value = '200';
  el('filtro-fascia').value = 'tutti';
  mostra(el('modalita-avvertenza'), false);
  revisione?.attivaSelezione(false);
  revisione?.attivaDettagli(false);
  for (const r of document.querySelectorAll('input[name="scopo"]')) r.checked = false;
  el('scopo-ente').value = '';
  bloccaScopo(false);
  mostra(el('scopo-ente-campo'), false);
  mostra(el('scopo'), false);
  mostra(el('scarica-immagine'), false);
  mostra(el('file-scelto'), false);
  mostra(el('sezione-analisi'), false);
  mostra(el('sezione-revisione'), false);
  mostra(el('sezione-modalita'), false);
  mostra(el('sezione-download'), false);
  svuota(el('elenco-pagine'));
  svuota(el('elenco-rilievi'));
  impostaPasso(1);
}

function nuovoDocumento() {
  azzeraDocumento();
  el('zona-caricamento').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------------------------------------------------------------------------
riempiTesti();
impostaPasso(1);
bloccaCaricamento(true);
// Accesso allo stato per la diagnostica, solo se la pagina è aperta con #debug.
if (location.hash === '#debug') window.__oscuramento = { stato, revisione: () => revisione };
preparaCaricamento();
preparaModalita();
preparaDownload();
// I componenti (OCR, modello dei nomi) vengono preparati al primo gesto
// sulla pagina, non all'apertura: la pagina resta leggera per chi la legge
// e per i motori di ricerca; il download del modello precede comunque
// qualunque documento, perché il caricamento resta bloccato fino a quel
// momento.
{
  let avviati = false;
  const avvia = () => {
    if (avviati) return;
    avviati = true;
    for (const ev of ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll']) document.removeEventListener(ev, avvia, true);
    preparaComponenti();
  };
  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll']) document.addEventListener(ev, avvia, { capture: true, passive: true });
  if (location.hash === '#debug') avvia();
}
