import {Page, expect} from '@playwright/test';
import {
  CALL_URL,
  RonaOption,
  AWAIT_TIMEOUT,
  TASK_TYPES,
  TaskType,
  DEFAULT_MAX_RETRIES,
  CHAT_LAUNCHER_TIMEOUT,
  FORM_FIELD_TIMEOUT,
  OPERATION_TIMEOUT,
  NETWORK_OPERATION_TIMEOUT,
  TEST_DATA,
  UI_SETTLE_TIMEOUT,
} from '../constants';
import nodemailer from 'nodemailer';
import {dismissOverlays} from './helperUtils';

const transporter = nodemailer.createTransport({
  service: 'gmail', // Make sure to use Secure Port for Gmail SMTP
  auth: {
    user: process.env.PW_SENDER_EMAIL,
    pass: process.env.PW_SENDER_EMAIL_PASSWORD,
  },
});

/**
 * Utility functions for dealing with creating, ending, and handling tasks in tests
 * Includes helpers for creating and ending call/chat/email tasks, handling extension calls,
 * and interacting with RONA popups and login flows.
 *
 * @packageDocumentation
 */

/**
 * Creates a call task by dialing the provided number, in the webex calling web-client.
 * Prerequisite: The calling webclient must be logged in.
 * @param page Playwright Page object
 * @param number Phone number to dial (defaults to PW_ENTRY_POINT env variable)
 */
export async function createCallTask(page: Page, number: string) {
  await page.bringToFront();
  if (!number || number.trim() === '') {
    throw new Error('Dial number is required');
  }
  try {
    await expect(page).toHaveURL(/.*\.webex\.com\/calling.*/);
  } catch (error) {
    throw new Error('The Input Page should be logged into calling web-client.');
  }

  // Ensure page is foregrounded and clean of overlays
  await page.bringToFront();
  await dismissOverlays(page);

  const endBtn = page.locator('[data-test="call-end"]');
  if (await endBtn.isVisible({timeout: 500}).catch(() => false)) {
    await endBtn.click({timeout: AWAIT_TIMEOUT});
    await page.waitForTimeout(500);
  }

  await page
    .locator('[data-test="statusMessage"]')
    .waitFor({state: 'hidden', timeout: NETWORK_OPERATION_TIMEOUT})
    .catch(() => {});

  await page.getByRole('textbox', {name: 'Dial'}).waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  await page.getByRole('textbox', {name: 'Dial'}).fill(number, {timeout: AWAIT_TIMEOUT});

  const callButton = page.locator('[data-test="calling-ui-keypad-control"]').getByRole('button', {name: 'Call'});
  await expect(callButton).toBeVisible({timeout: AWAIT_TIMEOUT});
  // Ensure button is enabled before clicking
  await callButton.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  await callButton.click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(2000);
}

/**
 * Ends the current ongoing call in webex calling webclient.
 * Prerequisite: The calling webclient must be logged in.
 * @param page Playwright Page object
 */
export async function endCallTask(page: Page) {
  try {
    await expect(page).toHaveURL(/.*\.webex\.com\/calling.*/);
  } catch (error) {
    throw new Error('The Input Page should be logged into calling web-client.');
  }
  await page.locator('[data-test="call-end"]').waitFor({state: 'visible', timeout: 4000});
  await page.locator('[data-test="call-end"]').click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(500);
}

/**
 * Creates a chat task by going to the chat client and submitting required info.
 * Retries up to maxRetries on failure.
 * @param page Playwright Page object
 */
