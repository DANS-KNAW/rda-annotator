import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e/sites',
  timeout: 90000, // External sites need longer timeouts
  retries: 1, // Retry once for transient network failures
  workers: 1, // Extensions require sequential execution
  reporter: 'list',

  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
  ],
})
