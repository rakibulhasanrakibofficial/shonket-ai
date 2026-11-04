import test from "node:test";
import assert from "node:assert/strict";
import { domainSearchHandler } from "../netlify/functions/live-domain-search.mjs";

const origin = "https://rakibulhasanrakibofficial.github.io";

function makeEvent(body, headers = {}, method = "POST") {
  return {
    httpMethod: method,
    headers: {
      origin,
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.80",
      ...headers
    },
    body: method === "POST" ? JSON.stringify(body) : null
  };
}

function resultPage({ title, url, snippet = "" }) {
  return [
    "<html><body><div class=\"result results_links results_links_deep web-result\">",
    "<a class=\"result__a\" href=\"" + url + "\">" + title + "</a>",
    "<div class=\"result__snippet\">" + snippet + "</div>",
    "</div></body></html>"
  ].join("");
}

test("domain search returns relevant exact-domain references and deduplicates repeated results", async () => {
  const calls = [];
  const html = resultPage({
    title: "Example.com — official website and support",
    url: "https://example.com/about",
    snippet: "Information published on the Example.com website."
  });
  const response = await domainSearchHandler(
    makeEvent({ hostname: "www.example.com", rootDomain: "example.com" }),
    {},
    null,
    async url => {
      calls.push(String(url));
      return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    }
  );
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.webEvidence.status, "results_found");
  assert.equal(body.webEvidence.domain, "example.com");
  assert.equal(body.webEvidence.sourceCount, 1);
  assert.equal(body.webEvidence.sources[0].url, "https://example.com/about");
  assert.equal(body.webEvidence.sources[0].queryType, "security_mentions");
  assert.equal(body.webEvidence.provider, "DuckDuckGo");
  assert.equal(calls.length, 2);
  assert.ok(calls.every(url => url.startsWith("https://html.duckduckgo.com/html/?q=")));
  assert.ok(calls.every(url => !url.includes("www.example.com/path")));
});

test("domain search falls back to another provider when the primary provider is unavailable", async () => {
  const bingHtml = '<html><body><li class="b_algo"><h2><a href="https://example-fallback.org/about">Example fallback domain information</a></h2><div class="b_caption"><p>Official information for example-fallback.org.</p></div></li></body></html>';
  const calls = [];
  const response = await domainSearchHandler(
    makeEvent({ hostname: "example-fallback.org", rootDomain: "example-fallback.org" }),
    {},
    null,
    async url => {
      calls.push(String(url));
      if (String(url).startsWith("https://www.bing.com/search?q=")) {
        return new Response(bingHtml, { status: 200, headers: { "Content-Type": "text/html" } });
      }
      return new Response("blocked", { status: 503 });
    }
  );
  const evidence = JSON.parse(response.body).webEvidence;
  assert.equal(evidence.status, "results_found");
  assert.ok(evidence.provider.includes("Bing"));
  assert.equal(evidence.sources.length, 1);
  assert.equal(evidence.sources[0].url, "https://example-fallback.org/about");
  assert.equal(calls.length, 6);
});
test("domain search rejects full URLs, reserved domains and private IP addresses before fetching", async () => {
  let fetchCount = 0;
  const invalidHosts = [
    "https://example.com/path",
    "localhost",
    "service.internal",
    "demo.example",
    "10.0.0.8",
    "192.168.1.1",
    "127.0.0.1",
    "172.16.2.3"
  ];

  for (const hostname of invalidHosts) {
    const response = await domainSearchHandler(
      makeEvent({ hostname }),
      {},
      null,
      async () => {
        fetchCount += 1;
        return new Response("should not be requested", { status: 200 });
      }
    );
    assert.equal(response.statusCode, 400, hostname);
    assert.equal(JSON.parse(response.body).webEvidence.status, "not_searchable");
  }
  assert.equal(fetchCount, 0);
});

test("a mismatched root-domain hint never replaces the submitted hostname", async () => {
  const html = resultPage({
    title: "Example.com public information",
    url: "https://www.example.com/about"
  });
  const response = await domainSearchHandler(
    makeEvent({ hostname: "www.example.com", rootDomain: "attacker.example.net" }),
    {},
    null,
    async () => new Response(html, { status: 200 })
  );
  const body = JSON.parse(response.body);

  assert.equal(body.webEvidence.domain, "www.example.com");
  assert.equal(body.webEvidence.status, "results_found");
});

test("irrelevant search results are filtered rather than shown as domain evidence", async () => {
  const html = resultPage({
    title: "How to choose running shoes",
    url: "https://sports.example.org/shoes",
    snippet: "A guide to footwear."
  });
  const response = await domainSearchHandler(
    makeEvent({ hostname: "no-match-domain-unique.net", rootDomain: "no-match-domain-unique.net" }),
    {},
    null,
    async () => new Response(html, { status: 200 })
  );
  const evidence = JSON.parse(response.body).webEvidence;

  assert.equal(evidence.status, "no_results");
  assert.equal(evidence.searched, true);
  assert.equal(evidence.searchExecuted, true);
  assert.equal(evidence.successfulQueryCount, 2);
  assert.equal(evidence.sourceCount, 0);
  assert.deepEqual(evidence.sources, []);
  assert.match(evidence.summary_en, /do not prove that the website is safe/i);
});

