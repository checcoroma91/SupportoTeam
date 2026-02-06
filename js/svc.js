/* ============================================================
   V5 SERVICES — CRUD + FILTERS + SORT + RENDER + EXPORT
   Cleaned & Fixed Version (2026-02-06)
   NOTE: assumes helpers present globally: $, $$, escapeHtml, quoteCSV,
         downloadBlob, saveState, openDialogById, closeDialog, toast,
         and a global `state` with `services: []`.
   ============================================================ */

'use strict';

/* ------------------------------------------------------------
   NORMALIZATION
------------------------------------------------------------ */
function normalizeService(s = {}) {
  return {
    id: s.id ? String(s.id) : (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),

    routine: String(s.routine || '').trim(),
    tipo: (String(s.tipo || 'REST').toUpperCase() === 'SOAP') ? 'SOAP' : 'REST',
    servizio: String(s.servizio || '').trim(),

    operation: String(
      s.operation ||
      s['operation / parametro'] ||
      ''
    ).trim(),

    fallback: String(
      s.fallback ||
      s['fallback JDBC/SWP'] ||
      ''
    ).trim(),

    descrizione: String(s.descrizione || '').trim(),
    ambito: String(s.ambito || '').trim(),

    applicativo: String(
      s.applicativo ||
      s['applicativo'] ||
      ''
    ).trim(),

    paramsIngresso: String(
      s.paramsIngresso ||
      s['parametriIngresso'] ||
      s['paramsIngresso'] ||
      ''
    ).trim(),

    outputServizio: String(
      s.outputServizio ||
      s['output'] ||
      ''
    ).trim(),

    stato: String(s.stato || '').trim(),
  };
}

/* ------------------------------------------------------------
   OPEN SERVICE DIALOG
------------------------------------------------------------ */
function openServiceDialog(item) {
  const dlg = document.getElementById('serviceDialog');
  if (!dlg) return;

  document.getElementById('svcDlgTitle').textContent = item ? 'Modifica servizio' : 'Nuovo servizio';

  $('#svcRoutine').value = item?.routine || '';
  $('#svcTipo').value = item?.tipo || 'REST';
  $('#svcServizio').value = item?.servizio || '';
  $('#svcOperation').value = item?.operation || '';
  $('#svcFallback').value = item?.fallback || '';
  $('#svcDescrizione').value = item?.descrizione || '';
  $('#svcAmbito').value = item?.ambito || '';
  $('#svcApplicativo').value = item?.applicativo || '';
  $('#svcParamsIn').value = item?.paramsIngresso || '';
  $('#svcOutput').value = item?.outputServizio || '';

  dlg.dataset.editing = item ? String(item.id) : '';
  openDialogById('serviceDialog');
}

document.getElementById('svcSaveBtn')?.addEventListener('click', saveServiceDialog);

/* ------------------------------------------------------------
   SAVE SERVICE
------------------------------------------------------------ */
function saveServiceDialog() {
  const dlg = document.getElementById('serviceDialog');
  const id = dlg?.dataset?.editing || '';

  const obj = normalizeService({
    routine: $('#svcRoutine').value.trim(),
    tipo: $('#svcTipo').value.trim(),
    servizio: $('#svcServizio').value.trim(),
    operation: $('#svcOperation').value.trim(),
    fallback: $('#svcFallback').value.trim(),
    descrizione: $('#svcDescrizione').value.trim(),
    ambito: $('#svcAmbito').value.trim(),
    applicativo: $('#svcApplicativo').value.trim(),
    paramsIngresso: $('#svcParamsIn').value.trim(),
    outputServizio: $('#svcOutput').value.trim(),
    stato: ''
  });

  if (!obj.routine || !obj.servizio) {
    alert('ROUTINE e SERVIZIO sono obbligatori.');
    return;
  }

  state.services = Array.isArray(state.services) ? state.services : [];

  if (id) {
    const i = state.services.findIndex(x => String(x.id) === String(id));
    if (i >= 0) state.services[i] = { ...obj, id };
  } else {
    state.services.unshift(obj);
  }

  saveState(state);
  closeDialog(dlg);
  renderServices();
}

