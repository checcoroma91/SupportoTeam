// ===== router.js =====
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

function autoOpenNotifDialogIfNeeded() {
  const totalOP  = getOPNotifCount();
  const totalCRQ = getCRQNotifCount();
  const total    = totalOP + totalCRQ;

  if (total > 0) {
    // Render contenuti
    renderNotifDialog();
    updateNotifTabCounters();

    // Mostra dialog
    openDialogById("notifDlg");

    // Inizializza tabs, toggle e click handlers
    initNotifTabs();
    initNotifToggles();
    initNotifClickHandlers();
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
