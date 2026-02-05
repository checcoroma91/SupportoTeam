// ===== op.js =====
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
	
	// Filtro diretto per ID singolo (clic da notifiche)
	if (opFilter.id) {
	  return rows.filter(o => o.id === opFilter.id);
	}

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
