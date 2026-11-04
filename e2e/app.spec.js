import { test, expect } from '@playwright/test';

const API_ORIGIN = 'https://rakibulhasanrakibofficial.github.io';

async function fulfillApiPreflight(route) {
  if (route.request().method() !== 'OPTIONS') return false;
  await route.fulfill({
    status: 204,
    headers: {
      'access-control-allow-origin': API_ORIGIN,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
      'access-control-max-age': '86400'
    }
  });
  return true;
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/official-search', async route => {
    if (await fulfillApiPreflight(route)) return;
    if (await fulfillApiPreflight(route)) return;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        officialSearch: {
          status: 'not_applicable',
          summary_en: 'No supported official-source category matched this message.',
          summary_bn: 'এই বার্তার জন্য live search প্রযোজ্য নয়।',
          sources: [],
          searchedPortals: []
        },
        webEvidence: {
          searched: false,
          searchExecuted: false,
          status: 'not_applicable',
          officialSourcesFound: 0,
          sources: [],
          searchedPortals: []
        },
        claimVerification: { status: 'not_applicable' }
      })
    });
  });
});

test('landing page loads and primary tools are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SHONKET AI/i);
  await expect(page.getByRole('heading', { name: /Don.t trust/i })).toBeVisible();
  const sticker = page.getByAltText(/Official Built For Ostad Presents YUNet AIgnite Buildathon 2026 sticker/i);
  await expect(sticker).toBeVisible();
  await expect.poll(() => sticker.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: /Analyze a message/i }).first()).toBeVisible();
  await expect(page.getByText(/Your browser's speech provider may process microphone audio/i)).toHaveCount(0);
  await expect(page.getByText(/Screenshot text is extracted through Gemini/i)).toHaveCount(0);
  await expect(page.locator('label[for="screenshot-upload"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Speak|কথা বলুন/i })).toBeVisible();

});

test('scam checker accepts text and shows a rule-based result', async ({ page }) => {
  await page.route('**/api/analyze', async route => {
    if (await fulfillApiPreflight(route)) return;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isRelevant: true,
        verdict: 'suspicious',
        riskLevel: 'critical',
        riskScore: 80,
        summary_en: 'The message combines a prize claim with a direct request for an OTP.',
        summary_bn: 'বার্তাটি পুরস্কারের দাবির সঙ্গে OTP চেয়েছে।',
        evidence: [{ reason_en: 'A direct request for an OTP is a credential-theft warning sign.', reason_bn: 'সরাসরি OTP চাওয়া গোপন তথ্য চুরির সতর্কসংকেত।' }],
        tactics: ['credential_request', 'unverified_prize_claim', 'urgency'],
        safe_actions: ['Never share OTPs or passwords.', 'Verify independently through official channels.'],
        uncertainty: 'This is a rule-based text check, not proof of fraud or safety.',
        confidence: 'medium',
        engine: 'Rule-based',
        model: 'deterministic-rules',
        webEvidence: {
          searched: false,
          searchExecuted: false,
          status: 'not_available',
          officialSourcesFound: 0,
          sources: []
        },
        claimVerification: {
          status: 'unverified',
          officialSearchAttempted: true,
          officialSearchStatus: 'guidance_only',
          officialPortalCount: 1,
          officialSourceCount: 1,
          officialEvidenceStatus: 'contextual_guidance',
          summary_bn: 'প্রাসঙ্গিক নিরাপত্তা নির্দেশনা পাওয়া গেছে, তবে এই নির্দিষ্ট দাবির সঙ্গে মিলে যাওয়া সরকারি নোটিশ নিশ্চিত হয়নি।',
          summary_en: 'The live search checked 1 selected official or institutional portal and retrieved general official safety guidance, but did not confirm a notice matching this specific claim.'
        },
        aiAnalysis: {
          status: 'ready',
          explanation_en: 'A direct OTP request tied to a prize claim is a strong warning sign.',
          explanation_bn: 'পুরস্কারের দাবির সঙ্গে OTP চাওয়া একটি শক্তিশালী সতর্কসংকেত।',
          next_steps_en: ['Do not share the OTP.', 'Verify through the official app or website.'],
          next_steps_bn: ['OTP শেয়ার করবেন না।', 'অফিসিয়াল অ্যাপ বা ওয়েবসাইটে যাচাই করুন।']
        },
        retrievedSources: [{
          id: 'cirt-smishing',
          title: 'BGD e-GOV CIRT — Cybersecurity Advisory',
          summary: 'Official guidance about phishing and suspicious messages.',
          url: 'https://cirt.gov.bd/advisories/global-campaign-targeting-bd'
        }],
        officialSearch: {
          status: 'guidance_only',
          category: ['cybersecurity'],
          summary_en: 'Relevant official safety guidance was found, but no notice matching this specific message was confirmed.',
          summary_bn: 'প্রাসঙ্গিক official safety guidance পাওয়া গেছে; তবে এই নির্দিষ্ট বার্তার সঙ্গে মিলে যাওয়া নোটিশ নিশ্চিত হয়নি।',
          scopeNote_en: 'Selected Bangladesh cybersecurity sources only; not a whole-web search.',
          scopeNote_bn: 'নির্বাচিত বাংলাদেশি সাইবার নিরাপত্তা উৎস; পুরো ওয়েবে অনুসন্ধান নয়।',
          evidenceAssessment: {
            status: 'contextual_guidance',
            summary_en: 'The guidance does not authenticate this specific sender or message.',
            summary_bn: 'এই নির্দেশনা নির্দিষ্ট প্রেরক বা বার্তার সত্যতা নিশ্চিত করে না।'
          },
          searchedPortals: [{ agency: 'BGD e-GOV CIRT', listingUrl: 'https://cirt.gov.bd/alerts' }],
          sources: [{
            id: 'cirt-alerts',
            agency: 'BGD e-GOV CIRT',
            title: 'Security Alerts',
            url: 'https://cirt.gov.bd/alerts',
            evidenceType: 'official_safety_guidance',
            evidenceTypeLabel_en: 'OFFICIAL CYBERSECURITY ADVISORY',
            evidenceTypeLabel_bn: 'সরকারি সাইবার নিরাপত্তা সতর্কতা',
            excerpt: 'Official cybersecurity guidance for Bangladesh.'
          }]
        }
      })
    });
  });
  await page.route('**/api/official-search', async route => {
    if (await fulfillApiPreflight(route)) return;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        officialSearch: {
          status: 'guidance_only',
          category: ['cybersecurity'],
          summary_en: 'Relevant official safety guidance was found, but no notice matching this specific message was confirmed.',
          summary_bn: 'প্রাসঙ্গিক নিরাপত্তা নির্দেশনা পাওয়া গেছে।',
          scopeNote_en: 'Selected Bangladesh cybersecurity sources only; not a whole-web search.',
          scopeNote_bn: 'নির্বাচিত বাংলাদেশি সাইবার নিরাপত্তা উৎস।',
          evidenceAssessment: { status: 'contextual_guidance', summary_en: 'The guidance does not authenticate this sender.' },
          searchedPortals: [{ agency: 'BGD e-GOV CIRT', listingUrl: 'https://cirt.gov.bd/alerts' }],
          sources: [{
            id: 'cirt-alerts',
            agency: 'BGD e-GOV CIRT',
            title: 'Security Alerts',
            url: 'https://cirt.gov.bd/alerts',
            evidenceType: 'official_safety_guidance',
            evidenceTypeLabel_en: 'OFFICIAL CYBERSECURITY ADVISORY',
            excerpt: 'Official cybersecurity guidance for Bangladesh.'
          }]
        },
        webEvidence: {
          searched: true,
          searchExecuted: true,
          status: 'evidence_retrieved',
          officialSourcesFound: 1,
          sources: [{ title: 'BGD e-GOV CIRT — Security Alerts', url: 'https://cirt.gov.bd/alerts', domain: 'cirt.gov.bd' }],
          searchedPortals: [{ agency: 'BGD e-GOV CIRT', listingUrl: 'https://cirt.gov.bd/alerts' }]
        },
        claimVerification: {
          status: 'unverified',
          officialSearchAttempted: true,
          officialSearchStatus: 'guidance_only',
          officialPortalCount: 1,
          officialSourceCount: 1,
          officialEvidenceStatus: 'contextual_guidance',
          summary_en: 'The live search checked 1 selected official or institutional portal and retrieved general safety guidance.'
        }
      })
    });
  });
  await page.goto('/');
  await page.locator('#message').fill('Congratulations! You won a cash prize. Send your OTP immediately to claim it.');
  await page.getByRole('button', { name: /Analyze message/i }).click();
  await expect(page.locator('#workspace-panel').getByText(/INSTANT RULE-BASED CHECK/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Why it was flagged' })).toBeVisible();
  await expect(page.getByText('CLAIM VERIFICATION', { exact: true })).toHaveCount(1);
  await expect(page.getByText('UNVERIFIED', { exact: true })).toHaveCount(1);
  await expect(page.getByText(/official portals checked/i)).toHaveCount(1);
  await expect(page.locator('.claim-verification-panel').getByText(/references retrieved/i)).toHaveCount(1);
  await expect(page.getByText('LLM ACTIVE')).toBeVisible();
  await expect(page.getByText('OFFICIAL CYBERSECURITY ADVISORY')).toBeVisible();
  await expect(page.getByText(/LIVE OFFICIAL-SOURCE SEARCH/i)).toBeVisible();
  await expect(page.getByText(/Selected Bangladesh cybersecurity sources only/i)).toBeVisible();
  await expect(page.getByText(/RETRIEVED SAFETY GUIDANCE/i)).toBeVisible();
});


