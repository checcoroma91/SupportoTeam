
// worker.js — LinkHub Autosave: scrive direttamente i file in repo/data/*.json
// Runtime: Cloudflare Workers (Modules syntax)

export default {
  async fetch(request, env) {
    const reqOrigin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const isAllowed = allowed.length === 0 || allowed.includes(reqOrigin);

    const withCORS = (res, origin = null) => {
      const hdrs = new Headers(res.headers);
      if (origin) {
        hdrs.set('Access-Control-Allow-Origin', origin);
        hdrs.set('Vary', 'Origin');
      }
      return new Response(res.body, { status: res.status, headers: hdrs });
    };

    // --- Preflight CORS
    if (request.method === 'OPTIONS') {
      if (!isAllowed) {
        return new Response('Origin not allowed', { status: 403, headers: { 'Vary': 'Origin' } });
      }
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': reqOrigin,
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin'
        }
      });
    }

    // --- Health/info
    if (request.method === 'GET') {
      const info = {
        ok: true,
        service: 'linkhub-autosave-direct',
        version: '1.0.0',
        allowedOrigins: allowed,
        originMatched: isAllowed,
        owner: !!env.GH_OWNER,
        repo: !!env.GH_REPO,
        token: !!env.GH_TOKEN,
        branch: env.GH_BRANCH || 'main'
      };
      const res = new Response(JSON.stringify(info, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
      return isAllowed ? withCORS(res, reqOrigin) : res;
    }

    if (request.method !== 'POST') {
      const res = new Response('Method Not Allowed', { status: 405 });
      return isAllowed ? withCORS(res, reqOrigin) : res;
    }

    try {
      if (!isAllowed) {
        return new Response('Origin not allowed', { status: 403 });
      }

      const owner = env.GH_OWNER;
      const repo  = env.GH_REPO;
      const token = env.GH_TOKEN;
      const branch = env.GH_BRANCH || 'main';
      if (!owner || !repo || !token) {
        const res = new Response('Server not configured', { status: 500 });
        return withCORS(res, reqOrigin);
      }

      // --- Leggi il body (accetta payload grandi)
      let body;
      try {
        body = await request.json();
      } catch (e) {
        const res = new Response('Bad JSON body', { status: 400 });
        return withCORS(res, reqOrigin);
      }

      // --- Normalizza: se mancano chiavi, usa array vuoti
      const sections   = Array.isArray(body.sections)   ? body.sections   : [];
      const links      = Array.isArray(body.links)      ? body.links      : [];
      const openPoints = Array.isArray(body.openPoints) ? body.openPoints : [];
      const services   = Array.isArray(body.services)   ? body.services   : [];
      const crq        = Array.isArray(body.crq)        ? body.crq        : [];

      // --- Contenuti dei file
      const files = [
        {
          path: 'data/linkhub-links.json',
          content: JSON.stringify({ sections, links }, null, 2)
        },
        {
          path: 'data/open-points.json',
          content: JSON.stringify({ openPoints }, null, 2)
        },
        {
          path: 'data/services.json',
          content: JSON.stringify({ services }, null, 2)
        },
        {
          path: 'data/crq.json',
          content: JSON.stringify({ crq }, null, 2)
        }
      ];

      // --- Helper: base64 (unicode-safe)
      const toBase64 = (str) => btoa(unescape(encodeURIComponent(str)));

      // --- Helper: header GitHub
      const ghHeaders = () => ({
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'linkhub-autosave-direct'
      });

      // --- Recupera SHA corrente (se esiste)
      async function getSha(path) {
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
        const r = await fetch(url, { headers: ghHeaders() });
        if (r.status === 404) return null;
        if (!r.ok) {
          const t = await r.text().catch(() => r.statusText);
          throw new Error(`GitHub GET ${path}: ${r.status} ${t}`);
        }
        const j = await r.json();
        return j && j.sha ? j.sha : null;
      }

      // --- Crea/Aggiorna file
      async function upsert(path, content, messagePrefix = 'Autosave') {
        const sha = await getSha(path).catch(e => {
          // Se errore non 404, propaga; 404 è già gestito da getSha che ritorna null
          throw e;
        });

        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}`;
        const dt = new Date().toISOString();
        const body = {
          message: `${messagePrefix}: update ${path} (${dt})`,
          content: toBase64(content),
          branch
        };
        if (sha) body.sha = sha;

        const r = await fetch(url, {
          method: 'PUT',
          headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!r.ok) {
          const t = await r.text().catch(() => r.statusText);
          throw new Error(`GitHub PUT ${path}: ${r.status} ${t}`);
        }
        return true;
      }

      // --- Salva tutti i file (in parallelo, ma sequenza è ok uguale)
      const results = [];
      for (const f of files) {
        try {
          await upsert(f.path, f.content, 'Autosave');
          results.push({ path: f.path, ok: true });
        } catch (e) {
          results.push({ path: f.path, ok: false, error: String(e.message || e) });
        }
      }

      // Se almeno un file salvato, è ok; altrimenti 502
      const anyOk = results.some(x => x.ok);
      const status = anyOk ? 200 : 502;
      const res = new Response(JSON.stringify({ ok: anyOk, results }, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      return withCORS(res, reqOrigin);
    } catch (e) {
      const res = new Response(`Error: ${e && e.message ? e.message : e}`, { status: 500 });
      return isAllowed ? withCORS(res, reqOrigin) : res;
    }
  }
};
