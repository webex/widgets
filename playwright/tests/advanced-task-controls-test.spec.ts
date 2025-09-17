import {test, expect} from '@playwright/test';
import {
  consultViaAgent,
  consultViaQueue,
  transferViaAgent,
  transferViaQueue,
  cancelConsult,
  clearAdvancedCapturedLogs,
  verifyTransferSuccessLogs,
  verifyConsultStartSuccessLogs,
  verifyConsultEndSuccessLogs,
  verifyConsultTransferredLogs,
  transferViaDialNumber,
  consultViaDialNumber,
} from '../Utils/advancedTaskControlUtils';

import {changeUserState, verifyCurrentState} from '../Utils/userStateUtils';
import {
  createCallTask,
  acceptIncomingTask,
  declineIncomingTask,
  acceptExtensionCall,
  endCallTask,
  declineExtensionCall,
} from '../Utils/incomingTaskUtils';
import {submitWrapup} from '../Utils/wrapupUtils';
import {USER_STATES, TASK_TYPES, WRAPUP_REASONS} from '../constants';
import {holdCallToggle, endTask, verifyHoldButtonIcon, verifyTaskControls} from '../Utils/taskControlUtils';
import {TestManager} from '../test-manager';

// Extract test functions for cleaner syntax
const {describe, beforeAll, afterAll, beforeEach} = test;

/**
 * Transfer and Consult Tests
 *
 * Comprehensive test suite covering:
 * - Blind Transfer Operations (Agent to Agent, Agent to Queue)
 * - Consult Transfer Operations (with acceptance, decline, timeout scenarios)
 * - Queue Consult Operations (multi-agent scenarios)
 * - Multi-stage Consult Transfer Operations
 */

