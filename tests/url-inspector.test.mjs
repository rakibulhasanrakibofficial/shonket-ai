import test from "node:test";
import assert from "node:assert/strict";
import { buildUrlReviewContext, inspectUrl } from "../src/services/urlInspectorService.js";

test("accepts a bare domain and normalises it to HTTPS", () => {
  const result = inspectUrl("www.example.com");
  assert.equal(result.host, "www.example.com");
  assert.equal(result.rootDomain, "example.com");
  assert.equal(result.protocol, "https:");
  assert.equal(result.riskScore, 0);
  assert.equal(result.riskLevel, "no_obvious_signals");
});

test("accepts explicit HTTP and HTTPS URLs and host:port input", () => {
  assert.equal(inspectUrl("https://example.com").protocol, "https:");
  assert.equal(inspectUrl("http://example.com").protocol, "http:");
  assert.ok(inspectUrl("http://example.com").signals.some(signal => signal.id === "insecure_http"));
  assert.equal(inspectUrl("example.com:8080").protocol, "https:");
  assert.ok(inspectUrl("example.com:8080").signals.some(signal => signal.id === "port"));
});

test("rejects empty, malformed, unsupported-scheme, local and incomplete addresses", () => {
  for (const input of [
    "", "   ", "not a url", "example", "localhost", "https://",
    "javascript:alert(1)", "ftp://example.com", "https://exa mple.com",
    "https://example.com/" + "a".repeat(2050),
    "https://999.999.999.999",
    "https://com.bd"
  ]) {
    assert.throws(() => inspectUrl(input), undefined, "should reject: " + input.slice(0, 60));
  }
});

test("estimates common compound public suffixes correctly", () => {
  assert.equal(inspectUrl("https://portal.example.com.bd").rootDomain, "example.com.bd");
  assert.equal(inspectUrl("https://sub.example.co.uk").rootDomain, "example.co.uk");
  assert.equal(inspectUrl("https://a.example.com.au").rootDomain, "example.com.au");
});

test("detects a brand-name mismatch and combines independent URL indicators", () => {
  const result = inspectUrl("https://bkash-bonus.xyz/login?otp=123456");
  assert.match(result.linkCategory, /brand impersonation/i);
  assert.ok(result.signals.some(signal => signal.id === "brand"));
  assert.ok(result.signals.some(signal => signal.id === "phishing"));
  assert.ok(result.signals.some(signal => signal.id === "identity"));
  assert.ok(result.riskScore >= 70);
  assert.equal(result.riskLevel, "high");
});

test("does not flag a genuine known brand subdomain as a brand mismatch", () => {
  const result = inspectUrl("https://secure.bkash.com/login");
  assert.equal(result.rootDomain, "bkash.com");
  assert.ok(!result.signals.some(signal => signal.id === "brand"));
  assert.equal(result.linkCategory, "bKash digital financial service");
});

test("does not flag known official auxiliary brand domains as impersonation", () => {
  const officialDomains = [
    "https://accounts.googleusercontent.com",
    "https://www.googleapis.com",
    "https://fonts.gstatic.com",
    "https://static.xx.fbcdn.net",
    "https://www.facebook.net",
    "https://www.paypalobjects.com",
    "https://images-na.ssl-images-amazon.com",
    "https://login.microsoftonline.com",
    "https://www.icloud.com",
    "https://www.google.co.uk",
    "https://www.google.com.bd",
    "https://www.amazon.co.uk",
    "https://www.amazon.in"
  ];
  for (const url of officialDomains) {
    const result = inspectUrl(url);
    assert.ok(!result.signals.some(signal => signal.id === "brand"), url + " must not be flagged as brand impersonation");
  }
});

test("still flags brand words attached to an unrelated registered domain", () => {
  for (const url of [
    "https://google-login-secure.example.net",
    "https://facebook-recovery.example.org",
    "https://paypal-refund.example.com",
    "https://amazon-prize.example.net"
  ]) {
    const result = inspectUrl(url);
    assert.ok(result.signals.some(signal => signal.id === "brand"), url + " should be flagged");
  }
});

test("recognises Punycode, URL credentials, unusual ports and subdomain chains", () => {
  assert.ok(inspectUrl("https://xn--e1afmkfd.xn--p1ai").signals.some(signal => signal.id === "punycode"));
  assert.ok(inspectUrl("https://user:pass@example.com").signals.some(signal => signal.id === "userinfo"));
  assert.ok(inspectUrl("https://example.com:8443").signals.some(signal => signal.id === "port"));
  assert.ok(inspectUrl("https://a.b.example.com").signals.some(signal => signal.id === "deep"));
});

