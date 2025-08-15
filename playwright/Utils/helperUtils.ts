import {Page} from '@playwright/test';
import {getCurrentState, changeUserState} from './userStateUtils';
import {
  WRAPUP_REASONS,
  USER_STATES,
  RONA_OPTIONS,
  LOGIN_MODE,
  LoginMode,
  ThemeColor,
  userState,
  WrapupReason,
  AWAIT_TIMEOUT,
} from '../constants';
import {submitWrapup} from './wrapupUtils';
import {acceptExtensionCall, submitRonaPopup} from './incomingTaskUtils';
import {
  loginViaAccessToken,
  disableMultiLogin,
  enableMultiLogin,
  initialiseWidgets,
  enableAllWidgets,
} from './initUtils';
import {stationLogout, telephonyLogin} from './stationLoginUtils';
/**
 * Parses a time string in MM:SS format and converts it to total seconds
 * @param timeString - Time string in format "MM:SS" (e.g., "01:30" for 1 minute 30 seconds)
 * @returns Total number of seconds
 * @example
 * ```typescript
 * parseTimeString("01:30"); // Returns 90 (1 minute 30 seconds)
 * parseTimeString("00:45"); // Returns 45 (45 seconds)
 * parseTimeString("10:00"); // Returns 600 (10 minutes)
 * ```
 */
export function parseTimeString(timeString: string): number {
  const parts = timeString.split(':');
  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseInt(parts[1], 10) || 0;
  return minutes * 60 + seconds;
}

/**
 * Waits for WebSocket disconnection by monitoring console messages for specific disconnection indicators
 * @param consoleMessages - Array of console messages to monitor
 * @param timeoutMs - Maximum time to wait for disconnection in milliseconds (default: 15000)
 * @returns Promise<boolean> - True if disconnection is detected, false if timeout is reached
 * @description Monitors for network disconnection messages or WebSocket offline status changes
 * @example
 * ```typescript
 * consoleMessages.length = 0; // Clear existing messages
 * await page.context().setOffline(true);
 * const isDisconnected = await waitForWebSocketDisconnection(consoleMessages);
 * expect(isDisconnected).toBe(true);
 * ```
 */
