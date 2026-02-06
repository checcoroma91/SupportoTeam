// ============================================================
// V5 MAIN — READY-SAFE ORCHESTRATOR (Soluzione C, v2 con fallback Toolbar)
// ============================================================
// Include con: <script type="module" src="./js/main.js"></script>
// - Import side-effect dei moduli (core/router/links/op/svc/crq)
// - Avvio a DOM pronto
// - Risoluzione funzioni chiave sia via window.* che via ESM
// - Fallback UI basico (tabs/tiles/dialog) + Fallback Toolbar (Notifiche, Repo, Export, Clear)
// ============================================================

'use strict';

// 1) Import side-effect dei moduli
import './core.js';
import './router.js';
import './links.js';
import './op.js';
import './svc.js';
import './crq.js';

// 2) DOM ready helper
function onReady(fn){
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

// 3) Helpers generici
function openDialogByIdSafe(id){
  const dlg = document.getElementById(id);
  if (dlg && typeof dlg.showModal === 'function') {
    try { dlg.showModal(); } catch(_){}
  }
}
function closeDialogByEl(el){
  try { el?.close?.(); } catch(_){}
}
function getActivePane(){
  return document.querySelector('.pane.active')?.dataset?.pane || 'home';
}
function simulateClick(sel){
  const el = document.querySelector(sel);
  if (el) { el.click(); return true; }
  return false;
}

// 4) Fallback UI minimale (tabs/tiles/dialog open/close)
function installBasicUIFallback(){
  // Tabs via [data-view]
  const nav = document.querySelector('nav.nav');
  if (nav && !nav._v5FallbackTabsBound){
    nav._v5FallbackTabsBound = true;
    nav.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-view]');
      if (!btn) return;
      const view = btn.getAttribute('data-view');
      if (!view) return;
      document.querySelectorAll('.nav .tab').forEach(b => {
        b.setAttribute('aria-selected', String(b === btn));
        b.toggleAttribute('aria-current', b === btn);
      });
      document.querySelectorAll('.pane').forEach(p => {
        p.classList.toggle('active', p.dataset.pane === view);
      });
    });
  }
  // Tiles via [data-nav]
  if (!document.body._v5FallbackTilesBound){
    document.body._v5FallbackTilesBound = true;
    document.body.addEventListener('click', (ev) => {
      const tile = ev.target.closest('[data-nav]');
      if (!tile) return;
      const view = tile.getAttribute('data-nav');
      const tab = document.querySelector(`.nav .tab[data-view="${view}"]`);
      tab?.click();
    });
  }
  // Dialog open/close via data-open / data-close
  if (!document.body._v5FallbackDialogBound){
    document.body._v5FallbackDialogBound = true;
    document.body.addEventListener('click', (ev) => {
      const opener = ev.target.closest('[data-open]');
      if (opener) {
        const id = opener.getAttribute('data-open');
        const map = { linksFilter:'filterSectionsDlg', svcFilter:'svcFilterDlg', crqFilter:'crqFilterDlg' };
        openDialogByIdSafe(map[id] || id);
        ev.preventDefault();
        return;
      }
      const closer = ev.target.closest('[data-close]');
      if (closer) {
        const dlg = closer.closest('dialog');
        closeDialogByEl(dlg);
        ev.preventDefault();
        return;
      }
    });
  }
}

