const baseUrl = String(
  process.env.SHONKET_WORKER_URL || "https://shonket-ai.rakibhasan212029.workers.dev"
).replace(/\/+$/, "");

const origin = "https://rakibulhasanrakibofficial.github.io";
const timeout = (ms) => AbortSignal.timeout(ms);

async function readJson(response, label) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(label + " returned non-JSON (HTTP " + response.status + ").");
  }
}

const healthResponse = await fetch(baseUrl + "/health", {
  headers: { Accept: "application/json" },
  signal: timeout(15000)
});
const health = await readJson(healthResponse, "Worker health");

if (!healthResponse.ok || health.ok !== true) {
  throw new Error("Worker health check failed (HTTP " + healthResponse.status + ").");
}
if (
  health.aiBindingConfigured !== true ||
  health.rateLimitConfigured !== true ||
  health.officialSearchRateLimitConfigured !== true
) {
  throw new Error("Worker is missing its AI, analysis rate-limit, or official-search rate-limit binding.");
}

const sampleMessage =
  "Congratulations! You won a 50,000 BDT prize. Pay a 500 BDT processing fee today to claim it.";

const analysisResponse = await fetch(baseUrl + "/api/analyze", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: origin
  },
  body: JSON.stringify({
    message: sampleMessage,
    language: "en"
  }),
  signal: timeout(30000)
});
const analysis = await readJson(analysisResponse, "Analysis API");

if (!analysisResponse.ok) {
  throw new Error("Analysis API failed (HTTP " + analysisResponse.status + ").");
}
if (analysis.isRelevant !== true || !analysis.verdict) {
  throw new Error("The rule-based analysis result is missing or irrelevant.");
}
if (!Number.isFinite(Number(analysis.riskScore))) {
  throw new Error("The analysis API did not return a numeric risk score.");
}
if (analysis.verdict !== "suspicious" || Number(analysis.riskScore) < 55) {
  throw new Error(
    "Prize-plus-fee regression: expected suspicious with risk >= 55, received " +
    analysis.verdict + " · risk " + analysis.riskScore + "/100."
  );
}
if (analysis.aiAnalysis?.status !== "ready") {
  const code = String(analysis.aiAnalysis?.diagnosticCode || "AI_NOT_READY");
  throw new Error("Rule engine is online, but live AI inference is not ready (" + code + ").");
}
if (!String(analysis.aiAnalysis.explanation_en || "").trim()) {
  throw new Error("The AI returned an empty English explanation.");
}

if (analysis.officialSearch?.status !== "pending" || analysis.webEvidence?.status !== "pending") {
  throw new Error("Analysis endpoint should return its rule/AI result without waiting for the separate official search.");
}

const officialSearchResponse = await fetch(baseUrl + "/api/official-search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: origin
  },
  body: JSON.stringify({
    message: sampleMessage,
    language: "en"
  }),
  signal: timeout(30000)
});
const officialSearch = await readJson(officialSearchResponse, "Official-source search API");
if (!officialSearchResponse.ok || officialSearch.officialSearch?.status === "pending") {
  throw new Error("The separate official-source search endpoint did not complete successfully.");
}
if (!Array.isArray(officialSearch.officialSearch?.category) ||
    !officialSearch.officialSearch.category.includes("cybersecurity")) {
  throw new Error("Category-aware official-source search did not run for the prize-plus-fee test message.");
}
if (officialSearch.webEvidence?.searchExecuted !== true) {
  throw new Error("The official-source endpoint did not confirm that a live search was executed.");
}

const domainSearchResponse = await fetch(baseUrl + "/api/domain-search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: origin
  },
  body: JSON.stringify({
    hostname: "www.github.com",
    rootDomain: "github.com"
  }),
  signal: timeout(30000)
});
const domainSearch = await readJson(domainSearchResponse, "Domain web-search API");
const domainEvidence = domainSearch.webEvidence;
const validDomainStatuses = ["results_found", "partial_results", "partial_unavailable", "no_results", "unavailable"];
if (
  !domainSearchResponse.ok ||
  !domainEvidence ||
  domainEvidence.searched !== true ||
  domainEvidence.domain !== "github.com" ||
  !validDomainStatuses.includes(domainEvidence.status)
) {
  throw new Error("The live domain-search route did not return a valid evidence state.");
}

console.log("Worker health: OK");
console.log("AI binding: configured");
console.log("Analysis rate limiter: configured");
console.log("Official-search rate limiter: configured");
console.log("Rule engine: " + analysis.verdict + " · risk " + analysis.riskScore + "/100");
console.log("Live Workers AI: ACTIVE");
console.log("Official-source search: " + officialSearch.officialSearch.status + " · " + officialSearch.officialSearch.category.join(", "));
console.log("Official sources checked: " + (officialSearch.officialSearch.searchedPortals || []).length);
console.log("Domain web search: " + domainEvidence.status + " · " + (domainEvidence.provider || "unknown provider") + " · " + domainEvidence.sourceCount + " relevant sources");
console.log("Explanation received: " + analysis.aiAnalysis.explanation_en.slice(0, 220));
