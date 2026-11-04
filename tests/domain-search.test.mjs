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
    url: "https://example.com/about"
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
  assert.equal(evidence.sourceCount, 0);
  assert.deepEqual(evidence.sources, []);
  assert.match(evidence.summary_en, /do not prove that the website is safe/i);
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
  assert.equal(evidence.sourceCount, 0);
  assert.match(evidence.summary_en, /reputation remains unchecked/i);
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