test('risk verdict and score are shown before official source evidence', async ({ page }) => {
  await page.route('**/api/analyze', async route => {
    if (await fulfillApiPreflight(route)) return;
    await new Promise(resolve => setTimeout(resolve, 1600));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isRelevant: true,
        verdict: 'suspicious',
        riskLevel: 'high',
        riskScore: 72,
        summary_en: 'The message asks for an advance fee.',
        summary_bn: 'বার্তাটিতে আগাম ফি চাওয়া হয়েছে।',
        evidence: [],
        tactics: ['upfront_fee'],
        safe_actions: ['Verify independently before paying.'],
        uncertainty: 'The sender and claim have not been independently verified.',
        confidence: 'medium',
        engine: 'Rule-based',
        webEvidence: {
          searched: true,
          status: 'pending',
          officialSourcesFound: 0,
          sources: [
            { title: 'BGD e-GOV CIRT — Security Alerts', url: 'https://cirt.gov.bd/alerts', domain: 'cirt.gov.bd', id: 'cirt-alerts' },
            { title: 'Global Error524 smishing campaign targeting Bangladesh', url: 'https://cirt.gov.bd/advisories/global-error524', domain: 'cirt.gov.bd', id: 'cirt-smishing' },
            { title: 'Common Scams in Bangladesh', url: 'https://scamcheck.gov.bd/common-scams', domain: 'scamcheck.gov.bd', id: 'scamcheck-common-scams' }
          ]
        },
        claimVerification: {
          status: 'unverified',
          officialSearchAttempted: true,
          officialSearchStatus: 'pending',
          officialPortalCount: 0,
          officialSourceCount: 0,
          officialEvidenceStatus: 'pending',
          summary_en: 'Selected official sources are still being checked.'
        },
        aiAnalysis: {
          status: 'ready',
          explanation_en: 'An advance fee is a warning sign.',
          explanation_bn: 'আগাম ফি একটি সতর্কতার সংকেত।',
          next_steps_en: [],
          next_steps_bn: []
        },
        retrievedSources: [{
          id: 'cirt-alerts',
          title: 'BGD e-GOV CIRT — Security Alerts',
          summary: 'General safety guidance about suspicious messages.',
          url: 'https://cirt.gov.bd/alerts'
        }],
        officialSearch: {
          status: 'pending',
          summary_en: 'Relevant official safety guidance was found, but no notice matching this exact message was confirmed.',
          summary_bn: 'প্রাসঙ্গিক নিরাপত্তা নির্দেশনা পাওয়া গেছে।',
          scopeNote_en: 'Selected official sources only.',
          scopeNote_bn: 'শুধু নির্বাচিত সরকারি উৎস।',
          evidenceAssessment: {
            status: 'contextual_guidance',
            summary_en: 'These references do not prove the exact claim.'
          },
          failedPortalCount: 0,
          searchedPortals: [],
          sources: [
            {
              id: 'cirt-alerts',
              agency: 'BGD e-GOV CIRT',
              title: 'Security Alerts',
              url: 'https://cirt.gov.bd/alerts',
              evidenceType: 'official_safety_guidance',
              evidenceTypeLabel_en: 'OFFICIAL CYBERSECURITY ADVISORY',
              excerpt: 'Official cybersecurity guidance for Bangladesh.'
            },
            {
              id: 'cirt-smishing',
              agency: 'BGD e-GOV CIRT',
              title: 'Global Error524 smishing campaign targeting Bangladesh',
              url: 'https://cirt.gov.bd/advisories/global-error524',
              evidenceType: 'official_safety_guidance',
              evidenceTypeLabel_en: 'OFFICIAL CYBERSECURITY ADVISORY',
              excerpt: 'A smishing campaign targets mobile users.'
            },
            {
              id: 'scamcheck-common-scams',
              agency: 'Government of Bangladesh — ScamCheck',
              title: 'Common Scams in Bangladesh',
              url: 'https://scamcheck.gov.bd/common-scams',
              evidenceType: 'official_safety_guidance',
              evidenceTypeLabel_en: 'OFFICIAL SAFETY GUIDANCE',
              excerpt: 'Common scam patterns and safety advice.'
            }
          ]
        }
      })
    });
  });

  await page.route('**/api/official-search', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        officialSearch: {
          status: 'guidance_only',
          summary_en: 'Relevant official guidance was retrieved, but no exact notice was confirmed.',
          summary_bn: 'প্রাসঙ্গিক নিরাপত্তা নির্দেশনা পাওয়া গেছে।',
          scopeNote_en: 'Selected official sources only.',
          scopeNote_bn: 'শুধু নির্বাচিত সরকারি উৎস।',
          evidenceAssessment: { status: 'contextual_guidance', summary_en: 'General guidance does not confirm this exact claim.' },
          failedPortalCount: 0,
          searchedPortals: [
            { agency: 'BGD e-GOV CIRT', listingUrl: 'https://cirt.gov.bd/alerts' },
            { agency: 'ScamCheck', listingUrl: 'https://scamcheck.gov.bd' }
          ],
          sources: [
            { id: 'cirt-alerts', agency: 'BGD e-GOV CIRT', title: 'Security Alerts', url: 'https://cirt.gov.bd/alerts', evidenceType: 'official_safety_guidance', evidenceTypeLabel_en: 'OFFICIAL CYBERSECURITY ADVISORY', excerpt: 'Official cybersecurity guidance for Bangladesh.' },
            { id: 'cirt-smishing', agency: 'BGD e-GOV CIRT', title: 'Global Error524 smishing campaign targeting Bangladesh', url: 'https://cirt.gov.bd/advisories/global-error524', evidenceType: 'official_safety_guidance', evidenceTypeLabel_en: 'OFFICIAL CYBERSECURITY ADVISORY', excerpt: 'A smishing campaign targets mobile users.' },
            { id: 'scamcheck-common-scams', agency: 'Government of Bangladesh — ScamCheck', title: 'Common Scams in Bangladesh', url: 'https://scamcheck.gov.bd/common-scams', evidenceType: 'official_safety_guidance', evidenceTypeLabel_en: 'OFFICIAL SAFETY GUIDANCE', excerpt: 'Common scam patterns and safety advice.' }
          ]
        },
        webEvidence: {
          searched: true,
          searchExecuted: true,
          status: 'evidence_retrieved',
          officialSourcesFound: 3,
          searchedPortals: [
            { agency: 'BGD e-GOV CIRT', listingUrl: 'https://cirt.gov.bd/alerts' },
            { agency: 'ScamCheck', listingUrl: 'https://scamcheck.gov.bd' }
          ],
          sources: [
            { title: 'BGD e-GOV CIRT — Security Alerts', url: 'https://cirt.gov.bd/alerts', domain: 'cirt.gov.bd' },
            { title: 'Global Error524 smishing campaign targeting Bangladesh', url: 'https://cirt.gov.bd/advisories/global-error524', domain: 'cirt.gov.bd' },
            { title: 'Common Scams in Bangladesh', url: 'https://scamcheck.gov.bd/common-scams', domain: 'scamcheck.gov.bd' }
          ],
          failedPortalCount: 0
        },
        claimVerification: {
          status: 'unverified',
          officialSearchAttempted: true,
          officialSearchStatus: 'guidance_only',
          officialPortalCount: 2,
          officialSourceCount: 3,
          officialEvidenceStatus: 'contextual_guidance',
          summary_en: 'Two selected official sources were checked. General guidance was retrieved but no exact notice was confirmed.'
        }
      })
    });
  });

  await page.goto('/');
  await page.locator('#message').fill('Pay a processing fee to claim a prize.');
  await page.getByRole('button', { name: /Analyze message/i }).click();

  const stack = page.locator('#analysis-evidence-stack');
  await expect(stack).toBeVisible({ timeout: 60_000 });
  // The official search endpoint finishes while /api/analyze is intentionally delayed.
  await expect(stack.locator('.official-search-result-card')).toHaveCount(3);
  await expect(page.locator('#analysis-results .ai-explanation-panel')).toContainText('AI EXPLANATION PENDING');
  await expect(stack.locator('.web-evidence-source')).toHaveCount(3);
  await expect(stack.locator('.claim-verification-panel')).toBeVisible();
  await expect(stack.locator('.official-search-result-card')).toHaveCount(3);
  await expect(stack.locator('.retrieved-guidance-panel .retrieved-source-card')).toHaveCount(1);

  const resultPanel = page.locator('#analysis-results');
  await expect(resultPanel).toContainText('INSTANT RULE-BASED CHECK');
  await expect(resultPanel).toContainText('Rule-based risk score');
  await expect(resultPanel.locator('strong.font-display')).toContainText('72');

  const resultPosition = await page.evaluate(() => {
    const element = document.getElementById('analysis-results');
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { top: Math.round(rect.top), bottom: Math.round(rect.bottom), viewportHeight: window.innerHeight };
  });
  console.log('[risk-result-scroll-position]', JSON.stringify(resultPosition));
  await expect.poll(async () => page.evaluate(() => {
    const element = document.getElementById('analysis-results');
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.top >= -1 && rect.top < Math.min(160, window.innerHeight * 0.25) && rect.bottom > 0;
  })).toBe(true);

  const evidenceFollowsVerdict = await page.evaluate(() => {
    const result = document.getElementById('analysis-results');
    const evidence = document.getElementById('analysis-evidence-stack');
    return Boolean(result && evidence && (result.compareDocumentPosition(evidence) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(evidenceFollowsVerdict).toBe(true);

  const visibility = await stack.evaluate(element => {
    const cards = [...element.querySelectorAll('.web-evidence-source,.official-search-result-card,.retrieved-source-card')];
    return {
      count: cards.length,
      allRendered: cards.every(card => {
        const style = getComputedStyle(card);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && card.getBoundingClientRect().height > 0;
      }),
      logoLoadingModes: [...element.querySelectorAll('img')].map(img => img.loading)
    };
  });
  expect(visibility.count).toBe(7);
  expect(visibility.allRendered).toBe(true);
  expect(visibility.logoLoadingModes.length).toBeGreaterThan(0);
  expect(visibility.logoLoadingModes.every(mode => mode === 'eager' || mode === 'lazy')).toBe(true);
});
test('analysis result can be copied and exported as a print-ready PDF', async ({ page }) => {
  await page.addInitScript(() => {
    window.__copiedText = '';
    window.__printCalled = false;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async text => { window.__copiedText = text; } }
    });
    window.print = () => { window.__printCalled = true; };
  });
  await page.route('**/api/analyze', async route => {
    if (await fulfillApiPreflight(route)) return;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isRelevant: true,
        verdict: 'suspicious',
        riskLevel: 'high',
        riskScore: 70,
        summary_en: 'The message requests an upfront fee to claim a prize.',
        summary_bn: 'পুরস্কার পেতে আগাম ফি চাওয়া হয়েছে।',
        evidence: [{
          quote_en: 'Pay a processing fee',
          quote_bn: 'প্রসেসিং ফি দিন',
          reason_en: 'An unexpected upfront fee is a warning sign.',
          reason_bn: 'অপ্রত্যাশিত আগাম ফি সতর্কতার সংকেত।'
        }],
        tactics: ['upfront_fee', 'urgency'],
        safe_actions: ['Do not pay the fee.', 'Verify the offer independently.'],
        uncertainty: 'The sender and claim have not been independently verified.',
        confidence: 'medium',
        engine: 'Rule-based',
        aiAnalysis: {
          status: 'ready',
          explanation_en: 'The message combines a prize claim with an advance-fee request.',
          explanation_bn: 'বার্তাটি পুরস্কারের দাবির সঙ্গে আগাম ফি চাইছে।',
          next_steps_en: ['Do not pay.', 'Verify through an official channel.'],
          next_steps_bn: ['টাকা দেবেন না।', 'অফিসিয়াল চ্যানেলে যাচাই করুন।']
        },
        retrievedSources: [{
          id: 'bkash-security-tips',
          title: 'bKash — Security Tips',
          summary: 'Do not respond to unexpected prize communications.',
          url: 'https://www.bkash.com/index.php/en/page/security-tips'
        }],
        officialSearch: {
          status: 'not_applicable',
          summary_en: 'Official education-portal search was not applicable to this message.',
          summary_bn: 'এই বার্তার জন্য সরকারি শিক্ষা-পোর্টালে অনুসন্ধান প্রযোজ্য নয়.',
          sources: []
        }
      })
    });
  });

  await page.goto('/');
  await page.locator('#message').fill('You won a prize. Pay a processing fee today.');
  await page.getByRole('button', { name: /Analyze message/i }).click();
  await expect(page.getByRole('button', { name: 'Copy result' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate PDF' })).toBeVisible();
  await expect(page.getByText(/LIVE OFFICIAL-SOURCE SEARCH/i)).toHaveCount(0);

  await page.getByRole('button', { name: 'Copy result' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  const copied = await page.evaluate(() => window.__copiedText);
  expect(copied).toContain('SHONKET AI');
  expect(copied).toContain('You won a prize. Pay a processing fee today.');
  expect(copied).toContain('upfront fee');
  expect(copied).toContain('bKash — Security Tips');

  await expect(page.locator('#shonket-print-report')).toContainText('Digital Safety Analysis Report');
  await expect(page.locator('#shonket-print-report')).toContainText('You won a prize. Pay a processing fee today.');
  await page.getByRole('button', { name: 'Generate PDF' }).click();
  expect(await page.evaluate(() => window.__printCalled)).toBe(true);
});
test('screenshot upload keeps its preview and can be removed', async ({ page }) => {
  await page.goto('/');
  await page.locator('#screenshot-upload').setInputFiles({
    name: 'suspicious-message.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6XcAAAAASUVORK5CYII=', 'base64')
  });
  await expect(page.getByAltText('Screenshot preview')).toBeVisible();
  await expect(page.getByText('suspicious-message.png')).toBeVisible();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByAltText('Screenshot preview')).toHaveCount(0);
  await expect(page.locator('#screenshot-upload')).toHaveValue('');
});

test('screenshot validation clears rejected selections and allows a corrected image', async ({ page }) => {
  await page.goto('/');
  const fileInput = page.locator('#screenshot-upload');
  const validPng='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6XcAAAAASUVORK5CYII=';
  await fileInput.setInputFiles({
    name:'previous-valid.png',
    mimeType:'image/png',
    buffer:Buffer.from(validPng,'base64')
  });
  await expect(page.getByAltText('Screenshot preview')).toBeVisible();
  await expect(page.getByText('previous-valid.png')).toBeVisible();

  await fileInput.setInputFiles({
    name: 'unsupported.gif',
    mimeType: 'image/gif',
    buffer: Buffer.from('GIF89a')
  });
  await expect(page.getByRole('alert')).toContainText(/Unsupported image type/i);
  await expect(page.getByAltText('Screenshot preview')).toHaveCount(0);
  await expect(page.getByText('previous-valid.png')).toHaveCount(0);
  await expect(fileInput).toHaveValue('');

  await fileInput.setInputFiles({
    name: 'empty.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(0)
  });
  await expect(page.getByRole('alert')).toContainText(/screenshot is empty/i);
  await expect(fileInput).toHaveValue('');

  await fileInput.setInputFiles({
    name:'too-large.png',
    mimeType:'image/png',
    buffer:Buffer.alloc(2.5*1024*1024+1)
  });
  await expect(page.getByRole('alert')).toContainText(/2.5 MB or smaller/i);
  await expect(page.getByAltText('Screenshot preview')).toHaveCount(0);
  await expect(fileInput).toHaveValue('');

  await fileInput.setInputFiles({
    name:'corrected.png',
    mimeType:'image/png',
    buffer:Buffer.from(validPng,'base64')
  });
  await expect(page.getByAltText('Screenshot preview')).toBeVisible();
  await expect(page.getByText('corrected.png')).toBeVisible();
});
test('screenshot preview can be replaced without leaving stale file metadata', async ({ page }) => {
  await page.goto('/');
  const fileInput=page.locator('#screenshot-upload');
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6XcAAAAASUVORK5CYII=';
  await fileInput.setInputFiles({name:'first.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await expect(page.getByText('first.png')).toBeVisible();
  await fileInput.setInputFiles({name:'second.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await expect(page.getByText('second.png')).toBeVisible();
  await expect(page.getByText('first.png')).toHaveCount(0);
});

test('limitations card is readable and stays within the mobile viewport', async ({ page, isMobile }) => {
  await page.route('**/api/analyze',async route=>{
    if (await fulfillApiPreflight(route)) return;
    await route.fulfill({
      status:200,
      contentType:'application/json',
      body:JSON.stringify({
        isRelevant:true,verdict:'suspicious',riskLevel:'high',riskScore:70,
        summary_en:'A message asks for an advance payment.',
        summary_bn:'একটি বার্তায় আগাম টাকা চাওয়া হয়েছে।',
        evidence:[],tactics:['upfront_fee'],safe_actions:['Verify independently.'],
        uncertainty:'Sender and claim have not been independently verified.',
        confidence:'medium',engine:'Rule-based',
        aiAnalysis:{status:'ready',explanation_en:'The payment request needs checking.',explanation_bn:'পেমেন্ট অনুরোধটি যাচাই করা প্রয়োজন.',next_steps_en:[],next_steps_bn:[]},
        officialSearch:{status:'not_applicable',sources:[],searchedPortals:[]},
        retrievedSources:[]
      })
    });
  });
  await page.goto('/');
  await page.locator('#message').fill('Pay a processing fee to claim your reward.');
  await page.getByRole('button',{name:/Analyze message/i}).click();
  const card=page.locator('.limitations-card');
  await expect(card).toBeVisible();
  await expect(card.locator('.limitations-heading')).toContainText('LIMITATIONS & UNCERTAINTY');
  await expect(card.locator('.limitations-body')).toContainText('The verdict and risk score are rule-based');
  await expect(card.locator('.limitations-confidence strong')).toHaveText('medium');
  if(isMobile){
    const dims=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    expect(dims.scroll).toBeLessThanOrEqual(dims.viewport+1);
    const cardDims=await card.boundingBox();
    expect(cardDims.width).toBeLessThanOrEqual(dims.viewport+1);
  }
});


test('voice input starts directly and keeps English and Bangla controls', async ({ page }) => {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      constructor() { this.lang = ''; }
      start() {
        window.__voiceStarted = true;
        window.__voiceLanguage = this.lang;
        this.onstart?.();
        this.onresult?.({ results: [[{ transcript: 'A dictated message.' }]] });
        this.onend?.();
      }
      stop() {}
      abort() {}
    }
    window.SpeechRecognition = MockSpeechRecognition;
  });
  await page.goto('/');
  const voiceLanguages = page.locator('[aria-label="Voice input language"]');
  await expect(voiceLanguages.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Speak|কথা বলুন/ }).click();
  await expect(page.locator('#message')).toHaveValue('A dictated message.');
  expect(await page.evaluate(() => window.__voiceLanguage)).toBe('en-US');
  await expect(page.getByText(/Allow browser voice input/i)).toHaveCount(0);

  await voiceLanguages.getByRole('button', { name: 'বাংলা' }).click();
  await page.getByRole('button', { name: /Speak|কথা বলুন/ }).click();
  await expect(page.locator('#message')).toHaveValue('A dictated message.\nA dictated message.');
  expect(await page.evaluate(() => window.__voiceLanguage)).toBe('bn-BD');
});

test('voice input shows a clear unsupported-browser message', async ({ page }) => {
  await page.addInitScript(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Speak|কথা বলুন/ }).click();
  await expect(page.getByRole('alert')).toContainText(/not supported in this browser/i);
});

