import { test, expect } from '@playwright/test';

test.describe('Tsaela Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const loginScreen = page.locator('[data-testid="login-screen"]');
    // If root shows the landing page (production), click the nav login button
    const isLoginScreen = await loginScreen.isVisible().catch(() => false);
    if (!isLoginScreen) {
      // Use testid if deployed, otherwise fall back to button text
      const byTestId = page.locator('[data-testid="nav-login-btn"]');
      const hasTestId = await byTestId.isVisible({ timeout: 2000 }).catch(() => false);
      const navBtn = hasTestId ? byTestId : page.getByRole('button', { name: /Log In|כניסה/ });
      await navBtn.click();
    }
    await expect(loginScreen).toBeVisible({ timeout: 10000 });
  });

  test('tsaela logs in with email and password', async ({ page }) => {
    // Ensure Login tab is active
    await page.locator('[data-testid="tab-login"]').click();

    // Ensure Parent role is selected
    await page.locator('[data-testid="role-parent"]').click();

    // Fill credentials
    await page.locator('[data-testid="input-identifier"]').fill('tsaela@gmail.com');
    await page.locator('[data-testid="input-secret"]').fill('123456');

    // Submit
    await page.locator('[data-testid="btn-login"]').click();

    // Should land on parent dashboard
    await expect(page.locator('[data-testid="parent-dashboard"]')).toBeVisible({ timeout: 10000 });
  });
});
