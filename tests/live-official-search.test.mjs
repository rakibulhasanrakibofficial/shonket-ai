import test from "node:test";
import assert from "node:assert/strict";
import {
  compareEvidence,
  detectSearchCategories,
  isAllowedGovUrl,
  isAllowedSourceUrl,
  isOfficialSourceSearchApplicable,
  normaliseDigits,
  parseListingRows,
  searchOfficialSources
} from "../netlify/functions/live-official-search.mjs";

const scholarshipPortal = {
  id: "shed-scholarships",
  agency: "Secondary and Higher Education Division, Ministry of Education",
  listingUrl: "https://shed.gov.bd/pages/moedu-scholarships"
};

const listingHtml = [
  "<table>",
  "<tr><th>No</th><th>Title</th><th>Files</th><th>Link</th><th>Published</th><th>Action</th></tr>",
  "<tr><td>১</td><td>Egyptian Government Scholarships and Al-Azhar Scholarships for the Academic Year 2026 to 2027.</td><td></td><td></td><td>০৬-০৮-২০২৬</td><td><a href='/pages/moedu-scholarships/egypt-scholarship-2026'>দেখুন</a></td></tr>",
  "<tr><td>২</td><td>Fake external scholarship offer</td><td></td><td></td><td>০৭-০৮-২০২৬</td><td><a href='https://shed.gov.bd.evil.example/phish'>দেখুন</a></td></tr>",
  "</table>"
].join("");

test("URL Inspector security context triggers the selected cybersecurity source group", () => {
  const categories = detectSearchCategories(
    "Link Inspector security review. Domain only: bkash-bonus.xyz. " +
    "URL structure indicators: brand impersonation, phishing, smishing, fake login, suspicious payment and malicious download."
  );
  assert.ok(categories.includes("cybersecurity"));
  assert.ok(isOfficialSourceSearchApplicable(
    "URL domain check for a possible phishing and smishing website."
  ));
});

test("Bengali digits are normalised before date parsing", () => {
  assert.equal(normaliseDigits("০৬-০৮-২০২৬"), "06-08-2026");
});

test("official listing parser returns title, date and same-host notice link only", () => {
  const records = parseListingRows(listingHtml, scholarshipPortal);
  assert.equal(records.length, 1);
  assert.match(records[0].title, /Egyptian Government Scholarships/i);
  assert.equal(records[0].publishedDate, "06-08-2026");
  assert.equal(records[0].publishedDateISO, "2026-08-06");
  assert.equal(records[0].url, "https://shed.gov.bd/pages/moedu-scholarships/egypt-scholarship-2026");
});

test("government-source allowlist rejects lookalike hosts, HTTP and external domains", () => {
  assert.equal(isAllowedGovUrl("https://shed.gov.bd/pages/notices", "shed.gov.bd"), true);
  assert.equal(isAllowedGovUrl("http://shed.gov.bd/pages/notices", "shed.gov.bd"), false);
  assert.equal(isAllowedGovUrl("https://shed.gov.bd.evil.example/path", "shed.gov.bd"), false);
  assert.equal(isAllowedGovUrl("https://evil.example/shed.gov.bd", "shed.gov.bd"), false);
});

test("live search retrieves official notice listings with publication dates", async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(String(url));
    return new Response(listingHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  };

  const result = await searchOfficialSources(
    "A government scholarship for university students offers 50,000 BDT for the 2027 academic year",
    { fetchImpl }
  );

  assert.equal(result.status, "results_found");
  assert.equal(calls.length, 3);
  assert.equal(result.searchedPortals.length, 3);
  assert.ok(result.sources.length > 0);
  assert.ok(result.sources.some(source => source.publishedDate === "06-08-2026"));
  assert.ok(result.sources.every(source => source.url.startsWith("https://") && source.url.includes(".gov.bd/")));
  assert.equal(result.evidenceAssessment.status, "related_official_notice");
  assert.match(result.evidenceAssessment.summary_en, /does not authenticate/i);
  assert.equal(result.sources[0].detailFetched, false);
});

test("a partial portal outage is not reported as a complete no-result search", async () => {
  const fetchImpl = async url => {
    if (String(url).includes("dshe.gov.bd")) throw new Error("simulated portal outage");
    return new Response("<html><body><table></table></body></html>", {
      status: 200,
      headers: { "Content-Type": "text/html" }
    });
  };

  const result = await searchOfficialSources(
    "Bangladesh undergraduate scholarship university academic grant 2027",
    { fetchImpl }
  );

  assert.equal(result.status, "partial_unavailable");
  assert.equal(result.failedPortalCount, 1);
  assert.equal(result.searchedPortals.length, 2);
  assert.equal(result.evidenceAssessment.status, "search_unavailable");
  assert.match(result.summary_en, /Some official sources could not be checked/i);
});

