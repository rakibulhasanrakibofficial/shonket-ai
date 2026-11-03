import test from "node:test";
import assert from "node:assert/strict";
import { buildRuleAssessment } from "../api/ruleAssessment.js";

test("a prize claim combined with an upfront fee is suspicious", () => {
  const result = buildRuleAssessment(
    "You have won a cash prize. Pay the processing fee now to release it.",
    "en"
  );
  assert.equal(result.verdict, "suspicious");
  assert.equal(result.engine, "Rule-based");
  assert.equal(result.claimVerification.status, "unverified");
  assert.ok(result.riskScore >= 55);
  assert.match(result.summary_en, /upfront fee/i);
});

test("a job offer combined with a registration fee is suspicious", () => {
  const result = buildRuleAssessment(
    "Guaranteed job offer. Send the registration fee today.",
    "en"
  );
  assert.equal(result.verdict, "suspicious");
  assert.ok(result.matchedSignals.includes("upfront_payment"));
  assert.ok(result.matchedSignals.includes("unverified_job_offer"));
});

test("an OTP request is suspicious even without a second signal", () => {
  const result = buildRuleAssessment("Reply with your OTP to complete verification.", "en");
  assert.equal(result.verdict, "suspicious");
  assert.ok(result.matchedSignals.includes("credential_request"));
  assert.match(result.summary_en, /OTP/i);
});

test("an OTP warning is not classified as credential theft", () => {
  const result = buildRuleAssessment(
    "Your bank will never ask for your OTP. Never share your PIN or password.",
    "en"
  );
  assert.equal(result.verdict, "likely_safe");
  assert.equal(result.riskScore, 0);
  assert.deepEqual(result.matchedSignals, []);
});

test("an ordinary processing-fee reminder remains uncertain", () => {
  const result = buildRuleAssessment("Your application processing fee is due.", "en");
  assert.equal(result.verdict, "uncertain");
  assert.equal(result.riskScore, 30);
});

test("a prize claim without a fee is unverified, not labelled a scam", () => {
  const result = buildRuleAssessment("Congratulations! You have won a cash prize.", "en");
  assert.equal(result.verdict, "uncertain");
  assert.equal(result.claimVerification.status, "unverified");
  assert.equal(result.confidence, "low");
});

test("urgent account link language is classified as suspicious", () => {
  const result = buildRuleAssessment(
    "Your account is suspended. Click here to verify your account immediately: https://example.invalid/login",
    "en"
  );
  assert.equal(result.verdict, "suspicious");
  assert.ok(result.matchedSignals.includes("suspicious_link_prompt"));
  assert.ok(result.matchedSignals.includes("urgency"));
});

test("a link by itself is not proof that a message is malicious", () => {
  const result = buildRuleAssessment("Here is the meeting agenda: https://example.com/agenda", "en");
  assert.equal(result.verdict, "uncertain");
  assert.ok(result.matchedSignals.includes("link_present"));
  assert.equal(result.claimVerification.status, "not_applicable");
});

test("Bangla scam patterns return Bangla output and actions", () => {
  const result = buildRuleAssessment(
    "আপনি নগদ পুরস্কার জিতেছেন। পুরস্কার পেতে আগে প্রসেসিং ফি পাঠান।",
    "bn"
  );
  assert.equal(result.responseLanguage, "bn");
  assert.equal(result.verdict, "suspicious");
  assert.match(result.summary_bn, /আগাম টাকা/);
  assert.match(result.safe_actions[0], /টাকা/);
});

test("Banglish OTP request is detected", () => {
  const result = buildRuleAssessment("Apnar OTP pathan ekhoni, account bondho hoye jabe.", "bn");
  assert.equal(result.verdict, "suspicious");
  assert.ok(result.matchedSignals.includes("credential_request"));
});

test("all scholarship and job claims remain unverified without external sources", () => {
  const result = buildRuleAssessment(
    "A government scholarship is offering 50,000 BDT. Apply before 30 November 2026.",
    "en"
  );
  assert.equal(result.claimVerification.status, "unverified");
  assert.equal(result.webEvidence.searched, false);
  assert.equal(result.webEvidence.searchExecuted, false);
  assert.match(result.claimVerification.summary_en, /No external/i);
});

test("ordinary benign notices are not automatically marked safe", () => {
  const result = buildRuleAssessment("Your parcel has been delivered.", "en");
  assert.equal(result.verdict, "uncertain");
  assert.equal(result.riskScore, 0);
});

test("rule-based output never claims to verify the sender or destination", () => {
  const result = buildRuleAssessment("Click here to verify your account: https://example.invalid", "en");
  assert.match(result.uncertainty, /not been verified/i);
  assert.equal(result.webEvidence.status, "not_available");
  assert.equal(result.claimVerification.status, "not_applicable");
});

test("the response includes no more than three evidence items or tactics", () => {
  const result = buildRuleAssessment(
    "Urgent! Your bank account is blocked. Send your OTP and PIN, click here, pay the fee, and install AnyDesk: https://example.invalid",
    "en"
  );
  assert.ok(result.evidence.length <= 3);
  assert.ok(result.tactics.length <= 3);
});

test("text input is bounded to 4000 characters", () => {
  const longText = "a".repeat(5000);
  const result = buildRuleAssessment(longText, "en");
  assert.equal(result.isRelevant, true);
  assert.equal(result.verdict, "uncertain");
  assert.equal(result.confidence, "low");
});


test("an anti-scam sentence cannot hide a contradictory direct OTP request", () => {
  const result = buildRuleAssessment(
    "Never share your OTP. Reply with your OTP now to keep your account active.",
    "en"
  );
  assert.equal(result.verdict, "suspicious");
  assert.ok(result.matchedSignals.includes("credential_request"));
});

test("an anti-scam sentence cannot hide a contradictory payment request", () => {
  const result = buildRuleAssessment(
    "Never pay unexpected fees. Send the processing fee now to release your prize.",
    "en"
  );
  assert.equal(result.verdict, "suspicious");
  assert.ok(result.matchedSignals.includes("upfront_payment"));
});
