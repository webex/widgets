import {expect, Page} from '@playwright/test';
import {WrapupReason, AWAIT_TIMEOUT, UI_SETTLE_TIMEOUT, WRAPUP_TIMEOUT} from '../constants';

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
  const wrapupBox = page.getByTestId('call-control:wrapup-button');
  const isWrapupBoxVisible = await wrapupBox
    .first()
    .waitFor({state: 'visible', timeout: WRAPUP_TIMEOUT})
    .then(() => true)
    .catch(() => false);
  if (!isWrapupBoxVisible) throw new Error('Wrapup box is not visible');
  await wrapupBox.first().click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(UI_SETTLE_TIMEOUT);
  await expect(page.getByTestId('call-control:wrapup-select').first()).toBeVisible({timeout: AWAIT_TIMEOUT});
  await page.getByTestId('call-control:wrapup-select').first().click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(UI_SETTLE_TIMEOUT);
  const optionLocator = page
    .getByTestId(`call-control:wrapup-reason-${reason.toLowerCase()}`)
    .filter({hasText: reason.toString()});
  try {
    await expect(optionLocator.first()).toBeVisible({timeout: AWAIT_TIMEOUT});
  } catch (error) {
    await page.waitForTimeout(UI_SETTLE_TIMEOUT);
    await expect(page.getByTestId('call-control:wrapup-select').first()).toBeVisible({timeout: AWAIT_TIMEOUT});
    await page.getByTestId('call-control:wrapup-select').first().click({timeout: AWAIT_TIMEOUT});
  }
  await expect(optionLocator.first()).toBeVisible({timeout: AWAIT_TIMEOUT});
  await optionLocator.first().click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(UI_SETTLE_TIMEOUT);
  await expect(page.getByTestId(`call-control:wrapup-submit`).first()).toBeVisible({timeout: AWAIT_TIMEOUT});
  await page.getByTestId(`call-control:wrapup-submit`).first().click({timeout: AWAIT_TIMEOUT});
  await page.waitForTimeout(UI_SETTLE_TIMEOUT);
}
