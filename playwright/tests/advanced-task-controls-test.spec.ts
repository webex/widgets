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
} from '../Utils/advancedTaskControlUtils';

import {changeUserState, verifyCurrentState} from '../Utils/userStateUtils';
import {createCallTask, acceptIncomingTask, declineIncomingTask} from '../Utils/incomingTaskUtils';
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
  describe('Transfer and Consult Tests', () => {
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
        await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
        await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);

        const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
        await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
        await testManager.agent1Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
        await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
        await testManager.agent1Page.waitForTimeout(5000);

        await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

        // Clear console logs to track transfer events
        clearAdvancedCapturedLogs();
      });

      test('Normal Call Blind Transferred by Agent to Another Agent', async () => {
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
        await testManager.agent2Page.waitForTimeout(3000);

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

      test('Normal Call Blind Transferred to Queue', async () => {
        // First transfer from Agent 1 to Agent 2
        await transferViaQueue(testManager.agent1Page, process.env[`${testManager.projectName}_QUEUE_NAME`]!);

        // Agent 2 accepts the transfer
        const incomingTransferDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
        await incomingTransferDiv.waitFor({state: 'visible', timeout: 60000});
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
        await testManager.agent2Page.waitForTimeout(3000);
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
    });

    // =============================================================================
    // CONSULT TRANSFER TESTS
    // =============================================================================

    describe('Consult Transfer Tests', () => {
      beforeEach(async () => {
        await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
        // Create call task and agent 1 accepts it
        await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);

        const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
        await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
        await testManager.agent1Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
        await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
        await testManager.agent1Page.waitForTimeout(5000);

        await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

        // Clear console logs to track consult events
        clearAdvancedCapturedLogs();
      });

      test('Normal Call Consulted via Agent and Accepted (A1 → A2)', async () => {
        // Agent 1 initiates consult with Agent 2
        await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);

        // Verify consult UI elements are visible
        await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
        await expect(testManager.agent1Page.getByTestId('transfer-consult-btn')).toBeVisible();

        // Agent 2 receives and accepts the consult
        const consultRequestDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
        await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
        await testManager.agent2Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
        await testManager.agent2Page.waitForTimeout(3000);

        // Verify both agents are in consult state
        await expect(testManager.agent1Page.getByTestId('transfer-consult-btn')).toBeVisible();

        // Verify consult start success was logged
        await testManager.agent1Page.waitForTimeout(2000);
        verifyConsultStartSuccessLogs();

        // End the consult and verify state
        await cancelConsult(testManager.agent2Page);

        // Verify consult end success was logged
        await testManager.agent1Page.waitForTimeout(2000);
        verifyConsultEndSuccessLogs();

        // Verify call is on hold after consult ends
        await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});

        await verifyCurrentState(testManager.agent2Page, USER_STATES.AVAILABLE);
        await holdCallToggle(testManager.agent1Page);
        // End the call and complete wrapup to clean up for next test
        await endTask(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent1Page.waitForTimeout(2000);
        await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);
      });

      test('Normal Call Consulted via Agent and Declined (A1 → A2)', async () => {
        // Agent 1 initiates another consult with Agent 2
        await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);

        // Agent 2 receives and declines the consult
        const consultRequestDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
        await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
        await testManager.agent2Page.waitForTimeout(3000);

        await declineIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);

        // Verify Agent 1 returns to normal call state
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);

        // Verify call is on hold after consult decline
        await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});

        await holdCallToggle(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(2000);
        await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).not.toBeVisible();

        // Agent 1 should still be engaged with customer call
        await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

        // End the call and complete wrapup to clean up for next test
        await endTask(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent1Page.waitForTimeout(2000);
      });

      test('Normal Call Consulted via Agent and Not Picked Up by Agent 2', async () => {
        // Agent 1 initiates consult with Agent 2
        await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);

        // Wait for consult to timeout (Agent 2 doesn't respond)
        // This should timeout after some time and return to normal state
        await testManager.agent1Page.waitForTimeout(20000); // Wait for timeout

        // Verify Agent 1 returns to call state (call should still be on hold)
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);

        // Verify call is on hold after consult timeout
        await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});

        await holdCallToggle(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(2000);

        // End the call and complete wrapup to clean up for next test
        await endTask(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent1Page.waitForTimeout(2000);
      });

      test('Consult Transfer - Normal Call to Agent 2', async () => {
        await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);

        // Agent 2 accepts the consult first
        const consultRequestDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
        await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
        await testManager.agent2Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
        await testManager.agent2Page.waitForTimeout(3000);
        await testManager.agent1Page.getByTestId('transfer-consult-btn').click();

        // Agent 1 completes the transfer and goes to wrapup
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
        // Verify Agent 2 has the transferred call
        await verifyCurrentState(testManager.agent2Page, USER_STATES.ENGAGED);
        await verifyTaskControls(testManager.agent2Page, TASK_TYPES.CALL);

        // Verify consult start and transfer success were logged
        await testManager.agent2Page.waitForTimeout(2000);
        verifyConsultStartSuccessLogs();
        verifyTransferSuccessLogs();

        // End the call and complete wrapup to clean up for next test
        await endTask(testManager.agent2Page);
        await testManager.agent2Page.waitForTimeout(3000);
        await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent2Page.waitForTimeout(2000);
      });
    });

    // =============================================================================
    // QUEUE CONSULT TESTS
    // =============================================================================

    describe('Queue Consult Tests', () => {
      beforeAll(async () => {
        // Set Agent 2 to available for queue consult tests
        await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      });

      test('Agent 1 Consults via Queue When Agent 2 is Idle, Then Cancels the Consultation', async () => {
        await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
        // Create call task and agent 1 accepts it
        await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);

        const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
        await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
        await testManager.agent1Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
        await testManager.agent1Page.waitForTimeout(5000);

        await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

        // Clear logs before consult
        clearAdvancedCapturedLogs();

        // Agent 1 initiates queue consult
        await consultViaQueue(testManager.agent1Page, process.env[`${testManager.projectName}_QUEUE_NAME`]!);

        // Verify consult UI elements are visible
        await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
        await testManager.agent1Page.waitForTimeout(2000);

        // Agent 1 cancels consult before Agent 2 responds
        await cancelConsult(testManager.agent1Page);

        // Verify customer call returns to regular connected state
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);
        await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).not.toBeVisible();

        // End the call and complete wrapup to clean up for next test
        await endTask(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent1Page.waitForTimeout(2000);
      });

      test('Agent 1 Consults via Queue with Available Agent 2, Then Ends Consultation', async () => {
        await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
        // Create new call for this test
        await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);

        const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
        await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
        await testManager.agent1Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
        await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
        await testManager.agent1Page.waitForTimeout(5000);

        await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

        // Clear logs before consult
        clearAdvancedCapturedLogs();

        // Agent 1 initiates queue consult
        await consultViaQueue(testManager.agent1Page, process.env[`${testManager.projectName}_QUEUE_NAME`]!);

        // Verify consult start success was logged
        await testManager.agent1Page.waitForTimeout(2000);
        verifyConsultStartSuccessLogs();

        // Agent 2 accepts the consult
        const consultRequestDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
        await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
        await testManager.agent2Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
        await testManager.agent2Page.waitForTimeout(3000);

        // Agent 1 ends the consultation
        await cancelConsult(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);
        await verifyCurrentState(testManager.agent2Page, USER_STATES.AVAILABLE);
        // Verify call returns to Agent 1
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);

        // Verify consult end success was logged
        await testManager.agent1Page.waitForTimeout(2000);
        verifyConsultEndSuccessLogs();

        // Verify call is on hold after consult ends
        await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});

        await holdCallToggle(testManager.agent1Page);

        // End the call and complete wrapup to clean up for next test
        await endTask(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent1Page.waitForTimeout(2000);
      });

      test('Agent 2 Ends the Consultation Initiated by Agent 1 via Queue', async () => {
        await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
        // Create new call for this test
        await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);

        const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
        await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
        await testManager.agent1Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
        await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
        await testManager.agent1Page.waitForTimeout(5000);

        await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

        // Clear logs before consult
        clearAdvancedCapturedLogs();

        // Agent 1 initiates queue consult
        await consultViaQueue(testManager.agent1Page, process.env[`${testManager.projectName}_QUEUE_NAME`]!);

        // Agent 2 accepts the consult
        const consultRequestDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
        await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
        await testManager.agent2Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
        await testManager.agent2Page.waitForTimeout(3000);

        // Agent 2 ends the consultation from their side
        await cancelConsult(testManager.agent2Page);
        await testManager.agent2Page.waitForTimeout(3000);
        await verifyCurrentState(testManager.agent2Page, USER_STATES.AVAILABLE);
        // Customer call should return to Agent 1
        await verifyTaskControls(testManager.agent1Page, TASK_TYPES.CALL);

        // Verify call is on hold after consult ends
        await verifyHoldButtonIcon(testManager.agent1Page, {expectedIsHeld: true});

        await holdCallToggle(testManager.agent1Page);
        // End the call and complete wrapup to clean up for next test
        await endTask(testManager.agent1Page);
        await testManager.agent1Page.waitForTimeout(3000);
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent1Page.waitForTimeout(2000);
      });

      test('Agent 1 Consults via Queue with Agent 2, Then Transfers Call to Agent 2', async () => {
        await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
        // Create new call for this test
        await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);

        const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
        await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
        await testManager.agent1Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
        await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
        await testManager.agent1Page.waitForTimeout(5000);

        await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

        // Clear logs before consult
        clearAdvancedCapturedLogs();

        // Agent 1 initiates queue consult
        await consultViaQueue(testManager.agent1Page, process.env[`${testManager.projectName}_QUEUE_NAME`]!);

        // Agent 2 accepts the consultation
        const consultRequestDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
        await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
        await testManager.agent2Page.waitForTimeout(3000);

        await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
        await testManager.agent2Page.waitForTimeout(3000);

        // Agent 1 transfers the call to Agent 2
        await testManager.agent1Page.getByTestId('transfer-consult-btn').click();
        await testManager.agent1Page.waitForTimeout(2000);

        // Agent 1 enters wrap-up state
        await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);

        // Verify ownership shifts to Agent 2
        await verifyCurrentState(testManager.agent2Page, USER_STATES.ENGAGED);
        await verifyTaskControls(testManager.agent2Page, TASK_TYPES.CALL);

        // Verify consult start and transfer success were logged
        await testManager.agent2Page.waitForTimeout(2000);
        verifyConsultStartSuccessLogs();
        verifyConsultTransferredLogs();

        // End the call and complete wrapup to clean up for next test
        await endTask(testManager.agent2Page);
        await testManager.agent2Page.waitForTimeout(3000);
        await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.RESOLVED);
        await testManager.agent2Page.waitForTimeout(2000);
      });
    });
  });
}
