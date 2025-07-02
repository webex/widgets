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
  await page.waitForTimeout(5000);
  const isWrapupBoxVisible = await wrapupBox.isVisible({ timeout: 30000 }).catch(() => false);
  if (!isWrapupBoxVisible) return;
  await wrapupBox.click();
  await expect(page.getByTestId('wrapup-reason-select').first()).toBeVisible({ timeout: 40000 });
  await page.getByTestId('wrapup-reason-select').first().click();
  await page.waitForTimeout(500); // Allow dropdown animation/render
  const optionLocator = page.getByTestId(`wrapup-reason-${reason.toLowerCase()}`).filter({ hasText: reason.toString() });
  await expect(optionLocator.first()).toBeVisible({ timeout: 40000 });
  await optionLocator.first().click();
  await expect(page.getByTestId(`submit-wrapup-button`).first()).toBeVisible({ timeout: 40000 });
  await page.getByTestId(`submit-wrapup-button`).first().click();
}