test('speech-recognition errors keep the checker visible and show a recoverable message', async ({ page }) => {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      start() {
        this.onstart?.();
        this.onerror?.({ error: 'network' });
        this.onend?.();
      }
      stop() {}
      abort() {}
    }
    window.SpeechRecognition = MockSpeechRecognition;
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Speak|কথা বলুন/ }).click();
  await expect(page.getByRole('alert')).toContainText(/speech service could not connect/i);
  await expect(page.getByRole('heading', { name: /Check a suspicious message/i })).toBeVisible();
  await expect(page.locator('#message')).toBeVisible();
});

test('link inspector identifies a known official domain without opening it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  await page.locator('#url').fill('https://www.bkash.com');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();
  await expect(page.getByText(/DESTINATION IDENTIFICATION/i)).toBeVisible();
  await expect(page.getByText(/bkash\.com/i).first()).toBeVisible();
  await expect(page.getByText(/NO URL FLAGS DETECTED/i)).toBeVisible();
});

test('link inspector recognises the official multi-part Nagad domain', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  await page.locator('#url').fill('https://www.nagad.com.bd');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();
  await expect(page.getByText(/DESTINATION IDENTIFICATION/i)).toBeVisible();
  await expect(page.getByText(/nagad.com.bd/i).first()).toBeVisible();
  await expect(page.getByText(/NO URL FLAGS DETECTED/i)).toBeVisible();
  await expect(page.getByText(/Possible brand impersonation/i)).toHaveCount(0);
});

