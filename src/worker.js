import { buildRuleAssessment } from "../api/ruleAssessment.js";

const MAX_TEXT = 4000;
const MAX_BODY_BYTES = 64 * 1024;

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

export async function handleAnalyzeRequest(request, env) {
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." }, { Allow: "POST" });
  }

  const clientIp = String(request.headers.get("CF-Connecting-IP") || "").trim();
  if (!clientIp || clientIp.length > 64) {
    return json(503, { error: "Could not establish a trusted client address." });
  }

  const limiter = env?.ANALYZE_RATE_LIMITER;
  if (!limiter || typeof limiter.limit !== "function") {
    return json(503, { error: "The built-in rate limiter is not configured." });
  }

  try {
    const decision = await limiter.limit({ key: clientIp });
    if (!decision?.success) {
      return json(429, { error: "Too many checks from this network. Please wait a little and try again." });
    }
  } catch {
    return json(503, { error: "Request protection is temporarily unavailable. Please try again." });
  }

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json(413, { error: "Request is too large. Maximum request size is 64 KB." });
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return json(400, { error: "Could not read the request body." });
  }
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

  if (body.imageBase64) {
    return json(422, {
      error: "Screenshots are read locally in your browser. Please upload the screenshot again or paste its extracted text.",
      code: "IMAGE_ANALYSIS_UNAVAILABLE"
    });
  }

  const cleanText = String(body.message || "").trim().slice(0, MAX_TEXT);
  if (!cleanText) {
    return json(400, { error: "Add the message text you want to check." });
  }

  const requestedLanguage = body.language === "en" || body.language === "bn" ? body.language : "auto";
  const language = requestedLanguage === "auto"
    ? (/[ঀ-৿]/.test(cleanText) ? "bn" : "en")
    : requestedLanguage;
  const startedAt = Date.now();
  const result = buildRuleAssessment(cleanText, language);

  return json(200, {
    ...result,
    processingTimeMs: Date.now() - startedAt
  });
}

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/api/analyze") {
      return handleAnalyzeRequest(request, env);
    }
    return json(404, { error: "API route not found." });
  }
};
