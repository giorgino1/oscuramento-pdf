// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Costruzione del testo di pagina a partire dai segmenti (frammenti di testo
// con posizione) e corrispondenza fra intervalli di caratteri e rettangoli.
//
// Un segmento ha la forma:
//   { str, x, y, dx, dy, w, h, fineRiga }
// dove (x, y) è l'angolo inferiore sinistro nello spazio utente del PDF
// (origine in basso a sinistra, unità in punti), (dx, dy) è la direzione
// unitaria del testo, w la lunghezza lungo la direzione, h l'altezza.

let contestoMisura = null;
const cacheLarghezze = new Map();

// Larghezza relativa di un carattere, misurata con un carattere di sistema.
// Serve solo a distribuire in modo plausibile la larghezza complessiva di un
// segmento fra i suoi caratteri: i PDF non espongono la posizione dei singoli
// glifi in modo uniforme.
function larghezzaCarattere(c) {
  let l = cacheLarghezze.get(c);
  if (l !== undefined) return l;
  if (!contestoMisura) {
    const canvas = document.createElement('canvas');
    contestoMisura = canvas.getContext('2d');
    contestoMisura.font = '100px sans-serif';
  }
  l = contestoMisura.measureText(c).width || 50;
  cacheLarghezze.set(c, l);
  return l;
}

// Frazioni cumulative [0, ..., 1] della larghezza per ogni posizione del testo.
export function frazioniCaratteri(str, uniforme = false) {
  const n = str.length;
  const fr = new Float32Array(n + 1);
  if (n === 0) return fr;
  if (uniforme) {
    for (let i = 0; i <= n; i++) fr[i] = i / n;
    return fr;
  }
  let totale = 0;
  const parziali = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    totale += larghezzaCarattere(str[i]);
    parziali[i] = totale;
  }
  if (totale === 0) {
    for (let i = 0; i <= n; i++) fr[i] = i / n;
    return fr;
  }
  for (let i = 0; i < n; i++) fr[i + 1] = parziali[i] / totale;
  return fr;
}

// Costruisce il testo della pagina e l'elenco delle posizioni iniziali di
// ciascun segmento nel testo. Inserisce spazi e ritorni a capo in base alla
// geometria, in modo che le espressioni regolari e il riconoscitore di nomi
// lavorino su un testo leggibile.
//
// Restituisce anche l'elenco dei segmenti effettivamente usato: con
// `riordina` i segmenti vengono rimessi in ordine di lettura (righe dall'alto
// in basso, da sinistra a destra) e i valori sovrapposti a un altro frammento,
// come i campi compilati di un modulo disegnati sopra una riga di trattini,
// vengono inseriti nel punto in cui compaiono visivamente.
export function costruisciTesto(segmentiOriginali, { riordina = true } = {}) {
  const segmenti = riordina ? ordinaPerLettura(segmentiOriginali) : segmentiOriginali.slice();
  let testo = '';
  const inizi = new Array(segmenti.length);
  let precedente = null;
  for (let i = 0; i < segmenti.length; i++) {
    const s = segmenti[i];
    if (precedente) {
      testo += separatore(precedente, s);
    }
    inizi[i] = testo.length;
    // Le righe di trattini bassi dei moduli diventano spazi nel testo di
    // analisi (stessa lunghezza, così le posizioni restano allineate).
    // Restano i trattini bassi compresi fra due caratteri alfanumerici
    // (mario_rossi@…, identificativi): quelli ai bordi o in sequenza sono
    // righe di compilazione.
    testo += s.str.replace(/(?<![\p{L}\p{N}])_+|_+(?![\p{L}\p{N}])/gu, (m) => ' '.repeat(m.length));
    precedente = s;
  }
  return { segmenti, testo, inizi };
}

const orizzontale = (s) => Math.abs(s.dy) < 0.05 && s.dx > 0;

