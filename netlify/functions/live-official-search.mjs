const PORTALS = [
  { id: "shed-scholarships", agency: "Secondary and Higher Education Division, Ministry of Education", listingUrl: "https://shed.gov.bd/pages/moedu-scholarships" },
  { id: "shed-notices", agency: "Secondary and Higher Education Division, Ministry of Education", listingUrl: "https://shed.gov.bd/pages/notices" },
  { id: "dshe-notices", agency: "Directorate of Secondary and Higher Education (DSHE)", listingUrl: "https://dshe.gov.bd/pages/notices" }
];

const SOURCE_GROUPS = {
  education: PORTALS.map(source => ({ ...source, kind: "government_listing", title: source.agency + " — official notices" })),
  jobs: [
    {
      id: "teletalk-jobs",
      agency: "Alljobs by Teletalk — Government recruitment listing",
      title: "Alljobs by Teletalk — Government recruitment and general notices",
      listingUrl: "https://alljobs.teletalk.com.bd/general-notices",
      kind: "recruitment_listing"
    },
    {
      id: "scamcheck-common-scams",
      agency: "Government of Bangladesh — ScamCheck",
      title: "Common Scams in Bangladesh",
      listingUrl: "https://scamcheck.gov.bd/common-scams-in-bangladesh/",
      kind: "official_guidance"
    }
  ],
  mobile_money: [
    {
      id: "bkash-fraud-awareness",
      agency: "bKash — official safety guidance",
      title: "bKash — Fraud Awareness",
      listingUrl: "https://www.bkash.com/bn/page/fraud-awareness",
      kind: "official_guidance"
    },
    {
      id: "bkash-security-tips",
      agency: "bKash — official safety guidance",
      title: "bKash — Security Tips",
      listingUrl: "https://www.bkash.com/page/security-tips",
      kind: "official_guidance"
    },
    {
      id: "nagad-help",
      agency: "Nagad — official Help centre",
      title: "Nagad — Help and customer support",
      listingUrl: "https://frontend.nagad.com.bd/en/help/",
      kind: "official_guidance"
    },
    {
      id: "cirt-smishing",
      agency: "BGD e-GOV CIRT — cybersecurity advisory",
      title: "Global Error524 smishing campaign targeting Bangladesh",
      listingUrl: "https://cirt.gov.bd/advisories/global-campaign-targeting-bd",
      kind: "cyber_advisory"
    }
  ],
  banking: [
    {
      id: "bangladesh-bank-ict-alerts",
      agency: "Bangladesh Bank — ICT Security Advisories & Alerts",
      title: "Bangladesh Bank — ICT Security Advisories & Alerts",
      listingUrl: "https://www.bb.org.bd/en/index.php/about/secalrt",
      kind: "cyber_advisory"
    },
    {
      id: "bfiu-circulars",
      agency: "Bangladesh Financial Intelligence Unit (BFIU)",
      title: "BFIU — official circulars",
      listingUrl: "https://bfiu.org.bd/index.php/legislation/circular",
      kind: "government_listing"
    },
    {
      id: "scamcheck-online-safety",
      agency: "Government of Bangladesh — ScamCheck",
      title: "Online safety guidance",
      listingUrl: "https://scamcheck.gov.bd/online-safety/",
      kind: "official_guidance"
    }
  ],
  cybersecurity: [
    {
      id: "cirt-alerts",
      agency: "BGD e-GOV CIRT — alerts",
      title: "BGD e-GOV CIRT — Security Alerts",
      listingUrl: "https://cirt.gov.bd/alerts",
      kind: "cyber_advisory"
    },
    {
      id: "cirt-smishing",
      agency: "BGD e-GOV CIRT — cybersecurity advisory",
      title: "Global Error524 smishing campaign targeting Bangladesh",
      listingUrl: "https://cirt.gov.bd/advisories/global-campaign-targeting-bd",
      kind: "cyber_advisory"
    },
    {
      id: "scamcheck-common-scams",
      agency: "Government of Bangladesh — ScamCheck",
      title: "Common Scams in Bangladesh",
      listingUrl: "https://scamcheck.gov.bd/common-scams-in-bangladesh/",
      kind: "official_guidance"
    },
    {
      id: "scamcheck-online-safety",
      agency: "Government of Bangladesh — ScamCheck",
      title: "Online safety guidance",
      listingUrl: "https://scamcheck.gov.bd/online-safety/",
      kind: "official_guidance"
    }
  ],
  courier: [
    {
      id: "cirt-smishing",
      agency: "BGD e-GOV CIRT — cybersecurity advisory",
      title: "Global Error524 smishing campaign targeting Bangladesh",
      listingUrl: "https://cirt.gov.bd/advisories/global-campaign-targeting-bd",
      kind: "cyber_advisory"
    },
    {
      id: "scamcheck-common-scams",
      agency: "Government of Bangladesh — ScamCheck",
      title: "Common Scams in Bangladesh",
      listingUrl: "https://scamcheck.gov.bd/common-scams-in-bangladesh/",
      kind: "official_guidance"
    }
  ],
  telecom: [
    {
      id: "cirt-smishing",
      agency: "BGD e-GOV CIRT — cybersecurity advisory",
      title: "Global Error524 smishing campaign targeting Bangladesh",
      listingUrl: "https://cirt.gov.bd/advisories/global-campaign-targeting-bd",
      kind: "cyber_advisory"
    },
    {
      id: "cirt-alerts",
      agency: "BGD e-GOV CIRT — alerts",
      title: "BGD e-GOV CIRT — Security Alerts",
      listingUrl: "https://cirt.gov.bd/alerts",
      kind: "cyber_advisory"
    }
  ],
  commerce: [
    {
      id: "scamcheck-common-scams",
      agency: "Government of Bangladesh — ScamCheck",
      title: "Common Scams in Bangladesh",
      listingUrl: "https://scamcheck.gov.bd/common-scams-in-bangladesh/",
      kind: "official_guidance"
    },
    {
      id: "cirt-smishing",
      agency: "BGD e-GOV CIRT — cybersecurity advisory",
      title: "Global Error524 smishing campaign targeting Bangladesh",
      listingUrl: "https://cirt.gov.bd/advisories/global-campaign-targeting-bd",
      kind: "cyber_advisory"
    }
  ],
  investment: [
    {
      id: "bfiu-circulars",
      agency: "Bangladesh Financial Intelligence Unit (BFIU)",
      title: "BFIU — official circulars",
      listingUrl: "https://bfiu.org.bd/index.php/legislation/circular",
      kind: "government_listing"
    },
    {
      id: "bangladesh-bank-ict-alerts",
      agency: "Bangladesh Bank — ICT Security Advisories & Alerts",
      title: "Bangladesh Bank — ICT Security Advisories & Alerts",
      listingUrl: "https://www.bb.org.bd/en/index.php/about/secalrt",
      kind: "cyber_advisory"
    },
    {
      id: "scamcheck-common-scams",
      agency: "Government of Bangladesh — ScamCheck",
      title: "Common Scams in Bangladesh",
      listingUrl: "https://scamcheck.gov.bd/common-scams-in-bangladesh/",
      kind: "official_guidance"
    }
  ]
};

