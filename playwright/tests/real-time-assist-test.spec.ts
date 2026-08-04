import {test, expect} from '@playwright/test';
import {TestManager} from '../test-manager';
import {changeUserState, verifyCurrentState, getCurrentState} from '../Utils/userStateUtils';
import {createCallTask, acceptIncomingTask} from '../Utils/incomingTaskUtils';
import {endTask} from '../Utils/taskControlUtils';
import {submitWrapup} from '../Utils/wrapupUtils';
import {
  enableAIAssistantWidget,
  openAIAssistant,
  isShowingLanding,
  requestRealTimeAssistSuggestions,
  waitForFirstSuggestion,
  clickSuggestionFeedback,
  clickSuggestionCopy,
} from '../Utils/aiAssistantUtils';
import {USER_STATES, TASK_TYPES, WRAPUP_REASONS, ACCEPT_TASK_TIMEOUT} from '../constants';

const {beforeAll, afterAll} = test;

/**
 * AI Assistant (Real-Time Assist) e2e coverage.
 *
 * Suggestion content is produced by a live AI pipeline from the call's dummy
 * audio, so these tests assert on structure and state transitions (landing
 * vs. chat, spinner clearing, feedback controls toggling) rather than exact
 * suggestion text.
 */
export default function createRealTimeAssistTests() {
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

  test('AI Assistant launcher is visible and shows the landing page before a call starts', async () => {
    await changeUserState(testManager.agent1Page, USER_STATES.AVAILABLE);
    await verifyCurrentState(testManager.agent1Page, USER_STATES.AVAILABLE);

    // AI Assistant defaults to disabled in the sample app; enable it explicitly.
    await enableAIAssistantWidget(testManager.agent1Page);
    await expect(testManager.agent1Page.getByTestId('ai-assistant:launcher')).toBeVisible();

    await openAIAssistant(testManager.agent1Page);
    expect(await isShowingLanding(testManager.agent1Page)).toBe(true);

    // Leave the panel open; it should switch away from the landing page once a call starts.
  });

  test('AI Assistant switches from landing to the request view once a call is active', async () => {
    await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
    await acceptIncomingTask(testManager.agent1Page, TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
    await testManager.agent1Page.waitForTimeout(5000);
    await verifyCurrentState(testManager.agent1Page, USER_STATES.ENGAGED);

    await openAIAssistant(testManager.agent1Page);
    await expect(testManager.agent1Page.getByTestId('ai-assistant:landing')).not.toBeVisible({timeout: 10000});
    await expect(testManager.agent1Page.getByTestId('ai-assistant:get-suggestions')).toBeVisible();
  });

  test('Requesting suggestions moves the panel into listening mode and renders a suggestion', async () => {
    await requestRealTimeAssistSuggestions(testManager.agent1Page);

    // Once the very first request succeeds, the panel should never fall back
    // to the empty/get-suggestions state, and a context input should appear.
    await expect(testManager.agent1Page.getByTestId('ai-assistant:context-form')).toBeVisible({timeout: 10000});
    await expect(testManager.agent1Page.getByTestId('ai-assistant:get-suggestions')).not.toBeVisible();

    const suggestion = await waitForFirstSuggestion(testManager.agent1Page);
    await expect(suggestion).toBeVisible();
  });

  test('Like/dislike feedback controls are mutually exclusive and toggle on click', async () => {
    const likeControl = await clickSuggestionFeedback(testManager.agent1Page, 'like');
    await expect(likeControl).toHaveAttribute('data-active', 'true');

    const dislikeControl = await clickSuggestionFeedback(testManager.agent1Page, 'dislike');
    await expect(dislikeControl).toHaveAttribute('data-active', 'true');
    await expect(likeControl).not.toHaveAttribute('data-active', 'true');

    // Re-clicking the active control clears the selection.
    await dislikeControl.click();
    await expect(dislikeControl).not.toHaveAttribute('data-active', 'true');
  });

  test('Copy control can be clicked without error', async () => {
    const copyControl = await clickSuggestionCopy(testManager.agent1Page);
    await expect(copyControl).toBeVisible();
  });
}
