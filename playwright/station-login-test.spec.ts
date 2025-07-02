import {test, expect, Page, BrowserContext} from '@playwright/test';
import {
  enableAllWidgets,
  enableMultiLogin,
  initialiseWidgets,
  agentRelogin,
  setupMultiLoginPage,
  loginViaAccessToken,
} from './Utils/initUtils';
import {stationLogout, telephonyLogin} from './Utils/stationLoginUtils';
import {
  getCurrentState,
  changeUserState,
  verifyCurrentState,
  getStateElapsedTime,
  validateConsoleStateChange,
  checkCallbackSequence,
} from './Utils/userStateUtils';
import {USER_STATES, THEME_COLORS, LOGIN_MODE, LONG_WAIT} from './constants';
import dotenv from 'dotenv';

dotenv.config();

let page: Page;
let context: BrowserContext;
let consoleMessages: string[] = [];

function parseTimeString(timeString: string): number {
  const parts = timeString.split(':');
  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseInt(parts[1], 10) || 0;
  return minutes * 60 + seconds;
}

async function waitForWebSocketDisconnection(consoleMessages: string[], timeoutMs: number = 15000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const webSocketDisconnectLog = consoleMessages.find(
      (msg) =>
        msg.includes('Failed to load resource: net::ERR_INTERNET_DISCONNECTED') ||
        msg.includes('[WebSocketStatus] event=checkOnlineStatus | online status= false')
    );
    if (webSocketDisconnectLog) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

async function waitForWebSocketReconnection(consoleMessages: string[], timeoutMs: number = 15000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const webSocketReconnectLog = consoleMessages.find((msg) =>
      msg.includes('[WebSocketStatus] event=checkOnlineStatus | online status= true')
    );
    if (webSocketReconnectLog) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

// Helper function to verify login mode
async function verifyLoginMode(page: Page, expectedMode: string): Promise<void> {
  await expect(page.getByTestId('login-option-select').locator('#select-base-triggerid')).toContainText(expectedMode);
}

// Helper function to ensure user state widget is visible and login if needed
async function ensureUserStateVisible(page: Page, loginMode: string): Promise<void> {
  const isUserStateWidgetVisible = await page
    .getByTestId('state-select')
    .isVisible()
    .catch(() => false);
  if (!isUserStateWidgetVisible) {
    await telephonyLogin(page, loginMode);
    await expect(page.getByTestId('state-select')).toBeVisible({timeout: LONG_WAIT});
  }
}

test.describe('Station Login Tests - Dial Number Mode', () => {
  test.beforeAll(async ({browser}) => {
    context = await browser.newContext();
    page = await context.newPage();
    consoleMessages = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));
    await loginViaAccessToken(page, 'AGENT1');
    await enableMultiLogin(page);
    await enableAllWidgets(page);
    await initialiseWidgets(page);
    const isLogoutButtonVisible = await page
      .getByTestId('samples:station-logout-button')
      .isVisible()
      .catch(() => false);
    if (isLogoutButtonVisible) {
      await stationLogout(page);
    }
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
  });

  test.afterAll(async () => {
    if (page) {
      const isLogoutButtonVisible = await page
        .getByTestId('samples:station-logout-button')
        .isVisible()
        .catch(() => false);
      if (isLogoutButtonVisible) {
        await stationLogout(page);
      }
      await context.close();
    }
  });

  test.beforeEach(async () => {
    consoleMessages.length = 0;
  });

  test('should login with Dial Number mode and verify all fields are visible', async () => {
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    const loginModeSelector = page.getByTestId('login-option-select');
    await expect(loginModeSelector).toBeVisible();
    const phoneNumberInput = page.getByTestId('dial-number-input');
    await expect(phoneNumberInput).toBeVisible();
    const teamSelectionDropdown = page.getByTestId('teams-select-dropdown');
    await expect(teamSelectionDropdown).toBeVisible();
    const saveAndContinueButton = page.getByTestId('login-button');
    await expect(saveAndContinueButton).toBeVisible();
    await expect(saveAndContinueButton).toContainText('Save & Continue');
    await telephonyLogin(page, LOGIN_MODE.DIAL_NUMBER);
    await expect(page.getByTestId('state-select')).toBeVisible({timeout: LONG_WAIT});
    await verifyLoginMode(page, 'Dial Number');
  });

  test('should handle page reload and maintain Dial Number login state', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.DIAL_NUMBER);
    await agentRelogin(page);
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    await verifyLoginMode(page, 'Dial Number');
    const dialNumber = process.env.PW_AGENT1_DIAL_NUMBER;
    if (dialNumber) {
      await expect(page.getByTestId('dial-number-input').locator('input')).toHaveValue(dialNumber);
    }
    await expect(page.getByTestId('state-select')).toBeVisible();
  });

  test('should retain user state timer and switch to Meeting state after network disconnection with Dial Number mode', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.DIAL_NUMBER);
    await changeUserState(page, USER_STATES.MEETING);
    await verifyCurrentState(page, USER_STATES.MEETING);
    const timerBeforeDisconnection = await getStateElapsedTime(page);
    const secondsBeforeDisconnection = parseTimeString(timerBeforeDisconnection);
    await page.waitForTimeout(3000);
    consoleMessages.length = 0;
    await page.context().setOffline(true);
    await page.waitForTimeout(3000);
    const isWebSocketDisconnected = await waitForWebSocketDisconnection(consoleMessages);
    expect(isWebSocketDisconnected).toBe(true);
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    await verifyLoginMode(page, 'Dial Number');
    consoleMessages.length = 0;
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);
    const isWebSocketReconnected = await waitForWebSocketReconnection(consoleMessages);
    expect(isWebSocketReconnected).toBe(true);
    await verifyCurrentState(page, USER_STATES.MEETING);
    const timerAfterReconnection = await getStateElapsedTime(page);
    const secondsAfterReconnection = parseTimeString(timerAfterReconnection);
    expect(secondsAfterReconnection).toBeGreaterThan(secondsBeforeDisconnection);
    await verifyLoginMode(page, 'Dial Number');
  });

  // TODO: The bug of timer reset for Available state should be fixed before implementing this test case
  test.skip('should reset user state timer and maintain Available state after network disconnection with Dial Number mode', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.DIAL_NUMBER);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(15000);
    const timerBeforeDisconnection = await getStateElapsedTime(page);
    const secondsBeforeDisconnection = parseTimeString(timerBeforeDisconnection);
    consoleMessages.length = 0;
    await page.context().setOffline(true);
    const isWebSocketDisconnected = await waitForWebSocketDisconnection(consoleMessages);
    expect(isWebSocketDisconnected).toBe(true);
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    await verifyLoginMode(page, 'Dial Number');
    consoleMessages.length = 0;
    await page.context().setOffline(false);
    const isWebSocketReconnected = await waitForWebSocketReconnection(consoleMessages);
    expect(isWebSocketReconnected).toBe(true);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    const timerAfterReconnection = await getStateElapsedTime(page);
    const secondsAfterReconnection = parseTimeString(timerAfterReconnection);
    expect(secondsAfterReconnection).toBeLessThan(secondsBeforeDisconnection);
    await page.waitForTimeout(10000);
    const agentStateChangeLog = consoleMessages.find(
      (msg) => msg.includes('AGENT Status set successfully') || msg.includes('Agent state changed successfully')
    );
    expect(agentStateChangeLog).toBeTruthy();
    await verifyLoginMode(page, 'Dial Number');
  });

  test('should support multi-login synchronization for Dial Number Mode ', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.DIAL_NUMBER);
    const multiSessionPage = await setupMultiLoginPage(context);
    await verifyLoginMode(multiSessionPage, 'Dial Number');
    //Verify if signing out from one session logs out the other session
    await multiSessionPage.getByTestId('samples:station-logout-button').click();
    await page.waitForTimeout(2000);
    const isLogoutButtonVisible = await page
      .getByTestId('samples:station-logout-button')
      .isVisible()
      .catch(() => false);
    expect(isLogoutButtonVisible).toBe(false);

    await multiSessionPage.close();
  });
});

