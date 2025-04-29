import {test, expect} from '@playwright/test';

test.describe('Station Login', () => {
  let accessToken: string | undefined;
  test.beforeAll(() => {
    accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('ACCESS_TOKEN is not defined in the environment variables');
    }
  });
  test('should login using Desktop login option', async ({page}) => {
    test.setTimeout(120_000);
    await page.goto('http://localhost:3000/');
    await page.getByText('Contact Center widgets in a react app Dark Theme Select Widgets to Show Station').click();
    await page.getByRole('textbox', {name: 'Enter your access token'}).click();
    if (accessToken) await page.getByRole('textbox', {name: 'Enter your access token'}).fill(accessToken);
    await page.getByRole('checkbox', {name: 'Enable Multi Login'}).check();
    await page.getByRole('button', {name: 'Init Widgets'}).click();

    await page.getByTestId('login-option-select').click();
    await page.getByTestId('login-option-Desktop').click();

    await expect(page.getByTestId('login-option-select').locator('#select-base-triggerid')).toContainText('Desktop');
    // await expect(page.getByTestId('login-button').locator('span')).toContainText('Save & Continue');

    await page.getByTestId('login-button').click();

    await page.getByTestId('state-select').click();
    await expect(page.getByTestId('state-select')).toBeVisible();
    await expect(page.getByTestId('state-select').getByTestId('state-name')).toContainText('Meeting');

    await page.getByTestId('state-item-Available').click();
    await expect(page.getByTestId('state-select').getByTestId('state-name')).toContainText('Available');

    // await expect(page.getByTestId('logout-button').locator('span')).toContainText('Logout');
    await page.getByTestId('logout-button').click();

    // await expect(page.getByTestId('login-button').locator('span')).toContainText('Save & Continue');
  });

  test('should login accross tabs', async ({browser}) => {
    const context = await browser.newContext();

    const page = await context.newPage();
    const page2 = await context.newPage();

    await page.locator('body').click();
    await page.goto('http://localhost:3000/');
    await page2.goto('http://localhost:3000/');
    await page.getByRole('textbox', {name: 'Enter your access token'}).click();
    await page.getByRole('textbox', {name: 'Enter your access token'}).fill(process.env.ACCESS_TOKEN);
    await page.getByRole('checkbox', {name: 'Enable Multi Login'}).check();
    await page.getByRole('button', {name: 'Init Widgets'}).click();
    await page2.getByRole('textbox', {name: 'Enter your access token'}).click();
    await page2.getByRole('textbox', {name: 'Enter your access token'}).fill(process.env.ACCESS_TOKEN);
    await page2.getByRole('checkbox', {name: 'Enable Multi Login'}).check();
    await page2.getByRole('button', {name: 'Init Widgets'}).click();
    await page.getByTestId('login-option-select').click();
    await page.getByTestId('login-option-Desktop').getByText('Desktop').click();
    await page.getByTestId('login-button').click();

    // await expect(page2.getByTestId('logout-button').locator('span')).toContainText('Logout');
    await expect(page2.getByTestId('state-select').getByTestId('state-name')).toContainText('Meeting');
    await page2.getByTestId('state-select').click();
    await page2.getByTestId('state-item-Available').click();
    await expect(page.getByTestId('state-name')).toContainText('Available');
    await page.getByTestId('logout-button').click();
    // await expect(page2.getByTestId('login-button').locator('span')).toContainText('Save & Continue');
  });
});
