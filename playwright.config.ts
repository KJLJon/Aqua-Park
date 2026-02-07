import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: 'iPhone 13 Pro',
      use: {
        ...devices['iPhone 13 Pro'],
      },
    },
    {
      name: 'Pixel 9',
      use: {
        viewport: { width: 412, height: 915 },
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
