import { Page, expect } from '@playwright/test';

export async function submitWrapup(page: Page, reason: string = ''): Promise<void> {
  // First, click the "Wrap up" button to open the wrapup dialog
  // const wrapupButton = await page.locator('.call-control-container > .call-control-container > .wrapup-group > button');

  // // Alternative: page.getByRole('button', { name: 'Wrap up' });

  // const wrapupButtonVisible = await wrapupButton.isVisible().catch(() => false);
  // if (wrapupButtonVisible) {
  //   await wrapupButton.click();
  //   // Give dialog time to appear
  // } else {
  //   console.warn('Wrapup box is not visible, skipping wrapup submission.');
  //   return;
  // }
  // await page.waitForTimeout(500);
  // // Now look for the wrapup reason dropdown
  // const wrapupbox = page.getByRole('combobox', { name: 'wrapup-reason Select' });
  // await wrapupbox.click();
  // if (reason) {
  //   await page.getByRole('option', { name: `${reason}` }).click();
  // } else {
  //   await page.getByRole('option', { name: 'Resolved' }).click();
  // }

  // await page.getByRole('button', { name: 'Submit wrap-up' }).click();
  // //add a check for the wrapup box to be hidden
  // await wrapupbox.waitFor({ state: 'hidden' });
  // const wrapupBox = page.getByRole('group', { name: 'Call Control', exact: true }).getByRole('button').first();
  const wrapupBox = page.locator('mdc-button:has-text("Wrap up")').first();
  page.waitForTimeout(200);
  const isWrapupBoxVisible = await wrapupBox.isVisible().catch(() => false);
  if (!isWrapupBoxVisible) return;
  await wrapupBox.click();
  // await page.getByRole('group', { name: 'Call Control CAD' }).getByRole('button').click();
  await page.getByRole('combobox', { name: 'wrapup-reason Select' }).first().click();
  await page.getByRole('option', { name: 'Resolved' }).first().click();
  await page.getByRole('button', { name: 'Submit wrap-up' }).first().click();
}

export async function checkWrapupLogs() {

}

/*
 await page.getByRole('group', { name: 'Call Control CAD' }).getByLabel('End Chat').click();
  await page.locator('.call-control-container > .call-control-container > .wrapup-group').click();
  await page.getByRole('group', { name: 'Call Control CAD' }).getByRole('button').click();
  await page.getByRole('combobox', { name: 'wrapup-reason Select' }).click();
  await page.getByRole('option', { name: 'Resolved' }).click();
  await page.getByRole('button', { name: 'Submit wrap-up' }).click();
   */