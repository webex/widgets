import {test, expect, Page} from '@playwright/test';
import {TestManager} from '../test-manager';
import {changeUserState, verifyCurrentState} from '../Utils/userStateUtils';
import {
  createCallTask,
  acceptIncomingTask,
  declineIncomingTask,
  endCallTask,
  waitForIncomingTask,
} from '../Utils/incomingTaskUtils';
import {consultOrTransfer, cancelConsult} from '../Utils/advancedTaskControlUtils';
import {handleStrayTasks} from '../Utils/helperUtils';
import {endTask} from '../Utils/taskControlUtils';
import {submitWrapup} from '../Utils/wrapupUtils';
import {
  AWAIT_TIMEOUT,
  ACCEPT_TASK_TIMEOUT,
  CONFERENCE_ACTION_SETTLE_TIMEOUT,
  CONFERENCE_SWITCH_TOGGLE_TIMEOUT,
  CONFERENCE_END_TASK_SETTLE_TIMEOUT,
  CONFERENCE_CUSTOMER_DISCONNECT_TIMEOUT,
  CONFERENCE_RECONNECT_SETTLE_TIMEOUT,
  CONSULT_NO_ANSWER_TIMEOUT,
  WRAPUP_TIMEOUT,
  TASK_TYPES,
  USER_STATES,
  WRAPUP_REASONS,
} from '../constants';

type AgentId = 1 | 2 | 3 | 4;

const AGENT_IDS: AgentId[] = [1, 2, 3, 4];
const CLEAN_SLATE_TASK_TIMEOUT = 60000;

