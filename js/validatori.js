// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Funzioni di validazione richiamate dai rilevatori (regole/regole.js).
// Servono a ridurre i falsi positivi: una sequenza che ha la forma di un
// codice fiscale ma non supera il controllo non viene segnalata.

import { RECAPITI_ISTITUZIONALI } from './regole/regole.js';

const pulisci = (s) => s.replace(/\s+/g, '').toUpperCase();

// Sequenza di cifre tutte uguali (0000…, 1111…): non è un identificativo reale.
const uniforme = (cifre) => /^(\d)\1+$/.test(cifre);

// Conversione delle lettere di omocodia in cifre (L M N P Q R S T U V → 0-9).
const OMOCODIA = { L: '0', M: '1', N: '2', P: '3', Q: '4', R: '5', S: '6', T: '7', U: '8', V: '9' };
const cifraOmocodia = (c) => (c >= '0' && c <= '9' ? c : OMOCODIA[c]);

// Codice fiscale di persona fisica: 16 caratteri con carattere di controllo.
// Gestisce l'omocodia (cifre sostituite da lettere) e verifica che mese e
// giorno codificati siano possibili (giorno 1-31, o 41-71 per le donne).
export function codiceFiscale(testo) {
  const cf = pulisci(testo);
  if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cf)) return false;
  const giorno = Number(cifraOmocodia(cf[9]) + cifraOmocodia(cf[10]));
  if (!((giorno >= 1 && giorno <= 31) || (giorno >= 41 && giorno <= 71))) return false;
  const dispari = {
    0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
    N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
  };
  const pari = (c) => (c >= '0' && c <= '9' ? c.charCodeAt(0) - 48 : c.charCodeAt(0) - 65);
  let somma = 0;
  for (let i = 0; i < 15; i++) {
    const c = cf[i];
    somma += i % 2 === 0 ? dispari[c] : pari(c);
  }
  return String.fromCharCode(65 + (somma % 26)) === cf[15];
}

// Lunghezza dell'IBAN per paese (registro IBAN, principali paesi europei).
export const LUNGHEZZE_IBAN = {
  AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27,
  GB: 22, GR: 27, HR: 21, HU: 28, IE: 22, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31,
  NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

// IBAN: lunghezza per paese e resto modulo 97 secondo ISO 7064.
export function iban(testo) {
  const v = pulisci(testo);
  if (v.length < 15 || v.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(v)) return false;
  const attesa = LUNGHEZZE_IBAN[v.slice(0, 2)];
  if (attesa && v.length !== attesa) return false;
  const ruotato = v.slice(4) + v.slice(0, 4);
  let resto = 0;
  for (const c of ruotato) {
    const n = c >= 'A' ? String(c.charCodeAt(0) - 55) : c;
    for (const cifra of n) resto = (resto * 10 + Number(cifra)) % 97;
  }
  return resto === 1;
}

// Algoritmo di Luhn per i numeri di carta di pagamento.
export function luhn(testo) {
  const cifre = testo.replace(/\D/g, '');
  if (cifre.length < 13 || cifre.length > 19) return false;
  if (uniforme(cifre)) return false;
  let somma = 0;
  let doppio = false;
  for (let i = cifre.length - 1; i >= 0; i--) {
    let n = Number(cifre[i]);
    if (doppio) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somma += n;
    doppio = !doppio;
  }
  return somma % 10 === 0;
}

// Partita IVA italiana: 11 cifre con carattere di controllo.
export function partitaIva(testo) {
  const p = testo.replace(/\D/g, '');
  if (p.length !== 11 || uniforme(p)) return false;
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    let n = Number(p[i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somma += n;
  }
  return (10 - (somma % 10)) % 10 === Number(p[10]);
}

// Posta elettronica: vero se l'indirizzo NON appare istituzionale, cioè se va
// segnalato come recapito individuale (regole-oscuramento.md § B3). Restano in
// chiaro i recapiti dell'ente e degli uffici; una casella nominativa
// (nome.cognome@…) è un recapito individuale anche su dominio istituzionale,
// e un dominio di posta personale rende individuale anche una casella dal
// nome "istituzionale".
// Vero se il dominio di posta è di un ente pubblico (elenco dominiParziali).
export function dominioIstituzionale(indirizzo) {
  const dominio = (indirizzo.toLowerCase().split('@')[1] || '');
  const etichette = dominio.split('.');
  return RECAPITI_ISTITUZIONALI.dominiParziali.some((d) => (d.startsWith('.') ? dominio.endsWith(d) || dominio === d.slice(1) : etichette.some((e) => e.startsWith(d))));
}

export function emailNonIstituzionale(testo) {
  const indirizzo = testo.toLowerCase();
  const [locale, dominio] = indirizzo.split('@');
  if (!dominio) return false;
  const { dominiParziali, dominiPersonali, localiIstituzionali } = RECAPITI_ISTITUZIONALI;
  if (dominiPersonali.some((d) => dominio === d || dominio.endsWith('.' + d))) return true;
  // Casella nominativa: due o più parti alfabetiche separate da punto o
  // trattino basso (nome.cognome, m.rossi), nessuna delle quali è un nome d'ufficio.
  const parti = locale.split(/[._\-]/).filter(Boolean);
  const nominativa = parti.length >= 2 && parti.every((p) => /^[a-z]+\d{0,3}$/.test(p)) && parti.some((p) => p.length >= 3) && !parti.some((p) => localiIstituzionali.includes(p.replace(/\d+$/, '')));
  if (nominativa) return true;
  const etichette = dominio.split('.');
  const istituzionale = dominiParziali.some((d) => (d.startsWith('.') ? dominio.endsWith(d) || dominio === d.slice(1) : etichette.some((e) => e.startsWith(d))));
  const localeNormalizzato = locale.replace(/[._\-]/g, '');
  const casellaUfficio = localiIstituzionali.some((l) => localeNormalizzato === l || (localeNormalizzato.startsWith(l) && l.length >= 4));
  // Resta in chiaro solo una casella d'ufficio su un dominio istituzionale.
  // Su dominio istituzionale una casella non riconducibile a un ufficio
  // (mrossi@comune…) è individuale; su dominio non istituzionale lo è anche
  // una casella generica (info@studio-rossi.it può essere di un professionista).
  return !(istituzionale && casellaUfficio);
}

// Data reale (giorno, mese, anno) non successiva a oggi e non anteriore al 1900.
export function dataReale(giorno, mese, anno) {
  if (anno < 1900 || mese < 1 || mese > 12 || giorno < 1) return false;
  const d = new Date(Date.UTC(anno, mese - 1, giorno));
  if (d.getUTCFullYear() !== anno || d.getUTCMonth() !== mese - 1 || d.getUTCDate() !== giorno) return false;
  return d.getTime() <= Date.now();
}

// Data plausibile come data di nascita: una data reale, passata. Non si
// escludono le date recenti: i minori vanno protetti.
export function dataDiNascitaPlausibile(testo) {
  const m = testo.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  if (!m) return false;
  return dataReale(Number(m[1]), Number(m[2]), Number(m[3]));
}

export const VALIDATORI = { codiceFiscale, iban, luhn, partitaIva, emailNonIstituzionale, dataDiNascitaPlausibile, dominioIstituzionale };