test.describe('Station Login Tests - Extension Mode', () => {
  test.beforeAll(async ({browser}) => {
    context = await browser.newContext();
    page = await context.newPage();
    consoleMessages = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));
    await loginViaAccessToken(page, 'AGENT1');
    await enableMultiLogin(page);
    await enableAllWidgets(page);
    await initialiseWidgets(page);
    const isLogoutButtonVisible = await page
      .getByTestId('samples:station-logout-button')
      .isVisible()
      .catch(() => false);
    if (isLogoutButtonVisible) {
      await stationLogout(page);
    }
  });

  test.afterAll(async () => {
    if (page) {
      const isLogoutButtonVisible = await page
        .getByTestId('samples:station-logout-button')
        .isVisible()
        .catch(() => false);
      if (isLogoutButtonVisible) {
        await stationLogout(page);
      }
      await context.close();
    }
  });

  test.beforeEach(async () => {
    consoleMessages.length = 0;
  });

  test('should login with Extension mode and verify all fields are visible', async () => {
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    const loginModeSelector = page.getByTestId('login-option-select');
    await expect(loginModeSelector).toBeVisible();
    const phoneNumberInput = page.getByTestId('dial-number-input');
    await expect(phoneNumberInput).toBeVisible();
    const teamSelectionDropdown = page.getByTestId('teams-select-dropdown');
    await expect(teamSelectionDropdown).toBeVisible();
    const saveAndContinueButton = page.getByTestId('login-button');
    await expect(saveAndContinueButton).toBeVisible();
    await expect(saveAndContinueButton).toContainText('Save & Continue');
    await telephonyLogin(page, LOGIN_MODE.EXTENSION);
    await expect(page.getByTestId('state-select')).toBeVisible({timeout: LONG_WAIT});
    await verifyLoginMode(page, 'Extension');
  });

  test('should handle page reload and maintain Extension login state', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.EXTENSION);
    await agentRelogin(page);
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    await verifyLoginMode(page, 'Extension');
    const extensionNumber = process.env.PW_AGENT1_EXTENSION;
    if (extensionNumber) {
      await expect(page.getByTestId('dial-number-input').locator('input')).toHaveValue(extensionNumber);
    }
    await expect(page.getByTestId('state-select')).toBeVisible();
  });

  test('should retain user state timer and switch to Meeting state after network disconnection with Extension mode', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.EXTENSION);
    await changeUserState(page, USER_STATES.MEETING);
    await verifyCurrentState(page, USER_STATES.MEETING);
    const timerBeforeDisconnection = await getStateElapsedTime(page);
    const secondsBeforeDisconnection = parseTimeString(timerBeforeDisconnection);
    await page.waitForTimeout(3000);
    consoleMessages.length = 0;
    await page.context().setOffline(true);
    await page.waitForTimeout(3000);
    const isWebSocketDisconnected = await waitForWebSocketDisconnection(consoleMessages);
    expect(isWebSocketDisconnected).toBe(true);
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    await verifyLoginMode(page, 'Extension');
    consoleMessages.length = 0;
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);
    const isWebSocketReconnected = await waitForWebSocketReconnection(consoleMessages);
    expect(isWebSocketReconnected).toBe(true);
    await verifyCurrentState(page, USER_STATES.MEETING);
    const timerAfterReconnection = await getStateElapsedTime(page);
    const secondsAfterReconnection = parseTimeString(timerAfterReconnection);
    expect(secondsAfterReconnection).toBeGreaterThan(secondsBeforeDisconnection);
    await verifyLoginMode(page, 'Extension');
  });

  // TODO: The bug of timer reset for Available state should be fixed before implementing this test case
  test.skip('should reset user state timer and maintain Available state after network disconnection with Extension mode', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.EXTENSION);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(15000);
    const timerBeforeDisconnection = await getStateElapsedTime(page);
    const secondsBeforeDisconnection = parseTimeString(timerBeforeDisconnection);
    consoleMessages.length = 0;
    await page.context().setOffline(true);
    const isWebSocketDisconnected = await waitForWebSocketDisconnection(consoleMessages);
    expect(isWebSocketDisconnected).toBe(true);
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    await verifyLoginMode(page, 'Extension');
    consoleMessages.length = 0;
    await page.context().setOffline(false);
    const isWebSocketReconnected = await waitForWebSocketReconnection(consoleMessages);
    expect(isWebSocketReconnected).toBe(true);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    const timerAfterReconnection = await getStateElapsedTime(page);
    const secondsAfterReconnection = parseTimeString(timerAfterReconnection);
    expect(secondsAfterReconnection).toBeLessThan(secondsBeforeDisconnection);
    await page.waitForTimeout(10000);
    const agentStateChangeLog = consoleMessages.find(
      (msg) => msg.includes('AGENT Status set successfully') || msg.includes('Agent state changed successfully')
    );
    expect(agentStateChangeLog).toBeTruthy();
    await verifyLoginMode(page, 'Extension');
  });

  test('should support multi-login synchronization for Extension Mode', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.EXTENSION);
    const multiSessionPage = await setupMultiLoginPage(context);
    await verifyLoginMode(multiSessionPage, 'Extension');
    await multiSessionPage.getByTestId('samples:station-logout-button').click();
    await page.waitForTimeout(2000);
    const isLogoutButtonVisible = await page
      .getByTestId('samples:station-logout-button')
      .isVisible()
      .catch(() => false);
    expect(isLogoutButtonVisible).toBe(false);
    await multiSessionPage.close();
  });
});

