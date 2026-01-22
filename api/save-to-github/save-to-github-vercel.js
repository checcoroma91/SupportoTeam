// Vercel Function — save-to-github-vercel.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { path, data, message } = req.body || {};
    if (!path || typeof data === 'undefined') {
      return res.status(400).json({ error: 'Parametri mancanti: path, data' });
    }
    const OWNER  = process.env.GITHUB_OWNER;
    const REPO   = process.env.GITHUB_REPO;
    const TOKEN  = process.env.GITHUB_TOKEN;
    const BRANCH = process.env.GITHUB_BRANCH || 'main';
    const BASE   = (process.env.GITHUB_BASE_PATH || '').replace(/^\/+|\/+$/g,'');
    if (!OWNER || !REPO || !TOKEN) {
      return res.status(500).json({ error: 'Config mancante: GITHUB_OWNER/REPO/TOKEN' });
    }
    const ghHeaders = {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'linkhub-autosave'
    };
    const fullPath = BASE ? `${BASE}/${path}` : path;
    const apiBase = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(fullPath)}`;
    let sha = undefined;
    const head = await fetch(`${apiBase}?ref=${encodeURIComponent(BRANCH)}`, { headers: ghHeaders });
    if (head.ok) { const info = await head.json(); sha = info.sha; }
    const contentB64 = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const resp = await fetch(apiBase, {
      method: 'PUT', headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message || `chore: autosave ${fullPath}`, content: contentB64, sha, branch: BRANCH })
    });
    if (!resp.ok) { return res.status(resp.status).json({ error: await resp.text() }); }
    const out = await resp.json();
    return res.status(200).json({ ok: true, path: fullPath, commit: out.commit?.sha });
  } catch (e) { return res.status(500).json({ error: String(e) }); }
}
