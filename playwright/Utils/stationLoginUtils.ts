import { Page } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Perform desktop login.
 * @param page - The Playwright page object.
 */
export const desktopLogin = async (page: Page): Promise<void> => {
  console.log('Performing Desktop Login...');
  await page.getByTestId('login-option-select').locator('#select-base-triggerid svg').click();
  await page.getByTestId('login-option-Desktop').click();
  await page.getByTestId('teams-select-dropdown').locator('#select-base-triggerid div').click();
  await page.waitForTimeout(200);
  await page.locator('[data-testid^="teams-dropdown-"]').nth(0).locator('span, div').first().click();
  await page.waitForTimeout(200);

  await page.getByTestId('login-button').click();
};

/**
 * Perform extension login.
 * @param page - The Playwright page object.
 */
export const extensionLogin = async (page: Page): Promise<void> => {
  const extensionNumber = process.env.EXTENSION_NUMBER;
  if (!extensionNumber) {
    throw new Error('EXTENSION_NUMBER is not defined in the .env file');
  }

  console.log('Performing Extension Login...');
  await page.getByTestId('login-option-select').locator('#select-base-triggerid svg').click();
  await page.getByTestId('login-option-Extension').click();
  await page.getByTestId('dial-number-input').locator('input').fill(extensionNumber);
  await page.getByTestId('teams-select-dropdown').locator('#select-base-triggerid div').click();
  await page.waitForTimeout(200);
  await page.locator('[data-testid^="teams-dropdown-"]').nth(0).locator('span, div').first().click();
  await page.getByTestId('login-button').click();
};

/**
 * Perform dial login.
 * @param page - The Playwright page object.
 */
export const dialLogin = async (page: Page): Promise<void> => {
  const dialNumber = process.env.DIAL_NUMBER;
  if (!dialNumber) {
    throw new Error('DIAL_NUMBER is not defined in the .env file');
  }

  console.log('Performing Dial Login...');
    await page.getByTestId('login-option-select').locator('#select-base-triggerid svg').click();
  await page.getByTestId('login-option-Dial Number').click();
await page.getByTestId('dial-number-input').locator('div').nth(1).click();
  await page.getByTestId('dial-number-input').locator('input').fill(dialNumber);
  await page.getByTestId('teams-select-dropdown').locator('#select-base-triggerid div').click();
  await page.waitForTimeout(200);
  await page.locator('[data-testid^="teams-dropdown-"]').nth(0).locator('span, div').first().click();
  await page.getByTestId('login-button').click();
};

export const stationLogout = async (page: Page): Promise<void> => {
  //console.log('Logging out...');
  await page.getByTestId('station-logout-button').click();
  await page.waitForTimeout(2000); // Wait for logout to complete
 // console.log('Logged out successfully.');
}
