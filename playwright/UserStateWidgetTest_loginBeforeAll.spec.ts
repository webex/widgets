import { test, expect, Page, BrowserContext } from '@playwright/test';
import { oauthLogin, multiLoginEnable, initialisePage } from './Utils/initUtils';
import { extensionLogin, stationLogout } from './Utils/stationLoginUtils';
import { getCurrentState, changestate, verifyCurrentState, getStateElapsedTime, checkConsole, checkCallbackSequence } from './Utils/stateUtils';
import dotenv from 'dotenv';

dotenv.config();

let page: Page;
let context: BrowserContext;

test.describe('User State Widget - Login Once, All Tests', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await oauthLogin(page);
    await multiLoginEnable(page);
    await initialisePage(page);
    const loginButtonExists = await page.getByTestId('login-button').isVisible().catch(() => false);
    if (loginButtonExists) {
      await extensionLogin(page);
    } else {
      await stationLogout(page);
      await extensionLogin(page);
    }
    await expect(page.getByTestId('state-select')).toBeVisible();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should verify initial state is Meeting', async () => {
    const state = await getCurrentState(page);
    if (state !== 'Meeting') throw new Error('Initial state is not Meeting');
  });

  test('should verify Meeting state theme color', async () => {
    const meetingThemeElement = page.getByTestId('state-select');
    const meetingThemeColor = await meetingThemeElement.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(meetingThemeColor).toBe('rgba(0, 0, 0, 0.11)');
  });

  test('should change state to Available and verify theme and timer reset', async () => {
    await page.waitForTimeout(5000);
    const timerBefore = await getStateElapsedTime(page);
    await changestate(page, 'Available');
    await page.waitForTimeout(3000);
    const timerAfter = await getStateElapsedTime(page);
    const parseTimer = (timer: string) => {
      const parts = timer.split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    };
    expect(parseTimer(timerAfter)).toBeLessThan(parseTimer(timerBefore));
    const themeElement = page.getByTestId('state-select');
    const themeColor = await themeElement.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(themeColor).toBe('rgb(206, 245, 235)');
  });

  test('should verify callback for Available state', async () => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const message = msg.text();
      consoleMessages.push(message);
    });
    await changestate(page, 'Meeting');
    await page.waitForTimeout(2000);
    consoleMessages.length = 0;
    await changestate(page, 'Available');
    await page.waitForTimeout(3000);
    const isCallbackSuccessful = await checkConsole(page, 'Available', consoleMessages);
    if (!isCallbackSuccessful) throw new Error('Callback for Available state not successful');
  });

  test('should verify state persistence after page reload', async () => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const message = msg.text();
      consoleMessages.push(message);
    });
    await changestate(page, 'Meeting');
    await page.waitForTimeout(1000);
    consoleMessages.length = 0;
    await changestate(page, 'Available');
    await page.waitForTimeout(2000);
    await verifyCurrentState(page, 'Available');
    await page.reload();
    await initialisePage(page);
    await page.waitForTimeout(5000);
    const visible = await page.getByTestId('state-select').isVisible();
    if (!visible) throw new Error('State select not visible after reload');
    const callbackTriggered = await checkConsole(page, 'Available', consoleMessages);
    if (!callbackTriggered) throw new Error('Callback not triggered after reload');
    const state = await getCurrentState(page);
    if (state !== 'Available') throw new Error('State is not Available after reload');
  });

  test('should validate callback sequence', async () => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const message = msg.text();
      consoleMessages.push(message);
    });
    await changestate(page, 'Meeting');
    await changestate(page, 'Available');
    await page.waitForTimeout(2000);
    const found = await checkCallbackSequence(page, 'Available', consoleMessages);
    if (!found) throw new Error('Callback for Available state not successful');
    const sequenceValid = await checkCallbackSequence(page, 'Available', consoleMessages);
    if (!sequenceValid) throw new Error('Callback sequence is not valid');
  });

  test('should test multi-session synchronization', async () => {
    let multiSessionPage: Page | undefined;
    try {
      multiSessionPage = await context.newPage();
      const consoleMessages2: string[] = [];
      multiSessionPage.on('console', msg => consoleMessages2.push(msg.text()));
      await oauthLogin(multiSessionPage);
      await initialisePage(multiSessionPage);
      await multiSessionPage.waitForTimeout(3000);
      await changestate(page, 'Available');
      await page.waitForTimeout(2000);
      const state1 = await getCurrentState(page);
      const state2 = await getCurrentState(multiSessionPage);
      if (state1 !== 'Available' || state2 !== 'Available') throw new Error('State not synchronized');
      const timer1 = await getStateElapsedTime(page);
      const timer2 = await getStateElapsedTime(multiSessionPage);
      if (timer1 !== timer2) throw new Error('Timers not synchronized');
    } finally {
      if (multiSessionPage) await multiSessionPage.close();
    }
  });

  test('should test idle state transition and dual timer', async () => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const message = msg.text();
      consoleMessages.push(message);
    });
    await changestate(page, 'Meeting');
    await verifyCurrentState(page, 'Meeting');
    await page.waitForTimeout(2000);
    consoleMessages.length = 0;
    await changestate(page, 'Lunch');
    await verifyCurrentState(page, 'Lunch');
    await page.waitForTimeout(2000);
    const found = await checkConsole(page, 'Lunch', consoleMessages);
    if (!found) throw new Error('Callback for Lunch state not successful');
    await page.waitForTimeout(5000);
    await getStateElapsedTime(page);
  });
});