test('link inspector detects a brand placed before a fake multi-part country domain', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  await page.locator('#url').fill('https://nagad.com.bd.fake.co.uk');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();
  await expect(page.getByText(/Possible brand impersonation/i)).toBeVisible();
  await expect(page.getByText(/nagad.com.bd.fake.co.uk/i).first()).toBeVisible();
});

test('link inspector explains brand mismatches and labels the score as heuristic points', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  await page.locator('#url').fill('https://bkash-bonus.xyz');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();
  await expect(page.getByText(/Possible brand impersonation/i)).toBeVisible();
  await expect(page.getByText(/bkash-bonus\.xyz/i).first()).toBeVisible();
  await expect(page.getByText(/The hostname contains a known brand name/i)).toBeVisible();
  await expect(page.getByText(/keyword-based category hint/i)).toHaveCount(0);
  await expect(page.getByText(/MEDIUM URL WARNING SCORE/i)).toBeVisible();
  await expect(page.getByText(/Heuristic URL points · not probability/i)).toBeVisible();
});

test('Link Inspector searches the submitted hostname and never sends the full URL to either service', async ({ page }) => {
  let submittedPayload = null;
  let domainSearchPayload = null;
  let genericOfficialSearchCalls = 0;

  await page.route('**/api/analyze', async route => {
    if (await fulfillApiPreflight(route)) return;
    submittedPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isRelevant: true,
        verdict: 'uncertain',
        riskLevel: 'unknown',
        riskScore: null,
        summary_en: 'This is a URL-only structure review.',
        summary_bn: 'এটি শুধু URL structure review.',
        responseLanguage: 'en',
        evidence: [],
        tactics: [],
        matchedSignals: [],
        safe_actions: ['Do not enter credentials or payment details until the domain is independently verified.'],
        uncertainty: 'The live page was not opened and no malware scan was performed.',
        confidence: 'low',
        engine: 'Rule-based',
        aiAnalysis: {
          status: 'ready',
          explanation_en: 'The hostname and local URL patterns should be reviewed, but they do not prove that the live website is malicious.',
          explanation_bn: 'Hostname ও local URL pattern সতর্কভাবে দেখুন; এগুলো একা live website ক্ষতিকর প্রমাণ করে না.',
          next_steps_en: ['Verify the domain independently.'],
          next_steps_bn: ['ডোমেইনটি আলাদাভাবে যাচাই করুন।']
        },
        retrievedSources: [],
        officialSearch: {
          status: 'not_applicable',
          summary_en: 'Generic official message-safety search does not apply to URL-only analysis.',
          summary_bn: 'URL-only review-তে generic official message-safety search প্রযোজ্য নয়.',
          sources: [],
          searchedPortals: []
        },
        webEvidence: {
          searched: false,
          searchExecuted: false,
          status: 'not_applicable',
          sources: [],
          searchedPortals: []
        },
        claimVerification: { status: 'not_applicable' }
      })
    });
  });

  await page.route('**/api/domain-search', async route => {
    if (await fulfillApiPreflight(route)) return;
    domainSearchPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        webEvidence: {
          searched: true,
          searchExecuted: true,
          provider: 'Bing + DuckDuckGo Lite',
          status: 'results_found',
          domain: 'bkash-bonus.xyz',
          searchedAt: new Date().toISOString(),
          queryCount: 4,
          successfulQueryCount: 4,
          failedQueryCount: 0,
          sourceCount: 1,
          sources: [{
            id: 'security:reference',
            title: 'Public report mentioning bkash-bonus.xyz',
            url: 'https://example.org/security-report',
            domain: 'example.org',
            snippet: 'A public reference mentions the submitted hostname. This reference is not proof by itself.',
            queryType: 'security_mentions',
            relevanceScore: 5
          }],
          summary_en: 'Live web search returned a domain-related public reference. This does not prove whether the website is safe or malicious.',
          summary_bn: 'লাইভ ওয়েব সার্চে ডোমেইন-সম্পর্কিত একটি public reference পাওয়া গেছে। এটি সাইট নিরাপদ বা ক্ষতিকর—কোনোটিই প্রমাণ করে না।'
        }
      })
    });
  });

  await page.route('**/api/official-search', async route => {
    genericOfficialSearchCalls += 1;
    if (await fulfillApiPreflight(route)) return;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  const submittedUrl = 'https://bkash-bonus.xyz/login?reset_token=private-reset-secret-4821';
  await page.locator('#url').fill(submittedUrl);
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();

  await expect(page.getByText(/DESTINATION IDENTIFICATION/i)).toBeVisible();
  await expect(page.getByText(/Possible brand impersonation/i)).toBeVisible();
  const evidence = page.getByTestId('link-analysis-evidence');
  await expect(evidence).toBeVisible();
  await expect(evidence.getByText(/LIVE WEB SEARCH · DOMAIN EVIDENCE/i)).toBeVisible();
  await expect(evidence.getByText(/RESULTS FOUND/i)).toBeVisible();
  await expect(evidence.locator('.web-evidence-source')).toHaveCount(1);
  await expect(evidence.locator('.domain-search-result-logo')).toBeVisible();
  await expect(evidence.getByText(/Public report mentioning bkash-bonus.xyz/i)).toBeVisible();
  await expect(evidence.getByText(/AI EXPLANATION/i).first()).toBeVisible();

  expect(submittedPayload.contextType).toBe('url');
  expect(submittedPayload.message).toContain('bkash-bonus.xyz');
  expect(submittedPayload.message).not.toContain('/login');
  expect(submittedPayload.message).not.toContain('reset_token');
  expect(submittedPayload.message).not.toContain('private-reset-secret-4821');

  expect(domainSearchPayload.hostname).toBe('bkash-bonus.xyz');
  expect(domainSearchPayload.rootDomain).toBe('bkash-bonus.xyz');
  expect(domainSearchPayload.categoryHint).toMatch(/brand impersonation/i);
  expect(JSON.stringify(domainSearchPayload)).not.toContain('/login');
  expect(JSON.stringify(domainSearchPayload)).not.toContain('private-reset-secret-4821');
  expect(genericOfficialSearchCalls).toBe(0);
});

