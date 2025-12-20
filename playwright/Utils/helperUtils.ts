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
 * Creates a prefixed logger function for consistent test logging
 * @param prefix - The prefix to use for all log messages (e.g., 'TaskList', 'UserState')
 * @returns A function that logs messages with the specified prefix
 * @example
 * ```typescript
 * const log = createLogger('TaskList');
 * log('Starting test'); // Outputs: [TaskList] Starting test
 * ```
 */
export const createLogger = (prefix: string) => (msg: string) => console.log(`[${prefix}] ${msg}`);
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
    await page.bringToFront();
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
 * @param maxIterations - Maximum number of iterations to prevent infinite loops (default: 10)
 * @returns Promise<void>
 * @description Checks in order: RONA popup → incoming tasks → end button → wrapup button
 *              Continues until nothing actionable is found or maxIterations reached
 * @example
 * ```typescript
 * await handleStrayTasks(page, extensionPage);
 * ```
 */
export const handleStrayTasks = async (
  page: Page,
  extensionPage: Page | null = null,
  maxIterations: number = 10
): Promise<void> => {
  const startTime = Date.now();
  const log = (msg: string) => console.log(`[handleStrayTasks] ${msg}`);

  let iteration = 0;
  let tasksHandled = 0;

  while (iteration < maxIterations) {
    iteration++;
    let actionTaken = false;

    // Dismiss any overlays/popovers first
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(100);

    // ============================================
    // STEP 1: Check for RONA popup
    // ============================================
    const ronaPopup = page.getByTestId('samples:rona-popup');
    const ronaVisible = await ronaPopup.isVisible().catch(() => false);

    if (ronaVisible) {
      log(`Iteration ${iteration}: RONA popup visible, submitting`);
      try {
        await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
        actionTaken = true;
        log('RONA popup submitted');
        await page.waitForTimeout(300);
        continue; // Start fresh after RONA
      } catch (e) {
        log(`RONA popup submission failed: ${e}`);
      }
    }

    // ============================================
    // STEP 2: Check for wrapup FIRST (complete pending tasks before accepting new ones)
    // ============================================
    const wrapupButton = page.getByTestId('call-control:wrapup-button').first();
    const wrapupVisible = await wrapupButton.isVisible().catch(() => false);

    if (wrapupVisible) {
      log(`Iteration ${iteration}: Wrapup visible, submitting`);
      try {
        await submitWrapup(page, WRAPUP_REASONS.SALE);
        tasksHandled++;
        actionTaken = true;
        log(`Wrapup submitted (${tasksHandled} total)`);
        await page.waitForTimeout(300);
        continue; // Check for more pending tasks
      } catch (e) {
        log(`Wrapup submission failed: ${e}`);
      }
    }

    // ============================================
    // STEP 3: Check for end button (end active calls before accepting new ones)
    // ============================================
    const endButton = page.getByTestId('call-control:end-call').first();
    const endButtonVisible = await endButton.isVisible().catch(() => false);

    if (endButtonVisible) {
      let endButtonEnabled = await endButton.isEnabled().catch(() => false);

      if (!endButtonEnabled) {
        // End button disabled - try to resume from hold first
        const holdToggle = page.getByTestId('call-control:hold-toggle').first();
        const holdToggleVisible = await holdToggle.isVisible().catch(() => false);

        if (holdToggleVisible) {
          log(`Iteration ${iteration}: End button disabled, attempting resume from hold`);
          try {
            await holdCallToggle(page);
            await page.waitForTimeout(500);
            endButtonEnabled = await endButton.isEnabled().catch(() => false);
          } catch (e) {
            log(`Resume from hold failed: ${e}`);
          }
        } else {
          log(`Iteration ${iteration}: End button disabled, no hold toggle visible`);
        }
      }

      if (endButtonEnabled) {
        log(`Iteration ${iteration}: Clicking end button`);
        try {
          await endButton.click({timeout: AWAIT_TIMEOUT});
          await page.waitForTimeout(500);

          // Verify the click worked - either end button gone or wrapup appeared
          const endStillVisible = await endButton.isVisible().catch(() => false);
          const wrapupNowVisible = await wrapupButton.isVisible().catch(() => false);

          if (!endStillVisible || wrapupNowVisible) {
            actionTaken = true;
            log('End button clicked - state changed');
            // Don't continue - fall through to check wrapup immediately
          } else {
            log('End button clicked but still visible - click may not have worked');
          }
        } catch (e) {
          log(`End call click failed: ${e}`);
        }
      }

      // After clicking end, check for wrapup immediately (same iteration)
      const wrapupAfterEnd = await wrapupButton.isVisible().catch(() => false);
      if (wrapupAfterEnd) {
        log(`Iteration ${iteration}: Wrapup appeared after end, submitting`);
        try {
          await submitWrapup(page, WRAPUP_REASONS.SALE);
          tasksHandled++;
          actionTaken = true;
          log(`Wrapup submitted (${tasksHandled} total)`);
          await page.waitForTimeout(300);
          continue;
        } catch (e) {
          log(`Wrapup submission failed: ${e}`);
        }
      }

      if (actionTaken) {
        continue;
      }
    }

    // ============================================
    // STEP 4: Check for incoming tasks (only accept if no active task to handle)
    // ============================================
    const incomingTaskDiv = page.getByTestId(/^samples:incoming-task(-\w+)?$/);
    const hasIncomingTask = await incomingTaskDiv
      .first()
      .isVisible()
      .catch(() => false);

    if (hasIncomingTask) {
      const task = incomingTaskDiv.first();
      const taskText = await task.innerText().catch(() => '');
      const isExtensionCall = taskText.includes('Ringing...');

      if (isExtensionCall) {
        // Extension call - try extensionPage first, fallback to waiting for RONA
        if (extensionPage) {
          log(`Iteration ${iteration}: Extension call detected`);
          try {
            // Dismiss any dialogs on extension page first
            await extensionPage.keyboard.press('Escape').catch(() => {});
            await extensionPage.waitForTimeout(200);

            const extButton = extensionPage.locator('[data-test="right-action-button"]');
            const extButtonVisible = await extButton
              .waitFor({state: 'visible', timeout: 5000})
              .then(() => true)
              .catch(() => false);

            if (extButtonVisible) {
              await acceptExtensionCall(extensionPage);
              log(`Extension call accepted`);
              await page.waitForTimeout(500);
              // After accepting, immediately try to end and wrapup
              const endBtnAfterAccept = page.getByTestId('call-control:end-call').first();
              const endVisibleAfterAccept = await endBtnAfterAccept.isVisible().catch(() => false);
              if (endVisibleAfterAccept) {
                const endEnabledAfterAccept = await endBtnAfterAccept.isEnabled().catch(() => false);
                if (endEnabledAfterAccept) {
                  log(`Iteration ${iteration}: Ending accepted extension call`);
                  await endBtnAfterAccept.click({timeout: AWAIT_TIMEOUT}).catch(() => {});
                  await page.waitForTimeout(500);
                  const wrapupAfterEnd = await wrapupButton.isVisible().catch(() => false);
                  if (wrapupAfterEnd) {
                    await submitWrapup(page, WRAPUP_REASONS.SALE).catch(() => {});
                    tasksHandled++;
                    log(`Task fully handled (${tasksHandled} total)`);
                    await page.waitForTimeout(300);
                  }
                }
              }
              actionTaken = true;
              continue;
            }
          } catch (e) {
            log(`Extension call accept failed: ${e}`);
          }
        } else {
          // No extensionPage - wait for RONA timeout
          log(`Iteration ${iteration}: Extension call detected, no extensionPage - waiting for timeout`);
          await page.waitForTimeout(2000);
          // Check if RONA appeared
          const ronaAfterWait = await ronaPopup.isVisible().catch(() => false);
          if (ronaAfterWait) {
            continue; // Handle RONA on next iteration
          }
          // If still no RONA, we can't handle this - exit
          const stillHasExtCall = await incomingTaskDiv
            .first()
            .isVisible()
            .catch(() => false);
          if (stillHasExtCall) {
            log(`Iteration ${iteration}: Extension call still present, cannot handle without extensionPage - exiting`);
            break;
          }
        }
      } else {
        // Regular task - check if accept button is enabled
        const acceptButton = task.getByTestId('task:accept-button').first();
        const acceptVisible = await acceptButton.isVisible().catch(() => false);
        const acceptEnabled = await acceptButton.isEnabled().catch(() => false);

        if (acceptVisible && acceptEnabled) {
          log(`Iteration ${iteration}: Incoming task found, accepting`);
          try {
            await acceptButton.click({timeout: AWAIT_TIMEOUT});
            log(`Task accepted`);
            await page.waitForTimeout(2000);
            // After accepting, immediately try to end and wrapup (same iteration)
            const endBtnAfterAccept = page.getByTestId('call-control:end-call').first();
            const endVisibleAfterAccept = await endBtnAfterAccept.isVisible().catch(() => false);
            if (endVisibleAfterAccept) {
              const endEnabledAfterAccept = await endBtnAfterAccept.isEnabled().catch(() => false);
              if (endEnabledAfterAccept) {
                log(`Iteration ${iteration}: Ending accepted task`);
                await endBtnAfterAccept.click({timeout: AWAIT_TIMEOUT}).catch(() => {});
                await page.waitForTimeout(500);
                const wrapupAfterEnd = await wrapupButton.isVisible().catch(() => false);
                if (wrapupAfterEnd) {
                  log(`Iteration ${iteration}: Wrapup appeared, submitting`);
                  await submitWrapup(page, WRAPUP_REASONS.SALE).catch(() => {});
                  tasksHandled++;
                  log(`Task fully handled (${tasksHandled} total)`);
                  await page.waitForTimeout(300);
                }
              }
            }
            actionTaken = true;
            continue;
          } catch (e) {
            log(`Accept click failed: ${e}`);
          }
        } else if (acceptVisible && !acceptEnabled) {
          log(`Iteration ${iteration}: Accept button visible but disabled - skipping`);
        }
      }
    }

    // ============================================
    // Check if anything is still pending that we couldn't handle
    // ============================================
    if (!actionTaken) {
      const stillHasTask = await incomingTaskDiv
        .first()
        .isVisible()
        .catch(() => false);
      const stillHasEnd = await endButton.isVisible().catch(() => false);
      const stillHasWrapup = await wrapupButton.isVisible().catch(() => false);

      // Check if end button is visible but disabled (stuck state)
      if (stillHasEnd && !stillHasWrapup) {
        const endEnabled = await endButton.isEnabled().catch(() => false);
        const holdToggle = page.getByTestId('call-control:hold-toggle').first();
        const holdVisible = await holdToggle.isVisible().catch(() => false);

        if (!endEnabled && !holdVisible) {
          log(`Iteration ${iteration}: End button disabled with no way to enable - cannot handle, exiting`);
          break;
        }
      }

      if (stillHasWrapup) {
        log(`Iteration ${iteration}: Wrapup visible but couldn't submit - will retry`);
        await page.waitForTimeout(500);
      } else if (stillHasEnd) {
        const endEnabled = await endButton.isEnabled().catch(() => false);
        if (endEnabled) {
          if (iteration >= 3) {
            log(`Iteration ${iteration}: End button clicks not working after ${iteration} attempts - exiting`);
            break;
          }
          log(`Iteration ${iteration}: End button click didn't work - will retry`);
          await page.waitForTimeout(500);
        }
      } else if (stillHasTask) {
        log(`Iteration ${iteration}: Task visible but cannot act - will retry`);
        await page.waitForTimeout(500);
      } else {
        log(`Iteration ${iteration}: Nothing found, cleanup complete`);
        break;
      }
    }
  }

  if (iteration >= maxIterations) {
    log(`Max iterations (${maxIterations}) reached`);
  }

  // Ensure user is in Available state at the end
  const stateSelectVisible = await page
    .getByTestId('state-select')
    .isVisible()
    .catch(() => false);

  if (stateSelectVisible) {
    try {
      await changeUserState(page, USER_STATES.AVAILABLE);
    } catch (e) {
      log(`Failed to set Available state: ${e}`);
    }
  }

  const duration = Date.now() - startTime;
  log(`Completed in ${duration}ms - ${tasksHandled} task(s) handled in ${iteration} iteration(s)`);
};

