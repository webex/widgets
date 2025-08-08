import {test, expect, Page, BrowserContext} from '@playwright/test';
import {
  consultViaAgent,
  consultViaQueue,
  transferViaAgent,
  transferViaQueue,
  cancelConsult,
  setupAdvancedConsoleLogging,
  clearAdvancedCapturedLogs,
  verifyTransferSuccessLogs,
  verifyConsultStartSuccessLogs,
  verifyConsultEndSuccessLogs,
  verifyConsultTransferredLogs,
} from './Utils/advancedTaskControlUtils';

import {stationLogout, telephonyLogin} from './Utils/stationLoginUtils';
import {changeUserState, getCurrentState, verifyCurrentState} from './Utils/userStateUtils';
import {createCallTask, acceptIncomingTask, loginExtension, declineIncomingTask} from './Utils/incomingTaskUtils';
import {submitWrapup} from './Utils/wrapupUtils';
import {USER_STATES, LOGIN_MODE, TASK_TYPES, WRAPUP_REASONS, AGENT_NAMES, QUEUE_NAMES} from './constants';
import {
  holdCallToggle,
  endTask,
  setupConsoleLogging,
  clearCapturedLogs,
  verifyHoldButtonIcon,
  verifyTaskControls,
} from './Utils/taskControlUtils';
import {pageSetup} from './Utils/helperUtils';

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

let agent1Page: Page;
let agent2Page: Page;
let callerPage: Page;
let agent1Context: BrowserContext;
let agent2Context: BrowserContext;
let callerContext: BrowserContext;
const maxRetries = 3;

