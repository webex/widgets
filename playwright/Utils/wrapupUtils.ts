import {Page, expect} from '@playwright/test';
import {WrapupReason, AWAIT_TIMEOUT} from '../constants';

/**
 * Submits the wrap-up popup for a task in the UI.
 *
 * @param page Playwright Page object
 * @param reason The wrap-up reason to select (string, case-insensitive)
 * @throws Error if the wrap-up reason is not found or not provided
 */
export async function submitWrapup(page: Page, reason: WrapupReason): Promise<void> {
  if (!reason || reason.trim() === '') {
    throw new Error('Wrapup reason is required');
  }
  const wrapupBox = page.getByTestId('call-control:wrapup-button').first();
  const isWrapupBoxVisible = await wrapupBox
    .waitFor({state: 'visible', timeout: AWAIT_TIMEOUT})
    .then(() => true)
    .catch(() => false);
  if (!isWrapupBoxVisible) throw new Error('Wrapup box is not visible');
  await wrapupBox.click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(1000);
  await expect(page.getByTestId('call-control:wrapup-select').first()).toBeVisible();
  await page.getByTestId('call-control:wrapup-select').first().click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(1000);
  const optionLocator = page
    .getByTestId(`call-control:wrapup-reason-${reason.toLowerCase()}`)
    .filter({hasText: reason.toString()});
  try {
    await expect(optionLocator.first()).toBeVisible();
  } catch (error) {
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('call-control:wrapup-select').first()).toBeVisible();
    await page.getByTestId('call-control:wrapup-select').first().click({timeout: AWAIT_TIMEOUT});
  }
  await expect(optionLocator.first()).toBeVisible();
  await optionLocator.first().click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(1000);
  await expect(page.getByTestId(`call-control:wrapup-submit`).first()).toBeVisible();
  await page.getByTestId(`call-control:wrapup-submit`).first().click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(1000);
}
