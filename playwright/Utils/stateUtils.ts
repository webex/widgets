import { Page,expect } from '@playwright/test';
import dotenv from 'dotenv';
import { 
  MEETING, 
  AVAILABLE, 
  LUNCH, 
  AVAILABLE_ID, 
  MEETING_ID, 
  LUNCH_ID 
} from '../constants';

dotenv.config();


export const changestate = async (page: Page, userState: string): Promise<void> => {

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

export const getCurrentState = async (page: Page): Promise<string> => {
  const stateName = await page.getByTestId('state-select').getByTestId('state-name').innerText();
  return stateName.trim();
};

export const verifyCurrentState = async (page: Page, expectedState: string): Promise<void> => {
  const currentState = await getCurrentState(page);
  if (currentState !== expectedState) {
    throw new Error(`Expected state "${expectedState}" but found "${currentState}".`);
  }
};

export const getStateElapsedTime = async (page: Page): Promise<string> => {
  // Directly select the timer by its test id
  const timerText = await page.getByTestId('elapsed-time').innerText();
  return timerText.trim();
};

export const checkConsole = async (page: Page, state: string, consoleMessages: string[]): Promise<boolean> => {
  // Map auxCodeId to state name using direct constants
  const auxCodeIdMap: Record<string, string> = {
    [AVAILABLE_ID]: AVAILABLE,
    [MEETING_ID]: MEETING,
    [LUNCH_ID]: LUNCH,
  };

  // Find the last "Agent state changed successfully to auxCodeId: ..." log
  let lastAuxLog = null;
  for (let i = consoleMessages.length - 1; i >= 0; i--) {
    const msg = consoleMessages[i];
    const match = msg.match(/Agent state changed successfully to auxCodeId:\s*([a-f0-9-]+|0)/i);
    if (match) {
      lastAuxLog = match[1];
      break;
    }
  }

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


export async function checkCallbackSequence(page: Page, expectedState: string, consoleMessages: string[]): Promise<boolean> {
  let apiSuccessIndex = -1;
  let callbackIndex = -1;

  // Find last index of API success
  for (let i = consoleMessages.length - 1; i >= 0; i--) {
    if (consoleMessages[i].includes('WXCC_SDK_AGENT_STATE_CHANGE_SUCCESS')) {
      apiSuccessIndex = i;
      break;
    }
  }

  // Find last index of onStateChange callback
  for (let i = consoleMessages.length - 1; i >= 0; i--) {
    if (consoleMessages[i].toLowerCase().includes('onstatechange') && consoleMessages[i].toLowerCase().includes('invoked')) {
      callbackIndex = i;
      break;
    }
  }

  // Both must exist and callback must come after API success
  if (apiSuccessIndex === -1) {
    throw new Error('API success message not found in console');
  }
  if (callbackIndex === -1) {
    throw new Error('onStateChange callback not found in console');
  }
  if (callbackIndex <= apiSuccessIndex) {
    throw new Error(`Callback occurred before API success (callback index: ${callbackIndex}, API index: ${apiSuccessIndex})`);
  }

  // Map auxCodeId to state name using direct constants
  const auxCodeIdMap: Record<string, string> = {
    [AVAILABLE_ID]: AVAILABLE,
    [MEETING_ID]: MEETING,
    [LUNCH_ID]: LUNCH,
  };
  let lastAuxId: string | null = null;
  for (let i = consoleMessages.length - 1; i >= 0; i--) {
    const match = consoleMessages[i].match(/Agent state changed successfully to auxCodeId:\s*([a-f0-9-]+|0)/i);
    if (match) {
      lastAuxId = match[1];
      break;
    }
  }
  if (!lastAuxId) {
    throw new Error('No auxCodeId log found in console messages');
  }
  const mappedState = auxCodeIdMap[lastAuxId];
  if (!mappedState) {
    throw new Error(`auxCodeId ${lastAuxId} not mapped to a known state`);
  }
  return mappedState.trim().toLowerCase() === expectedState.trim().toLowerCase();
}

