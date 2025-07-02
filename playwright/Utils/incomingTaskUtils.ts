import { Page, expect } from '@playwright/test';
import { CALL_URL, RONA_OPTIONS } from '../constants';
import { TASK_TYPES } from '../constants';
import nodemailer from 'nodemailer';

const maxRetries = 3;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  auth: {
    user: process.env.PW_EMAIL_FROM, // Use environment variable for email
    pass: process.env.PW_APP_PASSWORD
  },
});

/**
 * Utility functions for Playwright incoming task automation.
 * Includes helpers for creating and ending call/chat/email tasks, handling extension calls,
 * and interacting with RONA popups and login flows.
 *
 * @packageDocumentation
 */

/**
 * Creates a call task by dialing the provided number.
 * @param page Playwright Page object
 * @param number Phone number to dial (defaults to PW_DIAL_NUMBER env variable)
 */
export async function createCallTask(page: Page, number: string = process.env.PW_DIAL_NUMBER) {
  if (!number || number.trim() === '') {
    throw new Error('Dial number is required');
  }
  await expect(page.getByRole('textbox', { name: 'Dial' })).toBeVisible({ timeout: 30000 });
  await page.getByRole('textbox', { name: 'Dial' }).fill(number);
  await page.locator('[data-test="calling-ui-keypad-control"]').getByRole('button', { name: 'Call' }).click();
}

/**
 * Ends the current call task.
 * @param page Playwright Page object
 */
export async function endCallTask(page: Page) {
  await expect(page.locator('[data-test="call-end"]')).toBeVisible({ timeout: 30000 });
  await page.locator('[data-test="call-end"]').click();
}

/**
 * Creates a chat task by launching the chat client and submitting required info.
 * Retries up to maxRetries on failure.
 * @param page Playwright Page object
 */
export async function createChatTask(page: Page) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto('https://widgets.webex.com/chat-client');
      await page.locator('iframe[name="Livechat launcher icon"]').contentFrame().getByRole('button', { name: 'Livechat Button - 0 unread' }).waitFor({ state: 'visible', timeout: 80000 });
      await page.locator('iframe[name="Livechat launcher icon"]').contentFrame().getByRole('button', { name: 'Livechat Button - 0 unread' }).click();
      await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Hit Us Up!' }).waitFor({ state: 'visible', timeout: 50000 });
      await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Hit Us Up!' }).click();
      await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Namemust fill field' }).waitFor({ state: 'visible', timeout: 50000 });
      await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Namemust fill field' }).click();
      await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Namemust fill field' }).fill('Playwright Test');
      await expect(page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Submit Name' })).toBeVisible({ timeout: 50000 });
      await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Submit Name' }).click();
      await page.waitForTimeout(200);
      await expect(page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Email*' })).toBeVisible({ timeout: 50000 });
      await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Email*' }).click();
      await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('textbox', { name: 'Email*' }).fill('playwright@test.com');
      await expect(page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Submit Email' })).toBeVisible({ timeout: 50000 });
      await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Submit Email' }).click();
      break;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(`Failed to load chat client after ${maxRetries} attempts: ${error}`);
      }
    }
  }
};

/**
 * Ends the current chat task by navigating the chat UI.
 * @param page Playwright Page object
 */
export async function endChatTask(page: Page) {
  await expect(page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 30000 });
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'Menu' }).click();
  expect(page.locator('iframe[name="Conversation Window"]').contentFrame().getByText('End chat')).toBeVisible({ timeout: 30000 });
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByText('End chat').click();
  expect(page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'End', exact: true })).toBeVisible({ timeout: 30000 });
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'End', exact: true }).click();
  await page.locator('iframe[name="Conversation Window"]').contentFrame().getByRole('button', { name: 'End', exact: true }).click();
  await page.waitForTimeout(2000);
};

/**
 * Sends a test email to trigger an incoming email task.
 * @throws Error if sending fails
 */
