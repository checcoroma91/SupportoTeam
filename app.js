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
const AUTOSAVE_ENDPOINT = (window.AUTOSAVE_ENDPOINT || "https://supportoteam.francesco-romano2.workers.dev").trim();

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

// Autosave remoto (configurabile)
function getRemoteAutosaveOn() {
  const s = loadSettings() || {};
  // default: TRUE (puoi metterlo a false se preferisci)
  return s.remoteAutosave !== false;
}
const debouncedRemoteSave = debounce(() => {
  if (getRemoteAutosaveOn()) saveToRepo();
}, 8000);

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
        const lastRaw = localStorage.getItem(LAST_SAVE_KEY);
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

        localStorage.setItem(LAST_SAVE_KEY, String(Date.now()));
        toast("Salvato su repository ✔");
    } catch (err) {
        alert("Salvataggio su repository fallito: " + (err && err.message));
    }
}

// --------------------------
// LOAD FROM REMOTE REPO
// --------------------------
async function loadFromRepo() {
    try {
        const endpoint = AUTOSAVE_ENDPOINT.trim();
        if (!/^https?:\/\//i.test(endpoint)) {
            alert("Endpoint repository non configurato");
            return;
        }

        let data = null;
        let errText = "";

        try {
            const url = endpoint + (endpoint.includes("?") ? "&" : "?") + "op=load";
            const res = await fetch(url, { method: "GET" });

            if (!res.ok) {
                errText = await res.text().catch(() => res.statusText);
            } else {
                data = await res.json();
            }
        } catch (e) {
            errText = e && e.message ? e.message : String(e);
        }

        if (!data || typeof data !== "object") {
            alert("Caricamento repository non disponibile.\n" +
                  (errText ? ("Dettagli: " + errText) : ""));
            return;
        }

        state = {
            sections: Array.isArray(data.sections) ? data.sections : [],
            links: Array.isArray(data.links) ? data.links : [],
            openPoints: Array.isArray(data.openPoints) ? data.openPoints : [],
            services: Array.isArray(data.services) ? data.services : [],
            crq: Array.isArray(data.crq) ? data.crq : []
        };

        saveState(state);
        toast("Dati caricati dal repository ✔");
    } catch (err) {
        alert("Caricamento dal repository fallito: " +
              (err && err.message ? err.message : err));
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
/* ============================================================
   V5 UI ROUTER + TABS + NAVIGATION + DIALOG CONTROLS
   Safe‑Copy format
   ============================================================ */

// --------------------------
// QUICK SELECT HELPERS
// --------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// --------------------------
// ROUTER: SHOW SELECTED VIEW
// --------------------------
function showPane(view) {
    const panes = $$("[data-pane]");
    const tabs = $$(".tab");

    panes.forEach(p => {
        p.classList.toggle("active", p.dataset.pane === view);
    });

    tabs.forEach(t => {
        const isActive = t.dataset.view === view;
        t.setAttribute("aria-selected", isActive ? "true" : "false");
        t.setAttribute("aria-current", isActive ? "page" : "false");
    });
}

// --------------------------
// INIT TABS CLICK
// --------------------------
function initTabs() {
    $$(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const view = tab.dataset.view;
            showPane(view);
        });
    });
}

// --------------------------
// INIT HOME TILES CLICK
// --------------------------
function initTiles() {
    $$(".tile").forEach(tile => {
        tile.addEventListener("click", () => {
            const view = tile.dataset.nav;
            if (view) showPane(view);
        });
        tile.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                const view = tile.dataset.nav;
                if (view) showPane(view);
            }
        });
    });
}

// --------------------------
// GENERIC DIALOG CONTROLS
// --------------------------
// Patch di sicurezza: se il dialog aperto è Link e la select è vuota, popola ora
function openDialogById(id) {
  const dlg = document.getElementById(id);
  if (!dlg) return;
  dlg.addEventListener("close", () => document.body.style.overflow = "");
  document.body.style.overflow = "hidden";
  dlg.showModal();

  if (id === "linkEditorDlg") {
    const fSection = document.getElementById("fSection");
    if (fSection && !fSection.options.length) {
      openLinkEditor(undefined, state.sections?.[0]?.id || "");
    }
  }
}

function closeDialog(dlg) {
    if (!dlg) return;
    dlg.close();
    document.body.style.overflow = "";
}

// Close when clicking buttons with data-close
function initDialogCloseButtons() {
    $$("dialog .btn[data-close], dialog [data-close]").forEach(btn => {
        btn.addEventListener("click", () => {
            const dlg = btn.closest("dialog");
            if (dlg) closeDialog(dlg);
        });
    });
}

// Close dialogs on ESC (native), but ensure body overflow restored
window.addEventListener("keydown", ev => {
  if (ev.key === "Escape") {
    const openDialog = document.querySelector("dialog[open]");
    if (openDialog) {
      ev.stopPropagation();
      ev.preventDefault();
      closeDialog(openDialog);
      return; // blocca propagazione ad altri handler
    }
  }
});

// --------------------------
// EXPORT MENU OPEN
// --------------------------
function initExportMenu() {
    const btn = document.querySelector('[data-do="exportMenu"]');
    if (!btn) return;

    btn.addEventListener("click", () => {
        openDialogById("dlgExport");
    });
}

// --------------------------
// TOOLBAR ACTIONS BINDINGS
// --------------------------
function initToolbar() {
    const byDo = s => document.querySelector(`[data-do="${s}"]`);

    // repo save/load
    const elSaveRepo = byDo("saveRepo");
    const elLoadRepo = byDo("loadRepo");
    if (elSaveRepo) elSaveRepo.addEventListener("click", saveToRepo);
    if (elLoadRepo) elLoadRepo.addEventListener("click", loadFromRepo);

    // load folder
    const elLoadFolder = byDo("loadFolder");
    if (elLoadFolder) elLoadFolder.addEventListener("click", async () => {
        if (!window.loadFromFolder) return alert("Caricamento cartella non disponibile.");
        try {
            await loadFromFolder();
        } catch (e) {
            alert("Errore nel caricamento cartella: " + (e && e.message));
        }
    });

    // clear all local data
    const elClear = byDo("clearAll");
    if (elClear) elClear.addEventListener("click", clearAllData);
	
	// --- LINKS EXPORT ---
	const elLinksExport = byDo("linksExport");
	if (elLinksExport) {
		elLinksExport.addEventListener("click", async () => {
			await exportLinksAndSectionsWithDialog();
		});
	}

	// --- LINKS IMPORT ---
	const elLinksImport = byDo("linksImport");
	if (elLinksImport) {
		elLinksImport.addEventListener("click", async () => {
			await importLinksAndSections();
		});
	}
	
	// PULISCI SOLO I LINK
	const elLinksClear = byDo("linksClear");
	if (elLinksClear) {
	  elLinksClear.addEventListener("click", () => {
		if (!confirm("Confermi? Saranno eliminati SOLO i link (le sezioni restano).")) return;
		state.links = [];
		localStorage.removeItem("tsa.v5.secfilter");
		saveState(state);   // il tuo patch di saveState richiama già renderAll()
		toast("Link puliti ✓");
	  });
	}
	
	//PULISCI SOLO OPENPOINT
	const elOpClear = byDo("opClear");
	if (elOpClear) elOpClear.addEventListener("click", clearOpenPoints);
}

function exportLinksAndSections() {
    const data = {
        sections: state.sections,
        links: state.links
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    });

    downloadBlob(blob, "linkhub-links.json");
    toast("Links e sezioni esportati ✔");
}

async function importLinksAndSections() {
    try {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "application/json";

        inp.onchange = async () => {
            const file = inp.files[0];
            if (!file) return;

            const txt = await file.text();
            const json = JSON.parse(txt);

            if (!Array.isArray(json.links) || !Array.isArray(json.sections)) {
                alert("JSON non valido: servono { links: [...], sections: [...] }");
                return;
            }

            state.sections = json.sections.map(normalizeSection);
            state.links = json.links.map(normalizeLink);

            saveState(state);
            renderAll();
            toast("Links e sezioni importati ✔");
        };

        inp.click();
    } catch (err) {
        alert("Errore import: " + err.message);
    }
}

// ======================================================
// SALVATAGGIO AVANZATO: Show Save File Dialog
// ======================================================
async function exportLinksAndSectionsWithDialog() {
    try {
        const data = {
            sections: state.sections,
            links: state.links
        };

        const jsonText = JSON.stringify(data, null, 2);

        // Apri il dialog nativo di salvataggio
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: "linkhub-links.json",
            types: [{
                description: "JSON File",
                accept: { "application/json": [".json"] }
            }]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(jsonText);
        await writable.close();

        toast("File salvato correttamente ✔");

    } catch (err) {

        // Annullato → nessun alert
        if (err?.name === "AbortError") {
            toast("Salvataggio annullato");
            return;
        }

        alert("Errore nel salvataggio: " + err.message);
        console.error(err);
    }
}

// --------------------------
// DIALOGS: OPEN TRIGGERS
// --------------------------
function initDialogOpenButtons() {
  $$("[data-open]").forEach(btn => {
    const dlgId = btn.getAttribute("data-open");
	const btnCrqHelp = document.querySelector('[data-do="crqHelp"]');

    btn.addEventListener("click", () => {

      // === ECCEZIONE 1: editor link
      if (dlgId === "linkEditorDlg") {
        openLinkEditor(undefined, state.sections?.[0]?.id || "");
        return;
      }

      // === ECCEZIONE 2: filtro Open Point
      if (dlgId === "opFilterDlg" || dlgId === "opFilter") {
        openOpFilterDialog();
        return;
      }

      // === ECCEZIONE 3: filtro Sezioni
      if (dlgId === "linksFilter" || dlgId === "filterSectionsDlg") {
        openFilterSectionsDialog();
        return;
      }

      // === ECCEZIONE 4: editor CRQ
      if (dlgId === "crqEditorDlg") {
        openCrqEditor();
        return;
      }

      // === ECCEZIONE 5: filtro CRQ  ⭐ NECESSARIO ⭐
      if (dlgId === "crqFilter") {
        openCrqFilterDialog();
        return;
      }
	  
	  
	  if (dlgId === "svcFilterDlg" || dlgId === "svcFilter") {
          openSvcFilterDialog();
          return;
      }

	
	if (btnCrqHelp) {
		btnCrqHelp.addEventListener("click", () => {
			openDialogById("helpCrqDlg");
		});
	}


      // === Router generico
      openDialogById(dlgId);

      // Post-open hook per gestione sezioni
      if (dlgId === "sectionsDlg") {
        renderSectionsList();
      }
    });
  });
}

// --------------------------
// GLOBAL INIT UI
// --------------------------
function initUIRouter() {
    initTabs();
    initTiles();
    initToolbar();
    initDialogOpenButtons();
    initDialogCloseButtons();
    initExportMenu();
}

// When DOM ready
document.addEventListener("DOMContentLoaded", () => {
    initUIRouter();
    showPane("home"); // default view
});

/* ============================================================
   V5 LINKS + SEZIONI + CARDS + FILTRI + DRAG&DROP
   Safe‑Copy format
   ============================================================ */

// Shortcuts
const linksContainer = document.getElementById("linksContainer") || document.getElementById("container");

/* ------------------------------------------------------------
   NORMALIZZATORI
   ------------------------------------------------------------ */
function normalizeSection(sec) {
    return {
        id: sec && sec.id ? String(sec.id) : crypto.randomUUID(),
        name: (sec && sec.name ? String(sec.name) : "Senza nome").trim(),
        desc: (sec && sec.desc ? String(sec.desc) : "").trim(),
        icon: (sec && sec.icon ? String(sec.icon) : "📁").trim(),
        collapsed: !!(sec && sec.collapsed),
        color: sec && sec.color ? sec.color : null
    };
}

function normalizeLink(x) {
    return {
        id: x && x.id ? String(x.id) : crypto.randomUUID(),
        title: (x && x.title ? String(x.title) : "").trim(),
        url: (x && x.url ? String(x.url) : "").trim(),
        desc: (x && x.desc ? String(x.desc) : "").trim(),
        tags: Array.isArray(x && x.tags)
            ? x.tags.map(t => String(t).trim()).filter(Boolean)
            : [],
        sectionId: x && x.sectionId ? String(x.sectionId) : null
    };
}

/* ------------------------------------------------------------
   SEZIONI: RENDER LISTA (dialog gestione sezioni)
   ------------------------------------------------------------ */
function renderSectionsList() {
    const list = document.getElementById("sectionsList");
    if (!list) return;

    if (!state.sections.length) {
        list.innerHTML = "<div class='muted'>Nessuna sezione</div>";
        return;
    }

    list.innerHTML = state.sections.map(sec => {
        const c1 = getSectionColor(sec) || "#4cc9f0";

        return `
        <div class="list-item" data-id="${sec.id}">
            <input type="text" value="${escapeHtml(sec.name)}"
                oninput="renameSection('${sec.id}', this.value)" placeholder="Nome" />

            <input type="text" value="${escapeHtml(sec.desc || "")}"
                oninput="redescSection('${sec.id}', this.value)" placeholder="Descrizione (opzionale)" />

            <select class="iconSel" onchange="reiconSection('${sec.id}', this.value)">
                ${["📁","👥","🧩","📂","📝","📌","📊","📎","🛠️","🗂️","📅","🧪","💡","✔️","⚙️"]
                .map(ic => `<option ${sec.icon === ic ? "selected" : ""}>${ic}</option>`).join("")}
            </select>

            <input type="color" value="${c1}"
                   onchange="recolorSection('${sec.id}', this.value)" />

            <div class="controls">
                <button onclick="moveSection('${sec.id}', -1)">⬆️</button>
                <button onclick="moveSection('${sec.id}', 1)">⬇️</button>
                <button class="danger" onclick="deleteSection('${sec.id}')">🗑️</button>
            </div>
        </div>`;
    }).join("");
}
``


