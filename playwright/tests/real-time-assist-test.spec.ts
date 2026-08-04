import {test, expect} from '@playwright/test';
import {TestManager} from '../test-manager';
import {changeUserState, verifyCurrentState, getCurrentState} from '../Utils/userStateUtils';
import {createCallTask, acceptIncomingTask} from '../Utils/incomingTaskUtils';
import {endTask} from '../Utils/taskControlUtils';
import {submitWrapup, waitForWrapupAfterCallEnd} from '../Utils/wrapupUtils';
import {
  clickSuggestionCopy,
  closeAIAssistant,
  createMockRealTimeAssistPayload,
  dispatchSuggestedResponse,
  enableAIAssistantWidget,
  getActiveInteractionId,
  getRealTimeAssistFeedbackCalls,
  getRealTimeAssistRequestCalls,
  installRealTimeAssistBackendHarness,
  openAIAssistant,
  rejectNextRealTimeAssistFeedback,
  rejectNextRealTimeAssistRequest,
  requestRealTimeAssistSuggestions,
  resetAIAssistantForActiveInteraction,
  resolveNextRealTimeAssistFeedback,
  resolveNextRealTimeAssistRequest,
  restoreRealTimeAssistBackend,
  setSuggestedResponsesEnabled,
  waitForFirstSuggestion,
} from '../Utils/aiAssistantUtils';
import {
  USER_STATES,
  TASK_TYPES,
  WRAPUP_REASONS,
  ACCEPT_TASK_TIMEOUT,
  AI_ASSIST_SUGGESTION_TIMEOUT,
} from '../constants';

const {beforeAll, afterAll} = test;
const MOCK_REQUEST_ERROR = 'E2E mock assistance request failed';
const MOCK_FEEDBACK_ERROR = 'E2E mock feedback request failed';
const CONTEXT_TEXT = 'The customer has already reset the password twice';
const CLEANUP_SENTINEL_TITLE = 'Task cleanup sentinel response';

/**
 * AI Assistant (Real Time Assist) end-to-end coverage.
 *
 * Most scenarios control the SDK promises and inject `SUGGESTED_RESPONSE`
 * payloads through the real store handler. This makes every intermediate UI
 * transition deterministic while still exercising the production widget,
 * MobX store, Adaptive Card renderer, and browser event handling. The final
 * scenario restores the real SDK and retains a live-backend smoke check.
 */
