// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Produzione del documento trattato con pdf-lib.
//
// Ogni pagina viene ricostruita come immagine, con i rettangoli di
// oscuramento già impressi nei pixel, e sopra di essa viene scritto un livello
// testuale invisibile che contiene SOLO il testo rimasto in chiaro. Il testo
// oscurato non esiste più nel file: non è coperto, è rimosso (regola di
// prodotto: l'oscuramento deve rimuovere il testo dal livello testuale).
// Il documento risultante è un file nuovo, privo dei metadati dell'originale.

import { rendiPagina, boxVersoViewport } from './estrazione.js';
import { sottoBox, frazioniCaratteri } from './testo.js';
import { CATEGORIE } from './regole/regole.js';
import { T } from './stringhe.js';

const PAD_PT = 1.2; // margine dei rettangoli, in punti

export function etichettaPer(rilievo, modalita) {
  const m = rilievo.modalita || modalita;
  if (m === 'pieno') return null;
  if (m === 'pseudonimo' && CATEGORIE[rilievo.categoria].nominativo && rilievo.soggetto) {
    return '[SOGGETTO ' + rilievo.soggetto + ']';
  }
  return '[OMISSIS]';
}

// Vero se il rettangolo di oscuramento `b` copre il rettangolo `t` oltre la
// tolleranza dovuta al margine dei rettangoli (in punti).
// Semplice intersezione geometrica (senza tolleranze): filtro preliminare.
function intersecaBox(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function copertaDa(t, b, tolleranza = 1.5) {
  const sovrX = Math.min(t.x + t.w, b.x + b.w) - Math.max(t.x, b.x);
  const sovrY = Math.min(t.y + t.h, b.y + b.h) - Math.max(t.y, b.y);
  if (sovrX <= 0 || sovrY <= 0) return false;
  // La tolleranza non può mai superare metà del rettangolo di testo: un
  // frammento interamente dentro un oscuramento è sempre coperto.
  return sovrX > Math.min(tolleranza, t.w / 2) && sovrY > Math.min(tolleranza, t.h * 0.3);
}

// Disegna un rettangolo di oscuramento sul canvas, con eventuale etichetta.
function disegnaOscuramento(ctx, rett, etichetta, scala) {
  const pad = PAD_PT * scala;
  const x = rett.left - pad, y = rett.top - pad, w = rett.width + 2 * pad, h = rett.height + 2 * pad;
  if (!etichetta) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, w, h);
    return false;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = Math.max(1, 0.6 * scala);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  // Etichetta centrata, ridotta finché entra nel rettangolo.
  let corpo = Math.min(h * 0.62, 11 * scala);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1a1a';
  for (;;) {
    ctx.font = 'bold ' + corpo.toFixed(1) + 'px Arial, Helvetica, sans-serif';
    if (ctx.measureText(etichetta).width <= w - 4 * scala || corpo <= 4.5 * scala) break;
    corpo *= 0.9;
  }
  if (ctx.measureText(etichetta).width <= w - 2 * scala) {
    ctx.fillText(etichetta, x + w / 2, y + h / 2);
    return true;
  }
  // Non c'è spazio per l'etichetta: rettangolo pieno.
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, w, h);
  return false;
}

// Filtra i caratteri non rappresentabili con il carattere standard del PDF.
function preparaSanificatore(font) {
  const ammessi = new Set(font.getCharacterSet());
  return (s) => {
    let out = '';
    for (const c of s) {
      const cp = c.codePointAt(0);
      if (ammessi.has(cp)) out += c;
      else if (/\s/.test(c)) out += ' ';
    }
    return out;
  };
}

// Porzioni di un segmento rimaste in chiaro, come intervalli [a, b) di
// caratteri, dopo aver sottratto gli intervalli di testo oscurati.
function porzioniInChiaro(seg, inizioSeg, intervalli) {
  const len = seg.str.length;
  let pezzi = [[0, len]];
  for (const [a, b] of intervalli) {
    const la = a - inizioSeg, lb = b - inizioSeg;
    if (lb <= 0 || la >= len) continue;
    const nuovi = [];
    for (const [p, q] of pezzi) {
      if (lb <= p || la >= q) { nuovi.push([p, q]); continue; }
      if (la > p) nuovi.push([p, la]);
      if (lb < q) nuovi.push([lb, q]);
    }
    pezzi = nuovi;
  }
  return pezzi.filter(([p, q]) => seg.str.slice(p, q).trim().length > 0);
}

