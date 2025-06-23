import {test as setup} from '@playwright/test';
import {BASE_URL} from './constants';
const fs = require('fs');
const path = require('path');

setup('OAuth', async ({browser}) => {
  if (!process.env.PW_USERNAME || !process.env.PW_PASSWORD) {
    throw new Error('PW_USERNAME and PW_PASSWORD must be set in the environment variables');
  }
  const page = await browser.newPage();
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

  await page.getByRole('textbox').click();
  const accessToken = await page.getByRole('textbox').inputValue();

  const envPath = path.resolve(__dirname, '../.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    // Remove any existing ACCESS_TOKEN line
    envContent = envContent.replace(/^ACCESS_TOKEN=.*$/m, '');
    // Ensure trailing newline
    if (!envContent.endsWith('\n')) envContent += '\n';
  }
  envContent += `ACCESS_TOKEN=${accessToken}\n`;
  fs.writeFileSync(envPath, envContent, 'utf8');
});
