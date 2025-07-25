import { Page, test, expect, BrowserContext } from "@playwright/test";
import {
  consultViaAgent,
  transferViaAgent,
  cancelConsult,
} from './Utils/advancedTaskControlUtils';
import { changeUserState, getCurrentState, verifyCurrentState } from './Utils/userStateUtils';
import {
  createCallTask,
  acceptIncomingTask,
  loginExtension
} from './Utils/incomingTaskUtils';
import { submitWrapup } from './Utils/wrapupUtils';
import { USER_STATES, LOGIN_MODE, TASK_TYPES, WRAPUP_REASONS } from './constants';
import { pageSetup, waitForState } from "./Utils/helperUtils";
import { endTask } from "./Utils/taskControlUtils";

test.use({ headless: false });

let agent1Page: Page;
let agent2Page: Page;
let callerPage: Page;
let agent1Context: BrowserContext;
let agent2Context: BrowserContext;
let callerContext: BrowserContext;
const maxRetries = 3;


test.describe("Advanced Combinations Tests ", () => {

  test.beforeAll(async ({ browser }) => {
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
      })(),
      (async () => {
        await pageSetup(agent2Page, LOGIN_MODE.DESKTOP, 'AGENT2');
      })(),
    ]);
  });



  test('Transfer from one agent to another, then transfer back to the first agent', async () => {
    await changeUserState(agent2Page, USER_STATES.MEETING);
    await changeUserState(agent1Page, USER_STATES.AVAILABLE);
    await createCallTask(callerPage, process.env.PW_DIAL_NUMBER);
    let incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await agent1Page.waitForTimeout(2000);
    await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
    await waitForState(agent1Page, USER_STATES.ENGAGED);
    await changeUserState(agent2Page, USER_STATES.AVAILABLE);
    await agent1Page.waitForTimeout(2000);
    await waitForState(agent2Page, USER_STATES.AVAILABLE);
    await transferViaAgent(agent1Page, 'User2 Agent2');
    incomingTaskDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 20000 });
    await agent2Page.waitForTimeout(2000);
    await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
    await waitForState(agent2Page, USER_STATES.ENGAGED);
    await agent1Page.waitForTimeout(2000);
    await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
    await agent1Page.waitForTimeout(2000);
    await transferViaAgent(agent2Page, 'User1 Agent1');
    incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 20000 });
    await agent1Page.waitForTimeout(2000);
    await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
    await waitForState(agent1Page, USER_STATES.ENGAGED);
    await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);
    await agent1Page.waitForTimeout(2000);
    await submitWrapup(agent2Page, WRAPUP_REASONS.SALE);
    await agent1Page.getByTestId('call-control:end-call').first().click();
    await agent1Page.waitForTimeout(3000);
    await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
  });

  test('Consult with another agent and transfer the call, do it again from the other agent', async () => {
    await changeUserState(agent1Page, USER_STATES.AVAILABLE);
    await changeUserState(agent2Page, USER_STATES.MEETING);
    await createCallTask(callerPage);
    let incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await agent1Page.waitForTimeout(2000);
    await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
    await changeUserState(agent2Page, USER_STATES.AVAILABLE);
    await waitForState(agent1Page, USER_STATES.ENGAGED);
    await waitForState(agent2Page, USER_STATES.AVAILABLE);
    await consultViaAgent(agent1Page, 'User2 Agent2');
    incomingTaskDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 20000 });
    await agent2Page.waitForTimeout(2000);
    await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
    await waitForState(agent2Page, USER_STATES.ENGAGED);
    await agent1Page.getByTestId('transfer-consult-btn').click();
    await agent1Page.waitForTimeout(5000);

    await agent1Page.getByTestId('wrapup-button').first().waitFor({ state: 'visible', timeout: 5000 });
    await agent1Page.waitForTimeout(2000);
    await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
    await waitForState(agent1Page, USER_STATES.AVAILABLE);
    await consultViaAgent(agent2Page, 'User1 Agent1');
    await agent1Page.getByTestId('samples:incoming-task-telephony').first().waitFor({ state: 'visible', timeout: 20000 });
    await agent1Page.waitForTimeout(2000);
    await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
    await waitForState(agent1Page, USER_STATES.ENGAGED);
    await agent2Page.getByTestId('transfer-consult-btn').click();
    await agent2Page.waitForTimeout(3000);
    await agent2Page.getByTestId('wrapup-button').first().waitFor({ state: 'visible', timeout: 5000 });
    await agent2Page.waitForTimeout(2000);
    await submitWrapup(agent2Page, WRAPUP_REASONS.SALE);
    await waitForState(agent2Page, USER_STATES.AVAILABLE);
    await agent1Page.getByTestId('call-control:end-call').first().click();
    await agent1Page.waitForTimeout(2000);
    await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
    await agent1Page.waitForTimeout(2000);
  })

  test('Consult with another agent, transfer the call and transfer the call back to the agent', async () => {
    await changeUserState(agent1Page, USER_STATES.AVAILABLE);
    await changeUserState(agent2Page, USER_STATES.MEETING);
    await createCallTask(callerPage);
    let incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await agent1Page.waitForTimeout(2000);
    await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
    await changeUserState(agent2Page, USER_STATES.AVAILABLE);
    await waitForState(agent1Page, USER_STATES.ENGAGED);
    await waitForState(agent2Page, USER_STATES.AVAILABLE);
    await consultViaAgent(agent1Page, 'User2 Agent2');
    incomingTaskDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 20000 });
    await agent2Page.waitForTimeout(2000);
    await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
    await waitForState(agent2Page, USER_STATES.ENGAGED);
    await agent1Page.getByTestId('transfer-consult-btn').click();
    await agent1Page.waitForTimeout(2000);
    await agent1Page.getByTestId('wrapup-button').first().waitFor({ state: 'visible', timeout: 5000 });
    await agent1Page.waitForTimeout(2000);
    await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
    await waitForState(agent1Page, USER_STATES.AVAILABLE);

    await transferViaAgent(agent2Page, 'User1 Agent1');
    incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({
      state: 'visible', timeout: 20000
    });
    await agent1Page.waitForTimeout(2000);
    await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
    await waitForState(agent1Page, USER_STATES.ENGAGED);
    await agent2Page.waitForTimeout(2000);
    await agent2Page.getByTestId('wrapup-button').first().waitFor({ state: 'visible', timeout: 5000 });
    await agent2Page.waitForTimeout(2000);
    await submitWrapup(agent2Page, WRAPUP_REASONS.SALE);
    await waitForState(agent2Page, USER_STATES.AVAILABLE);
    await agent1Page.getByTestId('call-control:end-call').first().click();
    await agent1Page.waitForTimeout(2000);
    await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
    await agent1Page.waitForTimeout(2000);
  })


  test('Transfer the call to another agent & then consult from the other agent', async () => {
    await changeUserState(agent2Page, USER_STATES.MEETING);
    await changeUserState(agent1Page, USER_STATES.AVAILABLE);
    await createCallTask(callerPage, process.env.PW_DIAL_NUMBER);
    let incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 40000 });
    await agent1Page.waitForTimeout(2000);
    await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
    await waitForState(agent1Page, USER_STATES.ENGAGED);
    await changeUserState(agent2Page, USER_STATES.AVAILABLE);
    await agent1Page.waitForTimeout(2000);
    await transferViaAgent(agent1Page, 'User2 Agent2');
    await agent2Page.getByTestId('samples:incoming-task-telephony').first().waitFor({ state: 'visible', timeout: 20000 });
    await agent2Page.waitForTimeout(2000);
    await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
    await waitForState(agent2Page, USER_STATES.ENGAGED);
    await agent1Page.waitForTimeout(2000);
    await agent1Page.getByTestId('wrapup-button').first().waitFor({ state: 'visible', timeout: 5000 });
    await agent1Page.waitForTimeout(2000);
    await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
    await waitForState(agent1Page, USER_STATES.AVAILABLE);
    await consultViaAgent(agent2Page, 'User1 Agent1');
    incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({
      state: 'visible', timeout: 20000
    });
    await agent1Page.waitForTimeout(2000);
    await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
    await waitForState(agent1Page, USER_STATES.ENGAGED);
    await agent2Page.getByTestId('transfer-consult-btn').click();
    await agent2Page.getByTestId('wrapup-button').first().waitFor({ state: 'visible', timeout: 5000 });
    await agent2Page.waitForTimeout(2000);
    await submitWrapup(agent2Page, WRAPUP_REASONS.SALE);
    await waitForState(agent2Page, USER_STATES.AVAILABLE);
    await agent1Page.getByTestId('call-control:end-call').first().click();
    await agent1Page.waitForTimeout(2000);
    await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
    await agent1Page.waitForTimeout(2000);
  });

  test('Multi-Stage Consult and Transfer Between A1 and A2', async () => {
    await changeUserState(agent2Page, USER_STATES.MEETING);
    await createCallTask(callerPage);
    const incomingTaskDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
    await incomingTaskDiv.waitFor({ state: 'visible', timeout: 120000 });
    await agent1Page.waitForTimeout(3000);
    await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
    await changeUserState(agent2Page, USER_STATES.AVAILABLE);
    await agent1Page.waitForTimeout(5000);
    await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);
    await consultViaAgent(agent1Page, 'User2 Agent2');
    const consultRequestDiv = agent2Page.getByTestId('samples:incoming-task-telephony').first();
    await consultRequestDiv.waitFor({ state: 'visible', timeout: 60000 });
    await agent2Page.waitForTimeout(3000);
    await acceptIncomingTask(agent2Page, TASK_TYPES.CALL);
    await agent2Page.waitForTimeout(3000);
    await verifyCurrentState(agent2Page, USER_STATES.ENGAGED);
    await agent1Page.getByTestId('transfer-consult-btn').click();
    await agent1Page.waitForTimeout(2000);
    await submitWrapup(agent1Page, WRAPUP_REASONS.SALE);
    await agent2Page.waitForTimeout(3000);
    await verifyCurrentState(agent2Page, USER_STATES.ENGAGED);
    await consultViaAgent(agent2Page, 'User1 Agent1');
    const returnConsultDiv = agent1Page.getByTestId('samples:incoming-task-telephony').first();
    await returnConsultDiv.waitFor({ state: 'visible', timeout: 60000 });
    await agent1Page.waitForTimeout(3000);
    await acceptIncomingTask(agent1Page, TASK_TYPES.CALL);
    await agent1Page.waitForTimeout(3000);
    await agent2Page.getByTestId('transfer-consult-btn').click();
    await agent2Page.waitForTimeout(2000);
    await submitWrapup(agent2Page, WRAPUP_REASONS.RESOLVED);
    await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);
    await consultViaAgent(agent1Page, 'User2 Agent2');
    await expect(agent1Page.getByTestId('cancel-consult-btn')).toBeVisible();
    await expect(agent1Page.getByTestId('transfer-consult-btn')).toBeVisible();
    await cancelConsult(agent1Page);
    await expect(agent1Page.getByRole('group', { name: 'Call Control with Call' })).toBeVisible();
    await verifyCurrentState(agent1Page, USER_STATES.ENGAGED);
    await endTask(agent1Page);
    await agent1Page.waitForTimeout(3000);
    await submitWrapup(agent1Page, WRAPUP_REASONS.RESOLVED);
    await agent1Page.waitForTimeout(2000);
  });

});