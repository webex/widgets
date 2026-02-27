import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { SamplesPage } from './pages/SamplesPage';
import { MeetingWidgetPage } from './pages/MeetingWidgetPage';


test.describe('Meeting Widget', () => {
  let samplesPage: SamplesPage;
  let meetingPage: MeetingWidgetPage;

  test.beforeAll(async ({ browser }) => {
    // Re-read .env fresh so we pick up the token written by Meetings Setup
    const envPath = path.resolve(__dirname, '../../.env');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    const accessToken = process.env.PW_MEETING_ACCESS_TOKEN!;
    const meetingDestination = process.env.PW_MEETING_DESTINATION!;
    expect(accessToken, 'PW_MEETING_ACCESS_TOKEN must be set').toBeTruthy();
    expect(meetingDestination, 'PW_MEETING_DESTINATION must be set').toBeTruthy();
    const context = await browser.newContext();
    const page = await context.newPage();
    samplesPage = new SamplesPage(page);
    meetingPage = new MeetingWidgetPage(page);
    await samplesPage.open();
    await samplesPage.setAccessToken(accessToken);
    await meetingPage.destination.fill(meetingDestination);
  });

  // ── Suite 1: Join meeting with audio/video off ──

  test.describe.serial('Join meeting with audio/video off', () => {
    test.beforeAll(async () => {
      await meetingPage.loadWidget();
    });

    test.afterAll(async () => {
      await meetingPage.unloadWidget();
    });

    test('has the correct page title', async () => {
      await expect(samplesPage.widgetTitle).toHaveText('Webex Meetings Widget');
    });

    test('loads the meeting widget', async () => {
      await expect(meetingPage.meetingInfo).toBeVisible();
    });

    test('displays the control bar', async () => {
      await expect(meetingPage.controlBar).toBeVisible();
    });

    test('mutes audio before joining meeting', async () => {
      await meetingPage.muteAudioBtn.click();
      await expect(meetingPage.muteAudioBtn).not.toBeVisible();
      await expect(meetingPage.unmuteAudioBtn).toBeVisible();
    });

    test('mutes video before joining meeting', async () => {
      await meetingPage.muteVideoBtn.click();
      await expect(meetingPage.muteVideoBtn).not.toBeVisible();
      await expect(meetingPage.unmuteVideoBtn).toBeVisible();
    });

    test('displays "Waiting for others" after joining meeting', async () => {
      await expect(meetingPage.waitingForOthers).not.toBeVisible();
      await meetingPage.joinMeetingBtn.click();
      await expect(meetingPage.waitingForOthers).toBeVisible({ timeout: 10000 });
    });

    test('keeps the local streams muted after join', async () => {
      await expect(meetingPage.unmuteAudioBtn).toBeVisible();
      await expect(meetingPage.unmuteVideoBtn).toBeVisible();
    });

    test('unmutes audio after joining meeting', async () => {
      await meetingPage.unmuteAudioBtn.click();
      await expect(meetingPage.muteAudioBtn).toBeVisible({ timeout: 10000 });
      await expect(meetingPage.unmuteAudioBtn).not.toBeVisible();
    });

    test('unmutes video after joining meeting', async () => {
      await meetingPage.unmuteVideoBtn.click();
      await expect(meetingPage.muteVideoBtn).toBeVisible({ timeout: 10000 });
      await expect(meetingPage.unmuteVideoBtn).not.toBeVisible();
    });

    test('leaves the meeting', async () => {
      await meetingPage.leaveMeetingBtn.click();
      await expect(meetingPage.meetingWidget).toContainText("You've successfully left the meeting", { timeout: 10000 });
    });

    test('does not display any controls after leaving the meeting', async () => {
      await expect(meetingPage.controlBar).not.toBeVisible();
    });
  });

  // ── Suite 2: Join meeting with audio/video on ──

  test.describe.serial('Join meeting with audio/video on', () => {
    test.beforeAll(async () => {
      await meetingPage.loadWidget();
    });

    test.afterAll(async () => {
      await meetingPage.unloadWidget();
    });

    test('displays "Waiting for others" after joining meeting', async () => {
      await expect(meetingPage.waitingForOthers).not.toBeVisible();
      await meetingPage.joinMeetingBtn.click();
      await expect(meetingPage.waitingForOthers).toBeVisible({ timeout: 10000 });
    });

    test('mutes audio after joining meeting', async () => {
      await meetingPage.muteAudioBtn.click();
      await expect(meetingPage.unmuteAudioBtn).toBeVisible({ timeout: 10000 });
      await expect(meetingPage.muteAudioBtn).not.toBeVisible();
    });

    test('mutes video after joining meeting', async () => {
      await meetingPage.muteVideoBtn.click();
      await expect(meetingPage.unmuteVideoBtn).toBeVisible({ timeout: 10000 });
      await expect(meetingPage.muteVideoBtn).not.toBeVisible();
    });

    test('leaves the meeting', async () => {
      await meetingPage.leaveMeetingBtn.click();
      await expect(meetingPage.meetingWidget).toContainText("You've successfully left the meeting", { timeout: 10000 });
    });
  });
});