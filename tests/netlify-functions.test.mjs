import test from "node:test";
import assert from "node:assert/strict";
import { handler, officialSearchHandler, redactForModel, enrichClaimVerification, buildWebEvidence } from "../netlify/functions/analyze.mjs";
import { retrieveKnowledge } from "../netlify/functions/knowledge-base.mjs";

const allowedOrigin = "https://rakibulhasanrakibofficial.github.io";

test("claim verification explains a completed search that found guidance but no matching notice", () => {
  const result = enrichClaimVerification(
    { status: "unverified", summary_en: "stale", summary_bn: "পুরোনো" },
    {
      status: "guidance_only",
      searchedPortals: [{ agency: "BGD e-GOV CIRT" }, { agency: "ScamCheck" }],
      sources: [{ evidenceType: "official_safety_guidance" }],
      evidenceAssessment: { status: "contextual_guidance" },
      summary_en: "Relevant safety guidance was retrieved, but no matching government notice was confirmed.",
      summary_bn: "নিরাপত্তা নির্দেশনা পাওয়া গেছে, তবে মিলে যাওয়া নোটিশ নিশ্চিত হয়নি।"
    }
  );

  assert.equal(result.status, "unverified");
  assert.equal(result.officialSearchAttempted, true);
  assert.equal(result.officialPortalCount, 2);
  assert.equal(result.officialSourceCount, 1);
  assert.match(result.summary_en, /checked 2 selected official or institutional portals/i);
  assert.match(result.summary_en, /general official safety guidance/i);
  assert.doesNotMatch(result.summary_en, /No external.*was searched/i);
});

test("claim verification explains a matching notice without claiming the sender is authenticated", () => {
  const result = enrichClaimVerification(
    { status: "unverified", summary_en: "stale", summary_bn: "পুরোনো" },
    {
      status: "results_found",
      searchedPortals: [{ agency: "SHED" }, { agency: "DSHE" }],
      sources: [{ evidenceType: "government_listing_match" }],
      evidenceAssessment: { status: "related_official_notice" }
    }
  );

  assert.equal(result.status, "unverified");
  assert.equal(result.officialEvidenceStatus, "related_official_notice");
  assert.match(result.summary_en, /found a related official notice listing/i);
  assert.match(result.summary_en, /does not authenticate the sender/i);
});

test("claim verification distinguishes an attempted but unavailable search", () => {
  const result = enrichClaimVerification(
    { status: "unverified", summary_en: "stale", summary_bn: "পুরোনো" },
    {
      status: "unavailable",
      searchedPortals: [],
      sources: [],
      evidenceAssessment: { status: "search_unavailable" }
    }
  );

  assert.equal(result.status, "unverified");
  assert.equal(result.officialSearchAttempted, true);
  assert.match(result.summary_en, /search could not be completed/i);
  assert.match(result.summary_en, /not a negative finding/i);
});

test("web evidence reports whether portals were actually checked", () => {
  const checked = buildWebEvidence({
    status: "guidance_only",
    searchedPortals: [{ agency: "CIRT" }],
    sources: [{ evidenceType: "official_safety_guidance" }]
  });
  assert.equal(checked.searched, true);
  assert.equal(checked.searchExecuted, true);
  assert.equal(checked.searchedPortals.length, 1);
  assert.equal(checked.officialSourcesFound, 1);

  const notApplicable = buildWebEvidence({ status: "not_applicable", searchedPortals: [], sources: [] });
  assert.equal(notApplicable.searched, false);
  assert.equal(notApplicable.searchExecuted, false);
});
process.env.OFFICIAL_SOURCE_SEARCH_ENABLED = "false";
process.env.CLOUDFLARE_ACCOUNT_ID = "cf_test_account_id";

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

test("RAG retrieves bKash guidance when the message explicitly names bKash", () => {
  const sources = retrieveKnowledge("Please share your bKash PIN and SMS OTP now.");
  assert.ok(sources.some(source => source.id === "bkash-fraud-awareness"));
  assert.ok(sources.some(source => source.id === "bkash-security-tips"));
});

