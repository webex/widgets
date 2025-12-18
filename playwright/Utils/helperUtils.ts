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
import {holdCallToggle} from './taskControlUtils';
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
 * @param maxIterations - Maximum number of task handling iterations to prevent infinite loops (default: 10)
 * @returns Promise<void>
 * @description Continuously checks for incoming tasks, accepts them, and performs wrap-up actions until no more tasks are available
 * @example
 * ```typescript
 * await handleStrayTasks(page, extensionPage);
 * ```
 */

export const handleStrayTasks = async (
  page: Page,
  extensionPage: Page | null = null,
  maxIterations: number = 20
): Promise<void> => {
  const startTime = Date.now();
  const timestamp = () => `[${new Date().toISOString()}]`;

  // Quick check for state-select visibility
  const stateSelectVisible = await page
    .getByTestId('state-select')
    .isVisible()
    .catch(() => false);

  if (stateSelectVisible) {
    const ronapopupVisible = await page
      .getByTestId('samples:rona-popup')
      .isVisible()
      .catch(() => false);

    if (ronapopupVisible) {
      console.log(`handleStrayTasks: Submitting RONA popup`);
      await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
    }

    await changeUserState(page, USER_STATES.AVAILABLE);
  }

  const incomingTaskDiv = page.getByTestId(/^samples:incoming-task(-\w+)?$/);

  let tasksAccepted = 0;
  let tasksCleared = 0;

  // ============================================
  // PHASE 1: Accept all incoming tasks first
  // ============================================
  console.log(`handleStrayTasks: Phase 1 - Accepting incoming tasks`);
  let acceptIterations = 0;
  while (acceptIterations < maxIterations) {
    acceptIterations++;

    const task = incomingTaskDiv.first();
    const isTaskVisible = await task.isVisible().catch(() => false);
    if (!isTaskVisible) {
      console.log(`handleStrayTasks: No more incoming tasks to accept`);
      break;
    }

    const acceptButton = task.getByTestId('task:accept-button').first();
    const taskText = await task.innerText().catch(() => '');
    const isExtensionCall = taskText.includes('Ringing...');

    if (isExtensionCall) {
      if (!extensionPage) {
        throw new Error('Extension page is not available for handling extension call');
      }
      console.log(`handleStrayTasks: Handling extension call`);
      const extensionCallVisible = await extensionPage
        .locator('[data-test="right-action-button"]')
        .waitFor({state: 'visible', timeout: 40000})
        .then(() => true)
        .catch(() => false);
      if (extensionCallVisible) {
        await acceptExtensionCall(extensionPage);
        tasksAccepted++;
        console.log(`handleStrayTasks: Accepted extension call (${tasksAccepted} total)`);
      } else {
        console.warn(`handleStrayTasks: Extension call timeout - skipping task`);
      }
    } else {
      const acceptVisible = await acceptButton.isVisible().catch(() => false);
      if (acceptVisible) {
        try {
          await acceptButton.click({timeout: AWAIT_TIMEOUT});
          tasksAccepted++;
          console.log(`handleStrayTasks: Accepted incoming task (${tasksAccepted} total)`);
        } catch (error) {
          console.warn(`handleStrayTasks: Failed to click accept button:`, error);
        }
      } else {
        // Task visible but no accept button - might already be accepted, break
        break;
      }
    }

    // Small wait for UI to update
    await page.waitForTimeout(200);
  }

  // ============================================
  // PHASE 2: Clear all pending calls/wrapups
  // ============================================
  console.log(`andleStrayTasks: Phase 2 - Clearing pending calls/wrapups`);
  let clearIterations = 0;
  while (clearIterations < maxIterations) {
    clearIterations++;

    const endButton = page.getByTestId('call-control:end-call').first();
    const wrapupBox = page.getByTestId('call-control:wrapup-button').first();
    const endButtonVisible = await endButton.isVisible().catch(() => false);
    const wrapupBoxVisible = await wrapupBox.isVisible().catch(() => false);

    if (!endButtonVisible && !wrapupBoxVisible) {
      console.log(`handleStrayTasks: No more pending calls/wrapups`);
      break;
    }

    console.log(
      `handleStrayTasks: Clearing task (iteration ${clearIterations}) - ` +
        `endButton: ${endButtonVisible}, wrapupButton: ${wrapupBoxVisible}`
    );

    await clearPendingCallAndWrapup(page);
    tasksCleared++;
    console.log(`handleStrayTasks: Cleared task (${tasksCleared} total)`);
    // Small wait for UI to update
    await page.waitForTimeout(200);
  }

  const duration = Date.now() - startTime;
  const totalHandled = tasksAccepted + tasksCleared;
  console.log(
    `handleStrayTasks: Completed in ${duration}ms - ` +
      `${tasksAccepted} task(s) accepted, ${tasksCleared} task(s) cleared, ${totalHandled} total`
  );
};

