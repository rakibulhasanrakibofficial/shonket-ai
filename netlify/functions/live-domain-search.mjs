const MAX_DOMAIN_LENGTH = 253;
const MAX_BODY_BYTES = 4096;
const QUERY_TIMEOUT_MS = 2800;
const CACHE_TTL_MS = 120_000;
const MAX_RESULTS = 8;
const MAX_CACHE_ENTRIES = 300;
const MAX_LOCAL_RATE_BUCKETS = 1000;
const cache = new Map();
const localRateBuckets = new Map();
const PUBLIC_SUFFIX_ONLY = new Set([
  "com.bd", "net.bd", "org.bd", "gov.bd", "edu.bd", "ac.bd",
  "co.uk", "org.uk", "gov.uk", "ac.uk",
  "com.au", "net.au", "org.au", "com.in", "co.in",
  "com.pk", "com.sg", "com.my", "com.ph", "com.ng",
  "github.io", "pages.dev", "vercel.app", "netlify.app", "workers.dev"
]);

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

function isRestrictedCategoryDomain(domain, categoryHint = "") {
  const labels = String(domain || "").toLowerCase().split(".");
  const restrictedLabel = labels.some(label =>
    /^(?:adult|adultsite|adultvideo|18plus|xxx|porn|pornhub|pornography|xvideos|xnxx|onlyfans|nsfw|erotic|sexchat|casino|gambling|betting|sportsbook|slots|wager|jackpot|poker|bet365|betway|1xbet|parimatch|mostbet)(?:[-_].*)?$/i.test(label)
  );
  const restrictedHint = /age[- ]restricted|18\+|gambling|casino|betting|sportsbook/i.test(String(categoryHint || ""));
  return restrictedLabel || restrictedHint;
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
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")
    || host.endsWith(".test") || host.endsWith(".invalid") || host.endsWith(".example")) {
    throw new Error("Local and reserved hostnames cannot be searched.");
  }
  if (host.startsWith("[") || host.includes(":") || isPrivateIpv4(host)) {
    throw new Error("Private or local IP addresses cannot be searched.");
  }

  const labels = host.split(".");
  if (labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) {
    throw new Error("The hostname contains an invalid domain label.");
  }
  const topLevelLabel = labels[labels.length - 1] || "";
  if (labels.length < 2 || topLevelLabel.length < 2 || !/[a-z]/i.test(topLevelLabel)) {
    throw new Error("Enter a complete public hostname with a valid ending, such as example.com.");
  }
  if (PUBLIC_SUFFIX_ONLY.has(host)) {
    throw new Error("Add the website name before this public suffix.");
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
    if (parsed.hostname === "bing.com" || parsed.hostname.endsWith(".bing.com")) {
      const encoded = parsed.searchParams.get("u") || "";
      const payload = encoded.startsWith("a1") ? encoded.slice(2) : encoded;
      if (!payload) return null;
      const binary = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      parsed = new URL(new TextDecoder().decode(bytes));
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
  if (/anomaly-modal|challenge-form|bots use duckduckgo|select all squares|unusual traffic|verify you are human/i.test(source.slice(0, 16000))) {
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
    const result = buildRelevantResult({ url, title, snippet, targetDomain, queryType });
    if (result) results.push(result);
  }
  return results;
}

function parseBingResults(html, targetDomain, queryType) {
  const source = String(html || "");
  if (/captcha|unusual traffic|verify you are human|temporarily blocked/i.test(source.slice(0, 16000))) {
    throw new Error("The search provider returned a verification page.");
  }
  const blocks = [...source.matchAll(/<li\b[^>]*class=["'][^"']*\bb_algo\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)];
  const results = [];
  for (const block of blocks) {
    const anchor = block[1].match(/<h2\b[^>]*>[\s\S]*?<a\b([^>]*)>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i)
      || block[1].match(/<a\b([^>]*class=["'][^"']*\bb_link\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/i);
    if (!anchor) continue;
    const hrefMatch = anchor[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawHref = hrefMatch && (hrefMatch[1] || hrefMatch[2] || hrefMatch[3]);
    const url = rawHref ? safeResultUrl(htmlToText(rawHref)) : null;
    const title = cleanText(htmlToText(anchor[2]), 180);
    const snippetMatch = block[1].match(/<(?:p|div)\b[^>]*class=["'][^"']*(?:b_caption|b_algoSlug)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/i);
    const snippet = cleanText(htmlToText(snippetMatch?.[1] || ""), 360);
    if (!url || !title) continue;
    const result = buildRelevantResult({ url, title, snippet, targetDomain, queryType });
    if (result) results.push(result);
  }
  return results;
}

function mentionsExactDomain(text, domain) {
  const value = String(text || "").toLowerCase();
  const token = String(domain || "").toLowerCase();
  if (!token) return false;
  let index = value.indexOf(token);
  while (index >= 0) {
    const before = index > 0 ? value[index - 1] : "";
    const afterIndex = index + token.length;
    const after = value[afterIndex] || "";
    const leftBoundary = !before || !/[a-z0-9.-]/i.test(before);
    let rightBoundary = !after || !/[a-z0-9-.]/i.test(after);
    const nextChar = value[afterIndex + 1] || "";
    const afterSentencePeriod = after === "." && nextChar.trim() === "";
    if (afterSentencePeriod) rightBoundary = true;
    if (leftBoundary && rightBoundary) return true;
    index = value.indexOf(token, index + 1);
  }
  return false;
}

const SECURITY_REFERENCE_HOSTS = [
  "virustotal.com", "urlscan.io", "abuseipdb.com", "urlvoid.com",
  "scamadviser.com", "scamdoc.com", "securitytrails.com",
  "safebrowsing.google.com", "transparencyreport.google.com",
  "cisa.gov", "consumer.ftc.gov", "reportfraud.ftc.gov"
];
const REVIEW_REFERENCE_HOSTS = [
  "trustpilot.com", "sitejabber.com", "reddit.com", "g2.com",
  "trustindex.io", "productreview.com.au"
];
const SECURITY_REFERENCE_TERMS = /\b(scam|scams|phishing|phish|malware|abuse|blacklist(?:ed)?|blocklist|compromised|malicious|security report|security alert|fraud|threat|unsafe|suspicious|reputation|reported)\b/i;
const REVIEW_REFERENCE_TERMS = /\b(reviews?|ratings?|complaints?|experiences?|trustpilot|sitejabber|community discussion)\b/i;
const IDENTITY_REFERENCE_TERMS = /\b(official website|official site|company profile|about us|contact|support|help centre|help center|security page|trust center|status page|terms of service|privacy policy|product|platform|developer|documentation|domain information|whois)\b/i;
const EXCLUDED_FIRST_PARTY_PATH = /(?:^|\/)(?:login|log-in|signin|sign-in|search|download|desktop|register|signup|account|auth)(?:\/|$)/i;
const USEFUL_FIRST_PARTY_PATH = /(?:^|\/)(?:about|company|contact|support|help|security|trust|status|terms|privacy|docs|developers?|report|abuse)(?:\/|$)/i;

function hostMatchesAny(host, domains) {
  return domains.some(domain => host === domain || host.endsWith("." + domain));
}

function buildRelevantResult({ url, title, snippet, targetDomain, queryType }) {
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  const resultHost = parsed.hostname.toLowerCase();
  const decodedPath = (() => {
    try { return decodeURIComponent(parsed.pathname).toLowerCase(); }
    catch { return parsed.pathname.toLowerCase(); }
  })();
  const searchableText = [title, snippet, decodedPath].join(" ");
  const domainMention = mentionsExactDomain(title + " " + snippet, targetDomain)
    || mentionsExactDomain(title + " " + snippet, "www." + targetDomain);
  const resultIsTarget = resultHost === targetDomain || resultHost.endsWith("." + targetDomain);
  const hostInPath = decodedPath.includes(targetDomain);
  const securityHost = hostMatchesAny(resultHost, SECURITY_REFERENCE_HOSTS);
  const reviewHost = hostMatchesAny(resultHost, REVIEW_REFERENCE_HOSTS);
  const securityMatch = SECURITY_REFERENCE_TERMS.test(searchableText) || securityHost;
  const reviewMatch = REVIEW_REFERENCE_TERMS.test(searchableText) || reviewHost;

  if (!domainMention && !hostInPath && !resultIsTarget) return null;

  let evidenceCategory = "";
  let evidenceLabel_en = "";
  let evidenceLabel_bn = "";
  let userBenefit_en = "";
  let userBenefit_bn = "";
  let matchReason = "";
  let relevanceScore = 0;

  if (queryType === "security_mentions") {
    if (!securityMatch) return null;
    evidenceCategory = "security_reference";
    evidenceLabel_en = securityHost ? "Security database / report" : "Security-related mention";
    evidenceLabel_bn = securityHost ? "সিকিউরিটি ডেটাবেস / রিপোর্ট" : "নিরাপত্তা-সম্পর্কিত উল্লেখ";
    userBenefit_en = "Use this to inspect whether a public security report or abuse discussion mentions the hostname. Check the report date and evidence before drawing a conclusion.";
    userBenefit_bn = "এই ফলাফলে ডোমেইনটি নিয়ে কোনো public security report বা abuse discussion আছে কি না দেখুন। সিদ্ধান্তের আগে রিপোর্টের তারিখ ও প্রমাণ যাচাই করুন।";
    matchReason = domainMention
      ? "The exact hostname appears in a security-related title or snippet."
      : "The submitted hostname appears in a security-related URL or report.";
    relevanceScore = 8 + (title.toLowerCase().includes(targetDomain) ? 3 : domainMention ? 2 : 0)
      + (securityHost ? 2 : 0);
  } else {
    if (resultIsTarget) {
      // Ignore the queried hostname itself when detecting generic login/download titles.
      // A legitimate base domain may contain a word such as "login" in its name.
      const titleWithoutDomain = title.toLowerCase().replaceAll(targetDomain.toLowerCase(), " ");
      const genericTitle = /\b(sign in|log in|login|search results|download|desktop app|create account|register)\b/i.test(titleWithoutDomain);
      const usefulPage = decodedPath === "/" || USEFUL_FIRST_PARTY_PATH.test(decodedPath);
      if (genericTitle || EXCLUDED_FIRST_PARTY_PATH.test(decodedPath) || !usefulPage) return null;
      evidenceCategory = "official_site_page";
      evidenceLabel_en = "Website's own page";
      evidenceLabel_bn = "ওয়েবসাইটের নিজস্ব পেজ";
      userBenefit_en = "This is a first-party page on the submitted hostname. It can help identify the service, but it is not an independent safety or reputation check.";
      userBenefit_bn = "এটি দেওয়া ডোমেইনের নিজস্ব পেজ। সেবাটি শনাক্ত করতে সাহায্য করে, তবে এটি স্বাধীন safety বা reputation যাচাই নয়।";
      matchReason = decodedPath === "/"
        ? "The result is the submitted website's homepage."
        : "The result is a useful about, support, security or policy page on the submitted hostname.";
      relevanceScore = 5 + (decodedPath !== "/" ? 2 : 0) + (domainMention ? 1 : 0);
    } else if (domainMention && securityMatch) {
      evidenceCategory = "security_reference";
      evidenceLabel_en = securityHost ? "Security database / report" : "Security-related mention";
      evidenceLabel_bn = securityHost ? "সিকিউরিটি ডেটাবেস / রিপোর্ট" : "নিরাপত্তা-সম্পর্কিত উল্লেখ";
      userBenefit_en = "This third-party page discusses a security issue or report mentioning the exact hostname. Check its publication date and underlying evidence.";
      userBenefit_bn = "এই third-party পেজে নির্দিষ্ট ডোমেইনটির উল্লেখসহ নিরাপত্তা-সংক্রান্ত আলোচনা বা রিপোর্ট আছে। প্রকাশের তারিখ ও মূল প্রমাণ যাচাই করুন।";
      matchReason = "The exact hostname appears in a third-party security-related result.";
      relevanceScore = 9 + (title.toLowerCase().includes(targetDomain) ? 2 : 0) + (securityHost ? 2 : 0);
    } else if (domainMention && reviewMatch) {
      evidenceCategory = "independent_review";
      evidenceLabel_en = "Independent review / discussion";
      evidenceLabel_bn = "স্বতন্ত্র রিভিউ / আলোচনা";
      userBenefit_en = "This is a third-party review or discussion mentioning the hostname. Treat user posts as unverified experiences, not proof of safety or fraud.";
      userBenefit_bn = "এটি ডোমেইনটির উল্লেখসহ third-party review বা আলোচনা। ব্যবহারকারীর পোস্টকে যাচাইহীন অভিজ্ঞতা হিসেবে দেখুন—নিরাপত্তা বা প্রতারণার চূড়ান্ত প্রমাণ নয়।";
      matchReason = "The exact hostname appears in a review or discussion result.";
      relevanceScore = 7 + (title.toLowerCase().includes(targetDomain) ? 2 : 0) + (reviewHost ? 1 : 0);
    } else if (domainMention && IDENTITY_REFERENCE_TERMS.test(searchableText)) {
      evidenceCategory = "third_party_reference";
      evidenceLabel_en = "Third-party website reference";
      evidenceLabel_bn = "তৃতীয় পক্ষের ওয়েব রেফারেন্স";
      userBenefit_en = "This page contains identifying information about the hostname. Check who published it and whether the details match the service you expected.";
      userBenefit_bn = "এই পেজে ডোমেইনটি সম্পর্কে পরিচয়-সংক্রান্ত তথ্য আছে। প্রকাশক কে এবং তথ্যগুলো প্রত্যাশিত সেবার সঙ্গে মেলে কি না যাচাই করুন।";
      matchReason = "The exact hostname appears in a third-party identity or service reference.";
      relevanceScore = 5 + (title.toLowerCase().includes(targetDomain) ? 2 : 0);
    } else {
      return null;
    }
  }

  return {
    id: queryType + ":" + resultHost + ":" + relevanceScore + ":" + parsed.pathname,
    title, url, domain: resultHost, snippet, queryType, relevanceScore,
    evidenceCategory, evidenceLabel_en, evidenceLabel_bn,
    userBenefit_en, userBenefit_bn, matchReason
  };
}

async function searchQuery(query, targetDomain, queryType, fetchImpl) {
  const providers = [
    { name: "DuckDuckGo", endpoint: "https://html.duckduckgo.com/html/?q=", parse: parseSearchResults },
    { name: "DuckDuckGo Lite", endpoint: "https://lite.duckduckgo.com/lite/?q=", parse: parseSearchResults },
    { name: "Bing", endpoint: "https://www.bing.com/search?q=", parse: parseBingResults }
  ];
  const successfulProviders = [];
  let attemptedProviders = 0;
  let lastError = null;
  for (const provider of providers) {
    attemptedProviders += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
    try {
      const response = await fetchImpl(provider.endpoint + encodeURIComponent(query), {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0 (compatible; SHONKET-AI/1.0; +https://github.com/rakibulhasanrakibofficial/shonket-ai)"
        },
        signal: controller.signal,
        redirect: "follow"
      });
      if (!response.ok) throw new Error(provider.name + " returned HTTP " + response.status + ".");
      const html = await response.text();
      if (html.length > 2_000_000) throw new Error(provider.name + " response was too large.");
      const results = provider.parse(html, targetDomain, queryType);
      successfulProviders.push(provider.name);
      if (results.length) return { results, provider: provider.name, successfulProviders, attemptedProviders };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  if (successfulProviders.length) {
    return { results: [], provider: successfulProviders.join(" + "), successfulProviders, attemptedProviders };
  }
  throw lastError || new Error("No search provider could be reached.");
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
  let entry = localRateBuckets.get(ip);
  if (entry && now - entry.startedAt >= 60_000) {
    localRateBuckets.delete(ip);
    entry = null;
  }

  if (!entry) {
    if (localRateBuckets.size >= MAX_LOCAL_RATE_BUCKETS) {
      for (const [key, value] of localRateBuckets) {
        if (now - value.startedAt >= 60_000) localRateBuckets.delete(key);
      }
    }
    if (localRateBuckets.size >= MAX_LOCAL_RATE_BUCKETS) {
      const oldestKey = localRateBuckets.keys().next().value;
      if (oldestKey !== undefined) localRateBuckets.delete(oldestKey);
    }
    localRateBuckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }

  if (entry.count >= 12) return false;
  entry.count += 1;
  return true;
}

function cacheSearchResult(domain, value) {
  if (cache.has(domain)) cache.delete(domain);
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(domain, { cachedAt: Date.now(), value });
}

async function searchDomain(domain, hostname, fetchImpl) {
  const searchTargets = [...new Set([hostname, domain].filter(Boolean))];
  const cacheKey = searchTargets.join("|");
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    // Refresh insertion order so the cache behaves as a bounded LRU.
    cache.delete(cacheKey);
    cache.set(cacheKey, cached);
    return cached.value;
  }
  if (cached) cache.delete(cacheKey);

  const querySpecs = searchTargets.flatMap(target => [
    { target, type: "security_mentions", query: '"' + target + '" scam phishing malware fraud abuse blacklist' },
    { target, type: "domain_identity", query: '"' + target + '" official website company service review' }
  ]);
  const attempts = await Promise.allSettled(querySpecs.map(spec =>
    searchQuery(spec.query, spec.target, spec.type, fetchImpl)
  ));
  const completed = attempts.filter(item => item.status === "fulfilled");
  const failedCount = attempts.length - completed.length;
  const merged = [];
  const seen = new Set();
  const usedProviders = new Set();
  for (const item of completed) {
    for (const provider of item.value.provider.split(" + ")) usedProviders.add(provider);
    for (const result of item.value.results) {
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      merged.push({ ...result, provider: item.value.provider });
    }
  }
  merged.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const sources = merged.slice(0, MAX_RESULTS);
  const status = completed.length === 0
    ? "unavailable"
    : failedCount > 0
      ? (sources.length ? "partial_results" : "partial_unavailable")
      : sources.length ? "results_found" : "no_results";
  const provider = [...usedProviders].join(" + ") || "DuckDuckGo / Bing";
  const securityReferenceCount = sources.filter(source => source.evidenceCategory === "security_reference").length;
  const identityReferenceCount = sources.filter(source => source.evidenceCategory !== "security_reference").length;
  const value = {
    searched: true,
    searchExecuted: completed.length > 0,
    provider,
    status,
    domain,
    hostname,
    searchedTargets: searchTargets,
    searchedAt: new Date().toISOString(),
    queryCount: querySpecs.length,
    successfulQueryCount: completed.length,
    failedQueryCount: failedCount,
    queries: querySpecs.map(item => item.query),
    sourceCount: sources.length,
    securityReferenceCount,
    identityReferenceCount,
    sources,
    summary_en: status === "results_found" || status === "partial_results"
      ? "Filtered public references were found for the exact hostname and estimated base domain: " + securityReferenceCount + " security-related and " + identityReferenceCount + " identity, review or first-party reference(s). Open original pages and check dates; snippets are not proof of site safety or maliciousness."
      : status === "no_results"
        ? "The search completed for the exact hostname and estimated base domain, but no relevant security, review or useful identity references passed the filter. No results do not prove that the website is safe."
        : status === "partial_unavailable"
          ? "Some search providers were unavailable and no relevant references were found for the exact hostname or estimated base domain. The website's reputation remains unchecked."
          : "The live search providers could not return usable results. The website's reputation remains unchecked.",
    summary_bn: status === "results_found" || status === "partial_results"
      ? "নির্দিষ্ট hostname ও estimated base domain—দুটোর জন্য প্রাসঙ্গিকতা যাচাই করে " + securityReferenceCount + "টি security-related এবং " + identityReferenceCount + "টি পরিচয়, review বা নিজস্ব-সাইট reference পাওয়া গেছে। মূল পেজ ও তারিখ দেখুন; snippet একা সাইট নিরাপদ বা ক্ষতিকর প্রমাণ করে না।"
      : status === "no_results"
        ? "নির্দিষ্ট hostname ও estimated base domain—দুটোতেই সার্চ হয়েছে, কিন্তু প্রাসঙ্গিক security report, review বা পরিচয়-সংক্রান্ত রেফারেন্স মেলেনি। ফলাফল না পাওয়া সাইট নিরাপদ হওয়ার প্রমাণ নয়।"
        : "লাইভ সার্চ সেবাগুলো ব্যবহারযোগ্য ফলাফল দিতে পারেনি। ওয়েবসাইটের reputation এখনো যাচাই করা যায়নি।"
  };
  if (status !== "unavailable") cacheSearchResult(cacheKey, value);
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
  const rawBody = typeof event.body === "string" ? event.body : "";
  const actualLength = new TextEncoder().encode(rawBody).byteLength;
  if ((Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) || actualLength > MAX_BODY_BYTES) {
    return makeResponse(413, { error: "Request is too large." }, headers);
  }

  let body;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return makeResponse(400, { error: "Request body must be valid JSON." }, headers);
  }

  let hostname;
  let domain;
  const categoryHint = cleanText(body.categoryHint, 120);
  try {
    hostname = validateDomain(body.hostname);
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
        message: cleanText(error?.message || "The submitted hostname cannot be searched.", 240),
        sourceCount: 0,
        sources: []
      }
    }, headers);
  }

  if (isRestrictedCategoryDomain(domain, categoryHint) || isRestrictedCategoryDomain(hostname, categoryHint)) {
    return makeResponse(200, {
      webEvidence: {
        searched: false,
        searchExecuted: false,
        provider: "DuckDuckGo",
        status: "restricted_category",
        domain,
        hostname,
        searchedTargets: [],
        queryCount: 0,
        successfulQueryCount: 0,
        failedQueryCount: 0,
        sourceCount: 0,
        sources: [],
        summary_en: "Web search is not run for age-restricted or gambling-related categories. No destination links or content references are surfaced.",
        summary_bn: "বয়স-সীমাবদ্ধ বা জুয়া-সম্পর্কিত ক্যাটাগরিতে ওয়েব সার্চ চালানো হয় না। কোনো destination link বা content reference দেখানো হবে না।"
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
    const webEvidence = await searchDomain(domain, hostname, fetchImpl);
    return makeResponse(200, { webEvidence }, headers);
  } catch {
    return makeResponse(200, {
      webEvidence: {
        searched: true,
        searchExecuted: false,
        provider: "DuckDuckGo / Bing",
        status: "unavailable",
        domain,
        searchedAt: new Date().toISOString(),
        queryCount: 0,
        sourceCount: 0,
        sources: [],
        summary_en: "The live search providers could not be reached. No reputation conclusion was made.",
        summary_bn: "লাইভ সার্চ সেবাগুলোতে সংযোগ করা যায়নি। ডোমেইন সম্পর্কে কোনো reputation সিদ্ধান্ত দেওয়া হয়নি।"
      }
    }, headers);
  }
}


// Netlify Functions compatibility adapter (Cloudflare Worker imports the handler above directly).
export async function handler(event) {
  const runtimeEnv = typeof process !== "undefined" ? process.env : {};
  return domainSearchHandler(event, runtimeEnv);
}
