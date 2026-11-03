import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRuleAssessment } from "../api/ruleAssessment.js";
import analyzeHandler from "../api/analyze.js";
import screenshotHandler from "../api/analyzeScreenshot.js";

const sampleCases = JSON.parse(readFileSync(new URL("./scam-evaluation-cases.json", import.meta.url), "utf8"));

test("all 22 scam-checker sample inputs match relevance and expected verdicts", () => {
  const mismatches = [];
  for (const sample of sampleCases) {
    const result = buildRuleAssessment(sample.text, /[\\u0980-\\u09FF]/.test(sample.text) ? "bn" : "en");
    if (result.isRelevant !== sample.relevant) {
      mismatches.push(sample.id + " relevance expected " + sample.relevant + " but received " + result.isRelevant);
      continue;
    }
    if (sample.relevant && !sample.expected.includes(result.verdict)) {
      mismatches.push(sample.id + " expected " + sample.expected.join("/") + " but received " + result.verdict);
    }
    if (!sample.relevant && (result.verdict !== "out_of_scope" || result.riskScore !== null)) {
      mismatches.push(sample.id + " should return out_of_scope with no risk score");
    }
  }
  assert.deepEqual(mismatches, [], mismatches.join("\\n"));
});

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

test("text beyond the 4000-character assessment limit cannot create a signal", () => {
  const longText = "ordinary text. ".repeat(300) + "Reply with your OTP now.";
  const result = buildRuleAssessment(longText, "en");
  assert.equal(result.isRelevant, false);
  assert.equal(result.verdict, "out_of_scope");
  assert.equal(result.riskScore, null);
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
    "You have won a prize. Never pay unexpected fees. Send the processing fee now to release your prize.",
    "en"
  );
  assert.equal(result.verdict, "suspicious");
  assert.ok(result.matchedSignals.includes("upfront_payment"));
});


function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    end(body) {
      this.body = String(body || "");
      return this.body;
    }
  };
}

test("screenshot API extracts image text and checks it with deterministic rules", async () => {
  const previous = {
    redisUrl: process.env.UPSTASH_REDIS_REST_URL,
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    geminiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL
  };
  const originalFetch = globalThis.fetch;
  const calls = [];
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url) === "https://redis.example.invalid/pipeline") {
      return { ok: true, json: async () => [{ result: [1, 60] }] };
    }
    if (String(url).includes("generativelanguage.googleapis.com")) {
      return {
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  extracted_text: "Congratulations! You won a cash prize. Send a processing fee today.",
                  uncertainty: "Small print may be unclear."
                })
              }]
            }
          }]
        })
      };
    }
    throw new Error("Unexpected fetch URL: " + url);
  };

  try {
    const response = createMockResponse();
    await screenshotHandler({
      method: "POST",
      headers: { "x-real-ip": "203.0.113.21" },
      body: {
        message: "",
        imageMimeType: "image/png",
        imageBase64: "data:image/png;base64,aW1hZ2U=",
        language: "en"
      }
    }, response);

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.screenshotRead, true);
    assert.match(body.extractedText, /cash prize/i);
    assert.equal(body.verdict, "suspicious");
    assert.ok(body.matchedSignals.includes("unverified_prize_claim"));
    assert.ok(body.matchedSignals.includes("upfront_payment"));
    assert.equal(calls.filter(call => call.url === "https://redis.example.invalid/pipeline").length, 2);
    assert.equal(calls.filter(call => call.url.includes("generativelanguage.googleapis.com")).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous.redisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previous.redisUrl;
    if (previous.redisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previous.redisToken;
    if (previous.geminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous.geminiKey;
    if (previous.geminiModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previous.geminiModel;
  }
});

test("screenshot API rejects unsupported image types before calling Gemini", async () => {
  const previous = {
    redisUrl: process.env.UPSTASH_REDIS_REST_URL,
    redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    geminiKey: process.env.GEMINI_API_KEY
  };
  const originalFetch = globalThis.fetch;
  let geminiCalled = false;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.GEMINI_API_KEY = "test-gemini-key";
  globalThis.fetch = async url => {
    if (String(url) === "https://redis.example.invalid/pipeline") {
      return { ok: true, json: async () => [{ result: [1, 60] }] };
    }
    geminiCalled = true;
    throw new Error("Gemini should not be called for an unsupported file type");
  };

  try {
    const response = createMockResponse();
    await screenshotHandler({
      method: "POST",
      headers: { "x-real-ip": "203.0.113.22" },
      body: { imageMimeType: "image/gif", imageBase64: "Z2lm" }
    }, response);
    assert.equal(response.statusCode, 400);
    assert.equal(geminiCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous.redisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previous.redisUrl;
    if (previous.redisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previous.redisToken;
    if (previous.geminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous.geminiKey;
  }
});

test("public API checks text with deterministic rules and only calls Redis for rate limits", async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = globalThis.fetch;
  const calls = [];

  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      json: async () => [{ result: [1, 60] }]
    };
  };

  try {
    const response = createMockResponse();
    await analyzeHandler({
      method: "POST",
      headers: { "x-real-ip": "203.0.113.12" },
      body: {
        message: "You have won a cash prize. Send a processing fee now to claim it.",
        language: "en"
      }
    }, response);

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.engine, "Rule-based");
    assert.equal(body.model, "deterministic-rules");
    assert.equal(body.claimVerification.status, "unverified");
    assert.equal(body.webEvidence.searchExecuted, false);
    assert.equal(calls.length, 2);
    assert.ok(calls.every(call => call.url === "https://redis.example.invalid/pipeline"));
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test("public API fails closed when rate-limit storage is not configured", async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  try {
    const response = createMockResponse();
    await analyzeHandler({
      method: "POST",
      headers: { "x-real-ip": "203.0.113.13" },
      body: { message: "Your parcel has been delivered.", language: "en" }
    }, response);
    assert.equal(response.statusCode, 503);
    assert.match(JSON.parse(response.body).error, /Rate limiting is not configured/i);
  } finally {
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test("public API rejects screenshots instead of pretending to analyse images", async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = globalThis.fetch;

  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => [{ result: [1, 60] }]
  });

  try {
    const response = createMockResponse();
    await analyzeHandler({
      method: "POST",
      headers: { "x-real-ip": "203.0.113.14" },
      body: {
        message: "Please check this screenshot",
        imageBase64: "dGVzdA==",
        imageMimeType: "image/png"
      }
    }, response);
    assert.equal(response.statusCode, 422);
    assert.equal(JSON.parse(response.body).code, "IMAGE_ANALYSIS_UNAVAILABLE");
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test("public API rejects unsupported methods without calling external services", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("fetch should not be called");
  };

  try {
    const response = createMockResponse();
    await analyzeHandler({ method: "GET", headers: {}, body: {} }, response);
    assert.equal(response.statusCode, 405);
    assert.equal(called, false);
    assert.equal(response.headers.Allow, "POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("public API auto-detects Bangla text without a provider call", async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = globalThis.fetch;

  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => [{ result: [1, 60] }]
  });

  try {
    const response = createMockResponse();
    await analyzeHandler({
      method: "POST",
      headers: { "x-real-ip": "203.0.113.15" },
      body: {
        message: "আপনি নগদ পুরস্কার জিতেছেন। পুরস্কার পেতে আগে প্রসেসিং ফি পাঠান।",
        language: "auto"
      }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).responseLanguage, "bn");
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});
