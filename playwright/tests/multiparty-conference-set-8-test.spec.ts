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
  ACCEPT_TASK_TIMEOUT,
  CONFERENCE_ACTION_SETTLE_TIMEOUT,
  CONFERENCE_SWITCH_TOGGLE_TIMEOUT,
  CONFERENCE_END_TASK_SETTLE_TIMEOUT,
  TASK_TYPES,
  USER_STATES,
  WRAPUP_REASONS,
} from '../constants';

type AgentId = 1 | 2 | 3 | 4;

const AGENT_IDS: AgentId[] = [1, 2, 3, 4];

export default function createMultipartyConferenceSet8Tests() {
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
      await changeUserState(getAgentPage(agentId), USER_STATES.AVAILABLE);
    }
  };

  const cleanSlate = async () => {
    for (const agentId of AGENT_IDS) {
      await handleStrayTasks(getAgentPage(agentId), testManager.callerPage);
    }
    await handleStrayTasks(testManager.callerPage);
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
    await consultOrTransfer(getAgentPage(fromAgent), 'agent', 'consult', getAgentName(toAgent));
    await acceptIncomingTask(getAgentPage(toAgent), TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
    await verifyCurrentState(getAgentPage(toAgent), USER_STATES.ENGAGED);
  };

  const consultQueueAndAccept = async (fromAgent: AgentId, toAgent: AgentId) => {
    await setAgentsAvailable([toAgent]);
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

  const leaveConference = async (agentId: AgentId) => {
    const page = getAgentPage(agentId);
    const exitButton = page.getByTestId('call-control:exit-conference').first();
    const canExit = await exitButton.isVisible().catch(() => false);

    if (canExit) {
      await exitButton.click();
      await page.waitForTimeout(CONFERENCE_ACTION_SETTLE_TIMEOUT);
      return;
    }

    await endTask(page);
    await page.waitForTimeout(CONFERENCE_END_TASK_SETTLE_TIMEOUT);
    await submitWrapup(page, WRAPUP_REASONS.SALE);
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

  test.describe('TRANSFER CONFERENCE SCENARIOS - Set 8', () => {
    test('CTS-TC-09 should support queue consult accepted by available agent and resumed main call', async () => {
      await startCallOnAgent1();
      await setAgentsAvailable([2]);

      await consultQueueAndAccept(1, 2);
      await cancelConsult(getAgentPage(1));
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
    });

    test('CTS-TC-10 should show wrapup when customer ends during queue consult', async () => {
      await startCallOnAgent1();
      await setAgentsAvailable([2]);

      await consultOrTransfer(getAgentPage(1), 'queue', 'consult', getRequiredEnv('QUEUE_NAME'));
      await endCallTask(testManager.callerPage, true);

      await expect(getAgentPage(1).getByTestId('call-control:wrapup-button')).toBeVisible({timeout: ACCEPT_TASK_TIMEOUT});
    });

    test('CTS-TC-11 should allow agent1 to end consult and return to call', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await cancelConsult(getAgentPage(1));
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
    });

    test.skip('CTS-TC-12 should allow agent2 to end consult when isEndConsultEnabled flag is enabled', async () => {});

    test('CTS-TC-13 should consult to queue and transfer to connected target agent', async () => {
      await startCallOnAgent1();
      await setAgentsAvailable([2]);

      await consultQueueAndAccept(1, 2);
      await transferConsultInteraction(1);

      await verifyCurrentState(getAgentPage(2), USER_STATES.ENGAGED);
    });

    test('CTS-TC-14 and CTS-TC-15 should transfer back to agent1 via agent and queue paths', async () => {
      await startCallOnAgent1();
      await setAgentsAvailable([2]);

      await consultOrTransfer(getAgentPage(1), 'agent', 'transfer', getAgentName(2));
      await acceptIncomingTask(getAgentPage(2), TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
      await submitWrapup(getAgentPage(1), WRAPUP_REASONS.SALE);

      await setAgentsAvailable([1]);
      await consultOrTransfer(getAgentPage(2), 'queue', 'transfer', getRequiredEnv('QUEUE_NAME'));
      await acceptIncomingTask(getAgentPage(1), TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
      await submitWrapup(getAgentPage(2), WRAPUP_REASONS.SALE);

      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
    });

    test('CTS-TC-16 should chain add/remove/add participant flow without restarting call', async () => {
      await startCallOnAgent1();

      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);
      await consultAndAccept(1, 3);
      await mergeConsultIntoConference(1);

      await leaveConference(3);
      await consultAndAccept(1, 4);
      await mergeConsultIntoConference(1);
      await verifyCurrentState(getAgentPage(4), USER_STATES.ENGAGED);
    });

    test.skip('CTS-TC-17 should validate >4 agent transfer conference flows (future enable)', async () => {});
    test.skip('CTS-TC-18 should validate EPDN transfer conference handoff flow', async () => {});
  });

  test.describe('Switch Conference', () => {
    test.skip('CTS-SW-01 should switch conference via EP_DN handoff', async () => {});

    test('CTS-SW-02 should switch between consult leg and main conference leg', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);
      await consultAndAccept(1, 3);

      const switchButton = getAgentPage(1).getByTestId('switchToMainCall-consult-btn');
      await expect(switchButton).toBeVisible({timeout: ACCEPT_TASK_TIMEOUT});
      await switchButton.click();
      await getAgentPage(1).waitForTimeout(CONFERENCE_SWITCH_TOGGLE_TIMEOUT);
      await switchButton.click();
      await getAgentPage(1).waitForTimeout(CONFERENCE_SWITCH_TOGGLE_TIMEOUT);

      await mergeConsultIntoConference(1);
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
    });

    test('CTS-SW-03 should merge lobby participants into conference from consult state', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);
      await consultAndAccept(1, 3);
      await mergeConsultIntoConference(1);

      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);
      await verifyCurrentState(getAgentPage(3), USER_STATES.ENGAGED);
    });

    test('CTS-SW-04 should transfer from consult lobby to conference participant', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);
      await consultAndAccept(1, 3);
      await transferConsultInteraction(1);

      await verifyCurrentState(getAgentPage(2), USER_STATES.ENGAGED);
      await verifyCurrentState(getAgentPage(3), USER_STATES.ENGAGED);
    });

    test('CTS-SW-05 should block another agent consult while consult is active', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);

      await consultAndAccept(1, 3);
      const agent2Consult = getAgentPage(2).getByTestId('call-control:consult').first();
      const consultVisible = await agent2Consult.isVisible().catch(() => false);

      if (consultVisible) {
        await expect(agent2Consult).toBeDisabled();
      } else {
        expect(consultVisible).toBeFalsy();
      }
    });

    test('CTS-SW-06 should restore consult option after consult lobby closes', async () => {
      await startCallOnAgent1();
      await consultAndAccept(1, 2);
      await mergeConsultIntoConference(1);
      await consultAndAccept(1, 3);
      await mergeConsultIntoConference(1);

      const agent2Consult = getAgentPage(2).getByTestId('call-control:consult').first();
      await expect(agent2Consult).toBeVisible({timeout: ACCEPT_TASK_TIMEOUT});
    });

    test('CTS-SW-07 should keep queue-based switch flow stable with consult cancel/accept actions', async () => {
      await startCallOnAgent1();
      await setAgentsAvailable([2]);

      await consultQueueAndAccept(1, 2);
      await cancelConsult(getAgentPage(1));
      await verifyCurrentState(getAgentPage(1), USER_STATES.ENGAGED);

      await consultQueueAndAccept(1, 2);
      await mergeConsultIntoConference(1);
      await verifyCurrentState(getAgentPage(2), USER_STATES.ENGAGED);
    });

    test.skip('CTS-SW-08 should validate switch conference flows with >4 agents', async () => {});
  });
}
