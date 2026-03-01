import { test, expect } from '@playwright/test';

/**
 * Household Invite Flow
 * ─────────────────────
 * 1. Adult1 signs up → lands on ParentDashboard
 * 2. Adult1 clicks "Invite Partner" → sees invite URL in modal
 * 3. Adult2 opens the invite URL
 * 4. Adult2 fills in name/email/password → joins the household
 * 5. Adult2 lands on ParentDashboard (same household)
 */

test.describe('Household Invite Flow', () => {
  let inviteUrl: string;
  const ts = Date.now();
  const adult1Email = `adult1-${ts}@test.com`;
  const adult2Email = `adult2-${ts}@test.com`;

  test('adult1 signs up', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="tab-signup"]').click();
    await page.locator('[data-testid="signup-name"]').fill('Adult1 Hero');
    await page.locator('[data-testid="signup-email"]').fill(adult1Email);
    await page.locator('[data-testid="signup-password"]').fill('testpass123');
    await page.locator('[data-testid="btn-signup"]').click();

    await expect(page.locator('[data-testid="parent-dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('adult1 generates invite link and adult2 joins', async ({ page }) => {
    // ── Step 1: Adult1 signs up ────────────────────────────────────────────
    await page.goto('/login');
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="tab-signup"]').click();
    await page.locator('[data-testid="signup-name"]').fill('Adult1 Hero');
    await page.locator('[data-testid="signup-email"]').fill(adult1Email);
    await page.locator('[data-testid="signup-password"]').fill('testpass123');
    await page.locator('[data-testid="btn-signup"]').click();

    await expect(page.locator('[data-testid="parent-dashboard"]')).toBeVisible({ timeout: 10000 });

    // ── Step 2: Open Invite Partner modal ─────────────────────────────────
    await page.locator('[data-testid="btn-invite-partner"]').click();

    const inviteUrlEl = page.locator('[data-testid="invite-url-display"]');
    await expect(inviteUrlEl).toBeVisible({ timeout: 10000 });
    inviteUrl = (await inviteUrlEl.textContent()) ?? '';
    expect(inviteUrl).toContain('/join?code=');

    // ── Step 3: Adult2 navigates to the invite URL ─────────────────────────
    // The URL has the app baseURL already — extract just the path+query
    const urlObj = new URL(inviteUrl);
    const joinPath = urlObj.pathname + urlObj.search; // e.g. /join?code=abc123

    await page.goto(joinPath);
    await expect(page.locator('[data-testid="invite-join-screen"]')).toBeVisible({ timeout: 10000 });

    // The household name should be shown
    await expect(page.locator('[data-testid="join-household-name"]')).toBeVisible({ timeout: 5000 });

    // ── Step 4: Adult2 fills in the join form ─────────────────────────────
    await page.locator('[data-testid="join-name"]').fill('Adult2 Hero');
    await page.locator('[data-testid="join-email"]').fill(adult2Email);
    await page.locator('[data-testid="join-password"]').fill('testpass456');
    await page.locator('[data-testid="btn-join"]').click();

    // ── Step 5: Adult2 lands on ParentDashboard ────────────────────────────
    await expect(page.locator('[data-testid="parent-dashboard"]')).toBeVisible({ timeout: 10000 });
  });
});
