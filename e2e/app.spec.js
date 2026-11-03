import { test, expect } from '@playwright/test';

test('landing page loads and primary tools are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SHONKET AI/i);
  await expect(page.getByRole('heading', { name: /Don.t trust/i })).toBeVisible();
  await expect(page.getByAltText(/Official Built For Ostad Presents YUNet AIgnite Buildathon 2026 sticker/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Analyze a message/i }).first()).toBeVisible();
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
  await expect(page.getByText('UNVERIFIED')).toBeVisible();
  await expect(page.getByText(/No external source was searched/i)).toBeVisible();
});

test('microphone dictation uses on-device recognition and fills the message field', async ({ page }) => {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      constructor() { this.processLocally = false; }
      start() {
        window.__speechWasLocal = this.processLocally;
        this.onstart?.();
        this.onresult?.({ results: [[{ transcript: 'This is a dictated message.' }]] });
        this.onend?.();
      }
      stop() {}
      abort() {}
    }
    MockSpeechRecognition.available = async options =>
      options.processLocally ? 'available' : 'unavailable';
    MockSpeechRecognition.install = async () => true;
    window.SpeechRecognition = MockSpeechRecognition;
  });
  await page.goto('/');
  await expect(page.getByText(/Audio stays on your device/i)).toBeVisible();
  await page.getByRole('button', { name: 'Speak' }).click();
  await expect(page.locator('#message')).toHaveValue('This is a dictated message.');
  await expect.poll(() => page.evaluate(() => window.__speechWasLocal)).toBe(true);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test('browser voice requires explicit consent when on-device language support is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      constructor() { this.processLocally = false; }
      start() {
        window.__speechStarted = true;
        window.__speechWasLocal = this.processLocally;
        this.onstart?.();
        this.onresult?.({ results: [[{ transcript: 'A Bangla voice transcript.' }]] });
        this.onend?.();
      }
      stop() {}
      abort() {}
    }
    MockSpeechRecognition.available = async () => 'unavailable';
    MockSpeechRecognition.install = async () => false;
    window.SpeechRecognition = MockSpeechRecognition;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Speak' }).click();
  await expect(page.getByText(/Optional browser voice/i)).toBeVisible();
  expect(await page.evaluate(() => window.__speechStarted || false)).toBe(false);
  await page.getByRole('button', { name: /Continue with browser voice/i }).click();
  await expect(page.locator('#message')).toHaveValue('A Bangla voice transcript.');
  await expect.poll(() => page.evaluate(() => window.__speechWasLocal)).toBe(false);
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
