import { test, expect } from '@playwright/test';

test.describe('Oren Local Login Test', () => {
  const LOCAL_URL = 'http://localhost:5173'; // Assuming standard Vite port
  const HOUSEHOLD_ID = 'tsaela-household-001';
  const OREN_NAME = 'אורן';
  const OREN_PIN = '1234';

  test('should link household and login as Oren', async ({ page }) => {
    // 1. Go to the app
    await page.goto(LOCAL_URL);

    // 2. Click "Get Started" or "Dashboard" (handleOpenApp navs to /login)
    await page.click('button:has-text("Get Started"), button:has-text("Start"), button:has-text("Dashboard")');

    // 3. We are on Login screen. Click Hero/Kid tab
    await page.click('[data-testid="role-kid"]');

    // 4. We are on Kid Selector screen. Enter the family code
    await page.fill('input[placeholder*="family code"]', HOUSEHOLD_ID);
    await page.click('button:has-text("Let\'s go")');

    // 5. Verify we see Oren's name
    const orenCard = page.locator(`text=${OREN_NAME}`);
    await expect(orenCard).toBeVisible();

    // 6. Select Oren
    await orenCard.click();

    // 7. Enter PIN
    for (const digit of OREN_PIN) {
      await page.click(`button:has-text("${digit}")`);
    }

    // Capture potential error messages before navigation
    await page.waitForTimeout(1000);
    const hasError = await page.locator('text=Wrong PIN').isVisible();
    if (hasError) console.error('FAILED: Incorrect PIN entered in test.');

    // 8. Verify we are on the Assignment/Dashboard screen
    await expect(page).toHaveURL(/.*app|.*hero/, { timeout: 10000 });
    await expect(page.locator(`text=${OREN_NAME}`).first()).toBeVisible();
  });
});
