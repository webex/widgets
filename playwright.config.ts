import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Alternatively, read from "../my.env" file.
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const dummyAudioPath = path.resolve(__dirname, './playwright/wav/dummyAudio.wav');
export default defineConfig({
  testDir: './playwright',
  /* Maximum time one test can run for. */
  timeout: 180000,
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'yarn workspace samples-cc-react-app serve',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  fullyParallel: false,
  /* Retry on CI only */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'OAuth: Get Access Token',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'Test: Chrome',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            `--disable-site-isolation-trials`,
            `--disable-web-security`,
            `--no-sandbox`,
            `--disable-features=WebRtcHideLocalIpsWithMdns`,
            `--allow-file-access-from-files`,
            `--use-fake-ui-for-media-stream`,
            `--use-fake-device-for-media-stream`,
            `--use-file-for-fake-audio-capture=${dummyAudioPath}`,
          ],
        }
      },

    },
    // Once we have stability for playwright tests, we can enable the following browsers
    // {
    //   name: 'Test: Firefox',
    //   use: {...devices['Desktop Firefox']},
    //   dependencies: ['chromium'],
    // },

    // {
    //   name: 'Test: Webkit',
    //   use: {...devices['Desktop Safari']},
    //   dependencies: ['firefox'],
    // },
  ],
});
