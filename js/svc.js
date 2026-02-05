/* svc.css — generated split */
#svcTable{
table-layout: fixed;
}

#svcTable td, 
#svcTable th{
white-space: normal !important;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

#svcTable th:last-child, #svcTable td:last-child{
white-space: nowrap; width: 96px;
}

/* ===== SVC: Filtra Servizi — testi chiari, layout compatto, checkbox orizzontali ===== */

/* Testi chiari */
#svcFilterDlg,
#svcFilterDlg label,
#svcFilterDlg legend,
#svcFilterDlg input,
#svcFilterDlg select{
color: var(--txt) !important;
}

#svcFilterDlg input::placeholder{
color: color-mix(in srgb, var(--txt), transparent 40%) !important;
}

/* Grid più compatta (3 colonne) */
#svcFilterDlg .form-grid,
#svcFilterDlg .modal-body.form-grid{
display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 20px;
  row-gap: 12px;
}

/* I controlli riempiono la colonna */
#svcFilterDlg label > input,
#svcFilterDlg label > select{
width: 100%;
}

/* Fieldset compatti */
#svcFilterDlg fieldset{
border: 1px solid color-mix(in srgb, var(--border), transparent 40%);
  padding: 8px 12px;
  border-radius: 8px;
}

#svcFilterDlg fieldset legend{
font-size: 13px;
  margin-bottom: 4px;
}

/* ✅ Checkbox in orizzontale per Tipo e Stato */
#svcFilterDlg #svcfTipoGroup.checks,
#svcFilterDlg #svcfStatoGroup.checks{
display: flex !important;
  flex-wrap: wrap;
  gap: 10px 18px;
  align-items: center;
}

#svcFilterDlg .checks label{
display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

#svcFilterDlg .checks input[type="checkbox"]{
transform: scale(1.1);
}

/* Riga bottoni finale allineata a destra */
#svcFilterDlg .actions.end{
grid-column: 1 / -1;
}

/* SVC */
#svcFilterDlg .modal-body{
display: grid !important;
    grid-template-columns: repeat(3, minmax(0,1fr)) !important;
    gap: 14px 18px !important;
    min-width: 0 !important;
}

/* SVC → Tipo + Stato (se presente) */
#svcFilterDlg fieldset:has(#svcfTipoGroup),
#svcFilterDlg fieldset:has(#svcfStatoGroup){
grid-column: 1 / -1 !important;
    min-width: 0;
}

/* ============================================================
   SERVIZI — COMPACT SERVICE DIALOG
   Riduce altezza, spazi, textarea, padding, griglia
   ============================================================ */

/* Dialog meno alto */
#serviceDialog.modal{
max-height: 85vh !important;
    width: min(900px, 92vw) !important;
}

/* Griglia più compatta (da 2 colonne → più dense) */
#serviceDialog .form-grid{
gap: 10px !important;                 /* meno spazio verticale */
    grid-template-columns: repeat(2, 1fr) !important;
}

/* Campi più compatti */
#serviceDialog .form-grid label{
gap: 4px !important;                  /* meno spazio label/campo */
}

/* Input/select più bassi */
#serviceDialog input,
#serviceDialog select{
height: 34px !important;
    padding: 6px 10px !important;
    font-size: 13px !important;
}

/* Textarea meno alti */
#serviceDialog textarea{
min-height: 80px !important;          /* prima era 110px+ */
    padding: 8px 10px !important;
    font-size: 13px !important;
    resize: vertical;
}

/* Riduci padding interno del modal */
#serviceDialog .modal-body{
padding: 14px 16px !important;
}

/* Head più compatta */
#serviceDialog .modal-head{
padding: 12px 16px !important;
}

/* ============================================================
   SERVIZI — FORM A 3 COLONNE + CAMPI LONG FORM A SPAN 3
   ============================================================ */

/* 1) La griglia principale diventa a 3 colonne */
#serviceDialog .form-grid{
display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    column-gap: 18px !important;
    row-gap: 14px !important;
    align-items: start !important;
}

/* 2) Rende tutti i label “normali” a 1 colonna */
#serviceDialog .form-grid > label{
grid-column: span 1 !important;
    min-width: 0;
}

/* 3) I campi lunghi (già col-2) diventano SPAN 3 */
#serviceDialog .form-grid > label.col-2{
grid-column: 1 / -1 !important;   /* span su tutte e 3 le colonne */
}

/* EXTRA: migliora compattezza dei textarea */
#serviceDialog textarea{
min-height: 80px !important;
    resize: vertical;
}