test("unmatched claims are not marked false or fraudulent", () => {
  const result = compareEvidence("Government scholarship for university students", [], "no_results");
  assert.equal(result.status, "no_matching_notice_found");
  assert.match(result.summary_en, /does not prove the claim is false/i);
});

test("an amount mismatch in a related notice is flagged as possible conflict, not proof", () => {
  const result = compareEvidence(
    "Government scholarship provides 50,000 BDT",
    [{ title: "Government scholarship provides 40,000 BDT", evidenceType: "government_listing_match" }],
    "results_found"
  );
  assert.equal(result.status, "possible_amount_conflict");
  assert.match(result.summary_en, /Review the original notice/i);
});

test("an unrelated greeting does not trigger an official-source search", async () => {
  let calls = 0;
  const result = await searchOfficialSources("Hello, how are you today?", {
    fetchImpl: async () => {
      calls += 1;
      throw new Error("out-of-scope greetings must not trigger source requests");
    }
  });
  assert.equal(calls, 0);
  assert.equal(result.status, "not_applicable");
  assert.equal(isOfficialSourceSearchApplicable("Hello, how are you today?"), false);
});

test("a prize plus processing-fee claim triggers official cyber safety guidance", async () => {
  let calls = 0;
  const html = "<html><body><h1>Official safety guidance</h1><p>Prize scams, advance fees, OTP requests and fake links are common warning signs.</p></body></html>";
  const result = await searchOfficialSources("You won a prize. Pay a processing fee to claim it.", {
    fetchImpl: async () => {
      calls += 1;
      return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    }
  });
  assert.ok(calls > 0);
  assert.equal(result.status, "guidance_only");
  assert.ok(result.category.includes("cybersecurity"));
  assert.ok(result.sources.some(source => source.evidenceType === "official_safety_guidance"));
  assert.equal(result.evidenceAssessment.status, "contextual_guidance");
  assert.match(result.summary_en, /does not authenticate|no government notice/i);
});

test("generic private-sector job messages use scam guidance without pretending to match a government vacancy", async () => {
  const result = await searchOfficialSources(
    "Your CV was selected for a remote job. Pay a registration fee to confirm your position.",
    {
      fetchImpl: async () => new Response("<html><body><h1>Common scams</h1><p>Fake job offers can request registration fees.</p></body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" }
      })
    }
  );
  assert.equal(result.status, "guidance_only");
  assert.ok(result.category.includes("jobs"));
  assert.ok(result.sources.every(source => source.evidenceType !== "government_listing_match"));
  assert.ok(!result.searchedPortals.some(source => source.agency.includes("Alljobs by Teletalk")));
});

test("government job claims include the official Teletalk recruitment listing", async () => {
  const calls = [];
  const html = "<html><body><table><tr><th>No</th><th>Title</th><th>Date</th><th>Action</th></tr><tr><td>1</td><td>Office Assistant Recruitment Notice — Department of Example</td><td>03-11-2026</td><td><a href='/jobs/government/123'>View</a></td></tr></table></body></html>";
  const result = await searchOfficialSources("Government job recruitment notice for office assistant, apply through Teletalk.", {
    fetchImpl: async url => {
      calls.push(String(url));
      return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
    }
  });
  assert.ok(calls.some(url => url.includes("alljobs.teletalk.com.bd")));
  assert.ok(result.sources.some(source => source.evidenceType === "government_listing_match"));
});

test("message categories route only supported contexts to official source groups", () => {
  assert.ok(detectSearchCategories("Your bKash cash-in was successful.").includes("mobile_money"));
  assert.equal(detectSearchCategories("Your parcel delivery is scheduled for tomorrow. No payment is requested.").length, 0);
  assert.ok(detectSearchCategories("Your parcel is held. Pay a redelivery fee using this suspicious link now.").includes("cybersecurity"));
  assert.equal(isOfficialSourceSearchApplicable("Your parcel delivery is scheduled for tomorrow. No payment is requested."), false);
  assert.equal(isOfficialSourceSearchApplicable("Your parcel is held. Pay a redelivery fee using this suspicious link now."), true);
  assert.ok(detectSearchCategories("Your SIM card will be blocked. Verify now.").includes("telecom"));
  assert.ok(detectSearchCategories("Your online order refund is pending.").includes("commerce"));
  assert.ok(detectSearchCategories("Your bank account requires verification.").includes("banking"));
});