// 5) Fallback Toolbar (Notifiche, Repo, Export, Clear)
function installToolbarFallback(){
  const toolbar = document.querySelector('.toolbar');
  if (!toolbar || toolbar._v5FallbackToolbarBound) return;
  toolbar._v5FallbackToolbarBound = true;

  // Notifiche
  const notifBtn = document.getElementById('notifBtn');
  if (notifBtn && !notifBtn._v5Bound){
    notifBtn._v5Bound = true;
    notifBtn.addEventListener('click', () => {
      // Se esiste una funzione dedicata, usala; altrimenti apri dialog notifiche
      if (typeof window.openNotificationsDialog === 'function') return window.openNotificationsDialog();
      openDialogByIdSafe('notifDlg');
    });
  }

  // Azioni data-do (delegation)
  toolbar.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-do]');
    if (!btn) return;
    const act = btn.getAttribute('data-do');

    switch (act) {
      case 'saveRepo':
        if (typeof window.saveToRepo === 'function') return void window.saveToRepo();
        alert('Salvataggio su repository non configurato.');
        break;
      case 'loadRepo':
        if (typeof window.loadFromRepo === 'function') return void window.loadFromRepo();
        alert('Caricamento da repository non configurato.');
        break;
      case 'loadFolder':
        if (typeof window.loadFromFolder === 'function') return void window.loadFromFolder();
        alert('Caricamento da cartella non configurato.');
        break;
      case 'exportMenu':
        openDialogByIdSafe('dlgExport');
        break;
      case 'clearAll':
        if (typeof window.clearAll === 'function') return void window.clearAll();
        if (!confirm('Confermi? Saranno eliminati TUTTI i dati (localStorage).')) return;
        try { localStorage.clear(); } catch(_){}
        // reset stato se presente
        try {
          if (window.state) {
            if (Array.isArray(state.links)) state.links = [];
            if (Array.isArray(state.op)) state.op = [];
            if (Array.isArray(state.services)) state.services = [];
            if (Array.isArray(state.crq)) state.crq = [];
            if (typeof window.saveState === 'function') window.saveState(state);
          }
        } catch(_){}
        // rerender
        try { window.renderLinks?.(); } catch(_){}
        try { window.renderOP?.(); } catch(_){}
        try { window.renderServices?.(); } catch(_){}
        try { window.renderCrq?.(); } catch(_){}
        break;
      default:
        // Lascia passare ad altri handler se presenti
        return;
    }
    ev.preventDefault();
  });

  // Handler Export menu (data-exp)
  const dlgExport = document.getElementById('dlgExport');
  if (dlgExport && !dlgExport._v5ExpBound){
    dlgExport._v5ExpBound = true;
    dlgExport.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-exp]');
      if (!b) return;
      const kind = b.getAttribute('data-exp'); // 'json' | 'csv' | 'xls'
      const pane = getActivePane();

      const done = dispatchExport(kind, pane);
      if (!done) alert(`Nessuna azione export "${kind}" per la vista "${pane}".`);
      closeDialogByEl(dlgExport);
    });
  }
}

function dispatchExport(kind, pane){
  // Prova a usare i pulsanti già presenti nelle card controls
  // JSON
  if (kind === 'json'){
    if (pane === 'svc') return simulateClick("[data-do='svcSave']");
    if (pane === 'crq') return simulateClick("[data-do='crqSave']");
    if (pane === 'op')  return simulateClick("[data-do='opSave']");
    if (pane === 'links') return simulateClick("[data-do='linksExport']");
    return false;
  }
  // CSV
  if (kind === 'csv'){
    if (pane === 'svc') return simulateClick("[data-do='svcCSV']");
    if (pane === 'crq') return simulateClick("[data-do='crqCSV']");
    if (pane === 'op')  return simulateClick("[data-do='opCSV']");
    return false;
  }
  // XLS
  if (kind === 'xls'){
    if (pane === 'svc') return simulateClick("[data-do='svcXLS']");
    if (pane === 'crq') return simulateClick("[data-do='crqXLS']");
    if (pane === 'op')  return simulateClick("[data-do='opXLS']");
    return false;
  }
  return false;
}

// 6) Boot orchestrator
async function boot(){
  // Prova ad importare export ESM (se presenti)
  let core = undefined;
  let router = undefined;
  try { core = await import('./core.js'); } catch(_){}
  try { router = await import('./router.js'); } catch(_){}

  const renderAllFn   = window.renderAll   || core?.renderAll;
  const initUIFn      = window.initUIRouter|| core?.initUIRouter || router?.initUIRouter;
  const refreshNotif  = window.refreshNotificationsUI || core?.refreshNotificationsUI;
  const autoOpenNotif = window.autoOpenNotifDialogIfNeeded || core?.autoOpenNotifDialogIfNeeded;

  // Fallbacks
  if (typeof initUIFn !== 'function') installBasicUIFallback();
  installToolbarFallback();

  if (typeof renderAllFn === 'function') {
    try { renderAllFn(); } catch(e){ console.error('renderAll() error:', e); }
  } else {
    try { window.renderServices?.(); } catch(_){}
    try { window.renderCrq?.(); } catch(_){}
  }

  try { if (typeof initUIFn === 'function') initUIFn(); } catch(e){ console.error('initUIRouter() error:', e); }
  try { if (typeof refreshNotif  === 'function') refreshNotif(); } catch(_){}
  try { if (typeof autoOpenNotif === 'function') autoOpenNotif(); } catch(_){}
}

// 7) Avvio a DOM pronto
onReady(boot);