test("recognises common URL shorteners", () => {
  const result = inspectUrl("https://bit.ly/abc123");
  assert.ok(result.signals.some(signal => signal.id === "shortener"));
  assert.equal(result.riskLevel, "low");
});

test("recognises IPv4 and IPv6 hostnames", () => {
  assert.ok(inspectUrl("https://192.0.2.10").signals.some(signal => signal.id === "ip"));
  assert.ok(inspectUrl("http://[2001:db8::1]").signals.some(signal => signal.id === "ip"));
});

test("default ports do not create a non-standard-port warning", () => {
  assert.ok(!inspectUrl("http://example.com:80").signals.some(signal => signal.id === "port"));
  assert.ok(!inspectUrl("https://example.com:443").signals.some(signal => signal.id === "port"));
});

test("malformed percent-encoding cannot crash the URL inspection", () => {
  assert.doesNotThrow(() => inspectUrl("https://example.com/search?q=%E0%A4%A"));
});

test("category hints are separate from the URL-pattern score", () => {
  const result = inspectUrl("https://18plus.example");
  assert.match(result.linkCategory, /18\+/i);
  assert.equal(result.categorySource, "Keyword hint from the domain or URL wording");
  assert.equal(result.riskScore, 0);
  assert.equal(result.riskLevel, "no_obvious_signals");
  assert.ok(!result.signals.some(signal => signal.id === "adult_bait"));
});

test("category words in a path are not automatically treated as scam indicators", () => {
  const result = inspectUrl("https://example.com/xxx");
  assert.match(result.linkCategory, /18\+/i);
  assert.equal(result.riskScore, 0);
});

test("review context contains only the hostname and local signal IDs", () => {
  const result = inspectUrl("https://bkash-bonus.xyz/login?reset_token=do-not-send-this");
  const context = buildUrlReviewContext(result);
  assert.match(context, /bkash-bonus\.xyz/);
  assert.match(context, /brand/);
  assert.doesNotMatch(context, /reset_token|do-not-send-this|\/login/);
  assert.doesNotMatch(context, /phishing, smishing, brand impersonation, credential theft/i);
});

test("common category hints are not treated as security warnings", () => {
  const examples = [
    ["https://18plus.example", /18\+/i],
    ["https://example.com/dating", /Dating/i],
    ["https://casino.example", /Gambling/i],
    ["https://bank.example", /Banking/i],
    ["https://loan.example", /Loan/i],
    ["https://crypto.example", /Cryptocurrency/i],
    ["https://shop.example", /Shopping/i],
    ["https://social.example", /Social media/i],
    ["https://school.example", /Education/i],
    ["https://news.example", /News/i],
    ["https://video.example", /Video/i],
    ["https://developer.example", /Developer/i],
    ["https://cloud.example", /Cloud storage/i],
    ["https://download.example", /Software/i],
    ["https://government.example", /Government/i],
    ["https://clinic.example", /Healthcare/i]
  ];
  for (const [url, category] of examples) {
    const result = inspectUrl(url);
    assert.match(result.linkCategory, category, url);
    assert.equal(result.riskScore, 0, url + " category must not automatically increase scam score");
    assert.deepEqual(result.signals, [], url + " category must not automatically create a scam signal");
  }
});

test("port inputs are not mistaken for unsupported URL schemes", () => {
  const result = inspectUrl("example.com:3000/path");
  assert.equal(result.host, "example.com");
  assert.ok(result.signals.some(signal => signal.id === "port"));
});


test("rejects malformed public TLDs, empty labels and deceptive backslashes", () => {
  for (const input of [
    "https://example.c",
    "https://example.123",
    "https://example.-com",
    "https://example.com-",
    "https://example..com",
    "https:\\\\example.com\\\\login"
  ]) {
    assert.throws(() => inspectUrl(input), undefined, "should reject: " + input);
  }
});

test("estimates hosted-app tenant domains instead of the hosting provider domain", () => {
  const cases = [
    ["https://rakibulhasan.github.io", "rakibulhasan.github.io"],
    ["https://my-campus.pages.dev", "my-campus.pages.dev"],
    ["https://shonket-ai.vercel.app", "shonket-ai.vercel.app"],
    ["https://shonket-ai.netlify.app", "shonket-ai.netlify.app"],
    ["https://my-project.workers.dev", "my-project.workers.dev"],
    ["https://service.onrender.com", "service.onrender.com"]
  ];
  for (const [url, expectedDomain] of cases) {
    assert.equal(inspectUrl(url).rootDomain, expectedDomain, url);
  }
});

