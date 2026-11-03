export const KNOWLEDGE_BASE = [
  {
    id: "bkash-fraud-awareness",
    title: "bKash — Fraud Awareness",
    url: "https://www.bkash.com/bn/page/fraud-awareness",
    sourceDate: null,
    summary: "bKash says a mobile-account PIN and the six-digit SMS verification code (OTP) are private. Financial institutions do not call customers to ask for these secrets. Do not dial codes or follow transaction instructions while on an unexpected call.",
    keywords: ["bkash", "mobile wallet", "mfs", "otp", "pin", "verification code", "sms", "call", "phone", "dial", "payment", "transaction", "secret", "code"]
  },
  {
    id: "bkash-security-tips",
    title: "bKash — Security Tips",
    url: "https://www.bkash.com/index.php/en/page/security-tips",
    sourceDate: null,
    summary: "bKash advises customers never to share a PIN, secret code, or security code. It advises people not to respond to unexpected lottery, prize, or competition communications and to verify such calls or SMS through its official helpline 16247.",
    keywords: ["bkash", "pin", "secret code", "security code", "lottery", "prize", "competition", "winner", "cash prize", "reward", "sms", "helpline", "16247"]
  },
  {
    id: "bgd-cirt-error524",
    title: "BGD e-GOV CIRT — Global Error524 Smishing Campaign",
    url: "https://www.cirt.gov.bd/advisories/global-campaign-targeting-bd",
    sourceDate: "2026-04-13",
    summary: "BGD e-GOV CIRT reported an SMS-phishing campaign targeting several sectors, including Bangladesh. The advisory describes message links that redirect to phishing websites designed to steal personal information, banking credentials, and payment-card data.",
    keywords: ["cirt", "smishing", "sms", "phishing", "link", "url", "credential", "banking", "payment", "card", "personal information", "bangladesh", "delivery", "telecom", "government"]
  },
  {
    id: "scamcheck-victim-support",
    title: "Government of Bangladesh — ScamCheck: Victim of a Scam",
    url: "https://scamcheck.gov.bd/victim-of-a-scam/",
    sourceDate: null,
    summary: "ScamCheck advises people who have lost money or personal information to contact their bank immediately, file a police report, notify affected contacts, and secure compromised online accounts.",
    keywords: ["scamcheck", "government", "victim", "lost money", "payment", "bank", "account", "police", "report", "recover", "fraud", "compromised", "password"]
  }
];

const STOP_WORDS = new Set([
  "this", "that", "with", "from", "have", "your", "you", "are", "the", "and", "for", "was", "were",
  "but", "not", "what", "when", "where", "will", "would", "can", "could", "should", "please",
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
  const queryTokens = tokens(message);
  if (!queryTokens.length) return [];

  return KNOWLEDGE_BASE
    .map(source => {
      const searchable = tokens([source.title, source.summary, ...(source.keywords || [])].join(" "));
      const matched = queryTokens.filter(token => searchable.includes(token));
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
