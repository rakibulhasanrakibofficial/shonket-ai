const MAX_DOMAIN_LENGTH = 253;
const MAX_BODY_BYTES = 4096;
const QUERY_TIMEOUT_MS = 4500;
const CACHE_TTL_MS = 120_000;
const MAX_RESULTS = 8;
const cache = new Map();
const localRateBuckets = new Map();

function cleanText(value, maxLength = 500) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function htmlToText(value) {
  return String(value || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      const point = Number(code);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const point = Number.parseInt(code, 16);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function isPrivateIpv4(host) {
  const parts = host.split(".");
  if (parts.length !== 4 || !parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)) return false;
  const [a, b] = parts.map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 192 && b === 0)
    || (a === 198 && (b === 18 || b === 19 || b === 51))
    || (a === 203 && b === 0);
}

function validateDomain(value) {
  const host = String(value || "").trim().toLowerCase().replace(/\.$/, "");
  if (!host || host.length > MAX_DOMAIN_LENGTH || /[\s\/?#@\\]/.test(host)) {
    throw new Error("A valid hostname is required for web search.");
  }

  let parsed;
  try {
    parsed = new URL("https://" + host);
  } catch {
    throw new Error("The submitted hostname is not valid.");
  }

  if (parsed.hostname !== host || parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.port) {
    throw new Error("Send only a hostname, not a full URL or port.");
  }
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")
    || host.endsWith(".test") || host.endsWith(".invalid") || host.endsWith(".example")) {
    throw new Error("Local and reserved hostnames cannot be searched.");
  }
  if (host.startsWith("[") || host.includes(":") || isPrivateIpv4(host)) {
    throw new Error("Private or local IP addresses cannot be searched.");
  }
  if (!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/i.test(host)) {
    throw new Error("The hostname format is not supported for web search.");
  }
  return host;
}

