import {Page} from '@playwright/test';
import {AWAIT_TIMEOUT, FORM_FIELD_TIMEOUT} from '../constants';

/**
 * Utility functions for advanced task controls testing.
 * Provides functions for consult operations, transfer operations, and end consult actions.
 * These utilities handle complex multi-agent scenarios and task state transitions.
 *
 * @packageDocumentation
 */

// Array to store captured console logs for verification
let capturedAdvancedLogs: string[] = [];

/**
 * Sets up console logging to capture transfer and consult related callback logs.
 * Captures transfer success, consult start/end success, and related SDK messages.
 * @param page - The agent's main page
 * @returns Function to remove the console handler
 */
export function setupAdvancedConsoleLogging(page: Page): () => void {
  capturedAdvancedLogs.length = 0;

  const consoleHandler = (msg) => {
    const logText = msg.text();
    if (
      logText.includes('WXCC_SDK_TASK_TRANSFER_SUCCESS') ||
      logText.includes('WXCC_SDK_TASK_CONSULT_START_SUCCESS') ||
      logText.includes('WXCC_SDK_TASK_CONSULT_END_SUCCESS') ||
      logText.includes('AgentConsultTransferred') ||
      logText.includes('onEnd invoked') ||
      logText.includes('onTransfer invoked') ||
      logText.includes('onConsult invoked')
    ) {
      capturedAdvancedLogs.push(logText);
    }
  };

  page.on('console', consoleHandler);
  return () => page.off('console', consoleHandler);
}

/**
 * Clears the captured advanced logs array.
 * Should be called before each test or verification to ensure clean state.
 */
export function clearAdvancedCapturedLogs(): void {
  capturedAdvancedLogs.length = 0;
}

/**
 * Verifies that transfer success logs are present.
 * @throws Error if verification fails with detailed error message
 */
export function verifyTransferSuccessLogs(): void {
  const transferLogs = capturedAdvancedLogs.filter((log) => log.includes('WXCC_SDK_TASK_TRANSFER_SUCCESS'));

  if (transferLogs.length === 0) {
    throw new Error(
      `No 'WXCC_SDK_TASK_TRANSFER_SUCCESS' logs found. Captured logs: ${JSON.stringify(capturedAdvancedLogs)}`
    );
  }
}

/**
 * Verifies that consult start success logs are present.
 * @throws Error if verification fails with detailed error message
 */
export function verifyConsultStartSuccessLogs(): void {
  const consultStartLogs = capturedAdvancedLogs.filter((log) => log.includes('WXCC_SDK_TASK_CONSULT_START_SUCCESS'));

  if (consultStartLogs.length === 0) {
    throw new Error(
      `No 'WXCC_SDK_TASK_CONSULT_START_SUCCESS' logs found. Captured logs: ${JSON.stringify(capturedAdvancedLogs)}`
    );
  }
}

/**
 * Verifies that consult end success logs are present.
 * @throws Error if verification fails with detailed error message
 */
export function verifyConsultEndSuccessLogs(): void {
  const consultEndLogs = capturedAdvancedLogs.filter((log) => log.includes('WXCC_SDK_TASK_CONSULT_END_SUCCESS'));

  if (consultEndLogs.length === 0) {
    throw new Error(
      `No 'WXCC_SDK_TASK_CONSULT_END_SUCCESS' logs found. Captured logs: ${JSON.stringify(capturedAdvancedLogs)}`
    );
  }
}

/**
 * Verifies that agent consult transferred logs are present (when consult is converted to transfer).
 * @throws Error if verification fails with detailed error message
 */
export function verifyConsultTransferredLogs(): void {
  const consultTransferredLogs = capturedAdvancedLogs.filter((log) => log.includes('AgentConsultTransferred'));

  if (consultTransferredLogs.length === 0) {
    throw new Error(`No 'AgentConsultTransferred' logs found. Captured logs: ${JSON.stringify(capturedAdvancedLogs)}`);
  }
}

/**
 * Unified function to handle consult and transfer actions for agent, queue, and dial number.
 * @param page - The agent's main page
 * @param type - 'agent' | 'queue' | 'dialNumber'
 * @param action - 'consult' | 'transfer'
 * @param value - agentName, queueName, or phoneNumber
 * @returns Promise<void>
 */
export async function consultOrTransfer(
  page: Page,
  type: 'agent' | 'queue' | 'dialNumber',
  action: 'consult' | 'transfer',
  value: string
): Promise<void> {
  // Determine which button to click for consult or transfer
  if (action === 'consult') {
    await page.getByTestId('call-control:consult').nth(1).click({timeout: AWAIT_TIMEOUT});
  } else {
    await page
      .getByRole('group', {name: 'Call Control with Call'})
      .getByLabel('Transfer Call')
      .click({timeout: AWAIT_TIMEOUT});
  }

  // Navigate to the correct tab and perform the action
  if (type === 'agent' || type === 'queue') {
    const tabName = type === 'agent' ? 'Agents' : 'Queues';
    await page.getByRole('tab', {name: tabName}).click({timeout: AWAIT_TIMEOUT});
    const listItem = page.getByRole('listitem', {name: value, exact: true});
    await listItem.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
    await listItem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const button = listItem.getByRole('button');
    await button.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
    await button.scrollIntoViewIfNeeded();
    await button.evaluate((el) => {
      if (el.hasAttribute('disabled')) {
        throw new Error(`${tabName.slice(0, -1)} button is disabled`);
      }
    });
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        await button.click({timeout: AWAIT_TIMEOUT, force: true});
        lastError = undefined;
        break;
      } catch (e) {
        lastError = e;
        await page.waitForTimeout(400);
      }
    }
    if (lastError) {
      throw lastError;
    }
  } else if (type === 'dialNumber') {
    await page.getByRole('tab', {name: 'Dial Number'}).click({timeout: AWAIT_TIMEOUT});
    const inputLocator = page.getByTestId('consult-transfer-dial-number-input').locator('input');
    await inputLocator.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
    await inputLocator.click({timeout: AWAIT_TIMEOUT});
    await inputLocator.fill(value, {timeout: AWAIT_TIMEOUT});
    await page.getByTestId('dial-number-btn').click({timeout: AWAIT_TIMEOUT});
  }

  // Wait a moment for the action to be processed
  await page.waitForTimeout(2000);
}

/**
 * Cancels an ongoing consult and resumes the original call.
 * @param page - The agent's main page
 * @returns Promise<void>
 */
export async function cancelConsult(page: Page): Promise<void> {
  // Click cancel consult button
  await page.getByTestId('cancel-consult-btn').click({timeout: AWAIT_TIMEOUT});
}
