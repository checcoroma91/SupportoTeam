
// LinkHub Autosave Worker — v1.1.0 (CORS robusto + whitelist + GET/OPTIONS)
export default {
  async fetch(request, env) {
    const reqOrigin = request.headers.get('Origin') || '';

    const allowed = (env.ALLOWED_ORIGINS || 'https://checcoroma91.github.io')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const isAllowed = allowed.includes(reqOrigin);

    const withCORS = (res, origin = null) => {
      const hdrs = new Headers(res.headers);
      if (origin) {
        hdrs.set('Access-Control-Allow-Origin', origin);
        hdrs.set('Vary', 'Origin');
      }
      return new Response(res.body, { status: res.status, headers: hdrs });
    };

    if (request.method === 'OPTIONS') {
      if (!isAllowed) {
        return new Response('Origin not allowed', {
          status: 403,
          headers: { 'Vary': 'Origin' }
        });
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

    if (request.method === 'GET') {
      const info = {
        ok: true,
        service: 'linkhub-autosave',
        version: '1.1.0',
        allowedOrigins: allowed,
        originMatched: isAllowed,
        owner: !!env.GH_OWNER,
        repo: !!env.GH_REPO,
        token: !!env.GH_TOKEN
      };
      const res = new Response(JSON.stringify(info, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        }
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

      const body = await request.json();

      const owner = env.GH_OWNER;
      const repo  = env.GH_REPO;
      const token = env.GH_TOKEN;

      if (!owner || !repo || !token) {
        const res = new Response('Server not configured', { status: 500 });
        return withCORS(res, reqOrigin);
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;

      const payload = {
        event_type: 'linkhub_autosave',
        client_payload: {
          sections: body.sections || [],
          links: body.links || [],
          openPoints: body.openPoints || [],
          services: body.services || [],
	  crq: body.crq || []
        }
      };

      const gh = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'linkhub-autosave'
        },
        body: JSON.stringify(payload)
      });

      if (!gh.ok) {
        const t = await gh.text().catch(() => gh.statusText);
        const res = new Response(`GitHub API error: ${gh.status} ${t}`, { status: 502 });
        return withCORS(res, reqOrigin);
      }

      const res = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      return withCORS(res, reqOrigin);

    } catch (e) {
      const res = new Response(`Error: ${e.message}`, { status: 500 });
      return isAllowed ? withCORS(res, reqOrigin) : res;
    }
  }
};
