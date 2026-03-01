import { defineConfig, devices } from '@playwright/test';

/**
 * Production e2e config — runs against https://app.harelitos.com
 * Usage: npx playwright test --config=playwright.config.prod.ts
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e/reports' }]],
  use: {
    baseURL: 'https://app.harelitos.com',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on-first-retry',
  },
  // No webServer — targeting live production deployment
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
