import {Page, expect} from '@playwright/test';
import dotenv from 'dotenv';
import {USER_STATES, AUX_CODE_IDS} from '../constants';

dotenv.config();

/**
 * Changes the user state in the contact center widget
 * @param page - The Playwright page object
 * @param userState - The target user state (e.g., 'Available', 'Meeting', 'Lunch Break')
 * @description Skips the change if already in the target state
 * @throws {Error} When the specified state is not a valid option
 * @example
 * ```typescript
 * await changeUserState(page, USER_STATES.AVAILABLE);
 * await changeUserState(page, 'Meeting');
 * ```
 */
export const changeUserState = async (page: Page, userState: string): Promise<void> => {
  // Get the current state name
  const currentState = await page.getByTestId('state-select').getByTestId('state-name').innerText();
  if (currentState.trim() === userState) {
    return;
  }

  await page.getByTestId('state-select').click();
  const stateItem = page.getByTestId(`state-item-${userState}`);
  const isValidState = await stateItem.isVisible().catch(() => false);

  if (!isValidState) {
    throw new Error(`State "${userState}" is not a valid state option.`);
  }

  await stateItem.click();
};

/**
 * Retrieves the current user state from the widget
 * @param page - The Playwright page object
 * @returns Promise<string> - The current state name (trimmed)
 * @example
 * ```typescript
 * const currentState = await getCurrentState(page);
 * console.log(`Agent is currently: ${currentState}`);
 * ```
 */
export const getCurrentState = async (page: Page): Promise<string> => {
  const stateName = await page.getByTestId('state-select').getByTestId('state-name').innerText();
  return stateName.trim();
};

/**
 * Verifies that the current user state matches the expected state
 * @param page - The Playwright page object
 * @param expectedState - The state that should be currently active
 * @throws {Error} When the current state doesn't match the expected state
 * @example
 * ```typescript
 * await changeUserState(page, USER_STATES.AVAILABLE);
 * await verifyCurrentState(page, USER_STATES.AVAILABLE); // Will pass
 * await verifyCurrentState(page, USER_STATES.MEETING);   // Will throw error
 * ```
 */
export const verifyCurrentState = async (page: Page, expectedState: string): Promise<void> => {
  const currentState = await getCurrentState(page);
  if (currentState !== expectedState) {
    throw new Error(`Expected state "${expectedState}" but found "${currentState}".`);
  }
};

/**
 * Retrieves the elapsed time for the current user state
 * @param page - The Playwright page object
 * @returns Promise<string> - The elapsed time in format "MM:SS" or "MM:SS / MM:SS" for dual timers
 * @description For idle states like 'Lunch Break', returns dual timer format showing both timers
 * @example
 * ```typescript
 * const timer = await getStateElapsedTime(page);
 * console.log(`Time in current state: ${timer}`);
 * // Output: "05:23" or "05:23 / 12:45" for dual timers
 * ```
 */
export const getStateElapsedTime = async (page: Page): Promise<string> => {
  // Directly select the timer by its test id
  const timerText = await page.getByTestId('elapsed-time').innerText();
  return timerText.trim();
};

/**
 * Validates that the console state change matches the expected state by checking auxCodeId logs
 * @param page - The Playwright page object
 * @param state - The expected state name to validate against
 * @param consoleMessages - Array of console messages to search through
 * @returns Promise<boolean> - True if the last auxCodeId log matches the expected state
 * @description Searches for the most recent "Agent state changed successfully" log and maps auxCodeId to state name
 * @throws {Error} When no auxCodeId log is found or auxCodeId is not mapped to a known state
 * @example
 * ```typescript
 * const consoleMessages: string[] = [];
 * page.on('console', (msg) => consoleMessages.push(msg.text()));
 *
 * await changeUserState(page, USER_STATES.AVAILABLE);
 * const isValid = await validateConsoleStateChange(page, USER_STATES.AVAILABLE, consoleMessages);
 * ```
 */