/* ------------------------------------------------------------
   SEZIONI: CRUD FUNZIONI
   ------------------------------------------------------------ */

// Rename
window.renameSection = function(id, val) {
    const sec = state.sections.find(x => x.id === id);
    if (!sec) return;
    sec.name = String(val).trim() || "Senza nome";
    saveState(state);
    renderLinks();
};

// Change description
window.redescSection = function(id, val) {
    const sec = state.sections.find(x => x.id === id);
    if (!sec) return;
    sec.desc = String(val).trim();
    saveState(state);
    renderLinks();
};

// Change icon
window.reiconSection = function(id, val) {
    const sec = state.sections.find(x => x.id === id);
    if (!sec) return;
    sec.icon = String(val).trim() || "📁";
    saveState(state);
    renderLinks();
};

// Move section up/down
window.moveSection = function(id, delta) {
    const idx = state.sections.findIndex(s => s.id === id);
    if (idx < 0) return;
    const j = idx + delta;
    if (j < 0 || j >= state.sections.length) return;

    const tmp = state.sections[idx];
    state.sections[idx] = state.sections[j];
    state.sections[j] = tmp;

    saveState(state);
    renderSectionsList();
    renderLinks();
};

// Delete section
window.deleteSection = function(id) {
    if (state.sections.length === 1) {
        alert("Deve esistere almeno una sezione.");
        return;
    }

    const sec = state.sections.find(s => s.id === id);
    if (!sec) return;

    if (!confirm("Eliminare la sezione \"" + sec.name + "\"? I link verranno spostati nella prima sezione.")) return;

    // find first different section
    const target = state.sections.find(s => s.id !== id);
    if (!target) return;

    state.links = state.links.map(l =>
        l.sectionId === id
            ? { ...l, sectionId: target.id }
            : l
    );

    state.sections = state.sections.filter(s => s.id !== id);

    saveState(state);
    renderSectionsList();
    renderLinks();
};

// Add section
function addSection() {
    const name = String(document.getElementById("newSectionName").value || "").trim();
    if (!name) return;

    const desc = String(document.getElementById("newSectionDesc").value || "").trim();
    const icon = String(document.getElementById("newSectionIcon").value || "").trim() || "📁";

    const newSec = normalizeSection({ name, desc, icon });

    state.sections.push(newSec);

    document.getElementById("newSectionName").value = "";
    document.getElementById("newSectionDesc").value = "";
    document.getElementById("newSectionIcon").value = "";

    saveState(state);
    renderSectionsList();
    renderLinks();
}

document.getElementById("addSectionBtn")?.addEventListener("click", addSection);

/* ------------------------------------------------------------
   SEZIONI VISIBILI (FILTRI)
   ------------------------------------------------------------ */

const SECFILTER_KEY = "tsa.v5.secfilter";

function getVisibleSections() {
    try {
        const raw = localStorage.getItem(SECFILTER_KEY);
        if (!raw) return null;
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr) || !arr.length) return null;
        return new Set(arr);
    } catch (_) { return null; }
}

function setVisibleSections(ids) {
    try {
        if (!ids || !ids.length || ids.length === state.sections.length) {
            localStorage.removeItem(SECFILTER_KEY);
        } else {
            localStorage.setItem(SECFILTER_KEY, JSON.stringify(ids));
        }
    } catch (_) {}
}

function openFilterSectionsDialog() {
    const dlg = document.getElementById("filterSectionsDlg");
    const menu = document.getElementById("filterMenu");
    if (!dlg || !menu) return;

    const vis = getVisibleSections();
    menu.innerHTML = "";

    // ALL
    const allBtn = document.createElement("button");
    allBtn.className = "menu-btn";
    allBtn.textContent = "Mostra tutte le sezioni";
    allBtn.addEventListener("click", () => {
        setVisibleSections(null);
        renderLinks();
        closeDialog(dlg);
    });
    menu.appendChild(allBtn);

    // Each section
    state.sections.forEach(sec => {
        const b = document.createElement("button");
        b.className = "menu-btn";
        b.innerHTML = "<div class='label'><span class='ico'>" + escapeHtml(sec.icon) + 
                      "</span><div class='text'><div class='name'>" + escapeHtml(sec.name) +
                      "</div><div class='desc'>" + escapeHtml(sec.desc || "") + 
                      "</div></div></div>";

        b.addEventListener("click", () => {
            setVisibleSections([sec.id]);
            renderLinks();
            closeDialog(dlg);
        });

        menu.appendChild(b);
    });

    openDialogById("filterSectionsDlg");
}

document.querySelector("[data-open='linksFilter']")
    ?.addEventListener("click", openFilterSectionsDialog);
	


/* ------------------------------------------------------------
   LINK: OPEN EDITOR DIALOG
   ------------------------------------------------------------ */
const LINK_DLG_ID = document.getElementById("linkEditorDlg") ? "linkEditorDlg" : "dialog";
function openLinkEditor(item, defaultSectionId) {
    const dlg = document.getElementById(LINK_DLG_ID);
    if (!dlg) return;

    const fTitle = document.getElementById("fTitle");
    const fUrl = document.getElementById("fUrl");
    const fDesc = document.getElementById("fDesc");
    const fTags = document.getElementById("fTags");
    const fSection = document.getElementById("fSection");
    const dlgTitle = document.getElementById("dlgTitle");

    // fill section select
    fSection.innerHTML = state.sections
        .map(s => "<option value='" + s.id + "'>" + escapeHtml(s.name) + "</option>")
        .join("");

    if (item) {
        dlgTitle.textContent = "Modifica link";
        fTitle.value = item.title || "";
        fUrl.value = item.url || "";
        fDesc.value = item.desc || "";
        fTags.value = (item.tags || []).join(", ");
        fSection.value = item.sectionId;
        dlg.dataset.editing = item.id;
    } else {
        dlgTitle.textContent = "Nuovo link";
        fTitle.value = "";
        fUrl.value = "";
        fDesc.value = "";
        fTags.value = "";
        dlg.dataset.editing = "";
        fSection.value = defaultSectionId || (state.sections[0]?.id || "");
    }

    openDialogById("linkEditorDlg");
}

/* ------------------------------------------------------------
   LINK: SAVE DIALOG
   ------------------------------------------------------------ */
function saveLinkDialog() {
    const dlg = document.getElementById("linkEditorDlg");
    const id = dlg.dataset.editing;

    const title = document.getElementById("fTitle").value.trim();
    const url = document.getElementById("fUrl").value.trim();
    const desc = document.getElementById("fDesc").value.trim();
    const tags = document.getElementById("fTags").value.split(",").map(s => s.trim()).filter(Boolean);
    const sectionId = document.getElementById("fSection").value;

    if (!title || !url) {
        alert("Titolo e URL sono obbligatori.");
        return;
    }

    const obj = normalizeLink({ title, url, desc, tags, sectionId });

    if (id) {
        // edit
        const idx = state.links.findIndex(l => l.id === id);
        if (idx >= 0) {
            state.links[idx] = { ...obj, id };
        }
    } else {
        // new
        state.links.unshift(obj);
    }

    saveState(state);
    closeDialog(dlg);
    renderLinks();
}

document.getElementById("saveLinkBtn")
    ?.addEventListener("click", saveLinkDialog);

/* ------------------------------------------------------------
   LINK: REMOVE
   ------------------------------------------------------------ */
window.removeItem = function(id) {
    if (!confirm("Eliminare questo link?")) return;
    state.links = state.links.filter(l => l.id !== id);
    saveState(state);
    renderLinks();
};

/* ------------------------------------------------------------
   LINK: EDIT
   ------------------------------------------------------------ */
window.editItem = function(id) {
    const item = state.links.find(l => l.id === id);
    if (item) openLinkEditor(item, item.sectionId);
};

/* ------------------------------------------------------------
   SEZIONI: TOGGLE COLLAPSE
   ------------------------------------------------------------ */
window.toggleSection = function(id) {
    const sec = state.sections.find(s => s.id === id);
    if (!sec) return;
    sec.collapsed = !sec.collapsed;
    saveState(state);
    renderLinks();
};

/* ------------------------------------------------------------
   RENDER LINKS + SEZIONI
   ------------------------------------------------------------ */
function renderLinks() {
    if (!linksContainer) return;

    if (!state.sections.length) {
        linksContainer.innerHTML = "<div class='muted'>Nessuna sezione</div>";
		// Dopo aver scritto tutta la HTML delle sezioni:
		document.querySelectorAll(".section[data-color]").forEach(el => {
			const color = el.dataset.color;
			if (color) {
				el.style.setProperty("--sec-color", color);
			}
		});
        return;
    }

    const vis = getVisibleSections();
    const activeSections = vis ? state.sections.filter(s => vis.has(s.id)) : state.sections;

    const groups = activeSections.map(sec => {
        const items = state.links.filter(l => l.sectionId === sec.id);
        return { sec, items };
    });

    const anyItem = groups.some(g => g.items.length > 0);
    if (!anyItem) {
        linksContainer.innerHTML = "<div class='muted'>Nessun link trovato</div>";
        return;
    }

    linksContainer.innerHTML = groups.map(g => {
        if (!g.items.length) return "";

        const sec = g.sec;
        const collapsed = !!sec.collapsed;

        const icon = collapsed ? "▸" : "▾";

        let cards = "";
        if (!collapsed) {
            cards = "<div class='grid'>" + g.items.map(item => {
                return ""
                    + "<div class='card' data-id='" + item.id + "'>"
                    + "  <div class='card-head'>"
                    + "    <h3>🔗 <a href=\"" + escapeAttr(item.url) +
                               "\" target=\"_blank\" rel=\"noopener noreferrer\">" +
                                 escapeHtml(item.title) + "</a></h3>"
                    + "    <button class='drag-handle' draggable='true' data-id='" + item.id +
                          "' title='Trascina'>⋮⋮</button>"
                    + "  </div>"
                    + (item.desc ? ("<p>" + escapeHtml(item.desc) + "</p>") : "")
                    + "  <div class='table-actions'>"
                    + "    <button onclick=\"editItem('" + item.id + "')\">✏️</button>"
                    + "    <button class='danger' onclick=\"removeItem('" + item.id + "')\">🗑️</button>"
                    + "  </div>"
                    + "</div>";
            }).join("") + "</div>";
        }

        return ""
            + "<section class='section' data-sec='" + sec.id + "' data-color='" + (getSectionColor(sec) || "") + "'>"
            + "  <div class='section-header'>"
            + "    <div class='section-title'>"
            + "      <button class='toggle' onclick=\"toggleSection('" + sec.id + "')\">" + icon + "</button>"
            + "      <span>" + escapeHtml(sec.icon) + "</span>"
            + "      <span>" + escapeHtml(sec.name) + "</span>"
            + "    </div>"
            + "    <div class='section-actions'>"
            + "      <button onclick=\"openLinkEditor(undefined, '" + sec.id + "')\">➕ Link</button>"
            + "    </div>"
            + "  </div>"
            + cards
            + "</section>";

    }).join("");

	// Applica --sec-color da data-color
	document.querySelectorAll(".section[data-color]").forEach(el => {
		const c = el.dataset.color;
		if (c) el.style.setProperty("--sec-color", c);
	});
    initLinksDragDrop();
}

/* ------------------------------------------------------------
   DRAG & DROP (NEON CARET)
   ------------------------------------------------------------ */

let dragState = { id: null };
let caretEl = null;

function ensureCaret() {
    if (!caretEl) {
        caretEl = document.createElement("div");
        caretEl.className = "insert-caret";

        // === AGGIUNTA (PUNTO 3) ===
        // fallback colore sezione per il caret
        caretEl.style.setProperty("--sec-color", "#7b7dff");
        // ===========================
    }
    return caretEl;
}

function hideCaret() {
    if (caretEl) caretEl.style.display = "none";
}

