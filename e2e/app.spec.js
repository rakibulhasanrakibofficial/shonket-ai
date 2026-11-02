import { test, expect } from '@playwright/test';

test('landing page loads and primary tools are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SHONKET AI/i);
  await expect(page.getByRole('heading', { name: /Don.t trust/i })).toBeVisible();
  await expect(page.getByAltText(/Official Built For Ostad Presents YUNet AIgnite Buildathon 2026 sticker/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Check a message/i }).first()).toBeVisible();
});

test('scam checker accepts text and shows an analysis result', async ({ page }) => {
  await page.goto('/');
  await page.locator('#message').fill('Congratulations! You won a cash prize. Send your OTP immediately to claim it.');
  await page.getByRole('button', { name: /Analyze message/i }).click();
  await expect(page.locator('#workspace-panel').getByText(/AI CHECK COMPLETE|AI যাচাই সম্পন্ন|MEDIUM RISK|HIGH RISK|LOW RISK/i).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Why it was flagged|Detected clue|What to do next/i)).toBeVisible();
});

test('scam checker accepts a screenshot file', async ({ page }) => {
  await page.goto('/');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=', 'base64');
  await page.locator('#screenshot-upload').setInputFiles({
    name: 'sample-message.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(page.getByText('sample-message.png')).toBeVisible();
  await expect(page.getByText(/SCREENSHOT ATTACHED/i)).toBeVisible();
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
  await page.getByRole('button', { name: 'Inspect' }).click();
  await expect(page.getByText(/Possible brand impersonation/i)).toBeVisible();
  await expect(page.getByText(/bkash-bonus\.xyz/i).first()).toBeVisible();
});

test('simulator can complete all scenarios and restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Scam Simulator/i }).click();
  for (let i = 0; i < 5; i += 1) {
    const choices = page.locator('.choice-button');
    await expect(choices.first()).toBeVisible();
    await choices.first().click();
    await expect(page.getByText(/SAFER RESPONSE/i)).toBeVisible();
    const next = page.getByRole('button', { name: /Next scenario|View my results/i });
    await next.click();
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
