// Genera il documento di esempio esempi/determina-prova.pdf (dati fittizi).
// Richiede pdf-lib e sharp installati: npm install pdf-lib sharp, poi node genera-esempio.js
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
let sharp = null;
try { sharp = require('sharp'); } catch (e) { console.log('sharp non disponibile:', e.message); }

const out = __dirname;

function righe(page, font, fontB, testo, x, y, size, larghezza) {
  // semplice a capo
  const parole = testo.split(' ');
  let riga = '';
  for (const p of parole) {
    const prova = riga ? riga + ' ' + p : p;
    if (font.widthOfTextAtSize(prova, size) > larghezza) {
      page.drawText(riga, { x, y, size, font });
      y -= size * 1.45;
      riga = p;
    } else riga = prova;
  }
  if (riga) { page.drawText(riga, { x, y, size, font }); y -= size * 1.45; }
  return y;
}

async function main() {
  const doc = await PDFDocument.create();
  doc.setAuthor('Mario Impiegato');
  doc.setCreator('Word di prova');
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontB = await doc.embedFont(StandardFonts.TimesRomanBold);

  // Pagina 1: determina
  let p = doc.addPage([595.28, 841.89]);
  let y = 790;
  p.drawText('CITTÀ METROPOLITANA DI MESSINA', { x: 60, y, size: 14, font: fontB }); y -= 18;
  p.drawText('I Direzione "Servizi legali e del personale"', { x: 60, y, size: 11, font }); y -= 14;
  p.drawText('Tel. 090 7761234 - protocollo@pec.cittametropolitana.me.it', { x: 60, y, size: 9, font }); y -= 30;
  p.drawText('DETERMINAZIONE DIRIGENZIALE N. 1234 DEL 12/09/2026', { x: 60, y, size: 12, font: fontB }); y -= 24;
  y = righe(p, font, fontB, 'OGGETTO: Liquidazione contributo economico straordinario in favore del sig. Giuseppe Verdi, nato a Messina il 04/03/1971, C.F. VRDGPP71C04F158P, residente in Messina, via Garibaldi n. 12, per la situazione di disagio economico del nucleo familiare.', 60, y, 11, 475);
  y -= 10;
  y = righe(p, font, fontB, 'IL DIRIGENTE', 60, y, 11, 475);
  y = righe(p, font, fontB, 'Premesso che con istanza prot. n. 45678 del 02/08/2026 il sig. Giuseppe Verdi ha chiesto la concessione di un contributo economico, allegando certificazione ISEE e certificato medico attestante invalidità civile al 75% ai sensi della legge 104/1992, art. 3 comma 3;', 60, y, 11, 475);
  y = righe(p, font, fontB, 'Vista la relazione dell\'assistente sociale dott.ssa Anna Bianchi, responsabile del procedimento, che attesta lo stato di bisogno del nucleo familiare, composto dal richiedente, dalla coniuge Maria Rossi e dal figlio minore Luca Verdi;', 60, y, 11, 475);
  y = righe(p, font, fontB, 'Vista la sentenza del Tribunale di Messina n. 456/2025 relativa al procedimento di sfratto per morosità;', 60, y, 11, 475);
  y = righe(p, font, fontB, 'Considerato che la ditta individuale Rossi Paolo, P. IVA 01234567897, con sede in Messina, cell. 333 1234567, e-mail paolo.rossi@gmail.com, ha eseguito i lavori di adeguamento;', 60, y, 11, 475);
  y = righe(p, font, fontB, 'Visto il d.lgs. 33/2013, art. 26, comma 4;', 60, y, 11, 475);
  y = righe(p, font, fontB, 'DETERMINA', 60, y, 11, 475);
  y = righe(p, font, fontB, '1. di liquidare in favore del sig. Giuseppe Verdi la somma di € 800,00 mediante accredito sul conto IBAN IT60X0542811101000000123456;', 60, y, 11, 475);
  y = righe(p, font, fontB, '2. di liquidare alla società Costruzioni S.r.l., P. IVA 02345678904, la somma di € 15.000,00 per i lavori eseguiti;', 60, y, 11, 475);
  y = righe(p, font, fontB, '3. di imputare la spesa al capitolo 1234 del bilancio 2026;', 60, y, 11, 475);
  y = righe(p, font, fontB, '4. di dare atto che il consulente ing. Franco Neri, incaricato con determina n. 99/2026, ha percepito un compenso di € 3.500,00.', 60, y, 11, 475);
  y -= 30;
  p.drawText('Il Responsabile del procedimento', { x: 60, y, size: 10, font }); p.drawText('Il Dirigente', { x: 380, y, size: 10, font }); y -= 14;
  p.drawText('dott.ssa Anna Bianchi', { x: 60, y, size: 10, font }); p.drawText('dott. Carlo Esposito', { x: 380, y, size: 10, font }); y -= 10;
  // firma autografa finta (immagine)
  if (sharp) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80"><path d="M10 60 C 40 10, 60 70, 90 30 S 140 70, 170 30 S 230 60, 290 20" stroke="#1a237e" stroke-width="3" fill="none"/></svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const img = await doc.embedPng(png);
    p.drawImage(img, { x: 380, y: y - 45, width: 120, height: 32 });
  }
  p.drawText('Pagina 1 - Città Metropolitana di Messina - via XXIV Maggio 1 - tel. 090 7761111', { x: 60, y: 30, size: 8, font });

  // Pagina 2: allegato documento d'identità (testo)
  p = doc.addPage([595.28, 841.89]);
  y = 780;
  for (const l of ['REPUBBLICA ITALIANA', 'COMUNE DI MESSINA', 'CARTA D\'IDENTITÀ N. AX1234567', 'Cognome: VERDI', 'Nome: GIUSEPPE', 'Nato il: 04/03/1971', 'Cittadinanza: Italiana', 'Statura: 178', 'Capelli: castani', 'Occhi: marroni', 'Scadenza: 04/03/2031', 'Firma del titolare']) {
    p.drawText(l, { x: 80, y, size: 12, font }); y -= 20;
  }

  // Pagina 3: scansione (solo immagine), se sharp disponibile
  if (sharp) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754" style="background:#fff">
      <rect width="1240" height="1754" fill="#fff"/>
      <text x="120" y="200" font-family="Arial" font-size="34" fill="#000">ALLEGATO A - Relazione del servizio sociale</text>
      <text x="120" y="280" font-family="Arial" font-size="28" fill="#000">Il sig. Giuseppe Verdi, codice fiscale VRDGPP71C04F158P,</text>
      <text x="120" y="330" font-family="Arial" font-size="28" fill="#000">telefono 340 9876543, versa in condizione di disagio economico.</text>
      <text x="120" y="380" font-family="Arial" font-size="28" fill="#000">La diagnosi di diabete richiede terapia continuativa.</text>
      <text x="120" y="460" font-family="Arial" font-size="28" fill="#000">L'assistente sociale dott.ssa Anna Bianchi</text>
    </svg>`;
    const jpg = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
    const img = await doc.embedJpg(jpg);
    p = doc.addPage([595.28, 841.89]);
    p.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }

  const bytes = await doc.save();
  fs.writeFileSync(path.join(out, 'determina-prova.pdf'), bytes);
  console.log('scritto', path.join(out, 'determina-prova.pdf'), bytes.length);
}
main().catch((e) => { console.error(e); process.exit(1); });
