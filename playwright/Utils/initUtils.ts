import { Page, expect, BrowserContext } from '@playwright/test';
import dotenv from 'dotenv';
import { BASE_URL } from '../constants';

dotenv.config();

/**
 * Performs login using an access token from environment variables
 * @param page - The Playwright page object
 * @param agentId - Agent identifier to get access token for (e.g., 'AGENT1', 'AGENT2')
 * @description Requires PW_{agentId}_ACCESS_TOKEN environment variable to be set
 * @throws {Error} When PW_{agentId}_ACCESS_TOKEN environment variable is not defined
 * @example
 * ```typescript
 * // Ensure PW_AGENT1_ACCESS_TOKEN is set in .env file
 * await loginViaAccessToken(page, 'AGENT1');
 *
 * // Different agents with their own access tokens
 * await loginViaAccessToken(page, 'AGENT2'); // Uses PW_AGENT2_ACCESS_TOKEN
 * await loginViaAccessToken(page, 'ADMIN');  // Uses PW_ADMIN_ACCESS_TOKEN
 * ```
 */
export const loginViaAccessToken = async (page: Page, agentId: string): Promise<void> => {
  await page.goto(BASE_URL);
  const accessToken = process.env[`PW_${agentId}_ACCESS_TOKEN`];
  await page.getByRole('textbox').click();
  if (!accessToken) {
    throw new Error(`PW_${agentId}_ACCESS_TOKEN is not defined, OAuth failed`);
  }
  await page.getByRole('textbox').fill(accessToken);
};

/**
 * Performs OAuth login with Webex using agent credentials from environment variables
 * @param page - The Playwright page object
 * @param agentId - Agent identifier to validate against environment variables (e.g., 'AGENT1', 'AGENT2')
 * @description Validates credentials against PW_{agentId}_USERNAME and PW_{agentId}_PASSWORD
 * @throws {Error} When agent credentials are not found in environment variables
 * @example
 * ```typescript
 * // OAuth login with agent credentials from environment variables
 * await oauthLogin(page, 'AGENT1'); // validates against PW_AGENT1_USERNAME/PW_AGENT1_PASSWORD
 * await oauthLogin(page, 'AGENT2'); // validates against PW_AGENT2_USERNAME/PW_AGENT2_PASSWORD
 * await oauthLogin(page, 'ADMIN'); // validates against PW_ADMIN_USERNAME/PW_ADMIN_PASSWORD
 * ```
 */
export const oauthLogin = async (page: Page, agentId: string): Promise<void> => {
  // Check 1: Validate agentId parameter is provided
  if (!agentId) {
    throw new Error('Agent ID parameter is required');
  }

  // Check 2: Validate agentId is not empty string
  if (agentId.trim() === '') {
    throw new Error('Agent ID cannot be empty string');
  }

  // Check 3: Get credentials from environment variables
  const username = process.env[`PW_${agentId}_USERNAME`];
  const password = process.env[`PW_PASSWORD`];
  // Check 4: Validate environment variables are set
  if (!username || !password) {
    throw new Error(`Environment variables PW_${agentId}_USERNAME and PW_PASSWORD must be set`);
  }

  await page.goto(BASE_URL);
  await page.locator('#select-base-triggerid').getByText('Access Token').click();
  await page.getByTestId('samples:login_option_oauth').getByText('Login with Webex').click();
  await page.getByTestId('samples:login_with_webex_button').click();
  await page.getByRole('textbox', { name: 'name@example.com' }).fill(username);
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
};

/**
 * Enables all available contact center widgets
 * @param page - The Playwright page object
 * @description Checks all widget checkboxes including station login, user state, tasks, and call controls
 * @example
 * ```typescript
 * await enableAllWidgets(page);
 * await initialiseWidgets(page); // Now all widgets will be available
 * ```
 */
