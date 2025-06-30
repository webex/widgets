import { test, Page, expect, BrowserContext } from '@playwright/test';
import { loginViaAccessToken, disableMultiLogin, oauthLogin, enableAllWidgets, initialiseWidgets, enableMultiLogin } from './Utils/initUtils';
import { telephonyLogin, desktopLogin, extensionLogin, stationLogout } from './Utils/stationLoginUtils';
import { changeUserState, getCurrentState, verifyCurrentState } from './Utils/userStateUtils';
import { createCallTask, createChatTask, declineExtensionCall, declineIncomingTask, endCallTask, endChatTask, loginExtension, acceptIncomingTask, acceptExtensionCall, createEmailTask, endExtensionCall, submitRonaPopup } from './Utils/incomingTaskUtils';
import { BASE_URL, TASK_TYPES, USER_STATES, LOGIN_MODE, THEME_COLORS } from './constants';
import { submitWrapup } from './Utils/wrapupUtils';


let page: Page;
let context: BrowserContext;
let callerpage: Page;
let extensionPage: Page;
let context2: BrowserContext;
let chatPage: Page;
let page2: Page;
let consoleMessages: string[] = [];
const maxRetries = 3;


//set RONA timeout for 18 seconds

//maybe move this to a separate file
export const handleStrayTasks = async (page: Page): Promise<void> => {
  const incomingTaskDiv = page.locator('div.incoming-task');
  const tasks = await incomingTaskDiv.all();
  for (let task of tasks) {
    const acceptButton = task.getByRole('button', { name: 'Accept' });
    if (!await acceptButton.isVisible()) {
      await acceptExtensionCall(page);
    } else {
      await acceptButton.click();
    }
    const endButton = page.getByRole('group', { name: 'Call Control CAD' }).getByLabel(/^End/);
    await endButton.click();
    await submitWrapup(page);
    page.waitForTimeout(1000);

    let ronapopupVisible = await page.getByTestId('samples:rona-popup').isVisible().catch(() => false);
    if (ronapopupVisible) {
      await submitRonaPopup(page, 'Available');
    }

  }

}

