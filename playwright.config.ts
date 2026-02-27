import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { USER_SETS } from './playwright/test-data';
import { MEETING_SERVER_COMMAND, MEETING_SERVER_URL, MEETING_BASE_URL } from './playwright/meetings/constants';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const dummyAudioPath = path.resolve(__dirname, './playwright/wav/dummyAudio.wav');

const e2eConfig = [
  `--disable-site-isolation-trials`, // Disables site isolation so cross-origin iframes share a process, needed for WebRTC tests
  `--disable-web-security`, // Disables CORS and same-origin policy for cross-origin API/resource access in tests
  `--no-sandbox`, // Disables the Chrome sandbox (required in CI environments running as root)
  `--disable-features=WebRtcHideLocalIpsWithMdns`, // Exposes real local IPs instead of mDNS candidates for WebRTC ICE
  `--allow-file-access-from-files`, // Allows file:// pages to read other file:// resources
  `--use-fake-ui-for-media-stream`, // Auto-grants camera/mic permissions without showing the browser prompt
  `--use-fake-device-for-media-stream`, // Uses fake audio/video streams instead of real hardware
  `--use-file-for-fake-audio-capture=${dummyAudioPath}`, // Feeds the specified WAV file as the fake audio input
  `--disable-extensions`, // Prevents browser extensions from loading and interfering with tests
  `--disable-plugins`, // Prevents browser plugins from loading and interfering with tests
  `--window-size=1280,720`, // Sets a consistent viewport size for visual reproducibility
];

export default defineConfig({
  testDir: './playwright',
  timeout: 180000,
  webServer: [
    {
      command: 'yarn workspace samples-cc-react-app serve',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: MEETING_SERVER_COMMAND,
      url: MEETING_SERVER_URL,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
      ignoreHTTPSErrors: true,
    },
  ],
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
            args: [`--remote-debugging-port=${9221 + index}`, `--window-position=${index * 1300},0`, ...e2eConfig],
          },
        },
      };
    }),
    {
      name: 'OAuth: Get Meeting Access Token',
      testMatch: /meetings\.setup\.ts/,
      use: {
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
    {
      name: 'Meetings Widget Test',
      dependencies: ['OAuth: Get Meeting Access Token'],
      testMatch: '**/meetings/*.spec.ts',
      timeout: 60000,
      fullyParallel: false,
      retries: 1,
      use: {
        baseURL: MEETING_BASE_URL,
        trace: 'retain-on-failure',
        permissions: ['microphone', 'camera'],
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: ['--ignore-certificate-errors', ...e2eConfig],
        },
      },
    },
  ],
});