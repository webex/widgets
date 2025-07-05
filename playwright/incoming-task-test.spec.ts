import { test, Page, expect, BrowserContext } from '@playwright/test';
import { loginViaAccessToken, disableMultiLogin, oauthLogin, enableAllWidgets, initialiseWidgets, enableMultiLogin } from './Utils/initUtils';
import { telephonyLogin, desktopLogin, extensionLogin, stationLogout } from './Utils/stationLoginUtils';
import { changeUserState, getCurrentState, verifyCurrentState } from './Utils/userStateUtils';
import { createCallTask, createChatTask, declineExtensionCall, declineIncomingTask, endCallTask, endChatTask, loginExtension, acceptIncomingTask, acceptExtensionCall, createEmailTask, endExtensionCall, submitRonaPopup } from './Utils/incomingTaskUtils';
import { TASK_TYPES, USER_STATES, LOGIN_MODE, THEME_COLORS, WRAPUP_REASONS, RONA_OPTIONS } from './constants';
import { submitWrapup } from './Utils/wrapupUtils';


let page: Page | null = null;
let context: BrowserContext | null = null;
let callerpage: Page | null = null;
let extensionPage: Page | null = null;
let context2: BrowserContext | null = null;
let chatPage: Page | null = null;
let page2: Page | null = null;
let capturedLogs: string[] = [];
const maxRetries = 3;


//NOTE : Make Sure to set RONA Timeout to 18 seconds before running this test.

