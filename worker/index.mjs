import { handler as analyzeHandler } from "../netlify/functions/analyze.mjs";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return json(200, {
        ok: true,
        service: "SHONKET AI API",
        runtime: "Cloudflare Workers",
        aiBindingConfigured: Boolean(env.AI),
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname !== "/api/analyze") {
      return json(404, { error: "Not found." });
    }

    if (!["POST", "OPTIONS"].includes(request.method)) {
      return new Response(JSON.stringify({ error: "Method not allowed." }), {
        status: 405,
        headers: { ...JSON_HEADERS, Allow: "POST, OPTIONS" }
      });
    }

    let body = null;
    if (request.method === "POST") {
      body = await request.text();
    }

    const headers = Object.fromEntries(request.headers.entries());
    const event = {
      httpMethod: request.method,
      headers,
      body
    };

    const result = await analyzeHandler(
      event,
      env,
      env.AI || null,
      env.ANALYZE_RATE_LIMITER || null
    );

    return new Response(result.body || null, {
      status: result.statusCode,
      headers: result.headers
    });
  }
};
