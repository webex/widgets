import {Page, expect} from '@playwright/test';
import {AWAIT_TIMEOUT} from '../constants';

/**
 * Campaign preview outbound type values that identify a campaign preview task.
 * Must match CAMPAIGN_PREVIEW_OUTBOUND_TYPES in store.types.ts.
 */
export const CAMPAIGN_PREVIEW_OUTBOUND_TYPES = ['STANDARD_PREVIEW_CAMPAIGN', 'DIRECT_PREVIEW_CAMPAIGN'];

/**
 * Campaign preview campaign type values (from callProcessingDetails).
 * Must match CAMPAIGN_PREVIEW_CAMPAIGN_TYPES in store.types.ts.
 */
export const CAMPAIGN_PREVIEW_CAMPAIGN_TYPES = ['preview_standard', 'preview_direct'];

/** Campaign types that should NOT trigger the campaign preview flow. */
export const NON_PREVIEW_CAMPAIGN_TYPES = ['predictive', 'progressive'];

/** Campaign outbound types that should NOT trigger the campaign preview flow. */
export const NON_PREVIEW_OUTBOUND_TYPES = ['PREDICTIVE_CAMPAIGN', 'PROGRESSIVE_CAMPAIGN'];

/** Default interaction ID for campaign preview mock tasks. */
export const CAMPAIGN_INTERACTION_ID = 'campaign-preview-e2e-001';

/** Default campaign ID for mock tasks. */
export const CAMPAIGN_ID = 'campaign-e2e-id-001';

/**
 * Configuration for creating a mock campaign preview task in the browser.
 */
export interface ICampaignPreviewMockConfig {
  /** Interaction ID for the task (default: CAMPAIGN_INTERACTION_ID) */
  interactionId?: string;
  /** Campaign ID */
  campaignId?: string;
  /** Outbound type to use (default: 'STANDARD_PREVIEW_CAMPAIGN') */
  outboundType?: string;
  /** Campaign type CPD value (default: 'preview_standard') */
  campaignType?: string;
  /** Whether skip button is disabled (default: 'false') */
  skipDisabled?: string;
  /** Whether remove button is disabled (default: 'false') */
  removeDisabled?: string;
  /** Auto-action on timeout (default: 'ACCEPT') */
  autoAction?: string;
  /** Timeout timestamp (default: Date.now() + 30000) */
  offerTimeout?: string;
  /** Customer ANI */
  ani?: string;
  /** Customer DN */
  dn?: string;
  /** Customer name */
  customerName?: string;
  /** Global variable CAD entries */
  globalVariables?: Record<string, string>;
  /** Interaction state (default: 'new') */
  interactionState?: string;
}

/**
 * Injects a mock campaign preview task into the store's taskList via page.evaluate().
 * MobX reactivity will cause the TaskListComponent to render the CampaignTask component.
 *
 * @param page - Playwright Page object (must have the samples app loaded and widgets initialized)
 * @param config - Optional overrides for the mock task data
 */