export async function createChatTask(page: Page, chatURL: string) {
  for (let i = 0; i < DEFAULT_MAX_RETRIES; i++) {
    try {
      await page.goto(chatURL);
      await page.waitForTimeout(UI_SETTLE_TIMEOUT);
      await page
        .locator('iframe[name="Livechat launcher icon"]')
        .contentFrame()
        .getByRole('button', {name: 'Livechat Button - 0 unread'})
        .waitFor({state: 'visible', timeout: CHAT_LAUNCHER_TIMEOUT});
      await page
        .locator('iframe[name="Livechat launcher icon"]')
        .contentFrame()
        .getByRole('button', {name: 'Livechat Button - 0 unread'})
        .click({timeout: AWAIT_TIMEOUT});
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('button', {name: 'Hit Us Up!'})
        .waitFor({state: 'visible', timeout: FORM_FIELD_TIMEOUT});
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('button', {name: 'Hit Us Up!'})
        .click({timeout: AWAIT_TIMEOUT});
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('textbox', {name: 'Name'})
        .waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('textbox', {name: 'Name'})
        .click({timeout: AWAIT_TIMEOUT});
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('textbox', {name: 'Name'})
        .fill(TEST_DATA.CHAT_NAME, {timeout: AWAIT_TIMEOUT});
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('textbox', {name: 'Name'})
        .fill(TEST_DATA.CHAT_NAME, {timeout: AWAIT_TIMEOUT});
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('button', {name: 'Submit Name'})
        .waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('button', {name: 'Submit Name'})
        .click({timeout: AWAIT_TIMEOUT});
      await page.waitForTimeout(200);
      await expect(
        page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', {name: 'Email*'})
      ).toBeVisible();
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('textbox', {name: 'Email*'})
        .click({timeout: AWAIT_TIMEOUT});
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('textbox', {name: 'Email*'})
        .fill(TEST_DATA.CHAT_EMAIL, {timeout: AWAIT_TIMEOUT});
      await expect(
        page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', {name: 'Submit Email'})
      ).toBeVisible();
      await page
        .locator('iframe[name="Conversation Window"]')
        .contentFrame()
        .getByRole('button', {name: 'Submit Email'})
        .click({timeout: AWAIT_TIMEOUT});
      break;
    } catch (error) {
      if (i === DEFAULT_MAX_RETRIES - 1) {
        throw new Error(`Failed to load chat client after ${DEFAULT_MAX_RETRIES} attempts: ${error}`);
      }
    }
  }
}

/**
 * Ends the current chat task by navigating the chat UI.
 * The Input page should have the chat client with the chat open.
 * @param page Playwright Page object
 */
export async function endChatTask(page: Page) {
  await expect(
    page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', {name: 'Menu'})
  ).toBeVisible();
  await page
    .locator('iframe[name="Conversation Window"]')
    .contentFrame()
    .getByRole('button', {name: 'Menu'})
    .click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(500);
  await expect(page.locator('iframe[name="Conversation Window"]').contentFrame().getByText('End chat')).toBeVisible({
    timeout: AWAIT_TIMEOUT,
  });
  await page
    .locator('iframe[name="Conversation Window"]')
    .contentFrame()
    .getByText('End chat')
    .click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(500);
  await expect(
    page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', {name: 'End', exact: true})
  ).toBeVisible();
  await page
    .locator('iframe[name="Conversation Window"]')
    .contentFrame()
    .getByRole('button', {name: 'End', exact: true})
    .click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(1000);
}

/**
 * Sends a test email to trigger an incoming email task.
 * @throws Error if sending fails
 */
