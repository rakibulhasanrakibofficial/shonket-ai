import test from "node:test";
import assert from "node:assert/strict";
import { handler, redactForModel } from "../netlify/functions/analyze.mjs";
import { retrieveKnowledge } from "../netlify/functions/knowledge-base.mjs";

const allowedOrigin = "https://rakibulhasanrakibofficial.github.io";

function makeEvent(message, headers = {}, httpMethod = "POST") {
  return {
    httpMethod,
    headers: {
      origin: allowedOrigin,
      "content-type": "application/json",
      "x-nf-client-connection-ip": "203.0.113.10",
      ...headers
    },
    body: typeof message === "string" ? message : JSON.stringify(message)
  };
}

test("RAG retrieves official bKash guidance for PIN and OTP messages", () => {
  const sources = retrieveKnowledge("Please share your bKash PIN and SMS OTP now.");
  assert.ok(sources.some(source => source.id === "bkash-fraud-awareness"));
  assert.ok(sources.some(source => source.id === "bkash-security-tips"));
});

test("RAG retrieves the BGD e-GOV CIRT smishing advisory for phishing links", () => {
  const sources = retrieveKnowledge("SMS contains a phishing link targeting a Bangladesh bank account.");
  assert.ok(sources.some(source => source.id === "bgd-cirt-error524"));
});

test("RAG returns only sources with matching terms and keeps original source URLs", () => {
  const sources = retrieveKnowledge("I lost money to a scam. My account was compromised.");
  assert.ok(sources.length > 0);
  assert.ok(sources.every(source => /^https:\/\//.test(source.url)));
  assert.ok(sources.length <= 3);
});

test("model redaction removes URLs, email, Bangladeshi mobile numbers, and long digit strings", () => {
  const redacted = redactForModel(
    "Contact example@example.com, phone 01712345678, code 123456, and open https://example.com/claim"
  );
  assert.doesNotMatch(redacted, /example@example\.com|01712345678|123456|https:\/\//);
  assert.match(redacted, /\[EMAIL REDACTED\]/);
  assert.match(redacted, /\[PHONE REDACTED\]/);
  assert.match(redacted, /\[NUMBER REDACTED\]/);
  assert.match(redacted, /\[URL REDACTED\]/);
});

test("Netlify API returns deterministic rule result and RAG sources without an LLM token", async () => {
  const previousToken = process.env.HF_TOKEN;
  delete process.env.HF_TOKEN;
  try {
    const result = await handler(makeEvent({
      message: "You have won a cash prize. Pay the processing fee today.",
      language: "en"
    }));
    const body = JSON.parse(result.body);
    assert.equal(result.statusCode, 200);
    assert.equal(body.verdict, "suspicious");
    assert.equal(body.engine, "Rule-based");
    assert.equal(body.aiAnalysis.status, "not_configured");
    assert.equal(body.analysisMode, "rules+rag");
    assert.ok(body.retrievedSources.some(source => source.id === "bkash-security-tips"));
    assert.equal(body.privacy.rawMessageStored, false);
  } finally {
    if (previousToken === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = previousToken;
  }
});

test("Netlify API handles preflight only for a configured allowed origin", async () => {
  const allowed = await handler({
    httpMethod: "OPTIONS",
    headers: { origin: allowedOrigin }
  });
  assert.equal(allowed.statusCode, 204);
  assert.equal(allowed.headers["Access-Control-Allow-Origin"], allowedOrigin);

  const blocked = await handler({
    httpMethod: "OPTIONS",
    headers: { origin: "https://untrusted.example" }
  });
  assert.equal(blocked.headers["Access-Control-Allow-Origin"], undefined);
});

test("Netlify API rejects a request from a disallowed browser origin", async () => {
  const result = await handler(makeEvent({
    message: "Your account is suspended. Send your OTP."
  }, { origin: "https://untrusted.example" }));
  assert.equal(result.statusCode, 403);
});

test("Netlify API rejects malformed and oversized requests", async () => {
  const malformed = await handler(makeEvent("{"));
  assert.equal(malformed.statusCode, 400);

  const tooLong = await handler(makeEvent({ message: "x".repeat(4001) }));
  assert.equal(tooLong.statusCode, 413);
});

test("Netlify API calls Hugging Face server-side and validates the LLM explanation", async () => {
  const originalFetch = globalThis.fetch;
  const previousToken = process.env.HF_TOKEN;
  const previousModel = process.env.HF_MODEL;
  process.env.HF_TOKEN = "hf_test_token";
  process.env.HF_MODEL = "Qwen/Qwen2.5-7B-Instruct:cheapest";
  let calledUrl = "";
  let requestBody = null;
  let authorization = "";

  globalThis.fetch = async (url, options) => {
    calledUrl = String(url);
    authorization = options.headers.Authorization;
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            explanation_bn: "বার্তাটি পুরস্কারের দাবি করে আগাম ফি চাইছে।",
            explanation_en: "The message combines a prize claim with an upfront fee request.",
            next_steps_bn: ["ফি দেবেন না।", "অফিসিয়াল উৎসে যাচাই করুন।"],
            next_steps_en: ["Do not pay the fee.", "Verify through the official source."]
          })
        }
      }]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const result = await handler(makeEvent({
      message: "You have won a cash prize. Pay the processing fee today. Contact 01712345678.",
      language: "en"
    }));
    const body = JSON.parse(result.body);
    assert.equal(result.statusCode, 200);
    assert.equal(calledUrl, "https://router.huggingface.co/v1/chat/completions");
    assert.equal(authorization, "Bearer hf_test_token");
    assert.equal(requestBody.model, "Qwen/Qwen2.5-7B-Instruct:cheapest");
    assert.equal(body.aiAnalysis.status, "ready");
    assert.match(body.aiAnalysis.explanation_en, /upfront fee/i);
    assert.equal(body.verdict, "suspicious");
    assert.match(requestBody.messages[1].content, /\[PHONE REDACTED\]/);
    assert.doesNotMatch(requestBody.messages[1].content, /01712345678/);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = previousToken;
    if (previousModel === undefined) delete process.env.HF_MODEL;
    else process.env.HF_MODEL = previousModel;
  }
});

test("Netlify API degrades safely when the LLM provider is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  const previousToken = process.env.HF_TOKEN;
  process.env.HF_TOKEN = "hf_test_token";
  globalThis.fetch = async () => new Response("provider unavailable", { status: 503 });
  try {
    const result = await handler(makeEvent({
      message: "Reply with your OTP immediately.",
      language: "en"
    }));
    const body = JSON.parse(result.body);
    assert.equal(result.statusCode, 200);
    assert.equal(body.verdict, "suspicious");
    assert.equal(body.aiAnalysis.status, "unavailable");
    assert.equal(body.engine, "Rule-based");
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = previousToken;
  }
});
