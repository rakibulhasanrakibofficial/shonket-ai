export const KNOWLEDGE_BASE = [
  {
    id: "bkash-fraud-awareness",
    title: "bKash — Fraud Awareness",
    url: "https://www.bkash.com/bn/page/fraud-awareness",
    sourceDate: null,
    summary: "bKash says a mobile-account PIN and the six-digit SMS verification code (OTP) are private. Financial institutions do not call customers to ask for these secrets. Do not dial codes or follow transaction instructions while on an unexpected call.",
    retrievalGate: /\b(?:b[\s-]?kash)\b|বিকাশ/i,
    keywords: ["bkash", "mobile wallet", "mfs", "otp", "pin", "verification code", "sms", "call", "phone", "dial", "payment", "transaction", "secret", "code"]
  },
  {
    id: "bkash-security-tips",
    title: "bKash — Security Tips",
    url: "https://www.bkash.com/index.php/en/page/security-tips",
    sourceDate: null,
    summary: "bKash advises customers never to share a PIN, secret code, or security code. It advises people not to respond to unexpected lottery, prize, or competition communications and to verify such calls or SMS through its official helpline 16247.",
    retrievalGate: /\b(?:b[\s-]?kash)\b|বিকাশ/i,
    keywords: ["bkash", "pin", "secret code", "security code", "lottery", "prize", "competition", "winner", "cash prize", "reward", "sms", "helpline", "16247"]
  },
  {
    id: "bgd-cirt-error524",
    title: "BGD e-GOV CIRT — Global Error524 Smishing Campaign",
    url: "https://www.cirt.gov.bd/advisories/global-campaign-targeting-bd",
    sourceDate: "2026-04-13",
    summary: "BGD e-GOV CIRT reported an SMS-phishing campaign targeting several sectors, including Bangladesh. The advisory describes message links that redirect to phishing websites designed to steal personal information, banking credentials, and payment-card data.",
    retrievalGate: /\b(?:phishing|phish|smishing|smish|malicious link|fake link|suspicious link)\b|ফিশিং|স্মিশিং|জাল লিংক/i,
    keywords: ["cirt", "smishing", "sms", "phishing", "link", "url", "credential", "banking", "payment", "card", "personal information", "bangladesh", "delivery", "telecom", "government"]
  },
  {
    id: "scamcheck-common-scams",
    title: "Government of Bangladesh — ScamCheck: Common Scams in Bangladesh",
    url: "https://scamcheck.gov.bd/common-scams-in-bangladesh/",
    sourceDate: "2025-01-11",
    summary: "ScamCheck identifies lottery and prize messages that demand a fee or sensitive details to claim winnings as a common scam pattern. It also warns that fake job offers may request upfront registration, training, or visa-processing payments.",
    keywords: ["scamcheck", "common scams", "lottery", "prize", "cash prize", "winner", "reward", "claim", "fee", "processing fee", "pay", "upfront", "advance payment", "sensitive details", "fake job", "job offer", "registration", "training", "visa processing"]
  },
  {
    id: "scamcheck-victim-support",
    title: "Government of Bangladesh — ScamCheck: Victim of a Scam",
    url: "https://scamcheck.gov.bd/victim-of-a-scam/",
    sourceDate: null,
    summary: "ScamCheck advises people who have lost money or personal information to contact their bank immediately, file a police report, notify affected contacts, and secure compromised online accounts.",
    retrievalGate: /\b(?:lost money|lost funds|money stolen|money was taken|sent money|already paid|account (?:was )?compromised|compromised account|victim of a scam|report(?:ed)? (?:a )?scam|financial loss)\b|টাকা হারিয়েছি|টাকা হারিয়েছি|টাকা খোয়া গেছে|টাকা খোয়া গেছে|প্রতারণার শিকার/i,
    keywords: ["scamcheck", "government", "victim", "lost money", "payment", "bank", "account", "police", "report", "recover", "fraud", "compromised", "password"]
  }
];

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "to", "of", "for", "from", "on", "in", "at",
  "and", "or", "this", "that", "you", "your", "we", "our", "they", "their", "it", "as",
  "have", "has", "had", "will", "would", "can", "could", "should", "please", "but", "not",
  "what", "when", "where", "who", "which", "how", "do", "does", "did", "be", "been", "being",
  "with", "by", "about", "after", "before", "into", "its", "these", "those",
  "একটি", "এটা", "সেটা", "আপনি", "তুমি", "আমি", "এবং", "কিন্তু", "জন্য", "করে", "হবে", "হয়"
]);

function tokens(value) {
  return [...new Set(
    String(value || "").toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []
  )].filter(token => !STOP_WORDS.has(token));
}

/**
 * Lexical retrieval over a curated, versioned set of official safety pages.
 * Retrieved pages are general guidance, not proof that a particular message is genuine.
 */
export function retrieveKnowledge(message, limit = 3) {
  const messageText = String(message || "");
  const queryTokens = tokens(messageText);
  if (!queryTokens.length) return [];

  return KNOWLEDGE_BASE
    // Brand-specific and incident-specific references must pass their explicit
    // context gate before lexical scoring. Generic keyword overlap alone is
    // not enough to attribute a message to a brand or an unrelated incident.
    .filter(source => !source.retrievalGate || source.retrievalGate.test(messageText))
    .map(source => {
      const searchable = new Set(tokens([source.title, source.summary, ...(source.keywords || [])].join(" ")));
      // Exact token matches avoid treating unrelated substrings (for example,
      // "pay" inside "payment") as evidence that a source is relevant.
      const matched = queryTokens.filter(token => searchable.has(token));
      return { source, score: matched.length, matched };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.source.title.localeCompare(b.source.title))
    .slice(0, Math.max(1, Math.min(5, limit)))
    .map(({ source, score, matched }) => ({
      id: source.id,
      title: source.title,
      url: source.url,
      sourceDate: source.sourceDate,
      summary: source.summary,
      relevanceScore: score,
      matchedTerms: matched.slice(0, 8)
    }));
}
