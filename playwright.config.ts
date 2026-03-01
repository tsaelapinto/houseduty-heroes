import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false, // run serially - shared DB state
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e/reports' }]],
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on-first-retry',
  },
  webServer: [
    {
      command: 'cd packages/server && npx tsx src/index.ts',
      port: 4000,
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: 'cd packages/client && npx vite --port 5175 --mode playwright',
      port: 5175,
      reuseExistingServer: false,
      timeout: 20_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