test.describe('Incoming Call Task Tests for Desktop Mode', async () => {

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    context2 = await browser.newContext();
    // callerpage = await context2.newPage();
    page = await context.newPage();
    // extensionPage = await context.newPage();
    callerpage = await context2.newPage();

    await Promise.all([
      (async () => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(callerpage, process.env.PW_AGENT2_USERNAME, process.env.PW_AGENT2_PASSWORD);
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }
      })(),
      (async () => {
        await loginViaAccessToken(page, 'AGENT1');
        await enableAllWidgets(page);
        await disableMultiLogin(page);

        for (let i = 0; i < maxRetries; i++) {
          try {
            await initialiseWidgets(page);
            await page.getByTestId('station-login-widget').waitFor({ state: 'visible' });
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to initialise widgets after ${maxRetries} attempts: ${error}`);
            }
          }
        }



        const loginButtonExists = await page
          .getByTestId('login-button')
          .isVisible()
          .catch(() => false);
        if (loginButtonExists) {
          await telephonyLogin(page, LOGIN_MODE.DESKTOP);
        } else {
          await stationLogout(page);
          await telephonyLogin(page, LOGIN_MODE.DESKTOP);
        }

        for (let i = 0; i < maxRetries; i++) {
          const stationLoginFailure = await page.getByTestId('station-login-failure-label').isVisible().catch(() => false);
          if (!stationLoginFailure) break;
          await telephonyLogin(page, LOGIN_MODE.DESKTOP);
          if (i == maxRetries - 1) {
            throw new Error(`Station Login Error Persists after ${maxRetries} attempts`);
          }
        }

        await expect(page.getByTestId('state-select')).toBeVisible();
        await page.waitForTimeout(1000);

        let ronapopupVisible = await page.getByTestId('samples:rona-popup').isVisible().catch(() => false);
        if (ronapopupVisible) {
          await submitRonaPopup(page, 'Available');
        }

        const endButton = page.getByRole('group', { name: 'Call Control CAD' }).getByLabel(/^End/);
        const endButtonVisible = await endButton.isVisible().catch(() => false);
        if (endButtonVisible) {
          await endButton.click();
          await submitWrapup(page);
        }

        const wrapupBox = page.locator('mdc-button:has-text("Wrap up")');
        const wrapupBoxVisible = await wrapupBox.isVisible().catch(() => false);
        if (wrapupBoxVisible) {
          await submitWrapup(page);
        }
        await changeUserState(page, USER_STATES.AVAILABLE);
        //add a check if there is some button for wrapup then do wrapup

        const incomingTaskDiv = page.locator('div.incoming-task');
        const incomingTaskVisible = await incomingTaskDiv.isVisible().catch(() => false);
        if (incomingTaskVisible) {
          await handleStrayTasks(page);
        }

      })(),
    ])
  })
  //done till here

  test('should accept incoming call, end call and complete wrapup in desktop mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await page.waitForTimeout(3000);
    await acceptIncomingTask(page, TASK_TYPES.CALL);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);
    //verify state color, callbacks for task acceptance
    //throw proper error 

    await page.getByRole('group', { name: 'Call Control CAD' }).getByLabel('End Call').click();
    //verify callbacks for end
    //verify state color as well
    //verify state change callbacks as well
    //throw proper error
    await page.waitForTimeout(4000);
    await submitWrapup(page);
    //verify the wrapup callbacks, stateChange callbacks as well
    //   Notice that the state changes from Engaged back to Available only after Wrapup
    // onStateChange call back should be called with the Available idle code
    // onWrapUp call back should be called with currentTask data and wrapUpReason

  });

  test('should decline incoming call and verify RONA state in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(1000);
    await createCallTask(callerpage);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await verifyCurrentState(page, USER_STATES.RONA);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.RONA);
    await endCallTask(callerpage);
    await submitRonaPopup(page, 'Idle');
  });

  test('should ignore incoming call and wait for RONA popup in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(1000);
    await createCallTask(callerpage);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, 'Available');
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(500);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await endCallTask(callerpage);
    await submitRonaPopup(page, 'Idle');
  });

  test('should set agent state to Available and receive another call in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(1000);
    await createCallTask(callerpage);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, 'Available');
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(500);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await expect(incomingTaskDiv).toBeVisible();
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await endCallTask(callerpage);
    await submitRonaPopup(page, 'Idle');
  });



  test('should set agent state to busy after declining call in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(1000);
    await createCallTask(callerpage);
    await declineIncomingTask(page, TASK_TYPES.CALL);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, 'Idle');
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(500);
    await verifyCurrentState(page, USER_STATES.MEETING);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await expect(incomingTaskDiv).toBeHidden();
    await endCallTask(callerpage);
  });

  //case for desktop mode for accept, end & wrapup

  test('should handle customer disconnect before agent answers in desktop mode', async () => {
    await changeUserState(page, USER_STATES.AVAILABLE);
    await createCallTask(callerpage);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await endCallTask(callerpage);
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await expect(incomingTaskDiv).toBeHidden();
    await verifyCurrentState(page, USER_STATES.AVAILABLE);

  });

  test.afterAll(async () => {
    await context.close();
    await context2.close();
  })

});



test.describe('Incoming Task Tests in Extension Mode', async () => {

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    context2 = await browser.newContext();
    page = await context.newPage();
    chatPage = await context.newPage();
    extensionPage = await context.newPage();
    callerpage = await context2.newPage();

    await Promise.all([
      (async () => {

        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(callerpage, process.env.PW_AGENT2_USERNAME, process.env.PW_AGENT2_PASSWORD);
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }


      })(),
      (async () => {
        await loginViaAccessToken(page, 'AGENT1');
        await enableMultiLogin(page);
        await enableAllWidgets(page);
        for (let i = 0; i < maxRetries; i++) {
          try {
            await initialiseWidgets(page);
            await page.getByTestId('station-login-widget').waitFor({ state: 'visible' });
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to initialise widgets after ${maxRetries} attempts: ${error}`);
            }
          }
        }

        const loginButtonExists = await page
          .getByTestId('login-button')
          .isVisible()
          .catch(() => false);
        if (loginButtonExists) {
          await telephonyLogin(page, LOGIN_MODE.EXTENSION);
        } else {
          await stationLogout(page);
          await telephonyLogin(page, LOGIN_MODE.EXTENSION);
        }

        for (let i = 0; i < maxRetries; i++) {
          const stationLoginFailure = await page.getByTestId('station-login-failure-label').isVisible().catch(() => false);
          if (!stationLoginFailure) break;
          await telephonyLogin(page, LOGIN_MODE.EXTENSION);
          if (i == maxRetries - 1) {
            throw new Error(`Station Login Error Persists after ${maxRetries} attempts`);
          }
        }

        await expect(page.getByTestId('state-select')).toBeVisible();

        let ronapopupVisible = await page.getByTestId('samples:rona-popup').isVisible().catch(() => false);
        if (ronapopupVisible) {
          await submitRonaPopup(page, 'Available');
        }
        const endButton = page.getByRole('group', { name: 'Call Control CAD' }).getByLabel(/^End/);
        const endButtonVisible = await endButton.isVisible().catch(() => false);
        if (endButtonVisible) {
          await endButton.click();
          await submitWrapup(page);
        }

        const wrapupBox = page.locator('mdc-button:has-text("Wrap up")');
        const wrapupBoxVisible = await wrapupBox.isVisible().catch(() => false);
        if (wrapupBoxVisible) {
          await submitWrapup(page);
        }
        await changeUserState(page, USER_STATES.AVAILABLE);

        const incomingTaskDiv = page.locator('div.incoming-task');
        const incomingTaskVisible = await incomingTaskDiv.isVisible().catch(() => false);
        if (incomingTaskVisible) {
          await handleStrayTasks(page);
        }

      })(),
      (async () => {

        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(extensionPage, process.env.PW_AGENT1_USERNAME, process.env.PW_AGENT1_PASSWORD);
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }
      })()
    ])
  })

  //extension mode in different block
  test('should accept incoming call, end call and complete wrapup in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible' });
    await page.waitForTimeout(5000);
    await acceptExtensionCall(extensionPage);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);
    //verify state color, callbacks for task acceptance
    //throw proper error 
    // await endExtensionCall(extensionPage);

    await page.getByRole('group', { name: 'Call Control CAD' }).getByLabel('End Call').click();
    //verify callbacks for end
    //verify state color as well
    //verify state change callbacks as well
    //throw proper error
    await page.waitForTimeout(4000);
    await submitWrapup(page);
    await page.waitForTimeout(5000);
    //verify the wrapup callbacks, stateChange callbacks as well
    //   Notice that the state changes from Engaged back to Available only after Wrapup
    // onStateChange call back should be called with the Available idle code
    // onWrapUp call back should be called with currentTask data and wrapUpReason

  });


  test('should decline incoming call and verify RONA state in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible' });
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'hidden' });
    await page.waitForTimeout(2000);
    await verifyCurrentState(page, USER_STATES.RONA);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.RONA);
    await endCallTask(callerpage);
    await submitRonaPopup(page, 'Idle');
    await page.waitForTimeout(5000);
  });

  test('should ignore incoming call and wait for RONA popup in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible' });
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'hidden' });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    await endCallTask(callerpage);
    await submitRonaPopup(page, 'Idle');
    await page.waitForTimeout(5000);
  });


  test('should set agent state to Available and receive another call in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible' });
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, 'Available');
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(500);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({
      state: 'visible'
    });
    await endCallTask(callerpage);
    await page.waitForTimeout(5000);
  });


  test('should set agent state to busy after declining call in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible' });
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, 'Idle');
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await page.waitForTimeout(500);
    await expect(incomingTaskDiv).toBeHidden();
    await expect(extensionPage.locator('[data-test="generic-person-item-base"]')).toBeHidden();
    await verifyCurrentState(page, USER_STATES.MEETING);
    await endCallTask(callerpage);
    await page.waitForTimeout(5000);
  });



  test('should handle customer disconnect before agent answers in extension mode', async () => {
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await endCallTask(callerpage);
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await expect(incomingTaskDiv).toBeHidden();
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(5000);
  });


  test('should ignore incoming chat task and wait for RONA popup', async () => {

    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="chat-filled"]')
    });
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.RONA);
    await submitRonaPopup(page, 'Idle');
    await endChatTask(chatPage);
  });

  test('should set agent to Available and verify chat task behavior', async () => {
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="chat-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, 'Available');
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await expect(incomingTaskDiv).toBeVisible();
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await submitRonaPopup(page, 'Idle');
    await endChatTask(chatPage);
    await page.waitForTimeout(5000);
  });

  test('should set agent state to busy after ignoring chat task', async () => {
    await createChatTask(chatPage);
    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="chat-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, 'Idle');
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await verifyCurrentState(page, USER_STATES.MEETING);
    await endChatTask(chatPage);
    await page.waitForTimeout(5000);
  });

  test('should accept incoming chat, end chat and complete wrapup with callback verification', async () => {
    await page.waitForTimeout(3000);
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="chat-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await acceptIncomingTask(page, TASK_TYPES.CHAT);
    await page.waitForTimeout(3000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);
    //add console checks, color check for chat task acceptance
    //verify state color
    await page.getByRole('group', { name: 'Call Control CAD' }).getByLabel('End Chat').click();
    //veify callbacks for end
    //verify state color as well
    //verify state change callbacks as well
    await page.waitForTimeout(3000);
    await submitWrapup(page);
    await page.waitForTimeout(5000);
    //verify the wrapup callbacks, stateChange callbacks as well
    //   Notice that the state changes from Engaged back to Available only after Wrapups
  });

  test('should handle chat disconnect before agent answers', async () => {
    await page.waitForTimeout(3000);
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="chat-filled"]')
    }).first();
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await endChatTask(chatPage);
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(5000);
  })

  test('should ignore incoming email task and wait for RONA popup', async () => {
    await page.waitForTimeout(3000);
    await createEmailTask();
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="email-filled"]')
    }).first();
    const emailTaskExists = await incomingTaskDiv.waitFor({ state: 'visible' }).then(() => true).catch(() => false);
    if (!emailTaskExists) {
      await createEmailTask();
      await incomingTaskDiv.waitFor({ state: 'visible' });
    }
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.RONA);
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, 'Idle');
  })

  test('should set agent to Available and verify email task behavior', async () => {
    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="email-filled"]')
    }).first();
    await page.waitForTimeout(3000);
    const emailTaskExists = await incomingTaskDiv.waitFor({ state: 'visible' }).then(() => true).catch(() => false);
    if (!emailTaskExists) {
      await createEmailTask();
      await incomingTaskDiv.waitFor({ state: 'visible' });
    }
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await expect(incomingTaskDiv).toBeHidden();
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await expect(page.getByTestId('samples:rona-popup')).toBeVisible();
    await verifyCurrentState(page, USER_STATES.RONA);
    await submitRonaPopup(page, 'Available');
    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await expect(incomingTaskDiv).toBeVisible();
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await submitRonaPopup(page, 'Idle');
  })


  test('should set agent state to busy after ignoring email task', async () => {
    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="email-filled"]')
    }).first();
    await page.waitForTimeout(3000);
    const emailTaskExists = await incomingTaskDiv.waitFor({ state: 'visible' }).then(() => true).catch(() => false);
    if (!emailTaskExists) {
      await createEmailTask();
      await incomingTaskDiv.waitFor({ state: 'visible' });
    }
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await submitRonaPopup(page, 'Idle');
    await verifyCurrentState(page, USER_STATES.MEETING);
  })

  test('should accept incoming email task, end email and complete wrapup with callback verification', async () => {
    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="email-filled"]')
    }).first();
    await page.waitForTimeout(3000);
    const emailTaskExists = await incomingTaskDiv.waitFor({ state: 'visible' }).then(() => true).catch(() => false);
    if (!emailTaskExists) {
      await createEmailTask();
      await incomingTaskDiv.waitFor({ state: 'visible' });
    }
    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await page.waitForTimeout(2000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);
    //add console checks, color check, verify state color
    await page.getByRole('group', { name: 'Call Control CAD' }).getByLabel('End Email').click();
    //verify callbacks for end, verify state color as well, verify state change callbacks as well
    await page.waitForTimeout(3000);
    await submitWrapup(page);
    //verify callbacks, verify state color as well, order of the logs as well
    //   Notice that the state changes from Engaged back to Available only after Wrapup
    // onStateChange call back should be called with the Available idle code
    // onWrapUp call back should be called with currentTask data and wrapUpReason
  })

  test.afterAll(async () => {
    await context.close();
    await context2.close()
  })

});

