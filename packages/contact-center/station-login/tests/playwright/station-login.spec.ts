import {test, expect} from '@playwright/test';

test.describe('Station Login', () => {
  let accessToken: string | undefined;
  test.beforeAll(() => {
    accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('ACCESS_TOKEN is not defined in the environment variables');
    }
  });
  test('should login using Extension login option', async ({page}) => {
    await page.goto('http://localhost:3000/');
    await page.getByText('Contact Center widgets in a react app Dark Theme Select Widgets to Show Station').click();
    await page.getByRole('textbox', {name: 'Enter your access token'}).click();
    if (accessToken) await page.getByRole('textbox', {name: 'Enter your access token'}).fill(accessToken);
    await page.getByRole('checkbox', {name: 'Enable Multi Login'}).check();
    await page.getByRole('button', {name: 'Init Widgets'}).click();

    await page.getByTestId('station-login-widget').waitFor({state: 'visible'});

    if (await page.getByTestId('login-button').isVisible()) {
      await expect(page.getByTestId('login-button')).toContainText('Save & Continue');
    } else if (await page.getByTestId('logout-button').isVisible()) {
      await expect(page.getByTestId('logout-button')).toContainText(/Sign out\s*/i);
      await page.getByTestId('logout-button').click();
      await expect(page.getByTestId('login-button')).toContainText(/Save & Continue\s*/i);
    }

    await page.getByTestId('login-option-select').click();
    await page.getByTestId('login-option-Extension').click();
    await page.getByTestId('dial-number-input').getByRole('textbox').fill('1234');

    await expect(page.getByTestId('login-option-select').locator('#select-base-triggerid')).toContainText('Extension');

    await page.getByTestId('login-button').click();

    await page.getByTestId('state-select').click();
    await expect(page.getByTestId('state-select')).toBeVisible();
    await expect(page.getByTestId('state-select').getByTestId('state-name')).toContainText('Meeting');

    await page.getByTestId('state-item-Available').click();
    await expect(page.getByTestId('state-select').getByTestId('state-name')).toContainText('Available');

    await expect(page.getByTestId('logout-button')).toContainText(/Sign out\s*/i);
    await page.getByTestId('logout-button').click();

    await expect(page.getByTestId('login-button')).toContainText(/Save & Continue\s*/i);
  });

  test('should login accross tabs', async ({browser}) => {
    const context = await browser.newContext();

    const page = await context.newPage();
    const page2 = await context.newPage();

    await page.goto('http://localhost:3000/');
    await page2.goto('http://localhost:3000/');
    await page.getByRole('textbox', {name: 'Enter your access token'}).click();
    await page2.getByRole('textbox', {name: 'Enter your access token'}).click();

    await page.getByRole('textbox', {name: 'Enter your access token'}).fill(process.env.ACCESS_TOKEN);
    await page2.getByRole('textbox', {name: 'Enter your access token'}).fill(process.env.ACCESS_TOKEN);

    await page.getByRole('checkbox', {name: 'Enable Multi Login'}).check();
    await page2.getByRole('checkbox', {name: 'Enable Multi Login'}).check();

    await page.getByRole('button', {name: 'Init Widgets'}).click();
    await page2.getByRole('button', {name: 'Init Widgets'}).click();

    await page.getByTestId('station-login-widget').waitFor({state: 'visible'});
    await page2.getByTestId('station-login-widget').waitFor({state: 'visible'});

    if (await page.getByTestId('login-button').isVisible()) {
      await expect(page.getByTestId('login-button')).toContainText('Save & Continue');
    } else if (await page.getByTestId('logout-button').isVisible()) {
      await expect(page.getByTestId('logout-button')).toContainText(/Sign out\s*/i);
      await page.getByTestId('logout-button').click();
      await expect(page.getByTestId('login-button')).toContainText(/Save & Continue\s*/i);
    }

    await page.getByTestId('login-option-select').click();
    await page.getByTestId('login-option-Extension').click();
    await page.getByTestId('dial-number-input').getByRole('textbox').fill('1234');

    await page.getByTestId('login-button').click();

    await expect(page.getByTestId('logout-button')).toContainText(/Sign out\s*/i);

    await expect(page2.getByTestId('state-select').getByTestId('state-name')).toContainText('Meeting');
    await page2.getByTestId('state-select').click();
    await page2.getByTestId('state-item-Available').click();
    await expect(page.getByTestId('state-name')).toContainText('Available');
    await page.getByTestId('logout-button').click();
    await expect(page.getByTestId('login-button')).toContainText(/Save & Continue\s*/i);
  });
});
