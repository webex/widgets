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
 * Utility function to get all captured logs for debugging purposes.
 * @returns Array of all captured log messages
 */
export function getAllCapturedLogs(): string[] {
  return [...capturedAdvancedLogs];
}

/**
 * Initiates a consult with another agent via the agents tab.
 * @param page - The agent's main page
 * @param agentName - Name of the agent to consult with (e.g., 'User1 Agent1')
 * @returns Promise<void>
 */
export async function consultViaAgent(page: Page, agentName: string): Promise<void> {
  // Click consult with another agent button
  await page.getByTestId('call-control:consult').nth(1).click({timeout: AWAIT_TIMEOUT});
  // Navigate to Agents tab
  await page.getByRole('tab', {name: 'Agents'}).click({timeout: AWAIT_TIMEOUT});

  //hover over the agent name - use exact match to avoid confusion with similar names
  await page.getByRole('listitem', {name: agentName, exact: true}).hover({timeout: FORM_FIELD_TIMEOUT});

  // Select the specific agent
  await page.getByRole('listitem', {name: agentName, exact: true}).getByRole('button').click({timeout: AWAIT_TIMEOUT});

  // Wait a moment for the consult to be initiated
  await page.waitForTimeout(2000);
}

/**
 * Initiates a consult with a queue via the queues tab.
 * @param page - The agent's main page
 * @param queueName - Name of the queue to consult with (e.g., 'Customer Service Queue')
 * @returns Promise<void>
 */
export async function consultViaQueue(page: Page, queueName: string): Promise<void> {
  // Click consult with another agent button
  await page.getByTestId('call-control:consult').nth(1).click({timeout: AWAIT_TIMEOUT});

  // Navigate to Queues tab
  await page.getByRole('tab', {name: 'Queues'}).click({timeout: AWAIT_TIMEOUT});

  // Find the queue list item and ensure it's visible
  const queueListItem = page.getByRole('listitem', {name: queueName, exact: true});
  await queueListItem.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  await queueListItem.scrollIntoViewIfNeeded();

  // Wait a short time for UI updates/animations after scroll
  await page.waitForTimeout(300);

  // Get the button inside the listitem and click it if visible and enabled
  const queueButton = queueListItem.getByRole('button');
  await queueButton.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  await queueButton.scrollIntoViewIfNeeded();
  // Wait for the button to be enabled (not disabled)
  await queueButton.evaluate((el) => {
    if (el.hasAttribute('disabled')) {
      throw new Error('Queue button is disabled');
    }
  });
  // Retry click up to 3 times, using force: true
  let lastError;
  for (let i = 0; i < 3; i++) {
    try {
      await queueButton.click({timeout: AWAIT_TIMEOUT, force: true});
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

  // Wait a moment for the consult to be initiated
  await page.waitForTimeout(2000);
}

/* Initiates a consult with a dialed number via text input.
 * @param page - The agent's main page
 * @param phoneNumber - Phone number to consult with (e.g., '+1234567890')
 * @returns Promise<void>
 */
export async function consultViaDialNumber(page: Page, phoneNumber: string): Promise<void> {
  // Click consult with another agent button
  await page.getByTestId('call-control:consult').nth(1).click({timeout: AWAIT_TIMEOUT});

  // Navigate to Dial Number tab
  await page.getByRole('tab', {name: 'Dial Number'}).click({timeout: AWAIT_TIMEOUT});

  // Input the phone number robustly: wait for input to be visible and click it directly
  const inputLocator = page.getByTestId('consult-transfer-dial-number-input').locator('input');
  await inputLocator.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  await inputLocator.click({timeout: AWAIT_TIMEOUT});
  await inputLocator.fill(phoneNumber, {timeout: AWAIT_TIMEOUT});

  // Click the dial number button to initiate the consult
  await page.getByTestId('dial-number-btn').click({timeout: AWAIT_TIMEOUT});

  // Wait a moment for the consult to be initiated
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

/**
 * Initiates a transfer via the agents tab (without prior consult).
 * @param page - The agent's main page
 * @param agentName - Name of the agent to transfer to (e.g., 'User1 Agent1')
 * @returns Promise<void>
 */
export async function transferViaAgent(page: Page, agentName: string): Promise<void> {
  // Click transfer call button
  await page
    .getByRole('group', {name: 'Call Control with Call'})
    .getByLabel('Transfer Call')
    .click({timeout: AWAIT_TIMEOUT});

  // Navigate to Agents tab
  await page.getByRole('tab', {name: 'Agents'}).click({timeout: AWAIT_TIMEOUT});

  // Hover over the agent name - use exact match to avoid confusion with similar names
  await page.getByRole('listitem', {name: agentName, exact: true}).hover({timeout: FORM_FIELD_TIMEOUT});

  // Select the specific agent
  await page
    .getByRole('listitem', {name: agentName, exact: true})
    .getByRole('button')
    .click({timeout: FORM_FIELD_TIMEOUT});

  // Wait a moment for the transfer to be processed
  await page.waitForTimeout(2000);
}

/**
 * Initiates a transfer via the queues tab (without prior consult).
 * @param page - The agent's main page
 * @param queueName - Name of the queue to transfer to (e.g., 'Customer Service Queue')
 * @returns Promise<void>
 */
export async function transferViaQueue(page: Page, queueName: string): Promise<void> {
  // Click transfer call button
  await page
    .getByRole('group', {name: 'Call Control with Call'})
    .getByLabel('Transfer Call')
    .click({timeout: AWAIT_TIMEOUT});

  // Navigate to Queues tab
  await page.getByRole('tab', {name: 'Queues'}).click({timeout: AWAIT_TIMEOUT});

  // Hover over the queue name - use exact match to avoid confusion with similar names
  await page.getByRole('listitem', {name: queueName, exact: true}).hover({timeout: AWAIT_TIMEOUT});

  // Select the specific queue
  await page.getByRole('listitem', {name: queueName, exact: true}).getByRole('button').click({timeout: AWAIT_TIMEOUT});

  // Wait a moment for the transfer to be processed
  await page.waitForTimeout(2000);
}

/**
 * Initiates a transfer to a dialed number via text input.
 * @param page - The agent's main page
 * @param phoneNumber - Phone number to transfer the call to (e.g., '+1234567890')
 * @returns Promise<void>
 */
export async function transferViaDialNumber(page: Page, phoneNumber: string): Promise<void> {
  // Click transfer call button
  await page
    .getByRole('group', {name: 'Call Control with Call'})
    .getByLabel('Transfer Call')
    .click({timeout: AWAIT_TIMEOUT});

  // Navigate to Dial Number tab
  await page.getByRole('tab', {name: 'Dial Number'}).click({timeout: AWAIT_TIMEOUT});

  // Input the phone number robustly: wait for input to be visible and click it directly
  const inputLocator = page.getByTestId('consult-transfer-dial-number-input').locator('input');
  await inputLocator.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  await inputLocator.click({timeout: AWAIT_TIMEOUT});
  await inputLocator.fill(phoneNumber, {timeout: AWAIT_TIMEOUT});
  // Click the dial number button to initiate the transfer
  await page.getByTestId('dial-number-btn').click({timeout: AWAIT_TIMEOUT});

  // Wait a moment for the transfer to be processed
  await page.waitForTimeout(2000);
}
