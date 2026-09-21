// © 2026 Giorgio La Malfa. Licenza EUPL-1.2 (LICENZA.md).
// Schermata di revisione (specifica funzionale, § 3): anteprima delle pagine
// con i rilievi evidenziati, pannello laterale, decisioni, selezione manuale.

import { el, crea, svuota, mostra } from './dom.js';
import { T } from './stringhe.js';
import { CATEGORIE, CATEGORIE_MANUALI, ORDINE_FASCE } from './regole/regole.js';
import { rendiPagina, boxVersoViewport, rettangoloVersoUtente } from './estrazione.js';
import { intervalliInRettangolo, boxPerIntervallo, unisciBox } from './testo.js';
import { creaRilievo, chiaveNominativo, assegnaSoggetti, confermaProposte, daConfermare } from './rilevamento.js';
import { SCOPI } from './regole/regole.js';

const SCALA_MASSIMA = 2.2;

export class Revisione {
  constructor(stato, suCambio) {
    this.stato = stato;
    this.suCambio = suCambio;
    this.viewport1 = new Map(); // numero pagina → viewport a scala 1
    this.contenitori = new Map(); // numero pagina → elemento
    this.osservatore = null;
    this.osservatoreViste = null;
    this.selezione = null;
    this.preparaStatici();
  }

