const SHORTENER_DOMAINS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "rb.gy",
  "rebrand.ly", "lnkd.in", "shorturl.at", "tiny.one", "ow.ly", "buff.ly", "t.ly"
]);

// A compact list of common multi-label public suffixes. This is an estimate,
// not a full Public Suffix List implementation; the UI calls it an estimated
// base domain and never treats it as verified ownership.
const MULTI_LABEL_SUFFIXES = new Set([
  "com.bd", "net.bd", "org.bd", "gov.bd", "edu.bd", "ac.bd",
  "co.uk", "org.uk", "gov.uk", "ac.uk", "sch.uk",
  "com.au", "net.au", "org.au", "edu.au", "gov.au",
  "co.in", "firm.in", "net.in", "org.in", "gen.in", "ind.in",
  "com.sg", "com.my", "com.pk", "com.ng", "com.ph", "com.cn",
  "com.hk", "com.tr", "com.br", "com.mx", "com.za", "co.za",
  "com.ar", "com.co", "com.eg", "com.sa", "com.ae", "com.id",
  "co.id", "or.id", "ac.id", "com.jp", "co.jp", "ne.jp", "or.jp",
  "co.kr", "com.tw", "com.vn", "com.th", "co.nz", "org.nz",
  "govt.nz", "ac.nz", "co.ke", "or.ke", "com.gh", "com.mm",
  "com.kh", "com.la", "co.il", "org.il", "com.ru", "com.ua",
  // Common hosted-app suffixes: the tenant name is part of the base domain.
  "github.io", "pages.dev", "vercel.app", "netlify.app", "workers.dev",
  "web.app", "firebaseapp.com", "appspot.com", "cloudfront.net",
  "herokuapp.com", "onrender.com", "railway.app", "fly.dev",
  "surge.sh", "glitch.me", "repl.co", "azurewebsites.net",
  "cloudflarepages.com", "trycloudflare.com"
]);