function initLinksDragDrop() {
    // handles
    $$(".drag-handle").forEach(h => {
        h.addEventListener("dragstart", e => {
            dragState.id = h.dataset.id;
            const card = h.closest(".card");
            card?.classList.add("dragging");
            try { e.dataTransfer.setData("text/plain", dragState.id); } catch(_){}
            if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
        });

        h.addEventListener("dragend", e => {
            const card = h.closest(".card");
            card?.classList.remove("dragging");
            dragState.id = null;
            hideCaret();
        });
    });

    // over cards
    $$(".links-container .card").forEach(card => {
        card.addEventListener("dragover", e => {
            if (!dragState.id) return;
            e.preventDefault();
            placeCaret(card, e.clientX);
        });

        card.addEventListener("drop", e => {
            if (!dragState.id) return;
            e.preventDefault();
            const targetId = card.dataset.id;
            const rect = card.getBoundingClientRect();
            const before = e.clientX < rect.left + rect.width / 2;

            hideCaret();

            if (dragState.id !== targetId)
                moveLinkRelative(dragState.id, targetId, before ? "before" : "after");
        });
    });

    // over sections
    $$(".links-container .section").forEach(section => {
        section.addEventListener("dragover", e => {
            if (!dragState.id) return;
            e.preventDefault();

            const secId = section.dataset.sec;
            const grid = section.querySelector(".grid");
            if (!grid) return;

            const last = grid.querySelector(".card:last-child");
            const caret = ensureCaret();
            grid.appendChild(caret);

            if (last) {
                const rect = last.getBoundingClientRect();
                caret.style.left = (rect.right - grid.getBoundingClientRect().left) + "px";
                caret.style.top = (rect.top - grid.getBoundingClientRect().top) + "px";
                caret.style.height = Math.max(24, rect.height) + "px";
            } else {
                const gRect = grid.getBoundingClientRect();
                caret.style.left = "8px";
                caret.style.top = (gRect.top - grid.getBoundingClientRect().top) + "px";
                caret.style.height = "48px";
            }
            caret.style.display = "block";
        });

        section.addEventListener("dragleave", e => {
            // optional: hide caret on leave
        });

        section.addEventListener("drop", e => {
            if (!dragState.id) return;
            e.preventDefault();
            hideCaret();
            const secId = section.dataset.sec;
            moveLinkToSectionEnd(dragState.id, secId);
        });
    });
}

function placeCaret(card, clientX) {
    const rect = card.getBoundingClientRect();
    const before = clientX < rect.left + rect.width / 2;

    const grid = card.parentElement;
	// eredita il colore della sezione
	const sectionEl = card.closest(".section");
	if (sectionEl && sectionEl.dataset.color) {
		caret.style.setProperty("--sec-color", sectionEl.dataset.color);
	}
    const caret = ensureCaret();
    grid.appendChild(caret);

    const left = before ? rect.left : rect.right;
    caret.style.left = (left - grid.getBoundingClientRect().left) + "px";
    caret.style.top = (rect.top - grid.getBoundingClientRect().top) + "px";
    caret.style.height = Math.max(24, rect.height) + "px";
    caret.style.display = "block";
}

function moveLinkRelative(dragId, targetId, where) {
    const di = state.links.findIndex(l => l.id === dragId);
    const ti = state.links.findIndex(l => l.id === targetId);

    if (di < 0 || ti < 0) return;

    const dragged = state.links[di];
    const target = state.links[ti];

    // If different section, move to target section
    if (dragged.sectionId !== target.sectionId) {
        dragged.sectionId = target.sectionId;
    }

    state.links.splice(di, 1);

    let insertAt;
    if (where === "after") {
        insertAt = ti + (di < ti ? 0 : 1);
    } else {
        insertAt = ti - (di < ti ? 1 : 0);
    }

    insertAt = Math.max(0, Math.min(insertAt, state.links.length));
    state.links.splice(insertAt, 0, dragged);

    saveState(state);
    renderLinks();
}

function moveLinkToSectionEnd(dragId, secId) {
    const di = state.links.findIndex(l => l.id === dragId);
    if (di < 0) return;

    const dragged = state.links[di];
    dragged.sectionId = secId;

    state.links.splice(di, 1);

    // find last index of section secId
    let last = -1;
    for (let i = 0; i < state.links.length; i++) {
        if (state.links[i].sectionId === secId) last = i;
    }

    const insertAt = last === -1 ? state.links.length : last + 1;
    state.links.splice(insertAt, 0, dragged);

    saveState(state);
    renderLinks();
}

/* ------------------------------------------------------------
   UTILS: ESCAPERS
   ------------------------------------------------------------ */
function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[c]));
}

