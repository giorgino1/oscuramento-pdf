// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Formati in ingresso diversi dal PDF: immagini (JPG, PNG) incapsulate in
// una pagina PDF, e buste di firma digitale CAdES (.p7m) da cui si estrae il
// PDF firmato. Tutto avviene in memoria, nel browser.

// Tipo del file scelto: 'pdf' | 'immagine' | 'p7m' | 'ufficio' | 'altro'.
export function tipoFile(file) {
  const nome = (file.name || '').toLowerCase();
  const mime = (file.type || '').toLowerCase();
  if (nome.endsWith('.p7m')) return 'p7m';
  if (mime === 'application/pdf' || nome.endsWith('.pdf')) return 'pdf';
  if (mime === 'image/jpeg' || mime === 'image/png' || /\.(jpe?g|png)$/.test(nome)) return 'immagine';
  if (/\.(docx?|odt|rtf|xlsx?|ods|pptx?|odp|txt)$/.test(nome) || /officedocument|opendocument|msword|ms-excel|ms-powerpoint|rtf|text\/plain/.test(mime)) return 'ufficio';
  return 'altro';
}

// Nome base del documento, senza le estensioni di busta e di formato.
export function nomeBaseFile(nome) {
  return nome.replace(/\.p7m$/i, '').replace(/\.(pdf|jpe?g|png)$/i, '');
}

// ---------------------------------------------------------------- Immagini
// Una pagina PDF con l'immagine a piena pagina; le proporzioni della pagina
// seguono quelle dell'immagine, con il lato lungo di un foglio A4 (in punti).
export async function pdfDaImmagine(bytes) {
  const { PDFDocument } = window.PDFLib;
  const doc = await PDFDocument.create();
  // Il formato si legge dai byte: nome ed estensione possono mentire.
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (!png && !jpg) throw new Error('immagine non riconosciuta');
  const img = png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  // Il lato lungo dell'immagine diventa il lato lungo di un A4, qualunque sia
  // la proporzione (una striscia 100×10000 non produce una pagina di 59.000
  // punti); il lato corto segue in proporzione.
  const LATO_LUNGO = 841.89;
  const rapporto = img.height / img.width;
  const larghezza = rapporto >= 1 ? LATO_LUNGO / rapporto : LATO_LUNGO;
  const altezza = rapporto >= 1 ? LATO_LUNGO : LATO_LUNGO * rapporto;
  const pagina = doc.addPage([larghezza, altezza]);
  pagina.drawImage(img, { x: 0, y: 0, width: larghezza, height: altezza });
  doc.setProducer('');
  doc.setCreator('');
  return doc.save({ useObjectStreams: true });
}

// ---------------------------------------------------------------- CAdES (.p7m)
// Lettura minima di ASN.1 BER/DER: quanto basta per scendere da ContentInfo
// a SignedData → encapContentInfo → eContent e ricavarne gli ottetti.
function leggiTlv(b, pos) {
  if (pos + 2 > b.length) throw new Error('struttura troncata');
  const primo = b[pos];
  const costruito = (primo & 0x20) !== 0;
  let tag = primo & 0x1f;
  let i = pos + 1;
  if (tag === 0x1f) {
    tag = 0;
    while (b[i] & 0x80) { tag = (tag << 7) | (b[i] & 0x7f); i++; }
    tag = (tag << 7) | (b[i] & 0x7f);
    i++;
  }
  let lunghezza = b[i++];
  let indefinita = false;
  if (lunghezza === 0x80) {
    indefinita = true;
    lunghezza = -1;
  } else if (lunghezza & 0x80) {
    const n = lunghezza & 0x7f;
    if (n > 6) throw new Error('lunghezza non gestita');
    lunghezza = 0;
    for (let k = 0; k < n; k++) lunghezza = lunghezza * 256 + b[i++];
  }
  const nodo = { classe: primo >> 6, costruito, tag, inizio: i, lunghezza, indefinita, fine: null };
  if (!indefinita) nodo.fine = i + lunghezza;
  return nodo;
}

