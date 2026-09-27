import {
  defineConfig,
  devices,
  type Project,
  type PlaywrightTestOptions,
  type PlaywrightWorkerOptions,
} from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import {USER_SETS} from './playwright/test-data';

dotenv.config({path: path.resolve(__dirname, '.env')});

const dummyAudioPath = path.resolve(__dirname, './playwright/wav/dummyAudio.wav');
const aiSummarySpecs = ['**/suites/ai-summary-tests.spec.ts', '**/tests/ai-summary-test.spec.ts'];
const aiSummaryProjectEnabled = process.env.AI_SUMMARY_E2E === '1';
const resolveAiSummaryPort = (): string => {
  const port = process.env.AI_SUMMARY_E2E_PORT || '3001';
  if (!/^\d+$/.test(port)) {
    throw new Error('AI_SUMMARY_E2E_PORT must be a numeric TCP port between 1 and 65535');
  }
  const parsedPort = Number(port);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error('AI_SUMMARY_E2E_PORT must be a numeric TCP port between 1 and 65535');
  }
  return String(parsedPort);
};
const defaultSampleServerBaseURL = 'http://localhost:3000';
const aiSummarySampleServerPort = aiSummaryProjectEnabled ? resolveAiSummaryPort() : '3001';
const aiSummarySampleServerBaseURL = `http://127.0.0.1:${aiSummarySampleServerPort}`;
const sampleServerBaseURL = aiSummaryProjectEnabled ? aiSummarySampleServerBaseURL : defaultSampleServerBaseURL;

export default defineConfig({
  testDir: './playwright',
  timeout: 220000,
  webServer: aiSummaryProjectEnabled
    ? {
        command: `yarn workspace samples-cc-react-app serve --host 127.0.0.1 --port ${aiSummarySampleServerPort}`,
        url: aiSummarySampleServerBaseURL,
        reuseExistingServer: false,
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : {
        command: 'yarn workspace samples-cc-react-app serve',
        url: defaultSampleServerBaseURL,
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe',
      },
  retries: 0,
  fullyParallel: true,
  workers: aiSummaryProjectEnabled ? 1 : Object.keys(USER_SETS).length,
  reporter: aiSummaryProjectEnabled ? 'list' : 'html',
  use: {
    baseURL: sampleServerBaseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'OAuth: Get Access Token',
      testMatch: /global\.setup\.ts/,
      testIgnore: aiSummarySpecs,
    },
    // Dynamically generate test projects from USER_SETS
    ...Object.entries(USER_SETS).map(([setName, setData], index) => {
      return {
        name: setName,
        dependencies: ['OAuth: Get Access Token'],
        fullyParallel: false,
        retries: 1,
        testMatch: [`**/suites/${setData.TEST_SUITE}`],
        testIgnore: aiSummarySpecs,
        use: {
          ...devices['Desktop Chrome'],
          channel: 'chrome',
          storageState: undefined,
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
              `--remote-debugging-port=${9221 + index}`,
              `--disable-extensions`,
              `--disable-plugins`,
              `--window-position=${index * 1300},0`,
              `--window-size=1280,720`,
            ],
          },
        },
      };
    }),
    ...(aiSummaryProjectEnabled
      ? [
          {
            name: 'AI Summary Deterministic',
            testDir: './playwright',
            testMatch: aiSummarySpecs,
            fullyParallel: false,
            use: {
              ...devices['Desktop Chrome'],
              locale: 'en-US',
              colorScheme: 'light',
              contextOptions: {reducedMotion: 'reduce'},
              deviceScaleFactor: 1,
            },
          } satisfies Project<PlaywrightTestOptions, PlaywrightWorkerOptions>,
        ]
      : []),
  ],
});
