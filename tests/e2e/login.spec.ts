import { test, expect } from '@playwright/test';

test.describe('Parent Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 10000 });
  });

  test('shows login screen on first load', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'HouseDuty' })).toBeVisible();
    await expect(page.getByText('Heroes of the Home')).toBeVisible();
    await expect(page.locator('[data-testid="tab-login"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-signup"]')).toBeVisible();
  });

  test('parent logs in successfully', async ({ page }) => {
    await page.locator('[data-testid="tab-login"]').click();
    await page.locator('[data-testid="role-parent"]').click();
    await page.locator('[data-testid="input-identifier"]').fill('mum@houseduty.app');
    await page.locator('[data-testid="input-secret"]').fill('parent123');
    await page.locator('[data-testid="btn-login"]').click();

    await expect(page.locator('[data-testid="parent-dashboard"]')).toBeVisible({ timeout: 8000 });
  });

  test('parent login with wrong password shows error', async ({ page }) => {
    await page.locator('[data-testid="role-parent"]').click();
    await page.locator('[data-testid="input-identifier"]').fill('mum@houseduty.app');
    await page.locator('[data-testid="input-secret"]').fill('wrongpassword');
    await page.locator('[data-testid="btn-login"]').click();

    await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Kid Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 10000 });
  });

  test('kid logs in with name + PIN', async ({ page }) => {
    await page.locator('[data-testid="tab-login"]').click();
    await page.locator('[data-testid="role-kid"]').click();
    await page.locator('[data-testid="input-identifier"]').fill('Daniel');
    await page.locator('[data-testid="input-secret"]').fill('1234');
    await page.locator('[data-testid="btn-login"]').click();

    await expect(page.locator('[data-testid="kid-hero-view"]')).toBeVisible({ timeout: 8000 });
  });

  test('kid login with wrong PIN shows error', async ({ page }) => {
    await page.locator('[data-testid="role-kid"]').click();
    await page.locator('[data-testid="input-identifier"]').fill('Daniel');
    await page.locator('[data-testid="input-secret"]').fill('9999');
    await page.locator('[data-testid="btn-login"]').click();

    await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Sign Up', () => {
  test('new parent registers and lands on dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="tab-signup"]').click();

    const uniqueEmail = `e2e-${Date.now()}@test.com`;
    await page.locator('[data-testid="signup-name"]').fill('E2E Parent');
    await page.locator('[data-testid="signup-email"]').fill(uniqueEmail);
    await page.locator('[data-testid="signup-password"]').fill('securepass');
    await page.locator('[data-testid="btn-signup"]').click();

    await expect(page.locator('[data-testid="parent-dashboard"]')).toBeVisible({ timeout: 8000 });
  });
});