function escapeAttr(s) {
    return String(s == null ? "" : s).replace(/"/g, "&quot;");
}

function getSectionColor(sec) {
    if (!sec.color) return null;
    if (typeof sec.color === "string") return sec.color; // compat vecchi json
    return sec.color.c1 || null;
}

/* ============================================================
   V5 OPEN POINTS — CRUD + FILTERS + SORTING + RENDER + EXPORT
   Safe‑Copy format
   ============================================================ */

/* ------------------------------------------------------------
   Normalization
   ------------------------------------------------------------ */
function normalizeOP(o) {
    return {
        id: o && o.id ? String(o.id) : crypto.randomUUID(),
        title: (o && (o.title || o.titolo) ? String(o.title || o.titolo) : "").trim(),
        project: (o && (o.project || o.progetto) ? String(o.project || o.progetto) : "").trim(),
        assignees: Array.isArray(o && o.assignees)
            ? o.assignees.map(s => String(s).trim()).filter(Boolean)
            : String(o && (o.assignees || o.assegnatari) || "")
                .split(",")
                .map(s => s.trim())
                .filter(Boolean),
        priority: String(
            (o && (o.priority || o.priorita || o["priorità"])) || "medium"
        ).toLowerCase(),
        status: String(
            (o && (o.status || o.stato)) || "Nuovo"
        ).trim(),
        maxPriority: !!(o && (o.maxPriority || o.max || o["prioritàMassima"])),
        createdAt: (o && (o.createdAt || o.dataInserimento)) ?
            String(o.createdAt || o.dataInserimento).trim() : "",
        dueAt: (o && (o.dueAt || o.dataScadenza)) ?
            String(o.dueAt || o.dataScadenza).trim() : "",
        desc: (o && (o.desc || o.descrizione)) ?
            String(o.desc || o.descrizione).trim() : "",
        notes: (o && (o.notes || o.note)) ?
            String(o.notes || o.note).trim() : ""
    };
}

/* ------------------------------------------------------------
   OPEN OP DIALOG
   ------------------------------------------------------------ */
function openOpDialog(item) {
    const dlg = document.getElementById("opDialog");
    if (!dlg) return;

    document.getElementById("opDlgTitle").textContent =
        item ? "Modifica open point" : "Nuovo open point";

    document.getElementById("opTitle").value =
        (item && item.title) || "";

    document.getElementById("opProject").value =
        (item && item.project) || "";

    document.getElementById("opAssignees").value =
        item && Array.isArray(item.assignees)
            ? item.assignees.join(", ")
            : (item && item.assignees) || "";

    document.getElementById("opPriority").value =
        (item && item.priority) || "medium";

    document.getElementById("opStatus").value =
        (item && item.status) || "Nuovo";

    document.getElementById("opMaxPrio").checked =
        !!(item && item.maxPriority);

    document.getElementById("opCreatedAt").value =
        (item && item.createdAt) || todayISO();

    document.getElementById("opDueAt").value =
        (item && item.dueAt) || "";

    document.getElementById("opDesc").value =
        (item && item.desc) || "";

    document.getElementById("opNotes").value =
        (item && item.notes) || "";

    dlg.dataset.editing = item ? item.id : "";

    openDialogById("opDialog");
}

document.getElementById("opSaveBtn")
    ?.addEventListener("click", saveOpDialog);

/* ------------------------------------------------------------
   SAVE OP
   ------------------------------------------------------------ */
function saveOpDialog() {
    const dlg = document.getElementById("opDialog");
    const id = dlg.dataset.editing;

    const obj = normalizeOP({
        title: document.getElementById("opTitle").value.trim(),
        project: document.getElementById("opProject").value.trim(),
        assignees: document.getElementById("opAssignees").value
            .split(",").map(s => s.trim()).filter(Boolean),
        priority: document.getElementById("opPriority").value,
        status: document.getElementById("opStatus").value,
        maxPriority: document.getElementById("opMaxPrio").checked,
        createdAt: document.getElementById("opCreatedAt").value.trim(),
        dueAt: document.getElementById("opDueAt").value.trim(),
        desc: document.getElementById("opDesc").value.trim(),
        notes: document.getElementById("opNotes").value.trim()
    });

    if (!obj.title) {
        alert("Il titolo è obbligatorio.");
        return;
    }

    if (!obj.createdAt) obj.createdAt = todayISO();

    if (id) {
        const i = state.openPoints.findIndex(o => o.id === id);
        if (i >= 0) state.openPoints[i] = { ...obj, id };
    } else {
        state.openPoints.unshift(obj);
    }

    saveState(state);
    closeDialog(dlg);
    renderOpenPoints();
}

/* ------------------------------------------------------------
   CLEAR OP
   ------------------------------------------------------------ */

function clearOpenPoints() {
  if (!confirm("Vuoi davvero eliminare TUTTI gli Open Points?")) return;

  state.openPoints = [];
  saveState(state);
  toast("Open Points puliti ✔");
}


/* ------------------------------------------------------------
   DELETE OP
   ------------------------------------------------------------ */
window.deleteOpenPoint = function(id) {
    if (!confirm("Eliminare questo open point?")) return;
    state.openPoints = state.openPoints.filter(o => o.id !== id);
    saveState(state);
    renderOpenPoints();
};

/* ------------------------------------------------------------
   EDIT OP
   ------------------------------------------------------------ */
window.editOpenPoint = function(id) {
    const item = state.openPoints.find(o => o.id === id);
    if (item) openOpDialog(item);
};

/* ------------------------------------------------------------
   OP FILTER STATE
   ------------------------------------------------------------ */
const OPF_KEY = "tsa.v5.opfilter";

function defaultOpFilter() {
    return {
        text: "",
        priorities: ["low", "medium", "high", "critical"],
        statuses: ["Nuovo","Da fare","In corso","Schedulato","Completato"],
        maxOnly: false,
        createdFrom: "",
        createdTo: "",
        dueFrom: "",
        dueTo: "",
        assignees: [],
        projects: []
    };
}

function loadOpFilter() {
    try {
        const raw = localStorage.getItem(OPF_KEY);
        if (!raw) return defaultOpFilter();
        const f = JSON.parse(raw);
        return { ...defaultOpFilter(), ...f };
    } catch(_) {
        return defaultOpFilter();
    }
}

function saveOpFilter(f) {
    try {
        localStorage.setItem(OPF_KEY, JSON.stringify(f || defaultOpFilter()));
    } catch(_) { }
}

let opFilter = loadOpFilter();

/* ------------------------------------------------------------
   OPEN FILTER DIALOG
   ------------------------------------------------------------ */
window.openOpFilterDialog = function() {
    const dlg = document.getElementById("opFilterDlg");
    if (!dlg) return;

    $("#opfText").value = opFilter.text || "";

    // priorities
    $$("#opfPrioGroup input[type=checkbox]").forEach(cb => {
        cb.checked = (opFilter.priorities || []).includes(cb.value);
    });

    // statuses
    $$("#opfStatusGroup input[type=checkbox]").forEach(cb => {
        cb.checked = (opFilter.statuses || []).includes(cb.value);
    });

    $("#opfMaxOnly").checked = !!opFilter.maxOnly;

    $("#opfCreatedFrom").value = opFilter.createdFrom || "";
    $("#opfCreatedTo").value = opFilter.createdTo || "";
    $("#opfDueFrom").value     = opFilter.dueFrom     || "";
    $("#opfDueTo").value       = opFilter.dueTo       || "";

    $("#opfAssignees").value = (opFilter.assignees || []).join(", ");
    $("#opfProjects").value  = (opFilter.projects  || []).join(", ");

    openDialogById("opFilterDlg");
};

document.getElementById("opfResetBtn")
    ?.addEventListener("click", () => {
        opFilter = defaultOpFilter();
        saveOpFilter(opFilter);
        renderOpenPoints();
        closeDialog(document.getElementById("opFilterDlg"));
    });

document.getElementById("opfApplyBtn")
    ?.addEventListener("click", () => {
        function getChecked(id) {
            return $$("#" + id + " input[type=checkbox]")
                .filter(cb => cb.checked)
                .map(cb => cb.value);
        }

        opFilter = {
            text: $("#opfText").value.trim().toLowerCase(),
            priorities: getChecked("opfPrioGroup"),
            statuses: getChecked("opfStatusGroup"),
            maxOnly: $("#opfMaxOnly").checked,
            createdFrom: $("#opfCreatedFrom").value.trim(),
            createdTo: $("#opfCreatedTo").value.trim(),
            dueFrom: $("#opfDueFrom").value.trim(),
            dueTo: $("#opfDueTo").value.trim(),
            assignees: $("#opfAssignees").value
                .split(",").map(s=>s.trim().toLowerCase()).filter(Boolean),
            projects: $("#opfProjects").value
                .split(",").map(s=>s.trim().toLowerCase()).filter(Boolean)
        };

        saveOpFilter(opFilter);
        renderOpenPoints();
        closeDialog(document.getElementById("opFilterDlg"));
    });

/* ------------------------------------------------------------
   FILTER LOGIC
   ------------------------------------------------------------ */
function inDateRange(val, from, to) {
    if (!val) return true;
    try {
        const v = new Date(val).toISOString().slice(0,10);
        if (from && v < from) return false;
        if (to   && v > to)   return false;
        return true;
    } catch(_) { return true; }
}

function applyOpFilters(rows) {
    const f = opFilter || defaultOpFilter();

    return rows.filter(o => {
        const textVal = f.text;

        if (textVal) {
            const bag = [
                o.title || "",
                o.project || "",
                o.desc || "",
                o.notes || "",
                Array.isArray(o.assignees) ? o.assignees.join(" ") : (o.assignees || "")
            ].join(" ").toLowerCase();

            if (!bag.includes(textVal)) return false;
        }

        // priority
        const pr = (o.priority || "medium").toLowerCase();
        if (f.priorities.length && !f.priorities.includes(pr)) return false;

        // status
        const st = o.status || "Nuovo";
        if (f.statuses.length && !f.statuses.includes(st)) return false;

        // max only
        if (f.maxOnly && !o.maxPriority) return false;

        // dates
        if (!inDateRange(o.createdAt || "", f.createdFrom || "", f.createdTo || "")) return false;
        if (!inDateRange(o.dueAt     || "", f.dueFrom     || "", f.dueTo     || "")) return false;

        // assignees
        if (f.assignees.length) {
            const a = Array.isArray(o.assignees)
                ? o.assignees.map(x => String(x).toLowerCase())
                : String(o.assignees || "").toLowerCase();

            let ok = false;
            f.assignees.forEach(x => {
                if (Array.isArray(a)) {
                    if (a.includes(x)) ok = true;
                } else {
                    if (a.includes(x)) ok = true;
                }
            });
            if (!ok) return false;
        }

        // projects
        if (f.projects.length) {
            const p = String(o.project || "").toLowerCase();
            let okp = false;
            f.projects.forEach(x => {
                if (x && p.includes(x)) okp = true;
            });
            if (!okp) return false;
        }

        return true;
    });
}

/* ------------------------------------------------------------
   SORTING
   ------------------------------------------------------------ */
let opSort = { key: "createdAt", dir: "desc" };

function cmp(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

function cmpDate(a, b) {
    try {
        a = a ? new Date(a).toISOString().slice(0,10) : "";
        b = b ? new Date(b).toISOString().slice(0,10) : "";
    } catch(_) {}
    return cmp(a, b);
}

function sortOpRows(rows) {
    const k = opSort.key;
    const d = opSort.dir === "desc" ? -1 : 1;

    const PRIORITY_ORDER = { low:1, medium:2, high:3, critical:4 };
    const STATUS_ORDER   = {
        "Nuovo":1, "Da fare":2, "In corso":3,
        "Schedulato":4, "Completato":5
    };

    return rows.slice().sort((x, y) => {
        let r = 0;

        switch(k) {
            case "title":
            case "project":
                r = cmp(
                    String(x[k]||"").toLowerCase(),
                    String(y[k]||"").toLowerCase()
                );
                break;

            case "assignees":
                r = cmp(
                    String(Array.isArray(x.assignees)?x.assignees.join(", "):x.assignees||"")
                        .toLowerCase(),
                    String(Array.isArray(y.assignees)?y.assignees.join(", "):y.assignees||"")
                        .toLowerCase()
                );
                break;

            case "priority":
                r = cmp(
                    PRIORITY_ORDER[(x.priority||"medium")],
                    PRIORITY_ORDER[(y.priority||"medium")]
                );
                break;

            case "status":
                r = cmp(
                    STATUS_ORDER[(x.status||"Nuovo")],
                    STATUS_ORDER[(y.status||"Nuovo")]
                );
                break;

            case "maxPriority":
                r = cmp(!!x.maxPriority, !!y.maxPriority);
                break;

            case "createdAt":
            case "dueAt":
                r = cmpDate(x[k]||"", y[k]||"");
                break;

            case "id":
                r = cmp(String(x.id||""), String(y.id||""));
                break;
        }

        return r * d;
    });
}

// update sort arrow
function sortArrowFor(key) {
    if (opSort.key !== key) return "";
    return " <span class=\"arrow\">" + (opSort.dir === "asc" ? "↑" : "↓") + "</span>";
}

// set sorting
window.setOpSort = function(key) {
    if (opSort.key === key) {
        opSort.dir = (opSort.dir === "asc" ? "desc" : "asc");
    } else {
        opSort.key = key;
        opSort.dir = (key === "createdAt" || key === "dueAt" ? "desc" : "asc");
    }
    renderOpenPoints();
};

/* ------------------------------------------------------------
   RENDER TABLE
   ------------------------------------------------------------ */
function renderOpenPoints() {
    const tbl = document.getElementById("opTable");
    if (!tbl) return;

    const all = state.openPoints || [];
    const filtered = applyOpFilters(all);
    const rows = sortOpRows(filtered);

    document.getElementById("opCount").textContent =
        rows.length + " risultati su " + all.length;

    // THEAD
    const thead = ""
        + "<thead><tr>"
        + "<th class='sortable' onclick=\"setOpSort('title')\">Titolo" + sortArrowFor("title") + "</th>"
        + "<th class='sortable' onclick=\"setOpSort('project')\">Progetto" + sortArrowFor("project") + "</th>"
        + "<th class='sortable' onclick=\"setOpSort('assignees')\">Assegnatari" + sortArrowFor("assignees") + "</th>"
        + "<th class='sortable' onclick=\"setOpSort('priority')\">Priorità" + sortArrowFor("priority") + "</th>"
        + "<th class='sortable' onclick=\"setOpSort('status')\">Stato" + sortArrowFor("status") + "</th>"
        + "<th class='sortable' onclick=\"setOpSort('maxPriority')\">Max" + sortArrowFor("maxPriority") + "</th>"
        + "<th class='sortable' onclick=\"setOpSort('createdAt')\">Inserito il" + sortArrowFor("createdAt") + "</th>"
        + "<th class='sortable' onclick=\"setOpSort('dueAt')\">Scadenza" + sortArrowFor("dueAt") + "</th>"
        + "<th>Azioni</th>"
        + "</tr></thead>";

    if (!rows.length) {
        tbl.innerHTML = thead
            + "<tbody><tr><td colspan='10'><div class='muted'>Nessun open point</div></td></tr></tbody>";
        return;
    }

    // TBODY
    const tbody = "<tbody>"
        + rows.map(o => {
            const assTxt = Array.isArray(o.assignees)
                ? o.assignees.join(", ")
                : (o.assignees || "");

            return ""
                + "<tr>"
                + "<td class='col-title'><strong>" + escapeHtml(o.title) + "</strong>"
                    + (o.desc
                        ? "<br><span class='muted'>" + escapeHtml(o.desc) + "</span>"
                        : "")
                    + (o.notes
                        ? "<br><span class='muted'><em>Note:</em> " + escapeHtml(o.notes) + "</span>"
                        : "")
                + "</td>"
                + "<td>" + escapeHtml(o.project || "") + "</td>"
                + "<td>" + escapeHtml(assTxt) + "</td>"
                + "<td><span class='badge'>" + escapeHtml((o.priority||"medium").toUpperCase()) + "</span></td>"
                + "<td><span class='badge state'>" + escapeHtml(o.status||"Nuovo") + "</span></td>"
                + "<td>" + (o.maxPriority ? "<span class='badge max'>MAX</span>" : "") + "</td>"
                + "<td class='col-created'>" + escapeHtml(o.createdAt || "") + "</td>"
                + "<td class='col-due'>" + escapeHtml(o.dueAt || "") + "</td>"
                + "<td><div class='table-actions'>"
                    + "<button onclick=\"editOpenPoint('" + o.id + "')\">✏️</button>"
                    + "<button class='danger' onclick=\"deleteOpenPoint('" + o.id + "')\">🗑️</button>"
                + "</div></td>"
                + "</tr>";
        }).join("")
        + "</tbody>";

    tbl.innerHTML = thead + tbody;
}

/* ------------------------------------------------------------
   EXPORT OP - JSON
   ------------------------------------------------------------ */
function exportOpenPointsJSON() {
    const blob = new Blob(
        [ JSON.stringify({ openPoints: state.openPoints || [] }, null, 2) ],
        { type: "application/json" }
    );
    downloadBlob(blob, "open-points.json");
}

async function exportOpenPointsWithDialog() {
  try {
    const data = { openPoints: state.openPoints ?? [] };
    const jsonText = JSON.stringify(data, null, 2);

    const fileHandle = await window.showSaveFilePicker({
      suggestedName: "open-points.json",
      types: [{
        description: "JSON File",
        accept: { "application/json": [".json"] }
      }]
    });

    const writable = await fileHandle.createWritable();
    await writable.write(jsonText);
    await writable.close();

    toast("File open-points salvato ✔");
  } catch (err) {
    if (err?.name === "AbortError") {
      toast("Salvataggio annullato");
      return;
    }
    alert("Errore nel salvataggio: " + err.message);
  }
}

async function exportServicesWithDialog() {
  try {
    const data = { services: state.services ?? [] };
    const jsonText = JSON.stringify(data, null, 2);

    const fileHandle = await window.showSaveFilePicker({
      suggestedName: "services.json",
      types: [{
        description: "JSON File",
        accept: { "application/json": [".json"] }
      }]
    });

    const writable = await fileHandle.createWritable();
    await writable.write(jsonText);
    await writable.close();

    toast("Servizi salvati ✔");
  } catch (err) {
    if (err?.name === "AbortError") {
      toast("Salvataggio annullato");
      return;
    }
    alert("Errore salvataggio servizi: " + err.message);
  }
}

async function exportCrqWithDialog() {
  try {
    const data = { crq: state.crq ?? [] };
    const jsonText = JSON.stringify(data, null, 2);

    const fileHandle = await window.showSaveFilePicker({
      suggestedName: "crq.json",
      types: [{
        description: "JSON File",
        accept: { "application/json": [".json"] }
      }]
    });

    const writable = await fileHandle.createWritable();
    await writable.write(jsonText);
    await writable.close();

    toast("CRQ salvate ✔");
  } catch (err) {
    if (err?.name === "AbortError") {
      toast("Salvataggio annullato");
      return;
    }
    alert("Errore nel salvataggio CRQ: " + err.message);
  }
}

document.querySelector("[data-do='opSave']")
  ?.addEventListener("click", exportOpenPointsWithDialog);
  

document.querySelector("[data-do='crqSave']")
  ?.addEventListener("click", exportCrqWithDialog);


document.querySelector("[data-do='svcSave']")
  ?.addEventListener("click", exportServicesWithDialog);

/* ------------------------------------------------------------
   IMPORT OP
   ------------------------------------------------------------ */
window.importOpenPointsFromFile = async function() {
    try {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "application/json";
        inp.onchange = async () => {
            const file = inp.files[0];
            if (!file) return;
            const txt = await file.text();
            const json = JSON.parse(txt);

            const arr = Array.isArray(json)
                ? json
                : (Array.isArray(json.openPoints) ? json.openPoints : null);

            if (!arr) {
                alert("JSON non valido: atteso array o { openPoints: [...] }");
                return;
            }

            state.openPoints = arr.map(o => normalizeOP(o));
            saveState(state);
            renderOpenPoints();
            toast("Open Points caricati da file");
        };
        inp.click();
    } catch (e) {
        alert("Errore import OP: " + (e && e.message));
    }
};

document.querySelector("[data-do='opLoad']")
    ?.addEventListener("click", importOpenPointsFromFile);

/* ------------------------------------------------------------
   EXPORT CSV
   ------------------------------------------------------------ */
function quoteCSV(v) {
    v = (v == null ? "" : String(v));
    return /["\n;]/.test(v) ? "\"" + v.replace(/"/g, "\"\"") + "\"" : v;
}

document.querySelector("[data-do='opCSV']")
    ?.addEventListener("click", () => {
        const rows = sortOpRows(applyOpFilters(state.openPoints || []));

        const head = [
            "ID","Titolo","Progetto","Assegnatari",
            "Priorita","Stato","MaxPriority",
            "InseritoIl","Scadenza","Descrizione","Note"
        ];

        const csv = [ head.join(";") ]
            .concat(rows.map(o => [
                o.id,
                o.title,
                o.project,
                Array.isArray(o.assignees) ? o.assignees.join(", ") : (o.assignees||""),
                (o.priority||"").toUpperCase(),
                (o.status||""),
                (o.maxPriority ? "1":"0"),
                o.createdAt||"",
                o.dueAt||"",
                o.desc||"",
                o.notes||""
            ].map(quoteCSV).join(";")))
            .join("\n");

        downloadBlob(
            new Blob([csv], { type:"text/csv;charset=utf-8;" }),
            "open-points.csv"
        );
    });

/* ------------------------------------------------------------
   EXPORT EXCEL (.xls XML)
   ------------------------------------------------------------ */
document.querySelector("[data-do='opXLS']")
    ?.addEventListener("click", () => {
        const rows = sortOpRows(applyOpFilters(state.openPoints || []));
        function xmlEsc(s) {
            return String(s == null ? "" : s)
                .replace(/&/g,"&amp;")
                .replace(/</g,"&lt;")
                .replace(/>/g,"&gt;");
        }
        function cell(v, type) {
            return "<Cell><Data ss:Type=\"" + (type||"String") + "\">"
                 + xmlEsc(v) + "</Data></Cell>";
        }

        const head = [
            "ID","Titolo","Progetto","Assegnatari",
            "Priorita","Stato","MaxPriority",
            "Inserito il","Scadenza","Descrizione","Note"
        ];

        let xml = "<?xml version=\"1.0\"?>\n"
                + "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" "
                + "xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">\n"
                + "<Worksheet ss:Name=\"OpenPoints\"><Table>";

        xml += "<Row>" + head.map(h => cell(h)).join("") + "</Row>";

        rows.forEach(o => {
            const ass = Array.isArray(o.assignees) ? o.assignees.join(", ") : (o.assignees||"");
            xml += "<Row>"
                + cell(o.id)
                + cell(o.title)
                + cell(o.project)
                + cell(ass)
                + cell((o.priority||"").toUpperCase())
                + cell(o.status||"")
                + cell(o.maxPriority ? "1":"0", "Number")
                + cell(o.createdAt||"")
                + cell(o.dueAt||"")
                + cell(o.desc||"")
                + cell(o.notes||"")
                + "</Row>";
        });

        xml += "</Table></Worksheet></Workbook>";

        downloadBlob(
            new Blob([xml], { type:"application/vnd.ms-excel" }),
            "open-points.xls"
        );
    });
	
/* ============================================================
   V5 SERVICES — CRUD + FILTERS + SORT + RENDER + EXPORT
   Safe‑Copy format
   ============================================================ */

/* ------------------------------------------------------------
   NORMALIZATION
   ------------------------------------------------------------ */
function normalizeService(s) {
    return {
        id: s && s.id ? String(s.id) : crypto.randomUUID(),
        routine: (s && s.routine ? String(s.routine) : "").trim(),
        tipo: (s && s.tipo ? String(s.tipo) : "REST").toUpperCase() === "SOAP" ? "SOAP" : "REST",
        servizio: (s && s.servizio ? String(s.servizio) : "").trim(),
        operation: (s && (s.operation || s["operation / parametro"])) ?
            String(s.operation || s["operation / parametro"]).trim() : "",
        fallback: (s && (s.fallback || s["fallback JDBC/SWP"])) ?
            String(s.fallback || s["fallback JDBC/SWP"]).trim() : "",
        descrizione: (s && s.descrizione ? String(s.descrizione) : "").trim(),
        ambito: (s && s.ambito ? String(s.ambito) : "").trim(),
        applicativo: (s && (s.applicativo || s["applicativo"])) ?
            String(s.applicativo || s["applicativo"]).trim() : "",
        paramsIngresso: (s && (s.paramsIngresso || s["parametriIngresso"] || s["paramsIngresso"])) ?
            String(s.paramsIngresso || s["parametriIngresso"] || s["paramsIngresso"]).trim() : "",
        outputServizio: (s && (s.outputServizio || s["output"])) ?
            String(s.outputServizio || s["output"]).trim() : "",
        stato: (s && s.stato ? String(s.stato) : "").trim()
    };
}

/* ------------------------------------------------------------
   OPEN SERVICE DIALOG
   ------------------------------------------------------------ */
function openServiceDialog(item) {
    const dlg = document.getElementById("serviceDialog");
    if (!dlg) return;

    document.getElementById("svcDlgTitle").textContent =
        item ? "Modifica servizio" : "Nuovo servizio";

    $("#svcRoutine").value      = (item && item.routine) || "";
    $("#svcTipo").value         = (item && item.tipo) || "REST";
    $("#svcServizio").value     = (item && item.servizio) || "";
    $("#svcOperation").value    = (item && item.operation) || "";
    $("#svcFallback").value     = (item && item.fallback) || "";
    $("#svcDescrizione").value  = (item && item.descrizione) || "";
    $("#svcAmbito").value       = (item && item.ambito) || "";
    $("#svcApplicativo").value  = (item && item.applicativo) || "";
    $("#svcParamsIn").value     = (item && item.paramsIngresso) || "";
    $("#svcOutput").value       = (item && item.outputServizio) || "";

    dlg.dataset.editing = item ? item.id : "";
    openDialogById("serviceDialog");
}

document.getElementById("svcSaveBtn")
    ?.addEventListener("click", saveServiceDialog);

/* ------------------------------------------------------------
   SAVE SERVICE
   ------------------------------------------------------------ */
function saveServiceDialog() {
    const dlg = document.getElementById("serviceDialog");
    const id = dlg.dataset.editing;

    const obj = normalizeService({
        routine: $("#svcRoutine").value.trim(),
        tipo: $("#svcTipo").value.trim(),
        servizio: $("#svcServizio").value.trim(),
        operation: $("#svcOperation").value.trim(),
        fallback: $("#svcFallback").value.trim(),
        descrizione: $("#svcDescrizione").value.trim(),
        ambito: $("#svcAmbito").value.trim(),
        applicativo: $("#svcApplicativo").value.trim(),
        paramsIngresso: $("#svcParamsIn").value.trim(),
        outputServizio: $("#svcOutput").value.trim(),
        stato: ""   // lo stato può essere esteso in futuro
    });

    if (!obj.routine || !obj.servizio) {
        alert("ROUTINE e SERVIZIO sono obbligatori.");
        return;
    }

    if (id) {
        const i = state.services.findIndex(x => x.id === id);
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
window.deleteService = function(id) {
    if (!confirm("Eliminare questo servizio?")) return;
    state.services = (state.services || []).filter(s => s.id !== id);
    saveState(state);
    renderServices();
};

/* ------------------------------------------------------------
   EDIT SERVICE
   ------------------------------------------------------------ */
window.editService = function(id) {
    const it = (state.services || []).find(s => s.id === id);
    if (it) openServiceDialog(it);
};

/* ------------------------------------------------------------
   FILTER STATE
   ------------------------------------------------------------ */
const SVCF_KEY = "tsa.v5.svcfilter";

function defaultSvcFilter() {
    return {
        text: "",
        tipi: ["REST", "SOAP"],
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
    } catch(_) { return defaultSvcFilter(); }
}

function saveSvcFilter(f) {
    try {
        localStorage.setItem(SVCF_KEY, JSON.stringify(f || defaultSvcFilter()));
    } catch(_){}
}

let svcFilter = loadSvcFilter();

/* ------------------------------------------------------------
   OPEN FILTER DIALOG
   ------------------------------------------------------------ */
window.openSvcFilterDialog = function() {
    const dlg = document.getElementById("svcFilterDlg");
    if (!dlg) return;
	
	populateSvcStatoChips();


	// Assicura la classe "checks" sui gruppi (stile pill/ripple)
	document.getElementById("svcfTipoGroup")?.classList.add("checks");
	document.getElementById("svcfStatoGroup")?.classList.add("checks");


	// 2) Fallback cross-browser: forza i fieldset “Tipo” e “Stato” a full-span
	const tipoFs  = document.querySelector("#svcfTipoGroup")?.closest("fieldset");
	const statoFs = document.querySelector("#svcfStatoGroup")?.closest("fieldset");
	tipoFs?.classList.add("full-span");
	statoFs?.classList.add("full-span");
	
	
	// 3) Assicura che il vero contenitore sia la griglia a 3 colonne
	const body = dlg.querySelector(".modal-body");
	if (body) body.classList.add("grid-3");



    $("#svcfText").value = svcFilter.text || "";
    $("#svcfId").value = svcFilter.idContains || "";
    $("#svcfRoutine").value = (svcFilter.routine || []).join(", ");
    $("#svcfServizi").value = (svcFilter.servizi || []).join(", ");
    $("#svcfDescrizione").value = svcFilter.descrizioneContains || "";
    $("#svcfAmbiti").value = (svcFilter.ambiti || []).join(", ");
    $("#svcfApplicativi").value = (svcFilter.applicativi || []).join(", ");
    $("#svcfFallback").value = (svcFilter.fallback || []).join(", ");
    $("#svcfOperation").value = (svcFilter.operations || []).join(", ");
    $("#svcfParamsIn").value = (svcFilter.params || []).join(", ");
    $("#svcfOutput").value = (svcFilter.outputs || []).join(", ");

    // tipi
    $$("#svcfTipoGroup input[type=checkbox]").forEach(cb => {
        cb.checked = (svcFilter.tipi || []).includes(cb.value);
    });

    // stati (futuro: dinamico)
    $$("#svcfStatoGroup input[type=checkbox]").forEach(cb => {
        cb.checked = (svcFilter.stati || []).includes(cb.value);
    });

    openDialogById("svcFilterDlg");
};

// ===== CHIP per Stato Servizi =====
function populateSvcStatoChips() {
    const grp = document.getElementById("svcfStatoGroup");
    if (!grp) return;

    const stati = ["OK", "KO", "ATTIVO", "ERRORE"];

    grp.innerHTML = stati.map(st => `
        <div class="svc-chip">
            <input type="checkbox" id="svcf_stato_${st.toLowerCase()}" value="${st}">
            <label for="svcf_stato_${st.toLowerCase()}">${st}</label>
        </div>
    `).join("");
}

document.getElementById("svcfResetBtn")
    ?.addEventListener("click", () => {
        svcFilter = defaultSvcFilter();
        saveSvcFilter(svcFilter);
        renderServices();
        closeDialog(document.getElementById("svcFilterDlg"));
    });

document.getElementById("svcfApplyBtn")
    ?.addEventListener("click", () => {

        function splitList(v) {
            return String(v || "")
                .split(",")
                .map(x => x.trim())
                .filter(Boolean);
        }

        function getChecked(id) {
            return $$("#" + id + " input[type=checkbox]")
                .filter(cb => cb.checked)
                .map(cb => cb.value);
        }

        svcFilter = {
            text: $("#svcfText").value.trim().toLowerCase(),
            idContains: $("#svcfId").value.trim(),
            routine: splitList($("#svcfRoutine").value),
            servizi: splitList($("#svcfServizi").value),
            tipi: getChecked("svcfTipoGroup"),
            descrizioneContains: $("#svcfDescrizione").value.trim().toLowerCase(),
            ambiti: splitList($("#svcfAmbiti").value).map(s=>s.toLowerCase()),
            applicativi: splitList($("#svcfApplicativi").value).map(s=>s.toLowerCase()),
            fallback: splitList($("#svcfFallback").value).map(s=>s.toLowerCase()),
            operations: splitList($("#svcfOperation").value).map(s=>s.toLowerCase()),
            params: splitList($("#svcfParamsIn").value).map(s=>s.toLowerCase()),
            outputs: splitList($("#svcfOutput").value).map(s=>s.toLowerCase()),
            stati: getChecked("svcfStatoGroup")
        };

        saveSvcFilter(svcFilter);
        renderServices();
        closeDialog(document.getElementById("svcFilterDlg"));
    });

/* ------------------------------------------------------------
   FILTER LOGIC
   ------------------------------------------------------------ */
function applySvcFilters(rows) {
    const f = svcFilter || defaultSvcFilter();

    return rows.filter(s => {
        const bag = [
            s.routine, s.tipo, s.servizio, s.operation,
            s.fallback, s.descrizione, s.ambito,
            s.applicativo, s.paramsIngresso, s.outputServizio, s.stato
        ].join(" ").toLowerCase();

        if (f.text && !bag.includes(f.text)) return false;

        if (f.idContains) {
            if (!String(s.id || "").includes(f.idContains)) return false;
        }

        // routine
        if (f.routine.length) {
            const val = (s.routine || "").toLowerCase();
            if (!f.routine.some(x => val.includes(x.toLowerCase()))) return false;
        }

        // servizi
        if (f.servizi.length) {
            const val = (s.servizio || "").toLowerCase();
            if (!f.servizi.some(x => val.includes(x.toLowerCase()))) return false;
        }

        // tipi
        if (f.tipi.length && !f.tipi.includes(s.tipo)) return false;

        // descrizione
        if (f.descrizioneContains) {
            if (!(s.descrizione || "").toLowerCase().includes(f.descrizioneContains)) return false;
        }

        // ambiti
        if (f.ambiti.length) {
            const val = (s.ambito || "").toLowerCase();
            if (!f.ambiti.some(x => val.includes(x))) return false;
        }

        // applicativi
        if (f.applicativi.length) {
            const val = (s.applicativo || "").toLowerCase();
            if (!f.applicativi.some(x => val.includes(x))) return false;
        }

        // fallback
        if (f.fallback.length) {
            const vals = String(s.fallback || "").toLowerCase().split(/[\n,]+/).map(x=>x.trim());
            if (!f.fallback.some(x => vals.includes(x))) return false;
        }

        // operations
        if (f.operations.length) {
            const vals = String(s.operation || "").toLowerCase().split(/[\n,]+/).map(x=>x.trim());
            if (!f.operations.some(x => vals.includes(x))) return false;
        }

        // params
        if (f.params.length) {
            const vals = String(s.paramsIngresso || "").toLowerCase().split(/[\n,]+/).map(x=>x.trim());
            if (!f.params.some(x => vals.includes(x))) return false;
        }

        // outputs
        if (f.outputs.length) {
            const vals = String(s.outputServizio || "").toLowerCase().split(/[\n,]+/).map(x=>x.trim());
            if (!f.outputs.some(x => vals.includes(x))) return false;
        }

        // stati
        if (f.stati.length) {
            const val = (s.stato || "").trim();
            if (!f.stati.includes(val)) return false;
        }

        return true;
    });
}

/* ------------------------------------------------------------
   SORTING
   ------------------------------------------------------------ */
let svcSort = { key: "routine", dir: "asc" };

window.setSvcSort = function(k) {
    if (svcSort.key === k) {
        svcSort.dir = (svcSort.dir === "asc" ? "desc" : "asc");
    } else {
        svcSort.key = k;
        svcSort.dir = "asc";
    }
    renderServices();
};

function sortSvcRows(rows) {
    const k = svcSort.key;
    const d = svcSort.dir === "desc" ? -1 : 1;

    return rows.slice().sort((a, b) => {
        return String(a[k] || "").localeCompare(String(b[k] || "")) * d;
    });
}

/* ------------------------------------------------------------
   RENDER TABLE
   ------------------------------------------------------------ */
function renderServices() {
    const tbl = document.getElementById("svcTable");
    if (!tbl) return;

    const all = state.services || [];
    const rows = sortSvcRows(applySvcFilters(all));

    $("#svcCount").textContent = rows.length + " risultati su " + all.length;

    function th(k, label) {
        return "<th class='sortable' onclick=\"setSvcSort('" + k + "')\">" +
                label + (svcSort.key===k ? " <span class='arrow'>" +
                (svcSort.dir==='asc' ? "↑":"↓") + "</span>" : "") +
               "</th>";
    }

    let thead =
        "<thead><tr>" +
        th("routine","ROUTINE") +
        th("tipo","TIPO") +
        th("servizio","SERVIZIO") +
        th("operation","OPERATION / PARAM") +
        th("fallback","FALLBACK JDBC/SWP") +
        th("descrizione","DESCRIZIONE") +
        th("ambito","AMBITO") +
        th("applicativo","APPLICATIVO") +
        th("paramsIngresso","PARAM IN") +
        th("outputServizio","OUTPUT") +
        th("stato","STATO") +
        "<th>Azioni</th>" +
        "</tr></thead>";

    if (!rows.length) {
        tbl.innerHTML = thead +
            "<tbody><tr><td colspan='13'><div class='muted'>Nessun servizio</div></td></tr></tbody>";
        return;
    }

    const tbody = "<tbody>" +
        rows.map(s =>
            "<tr>" +
            "<td>" + escapeHtml(s.routine) + "</td>" +
            "<td>" + escapeHtml(s.tipo) + "</td>" +
            "<td>" + escapeHtml(s.servizio) + "</td>" +
            "<td class='col-multiline'>" + escapeHtml(s.operation) + "</td>" +
            "<td>" + escapeHtml(s.fallback) + "</td>" +
            "<td class='col-multiline'>" + escapeHtml(s.descrizione) + "</td>" +
            "<td>" + escapeHtml(s.ambito) + "</td>" +
            "<td>" + escapeHtml(s.applicativo) + "</td>" +
            "<td class='col-multiline'>" + escapeHtml(s.paramsIngresso) + "</td>" +
            "<td class='col-multiline'>" + escapeHtml(s.outputServizio) + "</td>" +
            "<td>" + escapeHtml(s.stato || "") + "</td>" +
            "<td><div class='table-actions'>" +
            "<button onclick=\"editService('" + s.id + "')\">✏️</button>" +
            "<button class='danger' onclick=\"deleteService('" + s.id + "')\">🗑️</button>" +
            "</div></td>" +
            "</tr>"
        ).join("") +
        "</tbody>";

    tbl.innerHTML = thead + tbody;
}

/* ------------------------------------------------------------
   EXPORT JSON
   
document.querySelector("[data-do='svcSave']")
    ?.addEventListener("click", () => {
        const blob = new Blob(
            [ JSON.stringify({ services: state.services || [] }, null, 2) ],
            { type: "application/json" }
        );
        downloadBlob(blob, "services.json");
    });
------------------------------------------------------------ */
/* ------------------------------------------------------------
   IMPORT JSON
   ------------------------------------------------------------ */
window.importServicesFromFile = async function() {
    try {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "application/json";
        inp.onchange = async () => {
            const file = inp.files[0];
            if (!file) return;
            const txt = await file.text();
            const json = JSON.parse(txt);

            const arr = Array.isArray(json)
                ? json
                : (Array.isArray(json.services) ? json.services : []);

            state.services = arr.map(s => normalizeService(s));
            saveState(state);
            renderServices();
            toast("Servizi caricati ✔");
        };
        inp.click();
    } catch (e) {
        alert("Errore import Servizi: " + (e && e.message));
    }
};

document.querySelector("[data-do='svcLoad']")
    ?.addEventListener("click", importServicesFromFile);

/* ------------------------------------------------------------
   EXPORT CSV
   ------------------------------------------------------------ */
document.querySelector("[data-do='svcCSV']")
    ?.addEventListener("click", () => {
        const rows = sortSvcRows(applySvcFilters(state.services || []));
        const head = [
            "ID","Routine","Tipo","Servizio","Operation",
            "Fallback","Descrizione","Ambito","Applicativo",
            "Param IN","Output","Stato"
        ];

        const csv = [ head.join(";") ]
            .concat(rows.map(s => [
                s.id, s.routine, s.tipo, s.servizio,
                s.operation, s.fallback, s.descrizione,
                s.ambito, s.applicativo, s.paramsIngresso,
                s.outputServizio, s.stato
            ].map(v => quoteCSV(v)).join(";")))
            .join("\n");

        downloadBlob(
            new Blob([csv], { type:"text/csv;charset=utf-8;" }),
            "services.csv"
        );
    });

/* ------------------------------------------------------------
   EXPORT EXCEL (.xls XML)
   ------------------------------------------------------------ */
document.querySelector("[data-do='svcXLS']")
    ?.addEventListener("click", () => {
        const rows = sortSvcRows(applySvcFilters(state.services || []));
        function xmlEsc(s) {
            return String(s == null ? "" : s)
                .replace(/&/g,"&amp;")
                .replace(/</g,"&lt;")
                .replace(/>/g,"&gt;");
        }
        function cell(v,type) {
            return "<Cell><Data ss:Type=\"" + (type||"String") + "\">" +
                xmlEsc(v) + "</Data></Cell>";
        }

        const head = [
            "ID","Routine","Tipo","Servizio","Operation",
            "Fallback","Descrizione","Ambito","Applicativo",
            "Param IN","Output","Stato"
        ];

        let xml =
            "<?xml version=\"1.0\"?>\n" +
            "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" " +
            "xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">\n" +
            "<Worksheet ss:Name=\"Servizi\"><Table>";

        xml += "<Row>" + head.map(h => cell(h)).join("") + "</Row>";

        rows.forEach(s => {
            xml += "<Row>"
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
                + "</Row>";
        });

        xml += "</Table></Worksheet></Workbook>";

        downloadBlob(
            new Blob([xml], { type:"application/vnd.ms-excel" }),
            "services.xls"
        );
    });

/* ------------------------------------------------------------
   CLEAR ALL SERVICES
   ------------------------------------------------------------ */
document.querySelector("[data-do='svcClear']")
    ?.addEventListener("click", () => {
        if (!confirm("Confermi? Saranno eliminati TUTTI i Servizi.")) return;
        state.services = [];
        saveState(state);
        renderServices();
    });
	
/* ============================================================
   V5 CRQ — CRUD + FILTERS + SORT + RENDER + EXPORT + HELP
   Safe‑Copy format
   ============================================================ */

/* ------------------------------------------------------------
   NORMALIZATION
   ------------------------------------------------------------ */
function normalizeCRQ(o) {
  return {
    id: o && o.id ? String(o.id) : crypto.randomUUID(),
    rfcAperti: (o && o.rfcAperti ? String(o.rfcAperti) : "").trim(),
    stato: (o && o.stato ? String(o.stato) : "").trim(),
    dataApertura: (o && o.dataApertura ? String(o.dataApertura) : "").trim(),
    anno: (o && o.anno ? String(o.anno) : "").trim(),

    // ⭐ AGGIUNTO: Bhelp Operatore (RFC)
    bhelp: (
      o && (
        o.bhelp ||
        o.bhelpOperatore ||
        o.bhelpOperatoreRFC ||
        o["Bhelp Operatore (RFC)"]
      )
    ) ? String(
        o.bhelp ||
        o.bhelpOperatore ||
        o.bhelpOperatoreRFC ||
        o["Bhelp Operatore (RFC)"]
      ).trim() : "",

    emerg: (o && (o.emerg || o.emergenza) ? String(o.emerg || o.emergenza) : "").trim(),
    utilizzato: (o && o.utilizzato ? String(o.utilizzato) : "").trim(),
    categoria: (o && o.categoria ? String(o.categoria) : "").trim(),
    dataRilascio: (o && o.dataRilascio ? String(o.dataRilascio) : "").trim(),
    rifNostro: (o && o.rifNostro ? String(o.rifNostro) : "").trim(),
    prj: (o && o.prj ? String(o.prj) : "").trim(),
    contenuto: (o && o.contenuto ? String(o.contenuto) : "").trim()
  };
}

/* ------------------------------------------------------------
   OPEN CRQ EDITOR
   ------------------------------------------------------------ */
function openCrqEditor(item) {
    const dlg = document.getElementById("crqEditorDlg");
    if (!dlg) return;

    document.getElementById("crqDlgTitle").textContent =
        item ? "Modifica CRQ" : "Nuova CRQ";

    // 1️⃣ Popola prima gli stati (e emergenza se serve)
    populateCrqStati();
	
	
	// ===== Auto-fill BHELP =====
	bindCrqBhelpAutoFill();


    // 2️⃣ Poi imposta il valore
    $("#crqStato").value = (item && item.stato) || "";
	
	// Auto-valorizza subito il campo Bhelp
	  $("#crqBhelp").value = 
		(item && item.bhelp) ||
		CRQ_BHELP_MAP[$("#crqStato").value] ||
		"";


    // Altri campi
    $("#crqRfcAperti").value    = (item && item.rfcAperti)    || "";
    $("#crqDataApertura").value = (item && item.dataApertura) || "";
    $("#crqEmerg").value        = (item && item.emerg)        || "";
    $("#crqCategoria").value    = (item && item.categoria)    || "";
    $("#crqDataRilascio").value = (item && item.dataRilascio) || "";
    $("#crqRifNostro").value    = (item && item.rifNostro)    || "";
    $("#crqPrj").value          = (item && item.prj)          || "";
    $("#crqContenuto").value    = (item && item.contenuto)    || "";

    dlg.dataset.editing = item ? item.id : "";

    openDialogById("crqEditorDlg");
}

document.getElementById("crqSaveBtn")
    ?.addEventListener("click", saveCrqDialog);

/* ------------------------------------------------------------
   SAVE CRQ
   ------------------------------------------------------------ */
function saveCrqDialog() {
    const dlg = document.getElementById("crqEditorDlg");
    const id = dlg.dataset.editing;

    const obj = normalizeCRQ({
        rfcAperti: $("#crqRfcAperti").value.trim(),
        stato: $("#crqStato").value.trim(),
        dataApertura: $("#crqDataApertura").value.trim(),
        emerg: $("#crqEmerg").value.trim(),
        categoria: $("#crqCategoria").value.trim(),
        dataRilascio: $("#crqDataRilascio").value.trim(),
        rifNostro: $("#crqRifNostro").value.trim(),
        prj: $("#crqPrj").value.trim(),
        contenuto: $("#crqContenuto").value.trim()
    });

    if (!obj.rfcAperti) {
        alert("RFC Aperti è obbligatorio.");
        return;
    }

    if (id) {
        const idx = state.crq.findIndex(c => c.id === id);
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
window.deleteCrq = function(id) {
    if (!confirm("Eliminare questa CRQ?")) return;
    state.crq = state.crq.filter(c => c.id !== id);
    saveState(state);
    renderCrq();
};

/* ------------------------------------------------------------
   EDIT HANDLER
   ------------------------------------------------------------ */
window.openCrqEditorById = function(id) {
    const it = (state.crq || []).find(c => c.id === id);
    if (it) openCrqEditor(it);
};

/* ------------------------------------------------------------
   CRQ FILTER STATE
   ------------------------------------------------------------ */
const CRQF_KEY = "tsa.v5.crqfilter";

function defaultCrqFilter() {
    return {
        text: "",
        rfc: "",
        anno: "",
        emerg: [],
        util: [],
        stati: [],
        categoria: "",
        rif: "",
        prj: "",
        contenuto: "",
        aperturaFrom: "",
        aperturaTo: "",
        rilFrom: "",
        rilTo: ""
    };
}

function loadCrqFilter() {
    try {
        const raw = localStorage.getItem(CRQF_KEY);
        if (!raw) return defaultCrqFilter();
        return { ...defaultCrqFilter(), ...JSON.parse(raw) };
    } catch(_) {
        return defaultCrqFilter();
    }
}

function saveCrqFilter(f) {
    try {
        localStorage.setItem(CRQF_KEY, JSON.stringify(f || defaultCrqFilter()));
    } catch(_) {}
}

let crqFilter = loadCrqFilter();

const CRQ_STATI = [
  "Bozza",
  "Richiesta autorizzazione",
  "Pianificazione in corso",
  "Revisione pianificata",
  "Approvazione pianificata",
  "Pianificato",
  "Implementazione in corso",
  "Completato",
  "Chiuso"
];

function populateCrqStati() {
    const sel = document.getElementById("crqStato");
    if (!sel) return;

    const stati = [
        "Bozza",
        "Richiesta autorizzazione",
        "Pianificazione in corso",
        "Revisione pianificata",
        "Approvazione pianificata",
        "Pianificato",
        "Implementazione in corso",
        "Completato",
        "Chiuso"
    ];

    sel.innerHTML =
        "<option value=''>n/d</option>" +
        stati.map(s => `<option value="${s}">${s}</option>`).join("");
}

// ===== Mappa Stato CRQ -> Bhelp Operatore (RFC) =====
const CRQ_BHELP_MAP = {
  "Bozza": "n.a.",
  "Richiesta autorizzazione": "Verifica Referente Servizio IT",
  "Pianificazione in corso": "Deploy Test / Esecuzione Test",
  "Revisione pianificata": "Completamento Test",
  "Approvazione pianificata": "Verifica ICT",
  "Pianificato": "n.a.",
  "Implementazione in corso": "Preparazione Installazione / Installazione",
  "Completato": "n.a.",
  "Chiuso": "Chiuso Deploy"
};

function bindCrqBhelpAutoFill() {
  const sel = document.getElementById("crqStato");
  const out = document.getElementById("crqBhelp");
  if (!sel || !out) return;

  sel.addEventListener("change", () => {
    const stato = sel.value;
    out.value = CRQ_BHELP_MAP[stato] || "";
  });
}


/* ------------------------------------------------------------
   OPEN FILTER DIALOG
   ------------------------------------------------------------ */
window.openCrqFilterDialog = function() {
    const dlg = document.getElementById("crqFilterDlg");
    if (!dlg) return;

    $("#crqfText").value = crqFilter.text || "";
    $("#crqfRfc").value = crqFilter.rfc || "";
    $("#crqfAnno").value = crqFilter.anno || "";
    $("#crqfCategoria").value = crqFilter.categoria || "";
    $("#crqfRif").value = crqFilter.rif || "";
    $("#crqfPrj").value = crqFilter.prj || "";
    $("#crqfContenuto").value = crqFilter.contenuto || "";

    $("#crqfAperturaFrom").value = crqFilter.aperturaFrom || "";
    $("#crqfAperturaTo").value   = crqFilter.aperturaTo || "";
    $("#crqfRilFrom").value      = crqFilter.rilFrom || "";
    $("#crqfRilTo").value        = crqFilter.rilTo || "";

    // emergenza
    $$("#crqfEmergGroup input[type=checkbox]").forEach(cb => {
        cb.checked = (crqFilter.emerg || []).includes(cb.value);
    });

    // utilizzato
    $$("#crqfUtilGroup input[type=checkbox]").forEach(cb => {
        cb.checked = (crqFilter.util || []).includes(cb.value);
    });

    // stato
    $$("#crqfStatiGroup input[type=checkbox]").forEach(cb => {
        cb.checked = (crqFilter.stati || []).includes(cb.value);
    });

    openDialogById("crqFilterDlg");
};

document.getElementById("crqfResetBtn")
    ?.addEventListener("click", () => {
        crqFilter = defaultCrqFilter();
        saveCrqFilter(crqFilter);
        renderCrq();
        closeDialog(document.getElementById("crqFilterDlg"));
    });

document.getElementById("crqfApplyBtn")
    ?.addEventListener("click", () => {

        function splitList(v) {
            return String(v || "")
                .split(",")
                .map(x => x.trim())
                .filter(Boolean);
        }

        function getChecked(id) {
            return $$("#" + id + " input[type=checkbox]")
                .filter(cb => cb.checked)
                .map(cb => cb.value);
        }

        crqFilter = {
            text: $("#crqfText").value.trim().toLowerCase(),
            rfc: $("#crqfRfc").value.trim(),
            anno: $("#crqfAnno").value.trim(),
            emerg: getChecked("crqfEmergGroup"),
            util: getChecked("crqfUtilGroup"),
            stati: getChecked("crqfStatiGroup"),
            categoria: $("#crqfCategoria").value.trim().toLowerCase(),
            rif: $("#crqfRif").value.trim().toLowerCase(),
            prj: $("#crqfPrj").value.trim().toLowerCase(),
            contenuto: $("#crqfContenuto").value.trim().toLowerCase(),
            aperturaFrom: $("#crqfAperturaFrom").value.trim(),
            aperturaTo: $("#crqfAperturaTo").value.trim(),
            rilFrom: $("#crqfRilFrom").value.trim(),
            rilTo: $("#crqfRilTo").value.trim()
        };

        saveCrqFilter(crqFilter);
        renderCrq();
        closeDialog(document.getElementById("crqFilterDlg"));
    });

/* ------------------------------------------------------------
   FILTER LOGIC
   ------------------------------------------------------------ */
function inRange(val, from, to) {
    if (!val) return true;
    try {
        const v = new Date(val).toISOString().slice(0,10);
        if (from && v < from) return false;
        if (to && v > to) return false;
        return true;
    } catch(_) { return true; }
}

function applyCrqFilters(rows) {
    const f = crqFilter || defaultCrqFilter();

    return rows.filter(o => {
        const bag = [
            o.rfcAperti, o.categoria, o.contenuto,
            o.rifNostro, o.prj, o.anno
        ].map(x => x || "").join(" ").toLowerCase();

        if (f.text && !bag.includes(f.text)) return false;

        if (f.rfc && !(o.rfcAperti || "").toLowerCase().includes(f.rfc.toLowerCase()))
            return false;

        if (f.anno && String(o.anno || "") !== f.anno)
            return false;

        if (f.emerg.length) {
            const v = (o.emerg || "").replace("ì","i").trim();
            if (!f.emerg.includes(v)) return false;
        }

        if (f.util.length) {
            const v = (o.utilizzato || "").toLowerCase();
            if (!f.util.includes(v)) return false;
        }

        if (f.stati.length) {
            const v = (o.stato || "").trim();
            if (!f.stati.includes(v)) return false;
        }

        if (f.categoria && !(o.categoria || "").toLowerCase().includes(f.categoria))
            return false;

        if (f.rif && !(o.rifNostro || "").toLowerCase().includes(f.rif))
            return false;

        if (f.prj && !(o.prj || "").toLowerCase().includes(f.prj))
            return false;

        if (f.contenuto && !(o.contenuto || "").toLowerCase().includes(f.contenuto))
            return false;

        if (!inRange(o.dataApertura || "", f.aperturaFrom || "", f.aperturaTo || ""))
            return false;

        if (!inRange(o.dataRilascio || "", f.rilFrom || "", f.rilTo || ""))
            return false;

        return true;
    });
}

/* ------------------------------------------------------------
   SORTING
   ------------------------------------------------------------ */
let crqSort = { key: "dataApertura", dir: "desc" };

window.setCrqSort = function(k) {
    if (crqSort.key === k) {
        crqSort.dir = (crqSort.dir === "asc" ? "desc" : "asc");
    } else {
        crqSort.key = k;
        crqSort.dir = (k === "dataApertura" ? "desc" : "asc");
    }
    renderCrq();
};

function sortCrqRows(rows) {
    const k = crqSort.key;
    const d = crqSort.dir === "desc" ? -1 : 1;

    return rows.slice().sort((x, y) => {
        let r = 0;

        if (k === "dataApertura" || k === "dataRilascio") {
            const ax = x[k] || "";
            const ay = y[k] || "";
            r = ax < ay ? -1 : ax > ay ? 1 : 0;
        } else {
            r = String(x[k] || "").localeCompare(String(y[k] || ""));
        }

        return r * d;
    });
}

/* ------------------------------------------------------------
   RENDER TABLE
   ------------------------------------------------------------ */
function renderCrq() {
    const tbl = document.getElementById("crqTable");
    if (!tbl) return;

    const all = state.crq || [];
    const filtered = applyCrqFilters(all);
    const rows = sortCrqRows(filtered);

    $("#crqCount").textContent =
        rows.length + " risultati su " + all.length;

    function th(k, label) {
        return "<th class='sortable' onclick=\"setCrqSort('" + k + "')\">" +
            label + (crqSort.key===k ? " <span class='arrow'>" +
            (crqSort.dir==='asc' ? "↑":"↓") + "</span>" : "") +
            "</th>";
    }

    const thead =
        "<thead><tr>" +
        th("rfcAperti","RFC Aperti") +
        th("stato","Stato") +
        th("dataApertura","Apertura") +
        th("emerg","Emergenza") +
        th("categoria","Categoria") +
        th("dataRilascio","Rilascio") +
        th("rifNostro","Rif nostro") +
        th("prj","PRJ") +
        th("contenuto","Contenuto") +
        "<th>Azioni</th>" +
        "</tr></thead>";

    if (!rows.length) {
        tbl.innerHTML = thead +
            "<tbody><tr><td colspan='13'><div class='muted'>Nessuna CRQ</div></td></tr></tbody>";
        return;
    }

    const tbody =
        "<tbody>" +
        rows.map(o => {
            return (
                "<tr>" +
                "<td><strong>" + escapeHtml(o.rfcAperti) + "</strong></td>" +
                "<td><span class='badge state'>" + escapeHtml(o.stato) + "</span></td>" +
                "<td>" + escapeHtml(o.dataApertura || "") + "</td>" +
                "<td>" + escapeHtml(o.emerg || "") + "</td>" +
                "<td>" + escapeHtml(o.categoria || "") + "</td>" +
                "<td>" + escapeHtml(o.dataRilascio || "") + "</td>" +
                "<td>" + escapeHtml(o.rifNostro || "") + "</td>" +
                "<td>" + escapeHtml(o.prj || "") + "</td>" +
                "<td class='col-multiline'>" + escapeHtml(o.contenuto || "") + "</td>" +
                "<td><div class='table-actions'>" +
                    "<button onclick=\"openCrqEditorById('" + o.id + "')\">✏️</button>" +
                    "<button class='danger' onclick=\"deleteCrq('" + o.id + "')\">🗑️</button>" +
                "</div></td>" +
                "</tr>"
            );
        }).join("") +
        "</tbody>";

    tbl.innerHTML = thead + tbody;
}

/* ------------------------------------------------------------
   EXPORT JSON

document.querySelector("[data-do='crqSave']")
    ?.addEventListener("click", () => {
        const blob = new Blob(
            [ JSON.stringify({ crq: state.crq || [] }, null, 2) ],
            { type: "application/json" }
        );
        downloadBlob(blob, "crq.json");
    });
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   IMPORT JSON
   ------------------------------------------------------------ */
window.importCrqFromFile = async function() {
    try {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "application/json";
        inp.onchange = async () => {
            const file = inp.files[0];
            if (!file) return;
            const txt = await file.text();
            const json = JSON.parse(txt);

            const arr = Array.isArray(json)
                ? json
                : (Array.isArray(json.crq) ? json.crq : []);

            state.crq = arr.map(o => normalizeCRQ(o));

            saveState(state);
            renderCrq();
            toast("CRQ importate ✔");
        };
        inp.click();
    } catch (e) {
        alert("Errore import CRQ: " + (e && e.message));
    }
};

document.querySelector("[data-do='crqLoad']")
    ?.addEventListener("click", importCrqFromFile);

/* ------------------------------------------------------------
   EXPORT CSV
   ------------------------------------------------------------ */
document.querySelector("[data-do='crqCSV']")
    ?.addEventListener("click", () => {
        const rows = sortCrqRows(applyCrqFilters(state.crq || []));
        const head = [
            "ID","RFC Aperti","Stato","Apertura","Anno","Emergenza",
            "Utilizzato","Categoria","Rilascio","Rif nostro","PRJ","Contenuto"
        ];

        const csv = [ head.join(";") ]
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
            ].map(v=>quoteCSV(v)).join(";")))
            .join("\n");

        downloadBlob(
            new Blob([csv], { type:"text/csv;charset=utf-8;" }),
            "crq.csv"
        );
    });

/* ------------------------------------------------------------
   EXPORT EXCEL
   ------------------------------------------------------------ */
document.querySelector("[data-do='crqXLS']")
    ?.addEventListener("click", () => {
        const rows = sortCrqRows(applyCrqFilters(state.crq || []));
        function xmlEsc(s){
            return String(s == null ? "" : s)
                .replace(/&/g,"&amp;")
                .replace(/</g,"&lt;")
                .replace(/>/g,"&gt;");
        }
        function cell(v,type){
            return "<Cell><Data ss:Type=\"" + (type||"String") +
                   "\">" + xmlEsc(v) + "</Data></Cell>";
        }

        const head = [
            "ID","RFC Aperti","Stato","Apertura","Anno","Emergenza",
            "Utilizzato","Categoria","Rilascio","Rif nostro","PRJ","Contenuto"
        ];

        let xml =
            "<?xml version=\"1.0\"?>\n" +
            "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" " +
            "xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">\n" +
            "<Worksheet ss:Name=\"CRQ\"><Table>";

        xml += "<Row>" + head.map(h => cell(h)).join("") + "</Row>";

        rows.forEach(o => {
            xml += "<Row>"
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
                + "</Row>";
        });

        xml += "</Table></Worksheet></Workbook>";

        downloadBlob(
            new Blob([xml], { type:"application/vnd.ms-excel" }),
            "crq.xls"
        );
    });

/* ------------------------------------------------------------
   CLEAR ALL CRQ
   ------------------------------------------------------------ */
document.querySelector("[data-do='crqClear']")
    ?.addEventListener("click", () => {
        if (!confirm("Confermi? Saranno eliminate TUTTE le CRQ.")) return;
        state.crq = [];
        saveState(state);
        renderCrq();
    });

/* ------------------------------------------------------------
   HELP CRQ — MAPPATURA STATI (CLICK TO COPY)
   ------------------------------------------------------------ */
(function initCrqHelp() {
    const tbl = document.getElementById("helpCrqTable");
    if (!tbl) return;

    function copyRow(tr) {
        const bmc = tr.getAttribute("data-bmc") || "";
        const bhelp = tr.getAttribute("data-bhelp") || "";
        const note = tr.getAttribute("data-note") || "";

        const text = "BMC: " + bmc + " | Bhelp: " + bhelp +
                     (note ? (" | Note: " + note) : "");

        navigator.clipboard.writeText(text)
            .then(() => toast("Copiato ✔"))
            .catch(() => alert("Impossibile copiare"));
    }

    $$(" #helpCrqTable tbody tr ").forEach(tr => {
        tr.addEventListener("click", () => copyRow(tr));
        tr.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                copyRow(tr);
            }
        });
    });
})();

/* ============================================================
   V5 – FINAL INIT + RENDER BINDINGS + HELPERS
   Safe‑Copy format
   ============================================================ */

/* ------------------------------------------------------------
   TODAY ISO
   ------------------------------------------------------------ */
function todayISO() {
    try {
        return new Date().toISOString().slice(0, 10);
    } catch (_) {
        return "";
    }
}

/* ------------------------------------------------------------
   GLOBAL SAVE WRAPPER
   (ensures UI refresh sequencing)
   ------------------------------------------------------------ */
function save() {
    try { saveState(state); } catch (_) {}
}

/* ------------------------------------------------------------
   INITIAL RENDER FOR ALL MODULES
   ------------------------------------------------------------ */
function renderAll() {
    try { renderLinks(); } catch (e) { console.warn("Links render error:", e); }
    try { renderOpenPoints(); } catch (e) { console.warn("OP render error:", e); }
    try { renderServices(); } catch (e) { console.warn("SVC render error:", e); }
    try { renderCrq(); } catch (e) { console.warn("CRQ render error:", e); }
}

/* ------------------------------------------------------------
   AUTO-RENDER AFTER SAVE
   Overrides global saveState to re-render automatically
   ------------------------------------------------------------ */
(function patchSaveState() {
    const _save = saveState;
    window.saveState = function(st) {
        try { _save(st); } catch (_) {}
        try { renderAll(); } catch (_) {}
		try { debouncedRemoteSave(); } catch (_) {}
    };
})();

/* ------------------------------------------------------------
   INIT DIALOG CLOSE WITH ESCAPE + BACKDROP
   (safety fallback if browser is old)
   ------------------------------------------------------------ */
document.addEventListener("click", ev => {
    const dlg = ev.target.closest("dialog");
    if (!dlg) return;
    if (ev.target.matches("[data-close]")) {
        closeDialog(dlg);
    }
});

/* ------------------------------------------------------------
   FALLBACK: HANDLE ENTER KEYS IN DIALOG FORMS
   ------------------------------------------------------------ */
document.addEventListener("keydown", ev => {
    if (ev.key === "Enter") {
        const dlg = document.querySelector("dialog[open]");
        if (!dlg) return;

        // Avoid submitting when typing in textareas
        if (ev.target.tagName === "TEXTAREA") return;

        // Trigger primary save button depending on dialog type
        if (dlg.id === "linkEditorDlg") {
            ev.preventDefault();
            saveLinkDialog();
        }
        if (dlg.id === "opDialog") {
            ev.preventDefault();
            saveOpDialog();
        }
        if (dlg.id === "serviceDialog") {
            ev.preventDefault();
            saveServiceDialog();
        }
        if (dlg.id === "crqEditorDlg") {
            ev.preventDefault();
            saveCrqDialog();
        }
    }
});

/* ------------------------------------------------------------
   AUTO-FOCUS FIRST FIELD WHEN DIALOG OPENS
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("dialog").forEach(dlg => {
        dlg.addEventListener("shown", () => {
            const input = dlg.querySelector("input, textarea, select");
            input?.focus();
        });
    });
});

/* ------------------------------------------------------------
   FOCUS FIX FOR NATIVE <dialog>
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("dialog").forEach(dlg => {
        dlg.addEventListener("close", () => {
            document.body.style.overflow = "";
        });
    });
});

// ============================================================
// V5 – LOAD FROM FOLDER (File System Access API) – Robust
// - supporta più nomi file
// - crea sezione default se mancano
// - assegna sectionId ai link orfani
// - resetta i filtri (OP + Sezioni) dopo l’import
// ============================================================

// ============================================================
// V5 – LOAD FROM FOLDER (Links file contains BOTH sections + links)
// ============================================================

// ============================================================
// V5 – LOAD FROM FOLDER (Links file contains BOTH sections + links)
// Gestione annullamento picker senza alert
// ============================================================
window.loadFromFolder = async function () {
  // Feature detection (evita errori su browser senza File System Access API)
  if (!window.showDirectoryPicker) {
    alert("Il tuo browser non supporta 'Carica cartella'. Prova con Chrome/Edge recenti.");
    return;
  }

  try {
    const dirHandle = await window.showDirectoryPicker();

    // file supportati (minuscolo)
    const linkFiles = ["links.json", "bookmarks.json", "linkhub-links.json"];
    const openPointFiles = ["openpoints.json", "op.json", "open-points.json"];
    const serviceFiles = ["services.json"];
    const crqFiles = ["crq.json"];

    async function readJSON(handle) {
      const file = await handle.getFile();
      return JSON.parse(await file.text());
    }

    let loaded = { sections: null, links: null, openPoints: null, services: null, crq: null };

    // Legge i file della cartella
    for await (const entry of dirHandle.values()) {
      if (entry.kind !== "file") continue;
      const name = entry.name.toLowerCase();

      // 🔵 FILE LINKS (include sections)
      if (linkFiles.includes(name)) {
        const json = await readJSON(entry);
        if (Array.isArray(json.links)) loaded.links = json.links;
        if (Array.isArray(json.sections)) loaded.sections = json.sections;
        continue;
      }

      // 🟢 FILE OP
      if (openPointFiles.includes(name)) {
        const json = await readJSON(entry);
        loaded.openPoints = Array.isArray(json) ? json : json.openPoints;
        continue;
      }

      // 🟣 FILE SERVIZI
      if (serviceFiles.includes(name)) {
        const json = await readJSON(entry);
        loaded.services = Array.isArray(json) ? json : json.services;
        continue;
      }

      // 🟠 FILE CRQ
      if (crqFiles.includes(name)) {
        const json = await readJSON(entry);
        loaded.crq = Array.isArray(json) ? json : json.crq;
        continue;
      }
    }

    // Se non ha trovato nulla
    if (!loaded.links && !loaded.sections) {
      toast("Nessun file links trovato nella cartella (links.json / linkhub-links.json).");
      return;
    }

    // ============================================================
    // IMPORT DATI
    // ============================================================
    // SEZIONI
    if (loaded.sections) {
      state.sections = loaded.sections.map(normalizeSection);
    }
    // LINKS
    if (loaded.links) {
      const sectionIds = new Set(state.sections.map(s => s.id));
      const firstSection = state.sections[0]?.id ?? null;
      state.links = loaded.links.map(l => {
        const x = normalizeLink(l);
        if (!x.sectionId || !sectionIds.has(x.sectionId)) x.sectionId = firstSection;
        return x;
      });
    }
    // OP
    if (loaded.openPoints) state.openPoints = loaded.openPoints.map(normalizeOP);
    // SERVIZI
    if (loaded.services) state.services = loaded.services.map(normalizeService);
    // CRQ
    if (loaded.crq) state.crq = loaded.crq.map(normalizeCRQ);

    // RESET FILTRI
    localStorage.removeItem("tsa.v5.opfilter");
    localStorage.removeItem("tsa.v5.secfilter");
    // (opzionali) localStorage.removeItem("tsa.v5.svcfilter");
    // (opzionali) localStorage.removeItem("tsa.v5.crqfilter");

    saveState(state);
    renderAll();
    initExportButtons();
    toast("Caricamento linkhub-links.json completato ✓");
  } catch (err) {
    // 👇 Distinzione tra annullamento utente e errore vero
    const isAbort =
      err?.name === "AbortError" ||
      err?.code === 20 || // vecchi DOMException
      /aborted|user aborted|cancelled|canceled/i.test(err?.message || "");

    if (isAbort) {
      // Utente ha annullato: nessun alert, al massimo un toast discreto
      toast("Caricamento annullato");
      return;
    }

    // Errori reali: mostra un alert con il dettaglio
    console.error(err);
    alert("Errore nel caricamento cartella: " + (err && err.message ? err.message : String(err)));
  }
};

// ------------------------------------------------------
// Bind bottoni export
// ------------------------------------------------------
function initExportButtons() {
    $$('[data-exp]').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.exp;

            const map = {
                json: exportJSON,
                csv: exportCSV,
                xls: exportXLS
            };

            if (map[type]) {
                console.log("Export richiesto:", type);
                // 2. Eseguila usando le parentesi ()
                map[type](); 
            } else {
                console.warn("Tipo export sconosciuto:", type);
            }
        };
    });
}

// ======================================================
//  EXPORT SYSTEM (JSON / CSV / XLS) - Compatible with V5
// ======================================================

// Utility scaricamento file
function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

// ------------------------------------------------------
// JSON
// ------------------------------------------------------
function exportJSON() {
    const data = {
        sections: state.sections,
        links: state.links,
        openPoints: state.openPoints,
        services: state.services,
        crq: state.crq
    };

    const text = JSON.stringify(data, null, 2);
    downloadFile("export.json", text, "application/json");

    toast("Esportato JSON ✓");
}

// ------------------------------------------------------
// CSV (solo tabella CRQ come esempio più usato)
// Puoi aggiungere le altre se vuoi
// ------------------------------------------------------
function exportCSV() {
    const rows = state.crq;

    if (!rows.length) {
        toast("Nessuna CRQ da esportare");
        return;
    }

    const header = Object.keys(rows[0]).join(";");
    const body = rows.map(o =>
        Object.values(o).map(v => (v != null ? String(v).replace(/;/g, ",") : "")).join(";")
    ).join("\n");

    const csv = header + "\n" + body;

    downloadFile("crq.csv", csv, "text/csv;charset=utf-8;");
    toast("Esportato CSV ✓");
}

// ------------------------------------------------------
// Excel (XLS semplice: CSV mascherato come Excel)
// ------------------------------------------------------
function exportXLS() {
    const rows = state.crq;

    if (!rows.length) {
        toast("Nessuna CRQ da esportare");
        return;
    }

    const header = Object.keys(rows[0]).join("\t");
    const body = rows.map(o =>
        Object.values(o).map(v => (v != null ? String(v).replace(/\t/g, " ") : "")).join("\t")
    ).join("\n");

    const xls = header + "\n" + body;

    downloadFile("crq.xls", xls, "application/vnd.ms-excel");
    toast("Esportato Excel ✓");
}

window.recolorSection = function(id, newColor) {
    const sec = state.sections.find(s => s.id === id);
    if (!sec) return;

    sec.color = {
        id: "custom",
        c1: newColor,
        c2: newColor // puoi generare un gradiente se vuoi
    };

    saveState(state);
    renderLinks();
    renderSectionsList();
};

function renderHelpCrqTable() {
    const rows = [
        ["Bozza", "n.a.", "Dopo apertura richiedere slot"],
        ["Richiesta autorizzazione", "Verifica Referente Servizio IT", "-"],
        ["Pianificazione in corso", "Deploy Test / Esecuzione Test", "Martedì settimana prima del rilascio"],
        ["Revisione pianificata", "Completamento Test", "-"],
        ["Approvazione pianificata", "Verifica ICT", "Giorno prima del rilascio"],
        ["Pianificato", "n.a.", ""],
        ["Implementazione in corso", "Preparazione Installazione / Installazione", ""],
        ["Completato", "n.a.", ""],
        ["Chiuso", "Chiuso Deploy", ""]
    ];

    const tbody = document.querySelector("#helpCrqTable tbody");
    if (!tbody) return;

    tbody.innerHTML = rows.map(r => `
        <tr tabindex="0" role="button">
            <td>${r[0]}</td>
            <td>${r[1]}</td>
            <td>${r[2]}</td>
        </tr>
    `).join("");
}

function openCrqHelpDialog() {
    renderHelpCrqTable();
    openDialogById("helpCrqDlg");
}

document.querySelector("[data-do='crqHelp']")
    ?.addEventListener("click", openCrqHelpDialog);

/* ------------------------------------------------------------
   FINAL GLOBAL INIT
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
    try {
        // Re-render everything on startup
        renderAll();
		initExportButtons();

		// Bridge per i tile della HOME dell'HTML v3
		window.handleSave = () => saveToRepo();
		window.reloadFromRepo = (force) => loadFromRepo();

		// (opzionale) per compat con tile "Carica da cartella"
		window.loadFromFolder = window.loadFromFolder || (async () => alert("Funzione non disponibile in questo browser"));

		try {
		  const hasLocal = !!localStorage.getItem(STORAGE_KEY);
		  const qp = new URLSearchParams(location.search);
		  const wantsAuto = qp.get("autoload") === "1";
		  if (!hasLocal || wantsAuto) {
			loadFromRepo();   // GET …?op=load dal Worker
		  }
		} catch (_) {}

        // Ensure default pane
        showPane("home");

        toast("V5 Neo‑Glass pronta ✨");
    } catch (e) {
        console.error("Fatal init error:", e);
    }
});

// ===== Ripple sui CHIP =====
document.addEventListener("click", (ev) => {
  const lbl = ev.target.closest(".checks label");
  if (!lbl) return;

  const rect = lbl.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;

  lbl.style.setProperty("--r-x", `${x}px`);
  lbl.style.setProperty("--r-y", `${y}px`);
});
