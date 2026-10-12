export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/track" && request.method === "POST") {
      try {
        const data = await request.json();
        const log = {
          ts: new Date().toISOString(),
          ip: request.headers.get("cf-connecting-ip") || "unknown",
          country: request.headers.get("cf-ipcountry") || "",
          ua: (request.headers.get("user-agent") || "").substring(0, 200),
          referer: request.headers.get("referer") || "",
          path: data.path || "/",
          lang: data.lang || "",
          platform: data.platform || ""
        };
        const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        if (env.VISIT_LOG) {
          await env.VISIT_LOG.put("visit:" + id, JSON.stringify(log), { expirationTtl: 2592000 });
        }
        return new Response(JSON.stringify({ ok: true, id: id }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    if (url.pathname === "/api/logs" && request.method === "GET") {
      try {
        if (env.VISIT_LOG) {
          const list = await env.VISIT_LOG.list({ prefix: "visit:", limit: 200 });
          const logs = await Promise.all(list.keys.map(async k => {
            const v = await env.VISIT_LOG.get(k.name);
            return v ? JSON.parse(v) : null;
          }));
          const sorted = logs.filter(Boolean).sort((a, b) => b.ts.localeCompare(a.ts));
          return new Response(JSON.stringify(sorted, null, 2), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        return new Response("[]", {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
