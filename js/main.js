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
// AVVIO DELL’APPLICAZIONE
// ==========================================================

// 1) Render iniziale di tutte le viste
if (typeof renderAll === "function") {
    renderAll();
}

// 2) Inizializzazione Router / UI (tabs, tiles, toolbar, dialogs, export menu)
if (typeof initUIRouter === "function") {
    initUIRouter();
}

// 3) Aggiorna badge notifiche + eventuale apertura dialog notifiche
if (typeof refreshNotificationsUI === "function") {
    refreshNotificationsUI();
}
if (typeof autoOpenNotifDialogIfNeeded === "function") {
    autoOpenNotifDialogIfNeeded();
}

// 4) Caricamento automatico da repository (se previsto)
if (typeof loadFromRepo === "function") {
    // NON forziamo autoload, evitiamo loop su GitHub Pages.
    // Lascio la funzione disponibile tramite pulsante.
}