const OFFICIAL_BRAND_DOMAINS = {
  bkash: ["bkash.com"],
  nagad: ["nagad.com.bd"],
  rocket: ["dutchbanglabank.com"],
  upay: ["upaybd.com"],
  paypal: ["paypal.com", "paypalobjects.com"],
  google: ["google.com", "google.co.uk", "google.com.bd", "google.co.in", "google.com.au", "google.ca", "google.de", "google.fr", "google.co.jp", "google.co.kr", "google.com.sg", "google.com.my", "google.com.pk", "google.com.ph", "google.com.ng", "google.com.br", "google.com.mx", "google.com.tr", "google.com.hk", "google.com.tw", "google.ae", "google.com.sa", "google.co.za", "googleusercontent.com", "googleapis.com", "gstatic.com"],
  facebook: ["facebook.com", "facebook.net", "fbcdn.net", "fbsbx.com"],
  meta: ["meta.com", "meta.ai"],
  microsoft: ["microsoft.com", "microsoftonline.com"],
  apple: ["apple.com", "icloud.com", "mzstatic.com"],
  amazon: ["amazon.com", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.it", "amazon.es", "amazon.ca", "amazon.in", "amazon.co.jp", "amazon.com.au", "amazon.com.br", "amazon.com.mx", "amazon.com.tr", "amazon.sg", "amazon.com.be", "amazon.nl", "amazon.se", "amazon.pl", "amazon.ae", "amazon.sa", "amazonaws.com", "media-amazon.com", "ssl-images-amazon.com", "amazon-adsystem.com"]
};

const KNOWN_SITES = {
  "google.com": ["Google Search / web services", "Google Search / ওয়েব সার্ভিস"],
  "youtube.com": ["YouTube video-sharing platform", "YouTube ভিডিও শেয়ারিং প্ল্যাটফর্ম"],
  "facebook.com": ["Facebook social network", "Facebook সামাজিক যোগাযোগমাধ্যম"],
  "instagram.com": ["Instagram social network", "Instagram সামাজিক যোগাযোগমাধ্যম"],
  "tiktok.com": ["TikTok short-video platform", "TikTok শর্ট-ভিডিও প্ল্যাটফর্ম"],
  "whatsapp.com": ["WhatsApp messaging service", "WhatsApp মেসেজিং সার্ভিস"],
  "telegram.org": ["Telegram messaging service", "Telegram মেসেজিং সার্ভিস"],
  "github.com": ["GitHub software development platform", "GitHub সফটওয়্যার ডেভেলপমেন্ট প্ল্যাটফর্ম"],
  "microsoft.com": ["Microsoft software and cloud services", "Microsoft সফটওয়্যার ও ক্লাউড সার্ভিস"],
  "apple.com": ["Apple technology and device services", "Apple প্রযুক্তি ও ডিভাইস সার্ভিস"],
  "amazon.com": ["Amazon e-commerce marketplace", "Amazon অনলাইন মার্কেটপ্লেস"],
  "daraz.com.bd": ["Daraz e-commerce marketplace", "Daraz অনলাইন মার্কেটপ্লেস"],
  "bkash.com": ["bKash digital financial service", "bKash ডিজিটাল আর্থিক সেবা"],
  "nagad.com.bd": ["Nagad digital financial service", "Nagad ডিজিটাল আর্থিক সেবা"],
  "paypal.com": ["PayPal online payment service", "PayPal অনলাইন পেমেন্ট সার্ভিস"]
};

const CATEGORY_RULES = [
  { label: "Age-restricted / 18+ category", labelBn: "বয়স-সীমাবদ্ধ / ১৮+ ক্যাটাগরি", suppressPublicSearch: true, test: /(?:\b(adult|18plus|xxx|x-rated|explicit|nsfw|onlyfans|xvideos|xnxx|porn|pornography|sexchat|adultvideo|adultcontent|erotic)\b|(?:^|[^a-z0-9])18\+(?:$|[^a-z0-9])|pornhub|porn[-_]?hub|adult[-_]?site|adult[-_]?video)/i },
  { label: "Dating or relationship service", labelBn: "ডেটিং বা সম্পর্কের সার্ভিস", test: /\b(dating|matchmaking|singles|romance|meet-?up)\b/i },
  { label: "Gambling, casino or betting", labelBn: "জুয়া, ক্যাসিনো বা বেটিং", suppressPublicSearch: true, test: /(?:\b(casino|betting|gambling|sportsbook|slots|wager|jackpot|poker)\b|bet365|betway|1xbet|parimatch|mostbet)/i },
  { label: "Lottery or prize promotion", labelBn: "লটারি বা পুরস্কারের প্রচারণা", test: /\b(lottery|raffle|jackpot|giveaway|prize|winner|claim)\b/i },
  { label: "Banking or digital payment", labelBn: "ব্যাংকিং বা ডিজিটাল পেমেন্ট", test: /\b(bank|banking|payment|wallet|bkash|nagad|rocket|paypal|payoneer)\b/i },
  { label: "Loan or credit service", labelBn: "ঋণ বা ক্রেডিট সার্ভিস", test: /\b(loan|lending|credit|borrow|microfinance|installment)\b/i },
  { label: "Cryptocurrency or trading", labelBn: "ক্রিপ্টোকারেন্সি বা ট্রেডিং", test: /\b(crypto|bitcoin|btc|ethereum|forex|trading|exchange|defi|token)\b/i },
  { label: "Investment or financial service", labelBn: "বিনিয়োগ বা আর্থিক সার্ভিস", test: /\b(invest|investment|returns|profit|fund|portfolio|double-?money)\b/i },
  { label: "Shopping or e-commerce", labelBn: "অনলাইন শপিং বা ই-কমার্স", test: /\b(shop|store|shopping|cart|checkout|marketplace|ecommerce|fashion)\b/i },
  { label: "Social media or messaging", labelBn: "সোশ্যাল মিডিয়া বা মেসেজিং", test: /\b(facebook|instagram|tiktok|youtube|whatsapp|telegram|messenger|discord|social)\b/i },
  { label: "Search engine or web directory", labelBn: "সার্চ ইঞ্জিন বা ওয়েব ডিরেক্টরি", test: /\b(search|searchengine|directory|find)\b/i },
  { label: "Education or e-learning", labelBn: "শিক্ষা বা ই-লার্নিং", test: /\b(education|school|college|university|academy|course|learning|elearning|tutorial)\b/i },
  { label: "News or publishing", labelBn: "সংবাদ বা প্রকাশনা", test: /\b(news|media|newspaper|journal|magazine|press|blog)\b/i },
  { label: "Video, music or streaming", labelBn: "ভিডিও, মিউজিক বা স্ট্রিমিং", test: /\b(video|stream|streaming|movie|cinema|music|podcast)\b/i },
  { label: "Developer tools or code hosting", labelBn: "ডেভেলপার টুলস বা কোড হোস্টিং", test: /\b(developer|devtools|code|repo|repository|git|api|docs)\b/i },
  { label: "Cloud storage or file sharing", labelBn: "ক্লাউড স্টোরেজ বা ফাইল শেয়ারিং", test: /\b(cloud|storage|drive|dropbox|file-?share|transfer)\b/i },
  { label: "Software or application download", labelBn: "সফটওয়্যার বা অ্যাপ ডাউনলোড", test: /\b(download|apk|software|setup|installer|app)\b/i },
  { label: "Government or public service", labelBn: "সরকারি বা জনসেবা", test: /\b(gov|government|portal|publicservice|tax|passport)\b/i },
  { label: "Healthcare or medical service", labelBn: "স্বাস্থ্য বা চিকিৎসাসেবা", test: /\b(health|medical|clinic|hospital|pharmacy|doctor)\b/i },
  { label: "Login or account access", labelBn: "লগইন বা অ্যাকাউন্ট অ্যাক্সেস", test: /\b(login|signin|account|verify|password|auth)\b/i }
];

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || "")).toLowerCase();
  } catch {
    return String(value || "").toLowerCase();
  }
}

