import { test, expect, Page } from '@playwright/test';

async function loginAsParent(page: Page) {
  await page.goto('/login');
  await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 10000 });
  await page.locator('[data-testid="tab-login"]').click();
  await page.locator('[data-testid="role-parent"]').click();
  await page.locator('[data-testid="input-identifier"]').fill('mum@houseduty.app');
  await page.locator('[data-testid="input-secret"]').fill('parent123');
  await page.locator('[data-testid="btn-login"]').click();
  await expect(page.locator('[data-testid="parent-dashboard"]')).toBeVisible({ timeout: 8000 });
}

test.describe('Parent Dashboard', () => {
  test('shows kids on dashboard after login', async ({ page }) => {
    await loginAsParent(page);
    await expect(page.locator('[data-testid="parent-dashboard"]')).toBeVisible();
    // Demo kids Daniel and Maya should appear
    await expect(page.getByText('Daniel')).toBeVisible();
    await expect(page.getByText('Maya')).toBeVisible();
  });

  test('parent can add a new hero (kid)', async ({ page }) => {
    await loginAsParent(page);

    await page.getByRole('button', { name: /\+ Add Hero/i }).first().click();
    await expect(page.getByRole('heading', { name: /Add New Hero/i })).toBeVisible();

    const uniqueName = `Hero${Date.now()}`;
    await page.getByPlaceholder(/E\.g\. Oren/i).fill(uniqueName);
    await page.getByPlaceholder('1234').fill('9876');
    await page.getByRole('button', { name: '🦸 Add Hero' }).click();

    // New hero card should appear
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 6000 });
  });

  test('parent can assign a duty to a kid', async ({ page }) => {
    await loginAsParent(page);

    // Click the first "+ Assign Duty" button
    const assignBtn = page.getByRole('button', { name: /\+ Assign Duty/i }).first();
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();

    // Modal should appear with template list
    await expect(page.getByText(/Assign to/i)).toBeVisible();
    // Select the first template
    const templateOption = page.locator('label').first();
    await templateOption.click();

    await page.getByRole('button', { name: /📋 Assign Duty/i }).click();

    // Modal should close
    await expect(page.getByText(/Assign to/i)).not.toBeVisible({ timeout: 5000 });
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