test("RAG routes a generic prize-fee claim to ScamCheck, not unrelated brand or incident pages", () => {
  const sources = retrieveKnowledge(
    "Congratulations! You won a cash prize of 50,000 BDT. Pay a 500 BDT processing fee today to claim it."
  );
  assert.ok(sources.some(source => source.id === "scamcheck-common-scams"));
  assert.ok(!sources.some(source => source.id === "bkash-fraud-awareness" || source.id === "bkash-security-tips"));
  assert.ok(!sources.some(source => source.id === "bgd-cirt-error524"));
  assert.ok(!sources.some(source => source.id === "scamcheck-victim-support"));
});

test("RAG does not leak bKash or campaign references into benign courier or Nagad messages", () => {
  const courier = retrieveKnowledge(
    "Your parcel delivery is scheduled for tomorrow. Please check the tracking status in your courier app. No payment is requested."
  );
  assert.deepEqual(courier, []);

  const nagad = retrieveKnowledge("Your Nagad cash-in was successful.");
  assert.ok(!nagad.some(source => source.id === "bkash-fraud-awareness" || source.id === "bkash-security-tips"));
});

test("RAG does not infer bKash from an unbranded PIN and OTP request", () => {
  const sources = retrieveKnowledge("Please share your PIN and SMS OTP now.");
  assert.ok(!sources.some(source => source.id === "bkash-fraud-awareness" || source.id === "bkash-security-tips"));
});

test("RAG does not surface prize-scam guidance for an unrelated generic fee request", () => {
  const sources = retrieveKnowledge("Pay the processing fee to continue your account review.");
  assert.ok(!sources.some(source => source.id === "scamcheck-common-scams"));
});

test("RAG retrieves victim-support guidance only after a reported loss or compromised account", () => {
  const sources = retrieveKnowledge("I lost money to a scam. My account was compromised.");
  assert.ok(sources.some(source => source.id === "scamcheck-victim-support"));
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
  const previousToken = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
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
    assert.equal(body.analysisMode, "rules+rag+official-search");
    assert.ok(body.retrievedSources.some(source => source.id === "scamcheck-common-scams"));
    assert.ok(!body.retrievedSources.some(source => source.id === "bkash-security-tips" || source.id === "bkash-fraud-awareness"));
    assert.equal(body.privacy.rawMessageStored, false);
  } finally {
    if (previousToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previousToken;
  }
});

test("analysis endpoint returns a pending official search rather than waiting for portal retrieval", async () => {
  const result = await handler(makeEvent({
    message: "A Bangladesh government scholarship offers 50,000 BDT for university students. Pay a processing fee to claim it.",
    language: "en"
  }), {
    OFFICIAL_SOURCE_SEARCH_ENABLED: "true",
    CORS_ALLOWED_ORIGINS: allowedOrigin
  });
  const body = JSON.parse(result.body);
  assert.equal(result.statusCode, 200);
  assert.equal(body.officialSearch.status, "pending");
  assert.equal(body.webEvidence.status, "pending");
  assert.equal(body.webEvidence.searched, true);
  assert.equal(body.claimVerification.officialSearchStatus, "pending");
});

test("official search endpoint returns portal results independently", async () => {
  const html = "<html><body><table><tr><th>Title</th><th>Published</th></tr><tr><td>Government Scholarship 2026</td><td>04-11-2026</td></tr></table></body></html>";
  const result = await officialSearchHandler(
    makeEvent({
      message: "A Bangladesh government scholarship offers 50,000 BDT for university students. Pay a processing fee to claim it.",
      language: "en"
    }),
    {
      OFFICIAL_SOURCE_SEARCH_ENABLED: "true",
      CORS_ALLOWED_ORIGINS: allowedOrigin
    },
    null,
    async () => new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } })
  );
  const body = JSON.parse(result.body);
  assert.equal(result.statusCode, 200);
  assert.notEqual(body.officialSearch.status, "pending");
  assert.equal(body.webEvidence.searchExecuted, true);
  assert.ok(body.webEvidence.searchedPortals.length > 0);
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