export async function injectCampaignPreviewTask(
  page: Page,
  config: ICampaignPreviewMockConfig = {}
): Promise<void> {
  const interactionId = config.interactionId ?? CAMPAIGN_INTERACTION_ID;
  const campaignId = config.campaignId ?? CAMPAIGN_ID;
  const outboundType = config.outboundType ?? 'STANDARD_PREVIEW_CAMPAIGN';
  const campaignType = config.campaignType ?? 'preview_standard';
  const skipDisabled = config.skipDisabled ?? 'false';
  const removeDisabled = config.removeDisabled ?? 'false';
  const autoAction = config.autoAction ?? 'ACCEPT';
  const offerTimeout = config.offerTimeout ?? String(Date.now() + 30000);
  const ani = config.ani ?? '+14085550001';
  const dn = config.dn ?? '+14085550002';
  const customerName = config.customerName ?? 'Campaign Test Customer';
  const interactionState = config.interactionState ?? 'new';
  const globalVariables = config.globalVariables ?? {Campaign: 'Test Campaign'};

  await page.evaluate(
    ({
      interactionId,
      campaignId,
      outboundType,
      campaignType,
      skipDisabled,
      removeDisabled,
      autoAction,
      offerTimeout,
      ani,
      dn,
      customerName,
      interactionState,
      globalVariables,
    }) => {
      const store = (window as unknown as Record<string, unknown>)['store'] as Record<string, unknown>;
      if (!store) {
        throw new Error('Store not found on window object');
      }

      // Build callAssociatedData from globalVariables
      const callAssociatedData: Record<
        string,
        {
          name: string;
          displayName: string;
          value: string;
          type: string;
          agentEditable: boolean;
          agentViewable: boolean;
          global: boolean;
          isSecure: boolean;
          secureKeyId: string;
          secureKeyVersion: number;
        }
      > = {};
      for (const [key, value] of Object.entries(globalVariables)) {
        callAssociatedData[`Global_${key}`] = {
          name: `Global_${key}`,
          displayName: key,
          value,
          type: 'STRING',
          agentEditable: false,
          agentViewable: true,
          global: true,
          isSecure: false,
          secureKeyId: '',
          secureKeyVersion: 0,
        };
      }

      const agentId = store.agentId as string;

      // Build a minimal mock task matching the ITask shape.
      // The EventEmitter methods are stubs since E2E doesn't fire real SDK events.
      const noOp = () => {};
      const noOpReturn = () => ({});

      const mockTask = {
        data: {
          interaction: {
            mediaType: 'telephony',
            state: interactionState,
            interactionId,
            outboundType,
            callProcessingDetails: {
              relationshipType: 'primary',
              parentInteractionId: null,
              campaignId,
              campaignType,
              campaignPreviewSkipDisabled: skipDisabled,
              campaignPreviewRemoveDisabled: removeDisabled,
              campaignPreviewAutoAction: autoAction,
              campaignPreviewOfferTimeout: offerTimeout,
            },
            callAssociatedDetails: {
              ani,
              dn,
              customerName,
            },
            callAssociatedData,
            participants: {
              [agentId]: {
                hasJoined: true,
                pType: 'Agent',
                id: agentId,
                name: agentId,
                hasLeft: false,
              },
              customer1: {
                hasJoined: true,
                pType: 'Customer',
                id: 'customer1',
                name: 'customer1',
                hasLeft: false,
              },
            },
            media: {},
            createdTimestamp: Date.now(),
          },
          agentId,
          isConferenceInProgress: false,
          wrapUpRequired: false,
          mediaResourceId: interactionId,
          interactionId,
          eventType: 'TASK_UPDATE',
          destAgentId: '',
          trackingId: `tracking-${interactionId}`,
          orgId: 'org-e2e',
          teamId: 'team-e2e',
          channelType: 'telephony',
          consultMediaResourceId: null,
          owner: agentId,
          queueMgr: 'queue-mgr-e2e',
          type: 'TASK',
          isConferencing: false,
        },
        webCallMap: {},
        autoWrapup: undefined,
        // EventEmitter stubs
        on: noOp,
        off: noOp,
        emit: noOp,
        addListener: noOp,
        once: noOp,
        removeListener: noOp,
        removeAllListeners: noOp,
        setMaxListeners: noOp,
        getMaxListeners: () => 10,
        listeners: () => [],
        rawListeners: () => [],
        listenerCount: () => 0,
        prependListener: noOp,
        prependOnceListener: noOp,
        eventNames: () => [],
        cancelAutoWrapupTimer: noOp,
        unregisterWebCallListeners: noOp,
        updateTaskData: noOpReturn,
        accept: () => Promise.resolve({}),
        decline: () => Promise.resolve({}),
        hold: () => Promise.resolve({}),
        resume: () => Promise.resolve({}),
        end: () => Promise.resolve({}),
        wrapup: () => Promise.resolve({}),
        pauseRecording: () => Promise.resolve({}),
        resumeRecording: () => Promise.resolve({}),
        consult: () => Promise.resolve({}),
        transfer: () => Promise.resolve({}),
        consultTransfer: () => Promise.resolve({}),
        endConsult: () => Promise.resolve({}),
        consultConference: noOp,
        transferConference: noOp,
        exitConference: noOp,
        toggleMute: noOp,
      };

      // Inject the task into the store's task list.
      // Use MobX runInAction-like direct assignment — the store is already
      // wrapped with makeAutoObservable so direct mutations are tracked.
      const taskList = store.taskList as Record<string, unknown>;
      taskList[interactionId] = mockTask;

      // Trigger MobX reactivity by reassigning taskList
      store.taskList = {...taskList};
    },
    {
      interactionId,
      campaignId,
      outboundType,
      campaignType,
      skipDisabled,
      removeDisabled,
      autoAction,
      offerTimeout,
      ani,
      dn,
      customerName,
      interactionState,
      globalVariables,
    }
  );
}

