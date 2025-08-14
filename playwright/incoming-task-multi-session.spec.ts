import {test, expect} from '@playwright/test';
import {TestManager} from './test-manager';
import {
  acceptExtensionCall,
  acceptIncomingTask,
  createCallTask,
  createChatTask,
  createEmailTask,
  declineExtensionCall,
  submitRonaPopup,
} from './Utils/incomingTaskUtils';
import {changeUserState, verifyCurrentState} from './Utils/userStateUtils';
import {RONA_OPTIONS, TASK_TYPES, THEME_COLORS, USER_STATES, WRAPUP_REASONS} from './constants';
import {isColorClose, waitForState} from './Utils/helperUtils';
import {submitWrapup} from './Utils/wrapupUtils';

export default function createIncomingTaskMultiSessionTests() {
  test.describe('Incoming Tasks tests for multi-session', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForIncomingTaskMultiSession(browser);
    });

    test('should handle multi-session incoming call with state synchronization', async () => {
      await createCallTask(testManager.callerPage, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      const incomingTaskDiv2 = testManager.multiSessionAgent1Page
        .getByTestId('samples:incoming-task-telephony')
        .first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1ExtensionPage.waitForTimeout(2000);
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .first()
        .waitFor({state: 'visible', timeout: 20000});
      await incomingTaskDiv2.waitFor({state: 'visible', timeout: 10000});
      await testManager.agent1Page.waitForTimeout(5000);
      await testManager.agent1ExtensionPage.waitForTimeout(1000);
      await declineExtensionCall(testManager.agent1ExtensionPage);
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 10000});
      await testManager.multiSessionAgent1Page
        .getByTestId('samples:rona-popup')
        .waitFor({state: 'visible', timeout: 10000});
      await testManager.agent1Page.waitForTimeout(3000);
      await submitRonaPopup(testManager.multiSessionAgent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.MEETING);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.MEETING);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.MEETING);
      await expect(testManager.agent1Page.getByTestId('samples:rona-popup')).not.toBeVisible();
      await expect(testManager.multiSessionAgent1Page.getByTestId('samples:rona-popup')).not.toBeVisible();
      await testManager.agent1Page.waitForTimeout(2000);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
      await testManager.multiSessionAgent1Page.waitForTimeout(2000);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 10000});
      await testManager.agent1ExtensionPage.waitForTimeout(2000);
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .first()
        .waitFor({state: 'visible', timeout: 10000});
      await incomingTaskDiv2.waitFor({state: 'visible', timeout: 10000});
      await testManager.agent1Page.waitForTimeout(2000);
      await acceptExtensionCall(testManager.agent1ExtensionPage);
      await testManager.agent1Page.waitForTimeout(2000);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
      const userStateElement2 = testManager.multiSessionAgent1Page.getByTestId('state-select');
      const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor2, THEME_COLORS.ENGAGED)).toBe(true);
      await expect(incomingTaskDiv).toBeHidden();
      await expect(incomingTaskDiv2).toBeHidden();
      await testManager.multiSessionAgent1Page.getByTestId('call-control:end-call').first().click({timeout: 5000});
      await testManager.agent1Page.waitForTimeout(1000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
    });

    test('should handle multi-session incoming chat with state synchronization', async () => {
      await createChatTask(testManager.chatPage, process.env[`${testManager.projectName}_CHAT_URL`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-chat').first();
      const incomingTaskDiv2 = testManager.multiSessionAgent1Page.getByTestId('samples:incoming-task-chat').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 60000});
      await incomingTaskDiv2.waitFor({state: 'visible', timeout: 10000});
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await incomingTaskDiv2.waitFor({state: 'hidden', timeout: 10000});
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await testManager.multiSessionAgent1Page
        .getByTestId('samples:rona-popup')
        .waitFor({state: 'visible', timeout: 15000});
      await submitRonaPopup(testManager.multiSessionAgent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.MEETING);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.MEETING);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.MEETING);
      await testManager.agent1Page.waitForTimeout(2000);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
      await testManager.multiSessionAgent1Page.waitForTimeout(2000);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 10000});
      await incomingTaskDiv2.waitFor({state: 'visible', timeout: 10000});
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CHAT);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
      const userStateElement2 = testManager.multiSessionAgent1Page.getByTestId('state-select');
      const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor2, THEME_COLORS.ENGAGED)).toBe(true);
      await expect(incomingTaskDiv).toBeHidden();
      await expect(incomingTaskDiv2).toBeHidden();
      await testManager.multiSessionAgent1Page.getByTestId('call-control:end-call').first().click({timeout: 5000});
      await submitWrapup(testManager.multiSessionAgent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
    });

    test('should handle multi-session incoming email with state synchronization', async () => {
      await createEmailTask(process.env[`${testManager.projectName}_EMAIL_ENTRY_POINT`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-email').first();
      const incomingTaskDiv2 = testManager.multiSessionAgent1Page.getByTestId('samples:incoming-task-email').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 50000});
      await incomingTaskDiv2.waitFor({state: 'visible', timeout: 10000});
      await incomingTaskDiv.waitFor({state: 'hidden', timeout: 30000});
      await incomingTaskDiv2.waitFor({state: 'hidden', timeout: 10000});
      await testManager.agent1Page.getByTestId('samples:rona-popup').waitFor({state: 'visible', timeout: 15000});
      await testManager.multiSessionAgent1Page
        .getByTestId('samples:rona-popup')
        .waitFor({state: 'visible', timeout: 15000});
      await testManager.agent1Page.waitForTimeout(3000);
      await submitRonaPopup(testManager.multiSessionAgent1Page, RONA_OPTIONS.IDLE);
      await waitForState(testManager.agent1Page, USER_STATES.MEETING);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.MEETING);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.MEETING);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.MEETING);
      await testManager.agent1Page.waitForTimeout(3000);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await testManager.multiSessionAgent1Page.waitForTimeout(2000);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 15000});
      await incomingTaskDiv2.waitFor({state: 'visible', timeout: 15000});
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.EMAIL);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(3000);
      const userStateElement = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor = await userStateElement.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor, THEME_COLORS.ENGAGED)).toBe(true);
      const userStateElement2 = testManager.agent1Page.getByTestId('state-select');
      const userStateElementColor2 = await userStateElement2.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(isColorClose(userStateElementColor2, THEME_COLORS.ENGAGED)).toBe(true);
      await expect(incomingTaskDiv).toBeHidden();
      await expect(incomingTaskDiv2).toBeHidden();
      await testManager.multiSessionAgent1Page.getByTestId('call-control:end-call').first().click({timeout: 5000});
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.multiSessionAgent1Page, USER_STATES.AVAILABLE);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });
  });
}