// Ordine di lettura geometrico per i segmenti orizzontali; gli altri restano
// in coda nell'ordine originale.
function ordinaPerLettura(segmenti) {
  const oriz = segmenti.filter(orizzontale);
  const altri = segmenti.filter((s) => !orizzontale(s));
  if (oriz.length < 2) return segmenti.slice();
  // Raggruppamento in righe per posizione verticale.
  const perY = oriz.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const righe = [];
  for (const s of perY) {
    const r = righe[righe.length - 1];
    if (r && Math.abs(r.y - s.y) < Math.min(r.h, s.h) * 0.5) {
      r.segmenti.push(s);
      r.h = Math.max(r.h, s.h);
    } else {
      righe.push({ y: s.y, h: s.h, segmenti: [s] });
    }
  }
  const risultato = [];
  for (const r of righe) {
    r.segmenti.sort((a, b) => a.x - b.x);
    const riga = intercala(r.segmenti);
    riga.forEach((s, i) => { s.fineRiga = i === riga.length - 1; });
    risultato.push(...riga);
  }
  return [...risultato, ...altri];
}

// Se un segmento `b` inizia dentro un segmento `a` della stessa riga e la
// porzione di `a` coperta da `b` è fatta di trattini o spazi (campo di un
// modulo compilato sopra la riga), `a` viene spezzato: prima la parte che
// precede `b`, poi `b`, poi la parte di `a` che segue `b`.
function intercala(segmentiRiga) {
  const uscita = [];
  const coda = segmentiRiga.slice();
  while (coda.length) {
    const a = coda.shift();
    const b = coda[0];
    if (!b || a.str.length < 3 || b.x >= a.x + a.w - a.h * 0.3 || b.x <= a.x + a.h * 0.3) {
      uscita.push(a);
      continue;
    }
    const fr = a.frazioni || (a.frazioni = frazioniCaratteri(a.str, a.uniforme));
    const fInizio = (b.x - a.x) / a.w;
    const fFine = (b.x + b.w - a.x) / a.w;
    let k = 1;
    while (k < a.str.length && fr[k] < fInizio) k++;
    let k2 = k;
    while (k2 < a.str.length && fr[k2] < fFine) k2++;
    const coperto = a.str.slice(k, k2);
    // Si spezza solo se la porzione coperta è fatta esclusivamente di
    // trattini, spazi e punti: nessun carattere reale viene perso.
    const vuoto = coperto.replace(/[_\s.]/g, '').length === 0;
    if (!vuoto || k >= a.str.length) {
      uscita.push(a);
      continue;
    }
    const primo = { ...a, str: a.str.slice(0, k), w: a.w * fr[k], frazioni: null, fineRiga: false };
    uscita.push(primo);
    if (k2 < a.str.length) {
      const secondo = { ...a, str: a.str.slice(k2), x: a.x + a.dx * a.w * fr[k2], y: a.y + a.dy * a.w * fr[k2], w: a.w * (1 - fr[k2]), frazioni: null };
      // Il resto di `a` va dopo `b`, nell'ordine dettato dalla posizione.
      coda.shift();
      uscita.push(b);
      let pos = 0;
      while (pos < coda.length && coda[pos].x < secondo.x) pos++;
      coda.splice(pos, 0, secondo);
    }
  }
  return uscita;
}

// Separatore fra due segmenti consecutivi: ritorno a capo se cambiano riga,
// spazio se c'è un vuoto orizzontale apprezzabile, nulla se sono contigui.
function separatore(a, b) {
  if (a.fineRiga) return '\n';
  const h = Math.max(a.h, b.h, 1);
  // Proiezione sulla direzione del testo di `a`.
  const fineA = { x: a.x + a.dx * a.w, y: a.y + a.dy * a.w };
  const lungo = (b.x - fineA.x) * a.dx + (b.y - fineA.y) * a.dy;
  const trasv = Math.abs((b.x - a.x) * -a.dy + (b.y - a.y) * a.dx);
  const stessaRiga = trasv < h * 0.6 && lungo > -h * 2;
  if (!stessaRiga) return '\n';
  if (lungo > h * 0.12) return ' ';
  return '';
}

