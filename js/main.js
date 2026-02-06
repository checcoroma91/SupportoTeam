// ==========================================================
// AVVIO DELL’APPLICAZIONE (fallback: global window o import dinamico)
// ==========================================================
async function boot() {
  // Se non ci sono su window, prova import dinamico da core.js
  let renderAllFn  = window.renderAll;
  let initUIFn     = window.initUIRouter;
  let refreshNotif = window.refreshNotificationsUI;
  let autoOpenNotif= window.autoOpenNotifDialogIfNeeded;

  try {
    if (!renderAllFn || !initUIFn) {
      const core = await import('./core.js');
      renderAllFn   = renderAllFn   || core.renderAll;
      initUIFn      = initUIFn      || core.initUIRouter;
      refreshNotif  = refreshNotif  || core.refreshNotificationsUI;
      autoOpenNotif = autoOpenNotif || core.autoOpenNotifDialogIfNeeded;
    }
  } catch (e) {
    console.warn('core.js non esporta ESM o path errato:', e);
  }

  // 1) Render iniziale
  if (typeof renderAllFn === 'function') {
    renderAllFn();
  } else {
    console.warn('renderAll non disponibile (né su window né come export).');
  }

  // 2) Router/UI
  if (typeof initUIFn === 'function') {
    initUIFn();
  } else {
    console.warn('initUIRouter non disponibile.');
  }

  // 3) Notifiche
  if (typeof refreshNotif === 'function') refreshNotif();
  if (typeof autoOpenNotif === 'function') autoOpenNotif();
}

boot();
