import { buildRuleAssessment } from "./ruleAssessment.js";

const MAX_TEXT = 4000;
const RATE_LIMITS = [
  { name: "minute", windowSeconds: 60, limit: 60 },
  { name: "day", windowSeconds: 86400, limit: 300 }
];

async function enforceRateLimits(req) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    const error = new Error("Rate limiting is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const ip = String(req.headers?.["x-real-ip"] || "").trim();
  if (!ip || ip.length > 64) {
    const error = new Error("Could not establish a trusted client address.");
    error.statusCode = 503;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);
  const script = "local current = redis.call('INCR', KEYS[1]); if current == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])); end; local ttl = redis.call('TTL', KEYS[1]); return {current, ttl}";
  for (const rule of RATE_LIMITS) {
    const windowId = Math.floor(now / rule.windowSeconds);
    const key = "shonket:analyze:" + rule.name + ":" + windowId + ":" + ip;
    const response = await fetch(redisUrl.replace(/\/$/, "") + "/pipeline", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + redisToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([["EVAL", script, "1", key, String(rule.windowSeconds)]])
    });

    if (!response.ok) {
      const error = new Error("Rate-limit service is unavailable.");
      error.statusCode = 503;
      throw error;
    }
    const payload = await response.json();
    const result = payload?.[0]?.result;
    if (!Array.isArray(result) || Number(result[0]) > rule.limit) {
      const error = new Error("Rate limit reached. Please wait before trying again.");
      error.statusCode = 429;
      error.retryAfter = Math.max(1, Number(result?.[1]) || rule.windowSeconds);
      throw error;
    }
  }
}

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  const requestStartedAt = Date.now();
  try {
    const body = req.body || {};
    const bodyBytes = Buffer.byteLength(JSON.stringify(body), "utf8");
    if (bodyBytes > 4 * 1024 * 1024) {
      return send(res, 413, { error: "Request is too large. Maximum request size is 4 MB." });
    }

    await enforceRateLimits(req);

    if (body.imageBase64) {
      return send(res, 422, {
        error: "Screenshot analysis is temporarily unavailable. Paste the message text instead; this tool does not claim to read images.",
        code: "IMAGE_ANALYSIS_UNAVAILABLE"
      });
    }

    const cleanText = String(body.message || "").trim().slice(0, MAX_TEXT);
    if (!cleanText) {
      return send(res, 400, { error: "Add the message text you want to check." });
    }

    const requestedLanguage = body.language === "en" || body.language === "bn" ? body.language : "auto";
    const language = requestedLanguage === "auto"
      ? (/[\\u0980-\\u09FF]/.test(cleanText) ? "bn" : "en")
      : requestedLanguage;
    const result = buildRuleAssessment(cleanText, language);
    return send(res, 200, {
      ...result,
      processingTimeMs: Date.now() - requestStartedAt
    });
  } catch (error) {
    if (error?.statusCode === 429) {
      res.setHeader("Retry-After", String(error.retryAfter || 60));
      return send(res, 429, { error: error.message });
    }
    if (error?.statusCode === 503) {
      return send(res, 503, { error: error.message });
    }
    return send(res, 500, { error: "Something went wrong while checking this message." });
  }
}
