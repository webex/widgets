import {Page, expect} from '@playwright/test';
import dotenv from 'dotenv';
import {LOGIN_MODE, LONG_WAIT} from '../constants';

dotenv.config();

/**
 * Performs desktop login for contact center agents
 * @param page - The Playwright page object
 * @throws {Error} When login fails or required elements are not found
 * @example
 * ```typescript
 * await desktopLogin(page);
 * ```
 */
export const desktopLogin = async (page: Page): Promise<void> => {
  await page.getByTestId('login-option-select').locator('#select-base-triggerid svg').click({timeout: 10000});
  await page.getByTestId('login-option-Desktop').click({timeout: 10000});
  await page.getByTestId('teams-select-dropdown').locator('#select-base-triggerid div').click({timeout: 10000});
  await page.waitForTimeout(200);
  await page.locator('[data-testid^="teams-dropdown-"]').nth(0).locator('span, div').first().click({timeout: 10000});
  await page.waitForTimeout(200);

  await page.getByTestId('login-button').click({timeout: 10000});
};

/**
 * Performs extension-based login for contact center agents
 * @param page - The Playwright page object
 * @param extensionNumber - Optional extension number. Falls back to PW_EXTENSION_NUMBER env variable
 * @throws {Error} When extension number is not provided or empty
 * @throws {Error} When login fails or required elements are not found
 * @example
 * ```typescript
 * // Using environment variable
 * await extensionLogin(page);
 *
 * // Using custom extension number
 * await extensionLogin(page, "1234");
 * ```
 */
export const extensionLogin = async (page: Page, extensionNumber?: string): Promise<void> => {
  const number = extensionNumber ?? process.env.PW_AGENT1_EXTENSION_NUMBER;
  if (!number) {
    throw new Error('PW_AGENT1_EXTENSION_NUMBER must be provided');
  }

  if (number.trim() === '') {
    throw new Error('Extension number is empty. Please provide a valid extension number.');
  }

  await page.getByTestId('login-option-select').locator('#select-base-triggerid svg').click({timeout: 10000});
  await page.getByTestId('login-option-Extension').click({timeout: 10000});
  await page.getByTestId('dial-number-input').locator('input').fill(number, {timeout: 10000});
  await page.getByTestId('teams-select-dropdown').locator('#select-base-triggerid div').click({timeout: 10000});
  await page.waitForTimeout(200);
  await page.locator('[data-testid^="teams-dropdown-"]').nth(0).locator('span, div').first().click({timeout: 10000});
  await page.getByTestId('login-button').click({timeout: 10000});
};

/**
 * Performs dial number-based login for contact center agents
 * @param page - The Playwright page object
 * @param dialNumber - Optional dial number. Falls back to PW_DIAL_NUMBER env variable
 * @throws {Error} When dial number is not provided or empty
 * @throws {Error} When login fails or required elements are not found
 * @example
 * ```typescript
 * // Using environment variable
 * await dialLogin(page);
 *
 * // Using custom dial number
 * await dialLogin(page, "+1234567890");
 * ```
 */
export const dialLogin = async (page: Page, dialNumber?: string): Promise<void> => {
  const number = dialNumber ?? process.env.PW_DIAL_NUMBER;
  if (!number) {
    throw new Error('PW_DIAL_NUMBER is not defined in the .env file');
  }

  if (number.trim() === '') {
    throw new Error('Dial number is empty. Please provide a valid dial number.');
  }

  await page.getByTestId('login-option-select').locator('#select-base-triggerid svg').click({timeout: 10000});
  await page.getByTestId('login-option-Dial Number').click({timeout: 10000});
  await page.getByTestId('dial-number-input').locator('div').nth(1).click({timeout: 10000});
  await page.getByTestId('dial-number-input').locator('input').fill(number, {timeout: 10000});
  await page.getByTestId('teams-select-dropdown').locator('#select-base-triggerid div').click({timeout: 10000});
  await page.waitForTimeout(200);
  await page.locator('[data-testid^="teams-dropdown-"]').nth(0).locator('span, div').first().click({timeout: 10000});
  await page.getByTestId('login-button').click({timeout: 10000});
};

/**
 * Performs station logout for contact center agents
 * @param page - The Playwright page object
 * @throws {Error} When logout fails or button remains visible after logout
 * @example
 * ```typescript
 * await stationLogout(page);
 * ```
 */
