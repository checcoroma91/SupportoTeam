export default {
  async fetch(request, env) {
    const reqOrigin = request.headers.get("Origin") || "";
    const allowed   = (env.ALLOWED_ORIGINS || "*")
      .split(",").map(s => s.trim()).filter(Boolean);

    const allowAny  = allowed.includes("*");
    const isAllowed = allowAny || allowed.includes(reqOrigin);

    const withCORS = (res) => {
      const h = new Headers(res.headers);
      h.set("Access-Control-Allow-Origin", allowAny ? "*" : (reqOrigin || "*"));
      h.set("Vary", "Origin");
      return new Response(res.body, { status: res.status, headers: h });
    };

    try {
      // --- PRE-FLIGHT (sempre OK, sempre con CORS)
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": allowAny ? "*" : (reqOrigin || "*"),
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
            "Vary": "Origin",
          },
        });
      }

      const url = new URL(request.url);

      // 1) /data/* -> RAW GitHub (fallback)
      if (request.method === "GET" && url.pathname.startsWith("/data/")) {
        const file = url.pathname.replace("/data/", "");
        const gh = `https://raw.githubusercontent.com/${env.GH_OWNER}/${env.GH_REPO}/${env.GH_BRANCH || "main"}/data/${file}`;
        const r  = await fetch(gh, { cache: "no-store" });
        const t  = await r.text();
        return withCORS(new Response(t, {
          status: r.status,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
        }));
      }

      // 2) GET ?op=load -> JSON combinato
      if (request.method === "GET" && url.searchParams.get("op") === "load") {
        const base = `https://raw.githubusercontent.com/${env.GH_OWNER}/${env.GH_REPO}/${env.GH_BRANCH || "main"}/data`;

        async function safeGet(path) {
          try {
            const r = await fetch(`${base}/${path}`, { cache: "no-store" });
            if (!r.ok) return {};
            return r.json();
          } catch { return {}; }
        }

        const links = await safeGet("linkhub-links.json");
        const op    = await safeGet("open-points.json");
        const svc   = await safeGet("services.json");
        const crq   = await safeGet("crq.json");

        const payload = {
          sections:   links.sections   || [],
          links:      links.links      || [],
          openPoints: op.openPoints    || [],
          services:   svc.services     || [],
          crq:        crq.crq          || []
        };

        return withCORS(Response.json(payload, { headers: { "Cache-Control": "no-store" } }));
      }

      // 3) Diagnostica
      if (request.method === "GET") {
        const info = {
          ok: true,
          service: "linkhub-autosave-direct",
          version: "2.2.0",
          allowedOrigins: allowed,
          originMatched: isAllowed,
          owner: !!env.GH_OWNER,
          repo:  !!env.GH_REPO,
          token: !!env.GH_TOKEN,
          branch: env.GH_BRANCH || "main"
        };
        return withCORS(Response.json(info, { headers: { "Cache-Control": "no-store" } }));
      }

      // 4) Salvataggio (POST protetto — ma errori comunque con CORS)
      if (request.method === "POST") {
        if (!isAllowed) {
          return withCORS(new Response("Origin not allowed", { status: 403 }));
        }

        const owner  = env.GH_OWNER;
        const repo   = env.GH_REPO;
        const token  = env.GH_TOKEN;
        const branch = env.GH_BRANCH || "main";

        if (!owner || !repo || !token) {
          return withCORS(new Response("Server not configured", { status: 500 }));
        }

        let body;
        try { body = await request.json(); }
        catch { return withCORS(new Response("Bad JSON body", { status: 400 })); }

        const sections   = Array.isArray(body.sections)   ? body.sections   : [];
        const links      = Array.isArray(body.links)      ? body.links      : [];
        const openPoints = Array.isArray(body.openPoints) ? body.openPoints : [];
        const services   = Array.isArray(body.services)   ? body.services   : [];
        const crq        = Array.isArray(body.crq)        ? body.crq        : [];

        const files = [
          { path: "data/linkhub-links.json", content: JSON.stringify({ sections, links }, null, 2) },
          { path: "data/open-points.json",   content: JSON.stringify({ openPoints }, null, 2) },
          { path: "data/services.json",      content: JSON.stringify({ services }, null, 2) },
          { path: "data/crq.json",           content: JSON.stringify({ crq }, null, 2) }
        ];

        const toBase64  = (s) => btoa(unescape(encodeURIComponent(s)));
        const ghHeaders = () => ({
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "User-Agent": "linkhub-autosave-direct"
        });

        async function getSha(path) {
          const u = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
          const r = await fetch(u, { headers: ghHeaders() });
          if (r.status === 404) return null;
          const j = await r.json();
          return j.sha || null;
        }

        async function upsert(path, content) {
          const sha = await getSha(path);
          const u   = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
          const dt  = new Date().toISOString();
          const payload = { message: `Autosave: update ${path} (${dt})`, content: toBase64(content), branch };
          if (sha) payload.sha = sha;

          const r = await fetch(u, {
            method: "PUT",
            headers: { ...ghHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
        }

        const results = [];
        for (const f of files) {
          try { await upsert(f.path, f.content); results.push({ path: f.path, ok: true }); }
          catch (e) { results.push({ path: f.path, ok: false, error: e.message }); }
        }

        const anyOk = results.some(x => x.ok);
        return withCORS(Response.json({ ok: anyOk, results }));
      }

      // 5) Default 404 (ma SEMPRE con CORS)
      return withCORS(new Response("Not Found", { status: 404 }));

    } catch (e) {
      // Catch globale (anche qui SEMPRE CORS)
      return withCORS(new Response(`Error: ${e?.message || e}`, { status: 500 }));
    }
  }
};