/* ------------------------------------------------------------
   DELETE SERVICE
------------------------------------------------------------ */
window.deleteService = function (id) {
  if (!confirm('Eliminare questo servizio?')) return;
  const arr = Array.isArray(state.services) ? state.services : [];
  state.services = arr.filter(s => String(s.id) !== String(id));
  saveState(state);
  renderServices();
};

/* ------------------------------------------------------------
   EDIT SERVICE
------------------------------------------------------------ */
window.editService = function (id) {
  const arr = Array.isArray(state.services) ? state.services : [];
  const it = arr.find(s => String(s.id) === String(id));
  if (it) openServiceDialog(it);
};

/* ------------------------------------------------------------
   FILTER STATE
------------------------------------------------------------ */
const SVCF_KEY = 'tsa.v5.svcfilter';

function defaultSvcFilter() {
  return {
    text: '',
    tipi: ['REST', 'SOAP'],
    ambiti: [],
    routine: [],
    servizi: [],
    applicativi: [],
    fallback: [],
    operations: [],
    params: [],
    outputs: [],
    stati: []
  };
}

function loadSvcFilter() {
  try {
    const raw = localStorage.getItem(SVCF_KEY);
    if (!raw) return defaultSvcFilter();
    return { ...defaultSvcFilter(), ...JSON.parse(raw) };
  } catch (_) {
    return defaultSvcFilter();
  }
}

function saveSvcFilter(f) {
  try {
    localStorage.setItem(SVCF_KEY, JSON.stringify({ ...defaultSvcFilter(), ...f }));
  } catch (_) {}
}

let svcFilter = loadSvcFilter();

/* ------------------------------------------------------------
   OPEN FILTER DIALOG
------------------------------------------------------------ */
window.openSvcFilterDialog = function () {
  const dlg = document.getElementById('svcFilterDlg');
  if (!dlg) return;

  populateSvcStatoChips();

  // Stile pills/ripple
  document.getElementById('svcfTipoGroup')?.classList.add('checks');
  document.getElementById('svcfStatoGroup')?.classList.add('checks');

  // Forza fieldset full-span
  const tipoFs = document.querySelector('#svcfTipoGroup')?.closest('fieldset');
  const statoFs = document.querySelector('#svcfStatoGroup')?.closest('fieldset');
  tipoFs?.classList.add('full-span');
  statoFs?.classList.add('full-span');

  // Griglia a 3 colonne nel body
  const body = dlg.querySelector('.modal-body');
  if (body) body.classList.add('grid-3');

  // Valori input
  $('#svcfText').value = svcFilter.text || '';
  $('#svcfId').value = svcFilter.idContains || '';
  $('#svcfRoutine').value = (svcFilter.routine || []).join(', ');
  $('#svcfServizi').value = (svcFilter.servizi || []).join(', ');
  $('#svcfDescrizione').value = svcFilter.descrizioneContains || '';
  $('#svcfAmbiti').value = (svcFilter.ambiti || []).join(', ');
  $('#svcfApplicativi').value = (svcFilter.applicativi || []).join(', ');
  $('#svcfFallback').value = (svcFilter.fallback || []).join(', ');
  $('#svcfOperation').value = (svcFilter.operations || []).join(', ');
  $('#svcfParamsIn').value = (svcFilter.params || []).join(', ');
  $('#svcfOutput').value = (svcFilter.outputs || []).join(', ');

  // Tipi
  $$('#svcfTipoGroup input[type=checkbox]').forEach(cb => {
    cb.checked = (svcFilter.tipi || []).includes(cb.value);
  });

  // Stati
  $$('#svcfStatoGroup input[type=checkbox]').forEach(cb => {
    cb.checked = (svcFilter.stati || []).includes(cb.value);
  });

  openDialogById('svcFilterDlg');
};

// Chips dinamiche per Stato Servizi
function populateSvcStatoChips() {
  const grp = document.getElementById('svcfStatoGroup');
  if (!grp) return;
  const stati = ['OK', 'KO', 'ATTIVO', 'ERRORE'];
  grp.innerHTML = stati
    .map(st => `
      <div class="svc-chip">
        <input type="checkbox" id="svcf_stato_${st.toLowerCase()}" value="${st}">
        <label for="svcf_stato_${st.toLowerCase()}">${st}</label>
      </div>
    `)
    .join('');
}

