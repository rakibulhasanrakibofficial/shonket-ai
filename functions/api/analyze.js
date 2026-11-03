import { buildRuleAssessment } from "../../api/ruleAssessment.js";

const MAX_TEXT = 4000;
const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMITS = [
  { name: "minute", windowSeconds: 60, limit: 60 },
  { name: "day", windowSeconds: 86400, limit: 300 }
];

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

async function enforceRateLimits(request, env) {
  const redisUrl = env.UPSTASH_REDIS_REST_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    const error = new Error("Rate limiting is not configured.");
    error.statusCode = 503;
    throw error;
  }

  // Cloudflare supplies this address at the edge; never trust a client-provided forwarded-IP header.
  const ip = String(request.headers.get("CF-Connecting-IP") || "").trim();
  if (!ip || ip.length > 64) {
    const error = new Error("Could not establish a trusted client address.");
    error.statusCode = 503;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);
  const script = "local current = redis.call('INCR', KEYS[1]); if current == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])); end; local ttl = redis.call('TTL', KEYS[1]); return {current, ttl}";
  for (const rule of RATE_LIMITS) {
    const windowId = Math.floor(now / rule.windowSeconds);
    const key = `shonket:analyze:${rule.name}:${windowId}:${ip}`;
    let response;
    try {
      response = await fetch(redisUrl.replace(/\/$/, "") + "/pipeline", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + redisToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([["EVAL", script, "1", key, String(rule.windowSeconds)]])
      });
    } catch {
      const error = new Error("Rate-limit service is unavailable.");
      error.statusCode = 503;
      throw error;
    }

    if (!response.ok) {
      const error = new Error("Rate-limit service is unavailable.");
      error.statusCode = 503;
      throw error;
    }
    const payload = await response.json().catch(() => null);
    const result = payload?.[0]?.result;
    if (!Array.isArray(result) || !Number.isFinite(Number(result[0]))) {
      const error = new Error("Rate-limit service returned an invalid response.");
      error.statusCode = 503;
      throw error;
    }
    if (Number(result[0]) > rule.limit) {
      const error = new Error("Rate limit reached. Please wait before trying again.");
      error.statusCode = 429;
      error.retryAfter = Math.max(1, Number(result[1]) || rule.windowSeconds);
      throw error;
    }
  }
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." }, { Allow: "POST" });
  }

  const requestStartedAt = Date.now();
  try {
    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return json(413, { error: "Request is too large. Maximum request size is 64 KB." });
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json(413, { error: "Request is too large. Maximum request size is 64 KB." });
    }

    let body;
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return json(400, { error: "Request body must be valid JSON." });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json(400, { error: "Request body must be a JSON object." });
    }

    await enforceRateLimits(request, env);

    if (body.imageBase64) {
      return json(422, {
        error: "Screenshots are read locally in your browser. Please upload the screenshot again or paste its extracted text.",
        code: "IMAGE_ANALYSIS_UNAVAILABLE"
      });
    }

    const cleanText = String(body.message || "").trim().slice(0, MAX_TEXT);
    if (!cleanText) return json(400, { error: "Add the message text you want to check." });

    const requestedLanguage = body.language === "en" || body.language === "bn" ? body.language : "auto";
    const language = requestedLanguage === "auto"
      ? (/[ঀ-৿]/.test(cleanText) ? "bn" : "en")
      : requestedLanguage;
    const result = buildRuleAssessment(cleanText, language);
    return json(200, {
      ...result,
      processingTimeMs: Date.now() - requestStartedAt
    });
  } catch (error) {
    if (error?.statusCode === 429) {
      return json(429, { error: error.message }, { "Retry-After": String(error.retryAfter || 60) });
    }
    if (error?.statusCode === 503) return json(503, { error: error.message });
    return json(500, { error: "Something went wrong while checking this message." });
  }
}