test('link inspector detail cards use readable typography without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  await page.locator('#url').fill('https://bkash-bonus.xyz/login');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();

  const workspace = page.locator('#workspace-panel');
  const warningCard = workspace.locator('.link-detail-card-warning');
  const guidanceCard = workspace.locator('.link-detail-card-guidance');
  const technicalCard = workspace.locator('.link-detail-card-technical');
  await expect(warningCard).toBeVisible();
  await expect(guidanceCard).toBeVisible();
  await expect(technicalCard).toBeVisible();

  const typography = await workspace.evaluate(element => {
    const size = selector => {
      const node = element.querySelector(selector);
      return node ? Number.parseFloat(getComputedStyle(node).fontSize) : 0;
    };
    return {
      heading: size('.link-detail-card-warning .link-detail-card-title'),
      warningTitle: size('.link-detail-signal-title'),
      warningDetail: size('.link-detail-signal-copy'),
      guidanceText: size('.link-detail-guidance-list > li'),
      technicalTitle: size('.link-detail-check-title'),
      technicalNote: size('.link-detail-check-note'),
      workspaceWidth: element.clientWidth,
      contentWidth: element.scrollWidth
    };
  });

  expect(typography.heading).toBeGreaterThanOrEqual(15);
  expect(typography.warningTitle).toBeGreaterThanOrEqual(13.5);
  expect(typography.warningDetail).toBeGreaterThanOrEqual(12.5);
  expect(typography.guidanceText).toBeGreaterThanOrEqual(12.5);
  expect(typography.technicalTitle).toBeGreaterThanOrEqual(12.5);
  expect(typography.technicalNote).toBeGreaterThanOrEqual(11.5);
  expect(typography.contentWidth).toBeLessThanOrEqual(typography.workspaceWidth + 1);
});