export const enableAllWidgets = async (page: Page): Promise<void> => {
  await page.getByTestId('samples:widget-stationLogin').check();
  await page.getByTestId('samples:widget-userState').check();
  await page.getByTestId('samples:widget-incomingTask').check();
  await page.getByTestId('samples:widget-taskList').check();
  await page.getByTestId('samples:widget-callControl').check();
  await page.getByTestId('samples:widget-callControlCAD').check();
  await page.getByTestId('samples:widget-outdialCall').check();
};

/**
 * Enables multi-login functionality for the SDK
 * @param page - The Playwright page object
 * @description Must be called before SDK initialization to take effect
 * @example
 * ```typescript
 * await enableMultiLogin(page);
 * await initialiseWidgets(page); // Multi-login is now enabled
 * ```
 */
export const enableMultiLogin = async (page: Page): Promise<void> => {
  await page.getByTestId('samples:multi-login-enable-checkbox').check();
};

/**
 * Disables multi-login functionality for the SDK
 * @param page - The Playwright page object
 * @description Must be called before SDK initialization to take effect
 * @example
 * ```typescript
 * await disableMultiLogin(page);
 * await initialiseWidgets(page); // Multi-login is now disabled
 * ```
 */
export const disableMultiLogin = async (page: Page): Promise<void> => {
  await page.getByTestId('samples:multi-login-enable-checkbox').uncheck();
};

/**
 * Initializes the widgets by clicking the init widgets button and waiting for station-login widget to be visible
 * @param page - The Playwright page object
 * @description The station-login widget should be checked/enabled before using this function.
 *              If the widget is not visible after 50 seconds, retries once more with another 50-second timeout.
 * @throws {Error} When station-login widget is not visible after two initialization attempts (100 seconds total)
 * @example
 * ```typescript
 * // Ensure station-login widget is checked first
 * await page.getByTestId('samples:widget-stationLogin').check();
 * await initialiseWidgets(page);
 * ```
 */
export const initialiseWidgets = async (page: Page): Promise<void> => {
  await page.getByTestId('samples:init-widgets-button').click();

  try {
    await page.getByTestId('station-login-widget').waitFor({ state: 'visible', timeout: 30000 });
  } catch (error) {
    // First attempt failed, try clicking init widgets button again
    await page.reload();
    await page.waitForTimeout(2000); // Wait for page to settle
    await page.getByTestId('samples:init-widgets-button').click();

    try {
      await page.getByTestId('station-login-widget').waitFor({ state: 'visible', timeout: 30000 });
    } catch (secondError) {
      // Second attempt also failed, throw error
      throw new Error('Station login widget failed to become visible after two initialization attempts (100 seconds total)');
    }
  }
};

/**
 * Reloads the page and reinitializes widgets to simulate agent relogin
 * @param page - The Playwright page object
 * @description Useful for testing state persistence after page reload
 * @throws {Error} When widget reinitialization fails after reload
 * @example
 * ```typescript
 * // Test state persistence
 * await changeUserState(page, 'Available');
 * await agentRelogin(page); // State should persist after reload
 * ```
 */
// Helper method for agent relogin - simulates user login along with page reload
export const agentRelogin = async (page: Page): Promise<void> => {
  await page.reload();
  await initialiseWidgets(page);
};

/**
 * Creates a new page in the same browser context for multi-login testing
 * @param context - The Playwright browser context
 * @returns Promise<Page> - The new page with widgets initialized
 * @description Useful for testing multi-login scenarios
 * @throws {Error} When widget initialization fails on the new page
 * @example
 * ```typescript
 * const context = await browser.newContext();
 * const primaryPage = await context.newPage();
 * const secondaryPage = await setupMultiLoginPage(context);
 *
 * // Test state synchronization between pages
 * await changeUserState(primaryPage, 'Available');
 * await verifyCurrentState(secondaryPage, 'Available');
 * ```
 */
// Helper method for multisession - creates new page and initializes widgets in same context
export const setupMultiLoginPage = async (context: BrowserContext): Promise<Page> => {
  const multiLoginPage = await context.newPage();
  await multiLoginPage.goto(BASE_URL);
  await initialiseWidgets(multiLoginPage);
  return multiLoginPage;
};
