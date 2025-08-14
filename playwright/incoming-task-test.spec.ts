import {test, Page, expect} from '@playwright/test';
import {changeUserState, verifyCurrentState} from './Utils/userStateUtils';
import {
  createCallTask,
  createChatTask,
  declineExtensionCall,
  declineIncomingTask,
  endCallTask,
  endChatTask,
  acceptIncomingTask,
  acceptExtensionCall,
  createEmailTask,
  submitRonaPopup,
} from './Utils/incomingTaskUtils';
import {TASK_TYPES, USER_STATES, LOGIN_MODE, THEME_COLORS, WRAPUP_REASONS, RONA_OPTIONS} from './constants';
import {submitWrapup} from './Utils/wrapupUtils';
import {
  waitForState,
  waitForStateLogs,
  getLastStateFromLogs,
  waitForWrapupReasonLogs,
  getLastWrapupReasonFromLogs,
  isColorClose,
} from './Utils/helperUtils';
import {TestManager} from './test-manager';

let capturedLogs: string[] = [];

//NOTE : Make Sure to set RONA Timeout to 18 seconds before running this test.

/**
 * Verifies the captured logs for wrapup and state change events
 * @param capturedLogs - Array of log messages
 * @param expectedWrapupReason - The expected wrapup reason to verify
 * @param expectedState - The expected state name to verify
 * @param shouldWrapupComeFirst - Whether the wrapup log should come before the state change log (default: true)
 * @returns Promise<boolean> - True if verification is successful, otherwise throws an error
 * @throws Error if logs do not match expected values or order
 * @description Checks the last wrapup reason and state name in logs against expected values, ensuring correct order if specified
 * @example
 * ```typescript
 * await verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE);
 * ```
 */

export async function verifyCallbackLogs(
  capturedLogs: string[],
  expectedWrapupReason: string,
  expectedState: string,
  shouldWrapupComeFirst: boolean = true
): Promise<boolean> {
  const wrapupLogs = capturedLogs.filter((log) => log.includes('onWrapup invoked with reason :'));
  const stateChangeLogs = capturedLogs.filter((log) => log.includes('onStateChange invoked with state name:'));

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
    if (
      logText.includes('onStateChange invoked with state name:') ||
      logText.includes('onWrapup invoked with reason :')
    ) {
      capturedLogs.push(logText);
    }
  };

  page.on('console', consoleHandler);

  return () => page.off('console', consoleHandler);
}