test('Link Inspector shows rate-limited search distinctly from completed no-result searches', async ({ page }) => {
  let searchCalls = 0;
  await page.route('**/api/domain-search', async route => {
    searchCalls += 1;
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: { 'Retry-After': '60' },
      body: JSON.stringify({ error: 'Too many web searches. Please wait and try again.' })
    });
  });
  await page.route('**/api/analyze', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isRelevant: true,
        verdict: 'uncertain',
        riskLevel: 'unknown',
        riskScore: null,
        summary_en: 'URL-only review.',
        summary_bn: 'URL-only review.',
        evidence: [],
        tactics: [],
        safe_actions: [],
        uncertainty: 'No reputation conclusion was made.',
        confidence: 'low',
        engine: 'URL Inspector',
        aiAnalysis: { status: 'ready', explanation_en: 'This is a URL-only review.', explanation_bn: 'এটি URL-only review.' },
        retrievedSources: [],
        officialSearch: { status: 'not_applicable', sources: [], searchedPortals: [] },
        webEvidence: { searched: false, searchExecuted: false, status: 'not_applicable', sources: [] },
        claimVerification: { status: 'not_applicable' }
      })
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  await page.locator('#url').fill('https://sample-rate-limit-domain.net');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();

  const evidence = page.getByTestId('link-analysis-evidence');
  await expect(evidence.getByText(/RATE LIMITED/i)).toBeVisible();
  await expect(evidence.getByText(/The live search limit was reached/i)).toBeVisible();
  expect(searchCalls).toBe(1);
});