/**
 * Clears any pending call UI on the page by ending the call and/or submitting wrapup if visible.
 * Does nothing if neither end-call nor wrapup controls are present.
 */
export async function clearPendingCallAndWrapup(page: Page): Promise<void> {
  // If wrapup is available, submit it
  const wrapupBtn = page.getByTestId('call-control:wrapup-button').first();
  const wrapupVisible = await wrapupBtn.isVisible().catch(() => false);
  if (wrapupVisible) {
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await page.waitForTimeout(500);
    return;
  }

  const endBtn = page.getByTestId('call-control:end-call').first();
  const endVisible = await endBtn.isVisible().catch(() => false);
  if (endVisible) {
    const endEnabled = await endBtn.isEnabled().catch(() => false);
    if (endEnabled) {
      try {
        await endBtn.click({timeout: AWAIT_TIMEOUT});
        await submitWrapup(page, WRAPUP_REASONS.SALE);
        await page.waitForTimeout(500);
      } catch {}
    } else {
      // If end button is disabled, try resuming from hold then end; otherwise, see if wrapup is available
      try {
        await holdCallToggle(page);
      } catch {}
      const endEnabledAfterResume = await endBtn.isEnabled().catch(() => false);
      if (endEnabledAfterResume) {
        try {
          await endBtn.click({timeout: AWAIT_TIMEOUT});
          await submitWrapup(page, WRAPUP_REASONS.SALE);
          await page.waitForTimeout(500);
          return;
        } catch {}
      }

      // If resume path failed, see if wrapup became available instead; otherwise, skip silently
      const wrapupNowVisible = await wrapupBtn.isVisible().catch(() => false);
      if (wrapupNowVisible) {
        try {
          await submitWrapup(page, WRAPUP_REASONS.SALE);
          await page.waitForTimeout(500);
        } catch {}
      }
    }
  }
}

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
  extensionNumber?: string,
  isMultiSession: boolean = false
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

  if (isMultiSession) {
    return; // Skip further setup for multi-session tests
  }

  let loginButtonExists = await page
    .getByTestId('login-button')
    .isVisible()
    .catch(() => false);

  if (loginButtonExists) {
    await telephonyLogin(page, loginMode, extensionNumber);
  } else {
    await stationLogout(page);
    await telephonyLogin(page, loginMode, extensionNumber);
  }

  await page.getByTestId('state-select').waitFor({state: 'visible', timeout: 30000});
};

/**
 * Dismisses any visible popover/tooltips/backdrops that might intercept pointer events.
 * Attempts ESC presses and quick background clicks.
 */
export async function dismissOverlays(page: Page): Promise<void> {
  const isVisibleWithin = async (locator: any, timeoutMs: number = 500): Promise<boolean> => {
    try {
      await locator.waitFor({state: 'visible', timeout: timeoutMs});
      return true;
    } catch {
      return false;
    }
  };

  for (let i = 0; i < 3; i++) {
    // If a Momentum popover backdrop is visible, try ESC to close (with bounded timeout)
    const backdropVisible = await isVisibleWithin(page.locator('.md-popover-backdrop'), 500);
    const tippyVisible = await isVisibleWithin(page.locator('[id^="tippy-"]').first(), 500);
    if (!backdropVisible && !tippyVisible) return;
    try {
      await page.keyboard.press('Escape');
    } catch {}
    // Small click near top-left to blur active elements
    try {
      await page.mouse.click(5, 5);
    } catch {}
    await page.waitForTimeout(200);
  }
}
