const PORTALS = [
  { id: "shed-scholarships", agency: "Secondary and Higher Education Division, Ministry of Education", listingUrl: "https://shed.gov.bd/pages/moedu-scholarships" },
  { id: "shed-notices", agency: "Secondary and Higher Education Division, Ministry of Education", listingUrl: "https://shed.gov.bd/pages/notices" },
  { id: "dshe-notices", agency: "Directorate of Secondary and Higher Education (DSHE)", listingUrl: "https://dshe.gov.bd/pages/notices" }
];

const CACHE_TTL_MS = 90_000;
const FETCH_TIMEOUT_MS = 1_800;
const cache = new Map();

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "to", "of", "for", "from", "on", "in", "at",
  "and", "or", "this", "that", "you", "your", "we", "our", "they", "their", "it", "as",
  "offering", "offers", "offer", "apply", "application", "click", "link", "here", "now",
  "bdt", "taka", "tk", "bangladesh", "government", "govt",
  "একটি", "এই", "ওই", "এবং", "জন্য", "হবে", "হয়", "করে", "করুন", "আবেদন", "প্রসঙ্গে"
]);

const SEARCH_SYNONYMS = [
  { pattern: /\b(scholarship|scholarships|stipend|fellowship)\b|বৃত্তি|উপবৃত্তি|ফেলোশিপ/i, words: ["scholarship", "scholarships", "stipend", "fellowship", "government", "education", "academic", "student", "বৃত্তি", "উপবৃত্তি"] },
  { pattern: /\b(grant|allowance|financial assistance|benefit|subsidy)\b|অনুদান|ভাতা|আর্থিক সহায়তা|আর্থিক সহায়তা/i, words: ["grant", "allowance", "benefit", "government", "education", "student", "অনুদান", "ভাতা"] },
  { pattern: /\b(job|jobs|recruitment|vacancy|hiring|employment)\b|চাকরি|নিয়োগ|নিয়োগ/i, words: ["job", "jobs", "recruitment", "vacancy", "government", "education", "teacher", "চাকরি", "নিয়োগ", "নিয়োগ"] },
  { pattern: /\b(education|university|student|study|academic|school|college)\b|শিক্ষা|বিশ্ববিদ্যালয়|বিশ্ববিদ্যালয়|শিক্ষার্থী/i, words: ["education", "university", "student", "study", "academic", "school", "college", "শিক্ষা", "বিশ্ববিদ্যালয়", "বিশ্ববিদ্যালয়", "শিক্ষার্থী"] }
];

export function normaliseDigits(value) {
  return String(value || "").replace(/[০-৯]/g, digit => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
}

export function tokens(value) {
  return [...new Set(
    normaliseDigits(value).toLocaleLowerCase().normalize("NFKC")
      .match(/[\p{L}\p{N}]{2,}/gu) || []
  )].map(token => {
    if (/^[a-z]+$/.test(token) && token.length > 5 && token.endsWith("s")) return token.slice(0, -1);
    return token;
  }).filter(token => !STOP_WORDS.has(token));
}

function searchTerms(query) {
  const result = new Set(tokens(query));
  for (const group of SEARCH_SYNONYMS) {
    if (group.pattern.test(query)) group.words.forEach(word => result.add(word));
  }
  return [...result].slice(0, 30);
}

export function htmlToText(html) {
  return String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

export function isAllowedGovUrl(candidate, expectedHost) {
  try {
    const url = new URL(candidate);
    return url.protocol === "https:"
      && url.hostname === expectedHost
      && url.hostname.endsWith(".gov.bd")
      && !url.username && !url.password;
  } catch {
    return false;
  }
}

function safeAnchors(row, baseUrl) {
  const host = new URL(baseUrl).hostname;
  const links = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(row)) !== null) {
    const hrefMatch = match[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = hrefMatch && (hrefMatch[1] || hrefMatch[2] || hrefMatch[3]);
    if (!href) continue;
    try {
      const url = new URL(href, baseUrl);
      if (isAllowedGovUrl(url.href, host)) links.push({ url: url.href, label: htmlToText(match[2]) });
    } catch {}
  }
  return links;
}

function parseDate(value) {
  const match = normaliseDigits(value).match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (!match) return { display: null, iso: null };
  const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return { display: null, iso: null };
  return {
    display: match[0],
    iso: String(year) + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0")
  };
}

export function parseListingRows(html, portal) {
  const rows = String(html || "").match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  const records = [];
  for (const row of rows) {
    const cells = row.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi) || [];
    if (cells.length < 2) continue;
    const texts = cells.map(htmlToText);
    const title = texts.find((text, index) =>
      index > 0 && text.length >= 8 && !/^\d+$/.test(normaliseDigits(text))
      && !/\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(normaliseDigits(text))
      && !/^(দেখুন|view|download)$/i.test(text)
    );
    if (!title) continue;
    const links = safeAnchors(row, portal.listingUrl);
    const detail = links.find(link => /^(দেখুন|view)$/i.test(link.label.trim()))
      || links.find(link => new URL(link.url).pathname.includes("/pages/"));
    if (!detail) continue;
    const date = parseDate(texts.find(text => /\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(normaliseDigits(text))) || "");
    records.push({
      id: portal.id + ":" + records.length,
      agency: portal.agency,
      title: title.slice(0, 240),
      url: detail.url,
      listingUrl: portal.listingUrl,
      publishedDate: date.display,
      publishedDateISO: date.iso
    });
  }
  return records;
}