// Figli di un nodo costruito; per i nodi a lunghezza indefinita calcola
// anche la fine (dopo i due ottetti di terminazione).
function figli(b, nodo) {
  const out = [];
  let p = nodo.inizio;
  const limite = nodo.indefinita ? b.length : nodo.fine;
  while (p < limite) {
    if (nodo.indefinita && b[p] === 0 && b[p + 1] === 0) { nodo.fine = p + 2; return out; }
    const f = leggiTlv(b, p);
    if (f.indefinita) figli(b, f);
    if (f.fine == null) throw new Error('struttura non terminata');
    // Un figlio non può sporgere dal padre: busta troncata o corrotta.
    if (f.fine > limite) throw new Error('struttura troncata');
    out.push(f);
    p = f.fine;
  }
  if (nodo.indefinita) throw new Error('struttura non terminata');
  return out;
}

// Ottetti di una OCTET STRING, anche costruita (spezzata in blocchi).
function ottetti(b, nodo) {
  if (!nodo.costruito) return b.subarray(nodo.inizio, nodo.fine);
  const pezzi = figli(b, nodo).map((f) => ottetti(b, f));
  const totale = pezzi.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(totale);
  let k = 0;
  for (const p of pezzi) { out.set(p, k); k += p.length; }
  return out;
}

function decodificaBase64(bytes) {
  const testo = new TextDecoder('latin1').decode(bytes).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+=*$/.test(testo) || testo.length < 16) return null;
  try {
    return Uint8Array.from(atob(testo), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

const inizioPdf = (b) => b.length > 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
const inizioImmagine = (b) => b.length > 8 && ((b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47));
const contenutoUtile = (b) => inizioPdf(b) || inizioImmagine(b);
// OID 1.2.840.113549.1.7.2 (signedData), codificato.
const OID_SIGNED_DATA = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02];

export class P7mSenzaContenutoError extends Error {}

// Estrae il documento firmato da una busta CAdES. Le buste annidate
// (firma di una firma) vengono aperte in sequenza. La firma non viene
// verificata: qui serve solo il contenuto.
export function pdfDaP7m(bytes) {
  let b = bytes;
  for (let livello = 0; livello < 4; livello++) {
    if (contenutoUtile(b)) return b;
    if (b[0] !== 0x30) {
      const dec = decodificaBase64(b);
      if (!dec) throw new Error('busta non riconosciuta');
      b = dec;
      if (contenutoUtile(b)) return b;
    }
    const contentInfo = leggiTlv(b, 0);
    const [oid, esplicito] = figli(b, contentInfo);
    if (!oid || !esplicito || !esplicito.costruito) throw new Error('busta non riconosciuta');
    const oidBytes = Array.from(b.subarray(oid.inizio, oid.fine));
    if (oid.tag !== 6 || oidBytes.length !== OID_SIGNED_DATA.length || oidBytes.some((x, i) => x !== OID_SIGNED_DATA[i])) throw new Error('busta non riconosciuta: non è una firma CAdES');
    const signedData = figli(b, esplicito)[0];
    const parti = figli(b, signedData);
    // SignedData: version, digestAlgorithms, encapContentInfo, ...
    const encap = parti[2];
    if (!encap) throw new Error('busta non riconosciuta');
    const [, contenuto] = figli(b, encap);
    if (!contenuto) throw new P7mSenzaContenutoError('firma separata dal documento');
    const oct = contenuto.costruito && contenuto.classe === 2 ? figli(b, contenuto)[0] : contenuto;
    b = ottetti(b, oct);
    // Il contenuto o è un documento utile, o è un'altra busta (0x30), o non serve.
    if (!contenutoUtile(b) && b[0] !== 0x30) throw new Error('la busta non contiene un PDF né un’immagine');
  }
  if (contenutoUtile(b)) return b;
  throw new Error('la busta non contiene un PDF né un’immagine');
}
