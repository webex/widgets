import { test, Page, expect, BrowserContext } from '@playwright/test';
import { loginViaAccessToken, disableMultiLogin, oauthLogin, enableAllWidgets, initialiseWidgets, enableMultiLogin } from './Utils/initUtils';
import { telephonyLogin, desktopLogin, extensionLogin, stationLogout } from './Utils/stationLoginUtils';
import { changeUserState, getCurrentState, verifyCurrentState } from './Utils/userStateUtils';
import { createCallTask, createChatTask, declineExtensionCall, declineIncomingTask, endCallTask, endChatTask, loginExtension, acceptIncomingTask, acceptExtensionCall, createEmailTask, endExtensionCall, submitRonaPopup } from './Utils/incomingTaskUtils';
import { TASK_TYPES, USER_STATES, LOGIN_MODE, THEME_COLORS, WRAPUP_REASONS, RONA_OPTIONS } from './constants';
import { submitWrapup } from './Utils/wrapupUtils';


let page: Page = null;
let context: BrowserContext = null;
let callerpage: Page = null;
let extensionPage: Page = null;
let context2: BrowserContext = null;
let chatPage: Page = null;
let page2: Page = null;
let capturedLogs: string[] = [];
const maxRetries = 3;


//NOTE : Make Sure to set RONA Timeout to 18 seconds before running this test.

function getLastStateFromLogs(capturedLogs: string[]): string {
  const stateChangeLogs = capturedLogs.filter(log =>
    log.includes('onStateChange invoked with state name:')
  );

  if (stateChangeLogs.length === 0) {
    throw new Error('No onStateChange logs found in captured logs');
  }

  const lastStateLog = stateChangeLogs[stateChangeLogs.length - 1];
  const match = lastStateLog.match(/onStateChange invoked with state name:\s*(.+)$/);

  if (!match) {
    throw new Error('Could not extract state name from log: ' + lastStateLog);
  }

  return match[1].trim();
}

// Helper function to get the last wrapup reason from onWrapup logs
function getLastWrapupReasonFromLogs(capturedLogs: string[]): string {
  const wrapupLogs = capturedLogs.filter(log =>
    log.includes('onWrapup invoked with reason :')
  );

  if (wrapupLogs.length === 0) {
    throw new Error('No onWrapup logs found in captured logs');
  }

  const lastWrapupLog = wrapupLogs[wrapupLogs.length - 1];
  const match = lastWrapupLog.match(/onWrapup invoked with reason : (.+)$/);

  if (!match) {
    throw new Error('Could not extract wrapup reason from log: ' + lastWrapupLog);
  }

  return match[1].trim();
}