test('a slower official search from an earlier message cannot overwrite a newer analysis', async ({ page }) => {
  let firstSearchFinished = false;
  await page.route('**/api/analyze', async route => {
    const request = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isRelevant: true,
        verdict: 'uncertain',
        riskLevel: 'low',
        riskScore: 10,
        summary_en: 'Analysis response for ' + request.message,
        summary_bn: 'বার্তা বিশ্লেষণ সম্পন্ন।',
        evidence: [],
        tactics: [],
        safe_actions: ['Verify independently.'],
        uncertainty: 'The sender has not been independently authenticated.',
        confidence: 'low',
        engine: 'Rule-based',
        aiAnalysis: { status: 'ready', explanation_en: 'This is a test explanation.', explanation_bn: 'এটি একটি test explanation.' },
        retrievedSources: [],
        officialSearch: {
          status: 'pending',
          summary_en: 'Waiting for the official-source lookup.',
          summary_bn: 'সরকারি উৎস অনুসন্ধানের অপেক্ষায়।',
          sources: [],
          searchedPortals: []
        },
        webEvidence: { searched: true, searchExecuted: false, status: 'pending', sources: [], searchedPortals: [] },
        claimVerification: { status: 'unverified', summary_en: 'Search is still running.' }
      })
    });
  });

  await page.route('**/api/official-search', async route => {
    const request = route.request().postDataJSON();
    const isFirst = String(request.message || '').includes('FIRST REQUEST');
    if (isFirst) {
      await new Promise(resolve => setTimeout(resolve, 1800));
      firstSearchFinished = true;
    } else {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const label = isFirst ? 'STALE FIRST SEARCH RESULT' : 'CURRENT SECOND SEARCH RESULT';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        officialSearch: {
          status: 'guidance_only',
          summary_en: label,
          summary_bn: label,
          sources: [],
          searchedPortals: []
        },
        webEvidence: { searched: true, searchExecuted: true, status: 'guidance_only', sources: [], searchedPortals: [] },
        claimVerification: { status: 'unverified', summary_en: label }
      })
    });
  });

  await page.goto('/');
  await page.locator('#message').fill('FIRST REQUEST: a prize offer asks for a processing fee.');
  await page.getByRole('button', { name: /Analyze message/i }).click();
  await expect(page.getByText(/Analysis response for FIRST REQUEST/i).first()).toBeVisible({ timeout: 60_000 });

  await page.locator('#message').fill('SECOND REQUEST: an OTP is requested urgently.');
  await page.getByRole('button', { name: /Analyze message/i }).click();
  await expect(page.getByText(/Analysis response for SECOND REQUEST/i).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('CURRENT SECOND SEARCH RESULT', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

  await expect.poll(() => firstSearchFinished).toBe(true, { timeout: 10_000 });
  await page.waitForTimeout(200);
  await expect(page.getByText('STALE FIRST SEARCH RESULT', { exact: true })).toHaveCount(0);
  await expect(page.getByText('CURRENT SECOND SEARCH RESULT', { exact: true }).first()).toBeVisible();
});

test('simulator can complete all scenarios and restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Scam Simulator/i }).click();
  const totalText = await page.getByText(/SCENARIO 1 OF/i).textContent();
  const total = Number(totalText.match(/OF\s+(\d+)/i)?.[1] || 0);
  expect(total).toBeGreaterThanOrEqual(9);
  for (let i = 0; i < total; i += 1) {
    const choices = page.locator('.choice-button');
    await expect(choices.first()).toBeVisible();
    await choices.first().click();
    await expect(page.getByText(/SAFER RESPONSE/i)).toBeVisible();
    await expect(page.getByText(/REAL-LIFE ACTION PLAN/i)).toBeVisible();
    await page.getByRole('button', { name: /Next scenario|View my results/i }).click();
  }
  await expect(page.getByText(/TRAINING COMPLETE/i)).toBeVisible();
  await page.getByRole('button', { name: /Practise again/i }).click();
  await expect(page.getByText(/SCENARIO 1 OF/i)).toBeVisible();
});

test('mobile layout has no horizontal page overflow, including screenshot preview', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile viewport check');
  await page.goto('/');
  const checkOverflow=async()=>{
    const sizes=await page.evaluate(()=>({
      viewport:document.documentElement.clientWidth,
      page:document.documentElement.scrollWidth
    }));
    expect(sizes.page).toBeLessThanOrEqual(sizes.viewport+1);
  };
  await checkOverflow();
  await page.locator('#screenshot-upload').setInputFiles({
    name:'mobile-screenshot.png',
    mimeType:'image/png',
    buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6XcAAAAASUVORK5CYII=','base64')
  });
  await expect(page.getByAltText('Screenshot preview')).toBeVisible();
  await checkOverflow();
  await page.getByRole('button',{name:'Remove',exact:true}).click();
  await checkOverflow();
});