export default function createAdvancedTaskControlsTests() {
  let testManager: TestManager;

  beforeAll(async ({browser}, testInfo) => {
    const projectName = testInfo.project.name;
    testManager = new TestManager(projectName);
    await testManager.setupForAdvancedTaskControls(browser);
  });

  afterAll(async () => {
    await testManager.cleanup();
  });

  // =============================================================================
  // BLIND TRANSFER TESTS
  // =============================================================================

  describe('Blind Transfer Tests', () => {
    beforeEach(async () => {
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      // Create call task and agent 1 accepts it
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);

      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});

      await acceptExtensionCall(testManager.agent1ExtensionPage);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(5000);

      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      // Clear console logs to track transfer events
      clearAdvancedCapturedLogs();
    });

    test('Call Blind Transferred by Agent to Another Agent', async () => {
      // Agent 1 performs blind transfer to Agent 2
      await transferViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);

      // Verify transfer success in console logs
      await testManager.agent1Page.waitForTimeout(3000);
      verifyTransferSuccessLogs();

      // Verify Agent 1 goes to wrapup state
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      // Agent 2 should receive the transfer and accept it
      const incomingTransferDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTransferDiv.waitFor({state: 'visible', timeout: 60000});

      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(3000);

      // Verify Agent 2 now has the call and is engaged
      await verifyCurrentState(testManager.agent2Page, USER_STATES.ENGAGED);
      await verifyTaskControls(testManager.agent2Page, TASK_TYPES.CALL);

      // Verify transfer success was logged
      await testManager.agent2Page.waitForTimeout(2000);
      verifyTransferSuccessLogs();

      // End the call and complete wrapup to clean up for next test
      await endTask(testManager.agent2Page);
      await testManager.agent2Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.RESOLVED);
      await testManager.agent2Page.waitForTimeout(2000);
    });

    test('Call Blind Transferred to Queue', async () => {
      // First transfer from Agent 1 to Agent 2
      await transferViaQueue(testManager.agent1Page, process.env[`${testManager.projectName}_QUEUE_NAME`]!);

      // Agent 2 accepts the transfer
      const incomingTransferDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTransferDiv.waitFor({state: 'visible', timeout: 60000});
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(3000);
      verifyTransferSuccessLogs();
      await verifyCurrentState(testManager.agent2Page, USER_STATES.ENGAGED);
      await endTask(testManager.agent2Page);
      await testManager.agent2Page.waitForTimeout(2000);

      // Verify Agent 2 goes to wrapup after transfer
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.RESOLVED);
      await testManager.agent2Page.waitForTimeout(2000);

      // Verify Agent 2 is no longer engaged
      await verifyCurrentState(testManager.agent2Page, USER_STATES.AVAILABLE);
    });

    test('Call Blind Transferred to DialNumber', async () => {
      // First transfer from Agent 1 to Agent 2
      await transferViaDialNumber(testManager.agent1Page, process.env.PW_DIAL_NUMBER!);

      //DialNumber accepts the transfer
      await acceptExtensionCall(testManager.dialNumberPage);
      verifyTransferSuccessLogs();
      await endCallTask(testManager.callerPage!);

      // Verify Agent 1 goes to wrapup after transfer
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
      await testManager.agent1Page.waitForTimeout(2000);

      // Verify Agent 1 is no longer engaged
      await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
    });
  });

  // =============================================================================
  // CONSULT TRANSFER AND CONSULT SCENARIOS
  // =============================================================================

  describe('Consult and Consult Transfer Scenarios', () => {
    test('Agent Consult Transfer: cancel, decline, timeout, and transfer scenarios are handled correctly in sequence', async () => {
      // ...existing code for Agent Consult Transfer test...
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .waitFor({state: 'visible', timeout: 20000});
      await acceptExtensionCall(testManager.agent1ExtensionPage);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(5000);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      // 1. Accept consult and end
      clearAdvancedCapturedLogs();
      await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);
      await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
      await expect(testManager.agent1Page.getByTestId('transfer-consult-btn')).toBeVisible();
      const consultRequestDiv1 = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv1.waitFor({state: 'visible', timeout: 60000});
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(3000);
      await expect(testManager.agent1Page.getByTestId('transfer-consult-btn')).toBeVisible();
      await testManager.agent1Page.waitForTimeout(2000);
      verifyConsultStartSuccessLogs();
      await cancelConsult(testManager.agent2Page);
      await testManager.agent1Page.waitForTimeout(2000);
      verifyConsultEndSuccessLogs();
      await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});
      await verifyCurrentState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await holdCallToggle(testManager.agent1Page);

      // 2. Decline consult
      clearAdvancedCapturedLogs();
      await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);
      const consultRequestDiv2 = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv2.waitFor({state: 'visible', timeout: 60000});
      await testManager.agent2Page.waitForTimeout(3000);
      await declineIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
      await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});
      await holdCallToggle(testManager.agent1Page);
      await testManager.agent1Page.waitForTimeout(2000);
      await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).not.toBeVisible();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      // 3. Not picked up (timeout)
      clearAdvancedCapturedLogs();
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);
      await testManager.agent1Page.waitForTimeout(20000); // Wait for timeout
      await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
      await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});
      await holdCallToggle(testManager.agent1Page);
      await testManager.agent1Page.waitForTimeout(2000);

      // 4. Consult transfer
      clearAdvancedCapturedLogs();
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);
      const consultRequestDiv3 = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv3.waitFor({state: 'visible', timeout: 60000});
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(3000);
      await testManager.agent1Page.getByTestId('transfer-consult-btn').click();
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await verifyCurrentState(testManager.agent2Page, USER_STATES.ENGAGED);
      await verifyTaskControls(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(2000);
      verifyConsultStartSuccessLogs();
      verifyTransferSuccessLogs();
      await endTask(testManager.agent2Page);
      await testManager.agent2Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.RESOLVED);
      await testManager.agent2Page.waitForTimeout(2000);
    });

    test('Queue Consult: cancel, accept/end, agent-end, and transfer scenarios are handled correctly in sequence', async () => {
      // ...existing code for Queue Consult test...
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);

      // Setup: create call and get to engaged state
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .waitFor({state: 'visible', timeout: 20000});
      await acceptExtensionCall(testManager.agent1ExtensionPage);
      await testManager.agent1Page.waitForTimeout(5000);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      // 1. Cancel consult
      clearAdvancedCapturedLogs();
      await consultViaQueue(testManager.agent1Page, process.env[`${testManager.projectName}_QUEUE_NAME`]!);
      await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
      await testManager.agent1Page.waitForTimeout(2000);
      await cancelConsult(testManager.agent1Page);
      await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
      await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).not.toBeVisible();

      // 2. Accept consult and end (Agent 2 accepts, Agent 1 ends)
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      clearAdvancedCapturedLogs();
      await consultViaQueue(testManager.agent1Page, process.env[`${testManager.projectName}_QUEUE_NAME`]!);
      await testManager.agent1Page.waitForTimeout(3000);
      verifyConsultStartSuccessLogs();
      const consultRequestDiv1 = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv1.waitFor({state: 'visible', timeout: 60000});
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(3000);
      await cancelConsult(testManager.agent1Page);
      await testManager.agent1Page.waitForTimeout(3000);
      await verifyCurrentState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.waitForTimeout(2000);
      verifyConsultEndSuccessLogs();
      await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});
      await holdCallToggle(testManager.agent1Page);

      // 3. Accept consult and Agent 2 ends
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      clearAdvancedCapturedLogs();
      await consultViaQueue(testManager.agent1Page, process.env[`${testManager.projectName}_QUEUE_NAME`]!);
      const consultRequestDiv2 = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv2.waitFor({state: 'visible', timeout: 60000});
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(3000);
      await cancelConsult(testManager.agent2Page);
      await testManager.agent2Page.waitForTimeout(3000);
      await verifyCurrentState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
      await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});
      await holdCallToggle(testManager.agent1Page);

      // 4. Consult transfer
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      clearAdvancedCapturedLogs();
      await consultViaQueue(testManager.agent1Page, process.env[`${testManager.projectName}_QUEUE_NAME`]!);
      await testManager.agent1Page.waitForTimeout(2000);
      const consultRequestDiv3 = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv3.waitFor({state: 'visible', timeout: 60000});
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(3000);
      await testManager.agent1Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await verifyCurrentState(testManager.agent2Page, USER_STATES.ENGAGED);
      await verifyTaskControls(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(2000);
      verifyConsultStartSuccessLogs();
      verifyConsultTransferredLogs();
      await endTask(testManager.agent2Page);
      await testManager.agent2Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.RESOLVED);
      await testManager.agent2Page.waitForTimeout(2000);
    });

    test('Dial Number Consult: cancel, decline, accept/end, and transfer scenarios are handled correctly in sequence', async () => {
      // ...existing code for Dial Number Consult test...
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);

      // Setup: create call and get to engaged state
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
      await testManager.agent1ExtensionPage
        .locator('[data-test="generic-person-item-base"]')
        .waitFor({state: 'visible', timeout: 20000});
      await acceptExtensionCall(testManager.agent1ExtensionPage);
      await testManager.agent1Page.waitForTimeout(5000);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      // 1. Cancel consult
      clearAdvancedCapturedLogs();
      await consultViaDialNumber(testManager.agent1Page, process.env.PW_DIAL_NUMBER!);
      await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
      await testManager.agent1Page.waitForTimeout(2000);
      await cancelConsult(testManager.agent1Page);
      await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
      await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).not.toBeVisible();

      // 2. Decline consult
      clearAdvancedCapturedLogs();
      await consultViaDialNumber(testManager.agent1Page, process.env.PW_DIAL_NUMBER!);
      await declineExtensionCall(testManager.dialNumberPage);
      await testManager.agent1Page.waitForTimeout(2000);
      await cancelConsult(testManager.agent1Page); // still needs to cancel even if declined
      await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
      await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});
      await holdCallToggle(testManager.agent1Page);
      await testManager.agent1Page.waitForTimeout(2000);
      await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).not.toBeVisible();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

      // 3. Accept consult and end
      clearAdvancedCapturedLogs();
      await consultViaDialNumber(testManager.agent1Page, process.env.PW_DIAL_NUMBER!);
      await testManager.agent1Page.waitForTimeout(2000);
      verifyConsultStartSuccessLogs();
      await acceptExtensionCall(testManager.dialNumberPage);
      await testManager.agent1Page.waitForTimeout(2000);
      await cancelConsult(testManager.agent1Page);
      await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.waitForTimeout(2000);
      verifyConsultEndSuccessLogs();
      await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});
      await holdCallToggle(testManager.agent1Page);

      // 4. Consult transfer
      clearAdvancedCapturedLogs();
      await consultViaDialNumber(testManager.agent1Page, process.env.PW_DIAL_NUMBER!);
      await acceptExtensionCall(testManager.dialNumberPage);
      await testManager.agent1Page.waitForTimeout(3000);
      await testManager.agent1Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await testManager.dialNumberPage.waitForTimeout(2000);
      verifyConsultStartSuccessLogs();
      verifyConsultTransferredLogs();
      await endCallTask(testManager.dialNumberPage);
    });
  });
}
