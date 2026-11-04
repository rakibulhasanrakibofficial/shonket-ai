import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRuleAssessment } from "../api/ruleAssessment.js";
import analyzeHandler from "../api/analyze.js";

const sampleCases = JSON.parse(readFileSync(new URL("./scam-evaluation-cases.json", import.meta.url), "utf8"));

test("all scam-checker evaluation cases match relevance and expected verdicts", () => {
  const mismatches = [];
  for (const sample of sampleCases) {
    const result = buildRuleAssessment(sample.text, sample.language || (/[\\u0980-\\u09FF]/.test(sample.text) ? "bn" : "en"));
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

test("Bangla and Banglish OTP, prize-fee, job-fee and phishing cases are detected", () => {
  const targeted = sampleCases.filter(sample => sample.id.startsWith("bn-scam-") || sample.id.startsWith("bx-scam-"));
  assert.ok(targeted.length >= 10);
  for (const sample of targeted) {
    const result = buildRuleAssessment(sample.text, sample.language || "bn");
    assert.equal(result.verdict, "suspicious", sample.id + ": " + result.summary_en);
    assert.equal(result.responseLanguage, "bn");
  }
});

test("legitimate mobile-money, job and scholarship notices are not flagged for upfront fees", () => {
  const targeted = sampleCases.filter(sample => sample.id.includes("-legit-"));
  assert.ok(targeted.length >= 7);
  for (const sample of targeted) {
    const result = buildRuleAssessment(sample.text, sample.language || "en");
    assert.equal(result.verdict, "uncertain", sample.id + ": " + result.summary_en);
    assert.ok(!result.matchedSignals.includes("upfront_payment"), sample.id + " incorrectly matched an upfront payment");
  }
});

test("Bangla and Banglish anti-scam warnings are not treated as credential theft", () => {
  const warnings = sampleCases.filter(sample => sample.id.startsWith("bn-safe-") || sample.id.startsWith("bx-safe-"));
  assert.equal(warnings.length, 2);
  for (const sample of warnings) {
    const result = buildRuleAssessment(sample.text, "bn");
    assert.equal(result.verdict, "likely_safe", sample.id + ": " + result.summary_en);
    assert.ok(!result.matchedSignals.includes("credential_request"));
  }
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

test("the live smoke-test wording detects a prize claim plus a numeric processing fee", () => {
  const result = buildRuleAssessment(
    "Congratulations! You won a 50,000 BDT prize. Pay a 500 BDT processing fee today to claim it.",
    "en"
  );
  assert.equal(result.verdict, "suspicious");
  assert.ok(result.riskScore >= 55);
  assert.ok(result.matchedSignals.includes("unverified_prize_claim"));
  assert.ok(result.matchedSignals.includes("upfront_payment"));
  assert.match(result.summary_en, /prize claim with an upfront fee/i);
});

test("a selected remote-job offer with a registration fee is suspicious", () => {
  const result = buildRuleAssessment(
    "Your CV has been selected for a remote job. Pay a 750 BDT registration fee to confirm your position.",
    "en"
  );
  assert.equal(result.verdict, "suspicious");
  assert.ok(result.riskScore >= 55);
  assert.ok(result.matchedSignals.includes("unverified_job_offer"));
  assert.ok(result.matchedSignals.includes("upfront_payment"));
});

test("a simple prize announcement without a fee stays unverified, not suspicious", () => {
  const result = buildRuleAssessment(
    "You won a prize in our annual community raffle. Check the organiser's public notice for details.",
    "en"
  );
  assert.equal(result.verdict, "uncertain");
  assert.equal(result.riskScore, 22);
  assert.ok(result.matchedSignals.includes("unverified_prize_claim"));
  assert.ok(!result.matchedSignals.includes("upfront_payment"));
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


import { extractScreenshotText } from "../src/services/screenshotOcrService.js";
import { analyzeMessage } from "../src/services/messageCheckService.js";
import { handleAnalyzeRequest } from "../src/worker.js";

test("browser screenshot OCR extracts English and Bangla and terminates its worker", async () => {
  const file = { type: "image/png", size: 128 };
  let terminated = false;
  let progress = 0;
  const extracted = await extractScreenshotText(file, {
    onProgress: value => { progress = value; },
    workerFactory: async (languages, workers, options) => {
      assert.equal(languages, "eng+ben");
      assert.equal(workers, 1);
      options.logger({ status: "recognizing text", progress: 0.5 });
      return {
        recognize: async receivedFile => {
          assert.equal(receivedFile, file);
          return { data: { text: "Congratulations! You won a prize.\nআপনি পুরস্কার জিতেছেন।" } };
        },
        terminate: async () => { terminated = true; }
      };
    }
  });
  assert.match(extracted, /Congratulations/i);
  assert.match(extracted, /পুরস্কার/);
  assert.equal(progress, 50);
  assert.equal(terminated, true);
});

test("browser screenshot OCR rejects invalid and oversized files before starting a worker", async () => {
  let created = false;
  const workerFactory = async () => { created = true; throw new Error("must not run"); };
  await assert.rejects(extractScreenshotText({ type: "image/gif", size: 20 }, { workerFactory }), /PNG, JPG, or WebP/);
  await assert.rejects(extractScreenshotText({ type: "image/png", size: 2.5 * 1024 * 1024 + 1 }, { workerFactory }), /2.5 MB/);
  assert.equal(created, false);
});

test("static GitHub Pages analysis uses local rules and RAG without calling a missing API", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("Static hosting must not make an API request without a backend URL.");
  };

  try {
    const result = await analyzeMessage({
      message: "You have won a cash prize. Pay the processing fee today.",
      language: "en"
    });
    assert.equal(called, false);
    assert.equal(result.analysisMode, "local-rules+rag");
    assert.equal(result.aiAnalysis.status, "not_configured");
    assert.equal(result.verdict, "suspicious");
    assert.equal(result.engine, "Rule-based");
    assert.ok(result.retrievedSources.some(source => source.id === "bkash-security-tips"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("screenshot analysis reads locally and sends no request when a backend is not configured", async () => {
  const originalFetch = globalThis.fetch;
  const file = { type: "image/png", size: 128 };
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("No API request is expected on static-only hosting.");
  };

  try {
    const result = await analyzeMessage({
      message: "Please review this message:",
      imageFile: file,
      language: "en",
      ocrExtractor: async receivedFile => {
        assert.equal(receivedFile, file);
        return "You have won a prize. Pay a processing fee.";
      }
    });
    assert.equal(called, false);
    assert.equal(result.analysisMode, "local-rules+rag");
    assert.equal(result.screenshotRead, true);
    assert.equal(result.extractedText, "You have won a prize. Pay a processing fee.");
    assert.equal(result.combinedText, "Please review this message:\nYou have won a prize. Pay a processing fee.");
    assert.equal(result.aiAnalysis.status, "not_configured");
    assert.match(result.ocrEngine, /browser-side/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("Cloudflare Worker checks text using its native rate-limit binding", async () => {
  let rateLimitKey = "";
  const request = new Request("https://shonket.example/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.31" },
    body: JSON.stringify({
      message: "You have won a cash prize. Pay the processing fee now to release it.",
      language: "en"
    })
  });
  const response = await handleAnalyzeRequest(request, {
    ANALYZE_RATE_LIMITER: {
      limit: async ({ key }) => {
        rateLimitKey = key;
        return { success: true };
      }
    }
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.verdict, "suspicious");
  assert.equal(body.engine, "Rule-based");
  assert.equal(rateLimitKey, "203.0.113.31");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("Cloudflare Worker returns 429 when the native rate-limit binding rejects a request", async () => {
  const request = new Request("https://shonket.example/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.33" },
    body: JSON.stringify({ message: "Your parcel has been delivered." })
  });
  const response = await handleAnalyzeRequest(request, {
    ANALYZE_RATE_LIMITER: { limit: async () => ({ success: false }) }
  });
  assert.equal(response.status, 429);
  assert.match((await response.json()).error, /Too many checks/);
});

test("Cloudflare Worker fails closed without a trusted Cloudflare client IP", async () => {
  let called = false;
  const request = new Request("https://shonket.example/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.32" },
    body: JSON.stringify({ message: "Your account is blocked. Send your OTP now." })
  });
  const response = await handleAnalyzeRequest(request, {
    ANALYZE_RATE_LIMITER: {
      limit: async () => {
        called = true;
        return { success: true };
      }
    }
  });
  assert.equal(response.status, 503);
  assert.equal(called, false);
});

test("Cloudflare Worker fails closed when its native rate-limit binding is missing", async () => {
  const request = new Request("https://shonket.example/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.34" },
    body: JSON.stringify({ message: "Your account is blocked. Send your OTP now." })
  });
  const response = await handleAnalyzeRequest(request, {});
  assert.equal(response.status, 503);
});

test("sensitive identity and financial-detail requests are surfaced without automatically declaring fraud", () => {
  const english = buildRuleAssessment(
    "For your scholarship application, send your NID number and bank account details to process the grant.",
    "en"
  );
  assert.equal(english.isRelevant, true);
  assert.equal(english.verdict, "uncertain");
  assert.equal(english.riskScore, 24);
  assert.ok(english.tactics.includes("sensitive_identity_request"));
  assert.match(english.evidence[0].reason_en, /independently verified official form/i);

  const bangla = buildRuleAssessment(
    "বৃত্তি পেতে আপনার এনআইডি নম্বর ও জন্মতারিখ পাঠান।",
    "bn"
  );
  assert.equal(bangla.isRelevant, true);
  assert.equal(bangla.verdict, "uncertain");
  assert.equal(bangla.riskScore, 24);
  assert.ok(bangla.tactics.includes("sensitive_identity_request"));

  const banglish = buildRuleAssessment(
    "Scholarship er jonno apnar NID number ta diben, grant process korte hobe.",
    "en"
  );
  assert.equal(banglish.isRelevant, true);
  assert.ok(banglish.tactics.includes("sensitive_identity_request"));
});

test("identity-protection warnings are not misclassified as identity-data requests", () => {
  const english = buildRuleAssessment(
    "Never share your NID number or passport with strangers.",
    "en"
  );
  assert.equal(english.isRelevant, true);
  assert.equal(english.verdict, "likely_safe");
  assert.equal(english.riskScore, 0);
  assert.deepEqual(english.tactics, []);

  const bangla = buildRuleAssessment(
    "জাতীয় পরিচয়পত্র বা পাসপোর্ট কারও সঙ্গে শেয়ার করবেন না।",
    "bn"
  );
  assert.equal(bangla.isRelevant, true);
  assert.equal(bangla.verdict, "likely_safe");
  assert.equal(bangla.riskScore, 0);
  assert.deepEqual(bangla.tactics, []);
});