function safeResultUrl(value) {
  try {
    let parsed = new URL(value, "https://html.duckduckgo.com");
    if (parsed.hostname === "duckduckgo.com" || parsed.hostname.endsWith(".duckduckgo.com")) {
      const destination = parsed.searchParams.get("uddg");
      if (!destination) return null;
      parsed = new URL(destination);
    }
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}

function parseSearchResults(html, targetDomain, queryType) {
  const source = String(html || "");
  if (/anomaly-modal|challenge-form|bots use duckduckgo|select all squares/i.test(source.slice(0, 12000))) {
    throw new Error("The search provider returned a verification page.");
  }

  const anchors = [...source.matchAll(/<a\b([^>]*class=["'][^"']*(?:result__a|result-link)[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi)];
  const results = [];
  for (let index = 0; index < anchors.length; index += 1) {
    const match = anchors[index];
    const hrefMatch = match[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawHref = hrefMatch && (hrefMatch[1] || hrefMatch[2] || hrefMatch[3]);
    const url = rawHref ? safeResultUrl(htmlToText(rawHref)) : null;
    const title = cleanText(htmlToText(match[2]), 180);
    if (!url || !title) continue;

    const nextIndex = anchors[index + 1]?.index ?? Math.min(source.length, match.index + 2200);
    const tail = source.slice(match.index + match[0].length, Math.min(nextIndex, match.index + 2200));
    const snippetMatch = tail.match(/<(?:div|td|span|a)\b[^>]*class=["'][^"']*(?:result__snippet|result-snippet)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|td|span|a)>/i);
    const snippet = cleanText(htmlToText(snippetMatch?.[1] || ""), 360);
    let resultHost = "";
    try { resultHost = new URL(url).hostname.toLowerCase(); } catch {}

    const searchableText = (title + " " + snippet).toLowerCase();
    const domainMention = searchableText.includes(targetDomain)
      || searchableText.includes(targetDomain.replace(/^www\./, ""));
    const resultIsTarget = resultHost === targetDomain || resultHost.endsWith("." + targetDomain);
    const hostInPath = (() => {
      try { return decodeURIComponent(new URL(url).pathname).toLowerCase().includes(targetDomain); }
      catch { return false; }
    })();
    const relevanceScore = (domainMention ? (title.toLowerCase().includes(targetDomain) ? 5 : 4) : 0)
      + (resultIsTarget ? 2 : 0)
      + (hostInPath ? 1 : 0);
    if (relevanceScore < 2) continue;

    results.push({
      id: queryType + ":" + results.length,
      title,
      url,
      domain: resultHost,
      snippet,
      queryType,
      relevanceScore,
      matchReason: domainMention ? "Exact domain mention in result text" : "Result belongs to the submitted domain"
    });
  }
  return results;
}

async function fetchSearchPage(query, fetchImpl) {
  const endpoints = [
    "https://html.duckduckgo.com/html/?q=",
    "https://lite.duckduckgo.com/lite/?q="
  ];
  let lastError = null;
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
    try {
      const response = await fetchImpl(endpoint + encodeURIComponent(query), {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0 (compatible; SHONKET-AI/1.0; +https://github.com/rakibulhasanrakibofficial/shonket-ai)"
        },
        signal: controller.signal,
        redirect: "follow"
      });
      if (!response.ok) throw new Error("Search provider returned HTTP " + response.status + ".");
      const html = await response.text();
      if (html.length > 2_000_000) throw new Error("Search provider response was too large.");
      return html;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("The search provider could not be reached.");
}

function allowedOrigins(runtimeEnv) {
  const configured = String(runtimeEnv.CORS_ALLOWED_ORIGINS || "")
    .split(",").map(value => value.trim().replace(/\/+$/, "")).filter(Boolean);
  return new Set([
    "https://rakibulhasanrakibofficial.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...configured,
    ...(runtimeEnv.URL ? [String(runtimeEnv.URL).replace(/\/+$/, "")] : [])
  ]);
}

function corsHeaders(origin, runtimeEnv) {
  const headers = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  if (origin && allowedOrigins(runtimeEnv).has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function makeResponse(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    },
    body: statusCode === 204 ? "" : JSON.stringify(payload)
  };
}

function localRateLimit(ip) {
  const now = Date.now();
  const entry = localRateBuckets.get(ip);
  if (!entry || now - entry.startedAt >= 60_000) {
    localRateBuckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  if (entry.count >= 12) return false;
  entry.count += 1;
  if (localRateBuckets.size > 1000) {
    for (const [key, value] of localRateBuckets) {
      if (now - value.startedAt >= 60_000) localRateBuckets.delete(key);
    }
  }
  return true;
}

async function searchDomain(domain, fetchImpl) {
  const cacheKey = domain;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.value;

  const querySpecs = [
    { type: "security_mentions", query: '"' + domain + '" scam phishing malware fraud abuse blacklist' },
    { type: "domain_identity", query: '"' + domain + '" official website company service review' }
  ];
  const attempts = await Promise.allSettled(querySpecs.map(async spec => {
    const html = await fetchSearchPage(spec.query, fetchImpl);
    return { spec, results: parseSearchResults(html, domain, spec.type) };
  }));

  const completed = attempts.filter(item => item.status === "fulfilled");
  const failedCount = attempts.length - completed.length;
  const merged = [];
  const seen = new Set();
  for (const item of completed) {
    for (const result of item.value.results) {
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      merged.push(result);
    }
  }
  merged.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const sources = merged.slice(0, MAX_RESULTS);
  const status = completed.length === 0
    ? "unavailable"
    : failedCount > 0
      ? (sources.length ? "partial_results" : "partial_unavailable")
      : sources.length
        ? "results_found"
        : "no_results";

  const value = {
    searched: true,
    searchExecuted: completed.length > 0 || failedCount > 0,
    provider: "DuckDuckGo",
    status,
    domain,
    searchedAt: new Date().toISOString(),
    queryCount: completed.length + failedCount,
    successfulQueryCount: completed.length,
    failedQueryCount: failedCount,
    queries: querySpecs.map(item => item.query),
    sourceCount: sources.length,
    sources,
    summary_en: status === "results_found" || status === "partial_results"
      ? "Live web search returned domain-related references. Search snippets can be incomplete or outdated and do not prove that the website is safe or malicious."
      : status === "no_results"
        ? "The search completed, but no domain-specific references passed the relevance filter. No results do not prove that the website is safe."
        : "The live search provider could not return usable results. The website's reputation remains unchecked.",
    summary_bn: status === "results_found" || status === "partial_results"
      ? "লাইভ ওয়েব সার্চে ডোমেইন-সম্পর্কিত কিছু রেফারেন্স পাওয়া গেছে। সার্চের snippet অসম্পূর্ণ বা পুরোনো হতে পারে; এগুলো সাইট নিরাপদ বা ক্ষতিকর—কোনোটিই প্রমাণ করে না।"
      : status === "no_results"
        ? "সার্চ সম্পন্ন হয়েছে, কিন্তু প্রাসঙ্গিকতার শর্ত পূরণ করে এমন ডোমেইন-নির্দিষ্ট রেফারেন্স পাওয়া যায়নি। ফলাফল না পাওয়া সাইট নিরাপদ হওয়ার প্রমাণ নয়।"
        : "লাইভ সার্চ সেবা ব্যবহারযোগ্য ফলাফল দিতে পারেনি। ওয়েবসাইটের reputation এখনো যাচাই করা যায়নি।"
  };

  if (status !== "unavailable") cache.set(cacheKey, { cachedAt: Date.now(), value });
  return value;
}

export async function domainSearchHandler(event, runtimeEnv = {}, rateLimiter = null, fetchImpl = globalThis.fetch) {
  runtimeEnv = runtimeEnv || {};
  const origin = event.headers && (event.headers.origin || event.headers.Origin);
  const headers = corsHeaders(origin || "", runtimeEnv);

  if (event.httpMethod === "OPTIONS") return makeResponse(204, {}, headers);
  if (event.httpMethod !== "POST") {
    return makeResponse(405, { error: "Method not allowed." }, { ...headers, Allow: "POST, OPTIONS" });
  }
  if (origin && !allowedOrigins(runtimeEnv).has(origin)) {
    return makeResponse(403, { error: "This site is not allowed to use the SHONKET API." }, headers);
  }

  const declaredLength = Number((event.headers && (event.headers["content-length"] || event.headers["Content-Length"])) || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return makeResponse(413, { error: "Request is too large." }, headers);
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return makeResponse(400, { error: "Request body must be valid JSON." }, headers);
  }

  let domain;
  try {
    const hostname = validateDomain(body.hostname);
    const requestedRoot = String(body.rootDomain || "").trim().toLowerCase().replace(/\.$/, "");
    domain = requestedRoot && (hostname === requestedRoot || hostname.endsWith("." + requestedRoot))
      ? validateDomain(requestedRoot)
      : hostname;
  } catch (error) {
    return makeResponse(400, {
      error: cleanText(error?.message || "A valid hostname is required for web search."),
      webEvidence: {
        searched: false,
        searchExecuted: false,
        provider: "DuckDuckGo",
        status: "not_searchable",
        sourceCount: 0,
        sources: []
      }
    }, headers);
  }

  const clientIp = String(
    (event.headers && (event.headers["cf-connecting-ip"] || event.headers["CF-Connecting-IP"]
      || event.headers["x-nf-client-connection-ip"] || event.headers["X-NF-Client-Connection-IP"])) || "unknown"
  ).slice(0, 80);
  if (rateLimiter && typeof rateLimiter.limit === "function") {
    const limit = await rateLimiter.limit({ key: clientIp });
    if (!limit.success) {
      return makeResponse(429, { error: "Too many web searches. Please wait and try again." }, {
        ...headers,
        "Retry-After": "60"
      });
    }
  } else if (!localRateLimit(clientIp)) {
    return makeResponse(429, { error: "Too many web searches. Please wait and try again." }, {
      ...headers,
      "Retry-After": "60"
    });
  }

  try {
    const webEvidence = await searchDomain(domain, fetchImpl);
    return makeResponse(200, { webEvidence }, headers);
  } catch {
    return makeResponse(200, {
      webEvidence: {
        searched: true,
        searchExecuted: true,
        provider: "DuckDuckGo",
        status: "unavailable",
        domain,
        searchedAt: new Date().toISOString(),
        queryCount: 0,
        sourceCount: 0,
        sources: [],
        summary_en: "The live search provider could not be reached. No reputation conclusion was made.",
        summary_bn: "লাইভ সার্চ সেবায় সংযোগ করা যায়নি। ডোমেইন সম্পর্কে কোনো reputation সিদ্ধান্ত দেওয়া হয়নি।"
      }
    }, headers);
  }
}
