import {Page, expect} from '@playwright/test';
import {ACCEPT_TASK_TIMEOUT, AWAIT_TIMEOUT, UI_SETTLE_TIMEOUT} from '../constants';

/**
 * Enters a phone number into the outdial number input field.
 * Prerequisite: Agent must be logged in and outdial-call-container must be visible.
 * @param page Playwright Page object (agent widget page)
 * @param number Phone number to dial (e.g., +14698041796)
 */
export async function enterOutdialNumber(page: Page, number: string): Promise<void> {
  await page.bringToFront();
  await expect(page.getByTestId('outdial-call-container')).toBeVisible({timeout: AWAIT_TIMEOUT});
  const input = page.getByTestId('outdial-number-input').locator('input');
  await input.fill(number, {timeout: AWAIT_TIMEOUT});
}

/**
 * Clicks the outdial call button to initiate the outbound call.
 * Prerequisite: A valid number must be entered in the outdial input.
 * @param page Playwright Page object (agent widget page)
 */
export async function clickOutdialButton(page: Page): Promise<void> {
  await page.bringToFront();
  const dialButton = page.getByTestId('outdial-call-button');
  await expect(dialButton).toBeEnabled({timeout: AWAIT_TIMEOUT});
  await dialButton.click({timeout: AWAIT_TIMEOUT});
}

/**
 * Accepts an incoming call on the customer's Webex Calling web client.
 * Used for outdial scenarios where the customer receives the outbound call.
 * @param customerPage Playwright Page object (customer's Webex Calling web client)
 */
export async function acceptCustomerCall(customerPage: Page): Promise<void> {
  await customerPage.bringToFront();
  await expect(customerPage.locator('#answer').first()).toBeEnabled({timeout: ACCEPT_TASK_TIMEOUT});
  await customerPage.waitForTimeout(UI_SETTLE_TIMEOUT);
  await customerPage.locator('#answer').first().click({timeout: AWAIT_TIMEOUT});
}

/**
 * Ends the call on the customer's Webex Calling web client.
 * @param customerPage Playwright Page object (customer's Webex Calling web client)
 */
export async function endCustomerCall(customerPage: Page): Promise<void> {
  await customerPage.bringToFront();
  const endBtn = customerPage.locator('#end-call').first();
  await expect(endBtn).toBeEnabled({timeout: AWAIT_TIMEOUT});
  await endBtn.click({timeout: AWAIT_TIMEOUT});
}