describe('Transfer and Consult Tests', () => {
  // =============================================================================
  // BLIND TRANSFER TESTS
  // =============================================================================

  describe('Blind Transfer Tests', () => {
    beforeAll(async ({browser}) => {
      agent1Context = await browser.newContext();
      agent2Context = await browser.newContext();
      callerContext = await browser.newContext();

      agent1Page = await agent1Context.newPage();
      agent2Page = await agent2Context.newPage();
      callerPage = await callerContext.newPage();

      await Promise.all([
        (async () => {
          for (let i = 0; i < maxRetries; i++) {
            try {
              await loginExtension(callerPage, process.env.PW_AGENT1_USERNAME ?? '', process.env.PW_PASSWORD ?? '');
              break;
            } catch (error) {
              if (i == maxRetries - 1) {
                throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
              }
            }
          }
        })(),
        (async () => {
          await pageSetup(agent1Page, LOGIN_MODE.DESKTOP, 'AGENT1');
          // Setup console logging for callbacks
          setupConsoleLogging(agent1Page);
          setupAdvancedConsoleLogging(agent1Page);
        })(),
        (async () => {
          await pageSetup(agent2Page, LOGIN_MODE.DESKTOP, 'AGENT2');
          // Setup console logging for callbacks
          setupConsoleLogging(agent2Page);
          setupAdvancedConsoleLogging(agent2Page);
        })(),
      ]);
    });

    afterAll(async () => {
      await Promise.all([
        (async () => {
          if ((await getCurrentState(agent1Page)) === USER_STATES.ENGAGED) {
            await endTask(agent1Page);
            await agent1Page.waitForTimeout(3000);
            await submitWrapup(agent1Page, WRAPUP_REASONS.RESOLVED);
            await agent1Page.waitForTimeout(2000);
          }
          await stationLogout(agent1Page);
        })(),
        (async () => {
          if ((await getCurrentState(agent2Page)) === USER_STATES.ENGAGED) {
            await endTask(agent2Page);
            await agent2Page.waitForTimeout(3000);
            await submitWrapup(agent2Page, WRAPUP_REASONS.RESOLVED);
            await agent2Page.waitForTimeout(2000);
          }
          await stationLogout(agent2Page);
        })(),
      ]);
      await agent1Context.close();
      await agent2Context.close();
      await callerContext.close();
    });

    beforeEach(async () => {
      await changeUserState(agent2Page, USER_STATES.MEETING);
      // Create call task and agent 1 accepts it
      await createCallTask(callerPage);

      const incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 120000});
      await agent1Page.waitForTimeout(3000);

      await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
      await changeUserState(agent2Page, USER_STATES.AVAILABLE);
      await agent1Page.waitForTimeout(5000);

      await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);

      // Clear console logs to track transfer events
      clearAdvancedCapturedLogs();
    });

    test('Normal Call Blind Transferred by Agent to Another Agent', async () => {
      // Agent 1 performs blind transfer to Agent 2
      await transferViaAgent(agent1Page, AGENT_NAMES.AGENT2);

      // Verify transfer success in console logs
      await agent1Page.waitForTimeout(3000);
      verifyTransferSuccessLogs();

      // Verify Agent 1 goes to wrapup state
      await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
      // Agent 2 should receive the transfer and accept it
      const incomingTransferDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTransferDiv.waitFor({state: 'visible', timeout: 60000});
      await agent2Page.waitForTimeout(3000);

      await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
      await agent2Page.waitForTimeout(3000);

      // Verify Agent 2 now has the call and is engaged
      await verifyCurrentState(agent2Page, USER_STATES.ENGAGED);
      await verifyTaskControls(agent2Page, TASK_TYPES.CALL);

      // Verify transfer success was logged
      await agent2Page.waitForTimeout(2000);
      verifyTransferSuccessLogs();

      // End the call and complete wrapup to clean up for next test
      await endTask(agent2Page);
      await agent2Page.waitForTimeout(3000);
      await submitWrapup(agent2Page, WRAPUP_REASONS.RESOLVED);
      await agent2Page.waitForTimeout(2000);
    });

    test('Normal Call Blind Transferred to Queue', async () => {
      // First transfer from Agent 1 to Agent 2
      await transferViaQueue(agent1Page, QUEUE_NAMES.QUEUE_4);

      // Agent 2 accepts the transfer
      const incomingTransferDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTransferDiv.waitFor({state: 'visible', timeout: 60000});
      await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
      await agent2Page.waitForTimeout(3000);
      await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
      await agent2Page.waitForTimeout(3000);
      verifyTransferSuccessLogs();
      await verifyCurrentState(agent2Page, USER_STATES.ENGAGED);
      await endTask(agent2Page);
      await agent2Page.waitForTimeout(2000);

      // Verify Agent 2 goes to wrapup after transfer
      await submitWrapup(agent2Page, WRAPUP_REASONS.RESOLVED);
      await agent2Page.waitForTimeout(2000);

      // Verify Agent 2 is no longer engaged
      await verifyCurrentState(agent2Page, USER_STATES.AVAILABLE);
    });
  });

  // =============================================================================
  // CONSULT TRANSFER TESTS
  // =============================================================================

  describe('Consult Transfer Tests', () => {
    beforeAll(async ({browser}) => {
      agent1Context = await browser.newContext();
      agent2Context = await browser.newContext();
      callerContext = await browser.newContext();

      agent1Page = await agent1Context.newPage();
      agent2Page = await agent2Context.newPage();
      callerPage = await callerContext.newPage();

      await Promise.all([
        (async () => {
          for (let i = 0; i < maxRetries; i++) {
            try {
              await loginExtension(callerPage, process.env.PW_AGENT2_USERNAME ?? '', process.env.PW_PASSWORD ?? '');
              break;
            } catch (error) {
              if (i == maxRetries - 1) {
                throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
              }
            }
          }
        })(),
        (async () => {
          await pageSetup(agent1Page, LOGIN_MODE.DESKTOP, 'AGENT1');
          // Setup console logging for callbacks
          setupConsoleLogging(agent1Page);
          setupAdvancedConsoleLogging(agent1Page);
        })(),
        (async () => {
          await pageSetup(agent2Page, LOGIN_MODE.DESKTOP, 'AGENT2');
          // Setup console logging for callbacks
          setupConsoleLogging(agent2Page);
          setupAdvancedConsoleLogging(agent2Page);
        })(),
      ]);
    });

    afterAll(async () => {
      await Promise.all([
        (async () => {
          if ((await getCurrentState(agent1Page)) === USER_STATES.ENGAGED) {
            await endTask(agent1Page);
            await agent1Page.waitForTimeout(3000);
            await submitWrapup(agent1Page, WRAPUP_REASONS.RESOLVED);
            await agent1Page.waitForTimeout(2000);
          }
          await stationLogout(agent1Page);
        })(),
        (async () => {
          if ((await getCurrentState(agent2Page)) === USER_STATES.ENGAGED) {
            await endTask(agent2Page);
            await agent2Page.waitForTimeout(3000);
            await submitWrapup(agent2Page, WRAPUP_REASONS.RESOLVED);
            await agent2Page.waitForTimeout(2000);
          }
          await stationLogout(agent2Page);
        })(),
      ]);
      await agent1Context.close();
      await agent2Context.close();
      await callerContext.close();
    });

    beforeEach(async () => {
      await changeUserState(agent2Page, USER_STATES.MEETING);
      // Create call task and agent 1 accepts it
      await createCallTask(callerPage);

      const incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 120000});
      await agent1Page.waitForTimeout(3000);

      await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
      await changeUserState(agent2Page, USER_STATES.AVAILABLE);
      await agent1Page.waitForTimeout(5000);

      await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);

      // Clear console logs to track consult events
      clearAdvancedCapturedLogs();
    });

    test('Normal Call Consulted via Agent and Accepted (A1 → A2)', async () => {
      // Agent 1 initiates consult with Agent 2
      await consultViaAgent(agent1Page, AGENT_NAMES.AGENT2);

      // Verify consult UI elements are visible
      await expect(agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
      await expect(agent1Page.getByTestId('transfer-consult-btn')).toBeVisible();

      // Agent 2 receives and accepts the consult
      const consultRequestDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
      await agent2Page.waitForTimeout(3000);

      await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
      await agent2Page.waitForTimeout(3000);

      // Verify both agents are in consult state
      await expect(agent1Page.getByTestId('transfer-consult-btn')).toBeVisible();

      // Verify consult start success was logged
      await agent1Page.waitForTimeout(2000);
      verifyConsultStartSuccessLogs();

      // End the consult and verify state
      await cancelConsult(agent2Page);

      // Verify consult end success was logged
      await agent1Page.waitForTimeout(2000);
      verifyConsultEndSuccessLogs();

      // Verify call is on hold after consult ends
      await verifyHoldButtonIcon(agent1Page, {expectedIsHeld: true});

      await verifyCurrentState(agent2Page, USER_STATES.AVAILABLE);
      await holdCallToggle(agent1Page);
      // End the call and complete wrapup to clean up for next test
      await endTask(agent1Page);
      await agent1Page.waitForTimeout(3000);
      await submitWrapup(agent1Page, WRAPUP_REASONS.RESOLVED);
      await agent1Page.waitForTimeout(2000);
      await verifyCurrentState(agent1Page, USER_STATES.AVAILABLE);
    });

    test('Normal Call Consulted via Agent and Declined (A1 → A2)', async () => {
      // Agent 1 initiates another consult with Agent 2
      await consultViaAgent(agent1Page, AGENT_NAMES.AGENT2);

      // Agent 2 receives and declines the consult
      const consultRequestDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
      await agent2Page.waitForTimeout(3000);

      await declineIncomingTask(agent2Page, TASK_TYPES.CALL);

      // Verify Agent 1 returns to normal call state
      await verifyTaskControls(agent1Page, TASK_TYPES.CALL);

      // Verify call is on hold after consult decline
      await verifyHoldButtonIcon(agent1Page, {expectedIsHeld: true});

      await holdCallToggle(agent1Page);
      await agent1Page.waitForTimeout(2000);
      await expect(agent1Page.getByTestId('cancel-consult-btn')).not.toBeVisible();

      // Agent 1 should still be engaged with customer call
      await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);

      // End the call and complete wrapup to clean up for next test
      await endTask(agent1Page);
      await agent1Page.waitForTimeout(3000);
      await submitWrapup(agent1Page, WRAPUP_REASONS.RESOLVED);
      await agent1Page.waitForTimeout(2000);
    });

    test('Normal Call Consulted via Agent and Not Picked Up by Agent 2', async () => {
      // Agent 1 initiates consult with Agent 2
      await consultViaAgent(agent1Page, AGENT_NAMES.AGENT2);

      // Wait for consult to timeout (Agent 2 doesn't respond)
      // This should timeout after some time and return to normal state
      await agent1Page.waitForTimeout(20000); // Wait for timeout

      // Verify Agent 1 returns to call state (call should still be on hold)
      await verifyTaskControls(agent1Page, TASK_TYPES.CALL);

      // Verify call is on hold after consult timeout
      await verifyHoldButtonIcon(agent1Page, {expectedIsHeld: true});

      await holdCallToggle(agent1Page);
      await agent1Page.waitForTimeout(2000);

      // End the call and complete wrapup to clean up for next test
      await endTask(agent1Page);
      await agent1Page.waitForTimeout(3000);
      await submitWrapup(agent1Page, WRAPUP_REASONS.RESOLVED);
      await agent1Page.waitForTimeout(2000);
    });

    test('Consult Transfer - Normal Call to Agent 2', async () => {
      await consultViaAgent(agent1Page, AGENT_NAMES.AGENT2);

      // Agent 2 accepts the consult first
      const consultRequestDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
      await agent2Page.waitForTimeout(3000);

      await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
      await agent2Page.waitForTimeout(3000);
      await agent1Page.getByTestId('transfer-consult-btn').click();

      // Agent 1 completes the transfer and goes to wrapup
      await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
      // Verify Agent 2 has the transferred call
      await verifyCurrentState(agent2Page, USER_STATES.ENGAGED);
      await verifyTaskControls(agent2Page, TASK_TYPES.CALL);

      // Verify consult start and transfer success were logged
      await agent2Page.waitForTimeout(2000);
      verifyConsultStartSuccessLogs();
      verifyTransferSuccessLogs();

      // End the call and complete wrapup to clean up for next test
      await endTask(agent2Page);
      await agent2Page.waitForTimeout(3000);
      await submitWrapup(agent2Page, WRAPUP_REASONS.RESOLVED);
      await agent2Page.waitForTimeout(2000);
    });
  });

  // =============================================================================
  // QUEUE CONSULT TESTS
  // =============================================================================

  describe('Queue Consult Tests', () => {
    beforeAll(async ({browser}) => {
      agent1Context = await browser.newContext();
      agent2Context = await browser.newContext();
      callerContext = await browser.newContext();

      agent1Page = await agent1Context.newPage();
      agent2Page = await agent2Context.newPage();
      callerPage = await callerContext.newPage();

      await Promise.all([
        (async () => {
          for (let i = 0; i < maxRetries; i++) {
            try {
              await loginExtension(callerPage, process.env.PW_AGENT1_USERNAME ?? '', process.env.PW_PASSWORD ?? '');
              break;
            } catch (error) {
              if (i == maxRetries - 1) {
                throw new Error(`Failed to login extension after ${maxRetries} attempts: ${error}`);
              }
            }
          }
        })(),
        (async () => {
          await pageSetup(agent1Page, LOGIN_MODE.DESKTOP, 'AGENT1');
          await setupConsoleLogging(agent1Page);
          await setupAdvancedConsoleLogging(agent1Page);
        })(),
        (async () => {
          await pageSetup(agent2Page, LOGIN_MODE.DESKTOP, 'AGENT2');
          await setupConsoleLogging(agent2Page);
          await setupAdvancedConsoleLogging(agent2Page);
          // Set Agent 2 to idle for some tests
          await changeUserState(agent2Page, USER_STATES.AVAILABLE);
        })(),
      ]);
    });

    afterAll(async () => {
      await Promise.all([
        (async () => {
          if ((await getCurrentState(agent1Page)) === USER_STATES.ENGAGED) {
            await endTask(agent1Page);
            await agent1Page.waitForTimeout(3000);
            await submitWrapup(agent1Page, WRAPUP_REASONS.RESOLVED);
            await agent1Page.waitForTimeout(2000);
          }
          await stationLogout(agent1Page);
        })(),
        (async () => {
          if ((await getCurrentState(agent2Page)) === USER_STATES.ENGAGED) {
            await endTask(agent2Page);
            await agent2Page.waitForTimeout(3000);
            await submitWrapup(agent2Page, WRAPUP_REASONS.RESOLVED);
            await agent2Page.waitForTimeout(2000);
          }
          await stationLogout(agent2Page);
        })(),
      ]);
      await agent1Context.close();
      await agent2Context.close();
      await callerContext.close();
    });

    test('Agent 1 Consults via Queue When Agent 2 is Idle, Then Cancels the Consultation', async () => {
      await changeUserState(agent2Page, USER_STATES.MEETING);
      // Create call task and agent 1 accepts it
      await createCallTask(callerPage);

      const incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 120000});
      await agent1Page.waitForTimeout(3000);

      await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
      await agent1Page.waitForTimeout(5000);

      await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);

      // Clear logs before consult
      clearAdvancedCapturedLogs();

      // Agent 1 initiates queue consult
      await consultViaQueue(agent1Page, QUEUE_NAMES.QUEUE_4);

      // Verify consult UI elements are visible
      await expect(agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
      await agent1Page.waitForTimeout(2000);

      // Agent 1 cancels consult before Agent 2 responds
      await cancelConsult(agent1Page);

      // Verify customer call returns to regular connected state
      await verifyTaskControls(agent1Page, TASK_TYPES.CALL);
      await expect(agent1Page.getByTestId('cancel-consult-btn')).not.toBeVisible();

      // End the call and complete wrapup to clean up for next test
      await endTask(agent1Page);
      await agent1Page.waitForTimeout(3000);
      await submitWrapup(agent1Page, WRAPUP_REASONS.RESOLVED);
      await agent1Page.waitForTimeout(2000);
    });

    test('Agent 1 Consults via Queue with Available Agent 2, Then Ends Consultation', async () => {
      await changeUserState(agent2Page, USER_STATES.MEETING);
      // Create new call for this test
      await createCallTask(callerPage);

      const incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 120000});
      await agent1Page.waitForTimeout(3000);

      await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
      await changeUserState(agent2Page, USER_STATES.AVAILABLE);
      await agent1Page.waitForTimeout(5000);

      await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);

      // Clear logs before consult
      clearAdvancedCapturedLogs();

      // Agent 1 initiates queue consult
      await consultViaQueue(agent1Page, QUEUE_NAMES.QUEUE_4);

      // Verify consult start success was logged
      await agent1Page.waitForTimeout(2000);
      verifyConsultStartSuccessLogs();

      // Agent 2 accepts the consult
      const consultRequestDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
      await agent2Page.waitForTimeout(3000);

      await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
      await agent2Page.waitForTimeout(3000);

      // Agent 1 ends the consultation
      await cancelConsult(agent1Page);
      await agent1Page.waitForTimeout(3000);
      await verifyCurrentState(agent2Page, USER_STATES.AVAILABLE);
      // Verify call returns to Agent 1
      await verifyTaskControls(agent1Page, TASK_TYPES.CALL);

      // Verify consult end success was logged
      await agent1Page.waitForTimeout(2000);
      verifyConsultEndSuccessLogs();

      // Verify call is on hold after consult ends
      await verifyHoldButtonIcon(agent1Page, {expectedIsHeld: true});

      await holdCallToggle(agent1Page);

      // End the call and complete wrapup to clean up for next test
      await endTask(agent1Page);
      await agent1Page.waitForTimeout(3000);
      await submitWrapup(agent1Page, WRAPUP_REASONS.RESOLVED);
      await agent1Page.waitForTimeout(2000);
    });

    test('Agent 2 Ends the Consultation Initiated by Agent 1 via Queue', async () => {
      await changeUserState(agent2Page, USER_STATES.MEETING);
      // Create new call for this test
      await createCallTask(callerPage);

      const incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 120000});
      await agent1Page.waitForTimeout(3000);

      await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
      await changeUserState(agent2Page, USER_STATES.AVAILABLE);
      await agent1Page.waitForTimeout(5000);

      await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);

      // Clear logs before consult
      clearAdvancedCapturedLogs();

      // Agent 1 initiates queue consult
      await consultViaQueue(agent1Page, QUEUE_NAMES.QUEUE_4);

      // Agent 2 accepts the consult
      const consultRequestDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
      await agent2Page.waitForTimeout(3000);

      await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
      await agent2Page.waitForTimeout(3000);

      // Agent 2 ends the consultation from their side
      await cancelConsult(agent2Page);
      await agent2Page.waitForTimeout(3000);
      await verifyCurrentState(agent2Page, USER_STATES.AVAILABLE);
      // Customer call should return to Agent 1
      await verifyTaskControls(agent1Page, TASK_TYPES.CALL);

      // Verify call is on hold after consult ends
      await verifyHoldButtonIcon(agent1Page, {expectedIsHeld: true});

      await holdCallToggle(agent1Page);
      // End the call and complete wrapup to clean up for next test
      await endTask(agent1Page);
      await agent1Page.waitForTimeout(3000);
      await submitWrapup(agent1Page, WRAPUP_REASONS.RESOLVED);
      await agent1Page.waitForTimeout(2000);
    });

    test('Agent 1 Consults via Queue with Agent 2, Then Transfers Call to Agent 2', async () => {
      await changeUserState(agent2Page, USER_STATES.MEETING);
      // Create new call for this test
      await createCallTask(callerPage);

      const incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
      await incomingTaskDiv.waitFor({state: 'visible', timeout: 120000});
      await agent1Page.waitForTimeout(3000);

      await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
      await changeUserState(agent2Page, USER_STATES.AVAILABLE);
      await agent1Page.waitForTimeout(5000);

      await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);

      // Clear logs before consult
      clearAdvancedCapturedLogs();

      // Agent 1 initiates queue consult
      await consultViaQueue(agent1Page, QUEUE_NAMES.QUEUE_4);

      // Agent 2 accepts the consultation
      const consultRequestDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
      await consultRequestDiv.waitFor({state: 'visible', timeout: 60000});
      await agent2Page.waitForTimeout(3000);

      await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
      await agent2Page.waitForTimeout(3000);

      // Agent 1 transfers the call to Agent 2
      await agent1Page.getByTestId('transfer-consult-btn').click();
      await agent1Page.waitForTimeout(2000);

      // Agent 1 enters wrap-up state
      await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);

      // Verify ownership shifts to Agent 2
      await verifyCurrentState(agent2Page, USER_STATES.ENGAGED);
      await verifyTaskControls(agent2Page, TASK_TYPES.CALL);

      // Verify consult start and transfer success were logged
      await agent2Page.waitForTimeout(2000);
      verifyConsultStartSuccessLogs();
      verifyConsultTransferredLogs();

      // End the call and complete wrapup to clean up for next test
      await endTask(agent2Page);
      await agent2Page.waitForTimeout(3000);
      await submitWrapup(agent2Page, WRAPUP_REASONS.RESOLVED);
      await agent2Page.waitForTimeout(2000);
    });
  });
});
