import {Page, expect} from '@playwright/test';
import {dismissOverlays} from './helperUtils';
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
  type: 'agent' | 'queue' | 'dialNumber' | 'entryPoint',
  action: 'consult' | 'transfer',
  value: string
): Promise<void> {
  // Determine which button to click for consult or transfer
  if (action === 'consult') {
    // Close any backdrops that might intercept clicks
    await dismissOverlays(page);
    await page.getByTestId('call-control:consult').nth(1).click({timeout: AWAIT_TIMEOUT});
  } else {
    await page
      .getByRole('group', {name: 'Call Control with Call'})
      .getByLabel('Transfer Call')
      .click({timeout: AWAIT_TIMEOUT});
  }

  // Popover universal search should be visible (inside popover container)
  const popover = page.locator('.agent-popover-content');
  await expect(popover.locator('#consult-search')).toBeVisible({timeout: FORM_FIELD_TIMEOUT});

  // Navigate to the correct category and perform the action
  const clickCategory = async (name: 'Agents' | 'Queues' | 'Dial Number' | 'Entry Point') => {
    // New UI uses buttons instead of tabs
    const button = popover.getByRole('button', {name});
    await button.click({timeout: AWAIT_TIMEOUT});
    await page.waitForTimeout(200);
  };

  const clickListItemPrimaryButton = async (categoryLabel: string) => {
    // Prefer exact aria-label match within the consult/transfer popover to avoid strict-mode collisions
    const listItem = popover.locator(`[role="listitem"][aria-label="${value}"]`).first();
    await listItem.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
    // Some UIs reveal the action button on hover; hover to ensure visibility
    await listItem.hover();
    await listItem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const primaryButton = listItem.getByRole('button');
    await primaryButton.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
    await primaryButton.scrollIntoViewIfNeeded();
    await primaryButton.evaluate((el) => {
      if (el.hasAttribute('disabled')) {
        throw new Error(`${categoryLabel} button is disabled`);
      }
    });
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        await primaryButton.click({timeout: AWAIT_TIMEOUT, force: true});
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        await page.waitForTimeout(300);
      }
    }
    if (lastError) {
      throw lastError;
    }
    await page
      .locator('.md-popover-backdrop')
      .waitFor({state: 'hidden', timeout: 3000})
      .catch(() => {});
  };

  if (type === 'agent') {
    await clickCategory('Agents');
    await clickListItemPrimaryButton('Agent');
  } else if (type === 'queue') {
    await clickCategory('Queues');
    await clickListItemPrimaryButton('Queue');
  } else if (type === 'dialNumber') {
    await clickCategory('Dial Number');
    // Require a valid name to avoid strict-mode ambiguous matches
    if (!value || value.trim() === '') {
      throw new Error(
        'PW_DIAL_NUMBER_NAME is not set. Please provide the Dial Number list item name (e.g., cypher_pstn).'
      );
    }
    // List-based selection only (no legacy input fallback)
    const search = popover.locator('#consult-search');
    if (value && (await search.isVisible({timeout: 500}).catch(() => false))) {
      await search.fill(value, {timeout: AWAIT_TIMEOUT});
      await page.waitForTimeout(300);
    }
    const listItem = popover.getByRole('listitem', {name: value, exact: true});
    await listItem.waitFor({state: 'visible', timeout: FORM_FIELD_TIMEOUT});
    await clickListItemPrimaryButton('Dial Number');
  } else if (type === 'entryPoint') {
    await clickCategory('Entry Point');
    // Optional: filter via universal search (only if value provided)
    if (value) {
      const search = popover.locator('#consult-search');
      if (await search.isVisible({timeout: 500}).catch(() => false)) {
        await search.fill(value, {timeout: AWAIT_TIMEOUT});
        await page.waitForTimeout(300);
      }
    }
    await clickListItemPrimaryButton('Entry Point');
  }

  // Wait a moment for the action to be processed
  await page.waitForTimeout(2000);
  if (action === 'consult') {
    // Confirm consult UI is present
    await expect(page.getByTestId('cancel-consult-btn')).toBeVisible({timeout: FORM_FIELD_TIMEOUT});
  }
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