// Rettangolo (spazio utente, bbox assiale) della porzione del segmento
// compresa fra le frazioni fa e fb della sua lunghezza.
export function sottoBox(seg, fa, fb) {
  const x0 = seg.x + seg.dx * seg.w * fa;
  const y0 = seg.y + seg.dy * seg.w * fa;
  const lung = seg.w * (fb - fa);
  const px = -seg.dy, py = seg.dx; // perpendicolare
  const punti = [
    [x0, y0],
    [x0 + seg.dx * lung, y0 + seg.dy * lung],
    [x0 + px * seg.h, y0 + py * seg.h],
    [x0 + seg.dx * lung + px * seg.h, y0 + seg.dy * lung + py * seg.h],
  ];
  const xs = punti.map((p) => p[0]);
  const ys = punti.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Rettangoli che coprono l'intervallo [inizio, fine) del testo di pagina.
// Restituisce un rettangolo per ciascun segmento interessato.
export function boxPerIntervallo(pagina, inizio, fine) {
  const { segmenti, inizi } = pagina;
  const box = [];
  // Ricerca binaria del primo segmento che può contenere `inizio`.
  let lo = 0, hi = segmenti.length - 1, primo = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (inizi[mid] <= inizio) { primo = mid; lo = mid + 1; } else hi = mid - 1;
  }
  for (let i = primo; i < segmenti.length; i++) {
    const s = segmenti[i];
    const sInizio = inizi[i];
    const sFine = sInizio + s.str.length;
    if (sInizio >= fine) break;
    if (sFine <= inizio) continue;
    const a = Math.max(inizio, sInizio) - sInizio;
    const b = Math.min(fine, sFine) - sInizio;
    // Salta le porzioni di solo spazio.
    if (!s.str.slice(a, b).trim()) continue;
    const fr = s.frazioni || (s.frazioni = frazioniCaratteri(s.str, s.uniforme));
    // Campo compilabile: geometria dei caratteri non affidabile, si copre tutto.
    // Campo compilabile: si copre l'intero rettangolo del campo (anche su più
    // righe), perché la posizione reale del valore non è nota.
    box.push(s.campoIntero ? { ...(s.campo || sottoBox(s, 0, 1)) } : sottoBox(s, fr[a], fr[b]));
  }
  return box;
}

// Intervalli di testo [inizio, fine) dei segmenti che intersecano un
// rettangolo dello spazio utente. Usato per la selezione manuale.
export function intervalliInRettangolo(pagina, rett) {
  const risultato = [];
  const { segmenti, inizi } = pagina;
  for (let i = 0; i < segmenti.length; i++) {
    const s = segmenti[i];
    const b = sottoBox(s, 0, 1);
    if (!interseca(b, rett)) continue;
    const fr = s.frazioni || (s.frazioni = frazioniCaratteri(s.str, s.uniforme));
    // Individua i caratteri il cui centro cade nel rettangolo (solo per testo orizzontale).
    let da = -1, a = -1;
    for (let c = 0; c < s.str.length; c++) {
      const cb = sottoBox(s, fr[c], fr[c + 1]);
      const cx = cb.x + cb.w / 2, cy = cb.y + cb.h / 2;
      const dentro = cx >= rett.x && cx <= rett.x + rett.w && cy >= rett.y && cy <= rett.y + rett.h;
      if (dentro) { if (da < 0) da = c; a = c + 1; }
    }
    if (da >= 0 && s.str.slice(da, a).trim()) risultato.push({ inizio: inizi[i] + da, fine: inizi[i] + a });
  }
  return risultato;
}

function interseca(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Unione di rettangoli contigui sulla stessa riga, per ridurre il numero di
// rettangoli disegnati.
export function unisciBox(box) {
  if (box.length <= 1) return box.slice();
  const ordinati = box.slice().sort((p, q) => q.y - p.y || p.x - q.x);
  const uniti = [];
  for (const b of ordinati) {
    const u = uniti[uniti.length - 1];
    if (u && Math.abs(u.y - b.y) < Math.min(u.h, b.h) * 0.5 && b.x <= u.x + u.w + Math.max(u.h, b.h) * 0.6) {
      const x2 = Math.max(u.x + u.w, b.x + b.w);
      const y2 = Math.max(u.y + u.h, b.y + b.h);
      u.x = Math.min(u.x, b.x);
      u.y = Math.min(u.y, b.y);
      u.w = x2 - u.x;
      u.h = y2 - u.y;
    } else {
      uniti.push({ ...b });
    }
  }
  return uniti;
}