function isEducationClaim(query) {
  return /\b(scholarship|stipend|fellowship|grant|education|university|student|study|academic|school|college|job|recruitment|teacher)\b|বৃত্তি|উপবৃত্তি|ফেলোশিপ|অনুদান|শিক্ষা|বিশ্ববিদ্যালয়|বিশ্ববিদ্যালয়|শিক্ষার্থী|চাকরি|নিয়োগ|নিয়োগ|শিক্ষক/i.test(query);
}

function scoreRecord(record, terms) {
  const titleTerms = new Set(tokens(record.title));
  const matched = terms.filter(term => titleTerms.has(term));
  return { score: matched.length, matchedTerms: matched.slice(0, 10) };
}

function amounts(value) {
  const text = normaliseDigits(value).replace(/,/g, "");
  const found = [];
  const pattern = /(?:৳\s*(\d{3,}(?:\.\d{1,2})?)|(?:bdt|taka|tk\.?)\s*(\d{3,}(?:\.\d{1,2})?)|(\d{3,}(?:\.\d{1,2})?)\s*(?:bdt|taka|tk\.?))/gi;
  for (const match of text.matchAll(pattern)) {
    const value = Number(match[1] || match[2] || match[3]);
    if (Number.isFinite(value)) found.push(value);
  }
  return [...new Set(found)];
}

export function compareEvidence(query, sources, searchStatus) {
  if (searchStatus === "unavailable" || searchStatus === "partial_unavailable") {
    return { status: "search_unavailable", summary_bn: "কিছু বা সব সরকারি পোর্টালে সংযোগ করা যায়নি। অনুসন্ধান অসম্পূর্ণ; দাবিটি এখনো যাচাই করা যায়নি।", summary_en: "Some or all official portals could not be reached. The search is incomplete and the claim remains unverified." };
  }
  if (!sources.length) {
    return { status: "no_matching_notice_found", summary_bn: "যাচাই করা সরকারি শিক্ষা-পোর্টালগুলোতে মিলে এমন নোটিশ পাওয়া যায়নি। এতে দাবিটি মিথ্যা প্রমাণ হয় না।", summary_en: "No matching notice was found in the education portals checked. This does not prove the claim is false." };
  }
  const requestedAmounts = amounts(query);
  const foundAmounts = amounts(sources[0].title);
  if (requestedAmounts.length && foundAmounts.length && !requestedAmounts.some(value => foundAmounts.includes(value))) {
    return { status: "possible_amount_conflict", summary_bn: "সম্পর্কিত সরকারি নোটিশ পাওয়া গেছে, তবে বার্তার অঙ্ক ও নোটিশের শিরোনামে পাওয়া অঙ্ক মেলে না। মূল নোটিশ যাচাই করুন।", summary_en: "A related official notice was found, but the amount in the message differs from the amount stated in the notice title. Review the original notice." };
  }
  return { status: "related_official_notice", summary_bn: "সম্পর্কিত সরকারি নোটিশ পাওয়া গেছে। শিরোনাম মিলে গেলেই বার্তার প্রেরক, অঙ্ক, যোগ্যতা বা লিংক সত্য প্রমাণিত হয় না।", summary_en: "A related official notice was found. A matching title does not authenticate the sender, amount, eligibility, or link." };
}

async function fetchListing(portal, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(portal.listingUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "Accept": "text/html,application/xhtml+xml", "User-Agent": "SHONKET-AI-Official-Notice-Search/1.0" }
    });
    if (!response.ok || response.status >= 300) throw new Error("Official portal returned HTTP " + response.status);
    if (response.url && !isAllowedGovUrl(response.url, new URL(portal.listingUrl).hostname)) {
      throw new Error("Official portal redirected outside the allowlist.");
    }
    const contentType = response.headers?.get?.("content-type") || "";
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error("Official portal did not return HTML.");
    const html = await response.text();
    return html.slice(0, 1_500_000);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Live retrieval is intentionally limited to allowlisted Bangladesh education
 * government scholarship/notice listings. It does not search the entire web.
 * It reads listing titles and publication dates only; notice attachments are
 * not downloaded or parsed.
 */
