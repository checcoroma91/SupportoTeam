// ===== core.js (fixed) =====
/* ============================================================
   V5 APP CORE — State, Autosave, Storage, Settings
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
    el.textContent = String(msg ?? "");
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
  } catch (_) {}
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

// --------------------------
// DEFAULT STATE (V5)
// --------------------------
function defaultState() {
  return {
    sections: [],
    links: [],
    op: [],          // <-- coerente con op.js
    services: [],
    crq: []
  };
}

// --------------------------
// SETTINGS
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
// LOAD STATE (compat V3/V4)
// --------------------------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);

    // Retro-compat: se esiste "openPoints" mappalo in "op"
    const opArr = Array.isArray(parsed.op)
      ? parsed.op
      : (Array.isArray(parsed.openPoints) ? parsed.openPoints : []);

    return {
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
      op: opArr,
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
const debouncedLocalSave = debounce(function (json) {
  try {
    localStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(LAST_SAVE_KEY, String(Date.now()));
  } catch (_) {}
}, 200);

function saveState(st) {
  try {
    const target = st || state || defaultState();
    // Se qualcuno avesse ancora scritto su openPoints, normalizza ad op
    if (Array.isArray(target.openPoints) && !Array.isArray(target.op)) {
      target.op = target.openPoints;
      delete target.openPoints;
    }
    const json = JSON.stringify(target);
    debouncedLocalSave(json);
  } catch (e) {
    console.warn("saveState error:", e);
  }
}

// --------------------------
// GLOBAL STATE (inizializza subito)
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

    // Anti spam-save
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

    // Se il payload ha i dati attesi → usa quelli
    if (combined && typeof combined === "object" && (
      Array.isArray(combined.sections) || Array.isArray(combined.links) ||
      Array.isArray(combined.openPoints) || Array.isArray(combined.op) ||
      Array.isArray(combined.services) || Array.isArray(combined.crq)
    )) {
      state = {
        sections: Array.isArray(combined.sections) ? combined.sections : [],
        links: Array.isArray(combined.links) ? combined.links : [],
        op: Array.isArray(combined.op)
              ? combined.op
              : (Array.isArray(combined.openPoints) ? combined.openPoints : []),
        services: Array.isArray(combined.services) ? combined.services : [],
        crq: Array.isArray(combined.crq) ? combined.crq : []
      };
      saveState(state);
      toast("Dati caricati dal repository ✔");
      return;
    }

    // 2) Fallback: prova a leggere i 4 file "data/*"
    const base = endpoint.replace(/\/*$/, "");
    const paths = {
      links:      `${base}/data/linkhub-links.json`,
      op:         `${base}/data/open-points.json`,
      services:   `${base}/data/services.json`,
      crq:        `${base}/data/crq.json`
    };

    const [linksPack, opPack, svcPack, crqPack] = await Promise.all([
      fetchJSON(paths.links).catch(() => ({})),
      fetchJSON(paths.op).catch(() => ({})),
      fetchJSON(paths.services).catch(() => ({})),
      fetchJSON(paths.crq).catch(() => ({}))
    ]);

    state = {
      sections: Array.isArray(linksPack.sections) ? linksPack.sections : [],
      links: Array.isArray(linksPack.links) ? linksPack.links : [],
      op: Array.isArray(opPack.op)
            ? opPack.op
            : (Array.isArray(opPack.openPoints) ? opPack.openPoints : []),
      services: Array.isArray(svcPack.services) ? svcPack.services : [],
      crq: Array.isArray(crqPack.crq) ? crqPack.crq : []
    };

    const nothing =
      !state.sections.length && !state.links.length &&
      !state.op.length && !state.services.length && !state.crq.length;

    saveState(state);
    toast(nothing ? "Repo vuoto o non accessibile" : "Dati caricati dal repository ✔");

    if (nothing && combined && combined.ok) {
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

  // Reset di localStorage (solo le nostre chiavi principali)
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_SAVE_KEY);
  } catch (_) {}

  // Persisti e notifica
  saveState(state);
  toast("Dati locali puliti ✓");
}

// --------------------------
// EXPORT JSON (backup full app)
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

// --------------------------
// GLOBAL EXPOSE (compat con main / toolbar / moduli)
// --------------------------
window.state = state;
window.saveState = saveState;
window.toast = toast;
window.downloadBlob = downloadBlob;

window.saveToRepo = saveToRepo;
window.loadFromRepo = loadFromRepo;
window.clearAll = clearAllData;
window.exportJSON = exportJSON;

window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.defaultState = defaultState;