  preparaStatici() {
    const R = T.revisione;
    el('selezione-manuale').textContent = R.selezioneManuale;
    el('selezione-manuale').addEventListener('click', () => this.attivaSelezione(!this.stato.selezioneManuale));
    el('selezione-testo').textContent = R.selezioneTesto;
    el('selezione-testo').addEventListener('click', () => this.creaManualePerTesto());
    el('selezione-area').textContent = R.selezioneArea;
    el('selezione-area').addEventListener('click', () => this.creaManualePerCoordinate());
    el('mostra-dettagli').textContent = R.mostraDettagli;
    el('mostra-dettagli').addEventListener('click', () => this.attivaDettagli(el('pannello-rilievi').hidden));
    el('conferma-proposte').textContent = R.confermaProposte;
    el('conferma-proposte').addEventListener('click', () => this.confermaTutteLeProposte());
    el('blocco-etichetta').textContent = R.bloccoEtichetta;
    const sel = el('blocco-categoria');
    svuota(sel);
    for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']) sel.append(crea('option', { value: id, testo: CATEGORIE[id].etichetta }));
    el('blocco-oscura').textContent = R.bloccoOscura;
    el('blocco-mantieni').textContent = R.bloccoMantieni;
    el('blocco-oscura').addEventListener('click', () => this.decidiCategoria(sel.value, 'oscura'));
    el('blocco-mantieni').addEventListener('click', () => this.decidiCategoria(sel.value, 'mantieni'));
    el('filtro-etichetta').textContent = R.filtro;
    const filtro = el('filtro-fascia');
    svuota(filtro);
    for (const [v, t] of [['tutti', R.filtroTutti], ['C', R.filtroC], ['A', R.filtroA], ['B', R.filtroB], ['P', R.filtroP], ['M', R.filtroM]]) {
      filtro.append(crea('option', { value: v, testo: t }));
    }
    filtro.addEventListener('change', () => { this.stato.filtro = filtro.value; this.aggiornaPannello(); });
    const legenda = el('legenda');
    svuota(legenda);
    for (const f of ['A', 'B', 'C', 'P', 'M']) legenda.append(crea('span', { classe: 'leg-' + f, testo: T.fasce[f] + ': ' + T.fasceDescrizione[f] }));
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && this.stato.selezioneManuale) this.attivaSelezione(false);
    });
  }

  // Mostra o nasconde gli strumenti per l'utente esperto (elenco dei dati,
  // filtri, decisioni in blocco).
  attivaDettagli(attivi) {
    mostra(el('pannello-rilievi'), attivi);
    mostra(el('dettagli-rilievi'), attivi);
    el('revisione-griglia').classList.toggle('revisione--semplice', !attivi);
    const b = el('mostra-dettagli');
    b.setAttribute('aria-expanded', attivi ? 'true' : 'false');
    b.textContent = attivi ? T.revisione.nascondiDettagli : T.revisione.mostraDettagli;
    if (attivi) this.aggiornaPannello();
  }

  // Costruisce le pagine (resa differita) e il pannello.
  async costruisci() {
    const elenco = el('elenco-pagine');
    svuota(elenco);
    this.contenitori.clear();
    this.viewport1.clear();
    this.osservatore?.disconnect();
    this.osservatoreViste?.disconnect();
    this.stato.pagineViste = new Set();

    this.osservatore = new IntersectionObserver((voci) => {
      for (const v of voci) if (v.isIntersecting) this.rendi(Number(v.target.dataset.pagina));
    }, { rootMargin: '700px 0px' });
    this.osservatoreViste = new IntersectionObserver((voci) => {
      for (const v of voci) {
        if (v.isIntersecting && v.intersectionRatio >= 0.35) this.segnaVista(Number(v.target.dataset.pagina));
      }
    }, { threshold: [0.35, 0.6, 1] });

    for (const pagina of this.stato.documento.pagine) {
      const paginaPdf = await this.stato.documento.pdf.getPage(pagina.numero);
      const vp = paginaPdf.getViewport({ scale: 1 });
      this.viewport1.set(pagina.numero, vp);
      const cont = crea('div', { classe: 'pagina-contenitore', dataset: { pagina: String(pagina.numero) } });
      cont.style.aspectRatio = vp.width + ' / ' + vp.height;
      cont.style.maxWidth = Math.min(900, vp.width * SCALA_MASSIMA) + 'px';
      const canvas = crea('canvas', { 'aria-label': T.revisione.pagina + ' ' + pagina.numero, role: 'img' });
      const livello = crea('div', { classe: 'pagina-livello' });
      cont.append(
        crea('span', { classe: 'pagina-numero', testo: T.revisione.pagina + ' ' + pagina.numero }),
        canvas,
        // Testo estratto o riconosciuto, per le tecnologie assistive.
        crea('div', { classe: 'pagina-testo-accessibile', testo: T.revisione.paginaTestoAccessibile + ' ' + pagina.numero + ':\n' + pagina.testo }),
        livello,
      );
      this.preparaSelezione(livello, pagina.numero);
      elenco.append(cont);
      this.contenitori.set(pagina.numero, cont);
      this.osservatore.observe(cont);
      this.osservatoreViste.observe(cont);
    }
    this.aggiornaEvidenze();
    this.aggiornaPannello();
    this.aggiornaPagineViste();
    // Controllo di visibilità anche su scorrimento, come rete di sicurezza
    // rispetto all'IntersectionObserver.
    if (!this.ascoltoScorrimento) {
      this.ascoltoScorrimento = true;
      let attesa = null;
      const pianifica = () => {
        if (attesa) return;
        attesa = setTimeout(() => { attesa = null; this.controllaVisibilita(); }, 150);
      };
      window.addEventListener('scroll', pianifica, { passive: true });
      window.addEventListener('resize', pianifica);
    }
    this.controllaVisibilita();
  }

  // Rende le pagine vicine alla finestra e registra quelle effettivamente
  // visualizzate (almeno per un terzo della loro altezza).
  controllaVisibilita() {
    if (!this.stato.documento) return;
    const altezzaFinestra = window.innerHeight || document.documentElement.clientHeight;
    let cambiato = false;
    for (const [numero, cont] of this.contenitori) {
      const r = cont.getBoundingClientRect();
      if (r.bottom > -700 && r.top < altezzaFinestra + 700) this.rendi(numero);
      // Le pagine lontane dalla finestra liberano il canvas: verranno rese di
      // nuovo quando torneranno vicine (documenti lunghi).
      else if (cont.dataset.resa === '2' && (r.bottom < -3500 || r.top > altezzaFinestra + 3500)) this.liberaCanvas(cont);
      const visibile = Math.min(r.bottom, altezzaFinestra) - Math.max(r.top, 0);
      if (r.height > 0 && visibile >= Math.min(r.height * 0.35, altezzaFinestra * 0.8)) {
        if (this.segnaVista(numero, false)) cambiato = true;
      }
    }
    if (cambiato) this.aggiornaPagineViste();
  }

  // Registra la pagina come vista solo se la resa si è conclusa con successo
  // (resa === '2'): una pagina bianca o non renderizzata non è stata rivista.
  segnaVista(numero, aggiorna = true) {
    const cont = this.contenitori.get(numero);
    if (!cont || cont.dataset.resa !== '2' || this.stato.pagineViste.has(numero)) return false;
    this.stato.pagineViste.add(numero);
    if (aggiorna) this.aggiornaPagineViste();
    return true;
  }

  liberaCanvas(cont) {
    const canvas = cont.querySelector('canvas');
    canvas.width = 0;
    canvas.height = 0;
    cont.dataset.resa = '0';
  }

  // Stati di resa: assente/'0' = da rendere, '1' = in corso, '2' = riuscita.
  async rendi(numero) {
    const cont = this.contenitori.get(numero);
    if (!cont || cont.dataset.resa === '1' || cont.dataset.resa === '2') return;
    cont.dataset.resa = '1';
    const canvas = cont.querySelector('canvas');
    cont.querySelector('.pagina-errore')?.remove();
    const vp = this.viewport1.get(numero);
    const larghezzaCss = cont.clientWidth || 800;
    const scala = Math.min(SCALA_MASSIMA, (larghezzaCss * (window.devicePixelRatio || 1)) / vp.width);
    try {
      const paginaPdf = await this.stato.documento.pdf.getPage(numero);
      await rendiPagina(paginaPdf, scala, canvas);
      if (canvas.width === 0 || canvas.height === 0) throw new Error('canvas vuoto');
      cont.dataset.resa = '2';
      // Se la pagina è già davanti agli occhi dell'utente, ora conta come vista.
      const r = cont.getBoundingClientRect();
      const altezzaFinestra = window.innerHeight || document.documentElement.clientHeight;
      const visibile = Math.min(r.bottom, altezzaFinestra) - Math.max(r.top, 0);
      if (r.height > 0 && visibile >= Math.min(r.height * 0.35, altezzaFinestra * 0.8)) this.segnaVista(numero);
    } catch (e) {
      cont.dataset.resa = '0';
      canvas.width = 0; canvas.height = 0;
      cont.append(crea('div', { classe: 'pagina-errore', role: 'alert', testo: T.revisione.paginaNonResa }));
    }
  }

  aggiornaPagineViste() {
    const n = this.stato.documento?.pagine.length || 0;
    el('pagine-viste').textContent = T.revisione.pagineViste + ': ' + this.stato.pagineViste.size + ' ' + T.analisi.di + ' ' + n;
    this.suCambio('viste');
  }

  // Evidenziazioni sulle pagine ----------------------------------------
  aggiornaEvidenze() {
    for (const [numero, cont] of this.contenitori) {
      const livello = cont.querySelector('.pagina-livello');
      svuota(livello);
      const vp = this.viewport1.get(numero);
      for (const r of this.stato.rilievi) {
        if (r.pagina !== numero) continue;
        r.box.forEach((b, i) => {
          const rett = boxVersoViewport(b, vp);
          const e = crea('div', {
            classe: 'evidenza evidenza--' + r.fascia + (r.decisione === 'mantieni' ? ' evidenza--mantieni' : '') + (r.decisione ? ' evidenza--decisa' : '') + (r.azione === 'espungi' ? ' evidenza--espungi' : '') + (this.stato.attivo === r.id ? ' evidenza--attiva' : ''),
            role: 'button', tabindex: '0',
            'aria-label': CATEGORIE[r.categoria].etichetta + ', ' + T.fasce[r.fascia] + ', ' + this.descriviStato(r),
            dataset: { rilievo: r.id, indice: String(i) },
            onclick: () => this.attiva(r.id, true),
            onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.attiva(r.id, true); } },
          });
          e.style.left = (rett.left / vp.width * 100) + '%';
          e.style.top = (rett.top / vp.height * 100) + '%';
          e.style.width = (rett.width / vp.width * 100) + '%';
          e.style.height = (rett.height / vp.height * 100) + '%';
          e.title = r.testo;
          livello.append(e);
        });
      }
    }
  }

  descriviStato(r) {
    if (r.decisione === 'oscura') return r.azione === 'espungi' ? T.revisione.stati.espungi : T.revisione.stati.oscura;
    if (r.decisione === 'mantieni') return T.revisione.stati.mantieni;
    return T.revisione.stati.daDecidere;
  }

  attiva(id, scorriPannello = false) {
    this.stato.attivo = id;
    this.aggiornaEvidenze();
    this.aggiornaPannello();
    if (scorriPannello) {
      if (el('pannello-rilievi').hidden) this.attivaDettagli(true);
      const card = document.querySelector('[data-card="' + id + '"]');
      card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      card?.focus({ preventScroll: true });
    }
  }

  // Porta l'anteprima alla pagina indicata (dall'alto, così che la pagina
  // risulti guardata secondo il criterio di controllaVisibilita).
  mostraPagina(numero) {
    const cont = this.contenitori.get(numero);
    if (!cont) return;
    this.rendi(numero);
    cont.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  vaiAllaPagina(r) {
    const cont = this.contenitori.get(r.pagina);
    if (!cont) return;
    this.rendi(r.pagina);
    const ev = cont.querySelector('[data-rilievo="' + r.id + '"]');
    (ev || cont).scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // Pannello dei rilievi ------------------------------------------------
  rilieviFiltrati() {
    const f = this.stato.filtro;
    const ordine = (r) => ORDINE_FASCE.indexOf(r.fascia);
    return this.stato.rilievi
      .filter((r) => f === 'tutti' || r.fascia === f)
      .slice()
      .sort((a, b) => (f === 'tutti' ? ordine(a) - ordine(b) : 0) || a.pagina - b.pagina || (a.inizio ?? -1) - (b.inizio ?? -1));
  }

  aggiornaPannello() {
    const lista = el('elenco-rilievi');
    svuota(lista);
    const rilievi = this.rilieviFiltrati();
    mostra(el('rilievi-vuoto'), rilievi.length === 0);
    el('rilievi-vuoto').textContent = this.stato.rilievi.length === 0 ? T.revisione.nessunRilievoAssoluto : T.revisione.nessunRilievo;
    for (const r of rilievi) lista.append(this.card(r));
    if (this.decisioniBloccate) for (const b of lista.querySelectorAll('button, select')) b.disabled = true;
  }

  card(r) {
    const R = T.revisione;
    const cat = CATEGORIE[r.categoria];
    const li = crea('li', { classe: 'rilievo rilievo--' + r.fascia + (this.stato.attivo === r.id ? ' rilievo--attivo' : ''), dataset: { card: r.id }, tabindex: '-1' });
    li.append(crea('div', { classe: 'rilievo-testata' }, [
      crea('span', { classe: 'rilievo-tipo', testo: cat.etichetta }),
      crea('span', { classe: 'etichetta-fascia etichetta-fascia--' + r.fascia, testo: r.origine === 'manuale' ? T.fasce.M : r.decisione === 'oscura' ? T.revisione.stati.oscura : r.decisione === 'mantieni' ? T.revisione.stati.mantieni : T.revisione.stati.daDecidere }),
    ]));
    li.append(crea('div', { classe: 'rilievo-testo', testo: r.testo || '—' }));
    const meta = crea('div', { classe: 'rilievo-meta' });
    meta.append(crea('p', {}, [
      R.pagina + ' ' + r.pagina + ' · ' + T.revisione.origine[r.origine]
        + (r.proposto ? ' · ' + (r.confermato || r.modificato ? R.propostaConfermata : R.proposto) + (r.propostaDa ? ' (' + SCOPI[r.propostaDa].etichetta + ')' : '') : ''),
    ]));
    if (r.soggetto && cat.nominativo) meta.append(crea('p', { testo: 'Soggetto n. ' + r.soggetto + (this.stato.modalita === 'pseudonimo' ? ' → [SOGGETTO ' + r.soggetto + ']' : '') }));
    if (r.nota && r.nota !== 'intestazione-istituzionale') meta.append(crea('p', { testo: r.nota }));
    const stato = crea('p', {}, [R.stato + ': ', crea('span', { classe: 'rilievo-stato rilievo-stato--' + (r.decisione || 'daDecidere'), testo: this.descriviStato(r) })]);
    meta.append(stato);
    if (r.motivazione) meta.append(crea('p', { testo: R.motivazioneTitolo + ': ' + r.motivazione }));
    li.append(meta);
    if (r.fascia === 'C' && r.motivoProposta) {
      li.append(crea('p', { classe: 'rilievo-messaggio', testo: r.motivoProposta }));
    } else if (cat.messaggio && (r.fascia === 'C' || r.fascia === 'P' || r.categoria === 'A4' || r.categoria === 'B4P' || r.categoria === 'B6' || r.categoria === 'B8')) {
      li.append(crea('p', { classe: 'rilievo-messaggio', testo: cat.messaggio }));
    }
    li.append(crea('details', {}, [
      crea('summary', { testo: R.fonte }),
      crea('p', { classe: 'nota', testo: cat.fonti.join('; ') }),
    ]));

    // Azioni.
    const azioni = crea('div', { classe: 'rilievo-azioni' });
    const pulsante = (testo, fn, secondario = true) => crea('button', { type: 'button', classe: 'pulsante pulsante--piccolo' + (secondario ? ' pulsante--secondario' : ''), testo, onclick: fn });
    if (r.fascia === 'C') {
      if (r.proposto && !r.confermato && !r.modificato) azioni.append(pulsante(R.confermaProposta, () => this.decidi(r, r.decisione), false));
      if (r.decisione !== 'oscura') azioni.append(pulsante(R.oscura, () => this.decidi(r, 'oscura'), !r.proposto));
      if (r.decisione !== 'mantieni') azioni.append(pulsante(R.mantieni, () => this.decidi(r, 'mantieni')));
    } else if (r.decisione === 'oscura') {
      azioni.append(pulsante(R.ripristina, () => this.ripristina(r)));
    } else {
      azioni.append(pulsante(R.riapplica, () => this.decidi(r, 'oscura'), false));
    }
    const occorrenze = r.chiave ? this.stato.rilievi.filter((x) => x.chiave === r.chiave && x.id !== r.id) : [];
    if (occorrenze.length && r.decisione) {
      azioni.append(pulsante(R.tutteOccorrenze + ' (' + (occorrenze.length + 1) + ')', () => this.applicaATutte(r)));
    }
    azioni.append(pulsante(R.vaiAllaPagina, () => this.vaiAllaPagina(r)));
    if (r.origine === 'manuale') azioni.append(pulsante(R.rimuovi, () => this.rimuovi(r)));
    if (r.decisione === 'oscura' && r.azione !== 'espungi') {
      const sel = crea('select', { 'aria-label': R.modalitaRilievo });
      for (const [v, t] of [['', R.modalitaPredefinita], ['pieno', T.modalita.pieno], ['omissis', T.modalita.omissis], ['pseudonimo', T.modalita.pseudonimo]]) {
        sel.append(crea('option', { value: v, testo: t, selected: (r.modalita || '') === v }));
      }
      sel.addEventListener('change', () => { if (this.decisioniBloccate) { sel.value = r.modalita || ''; return; } r.modalita = sel.value || null; this.suCambio('modalita'); });
      azioni.append(crea('label', { classe: 'nota', testo: R.modalitaRilievo + ' ' }, [sel]));
    }
    li.append(azioni);
    li.addEventListener('click', (ev) => {
      if (ev.target.closest('button, select, summary, details')) return;
      this.attiva(r.id);
    });
    return li;
  }

  // Decisioni ------------------------------------------------------------
  decidi(r, decisione, motivazione = '') {
    if (this.decisioniBloccate) return;
    this.stato.attivo = r.id;
    r.decisione = decisione;
    r.motivazione = motivazione;
    // Per la fascia C la decisione spetta sempre all'utente: si registra come
    // modifica solo il cambio di un esito predefinito (fasce A, B, P, C2 proposto).
    r.modificato = r.predefinita !== null && decisione !== r.predefinita;
    if (r.proposto) r.confermato = true;
    this.dopoCambio();
  }

  // Conferma in blocco tutte le proposte dello strumento.
  confermaTutteLeProposte() {
    if (this.decisioniBloccate) return;
    confermaProposte(this.stato.rilievi);
    this.dopoCambio();
  }

  // Decisione in blocco per categoria sui rilievi di fascia C.
  decidiCategoria(categoria, decisione) {
    if (this.decisioniBloccate) return;
    for (const x of this.stato.rilievi) {
      if (x.fascia !== 'C' || x.categoria !== categoria) continue;
      x.decisione = decisione;
      x.modificato = x.predefinita !== null && decisione !== x.predefinita;
      if (x.proposto) x.confermato = true;
    }
    this.dopoCambio();
  }

  numeroDaConfermare() {
    return daConfermare(this.stato.rilievi).length;
  }

  async ripristina(r) {
    const cat = CATEGORIE[r.categoria];
    const obbligatoria = cat.motivazione === 'obbligatoria';
    if (cat.motivazione === 'nessuna' && r.fascia !== 'A') {
      this.decidi(r, 'mantieni');
      return;
    }
    const esito = await apriDialogo({
      titolo: T.revisione.motivazioneTitolo,
      testo: r.fascia === 'A' ? T.revisione.motivazioneA : T.revisione.motivazioneB,
      motivazioneObbligatoria: obbligatoria,
    });
    if (!esito) return;
    this.decidi(r, 'mantieni', esito.motivazione);
  }

  applicaATutte(r) {
    if (this.decisioniBloccate) return;
    for (const x of this.stato.rilievi) {
      if (x.chiave === r.chiave && x.id !== r.id && x.decisione !== r.decisione) {
        x.decisione = r.decisione;
        x.motivazione = r.motivazione;
        x.modificato = x.predefinita !== null && x.decisione !== x.predefinita;
        if (x.proposto) x.confermato = true;
      }
    }
    this.dopoCambio();
  }

  rimuovi(r) {
    if (this.decisioniBloccate) return;
    this.stato.rilievi = this.stato.rilievi.filter((x) => x.id !== r.id);
    if (this.stato.attivo === r.id) this.stato.attivo = null;
    this.dopoCambio();
  }

  dopoCambio() {
    this.aggiornaEvidenze();
    this.aggiornaPannello();
    this.suCambio('decisione');
    // Il pannello è stato ricostruito: il focus torna alla scheda del rilievo
    // attivo, per chi naviga da tastiera.
    if (this.stato.attivo) {
      const card = document.querySelector('[data-card="' + this.stato.attivo + '"]');
      card?.focus({ preventScroll: true });
    }
  }

  // Durante la generazione le decisioni sono sospese: il documento in corso
  // di scrittura e il rapporto devono descrivere lo stesso stato.
  bloccaDecisioni(blocco) {
    this.decisioniBloccate = blocco;
    el('elenco-rilievi').setAttribute('aria-busy', blocco ? 'true' : 'false');
    for (const b of el('elenco-rilievi').querySelectorAll('button, select')) b.disabled = blocco;
    for (const id of ['conferma-proposte', 'blocco-oscura', 'blocco-mantieni', 'selezione-manuale', 'selezione-testo', 'selezione-area']) el(id).disabled = blocco;
    for (const b of document.querySelectorAll('.riepilogo-elenco .pulsante')) b.disabled = blocco;
  }

  // Rilascia pagine, osservatori e riferimenti al documento corrente.
  distruggi() {
    this.osservatore?.disconnect();
    this.osservatoreViste?.disconnect();
    for (const cont of this.contenitori.values()) this.liberaCanvas(cont);
    this.contenitori.clear();
    this.viewport1.clear();
    svuota(el('elenco-pagine'));
    svuota(el('elenco-rilievi'));
  }

  // Selezione manuale ----------------------------------------------------
  attivaSelezione(attiva) {
    this.stato.selezioneManuale = attiva;
    const b = el('selezione-manuale');
    b.setAttribute('aria-pressed', attiva ? 'true' : 'false');
    b.textContent = attiva ? T.revisione.selezioneManualeSpenta : T.revisione.selezioneManuale;
    mostra(el('selezione-manuale-nota'), attiva);
    el('selezione-manuale-nota').textContent = T.revisione.selezioneManualeAttiva;
    for (const cont of this.contenitori.values()) cont.querySelector('.pagina-livello').classList.toggle('selezione', attiva);
  }

  preparaSelezione(livello, numero) {
    let inizio = null;
    let rett = null;
    const posizione = (ev) => {
      const r = livello.getBoundingClientRect();
      return { x: Math.min(Math.max(ev.clientX - r.left, 0), r.width), y: Math.min(Math.max(ev.clientY - r.top, 0), r.height), w: r.width, h: r.height };
    };
    livello.addEventListener('pointerdown', (ev) => {
      if (!this.stato.selezioneManuale || ev.button !== 0) return;
      ev.preventDefault();
      inizio = posizione(ev);
      rett = crea('div', { classe: 'selezione-rettangolo' });
      livello.append(rett);
      livello.setPointerCapture(ev.pointerId);
    });
    livello.addEventListener('pointermove', (ev) => {
      if (!inizio) return;
      const p = posizione(ev);
      const x = Math.min(inizio.x, p.x), y = Math.min(inizio.y, p.y);
      rett.style.left = x + 'px'; rett.style.top = y + 'px';
      rett.style.width = Math.abs(p.x - inizio.x) + 'px'; rett.style.height = Math.abs(p.y - inizio.y) + 'px';
    });
    const fine = async (ev) => {
      if (!inizio) return;
      const p = posizione(ev);
      const sel = { x: Math.min(inizio.x, p.x), y: Math.min(inizio.y, p.y), w: Math.abs(p.x - inizio.x), h: Math.abs(p.y - inizio.y), W: p.w, H: p.h };
      inizio = null;
      rett.remove();
      rett = null;
      if (sel.w < 4 || sel.h < 4) return;
      await this.creaManuale(numero, sel);
    };
    livello.addEventListener('pointerup', fine);
    livello.addEventListener('pointercancel', () => { if (rett) rett.remove(); inizio = null; rett = null; });
  }

  async creaManuale(numero, sel, esitoPronto = null) {
    if (this.decisioniBloccate) return;
    const vp = this.viewport1.get(numero);
    const pagina = this.stato.documento.pagine[numero - 1];
    // Da pixel del livello a coordinate del viewport a scala 1, poi allo spazio utente.
    const rettVp = { left: sel.x / sel.W * vp.width, top: sel.y / sel.H * vp.height, width: sel.w / sel.W * vp.width, height: sel.h / sel.H * vp.height };
    const rettUtente = rettangoloVersoUtente(rettVp, vp);
    const intervalli = intervalliInRettangolo(pagina, rettUtente);
    let testo = '';
    let box = [];
    let inizio = null, fine = null;
    if (intervalli.length) {
      intervalli.sort((a, b) => a.inizio - b.inizio);
      inizio = intervalli[0].inizio;
      fine = intervalli[intervalli.length - 1].fine;
      testo = intervalli.map((i) => pagina.testo.slice(i.inizio, i.fine)).join(' ');
      for (const i of intervalli) box.push(...boxPerIntervallo(pagina, i.inizio, i.fine));
      box = unisciBox(box);
      // L'area tracciata resta sempre un oscuramento grafico: può contenere
      // anche una firma o un'immagine oltre al testo riconosciuto.
      box.push(rettUtente);
    } else {
      box = [rettUtente];
    }
    const esito = esitoPronto || await apriDialogo({
      titolo: T.revisione.manualeTitolo,
      testo: T.revisione.manualeSpiegazione + ' ' + (testo ? T.revisione.manualeTesto + ': «' + testo + '»' : T.revisione.manualeArea),
      categoria: true,
      etichettaMotivazione: T.revisione.manualeNota,
    });
    if (!esito) return;
    const r = creaRilievo({
      categoria: esito.categoria,
      pagina: numero,
      inizio, fine,
      intervalli: intervalli.length > 1 ? intervalli.map((i) => [i.inizio, i.fine]) : null,
      testo: testo || T.revisione.manualeArea,
      box,
      origine: 'manuale',
      rilevatore: 'manuale',
      nota: esito.motivazione,
      decisione: 'oscura',
      chiave: testo && CATEGORIE[esito.categoria].nominativo ? chiaveNominativo(testo) : null,
    });
    r.fascia = 'M';
    r.predefinita = 'oscura';
    this.stato.rilievi.push(r);
    assegnaSoggetti(this.stato.rilievi);
    this.stato.attivo = r.id;
    this.dopoCambio();
  }
}

// Finestra di dialogo modale per motivazioni e oscuramenti manuali.
export { apriDialogo };

// Oscuramento manuale per testo cercato: utilizzabile senza mouse, crea un
// rilievo per ogni occorrenza esatta nel documento.
Revisione.prototype.creaManualePerTesto = async function () {
  const R = T.revisione;
  const esito = await apriDialogo({
    titolo: R.selezioneTestoTitolo,
    testo: R.selezioneTestoSpiegazione + ' ' + R.manualeSpiegazione,
    categoria: true,
    cercaTesto: true,
    etichettaMotivazione: R.manualeNota,
  });
  if (!esito || !esito.cerca) return;
  const cercato = esito.cerca;
  const nuovi = [];
  for (const pagina of this.stato.documento.pagine) {
    let da = 0;
    for (;;) {
      const pos = pagina.testo.indexOf(cercato, da);
      if (pos < 0) break;
      da = pos + cercato.length;
      const box = unisciBox(boxPerIntervallo(pagina, pos, pos + cercato.length));
      if (!box.length) continue;
      const r = creaRilievo({
        categoria: esito.categoria,
        pagina: pagina.numero,
        inizio: pos, fine: pos + cercato.length,
        testo: cercato,
        box,
        origine: 'manuale',
        rilevatore: 'manuale-testo',
        nota: esito.motivazione,
        decisione: 'oscura',
        chiave: CATEGORIE[esito.categoria].nominativo ? chiaveNominativo(cercato) : null,
      });
      r.fascia = 'M';
      r.predefinita = 'oscura';
      nuovi.push(r);
    }
  }
  if (!nuovi.length) {
    window.alert(R.selezioneTestoNessuno);
    return;
  }
  this.stato.rilievi.push(...nuovi);
  assegnaSoggetti(this.stato.rilievi);
  this.stato.attivo = nuovi[0].id;
  this.dopoCambio();
  this.vaiAllaPagina(nuovi[0]);
};

// Oscuramento manuale di un'area indicata con numero di pagina e coordinate
// in percentuale (da sinistra, dall'alto, larghezza, altezza): utilizzabile
// da tastiera per firme e immagini senza testo riconosciuto.
Revisione.prototype.creaManualePerCoordinate = async function () {
  const R = T.revisione;
  const n = this.stato.documento.pagine.length;
  const esito = await apriDialogo({
    titolo: R.selezioneAreaTitolo,
    testo: R.selezioneAreaSpiegazione + ' ' + R.manualeSpiegazione,
    categoria: true,
    coordinate: n,
    etichettaMotivazione: R.manualeNota,
  });
  if (!esito || !esito.area) return;
  const { pagina: numero, sinistra, alto, larghezza, altezza } = esito.area;
  const vp = this.viewport1.get(numero);
  if (!vp) return;
  await this.creaManuale(numero, { x: sinistra / 100 * vp.width, y: alto / 100 * vp.height, w: larghezza / 100 * vp.width, h: altezza / 100 * vp.height, W: vp.width, H: vp.height }, esito);
};

function apriDialogo({ titolo, testo, categoria = false, motivazioneObbligatoria = false, etichettaMotivazione, cercaTesto = false, coordinate = 0 }) {
  const d = el('dialogo');
  const R = T.revisione;
  el('dialogo-titolo').textContent = titolo;
  el('dialogo-testo').textContent = testo;
  mostra(el('dialogo-categoria-campo'), categoria);
  mostra(el('dialogo-testo-campo'), cercaTesto);
  mostra(el('dialogo-area-campo'), coordinate > 0);
  el('dialogo-area-campo').disabled = !(coordinate > 0);
  el('dialogo-area-etichetta').textContent = R.selezioneAreaEtichetta;
  const campiArea = ['dialogo-area-pagina', 'dialogo-area-sinistra', 'dialogo-area-alto', 'dialogo-area-larghezza', 'dialogo-area-altezza'].map(el);
  if (coordinate > 0) {
    campiArea[0].max = String(coordinate);
    campiArea[0].value = '1';
    campiArea[1].value = '10'; campiArea[2].value = '10'; campiArea[3].value = '30'; campiArea[4].value = '10';
    for (const [i, id] of ['dialogo-area-pagina-etichetta', 'dialogo-area-sinistra-etichetta', 'dialogo-area-alto-etichetta', 'dialogo-area-larghezza-etichetta', 'dialogo-area-altezza-etichetta'].entries()) {
      el(id).textContent = [R.pagina, R.areaSinistra, R.areaAlto, R.areaLarghezza, R.areaAltezza][i];
    }
  }
  el('dialogo-testo-etichetta').textContent = R.selezioneTestoEtichetta;
  el('dialogo-testo-nota').textContent = '';
  const cerca = el('dialogo-testo-cerca');
  cerca.value = '';
  cerca.required = cercaTesto;
  el('dialogo-categoria-etichetta').textContent = R.manualeCategoria;
  const sel = el('dialogo-categoria');
  svuota(sel);
  sel.required = categoria;
  if (categoria) {
    sel.append(crea('option', { value: '', testo: R.manualeScegli }));
    for (const id of CATEGORIE_MANUALI) sel.append(crea('option', { value: id, testo: CATEGORIE[id].etichetta }));
  }
  el('dialogo-motivazione-etichetta').textContent = etichettaMotivazione || R.motivazioneTitolo;
  const area = el('dialogo-motivazione');
  area.value = '';
  area.placeholder = R.motivazioneSegnaposto;
  mostra(el('dialogo-obbligo'), false);
  el('dialogo-obbligo').textContent = R.motivazioneObbligatoria;
  el('dialogo-annulla').textContent = R.annulla;
  el('dialogo-salva').textContent = R.salva;

  return new Promise((risolvi) => {
    const form = el('dialogo-form');
    const pulisci = () => {
      form.removeEventListener('submit', suInvio);
      el('dialogo-annulla').removeEventListener('click', suAnnulla);
      d.removeEventListener('cancel', suAnnulla);
    };
    const suAnnulla = (ev) => { ev.preventDefault(); pulisci(); d.close(); risolvi(null); };
    const suInvio = (ev) => {
      ev.preventDefault();
      const motivazione = area.value.trim();
      if (motivazioneObbligatoria && !motivazione) { mostra(el('dialogo-obbligo'), true); area.focus(); return; }
      if (cercaTesto && !cerca.value.trim()) { cerca.focus(); return; }
      if (categoria && !sel.value) { sel.focus(); return; }
      let coordinateArea = null;
      if (coordinate > 0) {
        const v = campiArea.map((c) => Number(c.value));
        if (v.some((x) => !Number.isFinite(x)) || v[0] < 1 || v[0] > coordinate || v[3] <= 0 || v[4] <= 0) { campiArea[0].focus(); return; }
        coordinateArea = { pagina: Math.round(v[0]), sinistra: Math.max(0, v[1]), alto: Math.max(0, v[2]), larghezza: Math.min(100, v[3]), altezza: Math.min(100, v[4]) };
      }
      pulisci();
      d.close();
      risolvi({ categoria: sel.value || null, motivazione, cerca: cercaTesto ? cerca.value.trim() : null, area: coordinateArea });
    };
    form.addEventListener('submit', suInvio);
    el('dialogo-annulla').addEventListener('click', suAnnulla);
    d.addEventListener('cancel', suAnnulla);
    d.showModal();
    (coordinate > 0 ? campiArea[0] : cercaTesto ? cerca : categoria ? sel : area).focus();
  });
}