/* SVC Filter — grid principale a 3 colonne */
#svcFilterDlg .modal-body{
display: grid !important;
    grid-template-columns: repeat(3, minmax(0,1fr)) !important;
    column-gap: 18px !important;
    row-gap: 14px !important;
    align-items: start !important;
    min-width: 0 !important;
}

/* Rende i wrapper invisibili alla griglia */
#svcFilterDlg .row,
#svcFilterDlg .row2,
#svcFilterDlg .form-grid{
display: contents !important;
}

/* Tutti i label/field normali occupano 1 colonna */
#svcFilterDlg .modal-body > label{
grid-column: span 1 !important;
    min-width: 0 !important;
}

/* Tipo e Stato — gruppi checkbox span su 3 colonne */
#svcFilterDlg fieldset:has(#svcfTipoGroup),
#svcFilterDlg fieldset:has(#svcfStatoGroup){
grid-column: 1 / -1 !important;
    min-width: 0 !important;
}

/* Imposta i gruppi checkbox a 3 colonne interne */
#svcFilterDlg #svcfTipoGroup,
#svcFilterDlg #svcfStatoGroup{
display: grid !important;
    grid-template-columns: repeat(3, minmax(0,1fr)) !important;
    gap: 10px 12px !important;
    min-width: 0 !important;
}

/* Nasconde l’input ma resta cliccabile */
#svcFilterDlg input[type="checkbox"]{
position: absolute !important;
    opacity: 0 !important;
    inset: 0 !important;
}

/* Label come chip */
#svcFilterDlg label[for^="svcf_"],
#svcFilterDlg #svcfTipoGroup label,
#svcFilterDlg #svcfStatoGroup label{
display: inline-flex !important;
    align-items: center;
    justify-content: center;
    padding: 6px 14px;
    font-size: 13px;
    border-radius: 20px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.15);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    white-space: nowrap;
}

/* Stato attivo */
#svcFilterDlg input[type="checkbox"]:checked + label{
background: rgba(99,230,255,0.18);
    border-color: rgb(99,230,255);
    box-shadow: 0 0 6px rgba(99,230,255,0.5);
}

/* Ripple */
#svcFilterDlg label::after{
content:"";
    position:absolute;
    width:8px;
    height:8px;
    background:rgba(99,230,255,0.55);
    border-radius:50%;
    opacity:0;
    transform:scale(1);
    transition:opacity .45s ease, transform .45s ease;
}

#svcFilterDlg label:active::after{
opacity:0.9;
    transform:scale(14);
    left:var(--r-x,50%);
    top:var(--r-y,50%);
}

#svcFilterDlg fieldset{
background: color-mix(in srgb, var(--panel-2), transparent 22%) !important;
    border: 1px solid color-mix(in srgb, var(--border), transparent 40%) !important;
    border-radius: 12px;
    padding: 14px 16px !important;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

#svcFilterDlg legend{
font-size: 13px !important;
  margin-bottom: 6px !important;
  padding: 0 6px;
  color: var(--txt);
  white-space: nowrap;
}

/* ============================================================
   SVC FILTER — Griglia 3 colonne + gruppi checkbox full width
   Replica stile/struttura CRQ
   ============================================================ */

/* A. Impone la griglia a 3 colonne sul body del dialog */
#svcFilterDlg .modal-body{
display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  column-gap: 18px !important;
  row-gap: 14px !important;
  align-items: start !important;
  min-width: 0 !important;
}

/* B. Rende trasparenti i wrapper intermedi (così i figli entrano nella grid) */
#svcFilterDlg form,
#svcFilterDlg .form,
#svcFilterDlg .form-grid,
#svcFilterDlg .row,
#svcFilterDlg .row2,
#svcFilterDlg .svcf-grid{
display: contents !important;
}

/* C. Tutti i campi "normali" occupano 1 colonna */
#svcFilterDlg .modal-body > label,
#svcFilterDlg .modal-body > .field,
#svcFilterDlg .modal-body > .control{
grid-column: span 1 !important;
  min-width: 0 !important;
}

/* D. Fieldset stile CRQ */
#svcFilterDlg fieldset{
background: color-mix(in srgb, var(--panel-2), transparent 22%) !important;
  border: 1px solid color-mix(in srgb, var(--border), transparent 40%) !important;
  border-radius: 12px !important;
  padding: 14px 16px !important;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0 !important;
}

