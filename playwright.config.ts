import {defineConfig, devices} from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import {USER_SETS} from './playwright/test-data';

dotenv.config({path: path.resolve(__dirname, '.env')});

const dummyAudioPath = path.resolve(__dirname, './playwright/wav/dummyAudio.wav');

export default defineConfig({
  testDir: './playwright',
  timeout: 180000,
  webServer: {
    command: 'yarn workspace samples-cc-react-app serve',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  retries: 0,
  fullyParallel: true,
  workers: Object.keys(USER_SETS).length, // Dynamic worker count based on USER_SETS
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'OAuth: Get Access Token',
      testMatch: /global\.setup\.ts/,
    },
    // Dynamically generate test projects from USER_SETS
    ...Object.entries(USER_SETS).map(([setName, setData], index) => {
      return {
        name: setName,
        dependencies: ['OAuth: Get Access Token'],
        fullyParallel: false,
        retries: 1,
        testMatch: [`**/suites/${setData.TEST_SUITE}`],
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
  ],
});