const SEARCH_CATEGORY_LABELS = {
  education: "education, scholarship and stipend",
  jobs: "government recruitment and jobs",
  mobile_money: "mobile financial services",
  banking: "banking and financial security",
  cybersecurity: "cybersecurity and scam advisories",
  courier: "courier and delivery",
  telecom: "telecommunications and SMS security",
  commerce: "online shopping and marketplace safety",
  investment: "investment, loans and financial notices"
};

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
  { pattern: /\b(scholarship|scholarships|stipend|fellowship)\b|বৃত্তি|উপবৃত্তি|ফেলোশিপ/i, words: ["scholarship", "stipend", "fellowship", "government", "education", "academic", "student", "বৃত্তি", "উপবৃত্তি"] },
  { pattern: /\b(grant|allowance|financial assistance|benefit|subsidy)\b|অনুদান|ভাতা|আর্থিক সহায়তা|আর্থিক সহায়তা/i, words: ["grant", "allowance", "benefit", "government", "education", "student", "অনুদান", "ভাতা"] },
  { pattern: /\b(job|jobs|recruitment|vacancy|hiring|employment|cv|resume|interview)\b|চাকরি|নিয়োগ|নিয়োগ|সিভি|নিয়োগ বিজ্ঞপ্তি/i, words: ["job", "jobs", "recruitment", "vacancy", "government", "teacher", "চাকরি", "নিয়োগ", "নিয়োগ"] },
  { pattern: /\b(bkash|b-kash|nagad|rocket|upay|mobile banking|mobile financial|mfs|cash[- ]in|cash[- ]out)\b|বিকাশ|নগদ|রকেট|উপায়|মোবাইল ব্যাংকিং/i, words: ["bkash", "nagad", "rocket", "upay", "mobile", "banking", "mfs", "otp", "pin", "বিকাশ", "নগদ", "রকেট"] },
  { pattern: /\b(bank|banking|bank account|debit card|credit card|loan|remittance|financial institution)\b|ব্যাংক|ব্যাংকিং|ঋণ|কার্ড|রেমিট্যান্স/i, words: ["bank", "banking", "account", "financial", "security", "fraud", "ব্যাংক", "ঋণ"] },
  { pattern: /\b(otp|one[- ]time password|pin|password|phishing|smishing|scam|fraud|fake link|verify your account)\b|ওটিপি|পিন|পাসওয়ার্ড|প্রতারণা|জাল লিংক/i, words: ["otp", "pin", "password", "phishing", "smishing", "scam", "fraud", "security", "cyber", "ওটিপি", "পিন", "প্রতারণা"] },
  { pattern: /\b(courier|parcel|delivery|tracking|shipment|customs fee)\b|কুরিয়ার|পার্সেল|ডেলিভারি|ট্র্যাকিং/i, words: ["courier", "parcel", "delivery", "tracking", "shipment", "fraud", "কুরিয়ার", "পার্সেল"] },
  { pattern: /\b(sim card|sim registration|mobile operator|telecom|recharge|mobile number)\b|সিম|মোবাইল অপারেটর|রিচার্জ|টেলিকম/i, words: ["sim", "mobile", "telecom", "operator", "registration", "recharge", "সিম", "রিচার্জ"] },
  { pattern: /\b(online shopping|marketplace|e-commerce|order|refund|seller|buyer|advance payment)\b|অনলাইন শপিং|মার্কেটপ্লেস|অর্ডার|রিফান্ড|বিক্রেতা/i, words: ["shopping", "marketplace", "e-commerce", "order", "refund", "seller", "buyer", "advance", "অনলাইন", "অর্ডার"] },
  { pattern: /\b(investment|invest|profit|return|ponzi|crypto|loan|interest)\b|বিনিয়োগ|বিনিয়োগ|লাভ|মুনাফা|ঋণ/i, words: ["investment", "invest", "profit", "return", "ponzi", "financial", "বিনিয়োগ", "লাভ"] },
  { pattern: /\b(education|university|student|study|academic|school|college|teacher)\b|শিক্ষা|বিশ্ববিদ্যালয়|বিশ্ববিদ্যালয়|শিক্ষার্থী/i, words: ["education", "university", "student", "study", "academic", "school", "college", "শিক্ষা", "বিশ্ববিদ্যালয়", "শিক্ষার্থী"] }
];;

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
      && !url.username && !url.password
      && !url.port;
  } catch {
    return false;
  }
}

