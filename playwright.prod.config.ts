/**
 * Production Playwright config.
 * Runs against the live deployed app — no local servers.
 * Usage: npm run test:prod
 *        npm run test:prod -- --grep "kid isolation"
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  fullyParallel: false,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e/reports-prod' }]],
  use: {
    baseURL: 'https://app.harelitos.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // Expose the API base so tests can call it directly
    extraHTTPHeaders: {},
  },
  // No webServer block — we hit the live service
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
