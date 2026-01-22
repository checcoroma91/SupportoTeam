# Autosave su GitHub (commit JSON dal front-end)

Questa cartella contiene due alternative di backend **serverless** per committare i file JSON nel tuo repo GitHub in modo sicuro:

- **Netlify Functions** → `netlify/functions/save-to-github.js`
- **Vercel Functions**   → `api/save-to-github.js`

> **Perché serve?** Le pagine statiche (GitHub Pages) **non possono** scrivere nel repo da sole; serve un endpoint con **token segreto** lato server che faccia il commit al posto del browser.

---

## 1) Configurazione variabili d’ambiente
Imposta le seguenti variabili **sul provider** che scegli (Netlify o Vercel):

- `GITHUB_TOKEN`  → Fine‑grained PAT o token di una GitHub App con permesso **Contents: Read & Write** sul repo di destinazione.
- `GITHUB_OWNER`  → Owner/organizzazione del repo (es. `bper-banca`).
- `GITHUB_REPO`   → Nome repo (es. `linkhub`).
- `GITHUB_BRANCH` → (opz.) Branch di commit, default `main`.
- `GITHUB_BASE_PATH` → (opz.) Sottocartella dentro al repo dove salvare i JSON.

> **Consiglio**: usa un **Fine-grained PAT** limitato **solo** al repo e al permesso **Contents**.

---

## 2) Deploy Netlify Function (consigliato se hai già Netlify)

1. Installa la CLI (opzionale): `npm i -g netlify-cli`
2. Esegui il link del sito: `netlify init` (oppure configura dal pannello Netlify)
3. Imposta le variabili in **Site settings → Environment variables**
4. Deploy: `netlify deploy --prod`

Endpoint risultante dal front-end: `/.netlify/functions/save-to-github`

---

## 3) Deploy Vercel Function

1. `npm i -g vercel`
2. `vercel` (seleziona scope/progetto)
3. Imposta le variabili in **Project → Settings → Environment Variables**
4. `vercel --prod`

Endpoint risultante dal front-end: `/api/save-to-github`

---

## 4) Aggancio dal front-end
Nel tuo HTML/JS, invia i dati all’endpoint con POST JSON. Esempio:

```js
async function saveRepo(path, data, message){
  const endpoints = [
    '/.netlify/functions/save-to-github', // Netlify
    '/api/save-to-github'                 // Vercel
  ];
  let lastErr;
  for (const url of endpoints){
    try{
      const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ path, data, message })});
      if (r.ok) return await r.json();
      lastErr = await r.text();
    }catch(e){ lastErr = String(e); }
  }
  throw new Error('Nessun endpoint disponibile: '+lastErr);
}

// Esempio integrazione con il tuo stato attuale:
async function saveAllToRepo(){
  await saveRepo('linkhub-links.json', { sections: state.sections, links: state.links }, 'Autosave links');
  await saveRepo('open-points.json',   { openPoints: state.openPoints }, 'Autosave OP');
  await saveRepo('services.json',      { services: state.services }, 'Autosave servizi');
  toast('Salvato su repo');
}
```

Aggiungi un bottone **“💾 Salva su repo”** che chiama `saveAllToRepo()`.

---

## 5) Sicurezza
- Il token resta **solo lato server** (nelle env del provider). Mai nel JS del browser.
- Concedi permessi **minimi** e solo al **repo target**.

---

## 6) Note
- Se salvi in una **sottocartella**, valorizza `GITHUB_BASE_PATH` (es. `public/data`).
- Se vuoi creare **branch/PR** invece di commit diretti su `main`, sostituisci `branch: 'main'` con il branch di lavoro e poi apri PR con una Action dedicata.
