import { Page, expect } from '@playwright/test';

/**
 * Submits the wrap-up popup for a task in the UI.
 *
 * @param page Playwright Page object
 * @param reason The wrap-up reason to select (string, case-insensitive)
 * @throws Error if the wrap-up reason is not found or not provided
 */
export async function submitWrapup(page: Page, reason: String): Promise<void> {
  if (!reason || reason.trim() === '') {
    throw new Error('Wrapup reason is required');
  }
  const wrapupBox = page.getByTestId('wrapup-button').first();
  page.waitForTimeout(200);
  const isWrapupBoxVisible = await wrapupBox.isVisible().catch(() => false);
  if (!isWrapupBoxVisible) return;
  await wrapupBox.click();
  expect(page.getByTestId('wrapup-reason-select')).toBeVisible({ timeout: 5000 });
  await page.getByTestId('wrapup-reason-select').first().click();
  try {
    expect(page.getByTestId(`wrapup-reason-${reason.toLowerCase()}`)).toBeVisible({ timeout: 5000 });
    await page.getByTestId(`wrapup-reason-${reason.toLowerCase()}`).first().click();
  } catch (error) {
    throw new Error(`Wrapup reason "${reason.toLowerCase()}" not found`);
  }
  expect(page.getByTestId(`submit-wrapup-button`)).toBeVisible({ timeout: 5000 });
  await page.getByTestId(`submit-wrapup-button`).first().click();
}
