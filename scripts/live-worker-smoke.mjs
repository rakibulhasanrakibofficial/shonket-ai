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
if (health.aiBindingConfigured !== true || health.rateLimitConfigured !== true) {
  throw new Error("Worker is missing its AI or rate-limit binding.");
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
if (analysis.aiAnalysis?.status !== "ready") {
  const code = String(analysis.aiAnalysis?.diagnosticCode || "AI_NOT_READY");
  throw new Error("Rule engine is online, but live AI inference is not ready (" + code + ").");
}
if (!String(analysis.aiAnalysis.explanation_en || "").trim()) {
  throw new Error("The AI returned an empty English explanation.");
}

console.log("Worker health: OK");
console.log("AI binding: configured");
console.log("Rate limiter: configured");
console.log("Rule engine: " + analysis.verdict + " · risk " + analysis.riskScore + "/100");
console.log("Live Workers AI: ACTIVE");
console.log("Explanation received: " + analysis.aiAnalysis.explanation_en.slice(0, 220));
