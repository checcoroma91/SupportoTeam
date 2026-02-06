// ==========================================================
// V5 MAIN — ENTRYPOINT MODULARE (NESSUNA FUNZIONE DEFINITA QUI)
// ==========================================================

// Import dei moduli (caricano funzioni, stato, UI, router)
import './core.js';
import './router.js';
import './links.js';
import './op.js';
import './svc.js';
import './crq.js';

// ==========================================================
// AVVIO DELL’APPLICAZIONE (versione compatibile con funzioni su window)
// ==========================================================

// 1) Render iniziale di tutte le viste
if (typeof window.renderAll === 'function') {
  window.renderAll();
}

// 2) Inizializzazione Router / UI (tabs, tiles, toolbar, dialogs, export menu)
if (typeof window.initUIRouter === 'function') {
  window.initUIRouter();
}

// 3) Aggiorna badge notifiche + eventuale apertura dialog notifiche
if (typeof window.refreshNotificationsUI === 'function') {
  window.refreshNotificationsUI();
}
if (typeof window.autoOpenNotifDialogIfNeeded === 'function') {
  window.autoOpenNotifDialogIfNeeded();
}

// 4) Caricamento automatico da repository (se previsto)
if (typeof window.loadFromRepo === 'function') {
  // lasciata disponibile da pulsante
}
