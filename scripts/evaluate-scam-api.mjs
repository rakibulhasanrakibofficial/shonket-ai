import fs from "node:fs";

const endpoint = process.env.SHONKET_API_URL;
if (!endpoint) {
  console.error("Set SHONKET_API_URL, e.g. https://your-domain.vercel.app/api/analyze");
  process.exit(1);
}
const cases = JSON.parse(fs.readFileSync(new URL("../tests/scam-evaluation-cases.json", import.meta.url), "utf8"));
const totals = { relevant: 0, relevantCorrect: 0, outOfScope: 0, outOfScopeCorrect: 0, verdictChecked: 0, verdictCorrect: 0, errors: 0 };
const rows = [];

for (const sample of cases) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: sample.text, language: "en" })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("HTTP " + response.status + ": " + (data.error || "request failed"));
    const relevant = data.isRelevant !== false && data.verdict !== "out_of_scope";
    const relevancePass = relevant === sample.relevant;
    if (sample.relevant) {
      totals.relevant++;
      if (relevancePass) totals.relevantCorrect++;
      if (sample.expected.length) {
        totals.verdictChecked++;
        if (sample.expected.includes(data.verdict)) totals.verdictCorrect++;
      }
    } else {
      totals.outOfScope++;
      if (relevancePass) totals.outOfScopeCorrect++;
    }
    rows.push({ id: sample.id, expected: sample.relevant ? sample.expected.join("/") : "out_of_scope", actual: data.verdict || "missing", pass: relevancePass && (!sample.relevant || sample.expected.includes(data.verdict)) });
  } catch (error) {
    totals.errors++;
    rows.push({ id: sample.id, actual: "ERROR", pass: false, error: error.message });
  }
}

console.table(rows);
const pct = (n, d) => d ? (100 * n / d).toFixed(1) + "%" : "n/a";
console.log("\nEvaluation summary");
console.log("Relevant-message detection:", pct(totals.relevantCorrect, totals.relevant));
console.log("Out-of-scope rejection:", pct(totals.outOfScopeCorrect, totals.outOfScope));
console.log("Expected verdict agreement:", pct(totals.verdictCorrect, totals.verdictChecked));
console.log("Request errors:", totals.errors);
console.log("\nThis is a small synthetic smoke test, not a scientific accuracy benchmark. Review every failure manually.");
if (totals.errors || totals.relevantCorrect !== totals.relevant || totals.outOfScopeCorrect !== totals.outOfScope) process.exitCode = 1;