/**
 * Removes a mock campaign preview task from the store's taskList.
 *
 * @param page - Playwright Page object
 * @param interactionId - The interaction ID of the task to remove
 */
export async function removeCampaignPreviewTask(
  page: Page,
  interactionId: string = CAMPAIGN_INTERACTION_ID
): Promise<void> {
  await page.evaluate(
    ({interactionId}) => {
      const store = (window as unknown as Record<string, unknown>)['store'] as Record<string, unknown>;
      if (!store) return;
      const taskList = store.taskList as Record<string, unknown>;
      delete taskList[interactionId];
      store.taskList = {...taskList};

      // Also clean up acceptedCampaignIds
      const acceptedIds = store.acceptedCampaignIds as Set<string>;
      if (acceptedIds?.has(interactionId)) {
        const next = new Set(acceptedIds);
        next.delete(interactionId);
        store.acceptedCampaignIds = next;
      }
    },
    {interactionId}
  );
}

/**
 * Stubs the SDK's campaign preview action methods (acceptPreviewContact, skipPreviewContact,
 * removePreviewContact) on window['store'].cc and the task's end() method (used by cancel)
 * so that test assertions can check whether the action was invoked and control whether it
 * resolves or rejects.
 *
 * @param page - Playwright Page object
 * @param failAction - If set, that action will reject with an error (for error dialog tests)
 */
export async function stubCampaignPreviewActions(
  page: Page,
  failAction?: 'accept' | 'skip' | 'remove' | 'cancel'
): Promise<void> {
  await page.evaluate(
    ({failAction, campaignInteractionId}) => {
      const store = (window as unknown as Record<string, unknown>)['store'] as Record<string, unknown>;
      if (!store) return;
      const cc = store.cc as Record<string, (...args: unknown[]) => unknown>;
      if (!cc) return;

      // Track calls on window for later assertion
      const tracker = ((window as unknown as Record<string, unknown>)['__campaignPreviewCalls'] = {
        accept: 0,
        skip: 0,
        remove: 0,
        cancel: 0,
      });

      cc.acceptPreviewContact = () => {
        tracker.accept++;
        if (failAction === 'accept') {
          return Promise.reject(new Error('Accept failed (stubbed)'));
        }
        return Promise.resolve({});
      };

      cc.skipPreviewContact = () => {
        tracker.skip++;
        if (failAction === 'skip') {
          return Promise.reject(new Error('Skip failed (stubbed)'));
        }
        return Promise.resolve({});
      };

      cc.removePreviewContact = () => {
        tracker.remove++;
        if (failAction === 'remove') {
          return Promise.reject(new Error('Remove failed (stubbed)'));
        }
        return Promise.resolve({});
      };

      // Stub the task's end() method (used by cancelPreviewContact) if cancel failure is needed
      if (failAction === 'cancel') {
        const taskList = store.taskList as Record<string, Record<string, unknown>>;
        const task = taskList[campaignInteractionId];
        if (task) {
          task.end = () => {
            tracker.cancel++;
            return Promise.reject(new Error('Cancel failed (stubbed)'));
          };
        }
      }
    },
    {failAction: failAction ?? null, campaignInteractionId: CAMPAIGN_INTERACTION_ID}
  );
}

/**
 * Returns the number of times each campaign action was called.
 *
 * @param page - Playwright Page object
 * @returns Call counts for accept, skip, remove, and cancel
 */
export async function getCampaignActionCounts(
  page: Page
): Promise<{accept: number; skip: number; remove: number; cancel: number}> {
  return page.evaluate(() => {
    const tracker = (window as unknown as Record<string, unknown>)['__campaignPreviewCalls'] as
      | {accept: number; skip: number; remove: number; cancel: number}
      | undefined;
    return tracker ?? {accept: 0, skip: 0, remove: 0, cancel: 0};
  });
}

/**
 * Waits for the campaign task component to become visible.
 *
 * @param page - Playwright Page object
 * @param timeout - Optional timeout in ms (default: AWAIT_TIMEOUT)
 */
export async function waitForCampaignTaskVisible(page: Page, timeout: number = AWAIT_TIMEOUT): Promise<void> {
  await page.getByTestId('campaign-task').first().waitFor({state: 'visible', timeout});
}

