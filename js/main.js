// ============================================================
// V5 MAIN — READY-SAFE ORCHESTRATOR (Soluzione C adattata)
// ============================================================
// Questo file è un ES Module. Va incluso con:
//   <script type="module" src="./js/main.js"></script>
//
// Carica i moduli funzionali (side-effects) e avvia l'app
// SOLO quando il DOM è pronto. Inoltre prova sia l'approccio
// "global window" sia ESM puro (import nominativi tramite
// import() dinamico) per trovare le funzioni chiave.
// ============================================================

'use strict';

// ------------------------------------------------------------
// 1) Import side-effect dei moduli (esegue i file)
//    Mantieni i nomi/percorsi come nella tua struttura.
// ------------------------------------------------------------
import './core.js';
import './router.js';
import './links.js';
import './op.js';
import './svc.js';
import './crq.js';

// ------------------------------------------------------------
// 2) Utility: DOM ready wrapper
// ------------------------------------------------------------
function onReady(fn){
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

// ------------------------------------------------------------
// 3) Fallback UI minimale (tabs/dialogs) se il router UI non c'è
// ------------------------------------------------------------
function installBasicUIFallback(){
  // Tabs: [data-view] -> attiva pane corrispondente
  const nav = document.querySelector('nav.nav');
  if (nav) {
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

  // Tiles home: [data-nav]
  document.body.addEventListener('click', (ev) => {
    const tile = ev.target.closest('[data-nav]');
    if (!tile) return;
    const view = tile.getAttribute('data-nav');
    const tab = document.querySelector(`.nav .tab[data-view="${view}"]`);
    tab?.click();
  });

  // Dialog open/close via data-open / data-close
  document.body.addEventListener('click', (ev) => {
    const opener = ev.target.closest('[data-open]');
    if (opener) {
      const id = opener.getAttribute('data-open');
      const dlg = document.getElementById(id === 'linksFilter' ? 'filterSectionsDlg' :
                                          id === 'svcFilter'   ? 'svcFilterDlg' :
                                          id === 'crqFilter'   ? 'crqFilterDlg' : id);
      if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
      return;
    }
    const closer = ev.target.closest('[data-close]');
    if (closer) {
      const dlg = closer.closest('dialog');
      try { dlg?.close(); } catch(_){}
      return;
    }
  });
}

// ------------------------------------------------------------
// 4) Boot: cerca funzioni su window o come export ESM
// ------------------------------------------------------------
async function boot(){
  // 4.1) Sonda moduli ESM (se esportano funzioni)
  let core = undefined;
  let router = undefined;
  try { core = await import('./core.js'); } catch(_){}
  try { router = await import('./router.js'); } catch(_){}

  // 4.2) Risolvi funzioni chiave (global window -> export ESM)
  const renderAllFn   = window.renderAll   || core?.renderAll;
  const initUIFn      = window.initUIRouter|| core?.initUIRouter || router?.initUIRouter;
  const refreshNotif  = window.refreshNotificationsUI || core?.refreshNotificationsUI;
  const autoOpenNotif = window.autoOpenNotifDialogIfNeeded || core?.autoOpenNotifDialogIfNeeded;

  // 4.3) Se il router UI non è disponibile, installa il fallback basico
  if (typeof initUIFn !== 'function') {
    console.warn('[main] initUIRouter non pervenuta: installo Fallback UI basico.');
    installBasicUIFallback();
  }

  // 4.4) Primo render: tenta ciò che è disponibile
  if (typeof renderAllFn === 'function') {
    try { renderAllFn(); } catch(e){ console.error('renderAll() error:', e); }
  } else {
    // fallback: prova a renderizzare tabelle note se esistono
    try { if (typeof window.renderServices === 'function') window.renderServices(); } catch(_){}
    try { if (typeof window.renderCrq === 'function') window.renderCrq(); } catch(_){}
  }

  // 4.5) Router/UI
  if (typeof initUIFn === 'function') {
    try { initUIFn(); } catch(e){ console.error('initUIRouter() error:', e); }
  }

  // 4.6) Notifiche
  try { if (typeof refreshNotif  === 'function') refreshNotif(); } catch(_){}
  try { if (typeof autoOpenNotif === 'function') autoOpenNotif(); } catch(_){}
}

// ------------------------------------------------------------
// 5) Avvio a DOM pronto
// ------------------------------------------------------------
onReady(boot);