/**
 * Clears any pending call UI on the page by ending the call and/or submitting wrapup if visible.
 * Follows same logic as handleStrayTasks: end button (resume if disabled) → wrapup
 * @returns true if something was cleared, false otherwise
 */
export async function clearPendingCallAndWrapup(page: Page): Promise<boolean> {
  const log = (msg: string) => console.log(`[clearPendingCallAndWrapup] ${msg}`);

  // Dismiss any open popovers first
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(200);

  const endBtn = page.getByTestId('call-control:end-call').first();
  const wrapupBtn = page.getByTestId('call-control:wrapup-button').first();

  // Check end button first
  const endVisible = await endBtn.isVisible().catch(() => false);

  if (endVisible) {
    let endEnabled = await endBtn.isEnabled().catch(() => false);

    // If disabled, try to resume from hold
    if (!endEnabled) {
      log('End button disabled, attempting resume from hold');
      try {
        await holdCallToggle(page);
        await page.waitForTimeout(500);
        endEnabled = await endBtn.isEnabled().catch(() => false);
      } catch (e) {
        log(`Resume failed: ${e}`);
      }
    }

    // Try to end the call
    if (endEnabled) {
      try {
        log('Clicking end button');
        await endBtn.click({timeout: AWAIT_TIMEOUT});
        await page.waitForTimeout(500);
      } catch (e) {
        log(`End click failed: ${e}`);
      }
    }
  }

  // Check wrapup button
  const wrapupVisible = await wrapupBtn.isVisible().catch(() => false);

  if (wrapupVisible) {
    try {
      log('Submitting wrapup');
      await submitWrapup(page, WRAPUP_REASONS.SALE);
      await page.waitForTimeout(500);
      return true;
    } catch (e) {
      log(`Wrapup failed: ${e}`);
      return false;
    }
  }

  // Return true if end button was clicked (even without wrapup)
  return endVisible;
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
