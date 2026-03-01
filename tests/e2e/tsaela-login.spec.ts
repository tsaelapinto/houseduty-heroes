import { test, expect } from '@playwright/test';

test.describe('Tsaela Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 10000 });
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