export async function createEmailTask(to: string) {
  const from = process.env.PW_SENDER_EMAIL;
  const subject = `Playwright Test Email - ${new Date().toISOString()}`;
  const text = TEST_DATA.EMAIL_TEXT;

  try {
    const mailOptions = {
      from,
      to,
      subject,
      text,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error(`Failed to send email: ${error}`);
  }
}

/**
 * Gets the incoming task div locator for a given task type.
 * @param page Playwright Page object
 * @param type Task type (see TASK_TYPES)
 * @returns Locator for the incoming task div
 */
export function getIncomingTaskLocator(page: Page, type: TaskType) {
  if (type === TASK_TYPES.CALL) {
    return page.getByTestId('samples:incoming-task-telephony').first();
  } else if (type === TASK_TYPES.CHAT) {
    return page.getByTestId('samples:incoming-task-chat').first();
  } else if (type === TASK_TYPES.EMAIL) {
    return page.getByTestId('samples:incoming-task-email').first();
  } else if (type === TASK_TYPES.SOCIAL) {
    return page.locator('samples:incoming-task-social').first();
  }
  throw new Error(`Unknown task type: ${type}`);
}

/**
 * Waits for an incoming task of the given type to be visible.
 * Brings the page to front and waits for the task div to appear.
 * @param page Playwright Page object
 * @param type Task type (see TASK_TYPES)
 * @param timeout Optional timeout in ms (default: 40000)
 * @returns Locator for the incoming task div
 */
export async function waitForIncomingTask(page: Page, type: TaskType, timeout: number = 40000) {
  await page.bringToFront();
  const incomingTaskDiv = getIncomingTaskLocator(page, type);
  await incomingTaskDiv.waitFor({state: 'visible', timeout});
  return incomingTaskDiv;
}

/**
 * Accepts an incoming task of the given type (call, chat, email, social).
 * Waits for the task to appear, then clicks the accept button.
 * @param page Playwright Page object
 * @param type Task type (see TASK_TYPES)
 * @param timeout Optional timeout in ms for waiting for task (default: 40000)
 * @throws Error if accept button is not found or if this is an extension call
 */
export async function acceptIncomingTask(page: Page, type: TaskType, timeout: number = 40000) {
  const log = (msg: string) => console.log(`[acceptIncomingTask] ${msg}`);

  log(`Starting - type: ${type}, timeout: ${timeout}`);
  await page.bringToFront();
  log('Page brought to front');

  const incomingTaskDiv = await waitForIncomingTask(page, type, timeout);
  log('Incoming task div found');

  // Check if this is an extension call (only for CALL type)
  if (type === TASK_TYPES.CALL) {
    const taskText = await incomingTaskDiv.innerText();
    log(`Task text: "${taskText.substring(0, 100)}..."`);
    if (taskText.includes(TEST_DATA.EXTENSION_CALL_INDICATOR)) {
      log('ERROR: This is an extension call, throwing error');
      throw new Error('This is an extension call, use acceptExtensionCall instead');
    }
  }

  const acceptButton = incomingTaskDiv.getByTestId('task:accept-button').first();
  log('Looking for accept button');

  const isButtonVisible = await acceptButton.isVisible().catch(() => false);
  log(`Accept button visible: ${isButtonVisible}`);

  await acceptButton.waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  log('Accept button is visible');

  const isButtonEnabled = await acceptButton.isEnabled().catch(() => false);
  log(`Accept button enabled: ${isButtonEnabled}`);

  await expect(acceptButton).toBeEnabled({timeout: AWAIT_TIMEOUT});
  log('Accept button is enabled');

  try {
    await page.waitForTimeout(2000);
    await acceptButton.click({timeout: AWAIT_TIMEOUT});
    log('Accept button clicked successfully');
  } catch (error) {
    log(`Normal click failed: ${error}, retrying with force click`);
    // Retry with force click if normal click fails
    await acceptButton.click({force: true, timeout: AWAIT_TIMEOUT});
    log('Force click succeeded');
  }

  await page.waitForTimeout(2000);

  // Verify the task was actually accepted by checking if incoming task div is gone
  let isStillVisible = await incomingTaskDiv.isVisible().catch(() => false);
  if (isStillVisible) {
    log('WARNING: Incoming task div is still visible after clicking accept - retrying once more');
    // Retry clicking the accept button one more time
    const retryAcceptButton = incomingTaskDiv.getByTestId('task:accept-button').first();
    const isRetryButtonVisible = await retryAcceptButton.isVisible().catch(() => false);
    if (isRetryButtonVisible) {
      await retryAcceptButton.click({force: true, timeout: AWAIT_TIMEOUT});
      log('Retry click on accept button completed');
      await page.waitForTimeout(2000);
      isStillVisible = await incomingTaskDiv.isVisible().catch(() => false);
    }
    if (isStillVisible) {
      log('WARNING: Incoming task div is still visible after retry - task may not have been accepted');
    } else {
      log('SUCCESS: Incoming task div is no longer visible after retry - task accepted');
    }
  } else {
    log('SUCCESS: Incoming task div is no longer visible - task accepted');
  }
}

/**
 * Declines an incoming task of the given type (call, chat, email, social).
 * Expects the incoming task to be already there.
 * @param page Playwright Page object
 * @param type Task type (see TASK_TYPES)
 * @throws Error if decline button is not found
 */
export async function declineIncomingTask(page: Page, type: TaskType) {
  await page.bringToFront();
  let incomingTaskDiv;
  if (type === TASK_TYPES.CALL) {
    incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
    const isExtensionCall = await (await incomingTaskDiv.innerText()).includes(TEST_DATA.EXTENSION_CALL_INDICATOR);
    if (isExtensionCall) {
      throw new Error('This is an extension call, use declineExtensionCall instead');
    }
  } else if (type === TASK_TYPES.CHAT) {
    incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
  } else if (type === TASK_TYPES.EMAIL) {
    incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
  } else if (type === TASK_TYPES.SOCIAL) {
    incomingTaskDiv = page.locator('samples:incoming-task-social').first();
  }
  incomingTaskDiv = await incomingTaskDiv.first();
  await expect(incomingTaskDiv).toBeVisible({timeout: AWAIT_TIMEOUT});
  const declineButton = incomingTaskDiv.getByTestId('task:decline-button').first();
  if (!(await declineButton.isVisible())) {
    throw new Error('Decline button not found');
  }
  await declineButton.click({timeout: AWAIT_TIMEOUT});
  await incomingTaskDiv.waitFor({state: 'hidden', timeout: AWAIT_TIMEOUT});
}

/**
 * Accepts an incoming extension call by clicking the right action button
 * Prerequisite: The calling webclient must be logged in, and an incoming call must be present.
 * @param page Playwright Page object
 */
export async function acceptExtensionCall(page: Page) {
  try {
    await page.bringToFront();
    await expect(page).toHaveURL(/.*\.webex\.com\/calling.*/);
  } catch (error) {
    throw new Error('The Input Page should be logged into calling web-client.');
  }

  // Dismiss any blocking dialog with "Close" button
  const closeButton = page.locator('mdc-button:has-text("Close")').first();
  const closeVisible = await closeButton.isVisible().catch(() => false);
  if (closeVisible) {
    await closeButton.click({timeout: 3000}).catch(() => {});
    await page.waitForTimeout(300);
  }

  await page.locator('[data-test="right-action-button"]').waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(2000);
  await page.locator('[data-test="right-action-button"]').click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(1000);
}

/**
 * Declines an incoming extension call by clicking the left action button.
 * @param page Playwright Page object
 */
export async function declineExtensionCall(page: Page) {
  try {
    await page.bringToFront();
    await expect(page).toHaveURL(/.*\.webex\.com\/calling.*/);
  } catch (error) {
    throw new Error('The Input Page should be logged into calling web-client.');
  }
  await page.locator('[data-test="left-action-button"]').waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  await page.locator('[data-test="left-action-button"]').click({timeout: AWAIT_TIMEOUT});
}

/**
 * Ends an ongoing extension call in the webex calling web-client by clicking the end call button.
 * @param page Playwright Page object
 */
export async function endExtensionCall(page: Page) {
  try {
    await page.bringToFront();
    await expect(page).toHaveURL(/.*\.webex\.com\/calling.*/);
  } catch (error) {
    throw new Error('The Input Page should be logged into calling web-client.');
  }
  await page.locator('[data-test="end-call"]').waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  await page.locator('[data-test="end-call"]').click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(500);
}

/**
 * Logs into the web client for webex calling using the provided email and password.
 * Retries up to maxRetries on failure.
 * @param page Playwright Page object
 * @param email User email
 * @param password User password
 * @throws Error if login fails after maxRetries
 */
export async function loginExtension(page: Page, email: string, password: string) {
  await page.bringToFront();
  if (!email || !password) {
    throw new Error('Email and password are required for loginExtension');
  }

  if (email.trim() === '' || password.trim() === '') {
    throw new Error('Email and password cannot be empty strings for loginExtension');
  }
  if (!CALL_URL) {
    throw new Error('CALL_URL is not defined. Please check your constants file.');
  }

  for (let i = 0; i < DEFAULT_MAX_RETRIES; i++) {
    try {
      await page.goto(CALL_URL);
      break;
    } catch (error) {
      if (i === DEFAULT_MAX_RETRIES - 1) {
        throw new Error(`Failed to login via extension after ${DEFAULT_MAX_RETRIES} attempts: ${error}`);
      }
    }
  }
  const isLoginPageVisible = await page
    .getByRole('textbox', {name: 'Email address (required)'})
    .waitFor({state: 'visible', timeout: OPERATION_TIMEOUT})
    .then(() => true)
    .catch(() => false);
  if (!isLoginPageVisible) {
    await page.bringToFront();
    await expect(page.getByRole('button', {name: 'Back to sign in'})).toBeVisible({timeout: AWAIT_TIMEOUT});
    await page.getByRole('button', {name: 'Back to sign in'}).click({timeout: AWAIT_TIMEOUT});
    await page.getByRole('button', {name: 'Sign in'}).waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
    await page.getByRole('button', {name: 'Sign in'}).click({timeout: AWAIT_TIMEOUT});
  }
  await page
    .getByRole('textbox', {name: 'Email address (required)'})
    .waitFor({state: 'visible', timeout: FORM_FIELD_TIMEOUT});
  await page.getByRole('textbox', {name: 'Email address (required)'}).fill(email, {timeout: AWAIT_TIMEOUT});
  await page.getByRole('textbox', {name: 'Email address (required)'}).press('Enter', {timeout: AWAIT_TIMEOUT});
  await page.getByRole('textbox', {name: 'Password'}).waitFor({state: 'visible', timeout: FORM_FIELD_TIMEOUT});
  await page.getByRole('textbox', {name: 'Password'}).fill(password, {timeout: AWAIT_TIMEOUT});
  await page.getByRole('textbox', {name: 'Password'}).press('Enter', {timeout: AWAIT_TIMEOUT});
  await page.getByRole('textbox', {name: 'Dial'}).waitFor({state: 'visible', timeout: NETWORK_OPERATION_TIMEOUT});
  try {
    await page.locator('[data-test="statusMessage"]').waitFor({state: 'hidden', timeout: NETWORK_OPERATION_TIMEOUT});
  } catch (e) {
    throw new Error('Unable to Login to the webex calling web-client');
  }
}

/**
 * Submits the RONA popup by selecting the given state and confirming.
 * @param page Playwright Page object
 * @param select State to select (e.g., 'Available', 'Idle')
 * @throws Error if the RONA state selection is not provided
 */
export async function submitRonaPopup(page: Page, nextState: RonaOption) {
  if (!nextState) {
    throw new Error('RONA next state selection is required');
  }
  await page.bringToFront();
  await page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(1000);
  await expect(page.getByTestId('samples:rona-select-state')).toBeVisible({timeout: AWAIT_TIMEOUT});
  await page.getByTestId('samples:rona-select-state').click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(1000);
  await expect(page.getByTestId(`samples:rona-option-${nextState.toLowerCase()}`)).toBeVisible({
    timeout: AWAIT_TIMEOUT,
  });
  await page.getByTestId(`samples:rona-option-${nextState.toLowerCase()}`).click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(1000);
  await expect(page.getByTestId('samples:rona-button-confirm')).toBeVisible({timeout: AWAIT_TIMEOUT});
  await page.getByTestId('samples:rona-button-confirm').click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(1000);
}
