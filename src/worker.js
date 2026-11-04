import { handler as analyzeHandler, officialSearchHandler } from "../netlify/functions/analyze.mjs";
import { domainSearchHandler } from "../netlify/functions/live-domain-search.mjs";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

export async function handleAnalyzeRequest(request, env) {
  const clientIp = String(request.headers.get("CF-Connecting-IP") || "").trim();
  if (!clientIp || clientIp.length > 64) {
    return json(503, { error: "Could not establish a trusted client address." });
  }

  const limiter = env?.ANALYZE_RATE_LIMITER;
  if (!limiter || typeof limiter.limit !== "function") {
    return json(503, { error: "The built-in rate limiter is not configured." });
  }

  const headers = Object.fromEntries(request.headers.entries());
  let body = null;
  if (request.method === "POST") {
    const declaredLength = Number(headers["content-length"] || 0);
    if (declaredLength > 16 * 1024) {
      body = "";
    } else {
      body = await request.text();
      headers["content-length"] = String(new TextEncoder().encode(body).byteLength);
    }
  }

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

export async function handleOfficialSearchRequest(request, env) {
  const headers = Object.fromEntries(request.headers.entries());
  if (request.method === "OPTIONS") {
    const preflight = await officialSearchHandler({
      httpMethod: "OPTIONS",
      headers,
      body: null
    }, env, null);
    return new Response(preflight.body || null, {
      status: preflight.statusCode,
      headers: preflight.headers
    });
  }
  const clientIp = String(request.headers.get("CF-Connecting-IP") || "").trim();
  if (!clientIp || clientIp.length > 64) {
    return json(503, { error: "Could not establish a trusted client address." });
  }
  const limiter = env?.OFFICIAL_SEARCH_RATE_LIMITER;
  if (!limiter || typeof limiter.limit !== "function") {
    return json(503, { error: "The official-search rate limiter is not configured." });
  }
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }
  const declaredLength = Number(headers["content-length"] || 0);
  if (declaredLength > 16 * 1024) return json(413, { error: "Request is too large." });
  const body = await request.text();
  headers["content-length"] = String(new TextEncoder().encode(body).byteLength);
  const result = await officialSearchHandler({
    httpMethod: request.method,
    headers,
    body
  }, env, limiter);
  return new Response(result.body || null, {
    status: result.statusCode,
    headers: result.headers
  });
}


export async function handleDomainSearchRequest(request, env) {
  const headers = Object.fromEntries(request.headers.entries());
  if (request.method === "OPTIONS") {
    const preflight = await domainSearchHandler({
      httpMethod: "OPTIONS",
      headers,
      body: null
    }, env, null);
    return new Response(preflight.body || null, {
      status: preflight.statusCode,
      headers: preflight.headers
    });
  }

  if (request.method !== "POST") return json(405, { error: "Method not allowed." });

  const clientIp = String(request.headers.get("CF-Connecting-IP") || "").trim();
  if (!clientIp || clientIp.length > 64) {
    return json(503, { error: "Could not establish a trusted client address." });
  }

  const limiter = env?.OFFICIAL_SEARCH_RATE_LIMITER;
  if (!limiter || typeof limiter.limit !== "function") {
    return json(503, { error: "The domain-search rate limiter is not configured." });
  }

  const declaredLength = Number(headers["content-length"] || 0);
  if (declaredLength > 4096) return json(413, { error: "Request is too large." });

  const body = await request.text();
  const actualLength = new TextEncoder().encode(body).byteLength;
  if (actualLength > 4096) return json(413, { error: "Request is too large." });
  headers["content-length"] = String(actualLength);
  const result = await domainSearchHandler({
    httpMethod: request.method,
    headers,
    body
  }, env, limiter);

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
        officialSearchRateLimitConfigured: Boolean(env.OFFICIAL_SEARCH_RATE_LIMITER),
        timestamp: new Date().toISOString()
      });
    }

    if (pathname === "/api/analyze") {
      return handleAnalyzeRequest(request, env);
    }

    if (pathname === "/api/official-search") {
      return handleOfficialSearchRequest(request, env);
    }

    if (pathname === "/api/domain-search") {
      return handleDomainSearchRequest(request, env);
    }

    return json(404, { error: "API route not found." });
  }
};
