import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/ux',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      testMatch: /^(?!.*\.(desktop|tablet)\.spec\.ts$).*\.spec\.ts$/,
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
      },
    },
    {
      name: 'desktop',
      testMatch: /.*\.desktop\.spec\.ts$/,
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'tablet',
      testMatch: /.*\.tablet\.spec\.ts$/,
      use: {
        browserName: 'chromium',
        viewport: { width: 834, height: 1194 },
      },
    },
  ],
});
