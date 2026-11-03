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
  await expect(page.getByText('LLM NOT CONFIGURED')).toBeVisible();
  await expect(page.getByText('BACKEND NOT CONNECTED')).toBeVisible();
  await expect(page.getByText(/LIVE OFFICIAL-SOURCE SEARCH/i)).toBeVisible();
  await expect(page.getByText(/Connect the Netlify backend/i).first()).toBeVisible();
  await expect(page.getByText(/RETRIEVED SAFETY GUIDANCE/i)).toBeVisible();
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
  await expect(voiceLanguages.getByRole('button', { name: 'বাংলা' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Speak|কথা বলুন/ }).click();
  await expect(page.locator('#message')).toHaveValue('A dictated message.');
  expect(await page.evaluate(() => window.__voiceLanguage)).toBe('bn-BD');
  await expect(page.getByText(/Allow browser voice input/i)).toHaveCount(0);

  await voiceLanguages.getByRole('button', { name: 'EN' }).click();
  await page.getByRole('button', { name: /Speak|কথা বলুন/ }).click();
  await expect(page.locator('#message')).toHaveValue('A dictated message.\nA dictated message.');
  expect(await page.evaluate(() => window.__voiceLanguage)).toBe('en-US');
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
