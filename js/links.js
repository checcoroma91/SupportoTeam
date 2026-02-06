// ===== links.js =====
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

/*
	NOTIFICHE
*/

function computeOPNotifications() {
  const now = new Date();
  
  const groups = {
    verde: [],   // 🟢
    giallo: [],  // 🟡
    rosso: []    // 🔴
  };

  function workingDaysDiff(d1, d2) {
    let count = 0;
    const cur = new Date(d1);
    while (cur <= d2) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++; // lun–ven
      cur.setDate(cur.getDate() + 1);
    }
    return count - 1;
  }

  state.openPoints.forEach(op => {
    if (op.status === "Completato") return;

    const due = op.dueAt ? new Date(op.dueAt) : null;

    // 🟢 Nessuna scadenza
    if (!due) {
      groups.verde.push({ icon:"🟢", stato:"DA FARE APPENA POSSIBILE", ...op });
      return;
    }

    // Calcolo giorni feriali tra oggi e scadenza
    const wd = workingDaysDiff(now, due);

    // 🟡 Entro 3 giorni feriali e scadenza >= oggi
    if (wd >= 0 && wd <= 3) {
      groups.giallo.push({ icon:"🟡", stato:"IN SCADENZA", ...op });
      return;
    }

    // 🔴 Scaduto (due < oggi)
    if (due < now) {
      groups.rosso.push({ icon:"🔴", stato:"SCADUTO", ...op });
      return;
    }
  });

  return groups;
}

function getOPNotifCount() {
  const groups = computeOPNotifications();
  return (groups.verde?.length || 0) + (groups.giallo?.length || 0) + (groups.rosso?.length || 0);
}

function getCRQNotifCount() {
  const g = computeCRQNotifications();
  return (g.verde?.length || 0) + (g.giallo?.length || 0) + (g.rosso?.length || 0);
}

function refreshNotificationsUI() {
  const totalOP  = getOPNotifCount();
  const totalCRQ = getCRQNotifCount();
  const total    = totalOP + totalCRQ;

  const badge = document.getElementById("notifBadge");
  const banner = document.getElementById("notifBanner");
  const bannerText = document.getElementById("notifBannerText");
  const notifBtn = document.getElementById("notifBtn");

  // Badge numero
  if (badge) {
    if (total > 0) {
      badge.textContent = total;
      badge.style.display = "inline-flex";
    } else {
      badge.textContent = "";
      badge.style.display = "none";
    }
  }

  // 🚨 Evidenziazione bottone Notifiche
  if (notifBtn) {
    if (total > 0) notifBtn.classList.add("alert");
    else notifBtn.classList.remove("alert");
  }

  // Banner (se lo usi)
  if (banner && bannerText) {
    if (total > 0) {
      banner.style.display = "inline-flex";
      bannerText.textContent =
        total === 1
          ? "Hai 1 notifica da controllare"
          : `Hai ${total} notifiche da controllare`;
    } else {
      banner.style.display = "none";
    }
  }
}

