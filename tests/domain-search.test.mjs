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
  assert.equal(body.webEvidence.sources[0].queryType, "domain_identity");
  assert.equal(body.webEvidence.sources[0].evidenceCategory, "official_site_page");
  assert.match(body.webEvidence.sources[0].userBenefit_en, /first-party page/i);
  assert.equal(body.webEvidence.identityReferenceCount, 1);
  assert.equal(body.webEvidence.securityReferenceCount, 0);
  assert.ok(body.webEvidence.provider.includes("DuckDuckGo"));
  // The first, security-focused query rejects this non-security page and
  // tries its fallback providers; the identity query then finds the /about page.
  assert.equal(calls.length, 4);
  assert.ok(calls.some(url => url.startsWith("https://html.duckduckgo.com/html/?q=")));
  assert.ok(calls.some(url => url.startsWith("https://lite.duckduckgo.com/lite/?q=")));
  assert.ok(calls.some(url => url.startsWith("https://www.bing.com/search?q=")));
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
  assert.equal(falseEvidence.status, "no_results", JSON.stringify(falseEvidence));
  assert.equal(falseEvidence.sourceCount, 0, JSON.stringify(falseEvidence));

  const exactMentionPage = resultPage({
    title: "Security research bulletin",
    url: "https://security.example.org/advisory",
    snippet: "This security report contains an exact-match-mention-unique.net reference."
  });
  const exactMention = await domainSearchHandler(
    makeEvent({ hostname: "exact-match-mention-unique.net", rootDomain: "exact-match-mention-unique.net" }),
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
test("server-side restrictions cover common adult and gambling host labels", async () => {
  let fetchCount = 0;
  const restrictedHosts = [
    "onlyfans.com",
    "xvideos.com",
    "xnxx.com",
    "pornhub.com",
    "bet365.com",
    "betway.com",
    "1xbet.com",
    "parimatch.com",
    "mostbet.com"
  ];
  for (const hostname of restrictedHosts) {
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
    assert.equal(response.statusCode, 200, hostname);
    assert.equal(evidence.status, "restricted_category", hostname);
    assert.equal(evidence.searched, false, hostname);
    assert.equal(evidence.searchExecuted, false, hostname);
    assert.deepEqual(evidence.sources, [], hostname);
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

test("domain evidence filters generic homepage-adjacent pages and labels useful source types", async () => {
  const html = [
    resultPage({
      title: "GitHub — Change is constant",
      url: "https://github.com/",
      snippet: "GitHub is a software development platform."
    }),
    resultPage({
      title: "Sign in to GitHub",
      url: "https://github.com/login",
      snippet: "Sign in to GitHub and access your account."
    }),
    resultPage({
      title: "Download GitHub Desktop",
      url: "https://desktop.github.com/",
      snippet: "Download GitHub Desktop for your computer."
    }),
    resultPage({
      title: "GitHub.com security and malware report",
      url: "https://www.virustotal.com/gui/domain/github.com",
      snippet: "Public security analysis and malware detections for github.com."
    }),
    resultPage({
      title: "GitHub Reviews",
      url: "https://www.trustpilot.com/review/github.com",
      snippet: "Customer reviews and ratings for github.com."
    })
  ].join("");
  const response = await domainSearchHandler(
    makeEvent({ hostname: "github.com", rootDomain: "github.com" }),
    {},
    null,
    async () => new Response(html, { status: 200, headers: { "Content-Type": "text/html" } })
  );
  const evidence = JSON.parse(response.body).webEvidence;

  assert.equal(evidence.status, "results_found");
  assert.ok(evidence.sources.some(source => source.evidenceCategory === "security_reference"));
  assert.ok(evidence.sources.some(source => source.evidenceCategory === "independent_review"));
  assert.ok(evidence.sources.some(source => source.evidenceCategory === "official_site_page"));
  assert.ok(!evidence.sources.some(source => /login|download/i.test(source.title + " " + source.url)));
  assert.ok(evidence.securityReferenceCount >= 1);
  assert.ok(evidence.identityReferenceCount >= 1);
  assert.ok(evidence.sources.every(source => source.userBenefit_en && source.evidenceLabel_en));
});

test("a domain appearing in a generic title is not enough to publish an unrelated third-party page", async () => {
  const html = resultPage({
    title: "generic-title-only-unique.example.net in a list of popular websites",
    url: "https://random-directory.example.org/top-sites",
    snippet: "A generic list of popular websites with no further information about the submitted hostname."
  });
  const response = await domainSearchHandler(
    makeEvent({ hostname: "generic-title-only-unique.example.net", rootDomain: "generic-title-only-unique.example.net" }),
    {},
    null,
    async () => new Response(html, { status: 200, headers: { "Content-Type": "text/html" } })
  );
  const evidence = JSON.parse(response.body).webEvidence;

  assert.equal(evidence.status, "no_results");
  assert.deepEqual(evidence.sources, []);
});

test("domain search checks both the exact submitted hostname and estimated base domain", async () => {
  const requestedQueries = [];
  const hostname = "google-security-update2026.com-login.xyz";
  const rootDomain = "com-login.xyz";
  const exactHostPage = resultPage({
    title: "Security report mentioning google-security-update2026.com-login.xyz",
    url: "https://www.virustotal.com/gui/domain/google-security-update2026.com-login.xyz",
    snippet: "A public security report mentions google-security-update2026.com-login.xyz."
  });
  const rootDomainPage = resultPage({
    title: "com-login.xyz — website information and support",
    url: "https://com-login.xyz/about",
    snippet: "Information published by com-login.xyz."
  });
  const response = await domainSearchHandler(
    makeEvent({ hostname, rootDomain }),
    {},
    null,
    async url => {
      const query = new URL(String(url)).searchParams.get("q") || "";
      requestedQueries.push(query);
      return new Response(query.includes(hostname) ? exactHostPage : rootDomainPage, {
        status: 200, headers: { "Content-Type": "text/html" }
      });
    }
  );
  const evidence = JSON.parse(response.body).webEvidence;
  assert.equal(response.statusCode, 200);
  assert.equal(evidence.hostname, hostname);
  assert.equal(evidence.domain, rootDomain);
  assert.deepEqual(evidence.searchedTargets, [hostname, rootDomain]);
  assert.equal(evidence.queryCount, 4);
  assert.equal(evidence.successfulQueryCount, 4);
  assert.ok(requestedQueries.some(query => query.startsWith('"' + hostname + '"')));
  assert.ok(requestedQueries.some(query => query.startsWith('"' + rootDomain + '"')));
  assert.ok(evidence.sources.some(source => source.evidenceCategory === "security_reference"));
  assert.ok(evidence.sources.some(source => source.evidenceCategory === "official_site_page"));
});