export async function waitForWebSocketDisconnection(
  consoleMessages: string[],
  timeoutMs: number = 15000
): Promise<boolean> {
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

/**
 * Waits for WebSocket reconnection by monitoring console messages for online status changes
 * @param consoleMessages - Array of console messages to monitor
 * @param timeoutMs - Maximum time to wait for reconnection in milliseconds (default: 15000)
 * @returns Promise<boolean> - True if reconnection is detected, false if timeout is reached
 * @description Monitors for WebSocket online status change messages indicating successful reconnection
 * @example
 * ```typescript
 * consoleMessages.length = 0; // Clear existing messages
 * await page.context().setOffline(false);
 * const isReconnected = await waitForWebSocketReconnection(consoleMessages);
 * expect(isReconnected).toBe(true);
 * ```
 */
export async function waitForWebSocketReconnection(
  consoleMessages: string[],
  timeoutMs: number = 15000
): Promise<boolean> {
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

/**
 * Waits for a specific user state to be reached in the UI
 * @param page - Playwright Page object
 * @param expectedState - The expected user state to wait for
 * @returns Promise<void>
 * @throws Error if the expected state is not reached within the timeout
 * @description Continuously checks the current user state until it matches the expected state or times out
 * @example
 * ```typescript
 * await waitForState(page, USER_STATES.AVAILABLE);
 * // Waits until the user state changes to 'Available'
 * ```
 */

export const waitForState = async (page: Page, expectedState: userState): Promise<void> => {
  try {
    await page.waitForFunction(
      async (expectedStateArg) => {
        // Re-import getCurrentState in the browser context
        const stateSelect = document.querySelector('[data-test="state-select"]') as HTMLSelectElement;
        if (!stateSelect) return false;

        const currentState = stateSelect.value?.trim();
        return currentState === expectedStateArg;
      },
      expectedState,
      {timeout: 10000, polling: 'raf'} // Use requestAnimationFrame for optimal performance
    );
  } catch (error) {
    // Get current state for better error message
    const currentState = await getCurrentState(page);
    throw new Error(`Timed out waiting for state "${expectedState}", last state was "${currentState}"`);
  }
};

/**
 * Retrieves the last state from captured logs
 * @param capturedLogs - Array of log messages
 * @returns Promise<string> - The last state name found in the logs, or a message if not found
 * @description Filters logs for state change messages and extracts the last state name
 * @example
 * ```typescript
 * const lastState = await getLastStateFromLogs(capturedLogs);
 * console.log(lastState); // Outputs the last state name or a message if not found
 * ```
 */

export async function getLastStateFromLogs(capturedLogs: string[]) {
  const stateChangeLogs = capturedLogs.filter((log) => log.includes('onStateChange invoked with state name:'));

  if (stateChangeLogs.length === 0) {
    return 'No state change logs found';
  }

  const lastStateLog = stateChangeLogs[stateChangeLogs.length - 1];
  const match = lastStateLog.match(/onStateChange invoked with state name:\s*(.+)$/);

  if (!match) {
    return 'No State change log found';
  }

  return match[1].trim();
}

/**
 * Waits for a specific state to appear in the captured logs
 * @param capturedLogs - Array of log messages
 * @param expectedState - The expected state to wait for
 * @param timeoutMs - Maximum time to wait for the state in milliseconds (default: 10000)
 * uses the manual logs for that, such as "onStateChange invoked with state name: AVAILABLE"
 * @returns Promise<void>
 * @throws Error if the expected state is not found within the timeout
 * @description Continuously checks the last state in logs until it matches the expected state or times out
 * @example
 * ```typescript
 * await waitForStateLogs(capturedLogs,  AVAILABLE);
 * // Waits until the last state in logs changes to 'Available'
 * ```
 */

export const waitForStateLogs = async (
  capturedLogs: string[],
  expectedState: userState,
  timeoutMs: number = 10000
): Promise<void> => {
  const start = Date.now();
  while (true) {
    // Check if the latest state in logs matches expectedState
    try {
      const lastState = await getLastStateFromLogs(capturedLogs);
      if (lastState === expectedState) return;
    } catch {
      // Ignore error if no state log yet
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for state "${expectedState}" in logs`);
    }
    await new Promise((res) => setTimeout(res, 300)); // Poll every 300ms
  }
};

/**
 * Waits for a specific wrapup reason to appear in the captured logs
 * @param capturedLogs - Array of log messages
 * @param expectedReason - The expected wrapup reason to wait for
 * @param timeoutMs - Maximum time to wait for the wrapup reason in milliseconds (default: 10000)
 * Uses the manual logs for that, such as "onWrapup invoked with reason : Sale"
 * @returns Promise<void>
 * @throws Error if the expected wrapup reason is not found within the timeout
 * @description Continuously checks the last wrapup reason in logs until it matches the expected reason or times out
 * @example
 * ```typescript
 * await waitForWrapupReasonLogs(capturedLogs, WRAPUP_REASONS.SALE);
 * ```
 */

export const waitForWrapupReasonLogs = async (
  capturedLogs: string[],
  expectedReason: WrapupReason,
  timeoutMs: number = 10000
): Promise<void> => {
  const start = Date.now();
  while (true) {
    try {
      const lastReason = await getLastWrapupReasonFromLogs(capturedLogs);
      if (lastReason === expectedReason) return;
    } catch {
      // Ignore error if no wrapup log yet
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for wrapup reason "${expectedReason}" in logs`);
    }
    await new Promise((res) => setTimeout(res, 300)); // Poll every 300ms
  }
};

/**
 * Retrieves the last wrapup reason from captured logs
 * @param capturedLogs - Array of log messages
 * @returns Promise<string> - The last wrapup reason found in the logs, or a message if not found
 * @description Filters logs for wrapup messages and extracts the last wrapup reason
 * Uses the manual logs for that, such as "onWrapup invoked with reason : Sale"
 * @example
 * ```typescript
 * const lastWrapupReason = await getLastWrapupReasonFromLogs(capturedLogs);
 * console.log(lastWrapupReason); // Outputs the last wrapup reason or a message if not found
 * ```
 */

export async function getLastWrapupReasonFromLogs(capturedLogs: string[]): Promise<string> {
  const wrapupLogs = capturedLogs.filter((log) => log.includes('onWrapup invoked with reason :'));

  if (wrapupLogs.length === 0) {
    return 'No wrapup reason found';
  }

  const lastWrapupLog = wrapupLogs[wrapupLogs.length - 1];
  const match = lastWrapupLog.match(/onWrapup invoked with reason : (.+)$/);

  if (!match) {
    return 'No wrapup reason found';
  }

  return match[1].trim();
}

/**
 * Compares two RGB color strings to check if they are within a specified tolerance
 * @param receivedColor - The color received from the UI (e.g., "rgb(255, 0, 0)")
 * @param expectedColor - The expected color to compare against (e.g., "rgb(250, 5, 0)")
 * @param tolerance - The maximum allowed difference for each RGB component (default: 10)
 * @returns boolean - True if colors are close enough, false otherwise
 * @description Compares each RGB component of the two colors and checks if the absolute difference is within the specified tolerance
 * @example
 * ```typescript
 * const isClose = isColorClose("rgb(255, 0, 0)", "rgb(250, 5, 0)");
 * expect(isClose).toBe(true); // Returns true if the colors are close enough
 * ```
 */

export function isColorClose(receivedColor: string, expectedColor: ThemeColor, tolerance: number = 10): boolean {
  const receivedRgb = receivedColor.match(/\d+/g)?.map(Number) || [];
  const expectedRgb = expectedColor.match(/\d+/g)?.map(Number) || [];

  for (let i = 0; i < 3; i++) {
    if (typeof receivedRgb[i] !== 'number' || typeof expectedRgb[i] !== 'number') {
      continue; // skip if not present
    }
    if (Math.abs(receivedRgb[i] - expectedRgb[i]) > tolerance) {
      return false;
    }
  }
  return true;
}

/**
 * Handles stray incoming tasks by accepting them and performing wrap-up actions, to be used for clean up before tests
 * @param page - Playwright Page object
 * @param extensionPage - Optional extension page for handling calls (default: null)
 * @returns Promise<void>
 * @description Continuously checks for incoming tasks, accepts them, and performs wrap-up actions until no more tasks are available
 * @example
 * ```typescript
 * await handleStrayTasks(page, extensionPage);
 * ```
 */

export const handleStrayTasks = async (page: Page, extensionPage: Page | null = null): Promise<void> => {
  await page.waitForTimeout(1000);
  await changeUserState(page, USER_STATES.AVAILABLE);
  const incomingTaskDiv = page.getByTestId(/^samples:incoming-task(-\w+)?$/);

  while (true) {
    let flag1 = false;
    let flag2 = true;
    while (true) {
      const task = incomingTaskDiv.first();
      let isTaskVisible = await task.isVisible().catch(() => false);
      if (!isTaskVisible) break;
      const acceptButton = task.getByTestId('task:accept-button').first();
      const acceptButtonVisible = await acceptButton.isVisible().catch(() => false);
      const isExtensionCall = await (await task.innerText()).includes('Ringing...');
      if (isExtensionCall) {
        if (!extensionPage) {
          throw new Error('Extension page is not available for handling extension call');
        }
        const extensionCallVisible = await extensionPage
          .locator('[data-test="right-action-button"]')
          .waitFor({state: 'visible', timeout: 40000})
          .then(() => true)
          .catch(() => false);
        if (extensionCallVisible) {
          await acceptExtensionCall(extensionPage);
          flag1 = true;
        } else {
          throw new Error('Accept button not visible and extension page is not available');
        }
      } else {
        try {
          await acceptButton.click({timeout: AWAIT_TIMEOUT});
        } catch (error) {}
        flag1 = true;
      }
      await page.waitForTimeout(1000);
    }
    const endButton = page.getByTestId('call-control:end-call').first();
    const endButtonVisible = await endButton
      .waitFor({state: 'visible', timeout: 2000})
      .then(() => true)
      .catch(() => false);
    if (endButtonVisible) {
      await page.waitForTimeout(2000);
      await endButton.click({timeout: AWAIT_TIMEOUT});
      await submitWrapup(page, WRAPUP_REASONS.SALE);
    } else {
      const wrapupBox = page.getByTestId('call-control:wrapup-button').first();
      const isWrapupBoxVisible = await wrapupBox
        .waitFor({state: 'visible', timeout: 2000})
        .then(() => true)
        .catch(() => false);
      if (isWrapupBoxVisible) {
        await page.waitForTimeout(2000);
        await submitWrapup(page, WRAPUP_REASONS.SALE);
        await page.waitForTimeout(2000);
      } else {
        flag2 = false;
      }
    }

    if (!flag1 && !flag2) {
      break;
    }
  }
};

/*
/ * Sets up the page for testing by logging in, enabling widgets, and handling user states, cleaning up stray tasks, submitting RONA popups
 * @param page - Playwright Page object
 * @param loginMode - The login mode to use (e.g., LOGIN_MODE.DESKTOP or LOGIN_MODE.EXTENSION)
 * @param agentName - Name of the agent to be logged in, example: 'AGENT1'
 * @param extensionPage - Optional extension page for handling calls in extension mode (default: null)
 * The extension Page should have the webex calling web-client logged in
 * @returns Promise<void>
 * @description Logs in via access token, enables all widgets, handles multi-login settings, initializes widgets, and manages user states
 * @example
 * ```typescript
 * await pageSetup(page, LOGIN_MODE.DESKTOP);
 * ```
 */

export const pageSetup = async (
  page: Page,
  loginMode: LoginMode,
  accessToken: string,
  extensionPage: Page | null = null,
  extensionNumber?: string
) => {
  const maxRetries = 3;
  await loginViaAccessToken(page, accessToken);
  await enableAllWidgets(page);
  if (loginMode === LOGIN_MODE.DESKTOP) {
    await disableMultiLogin(page);
  } else {
    await enableMultiLogin(page);
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      await initialiseWidgets(page);
      break;
    } catch (error) {
      if (i == maxRetries - 1) {
        throw new Error(`Failed to initialise widgets after ${maxRetries} attempts: ${error}`);
      }
      await page.reload();
      await page.waitForTimeout(2000); // Wait for page to settle
    }
  }

  let loginButtonExists = await page
    .getByTestId('login-button')
    .isVisible()
    .catch(() => false);
  if (loginButtonExists) {
    await telephonyLogin(page, loginMode, extensionNumber);
  } else {
    const stateSelectVisible = await page
      .getByTestId('state-select')
      .waitFor({state: 'visible', timeout: 30000})
      .then(() => true)
      .catch(() => false);
    if (stateSelectVisible) {
      const ronapopupVisible = await page
        .getByTestId('samples:rona-popup')
        .waitFor({state: 'visible', timeout: AWAIT_TIMEOUT})
        .then(() => true)
        .catch(() => false);
      if (ronapopupVisible) {
        await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
      }
      const userState = await getCurrentState(page);
      await changeUserState(page, USER_STATES.AVAILABLE);
      await page.waitForTimeout(5000);

      const incomingTaskDiv = page.getByTestId(/^samples:incoming-task(-\w+)?$/).first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT}).catch(() => false);
      await handleStrayTasks(page, extensionPage);
    }
    loginButtonExists = await page
      .getByTestId('login-button')
      .isVisible()
      .catch(() => false);

    if (!loginButtonExists) await stationLogout(page);
    await telephonyLogin(page, loginMode, extensionNumber);
  }

  let ronapopupVisible = await page
    .getByTestId('samples:rona-popup')
    .waitFor({state: 'visible', timeout: AWAIT_TIMEOUT})
    .then(() => true)
    .catch(() => false);
  if (ronapopupVisible) {
    await Promise.race([
      submitRonaPopup(page, RONA_OPTIONS.AVAILABLE),
      new Promise((_, reject) => setTimeout(() => reject(new Error('submitRonaPopup timeout')), AWAIT_TIMEOUT)),
    ]);
  }

  let stationLoginFailure = await page
    .getByTestId('station-login-failure-label')
    .waitFor({state: 'visible', timeout: AWAIT_TIMEOUT})
    .then(() => true)
    .catch(() => false);
  for (let i = 0; i < maxRetries && stationLoginFailure; i++) {
    loginButtonExists = await page
      .getByTestId('login-button')
      .waitFor({state: 'visible', timeout: 5000})
      .then(() => true)
      .catch(() => false);
    if (!loginButtonExists) {
      await Promise.race([
        stationLogout(page),
        new Promise((_, reject) => setTimeout(() => reject(new Error('stationLogout timeout')), AWAIT_TIMEOUT)),
      ]);
    }
    await Promise.race([
      telephonyLogin(page, loginMode, extensionNumber),
      new Promise((_, reject) => setTimeout(() => reject(new Error('telephonyLogin timeout')), AWAIT_TIMEOUT)),
    ]);
    await page.getByTestId('state-select').waitFor({state: 'visible', timeout: 30000});
    stationLoginFailure = await page
      .getByTestId('station-login-failure-label')
      .waitFor({state: 'visible', timeout: AWAIT_TIMEOUT})
      .then(() => true)
      .catch(() => false);
    if (i == maxRetries - 1 && stationLoginFailure) {
      throw new Error(`Station Login Error Persists after ${maxRetries} attempts`);
    }
  }

  await page.getByTestId('state-select').waitFor({state: 'visible', timeout: 30000});
};
