import {test, expect} from '@playwright/test';
import {TestManager} from '../test-manager';
import {changeUserState, verifyCurrentState, getCurrentState} from '../Utils/userStateUtils';
import {createCallTask, acceptIncomingTask} from '../Utils/incomingTaskUtils';
import {endTask} from '../Utils/taskControlUtils';
import {submitWrapup} from '../Utils/wrapupUtils';
import {
  waitForRealTimeTranscriptPanel,
  waitForTranscriptEntry,
  dispatchRealtimeTranscriptionEvent,
  locateMockTranscriptMessage,
  MOCK_TRANSCRIPT_CONVERSATION,
} from '../Utils/realTimeTranscriptUtils';
import {USER_STATES, TASK_TYPES, WRAPUP_REASONS, ACCEPT_TASK_TIMEOUT} from '../constants';

const {beforeAll, afterAll} = test;

/**
 * Real-Time Transcript e2e coverage.
 *
 * Transcript content normally comes from a live speech-to-text pipeline
 * running against the call's dummy audio, which is non-deterministic. To
 * verify the widget's rendering behaviour precisely - in particular that a
 * single utterance progressively fills in word by word as multiple
 * `REAL_TIME_TRANSCRIPTION` events arrive for the same `messageId`, for both
 * the agent and the caller - these tests inject a consistent, known mock
 * conversation directly via `store.handleRealtimeTranscription` (the same
 * method the SDK's real event listener calls) instead of relying on actual
 * transcribed speech. A separate, lightweight smoke test still checks that
 * the live pipeline itself produces *some* real entries, to catch a
 * regression in the SDK/backend wiring that the mock-driven tests wouldn't
 * detect (since they bypass the live pipeline entirely).
 */
export default function createRealTimeTranscriptTests() {
  let testManager: TestManager;

  beforeAll(async ({browser}, testInfo) => {
    const projectName = testInfo.project.name;
    testManager = new TestManager(projectName);
    await testManager.setupForRealTimeAssistAndTranscript(browser);
  });

  afterAll(async () => {
    const isStateWidgetVisible = await testManager.agent1Page
      .getByTestId('state-select')
      .isVisible()
      .catch(() => false);
    if (isStateWidgetVisible && (await getCurrentState(testManager.agent1Page)) === USER_STATES.ENGAGED) {
      await endTask(testManager.agent1Page).catch(() => {});
      await testManager.agent1Page.waitForTimeout(3000);
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED).catch(() => {});
    }
    if (testManager) {
      await testManager.cleanup();
    }
  });

  test('Real-Time Transcript panel is not rendered before a call starts', async () => {
    await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
    await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);

    await expect(testManager.agent1Page.getByTestId('real-time-transcript:root')).not.toBeVisible();
  });

  test('Real-Time Transcript panel renders once a call is active', async () => {
    await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
    await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
    await testManager.agent1Page.waitForTimeout(5000);
    await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

    await waitForRealTimeTranscriptPanel(testManager.agent1Page);
  });

  test('Live transcript pipeline smoke check: real transcription eventually arrives for both legs', async () => {
    // Runs before the mock-driven test below so `.first()` here can only
    // match a genuinely live-transcribed entry, not one of our injected
    // mock utterances.
    //
    // Both legs are transcribed off the same live, simultaneous call, so wait
    // for them concurrently rather than serially. Waiting serially doubles
    // the worst-case wall-clock time (up to 2x TRANSCRIPT_ENTRY_TIMEOUT)
    // before the second leg's wait even starts, which made this smoke check
    // needlessly sensitive to transient STT/runner latency.
    const [agentEntry, customerEntry] = await Promise.all([
      waitForTranscriptEntry(testManager.agent1Page, 'agent'),
      waitForTranscriptEntry(testManager.agent1Page, 'customer'),
    ]);

    await expect(agentEntry).toBeVisible();
    await expect(customerEntry).toBeVisible();
  });

  test('Transcript renders a single utterance word-by-word as REAL_TIME_TRANSCRIPTION events arrive, for both agent and caller', async () => {
    const page = testManager.agent1Page;
    const {agent, customer} = MOCK_TRANSCRIPT_CONVERSATION;
    const agentWords = agent.sentence.split(' ');
    const customerWords = customer.sentence.split(' ');

    const agentMessage = locateMockTranscriptMessage(page, 'agent', agentWords[0]);
    const customerMessage = locateMockTranscriptMessage(page, 'customer', customerWords[0]);

    // Drive both utterances forward one word at a time, interleaved, so we
    // also prove the two roles' progressive updates don't interfere with
    // each other (mirrors how a real conversation streams both legs at
    // once).
    const stepCount = Math.max(agentWords.length, customerWords.length);
    for (let step = 0; step < stepCount; step += 1) {
      if (step < agentWords.length) {
        const partialContent = agentWords.slice(0, step + 1).join(' ');
        await dispatchRealtimeTranscriptionEvent(page, {
          role: agent.role,
          content: partialContent,
          isFinal: step === agentWords.length - 1,
          messageId: agent.messageId,
        });
        await expect(agentMessage).toHaveText(partialContent);
      }

      if (step < customerWords.length) {
        const partialContent = customerWords.slice(0, step + 1).join(' ');
        await dispatchRealtimeTranscriptionEvent(page, {
          role: customer.role,
          content: partialContent,
          isFinal: step === customerWords.length - 1,
          messageId: customer.messageId,
        });
        await expect(customerMessage).toHaveText(partialContent);
      }
    }

    // Final state: each role shows exactly its own complete, known sentence.
    await expect(agentMessage).toHaveText(agent.sentence);
    await expect(customerMessage).toHaveText(customer.sentence);
  });
}