function renderNotifDialog() {
  const op = computeOPNotifications();
  const cq = computeCRQNotifications();

  const elOP  = document.getElementById("notifOP");
  const elCRQ = document.getElementById("notifCRQ");

  // --- OP (rimane come lo hai già corretto) ---
  function renderGroupOP(arr, cssClass, addSeparator = false) {
    if (!arr.length) return "";
    return `
      ${addSeparator ? '<div class="notif-sep"></div>' : ""}
      ${arr.map(item => `
        <div class="notif-item ${cssClass}" data-op-id="${item.id}">
          <div class="notif-head">
            <span class="notif-icon">${item.icon}</span>
            <span class="notif-status">${item.stato}</span>
          </div>
          <div class="notif-field"><strong>Titolo:</strong> ${item.title}</div>
          <div class="notif-field"><strong>Progetto:</strong> ${item.project || "-"}</div>
          <div class="notif-field"><strong>Assegnatari:</strong> ${Array.isArray(item.assignees) ? item.assignees.join(", ") : (item.assignees || "-")}</div>
          <div class="notif-field"><strong>Stato:</strong> ${item.status}</div>
          <div class="notif-field"><strong>Scadenza:</strong> ${item.dueAt || "—"}</div>
          ${item.desc ? `
            <div class="notif-desc-collapsible">
              <button class="btn link-btn notif-toggle" data-target="desc-${item.id}">Mostra dettagli</button>
              <div class="notif-desc-content" id="desc-${item.id}" style="display:none;">${item.desc}</div>
            </div>
          ` : ""}
        </div>
      `).join("")}
    `;
  }

  // --- CRQ ---
  function renderGroupCRQ(arr, cssClass, addSeparator = false) {
    if (!arr.length) return "";
    return `
      ${addSeparator ? '<div class="notif-sep"></div>' : ""}
      ${arr.map(c => `
        <div class="notif-item ${cssClass}" data-crq-id="${c.id}">
          <div class="notif-head">
            <span class="notif-icon">${c.icon}</span>
            <span class="notif-status">${c.statoNotifica}</span>
          </div>

          <div class="notif-field"><strong>RFC Aperti:</strong> ${c.rfc || "-"}</div>
          <div class="notif-field"><strong>Stato:</strong> ${c.stato || "-"}</div>
          <div class="notif-field"><strong>Categoria:</strong> ${c.categoria || "-"}</div>
          <div class="notif-field"><strong>Rilascio:</strong> ${c.rilascio || "—"}</div>
          <div class="notif-field"><strong>Rif Nostro:</strong> ${c.rif || "-"}</div>
          <div class="notif-field"><strong>PRJ:</strong> ${c.prj || "-"}</div>

          ${c.contenuto ? `
            <div class="notif-desc-collapsible">
              <button class="btn link-btn notif-toggle" data-target="descC-${c.id}">Mostra dettagli</button>
              <div class="notif-desc-content" id="descC-${c.id}" style="display:none;">${c.contenuto}</div>
            </div>
          ` : ""}
        </div>
      `).join("")}
    `;
  }

  // OP
  const htmlOP =
    renderGroupOP(op.verde,  "ok") +
    renderGroupOP(op.giallo, "avviso",  !!op.verde.length) +
    renderGroupOP(op.rosso,  "critica", !!op.verde.length || !!op.giallo.length);

  elOP.innerHTML = htmlOP || `<div class="muted">Nessuna notifica per gli Open Point.</div>`;

  // CRQ
  const htmlCRQ =
    renderGroupCRQ(cq.verde,  "ok") +
    renderGroupCRQ(cq.giallo, "avviso",  !!cq.verde.length) +
    renderGroupCRQ(cq.rosso,  "critica", !!cq.verde.length || !!cq.giallo.length);

  elCRQ.innerHTML = htmlCRQ || `<div class="muted">Nessuna notifica per le CRQ.</div>`;
}

function initNotifToggles() {
  document.querySelectorAll(".notif-toggle").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // non attivare il click della card
      const targetId = btn.dataset.target;
      const panel = targetId ? document.getElementById(targetId) : null;
      if (!panel) return;
      const vis = panel.style.display !== "none";
      panel.style.display = vis ? "none" : "block";
      btn.textContent = vis ? "Mostra dettagli" : "Nascondi dettagli";
    });
  });
}
	
function initNotifClickHandlers() {
  document.querySelectorAll(".notif-item").forEach(el => {
    el.addEventListener("click", (e) => {
      // Se clicco sul bottone "Mostra dettagli", ignoro la navigazione
      if (e.target.closest(".notif-toggle")) return;

      const opId  = el.dataset.opId;
      const crqId = el.dataset.crqId;

      // Chiudi dialog notifiche
      const dlg = document.getElementById("notifDlg");
      if (dlg) dlg.close();

      if (opId) {
        showPane("op");
        filterToSingleOP(opId);
        return;
      }
      if (crqId) {
        showPane("crq");
        filterToSingleCRQ(crqId);
        return;
      }
    });
  });
}

function initNotifTabs() {
  const tabs = document.querySelectorAll(".notif-tab");
  const sections = {
    op: document.getElementById("notifTabOP"),
    crq: document.getElementById("notifTabCRQ")
  };

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      // Aggiorna tab attivi
      tabs.forEach(t => t.classList.remove("active"));
      btn.classList.add("active");

      // Mostra contenuto giusto
      Object.entries(sections).forEach(([key, el]) => {
        el.classList.toggle("active", key === target);
      });
    });
  });
}

function updateNotifTabCounters() {
  const op = computeOPNotifications();
  const cq = computeCRQNotifications();

  // OP counters
  const opGreen  = op.verde.length;
  const opYellow = op.giallo.length;
  const opRed    = op.rosso.length;

  const elOP = document.getElementById("notifTabCountOP");
  if (elOP) {
    elOP.innerHTML = `
      ${opGreen  ? `<span class="notif-count-green">🟢${opGreen}</span>` : ""}
      ${opYellow ? `<span class="notif-count-yellow">🟡${opYellow}</span>` : ""}
      ${opRed    ? `<span class="notif-count-red">🔴${opRed}</span>`     : ""}
    `;
  }

  // CRQ counters
  const cqGreen  = cq.verde.length;
  const cqYellow = cq.giallo.length;
  const cqRed    = cq.rosso.length;

  const elCRQ = document.getElementById("notifTabCountCRQ");
  if (elCRQ) {
    elCRQ.innerHTML = `
      ${cqGreen  ? `<span class="notif-count-green">🟢${cqGreen}</span>` : ""}
      ${cqYellow ? `<span class="notif-count-yellow">🟡${cqYellow}</span>` : ""}
      ${cqRed    ? `<span class="notif-count-red">🔴${cqRed}</span>`     : ""}
    `;
  }
}