export async function searchOfficialSources(query, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const rawQuery = String(query || "").trim().slice(0, 4_000);
  const terms = searchTerms(rawQuery);
  if (!rawQuery || !isEducationClaim(rawQuery) || !terms.length) {
    return {
      status: "not_applicable",
      scope: "Bangladesh education ministry and DSHE public scholarship/notice listings",
      searchedAt: new Date().toISOString(),
      searchedPortals: [],
      sources: [],
      evidenceAssessment: compareEvidence(rawQuery, [], "no_results"),
      summary_bn: "এই বার্তার জন্য সরকারি শিক্ষা-পোর্টালে অনুসন্ধান প্রযোজ্য নয়।",
      summary_en: "Search of Bangladesh education portals was not applicable to this message."
    };
  }

  const key = tokens(rawQuery).sort().join("|");
  const existing = cache.get(key);
  if (existing && Date.now() - existing.at < CACHE_TTL_MS) return { ...existing.result, cached: true };

  const outcomes = await Promise.allSettled(PORTALS.map(async portal => ({
    portal, html: await fetchListing(portal, fetchImpl)
  })));
  const searchedPortals = [];
  const records = [];
  let failedPortalCount = 0;

  for (const outcome of outcomes) {
    if (outcome.status !== "fulfilled") {
      failedPortalCount += 1;
      continue;
    }
    searchedPortals.push({
      agency: outcome.value.portal.agency,
      listingUrl: outcome.value.portal.listingUrl
    });
    records.push(...parseListingRows(outcome.value.html, outcome.value.portal));
  }

  const sources = records
    .map(record => ({ ...record, ...scoreRecord(record, terms) }))
    .filter(record => record.score >= 2)
    .sort((a, b) => b.score - a.score || String(b.publishedDateISO || "").localeCompare(String(a.publishedDateISO || "")))
    .slice(0, 4)
    .map(record => ({
      id: record.id,
      agency: record.agency,
      title: record.title,
      url: record.url,
      listingUrl: record.listingUrl,
      publishedDate: record.publishedDate,
      publishedDateISO: record.publishedDateISO,
      matchedTerms: record.matchedTerms,
      relevanceScore: record.score,
      detailFetched: false,
      excerpt: "This title and publication date were read from the official listing only. Open the original notice and attached document to verify amount, eligibility, deadline, and conditions."
    }));

  const status = sources.length
    ? (failedPortalCount ? "partial_results" : "results_found")
    : searchedPortals.length
      ? (failedPortalCount ? "partial_unavailable" : "no_results")
      : "unavailable";
  const evidenceAssessment = compareEvidence(rawQuery, sources, status);
  const result = {
    status,
    scope: "Bangladesh education ministry and DSHE public scholarship/notice listings",
    searchedAt: new Date().toISOString(),
    searchedPortals,
    failedPortalCount,
    sources,
    evidenceAssessment,
    summary_bn: sources.length
      ? "বাংলাদেশের সরকারি শিক্ষা-পোর্টালে সম্পর্কিত নোটিশ পাওয়া গেছে। এটি দাবির প্রেরক, পরিমাণ, যোগ্যতা বা শর্তের সত্যতা নিশ্চিত করে না।"
      : searchedPortals.length
        ? (failedPortalCount
          ? "কিছু সরকারি পোর্টাল পরীক্ষা করা যায়নি এবং যেগুলো পরীক্ষা করা হয়েছে সেখানে মেলে এমন নোটিশ পাওয়া যায়নি। এটি দাবি মিথ্যা হওয়ার প্রমাণ নয়।"
          : "যে সরকারি শিক্ষা-পোর্টালগুলো পরীক্ষা করা হয়েছে সেখানে মেলে এমন নোটিশ পাওয়া যায়নি। এটি দাবি মিথ্যা হওয়ার প্রমাণ নয়।")
        : "এই মুহূর্তে সরকারি শিক্ষা-পোর্টালগুলোতে সংযোগ করা যায়নি। পরে আবার চেষ্টা করুন।",
    summary_en: sources.length
      ? "Related entries were found on Bangladesh education government portals. This does not confirm the sender, amount, eligibility, or terms."
      : searchedPortals.length
        ? (failedPortalCount
          ? "Some official portals could not be checked and no matching entry was found on the reachable portals. This does not prove the claim is false."
          : "No matching entry was found on the education government portals checked. This does not prove the claim is false.")
        : "The education government portals could not be reached right now. Try again later."
  };

  cache.set(key, { at: Date.now(), result });
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return result;
}