function isIpv4(host) {
  const parts = String(host).split(".");
  return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isIpv6(host) {
  return String(host).startsWith("[") && String(host).endsWith("]");
}

function estimatedBaseDomain(host, isIp) {
  if (isIp) return host;
  const labels = host.split(".");
  const suffix = [...MULTI_LABEL_SUFFIXES]
    .filter(item => host === item || host.endsWith("." + item))
    .sort((a, b) => b.length - a.length)[0];
  const suffixLabels = suffix ? suffix.split(".").length : 1;
  return labels.length > suffixLabels
    ? labels.slice(-(suffixLabels + 1)).join(".")
    : host;
}

function validateHostname(host, isIp) {
  if (!host) throw new Error("Enter a complete website domain.");
  if (isIp) return;
  if (!host.includes(".") || host === "localhost" || host.endsWith(".local")) {
    throw new Error("Enter a public website domain, such as example.com.");
  }
  const labels = host.split(".");
  const topLevelLabel = labels[labels.length - 1] || "";
  if (labels.length < 2 || labels.some(label =>
    !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  )) {
    throw new Error("This website address does not contain a valid domain name.");
  }
  if (topLevelLabel.length < 2 || !/[a-z]/i.test(topLevelLabel)) {
    throw new Error("Enter a complete public website domain with a valid ending, such as example.com.");
  }
}

function addSignal(signals, id, label, detail, weight) {
  if (!signals.some(signal => signal.id === id)) {
    signals.push({ id, label, detail, weight });
  }
}

/**
 * Inspect only the URL string. This function never performs network requests.
 * riskScore is a heuristic URL-pattern score, not a probability or a verdict
 * about the site's live content, reputation, ownership, or malware status.
 */
export function inspectUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("Enter a website address first.");
  if (raw.length > 2048) throw new Error("The website address is too long. Use 2,048 characters or fewer.");
  if (/[\u0000-\u001f\u007f\s]/u.test(raw)) {
    throw new Error("Remove spaces or control characters from the website address.");
  }
  if (raw.includes(String.fromCharCode(92))) {
    throw new Error("Backslashes are not valid in a website address. Paste the exact HTTP or HTTPS link.");
  }

  const explicitScheme = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (explicitScheme && !/^https?$/i.test(explicitScheme[1])) {
    throw new Error("Only HTTP and HTTPS website addresses are supported.");
  }

  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
  } catch {
    throw new Error("Enter a valid HTTP or HTTPS website address.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS website addresses are supported.");
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const ipv6 = isIpv6(host);
  const ipv4 = isIpv4(host);
  const isIp = ipv4 || ipv6;
  if (!isIp && /^\d+(?:\.\d+){3}$/.test(host)) {
    throw new Error("This IP address is invalid. Check all four numbers are between 0 and 255.");
  }
  if (!isIp && MULTI_LABEL_SUFFIXES.has(host)) {
    throw new Error("Add the website name before this public suffix.");
  }
  validateHostname(host, isIp);

  const labels = isIp ? [host] : host.split(".");
  const rootDomain = estimatedBaseDomain(host, isIp);
  const hasCredentials = Boolean(parsed.username || parsed.password);
  const punycode = !isIp && labels.some(label => label.startsWith("xn--"));
  const oddPort = Boolean(parsed.port);
  const deepSubdomains = !isIp && labels.length - (rootDomain.split(".").length) > 1;
  const isShortener = SHORTENER_DOMAINS.has(rootDomain);
  const fullPath = [
    safeDecode(parsed.pathname),
    safeDecode(parsed.search.replace(/\+/g, " ")),
    safeDecode(parsed.hash)
  ].join(" ");

  const signals = [];
  const impersonatedBrand = !isIp && Object.keys(OFFICIAL_BRAND_DOMAINS).find(brand => {
    // Match a standalone brand token (or a brand followed by digits), not
    // an arbitrary substring such as "apple" inside "applepie.example".
    const brandToken = new RegExp("(^|-)"+brand+"($|-|[0-9])", "i");
    const appearsInHost = labels.some(label => brandToken.test(label));
    const belongsToOfficialDomainFamily = OFFICIAL_BRAND_DOMAINS[brand].some(officialDomain =>
      rootDomain === officialDomain || rootDomain.endsWith("." + officialDomain)
    );
    return appearsInHost && !belongsToOfficialDomainFamily;
  });

  if (impersonatedBrand) {
    addSignal(
      signals, "brand", "Possible brand impersonation",
      "The hostname contains the brand name " + impersonatedBrand +
        ", but the estimated base domain is " + rootDomain +
        ". This is not the brand's verified official domain.",
      40
    );
  }
  if (/\b(login|log-in|signin|sign-in|verify|verification|secure-account|account-recovery|password-reset|auth)\b/i.test(fullPath)) {
    addSignal(
      signals, "phishing", "Login or verification wording",
      "The URL path or query uses login, verification, or account-recovery wording. Legitimate services can also use these terms; this is only a clue.",
      14
    );
  }
  if (/\b(pay|payment|checkout|billing|wallet|deposit|withdraw|claim-fee|processing-fee)\b/i.test(fullPath)) {
    addSignal(
      signals, "financial", "Payment-related URL wording",
      "The URL includes payment, wallet, billing, or fee-related wording. The wording alone does not prove fraud.",
      18
    );
  }
  if (/\b(invest|investment|profit|returns|trading|crypto|double-money|earn-fast)\b/i.test(fullPath)) {
    addSignal(
      signals, "investment", "Investment or return-related URL wording",
      "The URL includes investment, trading, or unusually high-return wording. Check the organisation independently.",
      20
    );
  }
  if (/\b(otp|pin|password|passcode|nid|national-id|passport|identity|personal-details|bank-details)\b/i.test(fullPath)) {
    addSignal(
      signals, "identity", "Sensitive-information wording",
      "The URL mentions credentials or identity/financial information. Do not enter secrets unless you independently confirm the official domain.",
      24
    );
  }
  if (/\b(subscription|subscribe|trial|renewal|recurring|membership)\b/i.test(fullPath)) {
    addSignal(
      signals, "subscription", "Subscription or renewal wording",
      "The URL uses subscription, trial, or renewal wording. Review terms before entering payment details.",
      12
    );
  }
  if (/\.(apk|exe|msi|bat|cmd|scr|dmg|pkg)(?:$|[?#])/i.test(parsed.pathname)) {
    addSignal(
      signals, "download", "Executable or installer file",
      "The URL appears to point to an executable or installable file. Do not download unexpected files.",
      28
    );
  }
  if (parsed.protocol === "http:") {
    addSignal(
      signals, "insecure_http", "Unencrypted HTTP connection",
      "This address uses HTTP rather than HTTPS. Information sent to the site may not be protected in transit.",
      10
    );
  }
  if (isShortener) {
    addSignal(
      signals, "shortener", "Shortened URL",
      "A URL-shortening service hides the final destination until the link is resolved.",
      15
    );
  }
  if (hasCredentials) {
    addSignal(
      signals, "userinfo", "Embedded URL credentials",
      "The address contains user information before the hostname, a pattern that can disguise the actual destination.",
      25
    );
  }
  if (punycode) {
    addSignal(
      signals, "punycode", "Punycode domain",
      "The domain contains an internationalised hostname label. Check the spelling carefully for lookalike characters.",
      20
    );
  }
  if (isIp) {
    addSignal(
      signals, "ip", "Raw IP address",
      "The URL uses an IP address instead of a conventional registered domain name.",
      18
    );
  }
  if (oddPort) {
    addSignal(
      signals, "port", "Non-standard port",
      "The URL specifies a non-standard port. This is unusual for a public website and should be checked.",
      12
    );
  }
  if (deepSubdomains) {
    addSignal(
      signals, "deep", "Multiple subdomain levels",
      "Several subdomain levels can make the estimated base domain harder to notice.",
      8
    );
  }

  const knownSite = !isIp ? KNOWN_SITES[rootDomain] : null;
  const categoryText = (host + " " + fullPath).toLowerCase();
  const matchedCategory = CATEGORY_RULES.find(rule => rule.test.test(categoryText));
  const linkCategory = impersonatedBrand
    ? "Possible " + impersonatedBrand + " brand impersonation"
    : knownSite
      ? knownSite[0]
      : matchedCategory
        ? matchedCategory.label
        : "Unknown / unclassified destination";
  const linkCategoryBn = impersonatedBrand
    ? "সম্ভাব্য " + impersonatedBrand + " ব্র্যান্ডের ছদ্মবেশ"
    : knownSite
      ? knownSite[1]
      : matchedCategory
        ? matchedCategory.labelBn
        : "অজানা / শ্রেণিবদ্ধ করা যায়নি";
  const categoryMatched = Boolean(impersonatedBrand || knownSite || matchedCategory);
  const categorySource = impersonatedBrand
    ? "Brand-name mismatch against estimated base domain"
    : knownSite
      ? "Known-domain label from a local reference list"
      : matchedCategory
        ? "Keyword hint from the domain or URL wording"
        : "Insufficient URL clues";

  const riskScore = Math.min(100, signals.reduce((total, signal) => total + signal.weight, 0));
  const riskLevel = riskScore >= 70
    ? "high"
    : riskScore >= 35
      ? "medium"
      : riskScore > 0
        ? "low"
        : "no_obvious_signals";

  const checks = [
    {
      label: "Secure connection",
      ok: parsed.protocol === "https:",
      note: parsed.protocol === "https:"
        ? "Uses HTTPS. Encryption does not prove that a website is legitimate."
        : "Uses HTTP. The connection is not protected by HTTPS."
    },
    {
      label: "Shortened address",
      ok: !isShortener,
      note: isShortener
        ? "A shortener hides the final destination."
        : "No recognised URL shortener was detected."
    },
    {
      label: "Address structure",
      ok: !hasCredentials && !punycode && !isIp && !oddPort,
      note: hasCredentials
        ? "The URL contains user information before the hostname."
        : punycode
          ? "The hostname contains Punycode; inspect its spelling carefully."
          : isIp
            ? "The address uses a raw IP instead of a conventional domain."
            : oddPort
              ? "The address uses a non-standard port."
              : "No obvious structural issue was detected."
    },
    {
      label: "Brand-name mismatch",
      ok: !impersonatedBrand,
      note: impersonatedBrand
        ? "The hostname contains " + impersonatedBrand + " but the estimated base domain is " + rootDomain + "."
        : "No known brand-name mismatch was detected."
    },
    {
      label: "Subdomain complexity",
      ok: !deepSubdomains,
      note: deepSubdomains
        ? "Multiple subdomain levels can make the actual base domain harder to notice."
        : "No unusually deep subdomain chain was detected."
    }
  ];

  return {
    host,
    rootDomain,
    protocol: parsed.protocol,
    linkCategory,
    linkCategoryBn,
    categorySource,
    categoryMatched,
    publicSearchRestricted: Boolean(matchedCategory?.suppressPublicSearch),
    restrictedSearchCategory: matchedCategory?.suppressPublicSearch ? matchedCategory.label : "",
    riskScore,
    riskLevel,
    signals,
    checks
  };
}

/**
 * The URL context sent to the explainer is intentionally domain-only.
 * Paths, query strings, fragments, credentials, and tokens remain in-browser.
 * Generic scam keywords are deliberately omitted so message-category search
 * cannot mistake this context for a phishing or payment message.
 */
export function buildUrlReviewContext(result) {
  if (!result || typeof result !== "object" || !result.host) {
    throw new Error("A valid URL inspection result is required.");
  }
  return [
    "URL-only structure review. This is not a message or a claim verification request.",
    "Hostname: " + result.host,
    "Estimated base domain: " + result.rootDomain,
    "Protocol: " + result.protocol,
    "URL category hint: " + result.linkCategory,
    "Local URL-pattern indicators: " + (result.signals.length
      ? result.signals.map(signal => signal.id).join(", ")
      : "none detected"),
    "Explain only the supplied domain and local URL-pattern indicators. If there are no indicators, say so; do not invent risks.",
    "The submitted page was not visited. Do not claim that its content, malware status, reputation, ownership, certificate, or final redirect was verified.",
    "The full URL path, query string, fragment, username, password, and tokens were deliberately kept in the browser.",
    "A separate public web search may retrieve references about the hostname. Those references are shown in the Web Evidence panel and do not verify reputation, ownership, malware status, page content, or safety."
  ].join("\n");
}