/* E. GRUPPI CHECKBOX = 3 colonne interne (chips) */
#svcFilterDlg #svcfTipoGroup,
#svcFilterDlg #svcfStatoGroup{
display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 10px 12px !important;
  min-width: 0 !important;
}

/* F. Checkbox → chip (stile CRQ) */
#svcFilterDlg input[type="checkbox"]{
position: absolute !important;
  opacity: 0 !important;
  inset: 0 !important;
  pointer-events: none !important;  /* il click va sulla label */
}

#svcFilterDlg #svcfTipoGroup label,
#svcFilterDlg #svcfStatoGroup label,
#svcFilterDlg label[for^="svcf_"]{
display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 6px 14px !important;
  font-size: 13px !important;
  border-radius: 20px !important;
  background: rgba(255,255,255,0.06) !important;
  border: 1px solid rgba(255,255,255,0.15) !important;
  cursor: pointer !important;
  position: relative !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}

#svcFilterDlg input[type="checkbox"]:checked + label{
background: rgba(99,230,255,0.18) !important;
  border-color: rgb(99,230,255) !important;
  box-shadow: 0 0 6px rgba(99,230,255,0.5) !important;
}

/* Ripple */
#svcFilterDlg #svcfTipoGroup label::after,
#svcFilterDlg #svcfStatoGroup label::after,
#svcFilterDlg label[for^="svcf_"]::after{
content:"";
  position:absolute;
  width:8px; height:8px; border-radius:50%;
  background:rgba(99,230,255,0.55);
  opacity:0; transform:scale(1);
  transition:opacity .45s ease, transform .45s ease;
}

#svcFilterDlg #svcfTipoGroup label:active::after,
#svcFilterDlg #svcfStatoGroup label:active::after,
#svcFilterDlg label[for^="svcf_"]:active::after{
opacity:.9; transform:scale(14);
  left:var(--r-x,50%); top:var(--r-y,50%);
}

/* G. SPAN 3 COLONNE dei gruppi checkbox (con fallback a classe JS) */
#svcFilterDlg fieldset:has(#svcfTipoGroup),
#svcFilterDlg fieldset:has(#svcfStatoGroup),
#svcFilterDlg fieldset.full-span{
grid-column: 1 / -1 !important;  /* ← full width */
}

#svcFilterDlg .modal-body.grid-3{
display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  column-gap: 18px !important;
  row-gap: 14px !important;
}

/* ============================================================
   SERVIZI — Checkbox Tipo & Stato → 4 colonne interne
   ============================================================ */

#svcFilterDlg #svcfTipoGroup,
#svcFilterDlg #svcfStatoGroup{
display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important; /* DA 3 → 4 COLONNE */
    gap: 10px 12px !important;
    min-width: 0 !important;
}

#svcFilterDlg #svcfTipoGroup,
#svcFilterDlg #svcfStatoGroup{
display: grid !important;
    grid-template-columns: repeat(4, minmax(0,1fr)) !important;
    gap: 10px 12px !important;
}

#svcFilterDlg .svc-chip{
display: contents !important; /* così input+label restano fratelli ma sotto la grid */
}

)
   ============================================================ */

/* A) I due gruppi (Tipo, Stato) diventano griglie a 4 colonne */
#svcFilterDlg #svcfTipoGroup.checks,
#svcFilterDlg #svcfStatoGroup.checks,
#svcFilterDlg fieldset:has(#svcfTipoGroup) .checks,
#svcFilterDlg fieldset:has(#svcfStatoGroup) .checks{
display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 10px 12px !important;
  align-items: start !important;
  min-width: 0 !important;
}

/* B) Le “pill” si allargano alla larghezza della propria colonna e
      il testo è centrato (come nei CRQ) */
#svcFilterDlg #svcfTipoGroup.checks label,
#svcFilterDlg #svcfStatoGroup.checks label,
#svcFilterDlg fieldset:has(#svcfTipoGroup) .checks label,
#svcFilterDlg fieldset:has(#svcfStatoGroup) .checks label{
width: 100% !important;
  justify-content: center !important;
  white-space: nowrap !important;
}

/* C) I fieldset di Tipo e Stato restano “full row” (3 colonne del dialog) */
#svcFilterDlg fieldset:has(#svcfTipoGroup),
#svcFilterDlg fieldset:has(#svcfStatoGroup){
grid-column: 1 / -1 !important;
  min-width: 0 !important;
}

/* Stessa altezza e font dei CRQ */
#svcFilterDlg .checks label{
padding: 6px 14px !important;
  font-size: 13px !important;
  border-radius: 20px !important;
}