function filterToSingleCRQ(id) {
  // Se esiste già un crqFilter nello stato app → usiamolo, altrimenti creiamone uno minimale
  window.crqFilter = (typeof crqFilter === "object" && crqFilter) ? crqFilter : {};
  crqFilter = { ...crqFilter, id }; // attivo filtro per ID
  if (typeof saveCrqFilter === "function") saveCrqFilter(crqFilter); // se hai persistenza
  if (typeof renderCrq === "function") renderCrq();
}

function filterToSingleOP(id) {
  // Salva un filtro speciale
  opFilter = {
    ...defaultOpFilter(),
    text: "", 
    priorities: [],
    statuses: [],
    maxOnly: false,
    createdFrom: "",
    createdTo: "",
    dueFrom: "",
    dueTo: "",
    assignees: [],
    projects: [],
  };

  // Forziamo il filtro su ID specifico
  opFilter.id = id;

  // Modifica applyOpFilters per gestire ID diretto
  renderOpenPoints();
}

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

function computeCRQNotifications() {
  const groups = { verde: [], giallo: [], rosso: [] };
  const today = atMidnight(new Date());

  const lowStates   = new Set(["Bozza", "Richiesta autorizzazione"]);
  const revState    = "Revisione pianificata";
  const lateOkStates= new Set(["Approvazione pianificata", "Pianificato", "Implementazione in corso"]);

  (state.crq ?? []).forEach(c => {
    const id        = c.id;
    const stato     = getCrqStato(c) || "";
    const rilStr    = getCrqRilascio(c);
    const rilDate   = rilStr ? atMidnight(new Date(rilStr)) : null;

    // 1) 🟢 SLOT DA PRENOTARE — no data rilascio + Bozza
    if (!rilDate && stato === "Bozza") {
      groups.verde.push({
        id,
        icon: "🟢",
        statoNotifica: "SLOT DA PRENOTARE",
        rfc: getCrqRFC(c),
        stato, categoria: getCrqCategoria(c),
        rilascio: rilStr || "—",
        rif: getCrqRif(c),
        prj: getCrqPrj(c),
        contenuto: getCrqContenuto(c)
      });
      return;
    }

    if (!rilDate) return; // niente altre regole senza data

    const tuePrev = tuesdayOfPreviousWeek(rilDate);

    // 2) 🟡/🔴 Bozza o Richiesta autorizzazione rispetto al martedì della settimana precedente
    if (lowStates.has(stato)) {
      if (today < tuePrev) {
        groups.giallo.push({
          id, icon: "🟡", statoNotifica: "PORTARE IN PIANIFICAZIONE IN CORSO",
          rfc: getCrqRFC(c), stato, categoria: getCrqCategoria(c),
          rilascio: rilStr, rif: getCrqRif(c), prj: getCrqPrj(c),
          contenuto: getCrqContenuto(c)
        });
      } else { // oggi >= martedì prev week → red
        groups.rosso.push({
          id, icon: "🔴", statoNotifica: "DA RIPIANIFICARE - TERMINE CAMBIO STATO PASSATO",
          rfc: getCrqRFC(c), stato, categoria: getCrqCategoria(c),
          rilascio: rilStr, rif: getCrqRif(c), prj: getCrqPrj(c),
          contenuto: getCrqContenuto(c)
        });
      }
      return;
    }

    // 3) 🟡/🔴 Revisione pianificata vs giorno rilascio
    if (stato === revState) {
      if (today < rilDate) {
        groups.giallo.push({
          id, icon: "🟡", statoNotifica: "PORTARE IN APPROVAZIONE PIANIFICATA",
          rfc: getCrqRFC(c), stato, categoria: getCrqCategoria(c),
          rilascio: rilStr, rif: getCrqRif(c), prj: getCrqPrj(c),
          contenuto: getCrqContenuto(c)
        });
      } else { // oggi >= rilascio
        groups.rosso.push({
          id, icon: "🔴", statoNotifica: "RIPIANIFICARE - TERMINE CAMBIO STATO PASSATO",
          rfc: getCrqRFC(c), stato, categoria: getCrqCategoria(c),
          rilascio: rilStr, rif: getCrqRif(c), prj: getCrqPrj(c),
          contenuto: getCrqContenuto(c)
        });
      }
      return;
    }

    // 4) 🟢 Approvazione pianificata / Pianificato / Implementazione in corso con rilascio passato/oggi
    if (lateOkStates.has(stato) && today >= rilDate) {
      groups.verde.push({
        id, icon: "🟢", statoNotifica: "CONTROLLARE - GIORNO RILASCIO PASSATO",
        rfc: getCrqRFC(c), stato, categoria: getCrqCategoria(c),
        rilascio: rilStr, rif: getCrqRif(c), prj: getCrqPrj(c),
        contenuto: getCrqContenuto(c)
      });
    }
  });

  return groups;
}

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
   DRAG & DROP LINK – robusto con indicatore luminoso