export async function createEmailTask() {
  const from = process.env.PW_EMAIL_FROM;
  const to = process.env.PW_EMAIL_TO;
  const subject = 'Playwright Test Email';
  const text = '--This Email is generated due to playwright automation test for incoming Tasks---'

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
 * Accepts an incoming task of the given type (call, chat, email, social).
 * Waits for the accept button to be visible(only for short span, make sure the task is there before you call this method)and clicks it.
 * @param page Playwright Page object
 * @param type Task type (see TASK_TYPES)
 * @throws Error if accept button is not found
 */
export async function acceptIncomingTask(page: Page, type: string) {
  let incomingTaskDiv;
  if (type === TASK_TYPES.CALL) {
    incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();
  } else if (type === TASK_TYPES.CHAT) {
    incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
  } else if (type == TASK_TYPES.EMAIL) {
    incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
  } else if (type === TASK_TYPES.SOCIAL) {
    incomingTaskDiv = page.locator('samples:incoming-task-social').first();
  }
  incomingTaskDiv = incomingTaskDiv.first();
  await incomingTaskDiv.waitFor({ state: 'visible', timeout: 120000 });
  const acceptButton = incomingTaskDiv.getByTestId('task-accept-button').first();
  if (!(await acceptButton.isVisible())) { throw new Error('Accept button not found'); }
  await acceptButton.click();
}

/**
 * Declines an incoming task of the given type (call, chat, email, social).
 * Waits for the decline button to be visible (only for short span, make sure the task is there before you call this method) and clicks it.
 * @param page Playwright Page object
 * @param type Task type (see TASK_TYPES)
 * @throws Error if decline button is not found
 */
export async function declineIncomingTask(page: Page, type: string) {
  let incomingTaskDiv;
  if (type === TASK_TYPES.CALL) {
    incomingTaskDiv = page.getByTestId('samples:incoming-task-telephony').first();

  } else if (type === TASK_TYPES.CHAT) {
    incomingTaskDiv = page.getByTestId('samples:incoming-task-chat').first();
  } else if (type === TASK_TYPES.EMAIL) {
    incomingTaskDiv = page.getByTestId('samples:incoming-task-email').first();
  } else if (type === TASK_TYPES.SOCIAL) {
    incomingTaskDiv = page.locator('samples:incoming-task-social').first();
  }
  incomingTaskDiv = await incomingTaskDiv.first();
  await incomingTaskDiv.waitFor({ state: 'visible', timeout: 120000 });
  const declineButton = await incomingTaskDiv.getByTestId('task-decline-button').first();
  if (!(await declineButton.isVisible())) { throw new Error('Decline button not found'); }
  await declineButton.click();
  await incomingTaskDiv.waitFor({ state: 'hidden', timeout: 60000 });
}

/**
 * Accepts an incoming extension call by clicking the right action button.
 * @param page Playwright Page object
 */
export async function acceptExtensionCall(page: Page) {
  await page.locator('[data-test="right-action-button"]').waitFor({ state: 'visible', timeout: 50000 });
  await page.locator('[data-test="right-action-button"]').click();
}

/**
 * Declines an incoming extension call by clicking the left action button.
 * @param page Playwright Page object
 */
export async function declineExtensionCall(page: Page) {
  await page.locator('[data-test="left-action-button"]').waitFor({ state: 'visible', timeout: 50000 });
  await page.locator('[data-test="left-action-button"]').click();
}

/**
 * Ends an ongoing extension call by clicking the end call button.
 * @param page Playwright Page object
 */
export async function endExtensionCall(page: Page) {
  await page.locator('[data-test="end-call"]').waitFor({ state: 'visible', timeout: 50000 });
  await page.locator('[data-test="end-call"]').click();

}

/**
 * Logs into the extension using the provided email and password.
 * Retries up to maxRetries on failure.
 * @param page Playwright Page object
 * @param email User email
 * @param password User password
 * @throws Error if login fails after maxRetries
 */
export async function loginExtension(page: Page, email: string, password: string) {
  if (!email || !password) {
    throw new Error('Email and password are required for loginExtension');
  }

  if (email.trim() === '' || password.trim() === '') {
    throw new Error('Email and password cannot be empty strings for loginExtension');
  }
  if (!CALL_URL) {
    throw new Error('CALL_URL is not defined. Please check your constants file.');
  }

  for (let i = 0; i < maxRetries; i++) {
    try {

      await page.goto(CALL_URL);
      break;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(`Failed to login via extension after ${maxRetries} attempts: ${error}`);
      }
    }
  }
  await page.getByRole('textbox', { name: 'Email address (required)' }).waitFor({ state: 'visible', timeout: 50000 });
  const isLoginPageVisible = await page.getByRole('textbox', { name: 'Email address (required)' }).isVisible().catch(() => false);
  if (!isLoginPageVisible) {
    await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await page.waitForTimeout(5000);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(page.getByRole('textbox', { name: 'Email address (required)' })).toBeVisible({ timeout: 30000 });
  await page.getByRole('textbox', { name: 'Email address (required)' }).fill(email);
  await page.getByRole('textbox', { name: 'Email address (required)' }).press('Enter');
  await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible({ timeout: 30000 });
  await page.getByRole('textbox', { name: 'Password' }).waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('textbox', { name: 'Dial' }).waitFor({ state: 'visible', timeout: 30000 });
  try {
    await page.locator('[data-test="statusMessage"]').waitFor({ state: 'hidden', timeout: 50000 });
  } catch (e) {
    throw new Error('Phone service is not able to connect. Please check if there are multiple sessions with the same account.');
  }

}

/**
 * Submits the RONA popup by selecting the given state and confirming.
 * @param page Playwright Page object
 * @param select State to select (e.g., 'Available', 'Idle')
 * @throws Error if the RONA state selection is not provided  
 */
export async function submitRonaPopup(page: Page, select: string) {
  if (!select) {
    throw new Error('RONA state selection is required');
  }
  await expect(page.getByTestId('samples:rona-select-state')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('samples:rona-select-state').click();
  await page.waitForTimeout(2000);
  await expect(page.getByTestId(`samples:rona-option-${select.toLowerCase()}`)).toBeVisible({ timeout: 20000 });
  await page.getByTestId(`samples:rona-option-${select.toLowerCase()}`).click();
  await page.waitForTimeout(2000);
  await expect(page.getByTestId('samples:rona-button-confirm')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('samples:rona-button-confirm').click();
  await page.waitForTimeout(2000);
}
