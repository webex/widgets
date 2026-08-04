import {test, expect} from '@playwright/test';
import {TestManager} from '../test-manager';
import {changeUserState, verifyCurrentState, getCurrentState} from '../Utils/userStateUtils';
import {createCallTask, acceptIncomingTask} from '../Utils/incomingTaskUtils';
import {endTask} from '../Utils/taskControlUtils';
import {submitWrapup} from '../Utils/wrapupUtils';
import {waitForRealTimeTranscriptPanel, waitForFirstTranscriptEntry} from '../Utils/realTimeTranscriptUtils';
import {USER_STATES, TASK_TYPES, WRAPUP_REASONS, ACCEPT_TASK_TIMEOUT} from '../constants';

const {beforeAll, afterAll} = test;

/**
 * Real-Time Transcript e2e coverage.
 *
 * Transcript text is produced by a live speech-to-text pipeline from the
 * call's dummy audio, so these tests assert that the panel renders and that
 * entries eventually appear, rather than asserting on exact transcribed
 * text.
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

  test('Live transcript entries appear as the call progresses', async () => {
    const firstEntry = await waitForFirstTranscriptEntry(testManager.agent1Page);
    await expect(firstEntry).toBeVisible();

    const entryText = (await firstEntry.innerText()).trim();
    expect(entryText.length).toBeGreaterThan(0);
  });
}