function getLastStateFromLogs(capturedLogs: string[]): string {
  const stateChangeLogs = capturedLogs.filter(log =>
    log.includes('onStateChange invoked with state name:')
  );

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

// Helper function to get the last wrapup reason from onWrapup logs
function getLastWrapupReasonFromLogs(capturedLogs: string[]): string {
  const wrapupLogs = capturedLogs.filter(log =>
    log.includes('onWrapup invoked with reason :')
  );

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

export const waitForWrapupReasonLogs = async (
  capturedLogs: string[],
  expectedReason: string,
  timeoutMs: number = 10000
): Promise<void> => {
  const start = Date.now();
  while (true) {
    try {
      const lastReason = getLastWrapupReasonFromLogs(capturedLogs);
      if (lastReason === expectedReason) return;
    } catch {
      // Ignore error if no wrapup log yet
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for wrapup reason "${expectedReason}" in logs`);
    }
    await new Promise(res => setTimeout(res, 300)); // Poll every 300ms
  }
};

function verifyCallbackLogs(
  capturedLogs: string[],
  expectedWrapupReason: string,
  expectedState: string,
  shouldWrapupComeFirst: boolean = true
): boolean {
  const wrapupLogs = capturedLogs.filter(log =>
    log.includes('onWrapup invoked with reason :')
  );
  const stateChangeLogs = capturedLogs.filter(log =>
    log.includes('onStateChange invoked with state name:')
  );

  if (wrapupLogs.length === 0 || stateChangeLogs.length === 0) {
    throw new Error('Missing required logs, check callbacks for wrapup or statechange');
  }

  const lastWrapupLog = wrapupLogs[wrapupLogs.length - 1];
  const lastStateChangeLog = stateChangeLogs[stateChangeLogs.length - 1];

  const wrapupLogIndex = capturedLogs.lastIndexOf(lastWrapupLog);
  const stateChangeLogIndex = capturedLogs.lastIndexOf(lastStateChangeLog);

  if (shouldWrapupComeFirst && wrapupLogIndex >= stateChangeLogIndex) {
    throw new Error('Wrapup log should come before state change log');
  }

  const wrapupMatch = lastWrapupLog.match(/onWrapup invoked with reason : (.+)$/);
  const stateMatch = lastStateChangeLog.match(/onStateChange invoked with state name:\s*(.+)$/);

  if (!wrapupMatch || !stateMatch) {
    throw new Error('Could not extract values from logs');
  }

  const actualWrapupReason = wrapupMatch[1].trim();
  const actualStateName = stateMatch[1].trim();

  // Verify expected values
  if (actualWrapupReason !== expectedWrapupReason) {
    throw new Error('Wrapup reason mismatch, expected ' + expectedWrapupReason + ', got ' + actualWrapupReason);
  }

  if (actualStateName !== expectedState) {
    throw new Error('State name mismatch, expected ' + expectedState + ', got ' + actualStateName);
  }

  return true;
}

function setupConsoleLogging(page: Page): () => void {
  capturedLogs.length = 0;

  const consoleHandler = (msg) => {
    const logText = msg.text();
    if (logText.includes('onStateChange invoked with state name:') ||
      logText.includes('onWrapup invoked with reason :')) {
      capturedLogs.push(logText);
    }
  };

  page.on('console', consoleHandler);

  return () => page.off('console', consoleHandler);
}


export const waitForState = async (
  page: Page,
  expectedState: string,
): Promise<void> => {
  const start = Date.now();
  const timeoutMs: number = 10000
  while (true) {
    const currentState = await getCurrentState(page);
    if (currentState === expectedState) return;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for state "${expectedState}", last state was "${currentState}"`);
    }
    await page.waitForTimeout(500); // Poll every 500ms
  }
};

export const waitForStateLogs = async (
  capturedLogs: string[],
  expectedState: string,
  timeoutMs: number = 10000
): Promise<void> => {
  const start = Date.now();
  while (true) {
    // Check if the latest state in logs matches expectedState
    try {
      const lastState = getLastStateFromLogs(capturedLogs);
      if (lastState === expectedState) return;
    } catch {
      // Ignore error if no state log yet
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for state "${expectedState}" in logs`);
    }
    await new Promise(res => setTimeout(res, 300)); // Poll every 300ms
  }
};

function isColorClose(
  receivedColor: string,
  expectedColor: string,
  tolerance: number = 20
): boolean {
  const receivedRgb = receivedColor.match(/\d+/g)?.map(Number) || [];
  const expectedRgb = expectedColor.match(/\d+/g)?.map(Number) || [];

  for (let i = 0; i < 3; i++) {
    if (
      typeof receivedRgb[i] !== 'number' ||
      typeof expectedRgb[i] !== 'number'
    ) {
      continue; // skip if not present
    }
    if (Math.abs(receivedRgb[i] - expectedRgb[i]) > tolerance) {
      return false;
    }
  }
  return true;
}


const handleStrayTasks = async (page: Page): Promise<void> => {
  await page.waitForTimeout(1000);
  const incomingTaskDiv = page.getByTestId(/^samples:incoming-task(-\w+)?$/);

  while (true) {
    let flag1 = false;
    let flag2 = true;
    while (true) {
      const task = incomingTaskDiv.first();
      let isTaskVisible = await task.isVisible().catch(() => false);
      if (!isTaskVisible) break;
      const acceptButton = task.getByTestId('task-accept-button').first();
      const acceptButtonVisible = await acceptButton.isVisible().catch(() => false);
      if (!acceptButtonVisible) {
        const extensionCallVisible = await extensionPage.locator('[data-test="right-action-button"]').isVisible().catch(() => false);
        if (extensionCallVisible) {
          await acceptExtensionCall(extensionPage);
          flag1 = true
        } else {
          throw new Error('Accept button not visible and extension page is not available');
        }
      } else {
        await acceptButton.click();
        flag1 = true;
      }
      await page.waitForTimeout(1000);
    }
    const endButton = page.getByTestId(/^end-\w+-button$/).first();
    const endButtonVisible = await endButton.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false);
    if (endButtonVisible) {
      await page.waitForTimeout(2000);
      await endButton.click();
      await submitWrapup(page, WRAPUP_REASONS.SALE);
    } else {
      const wrapupBox = page.getByTestId('wrapup-button').first();
      const isWrapupBoxVisible = await wrapupBox.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false);
      if (isWrapupBoxVisible) {
        await page.waitForTimeout(2000);
        await submitWrapup(page, WRAPUP_REASONS.SALE);
        await page.waitForTimeout(2000)
      } else {
        flag2 = false;
      }
    }

    if (!flag1 && !flag2) {
      break;
    }
  }

}

const pageSetup = async (page: Page, loginMode: string) => {
  await loginViaAccessToken(page, 'AGENT1');
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
    }
  }

  let loginButtonExists = await page
    .getByTestId('login-button')
    .isVisible()
    .catch(() => false);
  if (loginButtonExists) {
    await telephonyLogin(page, loginMode);
  } else {
    const stateSelectVisible = await page.getByTestId('state-select').waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
    if (stateSelectVisible) {
      await page.waitForTimeout(3000);
      const ronapopupVisible = await page.getByTestId('samples:rona-popup').isVisible().catch(() => false);
      if (ronapopupVisible) {
        await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
      }
      const userState = await getCurrentState(page);
      if (userState != USER_STATES.ENGAGED && userState != USER_STATES.RONA) {
        await changeUserState(page, USER_STATES.AVAILABLE);
        await waitForState(page, USER_STATES.AVAILABLE);
      }

      const incomingTaskDiv = page.getByTestId(/^samples:incoming-task(-\w+)?$/).first();
      await incomingTaskDiv.waitFor({ state: 'visible', timeout: 5000 }).catch(() => false);
      await handleStrayTasks(page);
    }
    loginButtonExists = await page
      .getByTestId('login-button')
      .isVisible()
      .catch(() => false);


    if (!loginButtonExists) await stationLogout(page);
    await telephonyLogin(page, loginMode);
  }

  let stationLoginFailure = await page.getByTestId('station-login-failure-label').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  for (let i = 0; i < maxRetries && stationLoginFailure; i++) {
    loginButtonExists = await page
      .getByTestId('login-button')
      .isVisible()
      .catch(() => false);
    if (!loginButtonExists) await stationLogout(page);
    await telephonyLogin(page, loginMode);
    await page.getByTestId('state-select').waitFor({ state: 'visible', timeout: 30000 });
    stationLoginFailure = await page.getByTestId('station-login-failure-label').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (i == maxRetries - 1 && stationLoginFailure) {
      throw new Error(`Station Login Error Persists after ${maxRetries} attempts`);
    }
  }

  await page.getByTestId('state-select').waitFor({ state: 'visible', timeout: 30000 });

  let ronapopupVisible = await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false);
  if (ronapopupVisible) {
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
  }

  await changeUserState(page, USER_STATES.AVAILABLE);
  await page.waitForTimeout(3000);
  const incomingTaskDiv = page.getByTestId(/^samples:incoming-task(-\w+)?$/).first();
  await incomingTaskDiv.waitFor({ state: 'visible', timeout: 5000 }).catch(() => false);
  await handleStrayTasks(page);

  setupConsoleLogging(page);
}


test.describe('Incoming Task Tests in Extension Mode', async () => {
  test.beforeEach(() => {
    capturedLogs.length = 0;
  })


  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    context2 = await browser.newContext();
    page = await context.newPage();
    chatPage = await context.newPage();
    extensionPage = await context.newPage();
    callerpage = await context2.newPage();

    await Promise.all([
      (async () => {

        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(callerpage, process.env.PW_AGENT2_USERNAME, process.env.PW_PASSWORD);
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }


      })(),
      (async () => {
        await pageSetup(page, LOGIN_MODE.EXTENSION);
      })(),
      (async () => {

        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(extensionPage, process.env.PW_AGENT1_USERNAME, process.env.PW_PASSWORD);
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }
      })()
    ])
  })

  test('should accept incoming call, end call and complete wrapup in extension mode', async () => {
    await page.waitForTimeout(2000);
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(3000);
    await acceptExtensionCall(extensionPage);
    await waitForState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
    await waitForStateLogs(capturedLogs, USER_STATES.ENGAGED);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
    await endCallTask(extensionPage);
    await page.waitForTimeout(5000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await waitForStateLogs(capturedLogs, USER_STATES.AVAILABLE);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
    await waitForWrapupReasonLogs(capturedLogs, WRAPUP_REASONS.SALE);
    expect(getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
    expect(verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
  });


  test('should decline incoming call and verify RONA state in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(5000);
    await declineExtensionCall(extensionPage);
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'hidden', timeout: 5000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await waitForState(page, USER_STATES.RONA);
    await verifyCurrentState(page, USER_STATES.RONA);
    await endCallTask(callerpage);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.RONA)).toBe(true);
    // expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await waitForStateLogs(capturedLogs, USER_STATES.RONA);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
  });

  test('should ignore incoming call and wait for RONA popup in extension mode', async () => {
    await page.waitForTimeout(10000);
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').first().waitFor({ state: 'visible', timeout: 20000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').first().waitFor({ state: 'hidden', timeout: 10000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await endCallTask(callerpage);
    await waitForState(page, USER_STATES.RONA);
    await verifyCurrentState(page, USER_STATES.RONA);
    // expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await waitForStateLogs(capturedLogs, USER_STATES.RONA);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await page.waitForTimeout(8000);
  });


  test('should set agent state to Available and receive another call in extension mode', async () => {
    await page.waitForTimeout(2000);
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(5000);
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await waitForState(page, USER_STATES.RONA);
    await verifyCurrentState(page, USER_STATES.RONA);
    // expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await waitForStateLogs(capturedLogs, USER_STATES.RONA);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await waitForState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 10000 });
    await expect(incomingTaskDiv).toBeVisible();
    await endCallTask(callerpage);
    await page.waitForTimeout(10000);
  });


  test('should set agent state to busy after declining call in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(5000);
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await waitForState(page, USER_STATES.RONA);
    await verifyCurrentState(page, USER_STATES.RONA);
    // expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await waitForStateLogs(capturedLogs, USER_STATES.RONA);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await expect(incomingTaskDiv).toBeHidden();
    await expect(extensionPage.locator('[data-test="generic-person-item-base"]').first()).toBeHidden();
    await verifyCurrentState(page, USER_STATES.MEETING);
    await endCallTask(callerpage);
    await page.waitForTimeout(10000);
  });



  test('should handle customer disconnect before agent answers in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await page.waitForTimeout(5000);
    await endCallTask(callerpage);
    await page.waitForTimeout(5000);
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 20000 });
    await expect(incomingTaskDiv).toBeHidden();
    await waitForState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
  });


  test('should ignore incoming chat task and wait for RONA popup', async () => {
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 60000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 20000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    // expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await waitForStateLogs(capturedLogs, USER_STATES.RONA);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.RONA)).toBe(true);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
    await endChatTask(chatPage);
  });

  test('should set agent to Available and verify chat task behavior', async () => {
    await page.waitForTimeout(2000);
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 60000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await waitForState(page, USER_STATES.RONA);
    await verifyCurrentState(page, USER_STATES.RONA);
    // expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await waitForStateLogs(capturedLogs, USER_STATES.RONA);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 10000 });
    await expect(incomingTaskDiv).toBeVisible();
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
    await endChatTask(chatPage);
  });

  test('should set agent state to busy after ignoring chat task', async () => {
    await page.waitForTimeout(2000);
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 60000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    // expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await waitForStateLogs(capturedLogs, USER_STATES.RONA);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(3000);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await endChatTask(chatPage);
  });

  test('should accept incoming chat, end chat and complete wrapup with callback verification', async () => {
    await createChatTask(chatPage);
    await page.waitForTimeout(2000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 60000 });
    await acceptIncomingTask(page, TASK_TYPES.CHAT);
    await waitForState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
    // expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
    await waitForStateLogs(capturedLogs, USER_STATES.ENGAGED);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
    await expect(page.getByTestId('end-chat-button').first()).toBeVisible();
    await page.getByTestId('end-chat-button').first().click();
    await page.waitForTimeout(500);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await waitForStateLogs(capturedLogs, USER_STATES.AVAILABLE);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
    await waitForWrapupReasonLogs(capturedLogs, WRAPUP_REASONS.SALE);
    expect(getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
    expect(verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
  });

  test('should handle chat disconnect before agent answers', async () => {
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 60000 });
    await endChatTask(chatPage);
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await waitForState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
  })

  test('should accept incoming email task, end email and complete wrapup with callback verification', async () => {
    await createEmailTask();
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 })
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await waitForState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
    // expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
    await waitForState(page, USER_STATES.ENGAGED);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
    await expect(page.getByTestId('end-email-button').first()).toBeVisible();
    await page.getByTestId('end-email-button').first().click();
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await waitForStateLogs(capturedLogs, USER_STATES.AVAILABLE);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
    await waitForWrapupReasonLogs(capturedLogs, WRAPUP_REASONS.SALE);
    expect(getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
    expect(verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
  })


  test('should ignore incoming email task and wait for RONA popup', async () => {
    await createEmailTask();
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await waitForState(page, USER_STATES.RONA);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.RONA)).toBe(true);
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 10000 });
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    const endButton = page.getByTestId('end-email-button').first();
    await endButton.waitFor({ state: 'visible', timeout: 7000 });
    await endButton.click();
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(2000);
  })

  test('should set agent to Available and verify email task behavior', async () => {
    await createEmailTask();
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    // expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await waitForStateLogs(capturedLogs, USER_STATES.RONA);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 10000 });
    await expect(incomingTaskDiv).toBeVisible();
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await page.waitForTimeout(1000);
    const endButton = page.getByTestId('end-email-button').first();
    await endButton.waitFor({ state: 'visible', timeout: 12000 });
    await endButton.click();
    await page.waitForTimeout(1000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(2000);
  })


  test('should set agent state to busy after ignoring email task', async () => {
    await createEmailTask();
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await page.waitForTimeout(2000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await page.waitForTimeout(1000);
    await page.getByTestId('end-email-button').first().click();
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await stationLogout(page);
  })

  test.afterAll(async () => {
    if (page) {
      await page.close();
      page = null;
    }
    if (callerpage) {
      await callerpage.close();
      callerpage = null;
    }

    if (extensionPage) {
      await extensionPage.close();
      extensionPage = null;
    }
    if (chatPage) {
      await chatPage.close();
      chatPage = null;
    }


    // if (context) {
    //   await context.close();
    //   context = null;
    // }

    // if (context2) {
    //   await context2.close();
    //   context2 = null;
    // }
  })

});

test.describe('Incoming Call Task Tests for Desktop Mode', async () => {
  test.beforeEach(() => {
    capturedLogs.length = 0;
  })

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    context2 = await browser.newContext();
    page = await context.newPage();
    callerpage = await context2.newPage();

    await Promise.all([
      (async () => {
        await loginExtension(callerpage, process.env.PW_AGENT2_USERNAME, process.env.PW_PASSWORD);
      })(),
      (async () => {
        await pageSetup(page, LOGIN_MODE.DESKTOP);
      })(),
    ])
  })


  test('should accept incoming call, end call and complete wrapup in desktop mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await page.waitForTimeout(1000);
    await acceptIncomingTask(page, TASK_TYPES.CALL);
    await waitForState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
    await waitForStateLogs(capturedLogs, USER_STATES.ENGAGED);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
    await page.getByTestId('end-call-button').first().click();
    await page.waitForTimeout(2000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(3000);
    await waitForStateLogs(capturedLogs, USER_STATES.AVAILABLE);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
    await waitForWrapupReasonLogs(capturedLogs, WRAPUP_REASONS.SALE);
    expect(getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
    expect(verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
  });

  test('should decline incoming call and verify RONA state in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await createCallTask(callerpage);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await page.waitForTimeout(3000);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await waitForState(page, USER_STATES.RONA);
    await verifyCurrentState(page, USER_STATES.RONA);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.RONA)).toBe(true);
    await endCallTask(callerpage);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
  });

  test('should ignore incoming call and wait for RONA popup in desktop mode', async () => {
    await page.waitForTimeout(2000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await createCallTask(callerpage);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await endCallTask(callerpage);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
  });

  test('should set agent state to Available and receive another call in desktop mode', async () => {
    await page.waitForTimeout(2000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await createCallTask(callerpage);
    let incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await page.waitForTimeout(3000);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await waitForState(page, USER_STATES.RONA);
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 10000 });
    await expect(incomingTaskDiv).toBeVisible();
    await page.waitForTimeout(3000);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await endCallTask(callerpage);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
  });



  test('should set agent state to busy after declining call in desktop mode', async () => {
    await page.waitForTimeout(2000);
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    let incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await page.waitForTimeout(3000);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await waitForState(page, USER_STATES.RONA);
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await waitForState(page, USER_STATES.MEETING);
    await verifyCurrentState(page, USER_STATES.MEETING);
    incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await expect(incomingTaskDiv).toBeHidden();
    await endCallTask(callerpage);
    await page.waitForTimeout(2000);
  });

  test('should handle customer disconnect before agent answers in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await createCallTask(callerpage);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await endCallTask(callerpage);
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await waitForState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
  });

  test.afterAll(async () => {
    if (page) {
      await page.close();
      page = null;
    }
    if (callerpage) {
      await callerpage.close();
      callerpage = null;
    }

    // if (context) {
    //   await context.close();
    //   context = null;
    // }

    // if (context2) {
    //   await context2.close();
    //   context2 = null;
    // }
  })

});


test.describe('Incoming Tasks tests for multi-session', async () => {


  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    context2 = await browser.newContext();
    page = await context.newPage();
    page2 = await context.newPage();
    chatPage = await context.newPage();
    extensionPage = await context.newPage();
    callerpage = await context2.newPage();

    await Promise.all([
      (async () => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(callerpage, process.env.PW_AGENT2_USERNAME, process.env.PW_PASSWORD);
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }

      })(),
      (async () => {
        await pageSetup(page, LOGIN_MODE.EXTENSION);
      })(),
      (async () => {
        await pageSetup(page2, LOGIN_MODE.EXTENSION);
      })(),
      (async () => {

        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(extensionPage, process.env.PW_AGENT1_USERNAME, process.env.PW_PASSWORD);
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }
      })()
    ])
  })

  test('should handle multi-session incoming call with state synchronization', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    const incomingTaskDiv2 = page2.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').first().waitFor({ state: 'visible', timeout: 20000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(5000);
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 10000 });
    await page2.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(3000);
    await submitRonaPopup(page2, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
    await waitForState(page2, USER_STATES.MEETING);
    await verifyCurrentState(page2, USER_STATES.MEETING);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await expect(page2.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(2000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await waitForState(page2, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 10000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').first().waitFor({ state: 'visible', timeout: 10000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    await acceptExtensionCall(extensionPage);
    await waitForState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page2, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
    const userStateElement2 = page2.getByTestId('state-select');
    const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor2, THEME_COLORS.ENGAGED)).toBe(true);
    await expect(incomingTaskDiv).toBeHidden();
    await expect(incomingTaskDiv2).toBeHidden();
    await page2.getByTestId('end-call-button').first().click();
    await page.waitForTimeout(1000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await waitForState(page2, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
  })

  test('should handle multi-session incoming chat with state synchronization', async () => {
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    const incomingTaskDiv2 = page2.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 10000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await incomingTaskDiv2.waitFor({ state: 'hidden', timeout: 10000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await page2.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await submitRonaPopup(page2, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
    await waitForState(page2, USER_STATES.MEETING);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await verifyCurrentState(page2, USER_STATES.MEETING);
    await page.waitForTimeout(2000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await waitForState(page2, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 10000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 10000 });
    await acceptIncomingTask(page, TASK_TYPES.CHAT);
    await waitForState(page, USER_STATES.ENGAGED);
    await waitForState(page2, USER_STATES.ENGAGED);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page2, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
    const userStateElement2 = page2.getByTestId('state-select');
    const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor2, THEME_COLORS.ENGAGED)).toBe(true);
    await expect(incomingTaskDiv).toBeHidden();
    await expect(incomingTaskDiv2).toBeHidden();
    await page2.getByTestId('end-chat-button').first().click();
    await submitWrapup(page2, WRAPUP_REASONS.SALE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await waitForState(page2, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
  });

  test('should handle multi-session incoming email with state synchronization', async () => {
    await createEmailTask();
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    const incomingTaskDiv2 = page2.getByTestId('samples:incoming-task-email').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 10000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await incomingTaskDiv2.waitFor({ state: 'hidden', timeout: 10000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await page2.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(3000);
    await submitRonaPopup(page2, RONA_OPTIONS.IDLE);
    await waitForState(page, USER_STATES.MEETING);
    await waitForState(page2, USER_STATES.MEETING);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await verifyCurrentState(page2, USER_STATES.MEETING);
    await page.waitForTimeout(2000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await waitForState(page2, USER_STATES.AVAILABLE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 10000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 10000 });
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await waitForState(page, USER_STATES.ENGAGED);
    await waitForState(page2, USER_STATES.ENGAGED);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page2, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
    const userStateElement2 = page.getByTestId('state-select');
    const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(isColorClose(userStateElementColor2, THEME_COLORS.ENGAGED)).toBe(true);
    await expect(incomingTaskDiv).toBeHidden();
    await expect(incomingTaskDiv2).toBeHidden();
    await page2.getByTestId('end-email-button').first().click();
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await waitForState(page, USER_STATES.AVAILABLE);
    await waitForState(page2, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
    await stationLogout(page2);
  });

  test.afterAll(async () => {
    if (page) {
      await page.close();
      page = null;
    }
    if (callerpage) {
      await callerpage.close();
      callerpage = null;
    }

    if (extensionPage) {
      await extensionPage.close();
      extensionPage = null;
    }
    if (chatPage) {
      await chatPage.close();
      chatPage = null;
    }

    if (page2) {
      await page2.close();
      page2 = null;
    }


    // if (context) {
    //   await context.close();
    //   context = null;
    // }

    // if (context2) {
    //   await context2.close();
    //   context2 = null;
    // }
  })

});
