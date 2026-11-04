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

test("accepts explicit HTTP and HTTPS URLs", () => {
  assert.equal(inspectUrl("https://example.com").protocol, "https:");
  assert.equal(inspectUrl("http://example.com").protocol, "http:");
  assert.ok(inspectUrl("http://example.com").signals.some(signal => signal.id === "insecure_http"));
});

test("rejects empty, malformed, unsupported-scheme, local and incomplete addresses", () => {
  for (const input of [
    "", "   ", "not a url", "example", "localhost", "https://",
    "javascript:alert(1)", "ftp://example.com", "https://exa mple.com",
    "https://example.com/" + "a".repeat(2050)
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
  const result = inspectUrl("https://www.xnxx.com");
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
