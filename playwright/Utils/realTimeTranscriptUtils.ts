import {Page, Locator} from '@playwright/test';
import {TRANSCRIPT_ENTRY_TIMEOUT} from '../constants';

/**
 * Utility functions for exercising the Real-Time Transcript widget in e2e
 * tests.
 *
 * The live speech-to-text pipeline (driven by the call's dummy audio) is
 * non-deterministic, so `waitForTranscriptEntry` only verifies that *some*
 * real transcription eventually arrives (an integration smoke check).
 *
 * For precise, deterministic verification of how the widget renders
 * transcript content - in particular the word-by-word progressive rendering
 * of a single utterance as multiple `REAL_TIME_TRANSCRIPTION` events arrive
 * for the same `messageId` - use `dispatchRealtimeTranscriptionEvent` to
 * inject a known mock event directly into the store, the same way the SDK's
 * real event handler does. This requires the sample app's debug hook
 * `window.store` (see `widgets-samples/cc/samples-cc-react-app/src/App.tsx`)
 * and a currently active call (the transcript panel only mounts while
 * `store.currentTask` is set).
 *
 * @packageDocumentation
 */

/**
 * Waits for the Real-Time Transcript panel to be visible.
 * The panel only renders while `store.currentTask` exists (an active call).
 * @param page - The Playwright page object
 * @param timeout - Optional timeout override in ms
 */
export async function waitForRealTimeTranscriptPanel(page: Page, timeout: number = TRANSCRIPT_ENTRY_TIMEOUT) {
  const root = page.getByTestId('real-time-transcript:root');
  await root.waitFor({state: 'visible', timeout});
  return root;
}

export type TranscriptSpeakerRole = 'agent' | 'customer';

/**
 * Waits for a transcript entry to appear in the live transcript feed and
 * returns it.
 * @param page - The Playwright page object
 * @param role - Optional speaker leg to filter by (`data-speaker-role="agent"`
 * for the agent leg, `"customer"` for the caller leg). When omitted, waits
 * for the first entry of either role.
 * @returns Locator for the first matching transcript item
 */
export async function waitForTranscriptEntry(page: Page, role?: TranscriptSpeakerRole): Promise<Locator> {
  const selector = role
    ? `[data-testid="real-time-transcript:item"][data-speaker-role="${role}"]`
    : '[data-testid="real-time-transcript:item"]';
  const item = page.locator(selector).first();
  await item.waitFor({state: 'visible', timeout: TRANSCRIPT_ENTRY_TIMEOUT});
  return item;
}

/** SDK role values recognized by `getTranscriptSpeaker` in `task/src/helper.ts`. */
export type TranscriptionEventRole = 'agent' | 'caller';

/**
 * A single, consistent mock "conversation" used to deterministically verify
 * real-time transcript rendering. Sentences start with a distinctive,
 * clearly-synthetic token so they can never collide with whatever the live
 * speech-to-text pipeline happens to transcribe from the call's dummy audio
 * in the background.
 */
export const MOCK_TRANSCRIPT_CONVERSATION: Record<
  'agent' | 'customer',
  {messageId: string; role: TranscriptionEventRole; sentence: string}
> = {
  agent: {
    messageId: 'e2e-mock-agent-message-1',
    role: 'agent',
    sentence: 'AgentE2EMock thank you for calling support how can I help you today',
  },
  customer: {
    messageId: 'e2e-mock-customer-message-1',
    role: 'caller',
    sentence: 'CustomerE2EMock hi I am having trouble logging into my account',
  },
};

/**
 * Injects a single `REAL_TIME_TRANSCRIPTION` event by calling the store's
 * real event handler directly (`window.store.handleRealtimeTranscription`) -
 * the exact same method the SDK's live event listener invokes. Requires an
 * active call so `store.currentTask` is set and the transcript panel is
 * mounted.
 * @param page - The Playwright page object (must be the agent's page)
 * @param event - The mock transcription payload fields to send
 */
export async function dispatchRealtimeTranscriptionEvent(
  page: Page,
  event: {role: TranscriptionEventRole; content: string; isFinal: boolean; messageId: string; utteranceId?: string}
): Promise<void> {
  await page.evaluate((evt) => {
    const injectedStore = (
      window as unknown as {
        store?: {handleRealtimeTranscription?: (payload: unknown) => void};
      }
    ).store;

    if (!injectedStore?.handleRealtimeTranscription) {
      throw new Error(
        'window.store.handleRealtimeTranscription is not available - cannot inject a mock transcription event'
      );
    }

    injectedStore.handleRealtimeTranscription({
      agentId: 'e2e-agent',
      orgId: 'e2e-org',
      notifType: 'REAL_TIME_TRANSCRIPTION',
      notifDetails: {actionEvent: 'REAL_TIME_TRANSCRIPTION'},
      data: {
        content: evt.content,
        conversationId: 'e2e-conversation',
        isFinal: evt.isFinal,
        messageId: evt.messageId,
        orgId: 'e2e-org',
        publishTimestamp: Date.now(),
        role: evt.role,
        trackingId: 'e2e-tracking',
        utteranceId: evt.utteranceId || evt.messageId,
      },
    });
  }, event);
}

/**
 * Locates the transcript message element for a mock utterance injected via
 * `dispatchRealtimeTranscriptionEvent`/`MOCK_TRANSCRIPT_CONVERSATION`,
 * identified by its distinctive leading token (e.g. `"AgentE2EMock"`) so it
 * stays unambiguous even alongside unrelated live-transcribed entries.
 * @param page - The Playwright page object
 * @param role - Which leg's mock entry to locate
 * @param leadingToken - The first word of the mock sentence for that role
 */
export function locateMockTranscriptMessage(page: Page, role: TranscriptSpeakerRole, leadingToken: string): Locator {
  return page
    .locator(`[data-testid="real-time-transcript:item"][data-speaker-role="${role}"]`)
    .filter({hasText: leadingToken})
    .locator('.real-time-transcript__message');
}