document.getElementById('svcfResetBtn')?.addEventListener('click', () => {
  svcFilter = defaultSvcFilter();
  saveSvcFilter(svcFilter);
  renderServices();
  closeDialog(document.getElementById('svcFilterDlg'));
});

document.getElementById('svcfApplyBtn')?.addEventListener('click', () => {
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

  svcFilter = {
    text: $('#svcfText').value.trim().toLowerCase(),
    idContains: $('#svcfId').value.trim(),
    routine: splitList($('#svcfRoutine').value),
    servizi: splitList($('#svcfServizi').value),
    tipi: getChecked('svcfTipoGroup'),
    descrizioneContains: $('#svcfDescrizione').value.trim().toLowerCase(),
    ambiti: splitList($('#svcfAmbiti').value).map(s => s.toLowerCase()),
    applicativi: splitList($('#svcfApplicativi').value).map(s => s.toLowerCase()),
    fallback: splitList($('#svcfFallback').value).map(s => s.toLowerCase()),
    operations: splitList($('#svcfOperation').value).map(s => s.toLowerCase()),
    params: splitList($('#svcfParamsIn').value).map(s => s.toLowerCase()),
    outputs: splitList($('#svcfOutput').value).map(s => s.toLowerCase()),
    stati: getChecked('svcfStatoGroup'),
  };

  saveSvcFilter(svcFilter);
  renderServices();
  closeDialog(document.getElementById('svcFilterDlg'));
});

/* ------------------------------------------------------------
   FILTER LOGIC
------------------------------------------------------------ */
function applySvcFilters(rows) {
  const f = { ...defaultSvcFilter(), ...svcFilter };
  const list = Array.isArray(rows) ? rows : [];

  return list.filter(s => {
    const bag = [
      s.routine, s.tipo, s.servizio, s.operation,
      s.fallback, s.descrizione, s.ambito,
      s.applicativo, s.paramsIngresso, s.outputServizio, s.stato
    ]
      .map(x => String(x || ''))
      .join(' ')
      .toLowerCase();

    if (f.text && !bag.includes(f.text)) return false;

    if (f.idContains) {
      if (!String(s.id || '').includes(f.idContains)) return false;
    }

    // routine
    if (f.routine.length) {
      const val = String(s.routine || '').toLowerCase();
      if (!f.routine.some(x => val.includes(String(x).toLowerCase()))) return false;
    }

    // servizi
    if (f.servizi.length) {
      const val = String(s.servizio || '').toLowerCase();
      if (!f.servizi.some(x => val.includes(String(x).toLowerCase()))) return false;
    }

    // tipi
    if (f.tipi.length && !f.tipi.includes(String(s.tipo))) return false;

    // descrizione contains
    if (f.descrizioneContains) {
      if (!String(s.descrizione || '').toLowerCase().includes(f.descrizioneContains)) return false;
    }

    // ambiti
    if (f.ambiti.length) {
      const val = String(s.ambito || '').toLowerCase();
      if (!f.ambiti.some(x => val.includes(x))) return false;
    }

    // applicativi
    if (f.applicativi.length) {
      const val = String(s.applicativo || '').toLowerCase();
      if (!f.applicativi.some(x => val.includes(x))) return false;
    }

    // fallback (match su token, separatori newline/comma)
    if (f.fallback.length) {
      const vals = String(s.fallback || '')
        .toLowerCase()
        .split(/[\n,]+/)
        .map(x => x.trim())
        .filter(Boolean);
      if (!f.fallback.some(x => vals.includes(x))) return false;
    }

    // operations
    if (f.operations.length) {
      const vals = String(s.operation || '')
        .toLowerCase()
        .split(/[\n,]+/)
        .map(x => x.trim())
        .filter(Boolean);
      if (!f.operations.some(x => vals.includes(x))) return false;
    }

    // params
    if (f.params.length) {
      const vals = String(s.paramsIngresso || '')
        .toLowerCase()
        .split(/[\n,]+/)
        .map(x => x.trim())
        .filter(Boolean);
      if (!f.params.some(x => vals.includes(x))) return false;
    }

    // outputs
    if (f.outputs.length) {
      const vals = String(s.outputServizio || '')
        .toLowerCase()
        .split(/[\n,]+/)
        .map(x => x.trim())
        .filter(Boolean);
      if (!f.outputs.some(x => vals.includes(x))) return false;
    }

    // stati (match esatto, case-sensitive come UI)
    if (f.stati.length) {
      const val = String(s.stato || '').trim();
      if (!f.stati.includes(val)) return false;
    }

    return true;
  });
}

