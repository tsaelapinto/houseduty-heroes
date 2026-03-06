import { test, expect } from '@playwright/test';

// Configuration for production
const PROD_URL = 'https://app.harelitos.com';
const KID_NAME = 'אורן';
const KID_PIN = '1234';
const HOUSEHOLD_ID = '581ee99c-6a53-4fe6-9d4d-267ef9bd23dd';

test.describe('Production Login Check - Oren', () => {

  test('Oren should be able to login to production', async ({ page }) => {
    test.setTimeout(120000);

    // Intercept API calls to see what the server returns
    const apiLogs: { url: string; status: number; body: string }[] = [];
    page.on('response', async (resp) => {
      if (resp.url().includes('/kids') || resp.url().includes('/auth/login')) {
        const body = await resp.text().catch(() => '(unreadable)');
        apiLogs.push({ url: resp.url(), status: resp.status(), body: body.slice(0, 500) });
      }
    });

    // 1. Go to the app and inject household into localStorage
    await page.goto(PROD_URL);
    await page.waitForLoadState('networkidle');
    await page.evaluate((hid) => {
      localStorage.clear();
      localStorage.setItem('knownHouseholdId', hid);
    }, HOUSEHOLD_ID);

    // 2. Navigate to kid selector — kids should auto-load from stored household
    await page.goto(`${PROD_URL}/kid-select`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);

    // Debug output
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('\n--- Page text snippet ---\n', pageText.slice(0, 600));
    console.log('\n--- API responses ---\n', JSON.stringify(apiLogs, null, 2));

    // 3. Find Oren's card and click it
    const orenCard = page.getByRole('button', { name: KID_NAME, exact: false });
    await expect(orenCard.first()).toBeVisible({ timeout: 20000 });
    await orenCard.first().click();

    // 4. Enter PIN (screen auto-submits after 4 digits)
    for (const digit of KID_PIN) {
      await page.click(`button:has-text("${digit}")`);
    }

    // 5. Verify login success
    await page.waitForURL(/.*(app|hero)/, { timeout: 20000 });
    await expect(page.locator(`text=${KID_NAME}`).first()).toBeVisible();

    console.log('\n✅ Successfully logged in as Oren to PRODUCTION!');
  });
});