export default function createIncomingTaskTests() {
  test.describe('Incoming Call Task Tests for Desktop Mode', () => {
    let testManager: TestManager;

    test.beforeEach(() => {
      capturedLogs.length = 0;
    });

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForIncomingTaskDesktop(browser);

      setupConsoleLogging(testManager.agent1Page);
    });

    test('should accept incoming call, end call and complete wrapup in desktop mode', async () => {
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1Page.waitForTimeout(3000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
      await waitForStateLogs(capturedLogs, USER_STATES.ENGAGED);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click({timeout: 5000});
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(3000);
      await waitForStateLogs(capturedLogs, USER_STATES.AVAILABLE);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
      await waitForWrapupReasonLogs(capturedLogs, WRAPUP_REASONS.SALE);
      expect(await getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
      expect(await verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
    });

    test('should decline incoming call and verify RONA state in desktop mode', async () => {
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1Page.waitForTimeout(3000);
      await declineIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await waitForState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.MEETING)).toBe(true);
      await endCallTask(testManager.callerPage!);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
    });

    test('should ignore incoming call and wait for RONA popup in desktop mode', async () => {
      await testManager.agent1Page.waitForTimeout(2000);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).toBeVisible();
      await endCallTask(testManager.callerPage!);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
    });

    test('should set agent state to Available and receive another call in desktop mode', async () => {
      await testManager.agent1Page.waitForTimeout(2000);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      let incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1Page.waitForTimeout(3000);
      await declineIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await waitForState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.AVAILABLE);
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).not.toBeVisible();
      await testManager.agent1Page.waitForTimeout(5000);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
      incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 10000});
      await expect(incomingTaskDiv).toBeVisible();
      await testManager.agent1Page.waitForTimeout(3000);
      await declineIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).toBeVisible();
      await endCallTask(testManager.callerPage!);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
    });

    test('should set agent state to busy after declining call in desktop mode', async () => {
      await testManager.agent1Page.waitForTimeout(2000);
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      let incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1Page.waitForTimeout(3000);
      await declineIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await waitForState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).not.toBeVisible();
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.MEETING);
      incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await expect(incomingTaskDiv).toBeHidden();
      await endCallTask(testManager.callerPage!);
      await testManager.agent1Page.waitForTimeout(2000);
    });

    test('should handle customer disconnect before agent answers in desktop mode', async () => {
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await endCallTask(testManager.callerPage!);
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await expect(incomingTaskDiv).toBeHidden();
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });
  });

  test.describe('Incoming Task Tests in Extension Mode', () => {
    let testManager: TestManager;

    test.beforeEach(() => {
      capturedLogs.length = 0;
    });

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForIncomingTaskExtension(browser);
      setupConsoleLogging(testManager.agent1Page);
    });

    test('should accept incoming call, end call and complete wrapup in extension mode', async () => {
      await testManager.agent1Page.waitForTimeout(2000);
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .waitFor({state: 'visible', timeout: 20000});
      await testManager.agent1Page.waitForTimeout(3000);
      await acceptExtensionCall(testManager.agent1ExtensionPage);
      await testManager.agent1Page.waitForTimeout(3000);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
      await waitForStateLogs(capturedLogs, USER_STATES.ENGAGED);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
      await endCallTask(testManager.agent1ExtensionPage);
      await testManager.agent1Page.waitForTimeout(5000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await waitForStateLogs(capturedLogs, USER_STATES.AVAILABLE);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
      await waitForWrapupReasonLogs(capturedLogs, WRAPUP_REASONS.SALE);
      expect(await getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
      expect(await verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
      await testManager.agent1Page.waitForTimeout(10000);
    });

    test('should decline incoming call and verify RONA state in extension mode', async () => {
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .waitFor({state: 'visible', timeout: 20000});
      await testManager.agent1Page.waitForTimeout(5000);
      await declineExtensionCall(testManager.agent1ExtensionPage);
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .first()
        .waitFor({state: 'hidden', timeout: 5000});
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await waitForState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await endCallTask(testManager.callerPage!);
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.MEETING)).toBe(true);
      await waitForStateLogs(capturedLogs, USER_STATES.AGENT_DECLINED);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AGENT_DECLINED);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await testManager.agent1Page.waitForTimeout(10000);
    });

    test('should ignore incoming call and wait for RONA popup in extension mode', async () => {
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .first()
        .waitFor({state: 'visible', timeout: 20000});
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .first()
        .waitFor({state: 'hidden', timeout: 10000});
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).toBeVisible();
      await endCallTask(testManager.callerPage!);
      await waitForState(testManager.agent1Page, USER_STATES.RONA);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.RONA);
      await waitForStateLogs(capturedLogs, USER_STATES.RONA);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await testManager.agent1Page.waitForTimeout(10000);
    });

    test('should set agent state to Available and receive another call in extension mode', async () => {
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .waitFor({state: 'visible', timeout: 20000});
      await testManager.agent1Page.waitForTimeout(5000);
      await declineExtensionCall(testManager.agent1ExtensionPage);
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).toBeVisible();
      await waitForState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await waitForStateLogs(capturedLogs, USER_STATES.AGENT_DECLINED);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AGENT_DECLINED);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.AVAILABLE);
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).not.toBeVisible();
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 10000});
      await expect(incomingTaskDiv).toBeVisible();
      await endCallTask(testManager.callerPage!);
      await testManager.agent1Page.waitForTimeout(8000);
    });

    test('should set agent state to busy after declining call in extension mode', async () => {
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .first()
        .waitFor({state: 'visible', timeout: 20000});
      await testManager.agent1Page.waitForTimeout(5000);
      await declineExtensionCall(testManager.agent1ExtensionPage);
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).toBeVisible();
      await waitForState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AGENT_DECLINED);
      await waitForStateLogs(capturedLogs, USER_STATES.AGENT_DECLINED);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AGENT_DECLINED);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).not.toBeVisible();
      await expect(incomingTaskDiv).toBeHidden();
      await expect(
        testManager.agent1ExtensionPage.locator('[data-test="generic-person-item-base"]').first()
      ).toBeHidden();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.MEETING);
      await endCallTask(testManager.callerPage!);
      await testManager.agent1Page.waitForTimeout(10000);
    });

    test('should handle call disconnect before agent answers in extension mode', async () => {
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1Page.waitForTimeout(5000);
      await endCallTask(testManager.callerPage!);
      await testManager.agent1Page.waitForTimeout(5000);
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 20000});
      await expect(incomingTaskDiv).toBeHidden();
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
    });

    test('should ignore incoming chat task and wait for RONA popup', async () => {
      await createChatTask(testManager.chatPage, process.env[`${testManager.projectName}_CHAT_URL`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-chat').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 60000});
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 20000});
      await expect(incomingTaskDiv).toBeHidden();
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).toBeVisible();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.RONA);
      await waitForStateLogs(capturedLogs, USER_STATES.RONA);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.RONA)).toBe(true);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await endChatTask(testManager.chatPage);
    });

    test('should set agent to Available and verify chat task behavior', async () => {
      await testManager.agent1Page.waitForTimeout(2000);
      await createChatTask(testManager.chatPage, process.env[`${testManager.projectName}_CHAT_URL`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-chat').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 60000});
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await expect(incomingTaskDiv).toBeHidden();
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).toBeVisible();
      await waitForState(testManager.agent1Page, USER_STATES.RONA);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.RONA);
      await waitForStateLogs(capturedLogs, USER_STATES.RONA);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(2000);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).not.toBeVisible();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 10000});
      await expect(incomingTaskDiv).toBeVisible();
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await endChatTask(testManager.chatPage);
    });

    test('should set agent state to busy after ignoring chat task', async () => {
      await testManager.agent1Page.waitForTimeout(2000);
      await createChatTask(testManager.chatPage, process.env[`${testManager.projectName}_CHAT_URL`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-chat').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 60000});
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await expect(incomingTaskDiv).toBeHidden();
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).toBeVisible();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.RONA);
      await waitForStateLogs(capturedLogs, USER_STATES.RONA);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).not.toBeVisible();
      await testManager.agent1Page.waitForTimeout(3000);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.MEETING);
      await endChatTask(testManager.chatPage);
    });

    test('should accept incoming chat, end chat and complete wrapup with callback verification', async () => {
      await createChatTask(testManager.chatPage, process.env[`${testManager.projectName}_CHAT_URL`]!);
      await testManager.agent1Page.waitForTimeout(2000);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-chat').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 60000});
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CHAT);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
      await waitForStateLogs(capturedLogs, USER_STATES.ENGAGED);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
      await expect(testManager.agent1Page.getByTestId('call-control:end-call').first()).toBeVisible();
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click({timeout: 5000});
      await testManager.agent1Page.waitForTimeout(500);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await waitForStateLogs(capturedLogs, USER_STATES.AVAILABLE);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
      await waitForWrapupReasonLogs(capturedLogs, WRAPUP_REASONS.SALE);
      expect(await getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
      expect(await verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
    });

    test('should handle chat disconnect before agent answers', async () => {
      await createChatTask(testManager.chatPage, process.env[`${testManager.projectName}_CHAT_URL`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-chat').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 60000});
      await endChatTask(testManager.chatPage);
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
    });

    test('should accept incoming email task, end email and complete wrapup with callback verification', async () => {
      await createEmailTask(process.env[`${testManager.projectName}_EMAIL_ENTRY_POINT`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-email').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 50000});
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.EMAIL);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await waitForStateLogs(capturedLogs, USER_STATES.ENGAGED);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);
      await expect(testManager.agent1Page.getByTestId('call-control:end-call').first()).toBeVisible();
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click({timeout: 5000});
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await waitForStateLogs(capturedLogs, USER_STATES.AVAILABLE);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.AVAILABLE);
      await waitForWrapupReasonLogs(capturedLogs, WRAPUP_REASONS.SALE);
      expect(await getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
      expect(await verifyCallbackLogs(capturedLogs, WRAPUP_REASONS.SALE, USER_STATES.AVAILABLE)).toBe(true);
    });

    test('should ignore incoming email task and wait for RONA popup', async () => {
      await createEmailTask(process.env[`${testManager.projectName}_EMAIL_ENTRY_POINT`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-email').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 50000});
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await expect(incomingTaskDiv).toBeHidden();
      await waitForState(testManager.agent1Page, USER_STATES.RONA);
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.RONA)).toBe(true);
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).toBeVisible();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.RONA);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.AVAILABLE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 10000});
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.EMAIL);
      const endButton = testManager.agent1Page.getByTestId('call-control:end-call').first();
      await endButton.waitFor({state: 'visible', timeout: 7000});
      await endButton.click({timeout: 5000});
      await testManager.agent1Page.waitForTimeout(1000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(2000);
    });

    test('should set agent to Available and verify email task behavior', async () => {
      await createEmailTask(process.env[`${testManager.projectName}_EMAIL_ENTRY_POINT`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-email').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 50000});
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await expect(incomingTaskDiv).toBeHidden();
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).toBeVisible();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.RONA);
      await waitForStateLogs(capturedLogs, USER_STATES.RONA);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.RONA);
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.AVAILABLE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).not.toBeVisible();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 10000});
      await expect(incomingTaskDiv).toBeVisible();
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.EMAIL);
      await testManager.agent1Page.waitForTimeout(1000);
      const endButton = testManager.agent1Page.getByTestId('call-control:end-call').first();
      await endButton.waitFor({state: 'visible', timeout: 12000});
      await endButton.click({timeout: 5000});
      await testManager.agent1Page.waitForTimeout(1000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(2000);
    });

    test('should set agent state to busy after ignoring email task', async () => {
      await createEmailTask(process.env[`${testManager.projectName}_EMAIL_ENTRY_POINT`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-email').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 50000});
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await submitRonaPopup(testManager.agent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.MEETING);
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 5000});
      await expect(incomingTaskDiv).toBeHidden();
      await testManager.agent1Page.waitForTimeout(2000);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 10000});
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.EMAIL);
      await testManager.agent1Page.waitForTimeout(1000);
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click({timeout: 5000});
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
    });

    test.skip('should handle multiple incoming tasks with callback verifications', async () => {
      await changeUserState(testManager.agent1Page, USER_STATES.MEETING);
      await testManager.agent1Page.waitForTimeout(1000);

      await Promise.all([
        createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!),
        createChatTask(testManager.chatPage, process.env[`${testManager.projectName}_CHAT_URL`]!),
        createEmailTask(process.env[`${testManager.projectName}_EMAIL_ENTRY_POINT`]!),
      ]);

      await testManager.agent1Page.waitForTimeout(50000);

      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);

      const incomingCallTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      const incomingChatTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-chat').first();
      const incomingEmailTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-email').first();

      await incomingCallTaskDiv.waitFor({state: 'visible', timeout: 5000});
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .first()
        .waitFor({state: 'visible', timeout: 5000});
      await testManager.agent1Page.waitForTimeout(3000);
      await acceptExtensionCall(testManager.agent1ExtensionPage);
      await testManager.agent1Page.waitForTimeout(3000);
      await incomingChatTaskDiv.waitFor({state: 'visible', timeout: 5000});
      await testManager.agent1Page.waitForTimeout(3000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CHAT);

      await incomingEmailTaskDiv.waitFor({state: 'visible', timeout: 5000});
      await testManager.agent1Page.waitForTimeout(3000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.EMAIL);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await waitForStateLogs(capturedLogs, USER_STATES.ENGAGED);
      expect(await getLastStateFromLogs(capturedLogs)).toBe(USER_STATES.ENGAGED);

      let count = 3;

      while (count > 0) {
        capturedLogs.length = 0;
        await testManager.agent1Page.waitForTimeout(2000);
        const endButton = testManager.agent1Page.getByTestId('call-control:end-call').first();
        const endButtonVisible = await endButton
          .waitFor({state: 'visible', timeout: 2000})
          .then(() => true)
          .catch(() => false);
        if (endButtonVisible) {
          await endButton.click({timeout: 5000});
          await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
        } else {
          const wrapupBox = testManager.agent1Page.getByTestId('wrapup-button').first();
          const isWrapupBoxVisible = await wrapupBox
            .waitFor({state: 'visible', timeout: 2000})
            .then(() => true)
            .catch(() => false);
          if (isWrapupBoxVisible) {
            await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
            await testManager.agent1Page.waitForTimeout(2000);
          } else {
            break;
          }
        }

        await waitForState(testManager.agent1Page, count === 1 ? USER_STATES.AVAILABLE : USER_STATES.ENGAGED);
        await verifyCurrentState(testManager.agent1Page, count === 1 ? USER_STATES.AVAILABLE : USER_STATES.ENGAGED);
        await waitForStateLogs(capturedLogs, count === 1 ? USER_STATES.AVAILABLE : USER_STATES.ENGAGED);
        expect(await getLastStateFromLogs(capturedLogs)).toBe(
          count === 1 ? USER_STATES.AVAILABLE : USER_STATES.ENGAGED
        );
        await waitForWrapupReasonLogs(capturedLogs, WRAPUP_REASONS.SALE);
        expect(await getLastWrapupReasonFromLogs(capturedLogs)).toBe(WRAPUP_REASONS.SALE);
        expect(
          await verifyCallbackLogs(
            capturedLogs,
            WRAPUP_REASONS.SALE,
            count === 1 ? USER_STATES.AVAILABLE : USER_STATES.ENGAGED
          )
        ).toBe(true);
        count--;
      }
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });
  });
}