// Validates that the console state change matches the expected state by checking the last auxCodeId log
// and comparing it to the expected state name.
export const validateConsoleStateChange = async (
  page: Page,
  state: string,
  consoleMessages: string[]
): Promise<boolean> => {
  // Map auxCodeId to state name using direct constants
  const auxCodeIdMap: Record<string, string> = {
    [AUX_CODE_IDS.AVAILABLE]: USER_STATES.AVAILABLE,
    [AUX_CODE_IDS.MEETING]: USER_STATES.MEETING,
    [AUX_CODE_IDS.LUNCH]: USER_STATES.LUNCH,
  };

  // Find the last "Agent state changed successfully to auxCodeId: ..." log
  const lastAuxLogMessage = consoleMessages
    .slice()
    .reverse()
    .find((msg) => msg.match(/Agent state changed successfully to auxCodeId:\s*([a-f0-9-]+|0)/i));

  const lastAuxLog = lastAuxLogMessage?.match(/Agent state changed successfully to auxCodeId:\s*([a-f0-9-]+|0)/i)?.[1];

  if (!lastAuxLog) {
    throw new Error('No auxCodeId log found in console messages');
  }

  const mappedState = auxCodeIdMap[lastAuxLog];
  if (!mappedState) {
    throw new Error(`auxCodeId ${lastAuxLog} not mapped to a known state`);
  }

  const expectedState = state.trim().toLowerCase();
  const actualState = mappedState.trim().toLowerCase();
  return expectedState === actualState;
};

/**
 * Validates the correct sequence of API success and callback invocation for state changes
 * @param page - The Playwright page object
 * @param expectedState - The expected state name to validate against
 * @param consoleMessages - Array of console messages to analyze for sequence validation
 * @returns Promise<boolean> - True if callback sequence is correct and state matches
 * @description Ensures that API success occurs before onStateChange callback and validates the final state
 * @throws {Error} When API success message is not found
 * @throws {Error} When onStateChange callback is not found
 * @throws {Error} When callback occurs before API success (incorrect sequence)
 * @throws {Error} When no auxCodeId log is found
 * @throws {Error} When auxCodeId is not mapped to a known state
 * @example
 * ```typescript
 * const consoleMessages: string[] = [];
 * page.on('console', (msg) => consoleMessages.push(msg.text()));
 *
 * await changeUserState(page, USER_STATES.AVAILABLE);
 * const isSequenceValid = await checkCallbackSequence(page, USER_STATES.AVAILABLE, consoleMessages);
 * if (!isSequenceValid) {
 *   throw new Error('Callback sequence validation failed');
 * }
 * ```
 */
export async function checkCallbackSequence(
  page: Page,
  expectedState: string,
  consoleMessages: string[]
): Promise<boolean> {
  let apiSuccessIndex = -1;
  let callbackIndex = -1;

  // Find last index of API success
  apiSuccessIndex = consoleMessages
    .slice()
    .reverse()
    .findIndex((msg) => msg.includes('WXCC_SDK_AGENT_STATE_CHANGE_SUCCESS'));

  // Convert reversed index to original index
  if (apiSuccessIndex !== -1) {
    apiSuccessIndex = consoleMessages.length - 1 - apiSuccessIndex;
  }

  // Find last index of onStateChange callback
  callbackIndex = consoleMessages
    .slice()
    .reverse()
    .findIndex((msg) => msg.toLowerCase().includes('onstatechange') && msg.toLowerCase().includes('invoked'));

  // Convert reversed index to original index
  if (callbackIndex !== -1) {
    callbackIndex = consoleMessages.length - 1 - callbackIndex;
  }

  // Both must exist and callback must come after API success
  if (apiSuccessIndex === -1) {
    throw new Error('API success message not found in console');
  }
  if (callbackIndex === -1) {
    throw new Error('onStateChange callback not found in console');
  }
  if (callbackIndex <= apiSuccessIndex) {
    throw new Error(
      `Callback occurred before API success (callback index: ${callbackIndex}, API index: ${apiSuccessIndex})`
    );
  }

  // Map auxCodeId to state name using direct constants
  const auxCodeIdMap: Record<string, string> = {
    [AUX_CODE_IDS.AVAILABLE]: USER_STATES.AVAILABLE,
    [AUX_CODE_IDS.MEETING]: USER_STATES.MEETING,
    [AUX_CODE_IDS.LUNCH]: USER_STATES.LUNCH,
  };
  let lastAuxId: string | null = null;
  const lastAuxMessage = consoleMessages
    .slice()
    .reverse()
    .find((msg) => msg.match(/Agent state changed successfully to auxCodeId:\s*([a-f0-9-]+|0)/i));

  lastAuxId = lastAuxMessage?.match(/Agent state changed successfully to auxCodeId:\s*([a-f0-9-]+|0)/i)?.[1] || null;
  if (!lastAuxId) {
    throw new Error('No auxCodeId log found in console messages');
  }
  const mappedState = auxCodeIdMap[lastAuxId];
  if (!mappedState) {
    throw new Error(`auxCodeId ${lastAuxId} not mapped to a known state`);
  }
  return mappedState.trim().toLowerCase() === expectedState.trim().toLowerCase();
}
