import test from "node:test";
import assert from "node:assert/strict";
import { buildFastAssessment } from "../api/fastAssessment.js";

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

test("a prize announcement without an upfront-fee request still uses Gemini", () => {
  const text = "Congratulations! You have won a cash prize.";
  assert.equal(buildFastAssessment(text, "en", { score: 22, matched: ["Unexpected prize or reward"] }), null);
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


test("anti-scam warning about prize fees does not trigger the instant scam path", () => {
  const text = "This is a scam. Never pay a processing fee to claim a cash prize. Fraudsters use this trick.";
  assert.equal(buildFastAssessment(text, "en", {
    score: 52,
    matched: ["Upfront payment request", "Unexpected prize or reward"]
  }), null);
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
