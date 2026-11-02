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