export const stationLogout = async (page: Page): Promise<void> => {
  // Ensure the logout button is visible before clicking
  const logoutButton = page.getByTestId('samples:station-logout-button');
  const isLogoutButtonVisible = await logoutButton.isVisible().catch(() => false);
  if (!isLogoutButtonVisible) {
    throw new Error('Station logout button is not visible. Cannot perform logout.');
  }
  await page.getByTestId('samples:station-logout-button').click({timeout: 10000});
  //check if the station logout button is hidden after logouts
  const isLogoutButtonHidden = await page
    .getByTestId('samples:station-logout-button')
    .waitFor({state: 'hidden', timeout: 30000})
    .then(() => true)
    .catch(() => false);
  if (!isLogoutButtonHidden) {
    throw new Error('Station logout button is still visible after logout');
  }
};

/**
 * Unified telephony login function that supports multiple login modes
 * @param page - The Playwright page object
 * @param mode - The login mode (Desktop, Extension, or Dial Number)
 * @param number - Optional number for Extension or Dial Number modes
 * @throws {Error} When unsupported login mode is provided
 * @throws {Error} When number is required but not provided
 * @example
 * ```typescript
 * // Desktop login
 * await telephonyLogin(page, LOGIN_MODE.DESKTOP);
 *
 * // Extension login with env variable
 * await telephonyLogin(page, LOGIN_MODE.EXTENSION);
 *
 * // Extension login with custom number
 * await telephonyLogin(page, LOGIN_MODE.EXTENSION, "1234");
 *
 * // Dial number login with custom number
 * await telephonyLogin(page, LOGIN_MODE.DIAL_NUMBER, "+1234567890");
 * ```
 */
export const telephonyLogin = async (page: Page, mode: string, number?: string): Promise<void> => {
  if (mode === LOGIN_MODE.DESKTOP) {
    await desktopLogin(page);
  } else if (mode === LOGIN_MODE.EXTENSION) {
    await extensionLogin(page, number);
  } else if (mode === LOGIN_MODE.DIAL_NUMBER) {
    await dialLogin(page, number);
  } else {
    throw new Error(`Unsupported login mode: ${mode}. Use one of: ${Object.values(LOGIN_MODE).join(', ')}`);
  }
};

/**
 * Verifies that the login mode selector displays the expected login mode
 * @param page - The Playwright page object
 * @param expectedMode - The expected login mode text to verify (e.g., 'Dial Number', 'Extension', 'Desktop')
 * @description Checks the login option select element's trigger text to ensure it matches the expected mode
 * @throws {Error} When the login mode doesn't match the expected value
 * @example
 * ```typescript
 * await verifyLoginMode(page, LOGIN_MODE.DIAL_NUMBER);
 * await verifyLoginMode(page, LOGIN_MODE.EXTENSION);
 * await verifyLoginMode(page, LOGIN_MODE.DESKTOP);
 * ```
 */
export async function verifyLoginMode(page: Page, expectedMode: string): Promise<void> {
  await expect(page.getByTestId('login-option-select').locator('#select-base-triggerid')).toContainText(expectedMode, {
    timeout: 10000,
  });
}

/**
 * Ensures the user state widget is visible by checking its current state and logging in if necessary
 * @param page - The Playwright page object
 * @param loginMode - The login mode to use if login is required (from LOGIN_MODE constants)
 * @description Checks if the state-select widget is visible; if not, performs telephony login and waits for it to appear
 * @throws {Error} When telephony login fails or state widget doesn't become visible
 * @example
 * ```typescript
 * await ensureUserStateVisible(page, LOGIN_MODE.DIAL_NUMBER);
 * await ensureUserStateVisible(page, LOGIN_MODE.EXTENSION);
 * await ensureUserStateVisible(page, LOGIN_MODE.DESKTOP);
 * ```
 */
export async function ensureUserStateVisible(page: Page, loginMode: string): Promise<void> {
  const isUserStateWidgetVisible = await page
    .getByTestId('state-select')
    .isVisible()
    .catch(() => false);
  if (!isUserStateWidgetVisible) {
    await telephonyLogin(page, loginMode);
    await expect(page.getByTestId('state-select')).toBeVisible({timeout: LONG_WAIT});
  }
}
