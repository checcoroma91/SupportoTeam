// ===== crq.js =====
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
	
	// Filtro diretto per ID (clic da notifiche)
    if (crqFilter && crqFilter.id) {
      return rows.filter(r => r.id === crqFilter.id);
    }
  
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
