import { test, expect } from '@playwright/test';

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
          summary_bn: 'এই দাবির পক্ষে কোনো বাহ্যিক সরকারি উৎস খোঁজা হয়নি।',
          summary_en: 'No external source was searched for this claim.'
        },
        aiAnalysis: {
          status: 'ready',
          explanation_en: 'A direct OTP request tied to a prize claim is a strong warning sign.',
          explanation_bn: 'পুরস্কারের দাবির সঙ্গে OTP চাওয়া একটি শক্তিশালী সতর্কসংকেত।',
          next_steps_en: ['Do not share the OTP.', 'Verify through the official app or website.'],
          next_steps_bn: ['OTP শেয়ার করবেন না।', 'অফিসিয়াল অ্যাপ বা ওয়েবসাইটে যাচাই করুন।']
        },
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
  await page.goto('/');
  await page.locator('#message').fill('Congratulations! You won a cash prize. Send your OTP immediately to claim it.');
  await page.getByRole('button', { name: /Analyze message/i }).click();
  await expect(page.locator('#workspace-panel').getByText(/INSTANT RULE-BASED CHECK/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Why it was flagged' })).toBeVisible();
  await expect(page.getByText('CLAIM VERIFICATION')).toBeVisible();
  await expect(page.getByText('UNVERIFIED', { exact: true })).toBeVisible();
  await expect(page.getByText('LLM ACTIVE')).toBeVisible();
  await expect(page.getByText('OFFICIAL CYBERSECURITY ADVISORY')).toBeVisible();
  await expect(page.getByText(/LIVE OFFICIAL-SOURCE SEARCH/i)).toBeVisible();
  await expect(page.getByText(/Selected Bangladesh cybersecurity sources only/i)).toBeVisible();
  await expect(page.getByText(/RETRIEVED SAFETY GUIDANCE/i)).toBeVisible();
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
  expect(copied).toContain('upfront payment');
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
  await expect(page.getByText(/NO OBVIOUS SIGNALS/i)).toBeVisible();
});

test('link inspector recognises the official multi-part Nagad domain', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  await page.locator('#url').fill('https://www.nagad.com.bd');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();
  await expect(page.getByText(/DESTINATION IDENTIFICATION/i)).toBeVisible();
  await expect(page.getByText(/nagad.com.bd/i).first()).toBeVisible();
  await expect(page.getByText(/NO OBVIOUS SIGNALS/i)).toBeVisible();
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

test('link inspector flags a brand lookalike domain', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Smart Link Inspector/i }).click();
  await page.locator('#url').fill('https://bkash-bonus.xyz');
  await page.locator('#workspace-panel button.action-button').filter({ hasText: /^Inspect$/ }).click();
  await expect(page.getByText(/Possible brand impersonation/i)).toBeVisible();
  await expect(page.getByText(/bkash-bonus\.xyz/i).first()).toBeVisible();
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

test('mobile layout has no horizontal page overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile viewport check');
  await page.goto('/');
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(sizes.page).toBeLessThanOrEqual(sizes.viewport + 1);
});