function verifyCallbackLogs(
  capturedLogs: string[],
  expectedWrapupReason: string,
  expectedState: string,
  shouldWrapupComeFirst: boolean = true
): boolean {
  try {
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

  } catch (error) {
    throw error;
  }
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

const handleStrayTasks = async (page: Page): Promise<void> => {
  const incomingTaskDiv = page.getByTestId(/^samples:incoming-task(-\w+)?$/);
  const tasks = await incomingTaskDiv.all();
  for (let task of tasks) {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(3000);
    const acceptButton = task.getByTestId('task-accept-button');

    let isTaskVisible = await task.isVisible().catch(() => false);
    if (!isTaskVisible) {
      await changeUserState(page, USER_STATES.AVAILABLE);
      await page.waitForTimeout(3000);
      isTaskVisible = await task.isVisible().catch(() => false);
    }

    if (!isTaskVisible) continue;
    await page.waitForTimeout(2000);
    const acceptButtonVisible = await acceptButton.isVisible().catch(() => false);
    if (!acceptButtonVisible) {
      const extensionCallVisible = await page.locator('[data-test="right-action-button"]').isVisible().catch(() => false);
      if (extensionPage && extensionCallVisible) {
        await acceptExtensionCall(extensionPage);
      } else {
        throw new Error('Accept button not visible and extension page is not available');
      }
    } else {
      await acceptButton.click();
    }

    await page.waitForTimeout(3000);
    const endButton = page.getByTestId(/^end-\w+-button$/).first();
    const endButtonVisible = await endButton.isVisible().catch(() => false);
    if (endButtonVisible) {
      await page.waitForTimeout(3000);
      await endButton.click();
      await page.waitForTimeout(3000);
      await submitWrapup(page, WRAPUP_REASONS.SALE);
    } else if (extensionPage && await page.locator('[data-test="end-call"]').isVisible().catch(() => false)) {
      await page.waitForTimeout(3000);
      await endExtensionCall(extensionPage);
      await page.waitForTimeout(3000);
      await submitWrapup(page, WRAPUP_REASONS.SALE);
    }

    await page.waitForTimeout(3000);
    let ronapopupVisible = await page.getByTestId('samples:rona-popup').isVisible().catch(() => false);
    if (ronapopupVisible) {
      await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
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
      await page.getByTestId('station-login-widget').waitFor({ state: 'visible', timeout: 30000 });
      break;
    } catch (error) {
      if (i == maxRetries - 1) {
        throw new Error(`Failed to initialise widgets after ${maxRetries} attempts: ${error}`);
      }
    }
  }

  const loginButtonExists = await page
    .getByTestId('login-button')
    .isVisible()
    .catch(() => false);
  if (loginButtonExists) {
    await telephonyLogin(page, loginMode);
  } else {
    const stateSelectVisible = await page.getByTestId('state-select').isVisible().catch(() => false);
    if (stateSelectVisible) {
      const userState = await getCurrentState(page);
      if (userState === USER_STATES.ENGAGED) {
        const wrapupButton = page.getByTestId('wrapup-button').first();
        const wrapupButtonVisible = await wrapupButton.isVisible().catch(() => false);
        if (wrapupButtonVisible) {
          await page.waitForTimeout(1000);
          await submitWrapup(page, WRAPUP_REASONS.SALE);
          await page.waitForTimeout(1000);
        }

        const endButton = page.getByTestId(/^end-\w+-button$/).first();
        let endButtonVisible = await endButton.isVisible().catch(() => false);

        if (endButtonVisible) {
          await page.waitForTimeout(1000);
          await endButton.click();
          await page.waitForTimeout(1000);
        }


      }
      const wrapupButton = page.getByTestId('wrapup-button').first();
      const wrapupButtonVisible = await wrapupButton.isVisible().catch(() => false);
      if (wrapupButtonVisible) {
        await page.waitForTimeout(1000);
        await submitWrapup(page, WRAPUP_REASONS.SALE);
      }
      const ronapopupVisible = await page.getByTestId('samples:rona-popup').isVisible().catch(() => false);

      if (ronapopupVisible) {
        await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
      }

      const incomingTaskDiv = page.getByTestId(/^samples:incoming-task(-\w+)?$/).first();
      const incomingTaskVisible = await incomingTaskDiv.isVisible().catch(() => false);
      if (incomingTaskVisible) {
        await handleStrayTasks(page);
      }
    }
    await stationLogout(page);
    await telephonyLogin(page, loginMode);
  }

  let stationLoginFailure = await page.getByTestId('station-login-failure-label').isVisible().catch(() => false);
  for (let i = 0; i < maxRetries && stationLoginFailure; i++) {
    await stationLogout(page);
    await telephonyLogin(page, loginMode);
    stationLoginFailure = await page.getByTestId('station-login-failure-label').isVisible().catch(() => false);
    if (i == maxRetries - 1 && stationLoginFailure) {
      throw new Error(`Station Login Error Persists after ${maxRetries} attempts`);
    }
  }

  await expect(page.getByTestId('state-select')).toBeVisible();
  await page.waitForTimeout(2000);

  let ronapopupVisible = await page.getByTestId('samples:rona-popup').isVisible().catch(() => false);
  if (ronapopupVisible) {
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
  }

  const wrapupButton = page.getByTestId('wrapup-button').first();
  const wrapupButtonVisible = await wrapupButton.isVisible().catch(() => false);
  if (wrapupButtonVisible) {
    await page.waitForTimeout(2000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
  }

  await changeUserState(page, USER_STATES.AVAILABLE);
  await page.waitForTimeout(4000);
  const incomingTaskDiv = page.getByTestId(/^samples:incoming-task(-\w+)?$/).first();
  const incomingTaskVisible = await incomingTaskDiv.isVisible().catch(() => false);
  if (incomingTaskVisible) {
    await handleStrayTasks(page);
  }
  setupConsoleLogging(page);
}



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
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await page.waitForTimeout(5000);
    await acceptIncomingTask(page, TASK_TYPES.CALL);
    await page.waitForTimeout(6000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
    await page.getByTestId('end-call-button').first().click();
    await page.waitForTimeout(3000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await page.waitForTimeout(15000);
    expect(verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
    expect(getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
  });

  test('should decline incoming call and verify RONA state in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(1000);
    await createCallTask(callerpage);
    await page.waitForTimeout(2000);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(8000);
    await verifyCurrentState(page, USER_STATES.RONA);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(
      ((receivedColor: string, expectedColor: string, tolerance: number = 20) => {
        const receivedRgb = receivedColor.match(/\d+/g)?.map(Number) || [];
        const expectedRgb = expectedColor.match(/\d+/g)?.map(Number) || [];

        if (receivedRgb.length !== 3 || expectedRgb.length !== 3) return false;

        return receivedRgb.every((value, index) =>
          Math.abs(value - expectedRgb[index]) <= tolerance
        );
      })(userStateElementColor, THEME_COLORS.RONA)
    ).toBe(true);
    await endCallTask(callerpage);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
  });

  test('should ignore incoming call and wait for RONA popup in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(1000);
    await createCallTask(callerpage);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await endCallTask(callerpage);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
  });

  test('should set agent state to Available and receive another call in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(1000);
    await createCallTask(callerpage);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await expect(incomingTaskDiv).toBeVisible();
    await page.waitForTimeout(7000);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.waitForTimeout(5000);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await endCallTask(callerpage);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
  });



  test('should set agent state to busy after declining call in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(1000);
    await createCallTask(callerpage);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, 'Idle');
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.MEETING);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await expect(incomingTaskDiv).toBeHidden();
    await endCallTask(callerpage);
  });

  test('should handle customer disconnect before agent answers in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await createCallTask(callerpage);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 50000 });
    await endCallTask(callerpage);
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
      context = null;
    }
    if (context2) {
      await context2.close();
      context2 = null;
    }
  })

});


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
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(5000);
    await acceptExtensionCall(extensionPage);
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
    await endCallTask(extensionPage);
    await page.waitForTimeout(4000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await page.waitForTimeout(15000);
    expect(verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
    expect(getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
  });


  test('should decline incoming call and verify RONA state in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(3000);
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 30000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'hidden', timeout: 30000 });
    await page.waitForTimeout(6000);
    await verifyCurrentState(page, USER_STATES.RONA);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(
      ((receivedColor: string, expectedColor: string, tolerance: number = 20) => {
        const receivedRgb = receivedColor.match(/\d+/g)?.map(Number) || [];
        const expectedRgb = expectedColor.match(/\d+/g)?.map(Number) || [];

        if (receivedRgb.length !== 3 || expectedRgb.length !== 3) return false;

        return receivedRgb.every((value, index) =>
          Math.abs(value - expectedRgb[index]) <= tolerance
        );
      })(userStateElementColor, THEME_COLORS.RONA)
    ).toBe(true);
    await page.waitForTimeout(2000);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);

    await endCallTask(callerpage);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
  });

  test('should ignore incoming call and wait for RONA popup in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible', timeout: 30000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').first().waitFor({ state: 'hidden', timeout: 30000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.RONA);
    await page.waitForTimeout(10000);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await endCallTask(callerpage);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
  });


  test('should set agent state to Available and receive another call in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(3000);
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 30000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.RONA);
    await page.waitForTimeout(10000);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await endCallTask(callerpage);
  });


  test('should set agent state to busy after declining call in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(3000);
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 30000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await page.waitForTimeout(6000);
    await verifyCurrentState(page, USER_STATES.RONA);
    await page.waitForTimeout(3000);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(500);
    await expect(incomingTaskDiv).toBeHidden();
    await expect(extensionPage.locator('[data-test="generic-person-item-base"]').first()).toBeHidden();
    await page.waitForTimeout(6000);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await endCallTask(callerpage);
  });



  test('should handle customer disconnect before agent answers in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await page.waitForTimeout(5000);
    await endCallTask(callerpage);
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.waitForTimeout(10000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
  });


  test('should ignore incoming chat task and wait for RONA popup', async () => {
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    await page.waitForTimeout(5000);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    const userStateElement = page.getByTestId('state-select');
    await page.waitForTimeout(2000);
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(
      ((receivedColor: string, expectedColor: string, tolerance: number = 20) => {
        const receivedRgb = receivedColor.match(/\d+/g)?.map(Number) || [];
        const expectedRgb = expectedColor.match(/\d+/g)?.map(Number) || [];

        if (receivedRgb.length !== 3 || expectedRgb.length !== 3) return false;

        return receivedRgb.every((value, index) =>
          Math.abs(value - expectedRgb[index]) <= tolerance
        );
      })(userStateElementColor, THEME_COLORS.RONA)
    ).toBe(true);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await endChatTask(chatPage);
  });

  test('should set agent to Available and verify chat task behavior', async () => {
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.RONA);
    await page.waitForTimeout(3000);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await expect(incomingTaskDiv).toBeVisible();
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await endChatTask(chatPage);
  });

  test('should set agent state to busy after ignoring chat task', async () => {
    await createChatTask(chatPage);
    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.RONA);
    await page.waitForTimeout(5000);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(6000);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await endChatTask(chatPage);
  });

  test('should accept incoming chat, end chat and complete wrapup with callback verification', async () => {
    await page.waitForTimeout(3000);
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await page.waitForTimeout(3000);
    await acceptIncomingTask(page, TASK_TYPES.CHAT);
    await page.waitForTimeout(6000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
    await page.getByTestId('end-chat-button').first().click();
    await page.waitForTimeout(3000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await page.waitForTimeout(15000);
    expect(verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
    expect(getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
  });

  test('should handle chat disconnect before agent answers', async () => {
    await page.waitForTimeout(3000);
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await endChatTask(chatPage);
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
  })

  test('should accept incoming email task, end email and complete wrapup with callback verification', async () => {
    await createEmailTask();
    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    await page.waitForTimeout(3000);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 })
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);
    await page.waitForTimeout(3000);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
    await page.getByTestId('end-email-button').first().click();
    await page.waitForTimeout(4000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await page.waitForTimeout(15000);
    expect(getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
    expect(verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
  })


  test('should ignore incoming email task and wait for RONA popup', async () => {
    await page.waitForTimeout(3000);
    await createEmailTask();
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(
      ((receivedColor: string, expectedColor: string, tolerance: number = 20) => {
        const receivedRgb = receivedColor.match(/\d+/g)?.map(Number) || [];
        const expectedRgb = expectedColor.match(/\d+/g)?.map(Number) || [];

        if (receivedRgb.length !== 3 || expectedRgb.length !== 3) return false;

        return receivedRgb.every((value, index) =>
          Math.abs(value - expectedRgb[index]) <= tolerance
        );
      })(userStateElementColor, THEME_COLORS.RONA)
    ).toBe(true);

    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
  })

  test('should set agent to Available and verify email task behavior', async () => {
    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    await page.waitForTimeout(3000);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.RONA);
    await page.waitForTimeout(6000);
    expect(getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
    await submitRonaPopup(page, RONA_OPTIONS.AVAILABLE);
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(6000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 30000 });
    await expect(incomingTaskDiv).toBeVisible();
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await page.waitForTimeout(3000);
    const endButton = page.getByTestId('end-email-button').first();
    await endButton.waitFor({ state: 'visible', timeout: 12000 });
    await endButton.click();
    await page.waitForTimeout(4000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
  })


  test('should set agent state to busy after ignoring email task', async () => {
    await createEmailTask();
    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    await page.waitForTimeout(3000);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await submitRonaPopup(page, RONA_OPTIONS.IDLE);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await page.waitForTimeout(3000);
    await page.getByTestId('end-email-button').first().click();
    await page.waitForTimeout(5000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await stationLogout(page);
  })


  test.afterAll(async () => {
    if (context) {
      await context.close();
      context = null;
    }
    if (context2) {
      await context2.close();
      context2 = null;
    }
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
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').first().waitFor({ state: 'visible', timeout: 30000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(5000);
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await page2.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 150000 });

    await submitRonaPopup(page2, RONA_OPTIONS.IDLE);
    await page.waitForTimeout(6000);
    await verifyCurrentState(page2, USER_STATES.MEETING);
    await verifyCurrentState(page, USER_STATES.MEETING);

    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await expect(page2.getByTestId('samples:rona-popup')).not.toBeVisible();

    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(6000);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);

    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await extensionPage.locator('[data-test="generic-person-item-base"]').first().waitFor({ state: 'visible', timeout: 30000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(5000);
    await acceptExtensionCall(extensionPage);
    await page.waitForTimeout(6000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page2, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);

    const userStateElement2 = page2.getByTestId('state-select');
    const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor2).toBe(THEME_COLORS.ENGAGED);

    await expect(incomingTaskDiv).toBeHidden();
    await expect(incomingTaskDiv2).toBeHidden();

    await page2.getByTestId('end-call-button').first().click();
    await page.waitForTimeout(3000)
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await page.waitForTimeout(6000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
  })

  test('should handle multi-session incoming chat with state synchronization', async () => {
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
    const incomingTaskDiv2 = page2.getByTestId('samples:incoming-task-chat').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 15000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await incomingTaskDiv2.waitFor({ state: 'hidden', timeout: 15000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await page2.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await submitRonaPopup(page2, RONA_OPTIONS.IDLE);
    await page.waitForTimeout(7000);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await verifyCurrentState(page2, USER_STATES.MEETING);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(6000);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 15000 });
    await acceptIncomingTask(page, TASK_TYPES.CHAT);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page2, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);
    const userStateElement2 = page2.getByTestId('state-select');
    const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor2).toBe(THEME_COLORS.ENGAGED);
    await expect(incomingTaskDiv).toBeHidden();
    await expect(incomingTaskDiv2).toBeHidden();
    await page2.getByTestId('end-chat-button').first().click();
    await page.waitForTimeout(3000);
    await submitWrapup(page2, WRAPUP_REASONS.SALE);
    await page.waitForTimeout(6000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
  });

  test('should handle multi-session incoming email with state synchronization', async () => {
    await createEmailTask();
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
    const incomingTaskDiv2 = page2.getByTestId('samples:incoming-task-email').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 15000 });
    await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 30000 });
    await incomingTaskDiv2.waitFor({ state: 'hidden', timeout: 15000 });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await page2.getByTestId('samples:rona-popup').waitFor({ state: 'visible', timeout: 15000 });
    await submitRonaPopup(page2, RONA_OPTIONS.IDLE);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await verifyCurrentState(page2, USER_STATES.MEETING);
    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 70000 });
    await incomingTaskDiv2.waitFor({ state: 'visible', timeout: 15000 });
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page2, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);
    const userStateElement2 = page.getByTestId('state-select');
    const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor2).toBe(THEME_COLORS.ENGAGED);
    await expect(incomingTaskDiv).toBeHidden();
    await expect(incomingTaskDiv2).toBeHidden();
    await page2.getByTestId('end-email-button').first().click();
    await page.waitForTimeout(3000);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
    await stationLogout(page2);
  });


  test.afterAll(async () => {
    if (context) {
      await context.close();
      context = null;
    }
    if (context2) {
      await context2.close();
      context2 = null;
    }

  })

});
