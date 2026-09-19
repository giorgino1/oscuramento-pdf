// Piccole utilità per il DOM.

export const el = (id) => document.getElementById(id);

export function crea(tag, attributi = {}, figli = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attributi)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'classe') e.className = v;
    else if (k === 'testo') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const f of [].concat(figli)) {
    if (f === null || f === undefined) continue;
    e.append(typeof f === 'string' ? document.createTextNode(f) : f);
  }
  return e;
}

export function svuota(e) {
  while (e.firstChild) e.removeChild(e.firstChild);
}

export function mostra(e, visibile = true) {
  if (visibile) e.removeAttribute('hidden');
  else e.setAttribute('hidden', '');
}

export function testo(id, valore) {
  const e = el(id);
  if (e) e.textContent = valore;
}

export function formattaByte(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' kB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}
