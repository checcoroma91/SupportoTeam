/* ============================================================
   V5 CRQ — CRUD + FILTERS + SORT + RENDER + EXPORT + HELP
   Cleaned & Fixed Version (2026-02-06)
   NOTE: assumes helpers present globally: escapeHtml, quoteCSV,
         downloadBlob, saveState, openDialogById, closeDialog, toast,
         and a global `state` with `crq: []`.
   This file polyfills $ / $$ if missing.
   ============================================================ */

'use strict';

// -- helpers dom (polyfill if missing) ------------------------
window.$  = window.$  || ((sel, root = document) => root.querySelector(sel));
window.$$ = window.$$ || ((sel, root = document) => Array.from(root.querySelectorAll(sel)));

/* ------------------------------------------------------------
   NORMALIZATION
------------------------------------------------------------ */
function normalizeCRQ(o = {}) {
  return {
    id: o && o.id ? String(o.id) : (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    rfcAperti: String(o && o.rfcAperti ? o.rfcAperti : '').trim(),
    stato: String(o && o.stato ? o.stato : '').trim(),
    dataApertura: String(o && o.dataApertura ? o.dataApertura : '').trim(),
    anno: String(o && o.anno ? o.anno : '').trim(),

    // Bhelp Operatore (RFC)
    bhelp: String(
      (o && (o.bhelp || o.bhelpOperatore || o.bhelpOperatoreRFC || o['Bhelp Operatore (RFC)'])) || ''
    ).trim(),

    emerg: String(o && (o.emerg || o.emergenza) ? (o.emerg || o.emergenza) : '').trim(),
    utilizzato: String(o && o.utilizzato ? o.utilizzato : '').trim(),
    categoria: String(o && o.categoria ? o.categoria : '').trim(),
    dataRilascio: String(o && o.dataRilascio ? o.dataRilascio : '').trim(),
    rifNostro: String(o && o.rifNostro ? o.rifNostro : '').trim(),
    prj: String(o && o.prj ? o.prj : '').trim(),
    contenuto: String(o && o.contenuto ? o.contenuto : '').trim(),
  };
}

/* ------------------------------------------------------------
   OPEN CRQ EDITOR
------------------------------------------------------------ */
function openCrqEditor(item) {
  const dlg = document.getElementById('crqEditorDlg');
  if (!dlg) return;

  document.getElementById('crqDlgTitle').textContent = item ? 'Modifica CRQ' : 'Nuova CRQ';

  // 1) Popola stati
  populateCrqStati();

  // Auto-fill bhelp
  bindCrqBhelpAutoFill();

  // 2) Imposta valori
  $('#crqStato').value = item?.stato || '';
  // Auto-valorizza il campo Bhelp
  $('#crqBhelp').value = (item?.bhelp) || (CRQ_BHELP_MAP[$('#crqStato').value] || '');

  // Altri campi
  $('#crqRfcAperti').value = item?.rfcAperti || '';
  $('#crqDataApertura').value = item?.dataApertura || '';
  $('#crqEmerg').value = item?.emerg || '';
  $('#crqCategoria').value = item?.categoria || '';
  $('#crqDataRilascio').value = item?.dataRilascio || '';
  $('#crqRifNostro').value = item?.rifNostro || '';
  $('#crqPrj').value = item?.prj || '';
  $('#crqContenuto').value = item?.contenuto || '';

  dlg.dataset.editing = item ? String(item.id) : '';
  openDialogById('crqEditorDlg');
}

document.getElementById('crqSaveBtn')?.addEventListener('click', saveCrqDialog);

/* ------------------------------------------------------------
   SAVE CRQ
------------------------------------------------------------ */
function saveCrqDialog() {
  const dlg = document.getElementById('crqEditorDlg');
  const id = dlg?.dataset?.editing || '';

  const obj = normalizeCRQ({
    rfcAperti: $('#crqRfcAperti').value.trim(),
    stato: $('#crqStato').value.trim(),
    dataApertura: $('#crqDataApertura').value.trim(),
    emerg: $('#crqEmerg').value.trim(),
    categoria: $('#crqCategoria').value.trim(),
    dataRilascio: $('#crqDataRilascio').value.trim(),
    rifNostro: $('#crqRifNostro').value.trim(),
    prj: $('#crqPrj').value.trim(),
    contenuto: $('#crqContenuto').value.trim()
  });

  if (!obj.rfcAperti) {
    alert('RFC Aperti è obbligatorio.');
    return;
  }

  state.crq = Array.isArray(state.crq) ? state.crq : [];

  if (id) {
    const idx = state.crq.findIndex(c => String(c.id) === String(id));
    if (idx >= 0) state.crq[idx] = { ...obj, id };
  } else {
    state.crq.unshift(obj);
  }

  saveState(state);
  closeDialog(dlg);
  renderCrq();
}

/* ------------------------------------------------------------
   DELETE CRQ
------------------------------------------------------------ */
window.deleteCrq = function (id) {
  if (!confirm('Eliminare questa CRQ?')) return;
  const arr = Array.isArray(state.crq) ? state.crq : [];
  state.crq = arr.filter(c => String(c.id) !== String(id));
  saveState(state);
  renderCrq();
};

/* ------------------------------------------------------------
   EDIT HANDLER
------------------------------------------------------------ */
window.openCrqEditorById = function (id) {
  const it = (Array.isArray(state.crq) ? state.crq : []).find(c => String(c.id) === String(id));
  if (it) openCrqEditor(it);
};

/* ------------------------------------------------------------
   CRQ FILTER STATE
------------------------------------------------------------ */
const CRQF_KEY = 'tsa.v5.crqfilter';
function defaultCrqFilter() {
  return {
    text: '',
    rfc: '',
    anno: '',
    emerg: [],
    util: [],
    stati: [],
    categoria: '',
    rif: '',
    prj: '',
    contenuto: '',
    aperturaFrom: '',
    aperturaTo: '',
    rilFrom: '',
    rilTo: '',
    id: '' // opzionale: filtro diretto per ID
  };
}
function loadCrqFilter() {
  try {
    const raw = localStorage.getItem(CRQF_KEY);
    if (!raw) return defaultCrqFilter();
    return { ...defaultCrqFilter(), ...JSON.parse(raw) };
  } catch (_) {
    return defaultCrqFilter();
  }
}
function saveCrqFilter(f) {
  try {
    localStorage.setItem(CRQF_KEY, JSON.stringify({ ...defaultCrqFilter(), ...f }));
  } catch (_) {}
}
let crqFilter = loadCrqFilter();

const CRQ_STATI = [
  'Bozza',
  'Richiesta autorizzazione',
  'Pianificazione in corso',
  'Revisione pianificata',
  'Approvazione pianificata',
  'Pianificato',
  'Implementazione in corso',
  'Completato',
  'Chiuso'
];
function populateCrqStati() {
  const sel = document.getElementById('crqStato');
  if (!sel) return;
  const stati = CRQ_STATI;
  sel.innerHTML =
    "<option value=''>n/d</option>" +
    stati.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Mappa Stato CRQ -> Bhelp Operatore (RFC)
const CRQ_BHELP_MAP = {
  'Bozza': 'n.a.',
  'Richiesta autorizzazione': 'Verifica Referente Servizio IT',
  'Pianificazione in corso': 'Deploy Test / Esecuzione Test',
  'Revisione pianificata': 'Completamento Test',
  'Approvazione pianificata': 'Verifica ICT',
  'Pianificato': 'n.a.',
  'Implementazione in corso': 'Preparazione Installazione / Installazione',
  'Completato': 'n.a.',
  'Chiuso': 'Chiuso Deploy'
};
function bindCrqBhelpAutoFill() {
  const sel = document.getElementById('crqStato');
  const out = document.getElementById('crqBhelp');
  if (!sel || !out) return;
  sel.addEventListener('change', () => {
    const stato = sel.value;
    out.value = CRQ_BHELP_MAP[stato] || '';
  });
}

/* ------------------------------------------------------------
   OPEN FILTER DIALOG
------------------------------------------------------------ */
window.openCrqFilterDialog = function () {
  const dlg = document.getElementById('crqFilterDlg');
  if (!dlg) return;

  $('#crqfText').value = crqFilter.text || '';
  $('#crqfRfc').value = crqFilter.rfc || '';
  $('#crqfAnno').value = crqFilter.anno || '';
  $('#crqfCategoria').value = crqFilter.categoria || '';
  $('#crqfRif').value = crqFilter.rif || '';
  $('#crqfPrj').value = crqFilter.prj || '';
  $('#crqfContenuto').value = crqFilter.contenuto || '';
  $('#crqfAperturaFrom').value = crqFilter.aperturaFrom || '';
  $('#crqfAperturaTo').value = crqFilter.aperturaTo || '';
  $('#crqfRilFrom').value = crqFilter.rilFrom || '';
  $('#crqfRilTo').value = crqFilter.rilTo || '';

  // emergenza/utilizzato/stati
  $$('#crqfEmergGroup input[type=checkbox]').forEach(cb => {
    cb.checked = (crqFilter.emerg || []).includes(cb.value);
  });
  $$('#crqfUtilGroup input[type=checkbox]').forEach(cb => {
    cb.checked = (crqFilter.util || []).includes(cb.value);
  });
  $$('#crqfStatiGroup input[type=checkbox]').forEach(cb => {
    cb.checked = (crqFilter.stati || []).includes(cb.value);
  });

  openDialogById('crqFilterDlg');
};

document.getElementById('crqfResetBtn')?.addEventListener('click', () => {
  crqFilter = defaultCrqFilter();
  saveCrqFilter(crqFilter);
  renderCrq();
  closeDialog(document.getElementById('crqFilterDlg'));
});

document.getElementById('crqfApplyBtn')?.addEventListener('click', () => {
  function splitList(v) {
    return String(v || '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
  }
  function getChecked(id) {
    return $$('#' + id + ' input[type=checkbox]')
      .filter(cb => cb.checked)
      .map(cb => cb.value);
  }

  crqFilter = {
    text: $('#crqfText').value.trim().toLowerCase(),
    rfc: $('#crqfRfc').value.trim(),
    anno: $('#crqfAnno').value.trim(),
    emerg: getChecked('crqfEmergGroup'),
    util: getChecked('crqfUtilGroup'),
    stati: getChecked('crqfStatiGroup'),
    categoria: $('#crqfCategoria').value.trim().toLowerCase(),
    rif: $('#crqfRif').value.trim().toLowerCase(),
    prj: $('#crqfPrj').value.trim().toLowerCase(),
    contenuto: $('#crqfContenuto').value.trim().toLowerCase(),
    aperturaFrom: $('#crqfAperturaFrom').value.trim(),
    aperturaTo: $('#crqfAperturaTo').value.trim(),
    rilFrom: $('#crqfRilFrom').value.trim(),
    rilTo: $('#crqfRilTo').value.trim(),
    id: crqFilter.id || ''
  };

  saveCrqFilter(crqFilter);
  renderCrq();
  closeDialog(document.getElementById('crqFilterDlg'));
});

/* ------------------------------------------------------------
   FILTER LOGIC
------------------------------------------------------------ */
function inRange(val, from, to) {
  if (!val) return true;
  try {
    const v = new Date(val).toISOString().slice(0, 10);
    if (from && v < from) return false;
    if (to && v > to) return false;
    return true;
  } catch (_) { return true; }
}

function applyCrqFilters(rows) {
  // Filtro diretto per ID (da notifiche)
  if (crqFilter && crqFilter.id) {
    return (Array.isArray(rows) ? rows : []).filter(r => String(r.id) === String(crqFilter.id));
  }
  const f = { ...defaultCrqFilter(), ...crqFilter };
  const list = Array.isArray(rows) ? rows : [];

  return list.filter(o => {
    const bag = [
      o.rfcAperti, o.categoria, o.contenuto,
      o.rifNostro, o.prj, o.anno
    ].map(x => String(x || '')).join(' ').toLowerCase();

    if (f.text && !bag.includes(f.text)) return false;

    if (f.rfc && !String(o.rfcAperti || '').toLowerCase().includes(f.rfc.toLowerCase())) return false;

    if (f.anno && String(o.anno || '') !== f.anno) return false;

    if (f.emerg.length) {
      const v = String(o.emerg || '').replace('ì', 'i').trim();
      if (!f.emerg.includes(v)) return false;
    }

    if (f.util.length) {
      const v = String(o.utilizzato || '').toLowerCase();
      if (!f.util.includes(v)) return false;
    }

    if (f.stati.length) {
      const v = String(o.stato || '').trim();
      if (!f.stati.includes(v)) return false;
    }

    if (f.categoria && !String(o.categoria || '').toLowerCase().includes(f.categoria)) return false;
    if (f.rif && !String(o.rifNostro || '').toLowerCase().includes(f.rif)) return false;
    if (f.prj && !String(o.prj || '').toLowerCase().includes(f.prj)) return false;
    if (f.contenuto && !String(o.contenuto || '').toLowerCase().includes(f.contenuto)) return false;

    if (!inRange(o.dataApertura || '', f.aperturaFrom || '', f.aperturaTo || '')) return false;
    if (!inRange(o.dataRilascio || '', f.rilFrom || '', f.rilTo || '')) return false;

    return true;
  });
}

/* ------------------------------------------------------------
   SORTING
------------------------------------------------------------ */
let crqSort = { key: 'dataApertura', dir: 'desc' };
window.setCrqSort = function (k) {
  if (crqSort.key === k) {
    crqSort.dir = (crqSort.dir === 'asc' ? 'desc' : 'asc');
  } else {
    crqSort.key = k;
    crqSort.dir = (k === 'dataApertura' ? 'desc' : 'asc');
  }
  renderCrq();
};
function sortCrqRows(rows) {
  const k = crqSort.key;
  the d = crqSort.dir === 'desc' ? -1 : 1;
  const list = Array.isArray(rows) ? rows.slice() : [];
  return list.sort((x, y) => {
    let r = 0;
    if (k === 'dataApertura' || k === 'dataRilascio') {
      const ax = String(x[k] || '');
      const ay = String(y[k] || '');
      r = ax < ay ? -1 : ax > ay ? 1 : 0;
    } else {
      r = String(x[k] || '').localeCompare(String(y[k] || ''));
    }
    return r * d;
  });
}

/* ------------------------------------------------------------
   RENDER TABLE
------------------------------------------------------------ */
function renderCrq() {
  const tbl = document.getElementById('crqTable');
  if (!tbl) return;
  const all = Array.isArray(state.crq) ? state.crq : [];
  const filtered = applyCrqFilters(all);
  const rows = sortCrqRows(filtered);
  $('#crqCount').textContent = `${rows.length} risultati su ${all.length}`;

  function th(k, label) {
    return `<th class='sortable' onclick="setCrqSort('${k}')">` +
      label + (crqSort.key === k ? ` <span class='arrow'>${crqSort.dir === 'asc' ? '↑' : '↓'}</span>` : '') +
      `</th>`;
  }

  const thead =
    '<thead><tr>' +
    th('rfcAperti','RFC Aperti') +
    th('stato','Stato') +
    th('dataApertura','Apertura') +
    th('emerg','Emergenza') +
    th('categoria','Categoria') +
    th('dataRilascio','Rilascio') +
    th('rifNostro','Rif nostro') +
    th('prj','PRJ') +
    th('contenuto','Contenuto') +
    '<th>Azioni</th>' +
    '</tr></thead>';

  if (!rows.length) {
    tbl.innerHTML = thead +
      "<tbody><tr><td colspan='13'><div class='muted'>Nessuna CRQ</div></td></tr></tbody>";
    return;
  }

  const tbody = '<tbody>' +
    rows.map(o => (
      '<tr>' +
      '<td><strong>' + escapeHtml(o.rfcAperti) + '</strong></td>' +
      "<td><span class='badge state'>" + escapeHtml(o.stato) + '</span></td>' +
      '<td>' + escapeHtml(o.dataApertura || '') + '</td>' +
      '<td>' + escapeHtml(o.emerg || '') + '</td>' +
      '<td>' + escapeHtml(o.categoria || '') + '</td>' +
      '<td>' + escapeHtml(o.dataRilascio || '') + '</td>' +
      '<td>' + escapeHtml(o.rifNostro || '') + '</td>' +
      '<td>' + escapeHtml(o.prj || '') + '</td>' +
      "<td class='col-multiline'>" + escapeHtml(o.contenuto || '') + '</td>' +
      "<td><div class='table-actions'>" +
      `<button onclick="openCrqEditorById('${String(o.id)}')">✏️</button>` +
      `<button class='danger' onclick="deleteCrq('${String(o.id)}')">🗑️</button>` +
      '</div></td>' +
      '</tr>'
    )).join('') +
    '</tbody>';

  tbl.innerHTML = thead + tbody;
}

/* ------------------------------------------------------------
   EXPORT JSON
------------------------------------------------------------ */
document.querySelector("[data-do='crqSave']")?.addEventListener('click', () => {
  const blob = new Blob([
    JSON.stringify({ crq: Array.isArray(state.crq) ? state.crq : [] }, null, 2)
  ], { type: 'application/json' });
  downloadBlob(blob, 'crq.json');
});

/* ------------------------------------------------------------
   IMPORT JSON
------------------------------------------------------------ */
window.importCrqFromFile = async function () {
  try {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json';
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      const txt = await file.text();
      const json = JSON.parse(txt);
      const arr = Array.isArray(json) ? json : (Array.isArray(json?.crq) ? json.crq : []);
      state.crq = arr.map(o => normalizeCRQ(o));
      saveState(state);
      renderCrq();
      toast('CRQ importate ✔');
    };
    inp.click();
  } catch (e) {
    alert('Errore import CRQ: ' + (e && e.message));
  }
};

document.querySelector("[data-do='crqLoad']")?.addEventListener('click', importCrqFromFile);

/* ------------------------------------------------------------
   EXPORT CSV
------------------------------------------------------------ */
document.querySelector("[data-do='crqCSV']")?.addEventListener('click', () => {
  const rows = sortCrqRows(applyCrqFilters(Array.isArray(state.crq) ? state.crq : []));
  const head = [
    'ID','RFC Aperti','Stato','Apertura','Anno','Emergenza',
    'Utilizzato','Categoria','Rilascio','Rif nostro','PRJ','Contenuto'
  ];
  const csv = [head.join(';')]
    .concat(rows.map(o => [
      o.id,
      o.rfcAperti,
      o.stato,
      o.dataApertura,
      o.anno,
      o.emerg,
      o.utilizzato,
      o.categoria,
      o.dataRilascio,
      o.rifNostro,
      o.prj,
      o.contenuto
    ].map(v => quoteCSV(v)).join(';')))
    .join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'crq.csv');
});

/* ------------------------------------------------------------
   EXPORT EXCEL (.xls XML Spreadsheet 2003)
------------------------------------------------------------ */
document.querySelector("[data-do='crqXLS']")?.addEventListener('click', () => {
  const rows = sortCrqRows(applyCrqFilters(Array.isArray(state.crq) ? state.crq : []));

  function xmlEsc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }
  function cell(v,type){
    return `<Cell><Data ss:Type="${type||'String'}">${xmlEsc(v)}</Data></Cell>`;
  }

  const head = [
    'ID','RFC Aperti','Stato','Apertura','Anno','Emergenza',
    'Utilizzato','Categoria','Rilascio','Rif nostro','PRJ','Contenuto'
  ];

  let xml =
    `<?xml version="1.0"?>\n` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ` +
    `xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n` +
    `<Worksheet ss:Name="CRQ"><Table>`;

  xml += `<Row>` + head.map(h => cell(h)).join('') + `</Row>`;

  rows.forEach(o => {
    xml += `<Row>`
      + cell(o.id)
      + cell(o.rfcAperti)
      + cell(o.stato)
      + cell(o.dataApertura)
      + cell(o.anno)
      + cell(o.emerg)
      + cell(o.utilizzato)
      + cell(o.categoria)
      + cell(o.dataRilascio)
      + cell(o.rifNostro)
      + cell(o.prj)
      + cell(o.contenuto)
      + `</Row>`;
  });

  xml += `</Table></Worksheet></Workbook>`;

  downloadBlob(new Blob([xml], { type: 'application/vnd.ms-excel' }), 'crq.xls');
});

/* ------------------------------------------------------------
   CLEAR ALL CRQ
------------------------------------------------------------ */
document.querySelector("[data-do='crqClear']")?.addEventListener('click', () => {
  if (!confirm('Confermi? Saranno eliminate TUTTE le CRQ.')) return;
  state.crq = [];
  saveState(state);
  renderCrq();
});

/* ------------------------------------------------------------
   HELP CRQ — MAPPATURA STATI (CLICK TO COPY)
------------------------------------------------------------ */
(function initCrqHelp() {
  const tbl = document.getElementById('helpCrqTable');
  if (!tbl) return;

  function copyRow(tr) {
    const bmc = tr.getAttribute('data-bmc') || '';
    const bhelp = tr.getAttribute('data-bhelp') || '';
    const note = tr.getAttribute('data-note') || '';
    const text = `BMC: ${bmc}  Bhelp: ${bhelp}${note ? `  Note: ${note}` : ''}`;
    navigator.clipboard.writeText(text)
      .then(() => toast('Copiato ✔'))
      .catch(() => alert('Impossibile copiare'));
  }

  $$('#helpCrqTable tbody tr').forEach(tr => {
    tr.addEventListener('click', () => copyRow(tr));
    tr.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        copyRow(tr);
      }
    });
  });
})();
