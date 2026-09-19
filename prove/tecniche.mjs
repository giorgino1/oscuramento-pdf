// Prove tecniche senza dipendenze: moduli reali, sole dipendenze di ambiente simulate.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function modulo(percorso, dipendenze, nomi) {
  const url = new URL('../' + percorso, import.meta.url);
  let codice = await readFile(url, 'utf8');
  codice = codice.replace(/^import\s[\s\S]*?;\r?\n/gm, '')
    .replace(/^export \{[^}]+\};?\r?\n/gm, '')
    .replace(/\bexport (?=(?:async )?function|class|const|let)/g, '')
    .replaceAll('import.meta.url', JSON.stringify(url.href));
  return new Function(...Object.keys(dipendenze), codice + '\nreturn {' + nomi.join(',') + '};')(...Object.values(dipendenze));
}

const prove = {
  async cropbox() {
    const { estraiImmagini, pdfjsLib, componiPagina } = await import('../js/estrazione.js');
    const vista = {larghezza:500, altezza:700, origineX:100, origineY:200, rotazione:0};
    const immagini = await estraiImmagini({getOperatorList:async()=>({
      fnArray:[pdfjsLib.OPS.transform,pdfjsLib.OPS.paintImageXObject],
      argsArray:[[80,0,0,30,150,250],['firma']],
    })}, vista);
    assert.equal(immagini[0].x, 150);
    assert.equal(immagini[0].y, 250);
    const pagina = componiPagina(0,vista,[],{daScansione:true});
    const {rilevaDati} = await import('../js/rilevamento.js');
    const rilievi = await rilevaDati({pagine:[pagina]}, {scopo:'pubblica', riconoscitore:async()=>[]});
    assert.deepEqual(rilievi.find(r=>r.categoria==='C7').box[0],{x:100,y:200,w:500,h:700});
  },
  async rete() {
    let opzioni;
    let richieste = 0;
    const fake = {
      GlobalWorkerOptions: {},
      PDFWorker: class { promise = Promise.resolve(); },
      getDocument: (o) => { opzioni = o; return { promise: Promise.resolve({}) }; },
    };
    const m = await modulo('js/estrazione.js', {
      pdfjsLib: fake, RISORSE_PDF: { cMapUrl: ['prova.bcmap'], standardFontDataUrl: ['prova.pfb'] },
      fetch: async () => { richieste++; return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2]).buffer }; },
    }, ['apriPdf', '...(typeof preparaPdf === "function" ? {preparaPdf} : {})']);
    if (m.preparaPdf) await m.preparaPdf();
    await m.apriPdf(new Uint8Array([37, 80, 68, 70]));
    assert.equal(opzioni.useWorkerFetch, false, 'pdf.js può ancora richiedere risorse dopo il documento');
    assert.ok(opzioni.worker, 'worker PDF non preparato');
    assert.ok(opzioni.BinaryDataFactory, 'manca il lettore dalla memoria');
    const n = richieste;
    const f = new opzioni.BinaryDataFactory();
    assert.deepEqual(await f.fetch({kind:'cMapUrl', filename:'prova.bcmap'}), new Uint8Array([1,2]));
    await assert.rejects(f.fetch({kind:'cMapUrl', filename:'../../dato-del-documento'}));
    assert.equal(richieste, n, 'lettura di risorse durante uso');
  },
  // D12: buste CAdES in DER, BER a blocchi, annidate, base64; contenuto
  // immagine restituito; firma separata, busta troncata e OID errato rifiutati.
  async p7m() {
    const { pdfDaP7m, P7mSenzaContenutoError } = await import('../js/ingresso.js');
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, ...new Array(3000).fill(0x20)]);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
    const len = (n) => { if (n < 128) return [n]; const b = []; let x = n; while (x > 0) { b.unshift(x & 0xff); x = Math.floor(x / 256); } return [0x80 | b.length, ...b]; };
    const cat = (...p) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let k = 0; for (const x of p) { o.set(x, k); k += x.length; } return o; };
    const tlv = (tag, c) => cat(new Uint8Array([tag, ...len(c.length)]), c);
    const tlvIndef = (tag, c) => cat(new Uint8Array([tag, 0x80]), c, new Uint8Array([0, 0]));
    const oidSD = new Uint8Array([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02]);
    const oidData = new Uint8Array([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x01]);
    const testa = cat(new Uint8Array([2, 1, 1]), new Uint8Array([0x31, 0]));
    const coda = cat(tlv(0xa0, new Uint8Array([0x30, 0])), new Uint8Array([0x31, 0]));
    const der = (c, oid = oidSD) => tlv(0x30, cat(oid, tlv(0xa0, tlv(0x30, cat(testa, tlv(0x30, cat(oidData, tlv(0xa0, tlv(0x04, c)))), coda)))));
    const ber = (c) => {
      const blocchi = []; for (let i = 0; i < c.length; i += 1000) blocchi.push(tlv(0x04, c.subarray(i, i + 1000)));
      return tlvIndef(0x30, cat(oidSD, tlvIndef(0xa0, tlvIndef(0x30, cat(testa, tlvIndef(0x30, cat(oidData, tlvIndef(0xa0, tlvIndef(0x24, cat(...blocchi))))), coda)))));
    };
    assert.deepEqual(pdfDaP7m(der(pdf)), pdf);
    assert.deepEqual(pdfDaP7m(ber(pdf)), pdf);
    assert.deepEqual(pdfDaP7m(der(ber(pdf))), pdf);
    assert.deepEqual(pdfDaP7m(new TextEncoder().encode('-----BEGIN PKCS7-----\n' + Buffer.from(der(pdf)).toString('base64') + '\n-----END PKCS7-----\n')), pdf);
    assert.deepEqual(pdfDaP7m(der(png)), png, 'immagine incapsulata');
    assert.throws(() => pdfDaP7m(tlv(0x30, cat(oidSD, tlv(0xa0, tlv(0x30, cat(testa, tlv(0x30, oidData), coda)))))), P7mSenzaContenutoError);
    assert.throws(() => pdfDaP7m(der(pdf).subarray(0, 1200)), /troncat|struttura/);
    assert.throws(() => pdfDaP7m(der(pdf, oidData)), /CAdES/);
    assert.throws(() => pdfDaP7m(der(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))), /non contiene/);
  },
};

export async function verificaTecnica(nome) { await prove[nome](); }