//multi-session one in different blocks, with page2 intialization as well.

test.describe('Multi-session Incoming Task Tests', async () => {


  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    context2 = await browser.newContext();
    page = await context.newPage();
    page2 = await context2.newPage();
    chatPage = await context.newPage();
    extensionPage = await context.newPage();
    callerpage = await context2.newPage();

    await Promise.all([
      (async () => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(callerpage, process.env.PW_AGENT2_USERNAME, process.env.PW_AGENT2_PASSWORD);
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }

      })(),
      (async () => {
        await loginViaAccessToken(page, 'AGENT1');
        await enableMultiLogin(page);
        await enableAllWidgets(page);
        for (let i = 0; i < maxRetries; i++) {
          try {
            await initialiseWidgets(page);
            await page.getByTestId('station-login-widget').waitFor({ state: 'visible' });
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to initialise widgets after ${maxRetries} attempts: ${error}`);
            }
          }
        }

        const loginButtonExists = await page
          .getByTestId('login-button')
          .isVisible()
          .catch(() => false);
        if (loginButtonExists) {
          await telephonyLogin(page, LOGIN_MODE.EXTENSION);
        } else {
          await stationLogout(page);
          await telephonyLogin(page, LOGIN_MODE.EXTENSION);
        }

        for (let i = 0; i < maxRetries; i++) {
          const stationLoginFailure = await page.getByTestId('station-login-failure-label').isVisible().catch(() => false);
          if (!stationLoginFailure) break;
          await telephonyLogin(page, LOGIN_MODE.EXTENSION);
          if (i == maxRetries - 1) {
            throw new Error(`Station Login Error Persists after ${maxRetries} attempts`);
          }
        }

        await expect(page.getByTestId('state-select')).toBeVisible();

        let ronapopupVisible = await page.getByTestId('samples:rona-popup').isVisible().catch(() => false);
        if (ronapopupVisible) {
          await submitRonaPopup(page, 'Available');
        }

        const endButton = page.getByRole('group', { name: 'Call Control CAD' }).getByLabel(/^End/);
        const endButtonVisible = await endButton.isVisible().catch(() => false);
        if (endButtonVisible) {
          await endButton.click();
          await submitWrapup(page);
        }

        const wrapupBox = page.locator('mdc-button:has-text("Wrap up")');
        const wrapupBoxVisible = await wrapupBox.isVisible().catch(() => false);
        if (wrapupBoxVisible) {
          await submitWrapup(page);
        }
        await changeUserState(page, USER_STATES.AVAILABLE);

        const incomingTaskDiv = page.locator('div.incoming-task');
        const incomingTaskVisible = await incomingTaskDiv.isVisible().catch(() => false);
        if (incomingTaskVisible) {
          await handleStrayTasks(page);
        }

      })(),
      (async () => {
        await loginViaAccessToken(page2, 'AGENT1');
        await enableMultiLogin(page2);
        await enableAllWidgets(page2);

        for (let i = 0; i < maxRetries; i++) {
          try {
            await initialiseWidgets(page2);
            await page2.getByTestId('station-login-widget').waitFor({ state: 'visible' });
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to initialise widgets after ${maxRetries} attempts: ${error}`);
            }
          }
        }

        const loginButtonExists = await page2
          .getByTestId('login-button')
          .isVisible()
          .catch(() => false);
        if (loginButtonExists) {
          await telephonyLogin(page2, LOGIN_MODE.EXTENSION);
        } else {
          await stationLogout(page2);
          await telephonyLogin(page2, LOGIN_MODE.EXTENSION);
        }

        for (let i = 0; i < maxRetries; i++) {
          const stationLoginFailure = await page2.getByTestId('station-login-failure-label').isVisible().catch(() => false);
          if (!stationLoginFailure) break;
          await telephonyLogin(page2, LOGIN_MODE.EXTENSION);
          if (i == maxRetries - 1) {
            throw new Error(`Station Login Error Persists after ${maxRetries} attempts`);
          }
        }

        await expect(page2.getByTestId('state-select')).toBeVisible();

        let ronapopupVisible = await page2.getByTestId('samples:rona-popup').isVisible().catch(() => false);
        if (ronapopupVisible) {
          await submitRonaPopup(page2, 'Available');
        }

        const endButton = page2.getByRole('group', { name: 'Call Control CAD' }).getByLabel(/^End/);
        const endButtonVisible = await endButton.isVisible().catch(() => false);
        if (endButtonVisible) {
          await endButton.click();
          await submitWrapup(page2);
        }
        const wrapupBox = page2.locator('mdc-button:has-text("Wrap up")');
        const wrapupBoxVisible = await wrapupBox.isVisible().catch(() => false);
        if (wrapupBoxVisible) {
          await submitWrapup(page2);
        }
        await changeUserState(page2, USER_STATES.AVAILABLE);
        const incomingTaskDiv = page2.locator('div.incoming-task');
        const incomingTaskVisible = await incomingTaskDiv.isVisible().catch(() => false);
        if (incomingTaskVisible) {
          await handleStrayTasks(page2);
        }

      })(),
      (async () => {

        for (let i = 0; i < maxRetries; i++) {
          try {
            await loginExtension(extensionPage, process.env.PW_AGENT1_USERNAME, process.env.PW_AGENT1_PASSWORD);
            break;
          } catch (error) {
            if (i == maxRetries - 1) {
              throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
            }
          }
        }
      })()
    ])
  })

  test('should handle multi-session incoming call with state synchronization', async () => {
    //ADD CODE FOR WRAPUP UTIL
    await createCallTask(callerpage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="handset-filled"]')
    });
    const incomingTaskDiv2 = page2.locator('div.incoming-task', {
      has: page2.locator('mdc-avatar[icon-name="handset-filled"]')
    });
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible' });
    await incomingTaskDiv2.waitFor({ state: 'visible' });
    await declineExtensionCall(extensionPage);
    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await page2.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });

    await submitRonaPopup(page2, 'Idle');
    await page.waitForTimeout(3000);
    await verifyCurrentState(page2, USER_STATES.MEETING);
    await verifyCurrentState(page, USER_STATES.MEETING);

    await expect(page.getByTestId('samples:rona-popup')).not.toBeVisible();
    await expect(page2.getByTestId('samples:rona-popup')).not.toBeVisible();

    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(3000);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);

    await incomingTaskDiv.waitFor({ state: 'visible' });
    await extensionPage.locator('[data-test="generic-person-item-base"]').waitFor({ state: 'visible' });
    await incomingTaskDiv2.waitFor({ state: 'visible' });

    await acceptExtensionCall(extensionPage);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page2, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);

    const userStateElement2 = page2.getByTestId('state-select');
    const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor2).toBe(THEME_COLORS.ENGAGED);

    await expect(incomingTaskDiv).toBeHidden();
    await expect(incomingTaskDiv2).toBeHidden();

    //add console checks, color check

    // await endExtensionCall(extensionPage);
    await page2.getByRole('group', { name: 'Call Control CAD' }).getByLabel('End Call').click();
    await page.waitForTimeout(3000)
    await submitWrapup(page);
    await page.waitForTimeout(3000);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);

    // await page2.close();
  })

  test('should handle multi-session incoming chat with state synchronization', async () => {
    await createChatTask(chatPage);
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="chat-filled"]')
    });
    const incomingTaskDiv2 = page2.locator('div.incoming-task', {
      has: page2.locator('mdc-avatar[icon-name="chat-filled"]')
    });
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await incomingTaskDiv2.waitFor({ state: 'visible' });
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await incomingTaskDiv2.waitFor({ state: 'hidden' });

    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await page2.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });

    // await page2.getByTestId('rona-state-select').click();
    // await page2.getByTestId('rona-option-idle').click();
    // await page2.getByTestId('rona-button-confirm').click();
    await submitRonaPopup(page2, 'Idle');
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await verifyCurrentState(page2, USER_STATES.MEETING);

    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await incomingTaskDiv2.waitFor({ state: 'visible' });

    await acceptIncomingTask(page, TASK_TYPES.CHAT);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page2, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);

    const userStateElement2 = page2.getByTestId('state-select');
    const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor2).toBe(THEME_COLORS.ENGAGED);

    await expect(incomingTaskDiv).toBeHidden();
    await expect(incomingTaskDiv2).toBeHidden();

    //add console checks, color check

    await page2.getByRole('group', { name: 'Call Control CAD' }).getByLabel('End Chat').click();
    await page.waitForTimeout(3000);
    await submitWrapup(page2);
    await page.waitForTimeout(5000);

    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
  });

  test('should handle multi-session incoming email with state synchronization', async () => {
    await createEmailTask();
    await changeUserState(page, USER_STATES.AVAILABLE);
    const incomingTaskDiv = page.locator('div.incoming-task', {
      has: page.locator('mdc-avatar[icon-name="email-filled"]')
    });
    const incomingTaskDiv2 = page2.locator('div.incoming-task', {
      has: page2.locator('mdc-avatar[icon-name="email-filled"]')
    });
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await incomingTaskDiv2.waitFor({ state: 'visible' });
    await incomingTaskDiv.waitFor({ state: 'hidden' });
    await incomingTaskDiv2.waitFor({ state: 'hidden' });

    await page.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await page2.getByTestId('samples:rona-popup').waitFor({ state: 'visible' });
    await submitRonaPopup(page2, 'Idle');
    await page.waitForTimeout(5000);
    await verifyCurrentState(page, USER_STATES.MEETING);
    await verifyCurrentState(page2, USER_STATES.MEETING);
    await page.waitForTimeout(3000);
    await changeUserState(page, USER_STATES.AVAILABLE);
    await page.waitForTimeout(5000);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);
    await incomingTaskDiv.waitFor({ state: 'visible' });
    await incomingTaskDiv2.waitFor({ state: 'visible' });

    await acceptIncomingTask(page, TASK_TYPES.EMAIL);
    await page.waitForTimeout(3000);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    await verifyCurrentState(page2, USER_STATES.ENGAGED);
    const userStateElement = page.getByTestId('state-select');
    const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor).toBe(THEME_COLORS.ENGAGED);

    const userStateElement2 = page.getByTestId('state-select');
    const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(userStateElementColor2).toBe(THEME_COLORS.ENGAGED);

    await expect(incomingTaskDiv).toBeHidden();
    await expect(incomingTaskDiv2).toBeHidden();

    //add console checks, color check


    await page2.getByRole('group', { name: 'Call Control CAD' }).getByLabel('End Email').click(); //this is the call-end button
    await page.waitForTimeout(3000);
    await submitWrapup(page);
    await page.waitForTimeout(3000);

    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page2, USER_STATES.AVAILABLE);

  });


  test.afterAll(async () => {
    await context.close();
    await context2.close();
  })

});








//pending cases to be implement => need opinion if we want idle RONA for each Task, have implemented for call.
//user state some cases are pending, call related ones