test("domain mentions require hostname boundaries to avoid substring false positives", async () => {
  const falsePositivePage = resultPage({
    title: "Security advice for notexample-domain.test",
    url: "https://security.example.org/advisory",
    snippet: "The separate host is notexample-domain.test and exact-match-relevance-unique.net.evil."
  });
  const falsePositive = await domainSearchHandler(
    makeEvent({ hostname: "exact-match-relevance-unique.net", rootDomain: "exact-match-relevance-unique.net" }),
    {},
    null,
    async () => new Response(falsePositivePage, { status: 200 })
  );
  const falseEvidence = JSON.parse(falsePositive.body).webEvidence;
  assert.equal(falseEvidence.status, "no_results");
  assert.equal(falseEvidence.sourceCount, 0);

  const exactMentionPage = resultPage({
    title: "Security research bulletin",
    url: "https://security.example.org/advisory",
    snippet: "This bulletin contains a report about exact-match-relevance-unique.net."
  });
  const exactMention = await domainSearchHandler(
    makeEvent({ hostname: "exact-match-relevance-unique.net", rootDomain: "exact-match-relevance-unique.net" }),
    {},
    null,
    async () => new Response(exactMentionPage, { status: 200 })
  );
  const exactEvidence = JSON.parse(exactMention.body).webEvidence;
  assert.equal(exactEvidence.status, "results_found");
  assert.equal(exactEvidence.sourceCount, 1);
  assert.equal(exactEvidence.sources[0].domain, "security.example.org");
});

test("provider failure is reported as unavailable and never as safe", async () => {
  const response = await domainSearchHandler(
    makeEvent({ hostname: "example-provider-outage.net" }),
    {},
    null,
    async () => new Response("unavailable", { status: 503 })
  );
  const evidence = JSON.parse(response.body).webEvidence;

  assert.equal(response.statusCode, 200);
  assert.equal(evidence.status, "unavailable");
  assert.equal(evidence.searched, true);
  assert.equal(evidence.searchExecuted, false);
  assert.equal(evidence.successfulQueryCount, 0);
  assert.equal(evidence.sourceCount, 0);
  assert.match(evidence.summary_en, /reputation remains unchecked/i);
});

test("age-restricted and gambling-category domains are not sent to the search provider", async () => {
  let fetchCount = 0;
  for (const hostname of ["adult-content-check.com", "casino-sample-service.net"]) {
    const response = await domainSearchHandler(
      makeEvent({ hostname }),
      {},
      null,
      async () => {
        fetchCount += 1;
        return new Response("must not search", { status: 200 });
      }
    );
    const evidence = JSON.parse(response.body).webEvidence;
    assert.equal(response.statusCode, 200);
    assert.equal(evidence.status, "restricted_category");
    assert.equal(evidence.searched, false);
    assert.deepEqual(evidence.sources, []);
  }
  assert.equal(fetchCount, 0);
});
test("an age-restricted category hint suppresses search even when the hostname looks ordinary", async () => {
  let fetchCount = 0;
  const response = await domainSearchHandler(
    makeEvent({
      hostname: "example-public-domain.net",
      rootDomain: "example-public-domain.net",
      categoryHint: "Age-restricted / 18+ category"
    }),
    {},
    null,
    async () => {
      fetchCount += 1;
      return new Response("must not search", { status: 200 });
    }
  );
  const evidence = JSON.parse(response.body).webEvidence;
  assert.equal(response.statusCode, 200);
  assert.equal(evidence.status, "restricted_category");
  assert.equal(evidence.searched, false);
  assert.equal(evidence.searchExecuted, false);
  assert.equal(fetchCount, 0);
});

test("reserved public suffixes and malformed hostname labels are rejected", async () => {
  let fetchCount = 0;
  for (const hostname of [
    "com.bd",
    "github.io",
    "example.-com",
    "example.com-",
    "example..com",
    "example.123"
  ]) {
    const response = await domainSearchHandler(
      makeEvent({ hostname }),
      {},
      null,
      async () => {
        fetchCount += 1;
        return new Response("", { status: 200 });
      }
    );
    assert.equal(response.statusCode, 400, hostname);
    assert.equal(JSON.parse(response.body).webEvidence.status, "not_searchable", hostname);
  }
  assert.equal(fetchCount, 0);
});

test("actual oversized bodies are rejected even when Content-Length is missing or false", async () => {
  const response = await domainSearchHandler({
    httpMethod: "POST",
    headers: { origin, "cf-connecting-ip": "203.0.113.81" },
    body: JSON.stringify({ hostname: "example.com", extra: "x".repeat(5000) })
  });
  assert.equal(response.statusCode, 413);
});

test("domain search rate limiting returns 429 without contacting the search provider", async () => {
  let fetchCount = 0;
  const response = await domainSearchHandler(
    makeEvent({ hostname: "example-rate-limit.net" }),
    {},
    { async limit() { return { success: false }; } },
    async () => {
      fetchCount += 1;
      return new Response("", { status: 200 });
    }
  );

  assert.equal(response.statusCode, 429);
  assert.equal(response.headers["Retry-After"], "60");
  assert.equal(fetchCount, 0);
});

test("domain search enforces CORS and handles OPTIONS without running search", async () => {
  const blocked = await domainSearchHandler(
    makeEvent({ hostname: "example.com" }, { origin: "https://untrusted.example" }),
    {},
    null,
    async () => new Response("", { status: 200 })
  );
  assert.equal(blocked.statusCode, 403);

  const preflight = await domainSearchHandler(
    makeEvent({}, {}, "OPTIONS"),
    {}
  );
  assert.equal(preflight.statusCode, 204);
  assert.equal(preflight.headers["Access-Control-Allow-Origin"], origin);
});
