// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Server statico minimale per l'uso in locale: serve la cartella
// dell'applicazione senza alcuna dipendenza esterna.
//
//   node server.js            → http://localhost:8080
//   node server.js 9000       → porta diversa
//
// Non elabora nulla: si limita a consegnare i file al browser. Tutta
// l'elaborazione dei documenti avviene nel browser dell'utente.

const http = require('http');
const fs = require('fs');
const path = require('path');

const radice = path.resolve(__dirname);
const porta = Number(process.argv[2]) || 8080;

// Politica di sicurezza dei contenuti, inviata come intestazione HTTP a pagina,
// moduli e worker (la meta-CSP di index.html non vincola i worker). Identica a
// quella dichiarata in index.html: ogni richiesta di rete è limitata
// all'origine, salvo il download facoltativo e consensuale del modello NER.
const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' blob:; worker-src 'self' blob:; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co; img-src 'self' blob: data:; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const tipi = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.gz': 'application/gzip',
  '.bcmap': 'application/octet-stream',
  '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf',
  '.icc': 'application/octet-stream',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// Risolve il percorso richiesto dentro la radice; null se esce dalla radice
// (anche verso cartelle sorelle con lo stesso prefisso) o non è decodificabile.
function risolvi(url) {
  let percorso;
  try {
    percorso = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (percorso.endsWith('/')) percorso += 'index.html';
  if (percorso.includes('\0')) return null;
  const file = path.resolve(radice, '.' + percorso.replace(/\\/g, '/'));
  const relativo = path.relative(radice, file);
  if (!relativo || relativo.startsWith('..') || path.isAbsolute(relativo)) return null;
  return file;
}

http.createServer((req, res) => {
  const file = risolvi(req.url);
  if (!file) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Percorso non ammesso');
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Non trovato');
      return;
    }
    const estensione = path.extname(file).toLowerCase();
    const intestazioni = {
      'Content-Type': tipi[estensione] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache',
      // Isolamento cross-origin: consente ai motori WebAssembly di usare più
      // thread. Non è indispensabile, ma migliora le prestazioni.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    };
    if (['.html', '.js', '.mjs'].includes(estensione)) intestazioni['Content-Security-Policy'] = CSP;
    if (req.method === 'HEAD') {
      res.writeHead(200, intestazioni);
      res.end();
      return;
    }
    res.writeHead(200, intestazioni);
    fs.createReadStream(file).pipe(res);
  });
}).listen(porta, '127.0.0.1', () => {
  console.log('Applicazione disponibile su http://localhost:' + porta + '/');
  console.log('Premi Ctrl+C per arrestare il server.');
});
