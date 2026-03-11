import {test, expect} from '@playwright/test';
import {changeUserState, verifyCurrentState} from '../Utils/userStateUtils';
import {acceptExtensionCall, endCallTask} from '../Utils/incomingTaskUtils';
import {USER_STATES, WRAPUP_REASONS} from '../constants';
import {submitWrapup, waitForWrapupAfterCallEnd} from '../Utils/wrapupUtils';
import {waitForState} from '../Utils/helperUtils';
import {TestManager} from '../test-manager';
import {enterOutdialNumber, clickOutdialButton, acceptCustomerCall} from '../Utils/outdialUtils';

export default function createOutdialCallTests() {
  test.describe('Outdial Call - Desktop Mode', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForOutdialDesktop(browser);
    });

    test('should make an outdial call in Desktop mode and complete wrapup', async () => {
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await expect(testManager.agent1Page.getByTestId('outdial-call-container')).toBeVisible();
      await enterOutdialNumber(testManager.agent1Page, process.env.PW_DIAL_NUMBER!);
      await clickOutdialButton(testManager.agent1Page);
      await acceptCustomerCall(testManager.callerPage);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(3000);
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click({timeout: 5000});
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });
  });

  test.describe('Outdial Call - Extension Mode', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForOutdialExtension(browser);
    });

    test('should make an outdial call in Extension mode and complete wrapup', async () => {
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await expect(testManager.agent1Page.getByTestId('outdial-call-container')).toBeVisible();
      await enterOutdialNumber(testManager.agent1Page, process.env.PW_DIAL_NUMBER!);
      await clickOutdialButton(testManager.agent1Page);
      await expect(testManager.agent1ExtensionPage.locator('#answer').first()).toBeEnabled({timeout: 40000});
      await acceptExtensionCall(testManager.agent1ExtensionPage);
      await acceptCustomerCall(testManager.callerPage);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(3000);
      await endCallTask(testManager.agent1ExtensionPage);
      await waitForWrapupAfterCallEnd(testManager.agent1Page);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });
  });

}
