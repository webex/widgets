import {Page, expect, BrowserContext} from '@playwright/test';
import dotenv from 'dotenv';
import {BASE_URL} from '../constants';

dotenv.config();

export const oauthLogin = async (page: Page): Promise<void> => {
  if (!process.env.PW_USERNAME || !process.env.PW_PASSWORD) {
    throw new Error('PW_USERNAME and PW_PASSWORD must be set in the environment variables');
  }

  await page.goto(BASE_URL);
  await page.locator('#select-base-triggerid').getByText('Access Token').click();
  await page.getByTestId('samples:login_option_oauth').getByText('Login with Webex').click();
  await page.getByTestId('login with webex button').click();
  await page.getByRole('textbox', {name: 'name@example.com'}).fill(process.env.PW_USERNAME);
  await page.getByRole('link', {name: 'Sign in'}).click();
  // Check if Init Widgets button is visible after username sign in (Multi session)
  const initWidgetsButton = page.getByTestId('init-widgets-button');
  const isInitWidgetsVisible = await initWidgetsButton
    .waitFor({state: 'visible', timeout: 5000})
    .then(() => true)
    .catch(() => false);

  if (!isInitWidgetsVisible) {
    // If Init Widgets button is not visible, proceed with password entry
    await page.getByRole('textbox', {name: 'Password'}).fill(process.env.PW_PASSWORD);
    await page.getByRole('button', {name: 'Sign in'}).click();
  }

  await page.getByTestId('show-agent-profile-checkbox').click();
};

export const enableMultiLogin = async (page: Page): Promise<void> => {
  await page.getByTestId('multi-login-enable-checkbox').click();
};

export const initialiseWidgets = async (page: Page): Promise<void> => {
  await page.getByTestId('init-widgets-button').click();

  await page.getByTestId('station-login-widget').waitFor({state: 'visible'});
};

// Helper method for agent relogin - simulates user login along with page reload
export const agentRelogin = async (page: Page): Promise<void> => {
  await page.reload();
  await initialiseWidgets(page);
};

// Helper method for multisession - creates new page and initializes widgets in same context
export const createMultiSession = async (context: BrowserContext): Promise<Page> => {
  const multiSessionPage = await context.newPage();
  await oauthLogin(multiSessionPage);
  await initialiseWidgets(multiSessionPage);
  return multiSessionPage;
};
