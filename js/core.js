// ===== core.js (generated) =====
/* ============================================================
   V5 APP CORE — State, Autosave, Storage, Settings
   Safe‑Copy format (no ambiguous chars)
   ============================================================ */

// --------------------------
// CONSTANTS
// --------------------------
const STORAGE_KEY = "tsa.v5.state";
const SETTINGS_KEY = "tsa.v5.settings";
const LAST_SAVE_KEY = "tsa.v5.lastSave";
const LAST_REMOTE_SAVE_KEY = "tsa.v5.lastRemote";
const AUTOSAVE_ENDPOINT = "https://supportoteam.francesco-romano2.workers.dev";

// --------------------------
// SIMPLE TOAST (non intrusive)
// --------------------------
function toast(msg) {
    try {
        const el = document.createElement("div");
        el.textContent = msg;
        Object.assign(el.style, {
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(12,18,40,0.88)",
            border: "1px solid rgba(99,230,255,0.35)",
            borderRadius: "12px",
            padding: "10px 16px",
            color: "#e8eefb",
            fontSize: "14px",
            backdropFilter: "blur(12px)",
            zIndex: 9999
        });
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1800);
    } catch (e) {}
}

// --------------------------
// DEBOUNCE
// --------------------------
function debounce(fn, ms) {
    let id = 0;
    return (...args) => {
        clearTimeout(id);
        id = setTimeout(() => fn(...args), ms);
    };
}
/*
// Autosave remoto (configurabile)
function getRemoteAutosaveOn() {
  const s = loadSettings() || {};
  // default: TRUE (puoi metterlo a false se preferisci)
  return s.remoteAutosave !== false;
}
const debouncedRemoteSave = debounce(() => {
  if (getRemoteAutosaveOn()) saveToRepo();
}, 8000);
*/
// --------------------------
// DEFAULT STATE
// --------------------------
function defaultState() {
    return {
        sections: [],
        links: [],
        openPoints: [],
        services: [],
        crq: []
    };
}

// --------------------------
// LOAD SETTINGS
// --------------------------
function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}

function saveSettings(s) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s || {}));
    } catch (_) {}
}

// --------------------------
// LOAD STATE (compatible with V3/V4 formats)
// --------------------------
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);

        return {
            sections: Array.isArray(parsed.sections) ? parsed.sections : [],
            links: Array.isArray(parsed.links) ? parsed.links : [],
            openPoints: Array.isArray(parsed.openPoints) ? parsed.openPoints : [],
            services: Array.isArray(parsed.services) ? parsed.services : [],
            crq: Array.isArray(parsed.crq) ? parsed.crq : []
        };
    } catch (e) {
        console.warn("loadState error:", e);
        return defaultState();
    }
}

// --------------------------
// SAVE STATE (debounced)
// --------------------------
const debouncedLocalSave = debounce(function(json) {
    try {
        localStorage.setItem(STORAGE_KEY, json);
        localStorage.setItem(LAST_SAVE_KEY, String(Date.now()));
    } catch (e) {}
}, 200);

function saveState(st) {
    try {
        const json = JSON.stringify(st || state || defaultState());
        debouncedLocalSave(json);
    } catch (e) {
        console.warn("saveState error:", e);
    }
}

// --------------------------
// GLOBAL STATE
// --------------------------
let state = loadState();
saveState(state);

// --------------------------
// SAVE TO REMOTE REPOSITORY
// --------------------------
async function saveToRepo() {
    try {
        const endpoint = AUTOSAVE_ENDPOINT.trim();
        if (!/^https?:\/\//i.test(endpoint)) {
            alert("Endpoint repository non configurato");
            return;
        }

        // Avoid spam-save
        const lastRaw = localStorage.getItem(LAST_REMOTE_SAVE_KEY);
        if (lastRaw) {
            const last = Number(lastRaw);
            if (Date.now() - last < 6000) {
                toast("Attendi qualche secondo prima del salvataggio");
                return;
            }
        }

        const body = JSON.stringify(state);
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body
        });

        if (!res.ok) {
            const text = await res.text().catch(() => res.statusText);
            throw new Error(text || "Errore sconosciuto");
        }

        localStorage.setItem(LAST_REMOTE_SAVE_KEY, String(Date.now()));
        toast("Salvato su repository ✔");
    } catch (err) {
        alert("Salvataggio su repository fallito: " + (err && err.message));
    }
}