/**
 * Waits for the campaign task component to be removed from the DOM.
 *
 * @param page - Playwright Page object
 * @param timeout - Optional timeout in ms (default: AWAIT_TIMEOUT)
 */
export async function waitForCampaignTaskHidden(page: Page, timeout: number = AWAIT_TIMEOUT): Promise<void> {
  await page.getByTestId('campaign-task').first().waitFor({state: 'hidden', timeout});
}

/**
 * Clicks the Accept button on the campaign task list item.
 *
 * @param page - Playwright Page object
 */
export async function clickCampaignAccept(page: Page): Promise<void> {
  const acceptBtn = page.getByTestId('campaign-task-accept-button').first();
  await expect(acceptBtn).toBeVisible({timeout: AWAIT_TIMEOUT});
  await expect(acceptBtn).toBeEnabled({timeout: AWAIT_TIMEOUT});
  await acceptBtn.click({timeout: AWAIT_TIMEOUT});
}

/**
 * Clicks the Skip button on the campaign task list item.
 *
 * @param page - Playwright Page object
 */
export async function clickCampaignSkip(page: Page): Promise<void> {
  const skipBtn = page.getByTestId('campaign-task-skip-button').first();
  await expect(skipBtn).toBeVisible({timeout: AWAIT_TIMEOUT});
  await expect(skipBtn).toBeEnabled({timeout: AWAIT_TIMEOUT});
  await skipBtn.click({timeout: AWAIT_TIMEOUT});
}

/**
 * Clicks the Remove button on the campaign task list item.
 *
 * @param page - Playwright Page object
 */
export async function clickCampaignRemove(page: Page): Promise<void> {
  const removeBtn = page.getByTestId('campaign-task-remove-button').first();
  await expect(removeBtn).toBeVisible({timeout: AWAIT_TIMEOUT});
  await expect(removeBtn).toBeEnabled({timeout: AWAIT_TIMEOUT});
  await removeBtn.click({timeout: AWAIT_TIMEOUT});
}

/**
 * Clicks the Cancel button on the campaign task expanded area.
 *
 * @param page - Playwright Page object
 */
export async function clickCampaignCancel(page: Page): Promise<void> {
  const cancelBtn = page.getByTestId('campaign-task-cancel-button').first();
  await expect(cancelBtn).toBeVisible({timeout: AWAIT_TIMEOUT});
  await expect(cancelBtn).toBeEnabled({timeout: AWAIT_TIMEOUT});
  await cancelBtn.click({timeout: AWAIT_TIMEOUT});
}

/**
 * Injects a non-preview campaign task (predictive or progressive) into the store.
 * This should NOT render as a CampaignTask — it should be handled by the regular task flow.
 *
 * @param page - Playwright Page object
 * @param campaignType - 'predictive' or 'progressive'
 */
export async function injectNonPreviewCampaignTask(
  page: Page,
  campaignType: 'predictive' | 'progressive'
): Promise<void> {
  const outboundType = campaignType === 'predictive' ? 'PREDICTIVE_CAMPAIGN' : 'PROGRESSIVE_CAMPAIGN';
  await injectCampaignPreviewTask(page, {
    interactionId: `non-preview-${campaignType}-e2e-001`,
    outboundType,
    campaignType,
    interactionState: 'connected',
  });
}

/**
 * Updates the timeout on an existing mock campaign task to trigger timeout behavior.
 * Sets the offer timeout to a time in the past so the countdown expires immediately.
 *
 * @param page - Playwright Page object
 * @param interactionId - The interaction ID of the task to update
 */
export async function expireCampaignTimeout(
  page: Page,
  interactionId: string = CAMPAIGN_INTERACTION_ID
): Promise<void> {
  await page.evaluate(
    ({interactionId}) => {
      const store = (window as unknown as Record<string, unknown>)['store'] as Record<string, unknown>;
      if (!store) return;
      const taskList = store.taskList as Record<string, Record<string, unknown>>;
      const task = taskList[interactionId] as Record<string, unknown> | undefined;
      if (!task) return;

      const data = task.data as Record<string, unknown>;
      const interaction = data.interaction as Record<string, unknown>;
      const cpd = interaction.callProcessingDetails as Record<string, string>;

      // Set timeout to 1 second from now so countdown expires quickly
      cpd.campaignPreviewOfferTimeout = String(Date.now() + 1000);

      // Trigger MobX reactivity
      store.taskList = {...taskList};
    },
    {interactionId}
  );
}
