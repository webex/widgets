import { Page, expect } from '@playwright/test';

/**
 * Submits the wrap-up popup for a task in the UI.
 *
 * @param page Playwright Page object
 * @param reason The wrap-up reason to select (string, case-insensitive)
 * @throws Error if the wrap-up reason is not found or not provided
 */
export async function submitWrapup(page: Page, reason: string): Promise<void> {
  if (!reason || reason.trim() === '') {
    throw new Error('Wrapup reason is required');
  }
  const wrapupBox = page.getByTestId('wrapup-button').first();
  const isWrapupBoxVisible = await wrapupBox.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  if (!isWrapupBoxVisible) throw new Error('Wrapup box is not visible');
  await wrapupBox.click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await expect(page.getByTestId('wrapup-reason-select').first()).toBeVisible();
  await page.getByTestId('wrapup-reason-select').first().click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  const optionLocator = page.getByTestId(`wrapup-reason-${reason.toLowerCase()}`).filter({ hasText: reason.toString() });
  // const optionLocator = page.getByTestId(`wrapup-reason-${reason.toLowerCase()}`).filter({ hasText: new RegExp(`^${reason}$`, 'i') });
  try {
    await expect(optionLocator.first()).toBeVisible();
  } catch (error) {
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('wrapup-reason-select').first()).toBeVisible();
    await page.getByTestId('wrapup-reason-select').first().click({ timeout: 5000 });
  }
  await expect(optionLocator.first()).toBeVisible();
  await optionLocator.first().click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await expect(page.getByTestId(`submit-wrapup-button`).first()).toBeVisible();
  await page.getByTestId(`submit-wrapup-button`).first().click({ timeout: 5000 });
  await page.waitForTimeout(1000);
}