export function isAllowedSourceUrl(candidate, expectedUrl) {
  try {
    const url = new URL(candidate);
    const expected = new URL(expectedUrl);
    return url.protocol === "https:"
      && url.hostname === expected.hostname
      && !url.username && !url.password
      && !url.port;
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
      if (isAllowedSourceUrl(url.href, baseUrl)) links.push({ url: url.href, label: htmlToText(match[2]) });
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

export function isEducationClaim(query) {
  return /\b(scholarship|stipend|fellowship|grant|education|university|student|study|academic|school|college|teacher)\b|বৃত্তি|উপবৃত্তি|ফেলোশিপ|অনুদান|শিক্ষা|বিশ্ববিদ্যালয়|বিশ্ববিদ্যালয়|শিক্ষার্থী|শিক্ষক/i.test(query);
}

export function detectSearchCategories(query) {
  const value = String(query || "").slice(0, 4_000);
  const has = pattern => pattern.test(value);
  const categories = [];

  if (isEducationClaim(value)) categories.push("education");

  const jobClaim = has(/\b(job|jobs|recruitment|vacancy|hiring|employment|cv|resume|interview|job offer|job circular)\b|চাকরি|নিয়োগ|নিয়োগ|সিভি/i);
  const governmentJob = has(/\b(government|govt|public service|bpsc|teletalk|government job)\b|সরকারি|বিসিএস|টেলিটক/i);
  if (jobClaim && !categories.includes("education")) categories.push("jobs");

  const mobileMoney = has(/\b(bkash|b-kash|nagad|rocket|upay|mfs|mobile financial|mobile banking|cash[- ]in|cash[- ]out|wallet transaction)\b|বিকাশ|নগদ|রকেট|উপায়|উপায়|মোবাইল ব্যাংকিং|ক্যাশ.?ইন|ক্যাশ.?আউট/i);
  if (mobileMoney) categories.push("mobile_money");

  const banking = has(/\b(bank|banking|bank account|debit card|credit card|loan|remittance|wire transfer|financial institution|account statement)\b|ব্যাংক|ব্যাংকিং|ঋণ|রেমিট্যান্স|কার্ড|হিসাব বিবরণী/i);
  if (banking && !mobileMoney) categories.push("banking");

  const courier = has(/\b(courier|parcel|delivery|tracking number|shipment|customs fee|customs charge)\b|কুরিয়ার|কুরিয়ার|পার্সেল|ডেলিভারি|ট্র্যাকিং|চালান/i);
  if (courier) categories.push("courier");

  const telecom = has(/\b(sim card|sim registration|mobile operator|telecom|recharge|mobile number|phone number|network provider)\b|সিম|মোবাইল অপারেটর|রিচার্জ|টেলিকম|নম্বর বন্ধ/i);
  if (telecom) categories.push("telecom");

  const commerce = has(/\b(online shopping|marketplace|e-commerce|order|refund|seller|buyer|advance payment|product delivery)\b|অনলাইন শপিং|মার্কেটপ্লেস|অর্ডার|রিফান্ড|বিক্রেতা|ক্রেতা/i);
  if (commerce) categories.push("commerce");

  const investment = has(/\b(investment|invest|profit|guaranteed return|ponzi|crypto|loan offer|double your money)\b|বিনিয়োগ|বিনিয়োগ|মুনাফা|লাভের নিশ্চয়তা|লাভের নিশ্চয়তা|টাকা দ্বিগুণ/i);
  if (investment) categories.push("investment");

  const prizeFeeClaim = has(/\b(prize|winner|lottery|reward|claim)\b|পুরস্কার|লটারি|বিজয়ী/i) && has(/\b(fee|charge|pay|payment|send money|process(?:ing)?)\b|ফি|টাকা পাঠান|পেমেন্ট/i);
  const cyberRisk = prizeFeeClaim || has(/\b(otp|one[- ]time password|verification code|pin|password|phishing|smishing|scam|fraud|fake link|suspicious link|verify your account|account blocked|account suspended|remote access|screen sharing|impersonat(?:e|ing|ion)|facebook|whatsapp|instagram|social media account)\b|ওটিপি|পিন|পাসওয়ার্ড|পাসওয়ার্ড|ফিশিং|স্মিশিং|প্রতারণা|জাল লিংক|অ্যাকাউন্ট বন্ধ|স্ক্রিন শেয়ার|স্ক্রিন শেয়ার/i);
  if (cyberRisk || (jobClaim && !governmentJob)) categories.push("cybersecurity");

  return [...new Set(categories)].slice(0, 3);
}

export function isOfficialSourceSearchApplicable(query) {
  return detectSearchCategories(query).length > 0;
}

function searchPlan(query) {
  const categories = detectSearchCategories(query);
  const governmentJob = /\b(government|govt|public service|bpsc|teletalk|government job)\b|সরকারি|বিসিএস|টেলিটক/i.test(query);
  const selected = [];
  for (const category of categories) {
    for (const source of SOURCE_GROUPS[category] || []) {
      if (category === "jobs" && source.id === "teletalk-jobs" && !governmentJob) continue;
      selected.push({ ...source, category });
    }
  }
  const unique = [];
  const seen = new Set();
  for (const source of selected) {
    if (seen.has(source.id)) continue;
    seen.add(source.id);
    unique.push(source);
  }
  return {
    categories,
    sources: unique.slice(0, categories.includes("education") ? 3 : 4),
    governmentJob
  };
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
    return { status: "search_unavailable", summary_bn: "কিছু বা সব official source-এ সংযোগ করা যায়নি। অনুসন্ধান অসম্পূর্ণ; দাবিটি এখনো যাচাই করা যায়নি।", summary_en: "Some or all official sources could not be reached. The search is incomplete and the claim remains unverified." };
  }
  const listingMatches = sources.filter(source => source.evidenceType === "government_listing_match");
  if (!listingMatches.length) {
    return {
      status: sources.length || searchStatus === "guidance_only" || searchStatus === "partial_guidance" ? "contextual_guidance" : "no_matching_notice_found",
      summary_bn: sources.length
        ? "নিরাপত্তা-সংক্রান্ত official guidance পাওয়া গেছে; এটি এই নির্দিষ্ট বার্তা বা প্রেরকের সত্যতা যাচাই করে না।"
        : "পরীক্ষা করা official উৎসে মিলে যাওয়া কোনো notice পাওয়া যায়নি। এতে দাবিটি মিথ্যা প্রমাণ হয় না।",
      summary_en: sources.length
        ? "Official safety guidance was found. It does not authenticate this specific message or sender."
        : "No matching notice was found in the official sources checked. This does not prove the claim is false."
    };
  }
  const requestedAmounts = amounts(query);
  const foundAmounts = amounts(listingMatches[0].title);
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
      headers: { "Accept": "text/html,application/xhtml+xml", "User-Agent": "SHONKET-AI-Official-Source-Search/1.0" }
    });
    if (!response.ok || response.status >= 300) throw new Error("Official source returned HTTP " + response.status);
    if (response.url && !isAllowedSourceUrl(response.url, portal.listingUrl)) {
      throw new Error("Official source redirected outside the allowlist.");
    }
    const contentType = response.headers?.get?.("content-type") || "";
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error("Official source did not return HTML.");
    const html = await response.text();
    return html.slice(0, 1_500_000);
  } finally {
    clearTimeout(timer);
  }
}