test('URL-only inspection runs domain search but does not use generic official-source search or message RAG', async ({ page }) => {
  let domainSearchCalls = 0;
  let genericOfficialSearchCalls = 0;
  let analysisPayload = null;
  let domainSearchPayload = null;

  await page.route('**/api/official-search', async route => {
    genericOfficialSearchCalls += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
  await page.route('**/api/domain-search', async route => {
    domainSearchCalls += 1;
    domainSearchPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        webEvidence: {
          searched: true,
          searchExecuted: true,
          provider: 'Bing + DuckDuckGo Lite',
          status: 'no_results',
          domain: 'bkash-bonus.xyz',
          queryCount: 2,
          successfulQueryCount: 2,
          failedQueryCount: 0,
          sourceCount: 0,
          sources: [],
          summary_en: 'The search completed for the exact hostname and estimated base domain, but no relevant references passed the filter. No results do not prove that the website is safe.',
          summary_bn: 'সার্চ সম্পন্ন হয়েছে, কিন্তু প্রাসঙ্গিক ডোমেইন-নির্দিষ্ট reference পাওয়া যায়নি। ফলাফল না পাওয়া সাইট নিরাপদ হওয়ার প্রমাণ নয়.',
          threatIntelligence: {
            status: 'not_configured',
            summary_en: 'Threat-intelligence API keys are not configured. No provider lookups were made.',
            summary_bn: 'Threat-intelligence API key সংযুক্ত নেই। কোনো provider lookup করা হয়নি.',
            providers: [
              { name: 'PhishTank', status: 'not_configured', summary_en: 'Not configured.', summary_bn: 'সংযুক্ত নয়.', targets: [] },
              { name: 'URLhaus', status: 'not_configured', summary_en: 'Not configured.', summary_bn: 'সংযুক্ত নয়.', targets: [] }
            ]
          }
        }
      })
    });
  });
  await page.route('**/api/analyze', async route => {
    const body = route.request().postDataJSON();
    analysisPayload = body;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isRelevant: true,
        verdict: 'uncertain',
        riskLevel: 'unknown',
        riskScore: null,
        summary_en: 'URL-only structure review.',
        summary_bn: 'URL structure review.',
        evidence: [],
        tactics: [],
        safe_actions: [],
        uncertainty: 'No site reputation lookup was performed by the local URL score.',
        confidence: 'low',
        engine: 'URL Inspector',
        aiAnalysis: { status: 'ready', explanation_en: 'Local URL structure checks are separate from public web search.', explanation_bn: 'স্থানীয় URL check ও public web search আলাদা।' },
        retrievedSources: [],
        officialSearch: {
          status: 'not_applicable',
          summary_en: 'URL-only reviews do not search generic message-safety portals.',
          summary_bn: 'URL-only review-তে generic message-safety portal search হয় না.',
          sources: [],
          searchedPortals: []
        },
        webEvidence: { searched: false, searchExecuted: false, status: 'not_applicable', sources: [], searchedPortals: [] },
        claimVerification: { status: 'not_applicable', summary_en: 'Not applicable.' }
      })
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  await page.locator('#url').fill('https://bkash-bonus.xyz/login?reset_token=private-token-value');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();

  await expect(page.getByText(/Possible brand impersonation/i)).toBeVisible();
  await expect(page.getByText(/Heuristic URL points · not probability/i)).toBeVisible();
  const evidence = page.getByTestId('link-analysis-evidence');
  await expect(evidence).toBeVisible();
  await expect(evidence.getByText(/LIVE WEB SEARCH · DOMAIN EVIDENCE/i)).toBeVisible();
  await expect(evidence.getByText(/NO RELEVANT MATCHES/i)).toBeVisible();
  const threatIntel = page.getByTestId('threat-intelligence-results');
  await expect(threatIntel).toBeVisible();
  await expect(threatIntel.getByText(/THREAT INTELLIGENCE DATABASES/i)).toBeVisible();
  await expect(threatIntel.getByText(/PhishTank/i)).toBeVisible();
  await expect(threatIntel.getByText(/URLhaus/i)).toBeVisible();
  await expect(threatIntel.getByText(/API KEYS NEEDED/i)).toBeVisible();
  await expect(evidence.locator('.web-evidence-source')).toHaveCount(0);
  await expect(evidence.getByText(/LIVE OFFICIAL-SOURCE SEARCH/i)).toHaveCount(0);
  await expect(evidence.getByText(/RETRIEVED SAFETY GUIDANCE/i)).toHaveCount(0);
  expect(domainSearchCalls).toBe(1);
  expect(genericOfficialSearchCalls).toBe(0);
  expect(domainSearchPayload.hostname).toBe('bkash-bonus.xyz');
  expect(domainSearchPayload.rootDomain).toBe('bkash-bonus.xyz');
  expect(JSON.stringify(domainSearchPayload)).not.toContain('/login');
  expect(JSON.stringify(domainSearchPayload)).not.toContain('private-token-value');
  expect(analysisPayload.contextType).toBe('url');
  expect(analysisPayload.message).toContain('bkash-bonus.xyz');
  expect(analysisPayload.message).not.toContain('private-token-value');
  expect(analysisPayload.message).not.toContain('/login');
});

test('age-restricted category is not sent to public web search and does not become a scam score', async ({ page }) => {
  let domainSearchCalls = 0;
  let officialSearchCalls = 0;
  await page.route('**/api/domain-search', async route => {
    domainSearchCalls += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ webEvidence: {} }) });
  });
  await page.route('**/api/official-search', async route => {
    officialSearchCalls += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
  await page.route('**/api/analyze', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        isRelevant: true,
        verdict: 'uncertain',
        riskLevel: 'unknown',
        riskScore: null,
        summary_en: 'URL-only structure review.',
        summary_bn: 'URL structure review.',
        evidence: [],
        tactics: [],
        safe_actions: [],
        uncertainty: 'A category hint is not a scam verdict.',
        confidence: 'low',
        engine: 'URL Inspector',
        aiAnalysis: { status: 'ready', explanation_en: 'This label is a category hint, not a safety or fraud verdict.', explanation_bn: 'এটি category hint, scam verdict নয়।' },
        retrievedSources: [],
        officialSearch: { status: 'not_applicable', sources: [], searchedPortals: [] },
        webEvidence: { searched: false, searchExecuted: false, status: 'not_applicable', sources: [] },
        claimVerification: { status: 'not_applicable' }
      })
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  await page.locator('#url').fill('https://18plus.example');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();
  await expect(page.getByText(/Age-restricted \/ 18\+ category/i)).toBeVisible();
  await expect(page.locator('#workspace-panel .text-2xl.font-extrabold.tabular-nums')).toHaveText('0/100');
  await expect(page.getByText(/not a website safety rating or reputation check/i)).toBeVisible();

  const evidence = page.getByTestId('link-analysis-evidence');
  await expect(evidence).toBeVisible();
  await expect(evidence.getByText(/NOT SEARCHED/i)).toBeVisible();
  await expect(evidence.getByText(/Search results are not surfaced for this age-restricted category/i)).toBeVisible();

  // A known brand label must not hide a restricted path category.
  await page.locator('#url').fill('https://google.com/xxx');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();
  await expect(page.getByText(/Google Search \/ web services/i)).toBeVisible();
  const knownDomainEvidence = page.getByTestId('link-analysis-evidence');
  await expect(knownDomainEvidence.getByText(/NOT SEARCHED/i)).toBeVisible();
  await expect(page.locator('#workspace-panel .text-2xl.font-extrabold.tabular-nums')).toHaveText('0/100');

  expect(domainSearchCalls).toBe(0);
  expect(officialSearchCalls).toBe(0);
});


test('mobile workspace stays inside a narrow viewport and quick navigation works', async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await expect(page.locator('.mobile-tool-dock')).toBeVisible();
    await expect(page.locator('.mobile-tool-dock button')).toHaveCount(4);

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      dock: (() => {
        const rect = document.querySelector('.mobile-tool-dock').getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      })()
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.dock.left).toBeGreaterThanOrEqual(0);
    expect(dimensions.dock.right).toBeLessThanOrEqual(dimensions.viewport);

    await page.locator('.mobile-tool-dock').getByRole('button', { name: 'Link Inspector' }).click();
    await expect(page.locator('#url')).toBeVisible();
    await expect(page.locator('.mobile-tool-dock button[aria-pressed="true"]')).toHaveAttribute('aria-label', 'Link Inspector');
  }
});

test('desktop layout keeps the mobile quick-navigation hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.mobile-tool-dock')).toBeHidden();
  await expect(page.locator('header nav')).toBeVisible();
});