test.describe('Station Login Tests - Desktop Mode', () => {
  test.beforeAll(async ({browser}) => {
    context = await browser.newContext();
    page = await context.newPage();
    consoleMessages = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));
    await loginViaAccessToken(page, 'AGENT1');
    await enableAllWidgets(page);
    await initialiseWidgets(page);
    const isLogoutButtonVisible = await page
      .getByTestId('samples:station-logout-button')
      .isVisible()
      .catch(() => false);
    if (isLogoutButtonVisible) {
      await stationLogout(page);
    }
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
  });

  test.afterAll(async () => {
    if (page) {
      await stationLogout(page);
      await context.close();
    }
  });

  test.beforeEach(async () => {
    consoleMessages.length = 0;
  });

  test('should login with Desktop mode and verify all fields are visible', async () => {
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    const loginModeSelector = page.getByTestId('login-option-select');
    await expect(loginModeSelector).toBeVisible();
    const teamSelectionDropdown = page.getByTestId('teams-select-dropdown');
    await expect(teamSelectionDropdown).toBeVisible();
    const saveAndContinueButton = page.getByTestId('login-button');
    await expect(saveAndContinueButton).toBeVisible();
    await expect(saveAndContinueButton).toContainText('Save & Continue');
    await telephonyLogin(page, LOGIN_MODE.DESKTOP);
    await expect(page.getByTestId('state-select')).toBeVisible({timeout: 3000});
    await verifyLoginMode(page, 'Desktop');
  });

  test('should handle page reload and maintain Desktop login state', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.DESKTOP);
    await agentRelogin(page);
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    await verifyLoginMode(page, 'Desktop');
    await expect(page.getByTestId('state-select')).toBeVisible();
  });

  test('should retain user state timer and switch to Meeting state after network disconnection with Desktop mode', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.DESKTOP);
    await changeUserState(page, USER_STATES.MEETING);
    await verifyCurrentState(page, USER_STATES.MEETING);
    const timerBeforeDisconnection = await getStateElapsedTime(page);
    const secondsBeforeDisconnection = parseTimeString(timerBeforeDisconnection);
    await page.waitForTimeout(3000);
    consoleMessages.length = 0;
    await page.context().setOffline(true);
    const isWebSocketDisconnected = await waitForWebSocketDisconnection(consoleMessages);
    expect(isWebSocketDisconnected).toBe(true);
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    await verifyLoginMode(page, 'Desktop');
    consoleMessages.length = 0;
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);
    const isWebSocketReconnected = await waitForWebSocketReconnection(consoleMessages);
    expect(isWebSocketReconnected).toBe(true);
    await verifyCurrentState(page, USER_STATES.MEETING);
    const timerAfterReconnection = await getStateElapsedTime(page);
    const secondsAfterReconnection = parseTimeString(timerAfterReconnection);
    expect(secondsAfterReconnection).toBeGreaterThan(secondsBeforeDisconnection);
    await verifyLoginMode(page, 'Desktop');
  });

  // TODO: The bug of timer reset for Available state should be fixed before implementing this test case
  test.skip('should reset user state timer and maintain Available state after network disconnection with Desktop mode', async () => {
    await ensureUserStateVisible(page, LOGIN_MODE.DESKTOP);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(15000);
    const timerBeforeDisconnection = await getStateElapsedTime(page);
    const secondsBeforeDisconnection = parseTimeString(timerBeforeDisconnection);
    consoleMessages.length = 0;
    await page.context().setOffline(true);
    const isWebSocketDisconnected = await waitForWebSocketDisconnection(consoleMessages);
    expect(isWebSocketDisconnected).toBe(true);
    await expect(page.getByTestId('station-login-widget')).toBeVisible();
    await verifyLoginMode(page, 'Desktop');
    consoleMessages.length = 0;
    await page.context().setOffline(false);
    const isWebSocketReconnected = await waitForWebSocketReconnection(consoleMessages);
    expect(isWebSocketReconnected).toBe(true);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    const timerAfterReconnection = await getStateElapsedTime(page);
    const secondsAfterReconnection = parseTimeString(timerAfterReconnection);
    expect(secondsAfterReconnection).toBeLessThan(secondsBeforeDisconnection);
    await page.waitForTimeout(10000);
    const agentStateChangeLog = consoleMessages.find(
      (msg) => msg.includes('AGENT Status set successfully') || msg.includes('Agent state changed successfully')
    );
    expect(agentStateChangeLog).toBeTruthy();
    await verifyLoginMode(page, 'Desktop');
  });
});
