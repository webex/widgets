import { Page,expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();


export const oauthLogin = async (page: Page): Promise<void> => {
    if (!process.env.PLAYWRIGHT_USERNAME || !process.env.PLAYWRIGHT_PASSWORD) {
      throw new Error('PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD must be set in the environment variables');
    }

        await page.goto('http://localhost:3000');
        await page.locator('#select-base-triggerid').getByText('Access Token').click();
        await page.getByTestId('samples:login_option_oauth').getByText('Login with Webex').click();
        await page.getByTestId('login with webex button').click();
        await page.getByRole('textbox', { name: 'name@example.com' }).fill(process.env.PLAYWRIGHT_USERNAME);
        await page.getByRole('link', { name: 'Sign in' }).click();
        await page.waitForTimeout(3000);
        // Check if Init Widgets button is visible after username sign in (Multi session)
        const initWidgetsButton = page.getByTestId('init-widgets-button');
        const isInitWidgetsVisible = await initWidgetsButton.isVisible().catch(() => false);
        
        if (!isInitWidgetsVisible) {
            // If Init Widgets button is not visible, proceed with password entry
        await page.getByRole('textbox', { name: 'Password' }).fill(process.env.PLAYWRIGHT_PASSWORD);
        await page.getByRole('button', { name: 'Sign in' }).click();
        }

        await page.getByTestId('show-agent-profile-checkbox').click();

}

export const multiLoginEnable = async (page: Page): Promise<void> => {
    await page.getByTestId('multi-login-enable-checkbox').click();
}

export const initialisePage = async (page: Page): Promise<void> => {
    //console.log('Initialising widgets...');
 await page.getByTestId('init-widgets-button').click();
 await page.getByTestId('init-widgets-button').click();

 await page.getByTestId('station-login-widget').waitFor({ state: 'visible' });
   //console.log('Widgets initialised successfully!');
};