function excerptAroundTerms(text, queryTerms) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const lower = clean.toLocaleLowerCase();
  let best = -1;
  for (const term of queryTerms) {
    if (term.length < 3) continue;
    const index = lower.indexOf(term.toLocaleLowerCase());
    if (index >= 0 && (best < 0 || index < best)) best = index;
  }
  if (best < 0) return clean.slice(0, 260);
  const start = Math.max(0, best - 90);
  return (start ? "…" : "") + clean.slice(start, Math.min(clean.length, start + 300)) + (start + 300 < clean.length ? "…" : "");
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
  const plan = searchPlan(rawQuery);

  if (!rawQuery || !plan.categories.length || !terms.length) {
    return {
      status: "not_applicable",
      category: [],
      scope: "No supported official-source category matched this message.",
      searchedAt: new Date().toISOString(),
      searchedPortals: [],
      sources: [],
      evidenceAssessment: compareEvidence(rawQuery, [], "not_applicable"),
      summary_bn: "এই বার্তার সঙ্গে মেলে এমন কোনো official-source category পাওয়া যায়নি।",
      summary_en: "No supported official-source category matched this message."
    };
  }

  const key = plan.categories.join(",") + "|" + tokens(rawQuery).sort().join("|");
  const existing = cache.get(key);
  if (existing && Date.now() - existing.at < CACHE_TTL_MS) return { ...existing.result, cached: true };

  const outcomes = await Promise.allSettled(plan.sources.map(async source => ({
    source, html: await fetchListing(source, fetchImpl)
  })));

  const searchedPortals = [];
  const listingRecords = [];
  const guidanceSources = [];
  let failedPortalCount = 0;

  for (const outcome of outcomes) {
    if (outcome.status !== "fulfilled") {
      failedPortalCount += 1;
      continue;
    }

    const { source, html } = outcome.value;
    searchedPortals.push({
      agency: source.agency,
      listingUrl: source.listingUrl,
      category: source.category,
      evidenceType: source.kind === "government_listing" || source.kind === "recruitment_listing"
        ? "government_listing" : "official_safety_guidance"
    });

    const rows = (source.kind === "government_listing" || source.kind === "recruitment_listing")
      ? parseListingRows(html, source)
      : [];
    if (rows.length) listingRecords.push(...rows.map(record => ({ ...record, category: source.category })));
    if (!rows.length && source.kind === "recruitment_listing") {
      const pageText = htmlToText(html);
      guidanceSources.push({
        id: source.id,
        agency: source.agency,
        title: source.title,
        url: source.listingUrl,
        listingUrl: source.listingUrl,
        publishedDate: null,
        publishedDateISO: null,
        matchedTerms: terms.filter(term => new Set(tokens(pageText)).has(term)).slice(0, 8),
        relevanceScore: 0,
        evidenceType: "official_listing_context",
        evidenceTypeLabel_en: "OFFICIAL RECRUITMENT LISTING",
        evidenceTypeLabel_bn: "সরকারি নিয়োগ তালিকা",
        detailFetched: true,
        excerpt: "The official recruitment listing was reached, but no specific notice could be confidently matched to this message. Open the listing and verify the exact job circular."
      });
    }

    if (source.kind === "official_guidance" || source.kind === "cyber_advisory") {
      const pageText = htmlToText(html);
      const pageTokens = new Set(tokens(pageText));
      const matchedTerms = terms.filter(term => pageTokens.has(term)).slice(0, 8);
      guidanceSources.push({
        id: source.id,
        agency: source.agency,
        title: source.title,
        url: source.listingUrl,
        listingUrl: source.listingUrl,
        publishedDate: null,
        publishedDateISO: null,
        matchedTerms,
        relevanceScore: matchedTerms.length,
        evidenceType: "official_safety_guidance",
        evidenceTypeLabel_en: source.kind === "cyber_advisory" ? "OFFICIAL CYBERSECURITY ADVISORY" : "OFFICIAL SAFETY GUIDANCE",
        evidenceTypeLabel_bn: source.kind === "cyber_advisory" ? "সরকারি সাইবার নিরাপত্তা সতর্কতা" : "প্রাতিষ্ঠানিক নিরাপত্তা নির্দেশনা",
        detailFetched: true,
        excerpt: excerptAroundTerms(pageText, matchedTerms) || "Official safety guidance page retrieved. Review the original page for its full context."
      });
    }
  }

  const matchingListings = listingRecords
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
      evidenceType: "government_listing_match",
      evidenceTypeLabel_en: "MATCHING OFFICIAL NOTICE",
      evidenceTypeLabel_bn: "মিলে যাওয়া সরকারি নোটিশ",
      detailFetched: false,
      excerpt: "This notice title and date were read from the official listing only. Open the original notice and attachments to verify the sender, amount, eligibility, deadline and conditions."
    }));

  const sources = [...matchingListings, ...guidanceSources].slice(0, 6);
  const hasListingMatch = matchingListings.length > 0;
  const hasGuidance = guidanceSources.length > 0;
  const status = hasListingMatch
    ? (failedPortalCount ? "partial_results" : "results_found")
    : hasGuidance
      ? (failedPortalCount ? "partial_guidance" : "guidance_only")
      : searchedPortals.length
        ? (failedPortalCount ? "partial_unavailable" : "no_results") : "unavailable";

  const label = plan.categories.map(category => SEARCH_CATEGORY_LABELS[category]).filter(Boolean).join(", ");
  const scopeNote_en = "Search checked selected Bangladesh official or institutional sources for " + label + ". Coverage is limited to these sources and is not a whole-web search.";
  const scopeNote_bn = "এই অনুসন্ধানে " + label + " বিষয়ে নির্বাচিত বাংলাদেশি সরকারি/প্রাতিষ্ঠানিক উৎস পরীক্ষা করা হয়েছে। উৎসের পরিধি সীমিত; এটি পুরো ওয়েবে অনুসন্ধান নয়।";
  const evidenceAssessment = compareEvidence(rawQuery, matchingListings, status);
  const result = {
    status,
    category: plan.categories,
    scope: label,
    scopeNote_en,
    scopeNote_bn,
    searchedAt: new Date().toISOString(),
    searchedPortals,
    failedPortalCount,
    sources,
    evidenceAssessment,
    summary_bn: hasListingMatch
      ? "মেসেজের সঙ্গে সম্পর্কিত সরকারি নোটিশ পাওয়া গেছে। শিরোনাম মিলে গেলেও প্রেরক, লিংক, অর্থের পরিমাণ বা সব শর্ত যাচাই হয় না।"
      : hasGuidance
        ? "প্রাসঙ্গিক official safety guidance পাওয়া গেছে; তবে এই নির্দিষ্ট মেসেজ, প্রেরক বা দাবির সঙ্গে মিলে যাওয়া কোনো সরকারি নোটিশ নিশ্চিত করা যায়নি।"
        : searchedPortals.length
          ? "পরীক্ষা করা official source-গুলোতে মেসেজটির সঙ্গে মিলে যাওয়া কোনো notice পাওয়া যায়নি। এতে দাবিটি মিথ্যা প্রমাণ হয় না।"
          : "এই মুহূর্তে প্রাসঙ্গিক official source-এ সংযোগ করা যায়নি। পরে আবার চেষ্টা করুন।",
    summary_en: hasListingMatch
      ? "Related official notice listings were found. A matching title does not verify the sender, link, amount, or every condition."
      : hasGuidance
        ? "Relevant official safety guidance was retrieved, but no government notice matching this specific message or claim was confirmed."
        : searchedPortals.length
          ? "No notice matching this message was found in the official sources checked. This does not prove the claim is false."
          : "Relevant official sources could not be reached right now. Try again later."
  };

  cache.set(key, { at: Date.now(), result });
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return result;
}
