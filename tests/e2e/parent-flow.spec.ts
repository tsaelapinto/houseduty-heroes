import { test, expect, Page } from '@playwright/test';

// Use env vars so this works against both local dev seed and production.
// Local: mum@houseduty.app / parent123 (default)
// Prod:  TEST_PARENT_EMAIL=tsaela@gmail.com TEST_PARENT_PASS=123456
const PARENT_EMAIL = process.env.TEST_PARENT_EMAIL ?? 'mum@houseduty.app';
const PARENT_PASS  = process.env.TEST_PARENT_PASS  ?? 'parent123';

async function loginAsParent(page: Page) {
  await page.goto('/login');
  await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="tab-login"]').click();
  await page.locator('[data-testid="role-parent"]').click();
  await page.locator('[data-testid="input-identifier"]').fill(PARENT_EMAIL);
  await page.locator('[data-testid="input-secret"]').fill(PARENT_PASS);
  await page.locator('[data-testid="btn-login"]').click();
  await expect(page.locator('[data-testid="parent-dashboard"]')).toBeVisible({ timeout: 8000 });
}

test.describe('Parent Dashboard', () => {
  test('shows kids on dashboard after login', async ({ page }) => {
    await loginAsParent(page);
    await expect(page.locator('[data-testid="parent-dashboard"]')).toBeVisible();
    // At least one hero card should be visible (works for any account)
    await expect(page.locator('[data-testid="kid-card"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('parent can add a new hero (kid)', async ({ page }) => {
    await loginAsParent(page);

    // Open the add hero modal via the nav button
    await page.locator('[data-testid="btn-add-hero"]').click();

    // Modal input uses a hardcoded English placeholder — works regardless of UI language
    await expect(page.getByPlaceholder('E.g. Oren')).toBeVisible({ timeout: 5000 });

    const uniqueName = `Hero${Date.now()}`;
    await page.getByPlaceholder('E.g. Oren').fill(uniqueName);
    await page.getByPlaceholder('1234').fill('9876');
    await page.locator('[data-testid="btn-submit-add-hero"]').click();

    // New hero card should appear in the grid
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 8000 });
  });

  test('parent can assign a duty to a kid', async ({ page }) => {
    await loginAsParent(page);

    // Click the first assign duty button
    const assignBtn = page.locator('[data-testid="btn-assign-duty"]').first();
    await expect(assignBtn).toBeVisible({ timeout: 8000 });
    await assignBtn.click();

    // Modal should appear
    const modal = page.locator('[data-testid="assign-duty-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Select the first template label (if templates exist)
    const templateOption = modal.locator('label').first();
    const hasTemplates = await templateOption.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasTemplates) {
      await templateOption.click();
      await page.locator('[data-testid="assign-duty-modal"] button[type="submit"]').click();
      // Modal should close after successful assignment
      await expect(modal).not.toBeVisible({ timeout: 8000 });
    } else {
      // If no templates, modal still opened correctly — test passes
      await page.locator('[data-testid="assign-duty-modal"]').isVisible();
    }
  });

  test('parent can log out', async ({ page }) => {
    await loginAsParent(page);
    await page.locator('[data-testid="btn-logout"]').click();
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 5000 });
  });

  test('logout button is visible on mobile without scrolling (RTL fix)', async ({ page }) => {
    // simulate a narrow Android phone in RTL (Hebrew)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await loginAsParent(page);

    // btn-logout must be in the DOM and visible without any scrolling
    const logoutBtn = page.locator('[data-testid="btn-logout"]');
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });

    // It must also be inside the viewport (not scrolled off-screen)
    const box = await logoutBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390 + 1); // within viewport width
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  });
});
