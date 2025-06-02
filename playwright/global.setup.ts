import {test as setup} from '@playwright/test';
const fs = require('fs');
const path = require('path');

setup('OAuth', async ({browser}) => {
  if (!process.env.PLAYWRIGHT_USERNAME || !process.env.PLAYWRIGHT_PASSWORD) {
    throw new Error('PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD must be set in the environment variables');
  }
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/');

  await page.locator('#select-base-triggerid').getByText('Access Token').click();
  await page.getByTestId('samples:login_option_oauth').click();
  await page.getByRole('button', {name: 'Login with Webex'}).click();

  await page.getByRole('textbox', {name: 'name@example.com'}).click();
  await page.getByRole('textbox', {name: 'name@example.com'}).fill(process.env.PLAYWRIGHT_USERNAME);
  await page.getByRole('link', {name: 'Sign in'}).click();

  await page.getByRole('textbox', {name: 'Password'}).click();
  await page.getByAltText('Password ').fill(process.env.PLAYWRIGHT_PASSWORD);
  await page.getByRole('button', {name: 'Sign in'}).click();

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
