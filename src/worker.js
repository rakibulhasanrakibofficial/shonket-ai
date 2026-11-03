import { handler as analyzeHandler } from "../netlify/functions/analyze.mjs";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

export async function handleAnalyzeRequest(request, env) {
  const headers = Object.fromEntries(request.headers.entries());
  const event = {
    httpMethod: request.method,
    headers,
    body: request.method === "POST" ? await request.text() : null
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

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;

    if (pathname === "/health" && request.method === "GET") {
      return json(200, {
        ok: true,
        service: "SHONKET AI API",
        runtime: "Cloudflare Workers",
        aiBindingConfigured: Boolean(env.AI),
        rateLimitConfigured: Boolean(env.ANALYZE_RATE_LIMITER),
        timestamp: new Date().toISOString()
      });
    }

    if (pathname === "/api/analyze") {
      return handleAnalyzeRequest(request, env);
    }

    return json(404, { error: "API route not found." });
  }
};
