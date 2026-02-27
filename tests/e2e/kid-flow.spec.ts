import { test, expect, Page } from '@playwright/test';

async function loginAsKid(page: Page, name = 'Daniel', pin = '1234') {
  await page.goto('/');
  await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="tab-login"]').click();
  await page.locator('[data-testid="role-kid"]').click();
  await page.locator('[data-testid="input-identifier"]').fill(name);
  await page.locator('[data-testid="input-secret"]').fill(pin);
  await page.locator('[data-testid="btn-login"]').click();
  await expect(page.locator('[data-testid="kid-hero-view"]')).toBeVisible({ timeout: 8000 });
}

test.describe('Kid Hero View', () => {
  test('kid sees their duties after login', async ({ page }) => {
    await loginAsKid(page, 'Daniel', '1234');
    // Should see at least one duty card
    await expect(page.locator('[data-testid="duty-card"]').first()).toBeVisible({ timeout: 6000 });
  });

  test('kid can mark a duty as done', async ({ page }) => {
    await loginAsKid(page, 'Daniel', '1234');

    // Click the Done! button on the first duty
    const doneBtn = page.locator('[data-testid="btn-done"]').first();
    await expect(doneBtn).toBeVisible({ timeout: 5000 });
    await doneBtn.click();

    // The button changes to "Sent ✓" when submitted
    await expect(page.getByText(/Sent/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('kid can log out', async ({ page }) => {
    await loginAsKid(page, 'Daniel', '1234');
    await page.locator('[data-testid="btn-logout"]').click();
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 5000 });
  });
});