export default function createRealTimeAssistTests() {
  test.describe.configure({mode: 'serial'});

  let testManager: TestManager;
  let interactionId: string;

  beforeAll(async ({browser}, testInfo) => {
    testManager = new TestManager(testInfo.project.name);
    await testManager.setupForRealTimeAssistAndTranscript(browser);
  });

  afterAll(async () => {
    if (!testManager) return;
    await restoreRealTimeAssistBackend(testManager.agent1Page).catch(() => {});
    const isStateWidgetVisible = await testManager.agent1Page
      .getByTestId('state-select')
      .isVisible()
      .catch(() => false);
    if (isStateWidgetVisible && (await getCurrentState(testManager.agent1Page)) === USER_STATES.ENGAGED) {
      await endTask(testManager.agent1Page).catch(() => {});
      await waitForWrapupAfterCallEnd(testManager.agent1Page).catch(() => {});
      await submitWrapup(testManager.agent1Page, WRAPUP_REASONS.RESOLVED).catch(() => {});
    }
    await testManager.cleanup();
  });

  test('renders the no-interaction landing state and applies every launcher/header click transition', async () => {
    const page = testManager.agent1Page;
    await changeUserState(page, USER_STATES.AVAILABLE);
    await verifyCurrentState(page, USER_STATES.AVAILABLE);
    await enableAIAssistantWidget(page);

    await expect(page.getByTestId('ai-assistant:launcher')).toBeVisible();
    await expect(page.getByTestId('ai-assistant:panel')).not.toBeVisible();

    await openAIAssistant(page);
    await expect(page.getByRole('dialog', {name: 'Cisco AI Assistant'})).toBeVisible();
    await expect(page.getByTestId('ai-assistant:launcher')).not.toBeVisible();
    await expect(page.getByTestId('ai-assistant:landing')).toContainText("I'm your AI Assistant");
    await expect(page.getByText('Real-time Assist', {exact: true})).toBeVisible();
    await expect(page.getByText('Wellness breaks', {exact: true})).toBeVisible();
    await expect(page.getByText('Smart summaries', {exact: true})).toBeVisible();
    await expect(page.getByTestId('ai-assistant:empty')).not.toBeVisible();
    await expect(page.getByTestId('ai-assistant:footer')).not.toBeVisible();

    await page.getByTestId('ai-assistant:header-fullscreen').click();
    await expect(page.getByTestId('ai-assistant:panel')).toHaveClass(/ai-assistant__panel--full-screen/);
    await expect(page.getByTestId('ai-assistant:root')).toHaveClass(/ai-assistant--host-full/);
    await expect(page.getByRole('button', {name: 'Exit full screen'})).toBeVisible();

    await page.getByTestId('ai-assistant:header-fullscreen').click();
    await expect(page.getByTestId('ai-assistant:panel')).not.toHaveClass(/ai-assistant__panel--full-screen/);
    await expect(page.getByTestId('ai-assistant:root')).not.toHaveClass(/ai-assistant--host-full/);
    await expect(page.getByRole('button', {name: 'Full screen'})).toBeVisible();

    await page.getByTestId('ai-assistant:header-minimize').click();
    await expect(page.getByTestId('ai-assistant:panel-minimized')).toBeVisible();
    await expect(page.getByTestId('ai-assistant:panel')).not.toBeVisible();

    await page.getByTestId('ai-assistant:minimized-restore').click();
    await expect(page.getByTestId('ai-assistant:panel')).toBeVisible();
    await expect(page.getByTestId('ai-assistant:panel-minimized')).not.toBeVisible();

    await closeAIAssistant(page);
    await expect(page.getByTestId('ai-assistant:launcher')).toBeVisible();
    await expect(page.getByTestId('ai-assistant:panel')).not.toBeVisible();

    await openAIAssistant(page);
    await expect(page.getByTestId('ai-assistant:landing')).toBeVisible();
  });

  test('renders the correct feature-disabled and active-interaction request gates', async () => {
    const page = testManager.agent1Page;
    await createCallTask(testManager.callerPage!, process.env[`${testManager.projectName}_ENTRY_POINT`]!);
    await acceptIncomingTask(page, TASK_TYPES.CALL, ACCEPT_TASK_TIMEOUT);
    await verifyCurrentState(page, USER_STATES.ENGAGED);
    interactionId = await getActiveInteractionId(page);

    await setSuggestedResponsesEnabled(page, false);
    await expect(page.getByTestId('ai-assistant:landing')).toBeVisible();
    await expect(page.getByText('Real-time Assist', {exact: true})).not.toBeVisible();
    await expect(page.getByText('Wellness breaks', {exact: true})).toBeVisible();
    await expect(page.getByTestId('ai-assistant:get-suggestions')).not.toBeVisible();
    await expect(page.getByTestId('ai-assistant:footer')).not.toBeVisible();

    await setSuggestedResponsesEnabled(page, true);
    await expect(page.getByTestId('ai-assistant:landing')).not.toBeVisible();
    await expect(page.getByTestId('ai-assistant:empty')).toContainText('Hi, Here is how I can help you');
    await expect(page.getByTestId('ai-assistant:get-suggestions')).toHaveText('Get Assistance');
    await expect(page.getByTestId('ai-assistant:context-form')).not.toBeVisible();
    await expect(page.getByTestId('ai-assistant:disclaimer')).toHaveText(
      'I can make mistakes, so check my responses.'
    );

    await installRealTimeAssistBackendHarness(page);
  });

  test('shows the pending and error states, then retries into greeting and listening', async () => {
    const page = testManager.agent1Page;
    const requestButton = page.getByTestId('ai-assistant:get-suggestions');

    await requestButton.click();
    await expect(page.getByTestId('ai-assistant:requesting')).toHaveAttribute('aria-label', 'Requesting suggestions');
    await expect(requestButton).not.toBeVisible();
    await expect(page.getByTestId('ai-assistant:context-form')).not.toBeVisible();

    let requestCalls = await getRealTimeAssistRequestCalls(page);
    expect(requestCalls).toHaveLength(1);
    expect(requestCalls[0]).toMatchObject({interactionId});
    expect(requestCalls[0]).not.toHaveProperty('context');
    expect(requestCalls[0].agentId).toBeTruthy();
    expect(requestCalls[0].actionTimeStamp).toEqual(expect.any(Number));

    await rejectNextRealTimeAssistRequest(page, MOCK_REQUEST_ERROR);
    await expect(page.getByTestId('ai-assistant:requesting')).not.toBeVisible();
    await expect(page.getByTestId('ai-assistant:error')).toHaveText(MOCK_REQUEST_ERROR);
    await expect(requestButton).toBeVisible();
    await expect(page.getByTestId('ai-assistant:context-form')).not.toBeVisible();

    await requestButton.click();
    await expect(page.getByTestId('ai-assistant:requesting')).toBeVisible();
    requestCalls = await getRealTimeAssistRequestCalls(page);
    expect(requestCalls).toHaveLength(2);
    expect(requestCalls[1]).toMatchObject({interactionId});
    expect(requestCalls[1]).not.toHaveProperty('context');

    await resolveNextRealTimeAssistRequest(page);
    await expect(page.getByTestId('ai-assistant:chat-greeting')).toContainText("I'm here to help!");
    await expect(page.getByTestId('ai-assistant:listening')).toHaveText('Listening');
    await expect(page.getByTestId('ai-assistant:context-form')).toBeVisible();
    await expect(requestButton).not.toBeVisible();
    await expect(page.getByTestId('ai-assistant:error')).not.toBeVisible();
  });

  test('renders pushed backend events, Adaptive Card controls, fallback text, and chronological order', async () => {
    const page = testManager.agent1Page;
    const later = createMockRealTimeAssistPayload({
      adaptiveCardId: 'e2e-card-later',
      title: 'Later suggested response',
      suggestion: 'I can help you regain access to your account.',
      publishTimestamp: 2000,
    });
    const earlier = createMockRealTimeAssistPayload({
      adaptiveCardId: 'e2e-card-earlier',
      title: 'Earlier fallback response',
      suggestion: 'Please confirm the email address associated with the account.',
      publishTimestamp: 1000,
    });
    earlier.data.adaptiveCard = 'invalid-adaptive-card';

    await dispatchSuggestedResponse(page, interactionId, later);
    const laterCard = page.getByTestId('ai-assistant:chat-assistant').filter({hasText: later.data.title});
    await expect(laterCard).toContainText(later.data.suggestion);
    await expect(laterCard.getByLabel('Like suggestion')).toBeVisible();
    await expect(laterCard.getByLabel('Dislike suggestion')).toBeVisible();
    await expect(laterCard.getByLabel('Copy suggestion')).toBeVisible();

    await dispatchSuggestedResponse(page, interactionId, earlier);
    await expect(page.getByTestId('ai-assistant:adaptive-card-fallback')).toHaveText(earlier.data.suggestion);

    const assistantEntries = page.getByTestId('ai-assistant:chat-assistant');
    await expect(assistantEntries).toHaveCount(2);
    await expect(assistantEntries.nth(0)).toContainText(earlier.data.title);
    await expect(assistantEntries.nth(1)).toContainText(later.data.title);
    await expect(page.getByTestId('ai-assistant:listening')).toHaveText('Listening');
  });

  test('submits additional context once, renders the user message, and displays the next backend response', async () => {
    const page = testManager.agent1Page;
    const contextInput = page.getByTestId('ai-assistant:context-input').locator('input');
    const submitButton = page.getByTestId('ai-assistant:context-submit');

    await contextInput.fill(CONTEXT_TEXT);
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(page.getByTestId('ai-assistant:chat-user')).toHaveText(CONTEXT_TEXT);
    await expect(submitButton).toBeDisabled();
    await expect(contextInput).toHaveValue('');

    let requestCalls = await getRealTimeAssistRequestCalls(page);
    expect(requestCalls).toHaveLength(3);
    expect(requestCalls[2]).toMatchObject({interactionId, context: CONTEXT_TEXT});

    await contextInput.press('Enter');
    requestCalls = await getRealTimeAssistRequestCalls(page);
    expect(requestCalls).toHaveLength(3);

    await resolveNextRealTimeAssistRequest(page);
    const refined = createMockRealTimeAssistPayload({
      adaptiveCardId: 'e2e-card-refined',
      title: 'Refined suggested response',
      suggestion: 'Since the password was already reset, let us verify the account lock status.',
      publishTimestamp: Date.now() + 1000,
    });
    await dispatchSuggestedResponse(page, interactionId, refined);
    await expect(page.getByTestId('ai-assistant:chat-assistant').filter({hasText: refined.data.title})).toContainText(
      refined.data.suggestion
    );

    const transcriptItems = page.locator(
      '[data-testid="ai-assistant:chat-user"], [data-testid="ai-assistant:chat-assistant"]'
    );
    const itemCount = await transcriptItems.count();
    await expect(transcriptItems.nth(itemCount - 2)).toContainText(CONTEXT_TEXT);
    await expect(transcriptItems.nth(itemCount - 1)).toContainText(refined.data.title);
  });

  test('sends feedback action payloads and updates controls only after backend success', async () => {
    const page = testManager.agent1Page;
    const card = page.getByTestId('ai-assistant:chat-assistant').filter({hasText: 'Later suggested response'});
    const like = card.getByLabel('Like suggestion');
    const dislike = card.getByLabel('Dislike suggestion');

    await like.click();
    await expect(like).not.toHaveAttribute('data-active', 'true');
    let feedbackCalls = await getRealTimeAssistFeedbackCalls(page);
    expect(feedbackCalls).toHaveLength(1);
    expect(feedbackCalls[0]).toMatchObject({
      interactionId,
      adaptiveCardId: 'e2e-card-later',
      actionId: 'likeButton',
      languageCode: 'en-US',
    });
    await resolveNextRealTimeAssistFeedback(page);
    await expect(like).toHaveAttribute('data-active', 'true');

    await dislike.click();
    await expect(dislike).not.toHaveAttribute('data-active', 'true');
    await expect(like).toHaveAttribute('data-active', 'true');
    feedbackCalls = await getRealTimeAssistFeedbackCalls(page);
    expect(feedbackCalls[1]).toMatchObject({adaptiveCardId: 'e2e-card-later', actionId: 'dislikeButton'});
    await rejectNextRealTimeAssistFeedback(page, MOCK_FEEDBACK_ERROR);
    await expect(dislike).not.toHaveAttribute('data-active', 'true');
    await expect(like).toHaveAttribute('data-active', 'true');

    await dislike.click();
    await resolveNextRealTimeAssistFeedback(page);
    await expect(dislike).toHaveAttribute('data-active', 'true');
    await expect(like).not.toHaveAttribute('data-active', 'true');

    const copy = await clickSuggestionCopy(page);
    await expect(copy).toHaveAttribute('data-copied', 'true');
    feedbackCalls = await getRealTimeAssistFeedbackCalls(page);
    expect(feedbackCalls[feedbackCalls.length - 1]).toMatchObject({
      adaptiveCardId: 'e2e-card-later',
      actionId: 'copyButton',
    });
    await resolveNextRealTimeAssistFeedback(page);
  });

  test('preserves the active transcript across close/reopen and passes a live SDK/backend smoke check after reset', async () => {
    const page = testManager.agent1Page;
    await closeAIAssistant(page);
    await expect(page.getByTestId('ai-assistant:launcher')).toBeVisible();
    await openAIAssistant(page);
    await expect(page.getByText('Refined suggested response', {exact: true})).toBeVisible();
    await expect(page.getByTestId('ai-assistant:chat-user')).toHaveText(CONTEXT_TEXT);

    await restoreRealTimeAssistBackend(page);
    await resetAIAssistantForActiveInteraction(page);
    await openAIAssistant(page);
    await expect(page.getByTestId('ai-assistant:get-suggestions')).toBeVisible();

    await requestRealTimeAssistSuggestions(page);
    await expect(page.getByTestId('ai-assistant:context-form')).toBeVisible({timeout: AI_ASSIST_SUGGESTION_TIMEOUT});
    const liveSuggestion = await waitForFirstSuggestion(page);
    await expect(liveSuggestion).toBeVisible();

    const cleanupSentinel = createMockRealTimeAssistPayload({
      adaptiveCardId: 'e2e-card-cleanup-sentinel',
      title: CLEANUP_SENTINEL_TITLE,
      suggestion: 'This known response must disappear when the active task ends.',
      publishTimestamp: Date.now() + 2000,
    });
    await dispatchSuggestedResponse(page, interactionId, cleanupSentinel);
    await expect(page.getByText(CLEANUP_SENTINEL_TITLE, {exact: true})).toBeVisible();
  });

  test('returns to landing and clears interaction content when the task ends', async () => {
    const page = testManager.agent1Page;
    await endTask(page);
    await expect(page.getByTestId('ai-assistant:landing')).toBeVisible({timeout: ACCEPT_TASK_TIMEOUT});
    await expect(page.getByTestId('ai-assistant:chat')).not.toBeVisible();
    await expect(page.getByText(CLEANUP_SENTINEL_TITLE, {exact: true})).not.toBeVisible();
    await expect
      .poll(
        () =>
          page.evaluate((endedInteractionId) => {
            const host = window as unknown as {
              store?: {realTimeAssist?: Record<string, unknown[]>};
            };
            return host.store?.realTimeAssist?.[endedInteractionId];
          }, interactionId),
        {timeout: ACCEPT_TASK_TIMEOUT}
      )
      .toBeUndefined();

    await waitForWrapupAfterCallEnd(page);
    await submitWrapup(page, WRAPUP_REASONS.RESOLVED);
  });
}