// Genera il documento trattato. Restituisce {bytes, statistiche}.
export async function generaDocumento(documento, rilievi, { modalita = 'pieno', dpi = 200, avanzamento = () => {}, segnale, raccogliImmagini = false } = {}) {
  const immagini = [];
  const {
    PDFDocument, StandardFonts, PDFName, beginText, endText, setFontAndSize, setTextRenderingMode,
    TextRenderingMode, setTextMatrix, showText,
  } = window.PDFLib;
  const scala = dpi / 72;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sanifica = preparaSanificatore(font);
  const nomeFont = 'FTesto';

  // Metadati ripuliti: nessuna traccia dell'autore o del software d'origine.
  const adesso = new Date();
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer(T.nomeApp);
  pdfDoc.setCreator(T.nomeApp);
  pdfDoc.setCreationDate(adesso);
  pdfDoc.setModificationDate(adesso);

  // Esiti effettivi per rilievo: {id → {esito, modalita, note}}; il rapporto
  // li riporta accanto alle decisioni.
  const statistiche = { pagineEmesse: 0, pagineEspunte: [], oscuramenti: 0, esiti: {} };
  const applicati = rilievi.filter((r) => r.decisione === 'oscura');
  const espunte = new Set(applicati.filter((r) => r.azione === 'espungi').map((r) => r.pagina));

  for (const pagina of documento.pagine) {
    if (segnale?.aborted) throw new Error('interrotto');
    avanzamento(pagina.numero, documento.pagine.length);
    if (espunte.has(pagina.numero)) {
      statistiche.pagineEspunte.push(pagina.numero);
      for (const r of rilievi) if (r.pagina === pagina.numero) statistiche.esiti[r.id] = { esito: 'espunto', modalita: null, note: 'pagina espunta' };
      continue;
    }
    const paginaPdf = await documento.pdf.getPage(pagina.numero);
    const { canvas, viewport } = await rendiPagina(paginaPdf, scala);
    const ctx = canvas.getContext('2d');

    // Rettangoli da oscurare su questa pagina, nello spazio utente (con
    // margine) e nel viewport.
    const daOscurare = applicati.filter((r) => r.pagina === pagina.numero && r.azione !== 'espungi');
    const boxUtente = [];
    const intervalli = [];
    for (const r of daOscurare) {
      const etichetta = etichettaPer(r, modalita);
      // Selezioni manuali discontinue: solo gli intervalli effettivamente
      // selezionati, non tutto ciò che sta fra il primo e l'ultimo.
      if (r.intervalli) intervalli.push(...r.intervalli);
      else if (r.inizio != null) intervalli.push([r.inizio, r.fine]);
      // Se il rilievo tocca un campo compilabile, l'oscuramento copre
      // l'intero campo: la posizione del valore nel campo non è nota.
      const boxRilievo = r.box.slice();
      if (r.inizio != null) {
        for (let i = 0; i < pagina.segmenti.length; i++) {
          const seg = pagina.segmenti[i];
          const a = pagina.inizi[i], z = a + seg.str.length;
          if (seg.campoIntero && r.inizio < z && r.fine > a) boxRilievo.push({ ...(seg.campo || sottoBox(seg, 0, 1)) });
        }
      }
      let etichettaScritta = !etichetta;
      for (const b of boxRilievo) {
        boxUtente.push({ x: b.x - PAD_PT, y: b.y - PAD_PT, w: b.w + 2 * PAD_PT, h: b.h + 2 * PAD_PT, etichetta });
        if (disegnaOscuramento(ctx, boxVersoViewport(b, viewport), etichetta, scala)) etichettaScritta = true;
        statistiche.oscuramenti++;
      }
      statistiche.esiti[r.id] = {
        esito: 'oscurato',
        modalita: etichetta ? (etichettaScritta ? (etichetta.startsWith('[SOGGETTO') ? 'pseudonimo' : 'omissis') : 'pieno') : 'pieno',
        note: etichetta && !etichettaScritta ? 'etichetta non leggibile nello spazio disponibile: rettangolo pieno' : '',
      };
    }

    // Rilievi mantenuti in chiaro ma coperti, in tutto o in parte, da un
    // altro oscuramento: il rapporto ne dà conto.
    for (const r of rilievi) {
      if (r.pagina !== pagina.numero || r.decisione !== 'mantieni' || !r.box.length) continue;
      const coperto = r.box.some((b) => boxUtente.some((u) => copertaDa(b, u)));
      statistiche.esiti[r.id] = { esito: 'in chiaro', modalita: null, note: coperto ? 'coperto, in tutto o in parte, da un altro oscuramento' : '' };
    }
    // Immagine della pagina.
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.9));
    if (raccogliImmagini) immagini.push(blob);
    const immagine = await pdfDoc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    canvas.width = 0; canvas.height = 0;
    const largPt = viewport.width / scala, altPt = viewport.height / scala;
    const nuova = pdfDoc.addPage([largPt, altPt]);
    nuova.drawImage(immagine, { x: 0, y: 0, width: largPt, height: altPt });
    statistiche.pagineEmesse++;

    // Livello testuale invisibile con il solo testo in chiaro.
    nuova.node.setFontDictionary(PDFName.of(nomeFont), font.ref);
    const operatori = [beginText(), setTextRenderingMode(TextRenderingMode.Invisible)];
    // Scrive `str` come testo invisibile lungo il segmento `seg` fra le
    // frazioni fa e fb della sua lunghezza. La direzione del testo è quella
    // originale del segmento, trasformata nel viewport (pagine ruotate, testo
    // verticale o capovolto).
    const scrivi = (str, seg, fa, fb) => {
      const testo = sanifica(str);
      if (!testo.trim()) return;
      // Origine (angolo inferiore sinistro della porzione) e direzione nel
      // viewport; poi nello spazio della pagina prodotta (origine in basso).
      const ux = seg.x + seg.dx * seg.w * fa, uy = seg.y + seg.dy * seg.w * fa;
      const [ox, oy] = viewport.convertToViewportPoint(ux, uy);
      const [px, py] = viewport.convertToViewportPoint(ux + seg.dx, uy + seg.dy);
      const dxV = px - ox, dyV = py - oy; // direzione nel viewport (y verso il basso)
      const dxP = dxV, dyP = -dyV; // direzione nella pagina PDF (y verso l'alto)
      const lunghezza = seg.w * (fb - fa);
      const corpo = Math.max(1, seg.h / 1.12);
      const larghezzaNaturale = font.widthOfTextAtSize(testo, corpo) || 1;
      const sx = lunghezza / larghezzaNaturale;
      const x = ox / scala, y = altPt - oy / scala;
      // Matrice [a b c d e f]: asse x lungo la direzione (scalato sx), asse y perpendicolare.
      const discesa = corpo * 0.2;
      operatori.push(
        setFontAndSize(nomeFont, corpo),
        setTextMatrix(dxP * sx, dyP * sx, -dyP, dxP, x - dyP * discesa, y + dxP * discesa),
      );
      operatori.push(showText(font.encodeText(testo)));
    };
    for (let i = 0; i < pagina.segmenti.length; i++) {
      const seg = pagina.segmenti[i];
      const inizioSeg = pagina.inizi[i];
      const fr = seg.frazioni || (seg.frazioni = frazioniCaratteri(seg.str, seg.uniforme));
      for (const [p, q] of porzioniInChiaro(seg, inizioSeg, intervalli)) {
        const boxU = sottoBox(seg, fr[p], fr[q]);
        // Rete di sicurezza: nessun carattere che cada sotto un rettangolo
        // oscurato, anche se selezionato per area, finisce nel livello
        // testuale. Se la porzione è toccata da un rettangolo, si scrivono
        // solo le sequenze di caratteri che ne restano fuori.
        const toccata = boxUtente.filter((b) => intersecaBox(boxU, b));
        if (!toccata.length) { scrivi(seg.str.slice(p, q), seg, fr[p], fr[q]); continue; }
        // Campo compilabile toccato da un oscuramento: nulla del valore
        // resta nel livello testuale.
        if (seg.campoIntero) continue;
        let da = p;
        for (let c = p; c <= q; c++) {
          // Basta che l'oscuramento tocchi il carattere perché questo sparisca
          // dal livello testuale: la tolleranza serve solo agli errori di
          // arrotondamento fra caratteri adiacenti.
          const fuori = c < q && !toccata.some((b) => copertaDa(sottoBox(seg, fr[c], fr[c + 1]), b, 0.05));
          if (!fuori) {
            if (c > da) scrivi(seg.str.slice(da, c), seg, fr[da], fr[c]);
            da = c + 1;
          }
        }
      }
    }
    // Le etichette ([OMISSIS], [SOGGETTO n]) diventano testo ricercabile.
    for (const b of boxUtente) {
      if (b.etichetta) scrivi(b.etichetta, { x: b.x, y: b.y, dx: 1, dy: 0, w: b.w, h: b.h }, 0, 1);
    }
    operatori.push(endText());
    nuova.pushOperators(...operatori);
    await new Promise((r) => setTimeout(r, 0));
  }

  if (segnale?.aborted) throw new Error('interrotto');
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  if (segnale?.aborted) throw new Error('interrotto');
  return { bytes, statistiche, immagini };
}
