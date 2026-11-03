import test from "node:test";
import assert from "node:assert/strict";
import { buildFastAssessment } from "../api/fastAssessment.js";
import { extractGroundingSources, classifyGroundingFailure } from "../api/analyze.js";

test("cash prize plus processing fee returns an instant suspicious assessment", () => {
  const text = "Congratulations! You have won a cash prize. Send a small processing fee now to claim your reward.";
  const result = buildFastAssessment(text, "en", {
    score: 52,
    matched: ["Upfront payment request", "Unexpected prize or reward"]
  });

  assert.ok(result);
  assert.equal(result.verdict, "suspicious");
  assert.equal(result.riskScore, 52);
  assert.equal(result.engine, "Rule-based");
  assert.equal(result.webEvidence.searched, false);
  assert.equal(result.claimVerification.status, "not_applicable");
  assert.match(result.summary_en, /upfront processing fee/i);
});

test("a prize announcement without an upfront-fee request returns an unverified result", () => {
  const text = "Congratulations! You have won a cash prize.";
  const result = buildFastAssessment(text, "en", { score: 22, matched: ["Unexpected prize or reward"] });
  assert.ok(result);
  assert.equal(result.verdict, "uncertain");
  assert.equal(result.claimVerification.status, "unverified");
  assert.equal(result.engine, "Rule-based");
});

test("a normal processing-fee message without a prize claim still uses Gemini", () => {
  const text = "Your application processing fee is due.";
  assert.equal(buildFastAssessment(text, "en", { score: 30, matched: ["Upfront payment request"] }), null);
});

test("Bangla prize and advance-fee wording returns Bangla guidance", () => {
  const text = "আপনি নগদ পুরস্কার জিতেছেন। পুরস্কার পেতে আগে প্রসেসিং ফি পাঠান।";
  const result = buildFastAssessment(text, "bn", { score: 52, matched: ["Upfront payment request", "Unexpected prize or reward"] });

  assert.ok(result);
  assert.equal(result.responseLanguage, "bn");
  assert.match(result.summary_bn, /প্রসেসিং ফি/);
  assert.match(result.safe_actions[0], /ফি পাঠাবেন না/);
});


test("anti-scam warning about prize fees is classified as low-risk informational content", () => {
  const text = "This is a scam. Never pay a processing fee to claim a cash prize. Fraudsters use this trick.";
  const result = buildFastAssessment(text, "en", {
    score: 52,
    matched: ["Upfront payment request", "Unexpected prize or reward"]
  });
  assert.ok(result);
  assert.equal(result.verdict, "likely_safe");
  assert.equal(result.riskScore, 0);
  assert.deepEqual(result.matchedSignals, []);
});

test("Banglish prize plus fee wording triggers the instant path", () => {
  const text = "Apni prize jitsen, reward pete age processing fee pathan.";
  const result = buildFastAssessment(text, "bn", {
    score: 30,
    matched: ["Unexpected prize or reward", "Upfront payment request"]
  });
  assert.ok(result);
  assert.equal(result.verdict, "suspicious");
  assert.equal(result.responseLanguage, "bn");
  assert.equal(result.engine, "Rule-based");
});


test("urgent OTP harvesting request uses the instant warning path", () => {
  const text = "Your bank account will be blocked today. Reply with your OTP to keep it active.";
  const result = buildFastAssessment(text, "en", { score: 48, matched: ["Credential or OTP request", "Possible authority impersonation", "Urgency or pressure"] });
  assert.ok(result);
  assert.equal(result.verdict, "suspicious");
  assert.equal(result.engine, "Rule-based");
  assert.match(result.summary_en, /OTP or PIN/i);
});

test("a reminder never to share an OTP is classified as low-risk advice", () => {
  const text = "Your bank will never ask for your OTP. Never share your PIN or password with anyone.";
  const result = buildFastAssessment(text, "en", { score: 0, matched: [] });
  assert.ok(result);
  assert.equal(result.verdict, "likely_safe");
  assert.equal(result.riskScore, 0);
});

test("urgent account verification link uses the instant phishing warning path", () => {
  const text = "Your account is suspended. Click here to verify your account immediately: http://example.invalid/login";
  const result = buildFastAssessment(text, "en", { score: 42, matched: ["Urgency or pressure", "Link or verification prompt"] });
  assert.ok(result);
  assert.equal(result.verdict, "suspicious");
  assert.equal(result.engine, "Rule-based");
  assert.match(result.summary_en, /phishing/i);
});


test("a prize claim without fees or urgent links is returned as unverified, not scam", () => {
  const text = "Congratulations! You have won a cash prize. Contact the official office to learn more.";
  const result = buildFastAssessment(text, "en", { score: 22, matched: ["Unexpected prize or reward"] });
  assert.ok(result);
  assert.equal(result.verdict, "uncertain");
  assert.equal(result.riskScore, 22);
  assert.equal(result.claimVerification.status, "unverified");
  assert.equal(result.confidence, "low");
});

test("a prize claim with urgency is not treated as a safe prize-only case", () => {
  const text = "You have won a cash prize. Act now, the offer expires today.";
  assert.equal(buildFastAssessment(text, "en", { score: 40, matched: ["Unexpected prize or reward", "Urgency or pressure"] }), null);
});


test("Google Search redirect chunks retain an exact government publisher domain", () => {
  const result = extractGroundingSources({
    groundingChunks: [
      { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/example", title: "dshe.gov.bd" } }
    ]
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].domain, "dshe.gov.bd");
  assert.equal(result[0].sourceType, "government");
  assert.equal(result[0].officialDomain, true);
});

test("publisher titles are not mined for domains embedded in arbitrary page-title text", () => {
  const result = extractGroundingSources({
    groundingChunks: [
      { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/example", title: "Fake notice mentions example.gov.bd but is not hosted there" } }
    ]
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].domain, "publisher domain unavailable");
  assert.equal(result[0].officialDomain, false);
});

test("direct HTTPS publisher URLs are classified by their actual hostname", () => {
  const result = extractGroundingSources({
    groundingChunks: [
      { web: { uri: "https://scholarship.education.gov.bd/notices/2026", title: "Scholarship notice" } }
    ]
  });
  assert.equal(result[0].domain, "scholarship.education.gov.bd");
  assert.equal(result[0].sourceType, "government");
});

test("non-HTTPS and invalid grounding source URLs are ignored", () => {
  const result = extractGroundingSources({
    groundingChunks: [
      { web: { uri: "http://example.gov.bd/notice", title: "example.gov.bd" } },
      { web: { uri: "not a URL", title: "example.gov.bd" } }
    ]
  });
  assert.deepEqual(result, []);
});

test("grounding failure classifier distinguishes quota, permission, and schema errors", () => {
  assert.equal(classifyGroundingFailure(429, "generate_content_search_request quota exceeded"), "search_quota");
  assert.equal(classifyGroundingFailure(403, "Google Search grounding is not enabled for this project"), "search_tool_rejected");
  assert.equal(classifyGroundingFailure(400, "Invalid responseSchema: unsupported property"), null);
  assert.equal(classifyGroundingFailure(429, "Model output token quota exceeded"), null);
  assert.equal(classifyGroundingFailure(null, "", "timeout"), "timeout");
  assert.equal(classifyGroundingFailure(503, "This model is currently experiencing high demand"), null);
  assert.equal(classifyGroundingFailure(503, "Google Search grounding service is unavailable"), "search_service_unavailable");
});