test("a normal courier notification does not trigger irrelevant official-source fetches", async () => {
  let calls = 0;
  const result = await searchOfficialSources(
    "Your parcel delivery is scheduled for tomorrow. Please check the tracking status in the courier app you already use. No payment is requested in this message.",
    {
      fetchImpl: async () => {
        calls += 1;
        throw new Error("A routine delivery update must not fetch unrelated cyber advisories.");
      }
    }
  );
  assert.equal(calls, 0);
  assert.equal(result.status, "not_applicable");
  assert.deepEqual(result.sources, []);
  assert.deepEqual(result.searchedPortals, []);
});

test("a courier redelivery-fee message with an explicit suspicious link retrieves only smishing guidance", async () => {
  const calls = [];
  const html = "<html><body><h1>SMS phishing advisory</h1><p>Smishing messages use suspicious links and malicious links to steal credentials.</p></body></html>";
  const result = await searchOfficialSources(
    "Your parcel is held. Pay a redelivery fee using this suspicious link now.",
    {
      fetchImpl: async url => {
        calls.push(String(url));
        return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
      }
    }
  );
  assert.equal(result.status, "guidance_only");
  assert.equal(calls.length, 1);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].id, "cirt-smishing");
  assert.ok(!result.sources.some(source => source.id === "bkash-security-tips" || source.id === "scamcheck-common-scams"));
});

test("Nagad messages do not retrieve bKash-specific references", async () => {
  let calls = 0;
  const result = await searchOfficialSources("Your Nagad cash-in was successful.", {
    fetchImpl: async () => {
      calls += 1;
      throw new Error("No bKash reference should be fetched for a Nagad message.");
    }
  });
  assert.equal(calls, 0);
  assert.equal(result.status, "not_applicable");
  assert.deepEqual(result.sources, []);
});

test("a direct Banglish Nagad OTP request retrieves only relevant ScamCheck safety guidance", async () => {
  const calls = [];
  const result = await searchOfficialSources(
    "Apnar Nagad account bondho hoye jabe. OTP ta ekhoni bolun.",
    {
      fetchImpl: async url => {
        calls.push(String(url));
        return new Response(
          "<html><body><h1>Online Safety</h1><p>Never share OTP codes, PINs or passwords. Mobile banking scams may ask for verification codes.</p></body></html>",
          { status: 200, headers: { "Content-Type": "text/html" } }
        );
      }
    }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0], "https://scamcheck.gov.bd/common-scams-in-bangladesh/");
  assert.equal(result.status, "guidance_only");
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].id, "scamcheck-common-scams");
  assert.ok(result.sources[0].matchedTerms.includes("otp"));
  assert.ok(!result.sources.some(source => source.id.startsWith("bkash-")));
});

test("an anti-scam warning that says never to share an OTP does not trigger credential-request guidance", async () => {
  let calls = 0;
  const result = await searchOfficialSources(
    "Never share your OTP or PIN with anyone.",
    {
      fetchImpl: async () => {
        calls += 1;
        throw new Error("An anti-scam warning must not trigger credential-request search.");
      }
    }
  );

  assert.equal(calls, 0);
  assert.equal(result.status, "not_applicable");
  assert.deepEqual(result.sources, []);
});

test("official source links allow only HTTPS on the exact configured hostname", () => {
  assert.equal(isAllowedSourceUrl("https://www.bkash.com/page/security-tips", "https://www.bkash.com/page/security-tips"), true);
  assert.equal(isAllowedSourceUrl("http://www.bkash.com/page/security-tips", "https://www.bkash.com/page/security-tips"), false);
  assert.equal(isAllowedSourceUrl("https://www.bkash.com.evil.example/page/security-tips", "https://www.bkash.com/page/security-tips"), false);
  assert.equal(isAllowedSourceUrl("https://evil.example/page/security-tips", "https://www.bkash.com/page/security-tips"), false);
});

test("education scholarships still trigger live official portal search", async () => {
  let calls = 0;
  const result = await searchOfficialSources(
    "A government scholarship for university students offers an academic grant.",
    {
      fetchImpl: async () => {
        calls += 1;
        return new Response("<html><body><table></table></body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" }
        });
      }
    }
  );
  assert.equal(calls, 3);
  assert.equal(result.searchedPortals.length, 3);
});


test("guidance references with no matching message terms are not surfaced as relevant", async () => {
  const result = await searchOfficialSources(
    "You have won a cash prize. Pay a processing fee to claim it.",
    {
      fetchImpl: async url => {
        const address = String(url);
        const html = address.includes("scamcheck.gov.bd")
          ? "<html><body><h1>Common Scams</h1><p>Prize scams may ask people to pay a processing fee before receiving a reward.</p></body></html>"
          : "<html><body><nav>About us Home Who we are Services Contact and publications</nav><main>General information and institutional contact details.</main></body></html>";
        return new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });
      }
    }
  );

  assert.equal(result.status, "guidance_only");
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].id, "scamcheck-common-scams");
  assert.ok(result.sources[0].matchedTerms.length > 0);
});