test("Netlify API calls Cloudflare Workers AI server-side and validates the LLM explanation", async () => {
  const originalFetch = globalThis.fetch;
  const previousToken = process.env.CLOUDFLARE_API_TOKEN;
  const previousModel = process.env.CLOUDFLARE_AI_MODEL;
  process.env.CLOUDFLARE_API_TOKEN = "cf_test_token";
  process.env.CLOUDFLARE_AI_MODEL = "@cf/google/gemma-4-26b-a4b-it";
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
          content: [{
            type: "text",
            text: "Here is the requested explanation:\\n```json\\n" + JSON.stringify({
              explanation_bn: "বার্তাটি পুরস্কারের দাবি করে আগাম ফি চাইছে।",
              explanation_en: "The message combines a prize claim with an upfront fee request.",
              next_steps_bn: ["ফি দেবেন না।", "অফিসিয়াল উৎসে যাচাই করুন।"],
              next_steps_en: ["Do not pay the fee.", "Verify through the official source."]
            }) + "\\n```"
          }]
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
    assert.equal(calledUrl, "https://api.cloudflare.com/client/v4/accounts/cf_test_account_id/ai/v1/chat/completions");
    assert.equal(authorization, "Bearer cf_test_token");
    assert.equal(requestBody.model, "@cf/google/gemma-4-26b-a4b-it");
    assert.equal(requestBody.chat_template_kwargs.enable_thinking, false);
    assert.equal(requestBody.max_completion_tokens, 240);
    assert.equal(body.aiAnalysis.status, "ready");
    assert.match(body.aiAnalysis.explanation_en, /upfront fee/i);
    assert.equal(body.verdict, "suspicious");
    assert.match(requestBody.messages[1].content, /\[PHONE REDACTED\]/);
    assert.doesNotMatch(requestBody.messages[1].content, /01712345678/);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previousToken;
    if (previousModel === undefined) delete process.env.CLOUDFLARE_AI_MODEL;
    else process.env.CLOUDFLARE_AI_MODEL = previousModel;
  }
});

test("Netlify API degrades safely when the LLM provider is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  const previousToken = process.env.CLOUDFLARE_API_TOKEN;
  process.env.CLOUDFLARE_API_TOKEN = "cf_test_token";
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
    assert.equal(body.aiAnalysis.diagnosticCode, "HTTP_503");
    assert.equal(body.engine, "Rule-based");
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previousToken;
  }
});


test("analysis response does not wait for the separate official portal search", async () => {
  const originalFetch = globalThis.fetch;
  const previousToken = process.env.CLOUDFLARE_API_TOKEN;
  const previousSearchFlag = process.env.OFFICIAL_SOURCE_SEARCH_ENABLED;
  process.env.CLOUDFLARE_API_TOKEN = "cf_test_token";
  process.env.OFFICIAL_SOURCE_SEARCH_ENABLED = "true";
  let modelStarted = false;
  const unexpectedPortalCalls = [];

  globalThis.fetch = async url => {
    const address = String(url);
    if (address.includes("/ai/v1/chat/completions")) {
      modelStarted = true;
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              explanation_bn: "বার্তাটির দাবি আলাদাভাবে যাচাই করতে হবে।",
              explanation_en: "The claim needs independent verification.",
              next_steps_bn: ["অফিসিয়াল নোটিশ দেখুন।"],
              next_steps_en: ["Check the official notice."]
            })
          }
        }]
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    unexpectedPortalCalls.push(address);
    throw new Error("The analysis endpoint must not perform official portal fetches.");
  };

  try {
    const response = await handler(makeEvent({
      message: "Government scholarship for university agriculture students in 2031, rural research bursary 71QZ.",
      language: "en"
    }, { "x-nf-client-connection-ip": "203.0.113.101" }));
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 200);
    assert.equal(modelStarted, true);
    assert.deepEqual(unexpectedPortalCalls, []);
    assert.equal(body.aiAnalysis.status, "ready");
    assert.equal(body.officialSearch.status, "pending");
    assert.equal(body.webEvidence.status, "pending");
    assert.equal(body.webEvidence.searchExecuted, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previousToken;
    if (previousSearchFlag === undefined) delete process.env.OFFICIAL_SOURCE_SEARCH_ENABLED;
    else process.env.OFFICIAL_SOURCE_SEARCH_ENABLED = previousSearchFlag;
  }
});