/* ------------------------------------------------------------
   SORTING
------------------------------------------------------------ */
let svcSort = { key: 'routine', dir: 'asc' };

window.setSvcSort = function (k) {
  if (svcSort.key === k) {
    svcSort.dir = (svcSort.dir === 'asc' ? 'desc' : 'asc');
  } else {
    svcSort.key = k;
    svcSort.dir = 'asc';
  }
  renderServices();
};

function sortSvcRows(rows) {
  const k = svcSort.key;
  const d = svcSort.dir === 'desc' ? -1 : 1;
  const list = Array.isArray(rows) ? rows.slice() : [];
  return list.sort((a, b) => String(a?.[k] || '').localeCompare(String(b?.[k] || '')) * d);
}

/* ------------------------------------------------------------
   RENDER TABLE
------------------------------------------------------------ */
function renderServices() {
  const tbl = document.getElementById('svcTable');
  if (!tbl) return;

  const all = Array.isArray(state.services) ? state.services : [];
  const rows = sortSvcRows(applySvcFilters(all));

  $('#svcCount').textContent = `${rows.length} risultati su ${all.length}`;

  function th(k, label) {
    return `<th class='sortable' onclick="setSvcSort('${k}')">` +
      label + (svcSort.key === k ? ` <span class='arrow'>${svcSort.dir === 'asc' ? '↑' : '↓'}</span>` : '') +
      `</th>`;
  }

  let thead =
    '<thead><tr>' +
    th('routine', 'ROUTINE') +
    th('tipo', 'TIPO') +
    th('servizio', 'SERVIZIO') +
    th('operation', 'OPERATION / PARAM') +
    th('fallback', 'FALLBACK JDBC/SWP') +
    th('descrizione', 'DESCRIZIONE') +
    th('ambito', 'AMBITO') +
    th('applicativo', 'APPLICATIVO') +
    th('paramsIngresso', 'PARAM IN') +
    th('outputServizio', 'OUTPUT') +
    th('stato', 'STATO') +
    '<th>Azioni</th>' +
    '</tr></thead>';

  if (!rows.length) {
    tbl.innerHTML = thead +
      "<tbody><tr><td colspan='13'><div class='muted'>Nessun servizio</div></td></tr></tbody>";
    return;
  }

  const tbody = '<tbody>' +
    rows.map(s =>
      '<tr>' +
      '<td>' + escapeHtml(s.routine) + '</td>' +
      '<td>' + escapeHtml(s.tipo) + '</td>' +
      '<td>' + escapeHtml(s.servizio) + '</td>' +
      "<td class='col-multiline'>" + escapeHtml(s.operation) + '</td>' +
      '<td>' + escapeHtml(s.fallback) + '</td>' +
      "<td class='col-multiline'>" + escapeHtml(s.descrizione) + '</td>' +
      '<td>' + escapeHtml(s.ambito) + '</td>' +
      '<td>' + escapeHtml(s.applicativo) + '</td>' +
      "<td class='col-multiline'>" + escapeHtml(s.paramsIngresso) + '</td>' +
      "<td class='col-multiline'>" + escapeHtml(s.outputServizio) + '</td>' +
      '<td>' + escapeHtml(s.stato || '') + '</td>' +
      "<td><div class='table-actions'>" +
      `<button onclick="editService('${String(s.id)}')">✏️</button>` +
      `<button class='danger' onclick="deleteService('${String(s.id)}')">🗑️</button>` +
      '</div></td>' +
      '</tr>'
    ).join('') +
    '</tbody>';

  tbl.innerHTML = thead + tbody;
}