// --------------------------
// LOAD FROM REMOTE REPO
// --------------------------
async function loadFromRepo() {
  const endpoint = (typeof AUTOSAVE_ENDPOINT === "string" && AUTOSAVE_ENDPOINT.trim())
    ? AUTOSAVE_ENDPOINT.trim()
    : "";

  if (!/^https?:\/\//i.test(endpoint)) {
    alert("Endpoint repository non configurato");
    return;
  }

  // Helper sicuri
  const fetchJSON = async (url) => {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url}`);
    return res.json();
  };

  try {
    // 1) Tentativo "combinato": ?op=load
    let combined = null;
    let diag = null;
    try {
      const url = endpoint + (endpoint.includes("?") ? "&" : "?") + "op=load";
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        combined = await res.json();
      } else {
        diag = await res.text().catch(() => res.statusText);
      }
    } catch (e) {
      diag = e?.message || String(e);
    }

    // Se il payload ha davvero i dati attesi → usa quelli
    if (combined && typeof combined === "object" && (
        Array.isArray(combined.sections) || Array.isArray(combined.links) ||
        Array.isArray(combined.openPoints) || Array.isArray(combined.services) ||
        Array.isArray(combined.crq)
    )) {
      state = {
        sections: Array.isArray(combined.sections) ? combined.sections : [],
        links: Array.isArray(combined.links) ? combined.links : [],
        openPoints: Array.isArray(combined.openPoints) ? combined.openPoints : [],
        services: Array.isArray(combined.services) ? combined.services : [],
        crq: Array.isArray(combined.crq) ? combined.crq : []
      };
      saveState(state);
      toast("Dati caricati dal repository ✔");
      return;
    }

    // 2) Fallback: prova a leggere i 4 file "data/*" direttamente
    const base = endpoint.replace(/\/*$/, ""); // togli eventuale slash finale
    const paths = {
      links:      `${base}/data/linkhub-links.json`,
      openPoints: `${base}/data/open-points.json`,
      services:   `${base}/data/services.json`,
      crq:        `${base}/data/crq.json`
    };

    const [linksPack, opPack, svcPack, crqPack] = await Promise.all([
      fetchJSON(paths.links).catch(() => ({})),
      fetchJSON(paths.openPoints).catch(() => ({})),
      fetchJSON(paths.services).catch(() => ({})),
      fetchJSON(paths.crq).catch(() => ({}))
    ]);

    // Mappa nei 5 array attesi dallo state unico
    state = {
      sections: Array.isArray(linksPack.sections) ? linksPack.sections : [],
      links: Array.isArray(linksPack.links) ? linksPack.links : [],
      openPoints: Array.isArray(opPack.openPoints) ? opPack.openPoints : [],
      services: Array.isArray(svcPack.services) ? svcPack.services : [],
      crq: Array.isArray(crqPack.crq) ? crqPack.crq : []
    };

    // Se anche il fallback ha portato TUTTO vuoto, avvisa con diagnostica
    const nothing =
      !state.sections.length && !state.links.length &&
      !state.openPoints.length && !state.services.length &&
      !state.crq.length;

    saveState(state);
    toast(nothing ? "Repo vuoto o non accessibile" : "Dati caricati dal repository ✔");

    if (nothing && combined && combined.ok) {
      // Mostra un minimo di info per capire perché il “combinato” non torna i dati
      console.warn("Diagnostica Worker:", combined);
    }
    if (nothing && diag) {
      console.warn("Diagnosi ?op=load:", diag);
    }

  } catch (err) {
    alert("Caricamento dal repository fallito: " + (err?.message || err));
  }
}

// --------------------------
// CLEAR ALL LOCAL DATA
// --------------------------
function clearAllData() {
  if (!confirm("Confermi? Saranno eliminati TUTTI i dati locali.")) return;

  // Reset stato interno
  state = defaultState();

  // Reset di localStorage
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LAST_SAVE_KEY);

  // RENDER IMMEDIATO senza bisogno di refresh
  saveState(state);   // <--- fondamentale per triggerare il re-render

  toast("Dati locali puliti ✓");
}

// --------------------------
// EXPORT JSON
// --------------------------
async function exportJSON() {
    try {
        const blob = new Blob(
            [ JSON.stringify(state, null, 2) ],
            { type: "application/json" }
        );
        downloadBlob(blob, "tsa-data.json");
    } catch (e) {
        alert("Export JSON fallito: " + (e && e.message));
    }
}

// --------------------------
// GENERIC BLOB DOWNLOAD
// --------------------------
function downloadBlob(blob, fileName) {
    try {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 500);
    } catch (e) {
        alert("Download non riuscito: " + (e && e.message));
    }
}

// Global expose for legacy inline handlers
window.state = typeof state !== 'undefined' ? state : window.state;
window.saveState = typeof saveState === 'function' ? saveState : window.saveState;
window.renderAll = typeof renderAll === 'function' ? renderAll : window.renderAll;