------------------------------------------------------------ */


function initLinksDragDrop() {
  const container = document.getElementById("linksContainer");
  if (!container) return;

  const cardSelector = ".section .grid > .card";
  let draggedLinkId = null;

  // === Placeholder ===
  let placeholder = document.getElementById("drop-placeholder");
  if (!placeholder) {
    placeholder = document.createElement("div");
    placeholder.id = "drop-placeholder";
    placeholder.className = "card drop-placeholder";
    placeholder.style.opacity = "0.35";
    placeholder.style.border = "2px dashed var(--neon-color, #63e6ff)";
    placeholder.style.minHeight = "60px";
    placeholder.style.pointerEvents = "none";
    placeholder.style.transition = "all .12s ease";
    placeholder.innerHTML = "";
  }

  const cards = [...container.querySelectorAll(cardSelector)];
  cards.forEach(card => {
    const cid = card.getAttribute("data-id");
    if (!cid) return;

    card.setAttribute("draggable", "true");

    card.addEventListener("dragstart", e => {
      draggedLinkId = cid;
      card.classList.add("dragging");
      try {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", cid);
      } catch (_) {}
    });

    card.addEventListener("dragend", () => {
      draggedLinkId = null;
      card.classList.remove("dragging");
      placeholder.remove();
    });
  });

  function getDirectChildCard(grid, el) {
    if (!grid || !el) return null;
    if (el.id === "drop-placeholder") return null;

    let cur = el.closest(".card");
    while (cur && cur !== grid) {
      if (
        cur.parentElement === grid &&
        cur.matches(".card") &&
        !cur.classList.contains("dragging") &&
        cur.id !== "drop-placeholder"
      ) {
        return cur;
      }
      const outer = cur.parentElement?.closest(".card");
      cur = outer || cur.parentElement;
    }
    return null;
  }

  container.addEventListener("dragover", (e) => {
    if (!draggedLinkId) return;
    e.preventDefault();

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return;

    const grid = target.closest(".section")?.querySelector(".grid");
    if (!grid) return;

    if (placeholder.parentElement !== grid) {
      try { placeholder.remove(); } catch (_) {}
      grid.appendChild(placeholder);
    }

    const directCard = getDirectChildCard(grid, target);

    if (directCard) {
      const rect = directCard.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;

      if (before) {
        if (placeholder.nextSibling !== directCard) {
          grid.insertBefore(placeholder, directCard);
        }
      } else {
        const next = directCard.nextSibling;
        if (next !== placeholder) {
          if (next && next.parentElement === grid) {
            grid.insertBefore(placeholder, next);
          } else {
            grid.appendChild(placeholder);
          }
        }
      }
    } else {
      const siblings = [...grid.children].filter(
        x =>
          x.matches(".card") &&
          !x.classList.contains("dragging") &&
          x.id !== "drop-placeholder"
      );

      if (siblings.length === 0) {
        if (placeholder.parentElement !== grid) {
          grid.appendChild(placeholder);
        }
        return;
      }

      const first = siblings[0];
      const last  = siblings[siblings.length - 1];
      const lastRect = last.getBoundingClientRect();

      if (e.clientY >= lastRect.top + lastRect.height / 2) {
        grid.appendChild(placeholder);
      } else {
        if (placeholder.nextSibling !== first) {
          grid.insertBefore(placeholder, first);
        }
      }
    }
  });

  container.addEventListener("drop", () => {
    if (!draggedLinkId) return;

    const sectionGrid = placeholder.closest(".grid");
    if (!sectionGrid) return;

    const section = sectionGrid.closest(".section");
    const targetSectionId = section?.dataset.sec || null;

    const orderedIds = [...sectionGrid.querySelectorAll(".card")]
      .filter(x => x.id !== "drop-placeholder")
      .map(x => x.getAttribute("data-id"))
      .filter(Boolean);

    const dropIndex = [...sectionGrid.children].indexOf(placeholder);
    orderedIds.splice(Math.min(dropIndex, orderedIds.length), 0, draggedLinkId);

    state.links = state.links.map(link =>
      link.id === draggedLinkId ? { ...link, sectionId: targetSectionId } : link
    );

    const inTarget = state.links.filter(
      l => (l.sectionId || "") === (targetSectionId || "")
    );
    const inOther = state.links.filter(
      l => (l.sectionId || "") !== (targetSectionId || "")
    );

    inTarget.sort(
      (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
    );

    state.links = [...inOther, ...inTarget];

    saveState(state);
    renderLinks();
    initLinksDragDrop();
  });
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

