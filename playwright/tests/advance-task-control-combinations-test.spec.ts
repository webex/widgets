import {test, expect} from '@playwright/test';
import {consultViaAgent, transferViaAgent, cancelConsult} from '../Utils/advancedTaskControlUtils';
import {changeUserState, verifyCurrentState} from '../Utils/userStateUtils';
import {createCallTask, acceptIncomingTask} from '../Utils/incomingTaskUtils';
import {submitWrapup} from '../Utils/wrapupUtils';
import {USER_STATES, TASK_TYPES, WRAPUP_REASONS} from '../constants';
import {waitForState} from '../Utils/helperUtils';
import {endTask, holdCallToggle} from '../Utils/taskControlUtils';
import {TestManager} from '../test-manager';

export default function createAdvanceCombinationsTests() {
  test.describe('Advanced Combinations Tests ', () => {
    let testManager: TestManager;

    test.beforeAll(async ({browser}, testInfo) => {
      const projectName = testInfo.project.name;
      testManager = new TestManager(projectName);
      await testManager.setupForAdvancedCombinations(browser);
    });

    test('Transfer from one agent to another, then transfer back to the first agent', async () => {
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      let incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1Page.waitForTimeout(2000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(2000);
      await waitForState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await transferViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);
      incomingTaskDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 20000});
      await testManager.agent2Page.waitForTimeout(2000);
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent2Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await testManager.agent1Page.waitForTimeout(2000);
      await transferViaAgent(testManager.agent2Page, process.env[`${testManager.projectName}_AGENT1_NAME`]!);
      incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 20000});
      await testManager.agent1Page.waitForTimeout(2000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.waitForTimeout(2000);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.SALE);
      await testManager.agent1Page.getByTestId('call-control:end-call').first().click();
      await testManager.agent1Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
    });

    test('Consult with another agent then transfer the call', async () => {
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      let incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1Page.waitForTimeout(2000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await waitForState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent2Page.waitForTimeout(2000);
      await testManager.agent1Page.waitForTimeout(2000);
      await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);
      incomingTaskDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 20000});
      await testManager.agent2Page.waitForTimeout(2000);
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent2Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent1Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await consultViaAgent(testManager.agent2Page, process.env[`${testManager.projectName}_AGENT1_NAME`]!);
      await testManager.agent1Page
        .getByTestId('samples:incoming-task-telephony')
        .first()
        .waitFor({state: 'visible', timeout: 20000});
      await testManager.agent1Page.waitForTimeout(2000);
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
    });

    test('Consult with another agent, transfer the call and transfer the call back to the agent', async () => {
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      let incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1Page.waitForTimeout(2000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await waitForState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);
      incomingTaskDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 20000});
      await testManager.agent2Page.waitForTimeout(2000);
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent2Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);

      await transferViaAgent(testManager.agent2Page, process.env[`${testManager.projectName}_AGENT1_NAME`]!);
      incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({
        state: 'visible',
        timeout: 20000,
      });
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
    });

    test('Transfer the call to another agent & then consult from the other agent', async () => {
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      let incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 40000});
      await testManager.agent1Page.waitForTimeout(2000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent1Page, USER_STATES.ENGAGED);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(2000);
      await transferViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);
      await testManager.agent2Page
        .getByTestId('samples:incoming-task-telephony')
        .first()
        .waitFor({state: 'visible', timeout: 20000});
      await testManager.agent2Page.waitForTimeout(2000);
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await waitForState(testManager.agent2Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await waitForState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await consultViaAgent(testManager.agent2Page, process.env[`${testManager.projectName}_AGENT1_NAME`]!);
      incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({
        state: 'visible',
        timeout: 20000,
      });
      await testManager.agent1Page.waitForTimeout(2000);
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
    });

    test('Multi-Stage Consult and Transfer Between A1 and A2', async () => {
      await changeUserState(testManager.agent2Page, USER_STATES.MEETING);
      await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
      await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_DIAL_NUMBER`]!);
      await testManager.agent1Page.waitForTimeout(5000);
      const incomingTaskDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 80000});
      await testManager.agent1Page.waitForTimeout(3000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await changeUserState(testManager.agent2Page, USER_STATES.AVAILABLE);
      await testManager.agent1Page.waitForTimeout(5000);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);
      const consultRequestDiv = testManager.agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
      await testManager.agent2Page.waitForTimeout(3000);
      await acceptIncomingTask(testManager.agent2Page, TASK_TYPES.CALL);
      await testManager.agent2Page.waitForTimeout(3000);
      await verifyCurrentState(testManager.agent2Page, USER_STATES.ENGAGED);
      await testManager.agent1Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent1Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.SALE);
      await testManager.agent2Page.waitForTimeout(3000);
      await verifyCurrentState(testManager.agent2Page, USER_STATES.ENGAGED);
      await consultViaAgent(testManager.agent2Page, process.env[`${testManager.projectName}_AGENT1_NAME`]!);
      const returnConsultDiv = testManager.agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await returnConsultDiv.waitFor({state: 'visible', timeout: 60000});
      await testManager.agent1Page.waitForTimeout(3000);
      await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL);
      await testManager.agent1Page.waitForTimeout(3000);
      await testManager.agent2Page.getByTestId('transfer-consult-btn').click();
      await testManager.agent2Page.waitForTimeout(2000);
      await submitWrapup(testManager.agent2Page, WRAPUP_REASONS.RESOLVED);
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await consultViaAgent(testManager.agent1Page, process.env[`${testManager.projectName}_AGENT2_NAME`]!);
      await expect(testManager.agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
      await expect(testManager.agent1Page.getByTestId('transfer-consult-btn')).toBeVisible();
      await cancelConsult(testManager.agent1Page);
      await expect(testManager.agent1Page.getByRole('group', {name: 'Call Control with Call'})).toBeVisible();
      await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);
      await holdCallToggle(testManager.agent1Page);
      await endTask(testManager.agent1Page);
      await testManager.agent1Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED);
      await testManager.agent1Page.waitForTimeout(2000);
    });

    test.afterAll(async () => {
      await testManager.cleanup();
    });
  });
}
