import { test, expect, Page, BrowserContext } from '@playwright/test';
import { oauthLogin, multiLoginEnable, initialisePage } from './Utils/initUtils';
import { extensionLogin, stationLogout } from './Utils/stationUtils';
import { getCurrentState, changeState, verifyCurrentState, getStateElapsedTime, checkConsole, checkCallbackSequence } from './Utils/stateUtils';
import { STATES, THEME_COLORS } from './constants';
import dotenv from 'dotenv';

dotenv.config();

let page: Page;
let context: BrowserContext;
let consoleMessages: string[] = [];

// Shared login and setup before all tests

test.describe('User State Widget Functionality Tests', () => {

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
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
    await stationLogout(page);
    await context.close();
  });

  test.beforeEach(async () => {
    consoleMessages.length = 0;
  });

  test('should verify initial state is Meeting', async () => {
    const state = await getCurrentState(page);
    if (state !== STATES.MEETING) throw new Error('Initial state is not Meeting');
  });

  test('should verify Meeting state theme color', async () => {
    const meetingThemeElement = page.getByTestId('state-select');
    const meetingThemeColor = await meetingThemeElement.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(meetingThemeColor).toBe(THEME_COLORS.MEETING);
  });

  test('should change state to Available and verify theme and timer reset', async () => {
    await verifyCurrentState(page, STATES.MEETING);
    await page.waitForTimeout(5000);
    const timerBefore = await getStateElapsedTime(page);
    await changeState(page, STATES.AVAILABLE);
    await page.waitForTimeout(3000);
    const timerAfter = await getStateElapsedTime(page);

    const parseTimer = (timer: string) => {
      const parts = timer.split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    };
    
    expect(parseTimer(timerAfter)).toBeLessThan(parseTimer(timerBefore));

    const themeElement = page.getByTestId('state-select');
    const themeColor = await themeElement.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(themeColor).toBe(THEME_COLORS.AVAILABLE);
  });

  test('should verify existence and order in which callback and API success are logged for Available state', async () => {
    await changeState(page, STATES.MEETING);
    await page.waitForTimeout(2000);
    consoleMessages.length = 0;
    await changeState(page, STATES.AVAILABLE);
    await page.waitForTimeout(3000);
    const isCallbackSuccessful = await checkCallbackSequence(page, STATES.AVAILABLE, consoleMessages);
    if (!isCallbackSuccessful) throw new Error('Callback for Available state not successful');
  });

  test('should verify state persistence after page reload', async () => {
    await changeState(page, STATES.MEETING);
    await page.waitForTimeout(1000);
    await changeState(page, STATES.AVAILABLE);
    await verifyCurrentState(page, STATES.AVAILABLE);
    await page.waitForTimeout(5000);
  
    consoleMessages.length = 0;
    await page.reload();
    await initialisePage(page);
    
    const visible = await page.getByTestId('state-select').isVisible();
    if (!visible) throw new Error('State select not visible after reload');
    
    await verifyCurrentState(page, STATES.AVAILABLE);
    const callbackTriggered = await checkConsole(page, STATES.AVAILABLE, consoleMessages);
    if (!callbackTriggered) throw new Error('Callback not triggered after reload');
    
    const state = await getCurrentState(page);
    if (state !== STATES.AVAILABLE) throw new Error('State is not Available after reload');
  });

  test('should test multi-session synchronization', async () => {
    const multiSessionPage = await context.newPage();
    await oauthLogin(multiSessionPage);
    await initialisePage(multiSessionPage);
    await multiSessionPage.waitForTimeout(3000);

    await changeState(page, STATES.AVAILABLE);
    await verifyCurrentState(page, STATES.AVAILABLE);
    await multiSessionPage.waitForTimeout(2000);

    await verifyCurrentState(multiSessionPage, STATES.AVAILABLE);
    
    await multiSessionPage.waitForTimeout(2000);
    const [timer1, timer2] = await Promise.all([
      getStateElapsedTime(page),
      getStateElapsedTime(multiSessionPage)
    ]);
    
    if (timer1 !== timer2) {
      throw new Error(`Multi-session timer synchronization failed: Primary=${timer1}, Secondary=${timer2}`);
    }

    await multiSessionPage.close();
  });

  test('should test idle state transition and dual timer', async () => {
    await changeState(page, STATES.MEETING);
    await verifyCurrentState(page, STATES.MEETING);
    await page.waitForTimeout(2000);
    consoleMessages.length = 0;

    await changeState(page, STATES.LUNCH);
    await verifyCurrentState(page, STATES.LUNCH);
    await page.waitForTimeout(2000);
    
    const found = await checkConsole(page, STATES.LUNCH, consoleMessages);
    if (!found) throw new Error('Callback for Lunch state not successful');
    
    await page.waitForTimeout(5000);
    const dualTimer = await getStateElapsedTime(page);

    const timerParts = dualTimer.split(' / ');
    if (timerParts.length !== 2) throw new Error('Dual timer format is incorrect');
    
    const isValidFormat = timerParts.every(part => /^(\d{1,2}:\d{2}(:\d{2})?)$/.test(part));
    if (!isValidFormat) throw new Error('Dual timer format is not valid');
    
    const [firstTimer, secondTimer] = timerParts.map(part => part.split(':').map(Number));
    if (firstTimer.length < 2 || secondTimer.length < 2) {
      throw new Error('Dual timer does not have enough parts');
    }
    
    expect(firstTimer[0]).toBeGreaterThanOrEqual(0);
    expect(firstTimer[1]).toBeGreaterThanOrEqual(0);
    expect(secondTimer[0]).toBeGreaterThanOrEqual(0);
    expect(secondTimer[1]).toBeGreaterThanOrEqual(0);
    expect(firstTimer.length === 2 || firstTimer.length === 3).toBe(true);
    expect(secondTimer.length === 2 || secondTimer.length === 3).toBe(true);

    await changeState(page, STATES.AVAILABLE);
  });
});