export default function createMultipartyConferenceSet7Tests() {
  let testManager: TestManager;

  const getAgentPage = (agentId: AgentId): Page => {
    switch (agentId) {
      case 1:
        return testManager.agent1Page;
      case 2:
        return testManager.agent2Page;
      case 3:
        return testManager.agent3Page;
      case 4:
        return testManager.agent4Page;
      default:
        throw new Error(`Unsupported agentId: ${agentId}`);
    }
  };

  const getRequiredEnv = (suffix: string): string => {
    const value = process.env[`${testManager.projectName}_${suffix}`];
    if (!value) {
      throw new Error(`Missing env key: ${testManager.projectName}_${suffix}`);
    }
    return value;
  };

  const getAgentName = (agentId: AgentId): string => getRequiredEnv(`AGENT${agentId}_NAME`);

  const safeHandleStrayTasks = async (page?: Page, auxiliaryPage?: Page) => {
    if (!page || page.isClosed()) {
      return;
    }
    const validAuxiliaryPage = auxiliaryPage && !auxiliaryPage.isClosed() ? auxiliaryPage : undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('cleanSlate timeout')), CLEAN_SLATE_TASK_TIMEOUT);
    });

    try {
      await Promise.race([handleStrayTasks(page, validAuxiliaryPage), timeoutPromise]);
    } catch {
      // Ignore cleanup errors/timeouts to keep suite progression deterministic.
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  };

  // Baseline helper: use before creating a call to force deterministic routing state.
  const setBaselineAvailability = async (availableAgents: AgentId[]) => {
    for (const agentId of AGENT_IDS) {
      const page = getAgentPage(agentId);
      const state = availableAgents.includes(agentId) ? USER_STATES.AVAILABLE : USER_STATES.MEETING;
      await changeUserState(page, state);
    }
  };

  // Mid-call helper: only change specified agents; do not force others to MEETING.
  const setAgentsAvailable = async (agentIds: AgentId[]) => {
    for (const agentId of agentIds) {
      const page = getAgentPage(agentId);
      await changeUserState(page, USER_STATES.AVAILABLE);
      await verifyCurrentState(page, USER_STATES.AVAILABLE);
    }
  };

  const waitForControlReady = async (agentId: AgentId, controlTestId: string) => {
    const control = getAgentPage(agentId).getByTestId(controlTestId).first();
    await expect(control).toBeVisible({timeout: ACCEPT_TASK_TIMEOUT});
    await expect(control).toBeEnabled({timeout: ACCEPT_TASK_TIMEOUT});
  };

  // TODO: Workaround — clicking getMediaStreams re-enables the Make Call button
  // after a previous call ends. Without this, Make Call stays disabled between tests.
  const resetCallerPage = async () => {
    const callerPage = testManager.callerPage;
    if (!callerPage || callerPage.isClosed()) return;
    const endBtn = callerPage.getByTestId('end');
    const isEnabled = await endBtn.isEnabled({timeout: 1000}).catch(() => false);
    if (isEnabled) {
      await endBtn.click({timeout: AWAIT_TIMEOUT});
      await callerPage.waitForTimeout(1000);
    }
    await callerPage.locator('#sd-get-media-streams').click({timeout: AWAIT_TIMEOUT});
    await callerPage.waitForTimeout(500);
  };

  const cleanSlate = async () => {
    await resetCallerPage();
    // Clean agents sequentially — they share the same call, so parallel
    // cleanup causes race conditions (e.g., ending caller while agent
    // is still in conference triggers unexpected state transitions).
    for (const agentId of AGENT_IDS) {
      await safeHandleStrayTasks(getAgentPage(agentId), testManager.callerPage);
    }
    await safeHandleStrayTasks(testManager.callerPage);
  };

  const startCallOnAgent1 = async () => {
    const entryPoint = getRequiredEnv('ENTRY_POINT');
    await setBaselineAvailability([1]);
    await createCallTask(testManager.callerPage, entryPoint);
    await acceptIncomingTask(getAgentPage(1), TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
    await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
  };

  const consultAndAccept = async (fromAgent: AgentId, toAgent: AgentId) => {
    await setAgentsAvailable([toAgent]);
    await waitForControlReady(fromAgent, 'call-control:consult');
    await consultOrTransfer(getAgentPage(fromAgent), 'agent', 'consult', getAgentName(toAgent));
    await acceptIncomingTask(getAgentPage(toAgent), TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
    await verifyCurrentState(getAgentPage(toAgent), USER_STATES.ENGAGED);
  };

  const consultQueueAndAccept = async (fromAgent: AgentId, toAgent: AgentId) => {
    await setAgentsAvailable([toAgent]);
    await waitForControlReady(fromAgent, 'call-control:consult');
    await consultOrTransfer(getAgentPage(fromAgent), 'queue', 'consult', getRequiredEnv('QUEUE_NAME'));
    await acceptIncomingTask(getAgentPage(toAgent), TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
    await verifyCurrentState(getAgentPage(toAgent), USER_STATES.ENGAGED);
  };

  const mergeConsultIntoConference = async (fromAgent: AgentId) => {
    const page = getAgentPage(fromAgent);
    const mergeButton = page.getByTestId('conference-consult-btn');
    await expect(mergeButton).toBeVisible({timeout: ACCEPT_TASK_TIMEOUT});
    await mergeButton.click();
    await page.waitForTimeout(CONFERENCE_ACTION_SETTLE_TIMEOUT);
  };

  const transferConsultInteraction = async (fromAgent: AgentId) => {
    const page = getAgentPage(fromAgent);
    await expect(page.getByTestId('transfer-consult-btn')).toBeVisible({timeout: ACCEPT_TASK_TIMEOUT});
    await page.getByTestId('transfer-consult-btn').click();
    await page.waitForTimeout(CONFERENCE_ACTION_SETTLE_TIMEOUT);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
  };

  const toggleSwitchLegIfVisible = async (agentId: AgentId) => {
    const page = getAgentPage(agentId);
    const switchButton = page.getByTestId('switchToMainCall-consult-btn');
    const canToggle = await switchButton.isVisible().catch(() => false);
    if (!canToggle) {
      return false;
    }
    await switchButton.click();
    await page.waitForTimeout(CONFERENCE_SWITCH_TOGGLE_TIMEOUT);
    return true;
  };

  const leaveConference = async (agentId: AgentId) => {
    const page = getAgentPage(agentId);
    const exitButton = page.getByTestId('call-control:exit-conference').first();
    const canExit = await exitButton.isVisible().catch(() => false);

    if (canExit) {
      await exitButton.click();
      await page.waitForTimeout(CONFERENCE_ACTION_SETTLE_TIMEOUT);
      // After exit-conference, the agent may or may not enter wrapup
      // depending on whether they are the conference owner. Submit wrapup
      // if the wrapup box appears so the ownership handoff completes.
      const wrapupBox = page.getByTestId('call-control:wrapup-button').first();
      const needsWrapup = await wrapupBox
        .waitFor({state: 'visible', timeout: WRAPUP_TIMEOUT})
        .then(() => true)
        .catch(() => false);
      if (needsWrapup) {
        await submitWrapup(page, WRAPUP_REASONS.SALE);
      }
      return;
    }

    await endTask(page);
    await page.waitForTimeout(CONFERENCE_END_TASK_SETTLE_TIMEOUT);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
  };

  const expectPostCustomerLeaveControls = async (agentId: AgentId) => {
    const page = getAgentPage(agentId);
    // Depending on backend event ordering, agent may see either active end-call controls
    // or transition directly into wrapup after customer disconnect.
    await expect
      .poll(
        async () => {
          const hasEnd = await page
            .getByTestId('call-control:end-call')
            .first()
            .isVisible()
            .catch(() => false);
          const hasWrapup = await page
            .getByTestId('call-control:wrapup-button')
            .first()
            .isVisible()
            .catch(() => false);
          return hasEnd || hasWrapup;
        },
        {timeout: ACCEPT_TASK_TIMEOUT, intervals: [CONFERENCE_CUSTOMER_DISCONNECT_TIMEOUT]}
      )
      .toBeTruthy();
  };

  test.beforeAll(async ({browser}, testInfo) => {
    testManager = new TestManager(testInfo.project.name);
    await testManager.setupForMultipartyConference(browser);
  });

  test.beforeEach(async () => {
    await cleanSlate();
  });

  test.afterEach(async () => {
    await cleanSlate();
  });

  test.afterAll(async () => {
    if (testManager) {
      await testManager.cleanup();
    }
  });

  test.describe('Multi-Party Conference Feature Test Matrix', () => {
    test('CTS-MPC-01 and CTS-MPC-02 should initiate a 3-agent conference and continue after one participant leaves', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);
      await consultAndAccept(1, 3);
      await mergeConsultIntoConference(1);

      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
      await verifyCurrentState(getAgentPage(2), USER_STATES.ENGAGED);
      await verifyCurrentState(getAgentPage(3), USER_STATES.ENGAGED);

      await leaveConference(3);
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
      await verifyCurrentState(getAgentPage(2), USER_STATES.ENGAGED);
    });

    test('CTS-MPC-03 and CTS-MPC-04 should support owner handoff and participant replacement without restarting call', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);
      await consultAndAccept(1, 3);
      await mergeConsultIntoConference(1);

      await leaveConference(1);
      await verifyCurrentState(getAgentPage(2), USER_STATES.ENGAGED);

      await consultAndAccept(2, 4);
      await mergeConsultIntoConference(2);
      await verifyCurrentState(getAgentPage(2), USER_STATES.ENGAGED);
      await verifyCurrentState(getAgentPage(4), USER_STATES.ENGAGED);
    });

    test('CTS-MPC-05 should transfer conference to another available agent', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);

      await consultAndAccept(1, 3);
      await transferConsultInteraction(1);
      await verifyCurrentState(getAgentPage(2), USER_STATES.ENGAGED);
      await verifyCurrentState(getAgentPage(3), USER_STATES.ENGAGED);
    });

    test('CTS-MPC-06 should switch between consult and main conference call legs', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);
      await consultAndAccept(1, 3);

      const switchButton = getAgentPage(1).getByTestId('switchToMainCall-consult-btn');
      await expect(switchButton).toBeVisible({timeout: ACCEPT_TASK_TIMEOUT});
      const firstToggle = await toggleSwitchLegIfVisible(1);
      const secondToggle = await toggleSwitchLegIfVisible(1);
      expect(firstToggle || secondToggle).toBeTruthy();
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);

    });

    test('CTS-MPC-07, CTS-MPC-09 and CTS-MPC-10 should recover/rejoin after reconnect and handle customer leave', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);

      await getAgentPage(2).context().setOffline(true);
      await getAgentPage(2).waitForTimeout(CONFERENCE_ACTION_SETTLE_TIMEOUT);
      await getAgentPage(2).context().setOffline(false);
      await getAgentPage(2).waitForTimeout(CONFERENCE_RECONNECT_SETTLE_TIMEOUT);

      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
      await verifyCurrentState(getAgentPage(2), USER_STATES.ENGAGED);

      await endCallTask(testManager.callerPage, true);
      await expectPostCustomerLeaveControls(1);
    });

    test.skip('CTS-MPC-08 should validate conference participant limit (>4 agents required)', async () => {});
  });

  test.describe('TRANSFER CONFERENCE SCENARIOS - Set 7', () => {
    test('CTS-TC-01, CTS-TC-02 and CTS-TC-03 should handle blind transfer to agent, then queue transfer in one call session', async () => {
      await startCallOnAgent1();
      await setAgentsAvailable([2]);

      await consultOrTransfer(getAgentPage(1), 'agent', 'transfer', getAgentName(2));
      await acceptIncomingTask(getAgentPage(2), TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT * 2);
      await submitWrapup(getAgentPage(1), WRAPUP_REASONS.SALE);
      await verifyCurrentState(getAgentPage(2), USER_STATES.ENGAGED);

      await setAgentsAvailable([1]);
      await consultOrTransfer(getAgentPage(2), 'queue', 'transfer', getRequiredEnv('QUEUE_NAME'));
      await acceptIncomingTask(getAgentPage(1), TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT * 2);
      await submitWrapup(getAgentPage(2), WRAPUP_REASONS.SALE);

      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
    });

    test('CTS-TC-04 and CTS-TC-05 should run consult accepted and declined flows in one call session', async () => {
      await startCallOnAgent1();

      await consultAndAccept(1, 3);
      await cancelConsult(getAgentPage(3));
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);

      await consultOrTransfer(getAgentPage(1), 'agent', 'consult', getAgentName(3));
      await waitForIncomingTask(getAgentPage(3), TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
      await declineIncomingTask(getAgentPage(3), TASK_TYPES.CALL);
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
    });

    // Split: queue routing won't re-route to an agent who RONA'd in the same session
    test('CTS-TC-06 should handle not-picked agent consult', async () => {
      await startCallOnAgent1();
      await setAgentsAvailable([2]);

      await consultOrTransfer(getAgentPage(1), 'agent', 'consult', getAgentName(2));
      await getAgentPage(1).waitForTimeout(CONSULT_NO_ANSWER_TIMEOUT);

      const cancelConsultButton = getAgentPage(1).getByTestId('cancel-consult-btn');
      const canCancelConsult = await cancelConsultButton.isVisible().catch(() => false);
      if (canCancelConsult) {
        await cancelConsult(getAgentPage(1));
      }
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
    });

    // Use agent 3 instead of agent 2 — queue routing won't re-route to an
    // agent who RONA'd (CTS-TC-06) in the same session.
    test('CTS-TC-07 should handle queue-consult cancel', async () => {
      await startCallOnAgent1();
      await consultQueueAndAccept(1, 3);
      await cancelConsult(getAgentPage(1));
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
    });

    // Use agent 3 instead of agent 2 — agent 2 RONA'd in CTS-TC-06 and may
    // not reliably receive consults for the remainder of the session.
    test('CTS-TC-08 should support multi-stage consult transfer between A1 and A3', async () => {
      await startCallOnAgent1();

      await consultAndAccept(1, 3);
      await transferConsultInteraction(1);
      await verifyCurrentState(getAgentPage(3), USER_STATES.ENGAGED);

      await safeHandleStrayTasks(getAgentPage(1), testManager.callerPage);
      await consultAndAccept(3, 1);
      await transferConsultInteraction(3);
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
    });
  });
}