test("URL review context explains that separate public web evidence may be shown without leaking paths", () => {
  const result = inspectUrl("https://bkash-bonus.xyz/login?reset_token=secret-token-value");
  const context = buildUrlReviewContext(result);
  assert.match(context, /separate public web search may retrieve references/i);
  assert.match(context, /do not verify reputation, ownership, malware status/i);
  assert.doesNotMatch(context, /secret-token-value|reset_token|\/login/i);
});

test("recognizes common gambling-brand hostnames as restricted search categories", () => {
  for (const hostname of [
    "https://bet365.com",
    "https://betway.com",
    "https://1xbet.com",
    "https://parimatch.com",
    "https://mostbet.com"
  ]) {
    const result = inspectUrl(hostname);
    assert.equal(result.publicSearchRestricted, true, hostname);
    assert.match(result.restrictedSearchCategory, /Gambling/i, hostname);
    assert.equal(result.riskScore, 0, hostname);
  }
});

test("restricted path categories are preserved even when a known domain label wins display identity", () => {
  const adultPath = inspectUrl("https://google.com/xxx");
  assert.match(adultPath.linkCategory, /Google/i);
  assert.equal(adultPath.publicSearchRestricted, true);
  assert.match(adultPath.restrictedSearchCategory, /Age-restricted/i);
  assert.equal(adultPath.riskScore, 0);

  const plusPath = inspectUrl("https://example.com/18+");
  assert.equal(plusPath.publicSearchRestricted, true);
  assert.match(plusPath.restrictedSearchCategory, /18\+/i);
  assert.equal(plusPath.riskScore, 0);

  const encodedPlusPath = inspectUrl("https://example.com/18%2B");
  assert.equal(encodedPlusPath.publicSearchRestricted, true);
  assert.match(encodedPlusPath.restrictedSearchCategory, /18\+/i);

  const encodedPlusQuery = inspectUrl("https://example.com/?category=18%2B");
  assert.equal(encodedPlusQuery.publicSearchRestricted, true);
  const gamblingPath = inspectUrl("https://google.com/casino");
  assert.match(gamblingPath.linkCategory, /Google/i);
  assert.equal(gamblingPath.publicSearchRestricted, true);
  assert.match(gamblingPath.restrictedSearchCategory, /Gambling/i);
  assert.equal(gamblingPath.riskScore, 0);
});

test("Google-looking hostname is explained as a brand mismatch, not as a keyword category hint", () => {
  const result = inspectUrl("https://google-security-update2026.com-login.xyz");
  assert.equal(result.host, "google-security-update2026.com-login.xyz");
  assert.equal(result.rootDomain, "com-login.xyz");
  assert.equal(result.categorySource, "Brand-name mismatch against estimated base domain");
  assert.match(result.linkCategory, /Possible google brand impersonation/i);
  assert.ok(result.signals.some(signal => signal.id === "brand"));
  assert.equal(result.riskScore, 40);
  assert.equal(result.riskLevel, "medium");
});


test("brand matching uses token boundaries and avoids common-word false positives", () => {
  for (const url of [
    "https://notgoogle.example",
    "https://applepie.example",
    "https://facebooker.example",
    "https://myamazonian.example"
  ]) {
    const result = inspectUrl(url);
    assert.ok(!result.signals.some(signal => signal.id === "brand"), url + " must not be flagged from a substring alone");
  }
  for (const url of [
    "https://google2026-login.example",
    "https://secure-google-pay.example",
    "https://apple-verify.example",
    "https://paypal2-account.example"
  ]) {
    const result = inspectUrl(url);
    assert.ok(result.signals.some(signal => signal.id === "brand"), url + " contains a standalone brand token");
  }
});

test("URL review context keeps encoded query and fragment secrets local", () => {
  const result = inspectUrl("https://example.com/reset?token=abc%2F123&email=user%40example.com#private-fragment");
  const context = buildUrlReviewContext(result);
  assert.match(context, /Hostname: example\.com/);
  assert.doesNotMatch(context, /abc|123|user|private-fragment|reset|token|email/i);
});