/* ------------------------------------------------------------
   EXPORT JSON
------------------------------------------------------------ */
document.querySelector("[data-do='svcSave']")?.addEventListener('click', () => {
  const blob = new Blob([
    JSON.stringify({ services: Array.isArray(state.services) ? state.services : [] }, null, 2)
  ], { type: 'application/json' });
  downloadBlob(blob, 'services.json');
});

/* ------------------------------------------------------------
   IMPORT JSON
------------------------------------------------------------ */
window.importServicesFromFile = async function () {
  try {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json';
    inp.onchange = async () => {
      const file = inp.files?.[0];
      if (!file) return;
      const txt = await file.text();
      const json = JSON.parse(txt);
      const arr = Array.isArray(json) ? json : (Array.isArray(json?.services) ? json.services : []);
      state.services = arr.map(s => normalizeService(s));
      saveState(state);
      renderServices();
      toast('Servizi caricati ✔');
    };
    inp.click();
  } catch (e) {
    alert('Errore import Servizi: ' + (e && e.message));
  }
};

document.querySelector("[data-do='svcLoad']")?.addEventListener('click', importServicesFromFile);

/* ------------------------------------------------------------
   EXPORT CSV
------------------------------------------------------------ */
document.querySelector("[data-do='svcCSV']")?.addEventListener('click', () => {
  const rows = sortSvcRows(applySvcFilters(Array.isArray(state.services) ? state.services : []));
  const head = [
    'ID','Routine','Tipo','Servizio','Operation',
    'Fallback','Descrizione','Ambito','Applicativo',
    'Param IN','Output','Stato'
  ];
  const csv = [head.join(';')]
    .concat(rows.map(s => [
      s.id, s.routine, s.tipo, s.servizio,
      s.operation, s.fallback, s.descrizione,
      s.ambito, s.applicativo, s.paramsIngresso,
      s.outputServizio, s.stato
    ].map(v => quoteCSV(v)).join(';')))
    .join('\n');

  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'services.csv');
});

/* ------------------------------------------------------------
   EXPORT EXCEL (.xls XML Spreadsheet 2003)
------------------------------------------------------------ */
document.querySelector("[data-do='svcXLS']")?.addEventListener('click', () => {
  const rows = sortSvcRows(applySvcFilters(Array.isArray(state.services) ? state.services : []));

  function xmlEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function cell(v, type) {
    return `<Cell><Data ss:Type="${type || 'String'}">${xmlEsc(v)}</Data></Cell>`;
  }

  const head = [
    'ID','Routine','Tipo','Servizio','Operation',
    'Fallback','Descrizione','Ambito','Applicativo',
    'Param IN','Output','Stato'
  ];

  let xml =
    `<?xml version="1.0"?>\n` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ` +
    `xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n` +
    `<Worksheet ss:Name="Servizi"><Table>`;

  xml += `<Row>` + head.map(h => cell(h)).join('') + `</Row>`;

  rows.forEach(s => {
    xml += `<Row>`
      + cell(s.id)
      + cell(s.routine)
      + cell(s.tipo)
      + cell(s.servizio)
      + cell(s.operation)
      + cell(s.fallback)
      + cell(s.descrizione)
      + cell(s.ambito)
      + cell(s.applicativo)
      + cell(s.paramsIngresso)
      + cell(s.outputServizio)
      + cell(s.stato)
      + `</Row>`;
  });

  xml += `</Table></Worksheet></Workbook>`;

  downloadBlob(new Blob([xml], { type: 'application/vnd.ms-excel' }), 'services.xls');
});

/* ------------------------------------------------------------
   CLEAR ALL SERVICES
------------------------------------------------------------ */
document.querySelector("[data-do='svcClear']")?.addEventListener('click', () => {
  if (!confirm('Confermi? Saranno eliminati TUTTI i Servizi.')) return;
  state.services = [];
  saveState(state);
  renderServices();
});