test("official search endpoint returns live scholarship listings and conservative evidence status", async () => {
  const html = [
    "<table>",
    "<tr><th>No</th><th>Title</th><th>Files</th><th>Link</th><th>Published</th><th>Action</th></tr>",
    "<tr><td>১</td><td>Government Scholarships for University Students Academic Year 2027</td><td></td><td></td><td>০৬-০৮-২০২৬</td><td><a href='/pages/moedu-scholarships/api-test-2027'>দেখুন</a></td></tr>",
    "</table>"
  ].join("");

  const result = await officialSearchHandler(
    makeEvent({
      message: "A government scholarship for university students offers 50,000 BDT for the 2027 academic year.",
      language: "en"
    }, { "x-nf-client-connection-ip": "203.0.113.102" }),
    {
      OFFICIAL_SOURCE_SEARCH_ENABLED: "true",
      CORS_ALLOWED_ORIGINS: allowedOrigin
    },
    null,
    async () => new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" }
    })
  );
  const body = JSON.parse(result.body);
  assert.equal(result.statusCode, 200);
  assert.equal(body.officialSearch.status, "results_found");
  assert.equal(body.officialSearch.sources.length > 0, true);
  assert.equal(body.officialSearch.sources[0].publishedDate, "06-08-2026");
  assert.equal(body.claimVerification.officialSearchStatus, "results_found");
  assert.equal(body.claimVerification.officialEvidenceStatus, "related_official_notice");
  assert.match(body.officialSearch.evidenceAssessment.summary_en, /does not authenticate/i);
});


test("URL-only official-search requests never search generic message-safety portals", async () => {
  let fetchCalls = 0;
  const response = await officialSearchHandler(
    makeEvent({
      message: "URL-only structure review. Hostname: 18plus.example. Local URL-pattern indicators: none detected.",
      contextType: "url"
    }),
    { OFFICIAL_SOURCE_SEARCH_ENABLED: "true" },
    null,
    async () => {
      fetchCalls += 1;
      throw new Error("URL-only reviews must not fetch message-category sources.");
    }
  );
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(fetchCalls, 0);
  assert.equal(body.officialSearch.status, "not_applicable");
  assert.equal(body.webEvidence.searched, false);
  assert.equal(body.webEvidence.searchExecuted, false);
  assert.equal(body.webEvidence.sources.length, 0);
  assert.equal(body.claimVerification.status, "not_applicable");
});

test("URL-only analyze requests do not receive generic message RAG or a message risk score", async () => {
  const response = await handler(
    makeEvent({
      message: "URL-only structure review. Hostname: 18plus.example. Local URL-pattern indicators: none detected.",
      contextType: "url"
    }),
    { OFFICIAL_SOURCE_SEARCH_ENABLED: "true" },
    null,
    null
  );
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.riskScore, null);
  assert.equal(body.riskLevel, "unknown");
  assert.equal(body.verdict, "uncertain");
  assert.deepEqual(body.retrievedSources, []);
  assert.equal(body.officialSearch.status, "not_applicable");
  assert.equal(body.webEvidence.searched, false);
  assert.equal(body.claimVerification.status, "not_applicable");
});
