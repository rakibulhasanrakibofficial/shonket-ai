import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

const allowedOrigin = "https://rakibulhasanrakibofficial.github.io";

function makeEnv(overrides = {}) {
  const calls = { ai: 0, rate: 0, officialRate: 0, model: "", options: null, key: "" };
  const env = {
    CLOUDFLARE_AI_MODEL: "@cf/google/gemma-4-26b-a4b-it",
    OFFICIAL_SOURCE_SEARCH_ENABLED: "false",
    CORS_ALLOWED_ORIGINS: "",
    AI: {
      async run(model, input, options) {
        calls.ai += 1;
        calls.model = model;
        calls.options = options;
        assert.equal(input.max_completion_tokens, 240);
        assert.equal(input.chat_template_kwargs.enable_thinking, false);
        assert.equal(input.messages.length, 2);
        return {
          choices: [{
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                explanation_bn: "পুরস্কার পেতে আগাম ফি চাওয়াটি সতর্কতার সংকেত।",
                explanation_en: "An upfront fee request to claim a prize is a warning sign.",
                next_steps_bn: ["টাকা দেবেন না।", "অফিসিয়াল মাধ্যমে যাচাই করুন।"],
                next_steps_en: ["Do not pay.", "Verify through an official channel."]
              })
            }
          }]
        };
      }
    },
    ANALYZE_RATE_LIMITER: {
      async limit({ key }) {
        calls.rate += 1;
        calls.key = key;
        return { success: true };
      }
    },
    OFFICIAL_SEARCH_RATE_LIMITER: {
      async limit({ key }) {
        calls.officialRate += 1;
        calls.officialKey = key;
        return { success: true };
      }
    },
    ...overrides
  };
  return { env, calls };
}

test("Cloudflare Worker health endpoint reports configured runtime bindings", async () => {
  const { env } = makeEnv();
  const response = await worker.fetch(new Request("https://example.workers.dev/health"), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.runtime, "Cloudflare Workers");
  assert.equal(body.aiBindingConfigured, true);
  assert.equal(body.rateLimitConfigured, true);
});

test("Cloudflare Worker runs full rule, RAG and AI analysis using native bindings without API tokens", async () => {
  const { env, calls } = makeEnv();
  const request = new Request("https://example.workers.dev/api/analyze", {
    method: "POST",
    headers: {
      Origin: allowedOrigin,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.20"
    },
    body: JSON.stringify({
      message: "You have won a cash prize. Pay the processing fee today.",
      language: "en"
    })
  });

  const response = await worker.fetch(request, env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), allowedOrigin);
  assert.equal(body.verdict, "suspicious");
  assert.equal(body.engine, "Rule-based");
  assert.equal(body.aiAnalysis.status, "ready");
  assert.match(body.aiAnalysis.explanation_en, /upfront fee/i);
  assert.equal(body.privacy.modelInputRedacted, true);
  assert.equal(body.privacy.rawMessageStored, false);
  assert.equal(calls.ai, 1);
  assert.equal(calls.rate, 1);
  assert.equal(calls.model, "@cf/google/gemma-4-26b-a4b-it");
  assert.deepEqual(calls.options, { rejectIfBusy: true });
  assert.equal(calls.key, "203.0.113.20");
});

test("analysis response returns immediately with official search marked pending", async () => {
  const { env } = makeEnv({ OFFICIAL_SOURCE_SEARCH_ENABLED: "true" });
  const response = await worker.fetch(new Request("https://example.workers.dev/api/analyze", {
    method: "POST",
    headers: {
      Origin: allowedOrigin,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.25"
    },
    body: JSON.stringify({
      message: "A Bangladesh government scholarship offers 50,000 BDT. Pay a processing fee to claim the prize.",
      language: "en"
    })
  }), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.officialSearch.status, "pending");
  assert.equal(body.webEvidence.status, "pending");
  assert.equal(body.webEvidence.searched, true);
  assert.equal(body.claimVerification.officialSearchStatus, "pending");
});

test("official-source search is a separate route with its own rate limiter and returns completed portal results", async () => {
  const { env, calls } = makeEnv({ OFFICIAL_SOURCE_SEARCH_ENABLED: "true" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    "<html><body><table><tr><th>Title</th><th>Published</th></tr><tr><td>Government Scholarship 2026</td><td>04-11-2026</td></tr></table></body></html>",
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
  try {
    const response = await worker.fetch(new Request("https://example.workers.dev/api/official-search", {
      method: "POST",
      headers: {
        Origin: allowedOrigin,
        "Content-Type": "application/json",
        "CF-Connecting-IP": "203.0.113.26"
      },
      body: JSON.stringify({
        message: "A Bangladesh government scholarship offers 50,000 BDT for university students. Pay a processing fee to claim it.",
        language: "en"
      })
    }), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.notEqual(body.officialSearch.status, "pending");
    assert.equal(body.webEvidence.searchExecuted, true);
    assert.ok(body.webEvidence.searchedPortals.length > 0);
    assert.equal(calls.officialRate, 1);
    assert.equal(calls.officialKey, "203.0.113.26");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("official-source search preflight returns CORS headers for the configured site", async () => {
  const { env, calls } = makeEnv();
  const response = await worker.fetch(new Request("https://example.workers.dev/api/official-search", {
    method: "OPTIONS",
    headers: { Origin: allowedOrigin }
  }), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), allowedOrigin);
  assert.equal(calls.officialRate, 0);
});

test("Cloudflare Worker returns 429 when its rate-limit binding rejects a request", async () => {
  const { env, calls } = makeEnv({
    ANALYZE_RATE_LIMITER: {
      async limit() { return { success: false }; }
    }
  });
  const response = await worker.fetch(new Request("https://example.workers.dev/api/analyze", {
    method: "POST",
    headers: {
      Origin: allowedOrigin,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.21"
    },
    body: JSON.stringify({ message: "Reply with your OTP now.", language: "en" })
  }), env);

  assert.equal(response.status, 429);
  assert.equal(calls.ai, 0);
});

test("Cloudflare Worker blocks untrusted browser origins", async () => {
  const { env, calls } = makeEnv();
  const response = await worker.fetch(new Request("https://example.workers.dev/api/analyze", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.22"
    },
    body: JSON.stringify({ message: "Your account will be blocked. Send your OTP.", language: "en" })
  }), env);

  assert.equal(response.status, 403);
  assert.equal(calls.ai, 0);
});
