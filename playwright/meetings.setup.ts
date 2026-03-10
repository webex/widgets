import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { DEVELOPER_WEBEX_URL } from './meetings/constants';

setup('Get Webex Access Token', async ({ page }) => {
  await page.goto(DEVELOPER_WEBEX_URL);
  await page.locator('#header-login-link').click();
  await page.getByRole('textbox', { name: 'name@example.com' }).fill(process.env.PW_MEETING_USERID);
  await page.getByRole('link', { name: 'Sign In' }).click();
  await page.waitForURL(/idbroker.*webex\.com/);
  await page.getByRole('textbox', { name: /^Welcome / }).waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('textbox', { name: /^Welcome / }).fill(process.env.PW_MEETING_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(DEVELOPER_WEBEX_URL);
  await page.locator('.md-avatar').waitFor({ state: 'visible', timeout: 30000 });
  // Grant clipboard permissions via CDP to work around headless Chromium clipboard bug
  // See: https://github.com/microsoft/playwright/issues/29038
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('Browser.grantPermissions', {
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
    origin: DEVELOPER_WEBEX_URL,
  });
  await page.locator('.md-avatar').click();
  await page.locator('#copy-token-modal-button').click();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.waitForTimeout(1000);
  // Read from clipboard directly via CDP-granted permissions
  const accessToken = await page.evaluate(async () => navigator.clipboard.readText());
  const envPath = path.resolve(__dirname, '../.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  const tokenPattern = /^PW_MEETING_ACCESS_TOKEN=.*$/m;
  if (tokenPattern.test(envContent)) {
    envContent = envContent.replace(tokenPattern, `PW_MEETING_ACCESS_TOKEN=${accessToken}`);
  } else {
    if (!envContent.endsWith('\n') && envContent.length > 0) envContent += '\n';
    envContent += `PW_MEETING_ACCESS_TOKEN=${accessToken}\n`;
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
});