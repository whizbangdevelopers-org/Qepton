import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration for Qepton
 * Based on NixOS-compatible remote_testing template
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Global setup - validates GitHub token before running tests */
  globalSetup: './tests/e2e/global-setup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use - outputs to e2e-docker/output. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'e2e-docker/output/reports' }],
    ['json', { outputFile: 'e2e-docker/output/test-results.json' }],
    ['list']
  ],

  /* Test results output directory */
  outputDir: 'e2e-docker/output/test-results',

  /* Set timeout for each test */
  timeout: 120000,

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL for the dev server */
    baseURL: 'http://localhost:9000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for each action */
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use system Chrome/Chromium on NixOS if PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is set,
        // otherwise use Playwright's bundled browser (works in Docker containers)
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
          : {},
      },
    },

    // Only run these browsers in full local testing (not in Docker CI)
    ...(process.env.FULL_BROWSER_TEST ? [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
      {
        name: 'Mobile Chrome',
        use: { ...devices['Pixel 5'] },
      },
      {
        name: 'Mobile Safari',
        use: { ...devices['iPhone 12'] },
      },
    ] : []),
  ],

  /* Web server configuration - starts quasar dev automatically */
  webServer: {
    command: 'npx quasar dev',
    url: 'http://localhost:9000',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
