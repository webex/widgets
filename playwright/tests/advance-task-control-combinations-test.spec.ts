import {test, expect} from '@playwright/test';
import {
  cancelConsult,
  consultOrTransfer,
  clearAdvancedCapturedLogs,
  verifyConsultStartSuccessLogs,
} from '../Utils/advancedTaskControlUtils';
import {changeUserState, verifyCurrentState} from '../Utils/userStateUtils';
import {createCallTask, acceptIncomingTask} from '../Utils/incomingTaskUtils';
import {submitWrapup} from '../Utils/wrapupUtils';
import {USER_STATES, TASK_TYPES, WRAPUP_REASONS} from '../constants';
import {waitForState, handleStrayTasks, createLogger} from '../Utils/helperUtils';
import {endTask, holdCallToggle} from '../Utils/taskControlUtils';
import {TestManager} from '../test-manager';

const log = createLogger('AdvCombinations');

export default function createAdvanceCombinationsTests() {
  test.describe('Advanced Combinations Tests ', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      log('beforeAll: Setting up test manager');
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForAdvancedCombinations(browser);
      log('beforeAll: Setup complete');
    });

    test.beforeEach(async () => {
      log('beforeEach: Handling stray tasks');
      await handleStrayTasks(testManager.agent1Page);
      await handleStrayTasks(testManager.agent2Page);
    });

    test('Transfer from one agent to another, then transfer back to the first agent', async () => {
      log('Test: Transfer A1→A2→A1 - Starting');
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      log('Creating call and A1 accepting');
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(2000);
      await waitForState(testManager.agent2Page, USER_STATES.AVAILABLE);
      log('A1 engaged, transferring to A2');
      await consultOrTransfer(
        testManager.agent1Page,
        'agent',
        'transfer',
        process.env[`${testManager.projectName}_AGENT2_NAME`]!
      );
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent2Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await testManager.agent1Page.waitForTimeout(2000);
      log('A2 engaged, transferring back to A1');
      await consultOrTransfer(
        testManager.agent2Page,
        'agent',
        'transfer',
        process.env[`${testManager.projectName}_AGENT1_NAME`]!
      );
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.waitForTimeout(2000);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.SALE);
      log('A1 re-engaged, ending call');
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click();
      await testManager.agent1Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      log('Test: Transfer A1→A2→A1 - Complete');
    });

    test('Consult with another agent then transfer the call', async () => {
      log('Test: Consult then transfer - Starting');
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await waitForState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent2Page.waitForTimeout(2000);
      await testManager.agent1Page.waitForTimeout(2000);
      await consultOrTransfer(
        testManager.agent1Page,
        'agent',
        'consult',
        process.env[`${testManager.projectName}_AGENT2_NAME`]!
      );
      log('Consult started, transferring');
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent2Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent1Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await consultOrTransfer(
        testManager.agent2Page,
        'agent',
        'consult',
        process.env[`${testManager.projectName}_AGENT1_NAME`]!
      );
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent2Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent2Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await testManager.agent1Page.waitForTimeout(2000);
      log('Test: Consult then transfer - Complete');
    });

    test('Consult with another agent, transfer the call and transfer the call back to the agent', async () => {
      log('Test: Consult, transfer, transfer back - Starting');
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await waitForState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await consultOrTransfer(
        testManager.agent1Page,
        'agent',
        'consult',
        process.env[`${testManager.projectName}_AGENT2_NAME`]!
      );
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent2Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);

      await consultOrTransfer(
        testManager.agent2Page,
        'agent',
        'transfer',
        process.env[`${testManager.projectName}_AGENT1_NAME`]!
      );
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent2Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(2000);
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await testManager.agent1Page.waitForTimeout(2000);
      log('Test: Consult, transfer, transfer back - Complete');
    });

    test('Transfer the call to another agent & then consult from the other agent', async () => {
      log('Test: Transfer then consult - Starting');
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(2000);
      await consultOrTransfer(
        testManager.agent1Page,
        'agent',
        'transfer',
        process.env[`${testManager.projectName}_AGENT2_NAME`]!
      );
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent2Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await consultOrTransfer(
        testManager.agent2Page,
        'agent',
        'consult',
        process.env[`${testManager.projectName}_AGENT1_NAME`]!
      );
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent2Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent2Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await testManager.agent1Page.waitForTimeout(2000);
      log('Test: Transfer then consult - Complete');
    });

    test('Multi-Stage Consult and Transfer Between A1 and A2', async () => {
      log('Test: Multi-stage consult/transfer - Starting');
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      await testManager.agent1Page.waitForTimeout(5000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(5000);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await consultOrTransfer(
        testManager.agent1Page,
        'agent',
        'consult',
        process.env[`${testManager.projectName}_AGENT2_NAME`]!
      );
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(3000);
      await verifyCurrentState(testManager.agent2Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await testManager.agent2Page.waitForTimeout(3000);
      await verifyCurrentState(testManager.agent2Page, USER_STATES.ENGAGED);
      await consultOrTransfer(
        testManager.agent2Page,
        'agent',
        'consult',
        process.env[`${testManager.projectName}_AGENT1_NAME`]!
      );
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.waitForTimeout(3000);
      await testManager.agent2Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent2Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.RESOLVED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await consultOrTransfer(
        testManager.agent1Page,
        'agent',
        'consult',
        process.env[`${testManager.projectName}_AGENT2_NAME`]!
      );
      await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
      await expect(testManager.agent1Page.getByTestId('transfer-consult-btn')).toBeVisible();
      await cancelConsult(testManager.agent1Page);
      await expect(testManager.agent1Page.getByTestId('call-control:consult').first()).toBeVisible();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await holdCallToggle(testManager.agent1Page);
      await endTask(testManager.agent1Page);
      await testManager.agent1Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
      await testManager.agent1Page.waitForTimeout(2000);
      log('Test: Multi-stage consult/transfer - Complete');
    });

    test('Entry Point: consult then end consult returns UI to normal', async () => {
      test.skip(!process.env.PW_ENTRYPOINT_NAME, 'PW_ENTRYPOINT_NAME not set');
      log('Test: Entry Point consult cancel - Starting');

      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      clearAdvancedCapturedLogs();
      await consultOrTransfer(testManager.agent1Page, 'entryPoint', 'consult', process.env.PW_ENTRYPOINT_NAME!);
      await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
      await verifyConsultStartSuccessLogs();
      await cancelConsult(testManager.agent1Page);
      await testManager.agent1Page.waitForTimeout(1000);
      log('Test: Entry Point consult cancel - Complete');
    });

    test.afterAll(async () => {
      log('afterAll: Cleanup starting');
      await testManager.cleanup();
      log('afterAll: Cleanup complete');
    });
  });
}
