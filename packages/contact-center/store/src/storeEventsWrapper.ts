import {
  IStoreWrapper,
  IStore,
  InitParams,
  TASK_EVENTS,
  CC_EVENTS,
  IWrapupCode,
  WithWebex,
  ICustomState,
  IdleCode,
  IContactCenter,
  ITask,
  BuddyDetails,
  ENGAGED_LABEL,
  ENGAGED_USERNAME,
  RESERVED_LABEL,
  RESERVED_USERNAME,
  ContactServiceQueuesResponse,
  ContactServiceQueueSearchParams,
  EntryPointListResponse,
  EntryPointSearchParams,
  AddressBookEntriesResponse,
  AddressBookEntrySearchParams,
  Profile,
  AgentLoginProfile,
  ERROR_TRIGGERING_IDLE_CODES,
  RealTimeTranscriptionEventPayload,
  DesktopPreference,
  RealTimeAssistPayload,
  OfferActionErrorDisplay,
  AISummaryActionType,
  AISummaryCapabilityRecord,
  AISummaryCurrentOwnerKey,
  AISummaryCurrentOwnerSlots,
  AISummaryEditableField,
  AISummaryErrorCategory,
  AISummaryFeedback,
  AISummaryFeedbackResult,
  AISummaryKind,
  AISummaryLastResult,
  AISummaryMidCallOwnerState,
  AISummaryMidCallRole,
  AISummaryOwnerKey,
  AISummaryOwnerState,
  AISummaryOwnershipAdvanceBoundary,
  AISummaryOwnershipAdvanceResult,
  AISummaryOwnershipRole,
  AISummaryPendingRequest,
  AISummaryPostCallOwnerState,
  AISummaryPostCallRequestTrigger,
  AISummaryPreActionSendResult,
  AISummaryRequestResult,
  AISummaryStatusTransition,
  AISummaryViewKey,
  AISummaryViewSelector,
  AISummaryViewModel,
  PostCallDraftCaptureToken,
  PostCallSubmissionResult,
} from './store.types';
import Store from './store';
import type {AISummary, AISummaryResponse} from '@webex/contact-center';
import {
  DEVICE_TYPE_BROWSER,
  MEDIA_TYPE_TELEPHONY_LOWER,
  AGENT_STATE_AVAILABLE,
  CAMPAIGN_PREVIEW_OUTBOUND_TYPES,
  CAMPAIGN_PREVIEW_CAMPAIGN_TYPES,
} from './store.types';
import {runInAction} from 'mobx';
import {isIncomingTask, isSecondaryAgent, isTelephonyTask} from './task-utils';
import {SUGGESTED_RESPONSE_EVENT, TASK_MULTI_LOGIN_HYDRATE} from './constants';
import {
  acceptAISummaryContent,
  advanceAISummaryOwnerState,
  chooseAISummaryFreshness,
  composeMidCallResponse,
  composePostCallResponseWithWrapUpCode,
  createAISummaryOwnerState,
  editAISummaryContent,
  isHiddenAISummaryErrorCategory,
  isPostCallStateFrozen,
  mapAISummaryError,
  nextPostCallGeneration,
  normalizeAISummaryFeatureEnablement,
  normalizeAISummaryPayload,
  projectAISummarySurface,
  recordAISummaryCopied as recordAISummaryCopiedForState,
  recordAISummaryViewed as recordAISummaryViewedForState,
  reduceAISummaryCapability,
  resolveAISummaryCanonicalInteraction,
  setAISummaryFeedback,
  toAISummaryCapabilityRecord,
  type AISummaryFreshnessCandidate,
  type NormalizedAISummaryCapability,
  type NormalizedAISummaryResult,
} from './ai-summary';

const CONSULT_TRANSFER_CHANNELS = {
  telephony: 'TELEPHONY',
  chat: 'CHAT',
  social: 'SOCIAL_CHANNEL',
  email: 'EMAIL',
} as const;

const getSupportedMediaType = (mediaType?: string): keyof typeof CONSULT_TRANSFER_CHANNELS | undefined => {
  const normalizedMediaType = typeof mediaType === 'string' ? mediaType.toLowerCase() : '';
  const channel = CONSULT_TRANSFER_CHANNELS[normalizedMediaType as keyof typeof CONSULT_TRANSFER_CHANNELS];

  return typeof channel === 'string' ? (normalizedMediaType as keyof typeof CONSULT_TRANSFER_CHANNELS) : undefined;
};

const getQueueChannelFilter = (mediaType?: string): string | undefined => {
  const supportedMediaType = getSupportedMediaType(mediaType);
  const channelType = supportedMediaType ? CONSULT_TRANSFER_CHANNELS[supportedMediaType] : undefined;

  if (!channelType) return undefined;

  return `queueType==INBOUND;channelType==${channelType};active==true`;
};

type PendingAISummaryRequest = AISummaryPendingRequest;
type InternalAISummaryRequestResult =
  | {outcome: 'accepted'; revision: number}
  | {outcome: 'unsupported'}
  | {outcome: 'failed'; category: AISummaryErrorCategory}
  | {outcome: 'stale'};

type AISummaryOwnerTaskRecord = {
  ownerKey: AISummaryOwnerKey;
  task: ITask;
};

type ReceiverAISummaryTaskContext = {
  interactionId: string;
  agentId: string;
  actionType: AISummaryActionType;
};

type AISummaryWrappedUpBinding = {
  task: ITask;
  listener: (payload: unknown) => void;
};

type AISummaryWrappedUpSubscription = {
  ownerKey: AISummaryOwnerKey;
  bindings: AISummaryWrappedUpBinding[];
};

type PostCallDraftSnapshot = {
  ownerStateKey: string;
  ownerKey: AISummaryOwnerKey;
  revision: number;
  wrapUpCode: string;
  task: ITask;
  response: AISummaryResponse;
  released: boolean;
};

const AI_SUMMARY_REQUEST_TIMEOUT_MS = 15000;
const aiSummaryFreshnessKeyForRequest = (request: PendingAISummaryRequest): string =>
  request.kind === 'post-call'
    ? `${request.ownerStateKey}|post-call:${request.postCallGeneration ?? 'none'}`
    : request.ownerStateKey;

const viewKeyFor = (kind: AISummaryKind, role: AISummaryOwnershipRole): AISummaryViewKey | undefined => {
  if (kind === 'mid-call' && role !== 'post-call') {
    return `mid-call:${role}`;
  }
  if (kind === 'post-call' && role === 'post-call') {
    return 'post-call:post-call';
  }
  return undefined;
};

const viewSelectorFor = (kind: AISummaryKind, role: AISummaryOwnershipRole): AISummaryViewSelector | undefined => {
  if (kind === 'mid-call' && role !== 'post-call') {
    return {kind, role};
  }
  if (kind === 'post-call' && role === 'post-call') {
    return {kind, role};
  }
  return undefined;
};

const AI_SUMMARY_VIEW_KEYS: readonly AISummaryViewKey[] = [
  'mid-call:initiator',
  'mid-call:receiver',
  'post-call:post-call',
];

const roleForViewKey = (viewKey: AISummaryViewKey): AISummaryOwnershipRole =>
  viewKey === 'mid-call:initiator' ? 'initiator' : viewKey === 'mid-call:receiver' ? 'receiver' : 'post-call';

const NON_CURRENT_AI_SUMMARY_AGENT_ID = '__non_current_ai_summary_owner__';

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toPublicAISummaryRequestResult = (result: InternalAISummaryRequestResult): AISummaryRequestResult => {
  switch (result.outcome) {
    case 'accepted':
      return {outcome: 'accepted'};
    case 'stale':
      return {outcome: 'stale'};
    case 'failed':
    case 'unsupported':
      return {outcome: 'failed'};
  }
};

const ownerKeyToString = (ownerKey: AISummaryOwnerKey, role: AISummaryOwnershipRole): string =>
  `${ownerKey.interactionId}:${ownerKey.agentId}:${ownerKey.ownershipGeneration}:${role}`;

const aiSummaryOwnerRegistryKey = (ownerKey: AISummaryOwnerKey): string =>
  `${ownerKey.interactionId}:${ownerKey.agentId}:${ownerKey.ownershipGeneration}`;

const sameAISummaryOwnerKey = (left: AISummaryOwnerKey | undefined, right: AISummaryOwnerKey): boolean =>
  Boolean(
    left &&
      left.interactionId === right.interactionId &&
      left.agentId === right.agentId &&
      left.ownershipGeneration === right.ownershipGeneration
  );

const resolveReceiverAISummaryActionType = (task: ITask): AISummaryActionType | undefined => {
  if (!isTelephonyTask(task)) {
    return undefined;
  }
  return isSecondaryAgent(task) ? 'CONSULT' : 'TRANSFER';
};

class StoreWrapper implements IStoreWrapper {
  store: IStore;
  onIncomingTask: ({task}: {task: ITask}) => void;
  onTaskRejected?: (task: ITask, reason: string) => void;
  onOutdialFailed?: (reason: string) => void;
  onTaskAssigned?: (task: ITask) => void;
  onTaskSelected?: (task: ITask, isClicked: boolean) => void;
  onErrorCallback?: (widgetName: string, error: Error) => void;
  private realtimeTranscriptionListeners: Record<string, (payload: RealTimeTranscriptionEventPayload) => void> = {};
  private taskListRefreshScheduled = false;
  // Keyed by interactionId; the task is tracked alongside the listener so a
  // replacement task object (task:hydrate / task:merged) gets rebound.
  private realTimeAssistListeners: Record<string, {task: ITask; listener: (payload: RealTimeAssistPayload) => void}> =
    {};
  private wxAppMuteStateListeners: Record<string, {task: ITask; listener: (payload: {muted: boolean}) => void}> = {};
  private taskEndListeners: Record<string, {task: ITask; listener: () => void}> = {};
  private muteStateByInteractionId: Record<string, boolean> = {};
  private aiSummaryFeatureArrivalOrder = 0;
  private aiSummaryPayloadArrivalOrder = 0;
  private aiSummaryRequestSequence = 0;
  private aiSummaryStatusSequence = 0;
  private aiSummaryContentRevision = 0;
  private aiSummaryOwnershipGeneration = 0;
  private aiSummaryOwnershipCaptureSequence = 0;
  private aiSummaryPostCallGeneration = 0;
  private aiSummaryLatestFreshness: Record<string, AISummaryFreshnessCandidate> = {};
  private aiSummaryLatestRequestSequences: Record<string, number> = {};
  private aiSummaryOwnerTasks: Record<string, AISummaryOwnerTaskRecord> = {};
  private aiSummaryPendingRequestTasks: Record<number, ITask> = {};
  private aiSummaryPendingOwnershipCaptures: Record<string, AISummaryCurrentOwnerKey[]> = {};
  private aiSummaryAppliedOwnershipCaptureIds = new Set<string>();
  private aiSummaryObservedOwnershipBoundaries = new Set<string>();
  private aiSummaryTopologySignatures: Record<string, string> = {};
  private postCallDraftCaptures = new Map<PostCallDraftCaptureToken, PostCallDraftSnapshot>();
  private aiSummarySeededCapabilityTasks = new WeakSet<ITask>();
  private aiSummaryFeatureEnablementListeners: Record<string, {task: ITask; listener: (payload: unknown) => void}> = {};
  private aiSummaryReceiverListeners: Record<
    string,
    {task: ITask; listener: (payload: unknown) => void; context: ReceiverAISummaryTaskContext}
  > = {};
  private aiSummaryWrappedUpSubscriptions: Record<string, AISummaryWrappedUpSubscription> = {};
  private aiSummaryWrappedUpObservedOwnerKeys = new Set<string>();
  private retiredAISummaryInteractions = new Set<string>();

  constructor() {
    this.store = Store.getInstance();
  }

  // Proxy all methods and properties of the original store
  get featureFlags() {
    return this.store.featureFlags;
  }

  get teams() {
    return this.store.teams;
  }
  get loginOptions() {
    return this.store.loginOptions;
  }
  get cc() {
    return this.store.cc;
  }
  get logger() {
    return this.store.logger;
  }
  get idleCodes() {
    return this.store.idleCodes.filter((code) => {
      return Object.values(ERROR_TRIGGERING_IDLE_CODES).includes(code.name) || !code.isSystem;
    });
  }
  get agentId() {
    return this.store.agentId;
  }

  get deviceType() {
    return this.store.deviceType;
  }

  get teamId() {
    return this.store.teamId;
  }

  get dialNumber() {
    return this.store.dialNumber;
  }
  get wrapupCodes() {
    return this.store.wrapupCodes;
  }
  get currentTask() {
    return this.store.currentTask;
  }
  get isAgentLoggedIn() {
    return this.store.isAgentLoggedIn;
  }
  get taskList() {
    return this.store.taskList;
  }

  get currentState() {
    return this.store.currentState;
  }

  get lastStateChangeTimestamp() {
    return this.store.lastStateChangeTimestamp;
  }

  get lastIdleCodeChangeTimestamp() {
    return this.store.lastIdleCodeChangeTimestamp;
  }

  get showMultipleLoginAlert() {
    return this.store.showMultipleLoginAlert;
  }

  get currentTheme() {
    return this.store.currentTheme;
  }

  get customState() {
    return this.store.customState;
  }

  get consultStartTimeStamp() {
    return this.store.consultStartTimeStamp;
  }

  get callControlAudio() {
    return this.store.callControlAudio;
  }

  get isQueueConsultInProgress() {
    return this.store.isQueueConsultInProgress;
  }

  get isDeclineButtonEnabled() {
    return this.store.isDeclineButtonEnabled;
  }

  get isDigitalChannelsInitialized() {
    return this.store.isDigitalChannelsInitialized;
  }

  get dataCenter() {
    return this.store.dataCenter;
  }

  get realtimeTranscriptionData() {
    return this.store.realtimeTranscriptionData;
  }

  get acceptedCampaignIds() {
    return this.store.acceptedCampaignIds;
  }

  get showE911Modal() {
    return this.store.showE911Modal;
  }

  get isEmergencyModalAlreadyDisplayed() {
    return this.store.isEmergencyModalAlreadyDisplayed;
  }

  /** Read-only host init flag — see `webexConfig.cc.enableWxBetterTogether` at init. */
  get enableWxBetterTogether() {
    return this.store.enableWxBetterTogether;
  }

  get realTimeAssist() {
    return this.store.realTimeAssist;
  }

  setDataCenter = (value: string): void => {
    this.store.dataCenter = value;
  };

  get currentConsultQueueId() {
    return this.store.currentConsultQueueId;
  }

  get lastConsultDestination() {
    return this.store.lastConsultDestination;
  }

  get isEndConsultEnabled() {
    return this.store.isEndConsultEnabled;
  }

  get allowConsultToQueue() {
    return this.store.allowConsultToQueue;
  }

  get agentProfile() {
    return this.store.agentProfile;
  }

  get isMuted() {
    return this.store.isMuted;
  }

  get isAddressBookEnabled() {
    return this.store.isAddressBookEnabled;
  }

  setDigitalChannelsInitialized = (value: boolean): void => {
    runInAction(() => {
      this.store.isDigitalChannelsInitialized = value;
    });
  };

  setIsMuted = (value: boolean): void => {
    runInAction(() => {
      this.store.isMuted = value;
      this.persistTelephonyMuteCacheForCurrentTask(value);
    });
  };

  private isTelephonyTask(task: ITask | null | undefined): boolean {
    return isTelephonyTask(task);
  }

  private persistTelephonyMuteCacheForCurrentTask(value: boolean): void {
    const interactionId = this.currentTask?.data?.interactionId;
    if (!interactionId || !this.isTelephonyTask(this.currentTask)) {
      return;
    }

    this.muteStateByInteractionId[interactionId] = value;
  }

  private clearTelephonyMuteCache(interactionId: string | undefined): void {
    if (!interactionId) {
      return;
    }

    delete this.muteStateByInteractionId[interactionId];
  }

  private setIsMutedForTaskSwitch(value: boolean): void {
    runInAction(() => {
      this.store.isMuted = value;
    });
  }

  private restoreCachedMuteForTelephonyTask(task: ITask): void {
    if (!this.isTelephonyTask(task)) {
      return;
    }

    const interactionId = task.data?.interactionId;
    if (!interactionId) {
      return;
    }

    const cachedMute = this.muteStateByInteractionId[interactionId];
    if (typeof cachedMute !== 'boolean') {
      return;
    }

    runInAction(() => {
      this.store.isMuted = cachedMute;
    });
  }

  get offerActionErrors() {
    return this.store.offerActionErrors;
  }

  get aiSummaryCapabilities() {
    return this.store.aiSummaryCapabilities;
  }

  get aiSummaryCurrentOwners() {
    return this.store.aiSummaryCurrentOwners;
  }

  get aiSummaryOwnerStates() {
    return this.store.aiSummaryOwnerStates;
  }

  get aiSummaryPendingRequests() {
    return this.store.aiSummaryPendingRequests;
  }

  get aiSummaryLastResults() {
    return this.store.aiSummaryLastResults;
  }

  get pendingAISummaryStatusTransitions() {
    return this.store.pendingAISummaryStatusTransitions;
  }

  setOfferActionError = (interactionId: string, error: OfferActionErrorDisplay | null): void => {
    runInAction(() => {
      const remaining = {...this.store.offerActionErrors};
      delete remaining[interactionId];
      this.store.offerActionErrors = error ? {...remaining, [interactionId]: error} : remaining;
    });
  };

  clearOfferActionError = (interactionId: string): void => {
    this.setOfferActionError(interactionId, null);
  };

  pruneOfferActionErrors = (activeInteractionIds: Set<string>): void => {
    runInAction(() => {
      const currentEntries = Object.entries(this.store.offerActionErrors);
      const hasStaleEntries = currentEntries.some(([interactionId]) => !activeInteractionIds.has(interactionId));

      if (!hasStaleEntries) {
        return;
      }

      this.store.offerActionErrors = Object.fromEntries(
        currentEntries.filter(([interactionId]) => activeInteractionIds.has(interactionId))
      );
    });
  };

  private getAISummaryTask(task?: ITask): ITask | undefined {
    return task ?? this.currentTask ?? undefined;
  }

  private hasAuthenticatedAISummaryAgent(): boolean {
    return this.isAgentLoggedIn && this.agentId.trim().length > 0;
  }

  private getAgentIdForTask(task?: ITask): string {
    void task;
    return this.agentId || '';
  }

  private cloneAISummaryOwnerSlots(slots: AISummaryCurrentOwnerSlots | undefined): AISummaryCurrentOwnerSlots {
    const cloned: AISummaryCurrentOwnerSlots = {};
    for (const viewKey of AI_SUMMARY_VIEW_KEYS) {
      const ownerKey = slots?.[viewKey];
      if (ownerKey) {
        cloned[viewKey] = {...ownerKey};
      }
    }
    return cloned;
  }

  private rememberAISummaryOwnershipCapture(capture: AISummaryCurrentOwnerKey): void {
    const current = this.aiSummaryPendingOwnershipCaptures[capture.interactionId] ?? [];
    this.aiSummaryPendingOwnershipCaptures[capture.interactionId] = [...current, capture].slice(-8);
  }

  private getLatestAISummaryOwnershipCapture(interactionId: string): AISummaryCurrentOwnerKey | undefined {
    const captures = this.aiSummaryPendingOwnershipCaptures[interactionId];
    return captures?.[captures.length - 1];
  }

  getCurrentAISummaryOwnerKey = (task?: ITask): AISummaryCurrentOwnerKey | undefined => {
    const candidateTask = this.getAISummaryTask(task);
    if (!candidateTask || !this.hasAuthenticatedAISummaryAgent() || !isTelephonyTask(candidateTask)) {
      return undefined;
    }

    const boundary = resolveAISummaryCanonicalInteraction(candidateTask);
    const agentId = this.getAgentIdForTask(candidateTask);
    if (boundary.kind !== 'valid' || !agentId) {
      return undefined;
    }

    const capture = {
      captureId: `${boundary.interactionId}:${agentId}:${++this.aiSummaryOwnershipCaptureSequence}`,
      interactionId: boundary.interactionId,
      agentId,
      ownerKeys: this.cloneAISummaryOwnerSlots(this.store.aiSummaryCurrentOwners[boundary.interactionId]),
    };
    this.rememberAISummaryOwnershipCapture(capture);
    return capture;
  };

  private getCurrentOwnerKey(
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    task?: ITask
  ): AISummaryOwnerKey | undefined {
    const viewKey = viewKeyFor(kind, role);
    const candidateTask = this.getAISummaryTask(task);
    if (!viewKey || !candidateTask) {
      return undefined;
    }
    const boundary = resolveAISummaryCanonicalInteraction(candidateTask);
    const agentId = this.getAgentIdForTask(candidateTask);
    if (boundary.kind !== 'valid' || !agentId) {
      return undefined;
    }
    const ownerKey = this.store.aiSummaryCurrentOwners[boundary.interactionId]?.[viewKey];
    return ownerKey?.interactionId === boundary.interactionId && ownerKey.agentId === agentId ? ownerKey : undefined;
  }

  private getCurrentOwnerKeyForOwner(
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    ownerKey: AISummaryOwnerKey
  ): AISummaryOwnerKey | undefined {
    const viewKey = viewKeyFor(kind, role);
    return viewKey ? this.store.aiSummaryCurrentOwners[ownerKey.interactionId]?.[viewKey] : undefined;
  }

  private getStateKey(kind: AISummaryKind, role: AISummaryOwnershipRole, task?: ITask): string | undefined {
    const ownerKey = this.getCurrentOwnerKey(kind, role, task);
    return ownerKey ? ownerKeyToString(ownerKey, role) : undefined;
  }

  private getOwnerState(
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    task?: ITask
  ): AISummaryOwnerState | undefined {
    const stateKey = this.getStateKey(kind, role, task);
    return stateKey ? this.store.aiSummaryOwnerStates[stateKey] : undefined;
  }

  private rememberAISummaryOwnerTask(ownerKey: AISummaryOwnerKey, role: AISummaryOwnershipRole, task: ITask): void {
    this.aiSummaryOwnerTasks[ownerKeyToString(ownerKey, role)] = {ownerKey, task};
  }

  private getAISummaryOwnerTask(stateKey: string, ownerKey: AISummaryOwnerKey): ITask | undefined {
    const record = this.aiSummaryOwnerTasks[stateKey];
    return sameAISummaryOwnerKey(record?.ownerKey, ownerKey) ? record?.task : undefined;
  }

  private getAISummaryWrappedUpOwnerKeysForTask(task: ITask): AISummaryOwnerKey[] {
    const boundary = resolveAISummaryCanonicalInteraction(task);
    if (boundary.kind !== 'valid') {
      return [];
    }
    const taskAgentId = this.getAgentIdForTask(task);
    const seen = new Set<string>();
    return AI_SUMMARY_VIEW_KEYS.reduce<AISummaryOwnerKey[]>((ownerKeys, viewKey) => {
      const ownerKey = this.store.aiSummaryCurrentOwners[boundary.interactionId]?.[viewKey];
      if (!ownerKey || ownerKey.agentId !== taskAgentId) {
        return ownerKeys;
      }
      const registryKey = aiSummaryOwnerRegistryKey(ownerKey);
      if (!seen.has(registryKey)) {
        seen.add(registryKey);
        ownerKeys.push(ownerKey);
      }
      return ownerKeys;
    }, []);
  }

  private ensureAISummaryWrappedUpBinding(ownerKey: AISummaryOwnerKey, task: ITask): void {
    const boundary = resolveAISummaryCanonicalInteraction(task);
    if (
      boundary.kind !== 'valid' ||
      boundary.interactionId !== ownerKey.interactionId ||
      this.getAgentIdForTask(task) !== ownerKey.agentId
    ) {
      return;
    }

    const registryKey = aiSummaryOwnerRegistryKey(ownerKey);
    const existing = this.aiSummaryWrappedUpSubscriptions[registryKey];
    if (existing?.bindings.some((binding) => binding.task === task)) {
      return;
    }

    const listener = () => this.handleAISummaryWrappedUp(task, ownerKey);
    const subscription = existing ?? {ownerKey, bindings: []};
    subscription.bindings = [...subscription.bindings, {task, listener}];
    this.aiSummaryWrappedUpSubscriptions[registryKey] = subscription;
    task.on(TASK_EVENTS.TASK_WRAPPEDUP, listener);
  }

  private ensureAISummaryWrappedUpBindingsForTask(task: ITask): number {
    const ownerKeys = this.getAISummaryWrappedUpOwnerKeysForTask(task);
    ownerKeys.forEach((ownerKey) => this.ensureAISummaryWrappedUpBinding(ownerKey, task));
    return ownerKeys.length;
  }

  private detachAISummaryWrappedUpSubscription(registryKey: string): void {
    const subscription = this.aiSummaryWrappedUpSubscriptions[registryKey];
    if (!subscription) {
      return;
    }
    subscription.bindings.forEach(({task, listener}) => {
      task.off(TASK_EVENTS.TASK_WRAPPEDUP, listener);
    });
    delete this.aiSummaryWrappedUpSubscriptions[registryKey];
  }

  private installOwnerKey(
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    task: ITask
  ): AISummaryOwnerKey | undefined {
    const viewKey = viewKeyFor(kind, role);
    if (!viewKey) {
      return undefined;
    }
    const boundary = resolveAISummaryCanonicalInteraction(task);
    if (boundary.kind !== 'valid') {
      return undefined;
    }
    const agentId = this.getAgentIdForTask(task);
    if (!agentId) {
      return undefined;
    }

    const existing = this.store.aiSummaryCurrentOwners[boundary.interactionId]?.[viewKey];
    if (existing?.interactionId === boundary.interactionId && existing.agentId === agentId) {
      this.rememberAISummaryOwnerTask(existing, role, task);
      return existing;
    }

    const ownerKey = {
      interactionId: boundary.interactionId,
      agentId,
      ownershipGeneration: ++this.aiSummaryOwnershipGeneration,
    };
    runInAction(() => {
      this.store.aiSummaryCurrentOwners = {
        ...this.store.aiSummaryCurrentOwners,
        [boundary.interactionId]: {
          ...(this.store.aiSummaryCurrentOwners[boundary.interactionId] ?? {}),
          [viewKey]: ownerKey,
        },
      };
    });
    this.rememberAISummaryOwnerTask(ownerKey, role, task);
    return ownerKey;
  }

  private hasAISummaryOwnerSlots(capturedOwnerKey: AISummaryCurrentOwnerKey): boolean {
    return AI_SUMMARY_VIEW_KEYS.some((viewKey) => Boolean(capturedOwnerKey.ownerKeys[viewKey]));
  }

  private ownerSlotsMatchCapture(capturedOwnerKey: AISummaryCurrentOwnerKey): boolean {
    const current = this.store.aiSummaryCurrentOwners[capturedOwnerKey.interactionId] ?? {};
    return AI_SUMMARY_VIEW_KEYS.every((viewKey) => {
      const captured = capturedOwnerKey.ownerKeys[viewKey];
      const currentOwner = current[viewKey];
      if (!captured && !currentOwner) {
        return true;
      }
      return Boolean(captured && currentOwner && sameAISummaryOwnerKey(currentOwner, captured));
    });
  }

  private closePendingAISummaryRequestsForOwnerKeys(ownerKeys: AISummaryCurrentOwnerSlots): {
    pendingRequests: Record<number, AISummaryPendingRequest>;
    removedStateKeys: Set<string>;
  } {
    const capturedKeys = new Set<string>();
    AI_SUMMARY_VIEW_KEYS.forEach((viewKey) => {
      const ownerKey = ownerKeys[viewKey];
      if (ownerKey) {
        capturedKeys.add(ownerKeyToString(ownerKey, roleForViewKey(viewKey)));
      }
    });

    const pendingRequests = {...this.store.aiSummaryPendingRequests};
    const removedStateKeys = new Set<string>();
    Object.entries(pendingRequests).forEach(([sequence, request]) => {
      if (capturedKeys.has(request.ownerStateKey)) {
        removedStateKeys.add(request.ownerStateKey);
        delete pendingRequests[Number(sequence)];
        delete this.aiSummaryPendingRequestTasks[Number(sequence)];
      }
    });
    return {pendingRequests, removedStateKeys};
  }

  private forgetAISummaryFreshnessForStateKeys(stateKeys: Set<string>): void {
    if (stateKeys.size === 0) {
      return;
    }
    const freshnessKeys = new Set([
      ...Object.keys(this.aiSummaryLatestFreshness),
      ...Object.keys(this.aiSummaryLatestRequestSequences),
    ]);
    freshnessKeys.forEach((freshnessKey) => {
      for (const stateKey of stateKeys) {
        if (freshnessKey === stateKey || freshnessKey.startsWith(`${stateKey}|`)) {
          delete this.aiSummaryLatestFreshness[freshnessKey];
          delete this.aiSummaryLatestRequestSequences[freshnessKey];
          break;
        }
      }
    });
  }

  private resolveAISummarySuccessorAgentId(
    capturedOwnerKey: AISummaryCurrentOwnerKey,
    boundary: AISummaryOwnershipAdvanceBoundary
  ): string {
    if (boundary.mode === 'carry-forward') {
      return boundary.successorAgentId?.trim() || capturedOwnerKey.agentId;
    }
    return boundary.successorAgentId?.trim() || NON_CURRENT_AI_SUMMARY_AGENT_ID;
  }

  advanceAISummaryOwnership = (
    capturedOwnerKey: AISummaryCurrentOwnerKey | undefined,
    boundary: AISummaryOwnershipAdvanceBoundary,
    task?: ITask
  ): AISummaryOwnershipAdvanceResult => {
    if (!capturedOwnerKey) {
      return {outcome: 'blocked'};
    }
    if (boundary.observationId && this.aiSummaryObservedOwnershipBoundaries.has(boundary.observationId)) {
      return {outcome: 'duplicate'};
    }
    if (this.aiSummaryAppliedOwnershipCaptureIds.has(capturedOwnerKey.captureId)) {
      if (boundary.observationId) {
        this.aiSummaryObservedOwnershipBoundaries.add(boundary.observationId);
      }
      return {outcome: 'duplicate'};
    }
    if (!this.ownerSlotsMatchCapture(capturedOwnerKey)) {
      return {outcome: 'stale'};
    }

    if (!this.hasAISummaryOwnerSlots(capturedOwnerKey)) {
      this.aiSummaryAppliedOwnershipCaptureIds.add(capturedOwnerKey.captureId);
      if (boundary.observationId) {
        this.aiSummaryObservedOwnershipBoundaries.add(boundary.observationId);
      }
      return {outcome: 'advanced'};
    }

    const successorAgentId = this.resolveAISummarySuccessorAgentId(capturedOwnerKey, boundary);
    const nextOwnersForInteraction = {
      ...(this.store.aiSummaryCurrentOwners[capturedOwnerKey.interactionId] ?? {}),
    };
    const nextStates = {...this.store.aiSummaryOwnerStates};
    const nextLastResults = {...this.store.aiSummaryLastResults};
    const {pendingRequests, removedStateKeys} = this.closePendingAISummaryRequestsForOwnerKeys(
      capturedOwnerKey.ownerKeys
    );

    AI_SUMMARY_VIEW_KEYS.forEach((viewKey) => {
      const predecessorOwnerKey = capturedOwnerKey.ownerKeys[viewKey];
      if (!predecessorOwnerKey) {
        return;
      }
      const role = roleForViewKey(viewKey);
      const predecessorStateKey = ownerKeyToString(predecessorOwnerKey, role);
      const predecessorState = this.store.aiSummaryOwnerStates[predecessorStateKey];
      const successorOwnerKey = {
        interactionId: capturedOwnerKey.interactionId,
        agentId: successorAgentId,
        ownershipGeneration: ++this.aiSummaryOwnershipGeneration,
      };
      const successorStateKey = ownerKeyToString(successorOwnerKey, role);

      nextOwnersForInteraction[viewKey] = successorOwnerKey;
      delete nextLastResults[predecessorStateKey];
      removedStateKeys.add(predecessorStateKey);
      this.detachAISummaryWrappedUpSubscription(aiSummaryOwnerRegistryKey(predecessorOwnerKey));
      if (predecessorState) {
        nextStates[successorStateKey] = advanceAISummaryOwnerState(predecessorState, successorOwnerKey, boundary.mode);
        if (task && successorAgentId === this.getAgentIdForTask(task)) {
          this.rememberAISummaryOwnerTask(successorOwnerKey, role, task);
          this.ensureAISummaryWrappedUpBinding(successorOwnerKey, task);
        }
      }
    });

    this.forgetAISummaryFreshnessForStateKeys(removedStateKeys);
    this.aiSummaryAppliedOwnershipCaptureIds.add(capturedOwnerKey.captureId);
    if (boundary.observationId) {
      this.aiSummaryObservedOwnershipBoundaries.add(boundary.observationId);
    }
    runInAction(() => {
      this.store.aiSummaryCurrentOwners = {
        ...this.store.aiSummaryCurrentOwners,
        [capturedOwnerKey.interactionId]: nextOwnersForInteraction,
      };
      this.store.aiSummaryOwnerStates = nextStates;
      this.store.aiSummaryPendingRequests = pendingRequests;
      this.store.aiSummaryLastResults = nextLastResults;
    });
    return {outcome: 'advanced'};
  };

  private ensureOwnerState(options: {
    kind: AISummaryKind;
    role: AISummaryOwnershipRole;
    task: ITask;
    actionType?: AISummaryActionType;
    postCallGeneration?: number;
    preserveExistingActionType?: boolean;
  }): AISummaryOwnerState | undefined {
    const ownerKey = this.installOwnerKey(options.kind, options.role, options.task);
    if (!ownerKey) {
      return undefined;
    }
    this.ensureAISummaryWrappedUpBinding(ownerKey, options.task);
    const stateKey = ownerKeyToString(ownerKey, options.role);
    const current = this.store.aiSummaryOwnerStates[stateKey];
    if (current) {
      if (current.kind === 'mid-call' && options.actionType && current.actionType !== options.actionType) {
        if (options.preserveExistingActionType) {
          this.rememberAISummaryOwnerTask(ownerKey, options.role, options.task);
          return current;
        }
        const updated = {...current, actionType: options.actionType, midCallFeedbackPending: false};
        runInAction(() => {
          this.store.aiSummaryOwnerStates = {...this.store.aiSummaryOwnerStates, [stateKey]: updated};
        });
        this.rememberAISummaryOwnerTask(ownerKey, options.role, options.task);
        return updated;
      }
      this.rememberAISummaryOwnerTask(ownerKey, options.role, options.task);
      return current;
    }

    const created = createAISummaryOwnerState({
      kind: options.kind,
      role: options.role,
      ownerKey,
      actionType: options.actionType,
      postCallGeneration: options.postCallGeneration,
    });
    runInAction(() => {
      this.store.aiSummaryOwnerStates = {...this.store.aiSummaryOwnerStates, [stateKey]: created};
    });
    this.rememberAISummaryOwnerTask(ownerKey, options.role, options.task);
    return created;
  }

  private getCapability(interactionId: string): AISummaryCapabilityRecord | undefined {
    return this.store.aiSummaryCapabilities[interactionId];
  }

  private getViewState(
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    task?: ITask
  ): {state?: AISummaryOwnerState; stateKey?: string} {
    const ownerKey = this.getCurrentOwnerKey(kind, role, task);
    if (!ownerKey) {
      return {};
    }

    const candidateTask = this.getAISummaryTask(task);
    if (candidateTask) {
      const boundary = resolveAISummaryCanonicalInteraction(candidateTask);
      if (
        boundary.kind !== 'valid' ||
        boundary.interactionId !== ownerKey.interactionId ||
        this.getAgentIdForTask(candidateTask) !== ownerKey.agentId
      ) {
        return {};
      }
    }

    const stateKey = ownerKeyToString(ownerKey, role);
    return {stateKey, state: this.store.aiSummaryOwnerStates[stateKey]};
  }

  private isAISummaryEligible(kind: AISummaryKind, role: AISummaryOwnershipRole, task?: ITask): boolean {
    if (!viewKeyFor(kind, role)) {
      return false;
    }
    const candidateTask = this.getAISummaryTask(task);
    if (!candidateTask || !this.hasAuthenticatedAISummaryAgent() || !isTelephonyTask(candidateTask)) {
      return false;
    }

    const boundary = resolveAISummaryCanonicalInteraction(candidateTask);
    if (boundary.kind !== 'valid') {
      return false;
    }

    const capability = this.getCapability(boundary.interactionId);
    if (!capability) {
      return false;
    }
    return kind === 'post-call' ? capability.postCallEnabled : capability.midCallEnabled;
  }

  private appendAISummaryStatus(kind: AISummaryKind, state: AISummaryStatusTransition['state']): void {
    if (
      (kind === 'mid-call' && state !== 'available' && state !== 'unavailable') ||
      (kind === 'post-call' &&
        state !== 'available' &&
        state !== 'unavailable' &&
        state !== 'submitted' &&
        state !== 'response-failed')
    ) {
      return;
    }
    const sequence = ++this.aiSummaryStatusSequence;
    const transition =
      kind === 'mid-call'
        ? ({sequence, kind, state} as AISummaryStatusTransition)
        : ({sequence, kind, state} as AISummaryStatusTransition);
    runInAction(() => {
      this.store.pendingAISummaryStatusTransitions = [
        ...this.store.pendingAISummaryStatusTransitions,
        Object.freeze(transition),
      ];
    });
  }

  private observeAISummaryFailure(category: AISummaryErrorCategory | 'response-failed'): void {
    this.store.logger?.trace?.(`CC-Widgets: AI summary failure: ${category}`, {
      module: 'storeEventsWrapper.ts',
      method: 'observeAISummaryFailure',
    });
  }

  handleAISummaryFeatureEnablement = (payload: unknown, task?: ITask): void => {
    if (!task || !this.hasAuthenticatedAISummaryAgent() || !isTelephonyTask(task)) {
      return;
    }
    const incoming = normalizeAISummaryFeatureEnablement(payload, ++this.aiSummaryFeatureArrivalOrder);
    if (incoming.kind !== 'valid') {
      return;
    }
    const boundary = resolveAISummaryCanonicalInteraction(task);
    if (
      boundary.kind !== 'valid' ||
      boundary.interactionId !== incoming.interactionId ||
      task.data?.interactionId !== incoming.interactionId
    ) {
      return;
    }

    const current = this.store.aiSummaryCapabilities[incoming.interactionId];
    const normalizedCurrent: NormalizedAISummaryCapability | undefined = current
      ? {
          kind: 'valid',
          interactionId: current.interactionId,
          enabled: current.midCallEnabled || current.postCallEnabled,
          midCallEnabled: current.midCallEnabled,
          postCallEnabled: current.postCallEnabled,
          timestamp: current.timestamp,
          arrivalOrder: current.arrivalOrder,
        }
      : undefined;
    const reduced = reduceAISummaryCapability(normalizedCurrent, incoming);
    const record = reduced ? toAISummaryCapabilityRecord(reduced) : undefined;
    if (!record) {
      return;
    }
    runInAction(() => {
      this.store.aiSummaryCapabilities = {
        ...this.store.aiSummaryCapabilities,
        [record.interactionId]: record,
      };
    });
  };

  private seedAISummaryCapabilityFromTask(task: ITask): void {
    if (!this.hasAuthenticatedAISummaryAgent() || !isTelephonyTask(task)) {
      return;
    }
    if (this.aiSummarySeededCapabilityTasks.has(task)) {
      return;
    }
    this.aiSummarySeededCapabilityTasks.add(task);
    const boundary = resolveAISummaryCanonicalInteraction(task);
    const capabilities = task.aiSummaryCapabilities;
    const taskInteractionId = task.data?.interactionId;
    if (boundary.kind !== 'valid' || taskInteractionId !== boundary.interactionId) {
      return;
    }
    this.handleAISummaryFeatureEnablement(
      {
        interactionId: taskInteractionId,
        midCallEnabled: capabilities.midCallEnabled,
        postCallEnabled: capabilities.postCallEnabled,
      },
      task
    );
  }

  private getAISummaryInteractionIdForTask(task?: ITask): string | undefined {
    const boundary = task ? resolveAISummaryCanonicalInteraction(task) : ({kind: 'invalid'} as const);
    return boundary.kind === 'valid' ? boundary.interactionId : undefined;
  }

  private isCurrentAISummaryTask(task: ITask): boolean {
    const incomingInteractionId = this.getAISummaryInteractionIdForTask(task);
    const currentInteractionId = this.getAISummaryInteractionIdForTask(this.currentTask ?? undefined);
    return Boolean(incomingInteractionId && currentInteractionId && incomingInteractionId === currentInteractionId);
  }

  private getAISummaryTopologySignature(task: ITask): string | undefined {
    const boundary = resolveAISummaryCanonicalInteraction(task);
    if (boundary.kind !== 'valid') {
      return undefined;
    }

    const interaction = task.data?.interaction as unknown;
    const interactionRecord = isPlainRecord(interaction) ? interaction : {};
    const participantsRecord = isPlainRecord(interactionRecord.participants) ? interactionRecord.participants : {};
    const mediaRecord = isPlainRecord(interactionRecord.media) ? interactionRecord.media : {};
    const participants = Object.entries(participantsRecord)
      .map(([id, participant]) => {
        const participantRecord = isPlainRecord(participant) ? participant : {};
        return {
          id,
          pType: participantRecord.pType,
          hasJoined: participantRecord.hasJoined,
          hasLeft: participantRecord.hasLeft,
          consultState: participantRecord.consultState,
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));
    const media = Object.entries(mediaRecord)
      .map(([id, mediaValue]) => {
        const mediaValueRecord = isPlainRecord(mediaValue) ? mediaValue : {};
        return {
          id,
          mType: mediaValueRecord.mType,
          mediaResourceId: mediaValueRecord.mediaResourceId,
          participants: Array.isArray(mediaValueRecord.participants)
            ? [...mediaValueRecord.participants].map(String).sort()
            : [],
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));

    return JSON.stringify({
      interactionId: boundary.interactionId,
      owner: interactionRecord.owner,
      state: interactionRecord.state,
      isTerminated: interactionRecord.isTerminated,
      isConferenceInProgress: task.data?.isConferenceInProgress,
      participants,
      media,
    });
  }

  private rememberAISummaryTopology(task: ITask): void {
    const interactionId = this.getAISummaryInteractionIdForTask(task);
    const signature = this.getAISummaryTopologySignature(task);
    if (interactionId && signature && !this.aiSummaryTopologySignatures[interactionId]) {
      this.aiSummaryTopologySignatures[interactionId] = signature;
    }
  }

  private advanceAISummaryOwnershipFromTaskEvent(
    task: ITask | undefined,
    type: AISummaryOwnershipAdvanceBoundary['type'],
    options: {advanceWhenFirstObserved?: boolean; resetWhenOwnerChanges?: boolean} = {}
  ): AISummaryOwnershipAdvanceResult {
    const candidateTask = task ?? this.currentTask ?? undefined;
    if (!candidateTask || !this.hasAuthenticatedAISummaryAgent() || !isTelephonyTask(candidateTask)) {
      return {outcome: 'blocked'};
    }
    const interactionId = this.getAISummaryInteractionIdForTask(candidateTask);
    const signature = this.getAISummaryTopologySignature(candidateTask);
    if (!interactionId || !signature) {
      return {outcome: 'blocked'};
    }

    const previousSignature = this.aiSummaryTopologySignatures[interactionId];
    this.aiSummaryTopologySignatures[interactionId] = signature;
    if (!options.advanceWhenFirstObserved && !previousSignature) {
      return {outcome: 'blocked'};
    }
    if (previousSignature === signature) {
      return {outcome: 'duplicate'};
    }

    const observationId = `${interactionId}:${type}:${signature}`;
    if (this.aiSummaryObservedOwnershipBoundaries.has(observationId)) {
      return {outcome: 'duplicate'};
    }
    const latestCapturedOwnerKey = this.getLatestAISummaryOwnershipCapture(interactionId);
    // The interaction owner is a conference/telephony role, not the local
    // summary owner. A joined participant retains their own summary state.
    const currentOwners = this.store.aiSummaryCurrentOwners[interactionId];
    const ownerChanged = AI_SUMMARY_VIEW_KEYS.some((viewKey) => {
      const owner = currentOwners?.[viewKey];
      return owner !== undefined && owner.agentId !== this.agentId;
    });
    const shouldReset = options.resetWhenOwnerChanges === true && ownerChanged;
    const boundary = {
      type,
      mode: shouldReset ? ('reset' as const) : ('carry-forward' as const),
      successorAgentId: this.agentId,
      observationId,
    };
    const result = this.advanceAISummaryOwnership(
      latestCapturedOwnerKey ?? this.getCurrentAISummaryOwnerKey(candidateTask),
      boundary,
      candidateTask
    );
    if (result.outcome !== 'stale' || !latestCapturedOwnerKey) {
      return result;
    }
    return this.advanceAISummaryOwnership(
      this.getCurrentAISummaryOwnerKey(candidateTask),
      {
        ...boundary,
        observationId: `${observationId}:current`,
      },
      candidateTask
    );
  }

  private resolveReceiverAISummaryTaskContext(task: ITask): ReceiverAISummaryTaskContext | undefined {
    if (!this.hasAuthenticatedAISummaryAgent() || !isTelephonyTask(task)) {
      return undefined;
    }
    const boundary = resolveAISummaryCanonicalInteraction(task);
    const actionType = resolveReceiverAISummaryActionType(task);
    if (boundary.kind !== 'valid' || !actionType) {
      return undefined;
    }
    return {
      interactionId: boundary.interactionId,
      agentId: this.agentId,
      actionType,
    };
  }

  private evictAISummaryInteraction(
    interactionId?: string,
    options: {retainPostCall?: boolean; retainCaptures?: boolean; discardSubmitted?: boolean} = {}
  ): void {
    if (!interactionId) {
      return;
    }

    const retainedStateKeys = new Set(
      Object.entries(this.store.aiSummaryOwnerStates)
        .filter(([stateKey, state]) => {
          if (
            !options.retainPostCall ||
            state.ownerKey.interactionId !== interactionId ||
            state.kind !== 'post-call' ||
            !isPostCallStateFrozen(state)
          ) {
            return false;
          }
          if (state.postCallTerminalGeneration !== undefined) {
            return !options.discardSubmitted;
          }
          return (
            !state.agentWrappedUpObserved ||
            Array.from(this.postCallDraftCaptures.values()).some((capture) => capture.ownerStateKey === stateKey)
          );
        })
        .map(([stateKey]) => stateKey)
    );
    const stateKeys = new Set(
      Object.entries(this.store.aiSummaryOwnerStates)
        .filter(
          ([stateKey, state]) => state.ownerKey.interactionId === interactionId && !retainedStateKeys.has(stateKey)
        )
        .map(([stateKey]) => stateKey)
    );
    const nextCapabilities = {...this.store.aiSummaryCapabilities};
    const nextOwners = {...this.store.aiSummaryCurrentOwners};
    const nextStates = {...this.store.aiSummaryOwnerStates};
    const nextPendingRequests = {...this.store.aiSummaryPendingRequests};
    const nextLastResults = {...this.store.aiSummaryLastResults};
    this.forgetAISummaryFreshnessForStateKeys(stateKeys);

    if (retainedStateKeys.size === 0) {
      this.retiredAISummaryInteractions.delete(interactionId);
      delete nextCapabilities[interactionId];
      delete nextOwners[interactionId];
    } else {
      this.retiredAISummaryInteractions.add(interactionId);
      nextOwners[interactionId] = {'post-call:post-call': nextOwners[interactionId]?.['post-call:post-call']};
    }
    stateKeys.forEach((stateKey) => {
      delete nextStates[stateKey];
      delete nextLastResults[stateKey];
      delete this.aiSummaryOwnerTasks[stateKey];
    });

    Object.entries(nextLastResults).forEach(([stateKey, result]) => {
      if (
        !retainedStateKeys.has(stateKey) &&
        (result.interactionId === interactionId ||
          ('expectedInteractionId' in result && result.expectedInteractionId === interactionId))
      ) {
        delete nextLastResults[stateKey];
      }
    });

    Object.entries(nextPendingRequests).forEach(([sequence, request]) => {
      if (request.ownerKey.interactionId === interactionId || stateKeys.has(request.ownerStateKey)) {
        delete nextPendingRequests[Number(sequence)];
        delete this.aiSummaryPendingRequestTasks[Number(sequence)];
      }
    });

    Array.from(this.postCallDraftCaptures.entries()).forEach(([token, snapshot]) => {
      if (
        snapshot.ownerKey.interactionId === interactionId &&
        !options.retainCaptures &&
        !retainedStateKeys.has(snapshot.ownerStateKey)
      ) {
        this.postCallDraftCaptures.delete(token);
      }
    });
    const retainedOwnerKeys = new Set(
      Array.from(retainedStateKeys).map((stateKey) => aiSummaryOwnerRegistryKey(nextStates[stateKey].ownerKey))
    );
    Object.entries(this.aiSummaryWrappedUpSubscriptions).forEach(([registryKey, subscription]) => {
      if (
        subscription.ownerKey.interactionId === interactionId &&
        (!retainedOwnerKeys.has(registryKey) || this.aiSummaryWrappedUpObservedOwnerKeys.has(registryKey))
      ) {
        this.detachAISummaryWrappedUpSubscription(registryKey);
      }
    });
    Array.from(this.aiSummaryWrappedUpObservedOwnerKeys).forEach((registryKey) => {
      const [observedInteractionId] = registryKey.split(':');
      if (observedInteractionId === interactionId && !retainedOwnerKeys.has(registryKey)) {
        this.aiSummaryWrappedUpObservedOwnerKeys.delete(registryKey);
      }
    });
    delete this.aiSummaryPendingOwnershipCaptures[interactionId];
    delete this.aiSummaryTopologySignatures[interactionId];

    runInAction(() => {
      this.store.aiSummaryCapabilities = nextCapabilities;
      this.store.aiSummaryCurrentOwners = nextOwners;
      this.store.aiSummaryOwnerStates = nextStates;
      this.store.aiSummaryPendingRequests = nextPendingRequests;
      this.store.aiSummaryLastResults = nextLastResults;
    });
  }

  private createPendingAISummaryRequest(options: {
    ownerStateKey: string;
    ownerKey: AISummaryOwnerKey;
    kind: AISummaryKind;
    role: AISummaryOwnershipRole;
    task: ITask;
    actionType?: AISummaryActionType;
    postCallGeneration?: number;
  }): PendingAISummaryRequest {
    const sequence = ++this.aiSummaryRequestSequence;
    const request = {
      sequence,
      ownerStateKey: options.ownerStateKey,
      ownerKey: options.ownerKey,
      kind: options.kind,
      role: options.role,
      actionType: options.actionType,
      postCallGeneration: options.postCallGeneration,
      deadlineAt: Date.now() + AI_SUMMARY_REQUEST_TIMEOUT_MS,
      settlementClosed: false,
    };
    runInAction(() => {
      this.store.aiSummaryPendingRequests = {
        ...this.store.aiSummaryPendingRequests,
        [sequence]: request,
      };
    });
    this.aiSummaryPendingRequestTasks[sequence] = options.task;
    this.aiSummaryLatestRequestSequences[aiSummaryFreshnessKeyForRequest(request)] = sequence;
    return request;
  }

  private closePendingAISummaryRequest(sequence: number): PendingAISummaryRequest | undefined {
    const request = this.store.aiSummaryPendingRequests[sequence];
    if (!request || request.settlementClosed) {
      return undefined;
    }
    const next = {...this.store.aiSummaryPendingRequests};
    delete next[sequence];
    delete this.aiSummaryPendingRequestTasks[sequence];
    const closedRequest = {...request, settlementClosed: true};
    runInAction(() => {
      this.store.aiSummaryPendingRequests = next;
    });
    return closedRequest;
  }

  private hasNewerAISummaryRequestInScope(request: PendingAISummaryRequest): boolean {
    return (this.aiSummaryLatestRequestSequences[aiSummaryFreshnessKeyForRequest(request)] ?? 0) > request.sequence;
  }

  private isPostCallTerminalSettlement(request: PendingAISummaryRequest, state: AISummaryOwnerState): boolean {
    return (
      state.kind === 'post-call' &&
      request.postCallGeneration !== undefined &&
      state.postCallTerminalGeneration === request.postCallGeneration
    );
  }

  private isMatchingPostCallCapture(
    snapshot: PostCallDraftSnapshot,
    state?: AISummaryOwnerState
  ): state is AISummaryPostCallOwnerState {
    return (
      state?.kind === 'post-call' &&
      state.postCallCaptureRevision === snapshot.revision &&
      state.ownerKey.interactionId === snapshot.ownerKey.interactionId &&
      state.ownerKey.agentId === snapshot.ownerKey.agentId &&
      state.ownerKey.ownershipGeneration === snapshot.ownerKey.ownershipGeneration
    );
  }

  private isPendingForStateKey(
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    stateKey: string | undefined,
    state?: AISummaryOwnerState
  ): boolean {
    if (!stateKey) return false;

    return Object.values(this.store.aiSummaryPendingRequests).some((request) => {
      if (request.ownerStateKey !== stateKey || request.kind !== kind || request.role !== role) {
        return false;
      }
      if (kind === 'post-call') {
        return state?.kind === 'post-call' && request.postCallGeneration === state.postCallGeneration;
      }
      return true;
    });
  }

  private applyAISummaryResult(
    request: PendingAISummaryRequest | undefined,
    result: NormalizedAISummaryResult
  ): InternalAISummaryRequestResult {
    if (!request || result.kind === 'discarded-interaction-mismatch') {
      return {outcome: 'stale'};
    }
    const state = this.store.aiSummaryOwnerStates[request.ownerStateKey];
    if (!state) {
      return {outcome: 'stale'};
    }
    const currentOwner = this.getCurrentOwnerKeyForOwner(request.kind, request.role, request.ownerKey);
    if (!sameAISummaryOwnerKey(currentOwner, request.ownerKey)) {
      return {outcome: 'stale'};
    }
    if (
      state.ownerKey.interactionId !== request.ownerKey.interactionId ||
      state.ownerKey.agentId !== request.ownerKey.agentId ||
      state.ownerKey.ownershipGeneration !== request.ownerKey.ownershipGeneration
    ) {
      return {outcome: 'stale'};
    }
    if (
      state.kind === 'post-call' &&
      request.postCallGeneration !== undefined &&
      state.postCallGeneration !== request.postCallGeneration
    ) {
      return {outcome: 'stale'};
    }
    const postCallStateFrozen = (isPostCallStateFrozen as (value?: AISummaryOwnerState) => boolean)(state);
    if (this.isPostCallTerminalSettlement(request, state) || postCallStateFrozen) {
      return {outcome: 'stale'};
    }
    const ownerTask = this.getAISummaryOwnerTask(request.ownerStateKey, request.ownerKey);
    if (!ownerTask || !this.isAISummaryEligible(request.kind, request.role, ownerTask)) {
      return {outcome: 'stale'};
    }
    if ((result.kind === 'unsupported' || result.kind === 'error') && this.hasNewerAISummaryRequestInScope(request)) {
      return {outcome: 'stale'};
    }

    runInAction(() => {
      this.store.aiSummaryLastResults = {
        ...this.store.aiSummaryLastResults,
        [request.ownerStateKey]: result as AISummaryLastResult,
      };
    });

    if (result.kind === 'error') {
      this.observeAISummaryFailure(result.category);
    }

    if (result.kind === 'error' && isHiddenAISummaryErrorCategory(result.category)) {
      return {outcome: 'failed', category: result.category};
    }

    if (result.kind === 'unsupported' || result.kind === 'error') {
      if (!state.content) {
        if (state.kind === 'post-call' && request.postCallGeneration !== undefined) {
          runInAction(() => {
            this.store.aiSummaryOwnerStates = {
              ...this.store.aiSummaryOwnerStates,
              [request.ownerStateKey]: {
                ...state,
                postCallCompletionEscapeGeneration: request.postCallGeneration,
              },
            };
          });
        }
        this.appendAISummaryStatus(state.kind, 'unavailable');
      }
      return result.kind === 'unsupported' ? {outcome: 'unsupported'} : {outcome: 'failed', category: result.category};
    }

    const incomingFreshness = {
      ownerRole: result.role,
      arrivalOrder: result.arrivalOrder,
      timestamp: result.timestamp,
      ownerGeneration: request.ownerKey.ownershipGeneration,
      postCallGeneration: request.kind === 'post-call' ? request.postCallGeneration : undefined,
    };
    const freshnessKey = aiSummaryFreshnessKeyForRequest(request);
    const freshness = chooseAISummaryFreshness(this.aiSummaryLatestFreshness[freshnessKey], incomingFreshness);
    if (freshness !== 'incoming') {
      return {outcome: 'stale'};
    }

    const nextRevision = ++this.aiSummaryContentRevision;
    const stateForAcceptance =
      state.kind === 'mid-call' && request.actionType && state.actionType !== request.actionType
        ? {...state, actionType: request.actionType, midCallFeedbackPending: false}
        : state;
    const accepted = acceptAISummaryContent(stateForAcceptance, result.content, nextRevision);
    this.aiSummaryLatestFreshness[freshnessKey] = incomingFreshness;
    runInAction(() => {
      this.store.aiSummaryOwnerStates = {
        ...this.store.aiSummaryOwnerStates,
        [request.ownerStateKey]: accepted,
      };
    });
    this.appendAISummaryStatus(accepted.kind, 'available');
    return {outcome: 'accepted', revision: nextRevision};
  }

  private buildTimeoutResult(request: PendingAISummaryRequest): NormalizedAISummaryResult {
    return {
      kind: 'error',
      category: 'timeout',
      role: request.role,
      interactionId: request.ownerKey.interactionId,
    };
  }

  private async settleAISummaryRequest(
    request: PendingAISummaryRequest,
    promise: Promise<AISummary>
  ): Promise<AISummaryRequestResult> {
    try {
      const settlement = await promise;
      const openRequest = this.closePendingAISummaryRequest(request.sequence);
      if (!openRequest) {
        return {outcome: 'stale'};
      }
      if (Date.now() > openRequest.deadlineAt) {
        return toPublicAISummaryRequestResult(
          this.applyAISummaryResult(openRequest, this.buildTimeoutResult(openRequest))
        );
      }
      const arrivalOrder = ++this.aiSummaryPayloadArrivalOrder;
      const normalized = normalizeAISummaryPayload({
        raw: settlement,
        role: openRequest.role,
        expectedInteractionId: openRequest.ownerKey.interactionId,
        arrivalOrder,
      });
      return toPublicAISummaryRequestResult(this.applyAISummaryResult(openRequest, normalized));
    } catch (error) {
      const openRequest = this.closePendingAISummaryRequest(request.sequence);
      if (!openRequest) {
        return {outcome: 'stale'};
      }
      return toPublicAISummaryRequestResult(
        this.applyAISummaryResult(openRequest, {
          kind: 'error',
          category: mapAISummaryError(error),
          role: openRequest.role,
          interactionId: openRequest.ownerKey.interactionId,
        })
      );
    }
  }

  getAISummaryViewModel = (kind: AISummaryKind, role: AISummaryOwnershipRole, task?: ITask): AISummaryViewModel => {
    const viewKey = viewKeyFor(kind, role);
    const selector = viewSelectorFor(kind, role);
    if (!viewKey || !selector) {
      throw new Error('AI summary view requires a legal kind/role selector');
    }
    const {state, stateKey} = this.getViewState(kind, role, task);
    const eligible = this.isAISummaryEligible(kind, role, task);
    const requestPending = this.isPendingForStateKey(kind, role, stateKey, state);
    const view = projectAISummarySurface({
      ...selector,
      eligible,
      requestPending,
      state,
      result: stateKey
        ? (this.store.aiSummaryLastResults[stateKey] as NormalizedAISummaryResult | undefined)
        : undefined,
    });
    return {...view, key: viewKey};
  };

  requestMidCallSummary = async (
    actionType: AISummaryActionType,
    role: AISummaryMidCallRole = 'initiator',
    task?: ITask
  ): Promise<AISummaryRequestResult> => {
    const candidateTask = this.getAISummaryTask(task);
    if (!candidateTask || !this.hasAuthenticatedAISummaryAgent() || !isTelephonyTask(candidateTask)) {
      return {outcome: 'blocked'};
    }
    const boundary = resolveAISummaryCanonicalInteraction(candidateTask);
    if (boundary.kind !== 'valid') {
      return {outcome: 'blocked'};
    }
    this.seedAISummaryCapabilityFromTask(candidateTask);
    const capability = this.getCapability(boundary.interactionId);
    if (!capability?.midCallEnabled) {
      return {outcome: 'blocked'};
    }
    const state = this.ensureOwnerState({
      kind: 'mid-call',
      role,
      task: candidateTask,
      actionType,
      preserveExistingActionType: true,
    });
    if (!state || !this.isAISummaryEligible('mid-call', role, candidateTask)) {
      return {outcome: 'blocked'};
    }
    const stateKey = ownerKeyToString(state.ownerKey, role);
    const request = this.createPendingAISummaryRequest({
      ownerStateKey: stateKey,
      ownerKey: state.ownerKey,
      kind: 'mid-call',
      role,
      task: candidateTask,
      actionType,
    });
    try {
      const summaryPromise = candidateTask.requestMidCallSummary(actionType);
      return await this.settleAISummaryRequest(request, summaryPromise);
    } catch (error) {
      const openRequest = this.closePendingAISummaryRequest(request.sequence);
      return toPublicAISummaryRequestResult(
        this.applyAISummaryResult(openRequest, {
          kind: 'error',
          category: mapAISummaryError(error),
          role,
          interactionId: state.ownerKey.interactionId,
        })
      );
    }
  };

  requestPostCallSummary = async (
    trigger: AISummaryPostCallRequestTrigger,
    task?: ITask
  ): Promise<AISummaryRequestResult> => {
    const candidateTask = this.getAISummaryTask(task);
    if (!candidateTask || !this.hasAuthenticatedAISummaryAgent() || !isTelephonyTask(candidateTask)) {
      return {outcome: 'blocked'};
    }
    const boundary = resolveAISummaryCanonicalInteraction(candidateTask);
    if (boundary.kind !== 'valid') {
      return {outcome: 'blocked'};
    }
    this.seedAISummaryCapabilityFromTask(candidateTask);
    const capability = this.getCapability(boundary.interactionId);
    if (!capability?.postCallEnabled) {
      return {outcome: 'blocked'};
    }
    const currentState = this.getOwnerState('post-call', 'post-call', candidateTask) as
      | AISummaryPostCallOwnerState
      | undefined;
    if (isPostCallStateFrozen(currentState)) {
      return {outcome: 'blocked'};
    }
    const generation = nextPostCallGeneration(
      this.aiSummaryPostCallGeneration,
      trigger,
      currentState?.postCallGeneration ?? this.aiSummaryPostCallGeneration
    );
    const state = this.ensureOwnerState({
      kind: 'post-call',
      role: 'post-call',
      task: candidateTask,
      postCallGeneration: generation,
    }) as AISummaryPostCallOwnerState | undefined;
    if (!state || !this.isAISummaryEligible('post-call', 'post-call', candidateTask)) {
      return {outcome: 'blocked'};
    }
    if (trigger.type === 'reason-commit') {
      this.aiSummaryPostCallGeneration = generation;
    }
    const stateKey = ownerKeyToString(state.ownerKey, 'post-call');
    const installedState =
      trigger.type === 'reason-commit'
        ? {
            ...state,
            postCallGeneration: generation,
            postCallCompletionEscapeGeneration: undefined,
            postCallTerminalGeneration: undefined,
            postCallTerminalWrapUpCode: undefined,
          }
        : {...state, postCallGeneration: generation};
    runInAction(() => {
      this.store.aiSummaryOwnerStates = {...this.store.aiSummaryOwnerStates, [stateKey]: installedState};
    });
    const request = this.createPendingAISummaryRequest({
      ownerStateKey: stateKey,
      ownerKey: state.ownerKey,
      kind: 'post-call',
      role: 'post-call',
      task: candidateTask,
      postCallGeneration: generation,
    });
    try {
      const summaryPromise = candidateTask.requestPostCallSummary();
      return await this.settleAISummaryRequest(request, summaryPromise);
    } catch (error) {
      const openRequest = this.closePendingAISummaryRequest(request.sequence);
      return toPublicAISummaryRequestResult(
        this.applyAISummaryResult(openRequest, {
          kind: 'error',
          category: mapAISummaryError(error),
          role: 'post-call',
          interactionId: state.ownerKey.interactionId,
        })
      );
    }
  };

  editAISummary = (
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    field: AISummaryEditableField,
    expectedRevision: number,
    task?: ITask
  ): boolean => {
    const stateKey = this.getStateKey(kind, role, task);
    if (!stateKey) {
      return false;
    }
    const state = this.store.aiSummaryOwnerStates[stateKey];
    if (isPostCallStateFrozen(state)) {
      return false;
    }
    const nextRevision = state ? Math.max(this.aiSummaryContentRevision, state.contentRevision) + 1 : 0;
    const edited = state ? editAISummaryContent(state, field, expectedRevision, nextRevision) : undefined;
    if (!edited?.accepted) {
      return false;
    }
    if (edited.state === state) {
      return true;
    }
    runInAction(() => {
      this.aiSummaryContentRevision = nextRevision;
      this.store.aiSummaryOwnerStates = {...this.store.aiSummaryOwnerStates, [stateKey]: edited.state};
    });
    return true;
  };

  recordAISummaryViewed = (
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    expectedRevision: number,
    task?: ITask
  ): boolean => {
    const stateKey = this.getStateKey(kind, role, task);
    if (!stateKey) {
      return false;
    }
    const state = this.store.aiSummaryOwnerStates[stateKey];
    if (isPostCallStateFrozen(state)) {
      return false;
    }
    const viewed = state ? recordAISummaryViewedForState(state, expectedRevision) : undefined;
    if (!viewed?.accepted) {
      return false;
    }
    runInAction(() => {
      this.store.aiSummaryOwnerStates = {...this.store.aiSummaryOwnerStates, [stateKey]: viewed.state};
    });
    return true;
  };

  recordAISummaryCopied = (
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    expectedRevision: number,
    task?: ITask
  ): boolean => {
    const stateKey = this.getStateKey(kind, role, task);
    if (!stateKey) {
      return false;
    }
    const state = this.store.aiSummaryOwnerStates[stateKey];
    if (isPostCallStateFrozen(state)) {
      return false;
    }
    const copied = state ? recordAISummaryCopiedForState(state, expectedRevision) : undefined;
    if (!copied?.accepted) {
      return false;
    }
    runInAction(() => {
      this.store.aiSummaryOwnerStates = {...this.store.aiSummaryOwnerStates, [stateKey]: copied.state};
    });
    return true;
  };

  setMidCallSummaryFeedback = async (
    role: AISummaryMidCallRole,
    feedback: Exclude<AISummaryFeedback, 'none'>,
    actionType: AISummaryActionType,
    expectedRevision: number,
    task?: ITask
  ): Promise<AISummaryFeedbackResult> => {
    const stateKey = this.getStateKey('mid-call', role, task);
    if (!stateKey) {
      return {outcome: 'stale'};
    }
    const state = this.store.aiSummaryOwnerStates[stateKey] as AISummaryMidCallOwnerState | undefined;
    const ownerTask = state ? this.getAISummaryOwnerTask(stateKey, state.ownerKey) : undefined;
    if (!state || state.kind !== 'mid-call' || state.actionType !== actionType || !ownerTask) {
      return {outcome: 'stale'};
    }
    if (state.midCallFeedbackPending) {
      return {outcome: 'blocked'};
    }
    const updated = setAISummaryFeedback(state, feedback, expectedRevision);
    if (!updated.accepted) {
      return {outcome: 'stale'};
    }
    const response = composeMidCallResponse(updated.state as AISummaryMidCallOwnerState);
    if (!response) {
      return {outcome: 'blocked'};
    }
    const pendingState = {...state, midCallFeedbackPending: true};
    runInAction(() => {
      this.store.aiSummaryOwnerStates = {...this.store.aiSummaryOwnerStates, [stateKey]: pendingState};
    });
    const getCurrentFeedbackTarget = (): AISummaryMidCallOwnerState | undefined => {
      const current = this.store.aiSummaryOwnerStates[stateKey] as AISummaryMidCallOwnerState | undefined;
      if (
        current?.kind !== 'mid-call' ||
        current.actionType !== actionType ||
        current.contentRevision !== expectedRevision ||
        !current.midCallFeedbackPending ||
        current.ownerKey.interactionId !== state.ownerKey.interactionId ||
        current.ownerKey.agentId !== state.ownerKey.agentId ||
        current.ownerKey.ownershipGeneration !== state.ownerKey.ownershipGeneration ||
        !sameAISummaryOwnerKey(this.getCurrentOwnerKeyForOwner('mid-call', role, state.ownerKey), state.ownerKey) ||
        !this.isAISummaryEligible('mid-call', role, ownerTask)
      ) {
        return undefined;
      }
      return current;
    };
    try {
      await ownerTask.sendMidCallSummaryResponse(response, actionType);
      const current = getCurrentFeedbackTarget();
      if (!current) {
        return {outcome: 'stale'};
      }
      const confirmed = setAISummaryFeedback(current, feedback, expectedRevision);
      runInAction(() => {
        this.store.aiSummaryOwnerStates = {
          ...this.store.aiSummaryOwnerStates,
          [stateKey]: {...confirmed.state, midCallFeedbackPending: false} as AISummaryMidCallOwnerState,
        };
      });
      return {outcome: 'confirmed'};
    } catch (error) {
      const current = getCurrentFeedbackTarget();
      if (!current) {
        return {outcome: 'stale'};
      }
      runInAction(() => {
        this.store.aiSummaryOwnerStates = {
          ...this.store.aiSummaryOwnerStates,
          [stateKey]: {...current, midCallFeedbackPending: false},
        };
      });
      this.observeAISummaryFailure(mapAISummaryError(error));
      return {outcome: 'failed'};
    }
  };

  sendMidCallSummaryBeforeAction = async (
    role: AISummaryMidCallRole,
    actionType: AISummaryActionType,
    expectedRevision: number,
    task?: ITask
  ): Promise<AISummaryPreActionSendResult> => {
    const stateKey = this.getStateKey('mid-call', role, task);
    if (!stateKey) {
      return {outcome: 'stale'};
    }
    const state = this.store.aiSummaryOwnerStates[stateKey] as AISummaryMidCallOwnerState | undefined;
    const ownerTask = state ? this.getAISummaryOwnerTask(stateKey, state.ownerKey) : undefined;
    if (
      !state ||
      state.kind !== 'mid-call' ||
      state.actionType !== actionType ||
      state.contentRevision !== expectedRevision ||
      !sameAISummaryOwnerKey(this.getCurrentOwnerKeyForOwner('mid-call', role, state.ownerKey), state.ownerKey)
    ) {
      return {outcome: 'stale'};
    }
    const lastResult = this.store.aiSummaryLastResults[stateKey];
    if (
      !state.content &&
      (this.isPendingForStateKey('mid-call', role, stateKey, state) ||
        (lastResult?.kind !== 'error' && lastResult?.kind !== 'unsupported'))
    ) {
      return {outcome: 'blocked'};
    }
    if (!this.isAISummaryEligible('mid-call', role, ownerTask)) {
      return {outcome: 'stale'};
    }
    const response = composeMidCallResponse(state);
    if (!response || !ownerTask) {
      return {outcome: 'blocked'};
    }
    const isCurrentPreActionTarget = (): boolean => {
      const current = this.store.aiSummaryOwnerStates[stateKey];
      return (
        current?.kind === 'mid-call' &&
        current.contentRevision === expectedRevision &&
        current.actionType === actionType &&
        sameAISummaryOwnerKey(this.getCurrentOwnerKeyForOwner('mid-call', role, state.ownerKey), state.ownerKey) &&
        this.isAISummaryEligible('mid-call', role, ownerTask)
      );
    };
    try {
      await ownerTask.sendMidCallSummaryResponse(response, actionType);
      if (!isCurrentPreActionTarget()) {
        return {outcome: 'stale'};
      }
      return {outcome: 'sent'};
    } catch (error) {
      if (!isCurrentPreActionTarget()) {
        return {outcome: 'stale'};
      }
      this.observeAISummaryFailure(mapAISummaryError(error));
      return {outcome: 'failed'};
    }
  };

  setPostCallSummaryFeedback = (
    feedback: Exclude<AISummaryFeedback, 'none'>,
    expectedRevision: number,
    task?: ITask
  ): boolean => {
    const stateKey = this.getStateKey('post-call', 'post-call', task);
    if (!stateKey) {
      return false;
    }
    const state = this.store.aiSummaryOwnerStates[stateKey];
    if (!state || state.kind !== 'post-call' || isPostCallStateFrozen(state)) {
      return false;
    }
    const updated = setAISummaryFeedback(state, feedback, expectedRevision);
    if (!updated.accepted) {
      return false;
    }
    runInAction(() => {
      this.store.aiSummaryOwnerStates = {...this.store.aiSummaryOwnerStates, [stateKey]: updated.state};
    });
    return true;
  };

  markPostCallWrapupCompleted = (wrapUpCode: string, task?: ITask): boolean => {
    const candidateTask = this.getAISummaryTask(task);
    const stateKey = this.getStateKey('post-call', 'post-call', candidateTask);
    if (!stateKey || !candidateTask || typeof wrapUpCode !== 'string' || wrapUpCode.length === 0) {
      return false;
    }
    const state = this.store.aiSummaryOwnerStates[stateKey] as AISummaryPostCallOwnerState | undefined;
    if (!state || state.kind !== 'post-call' || state.postCallCaptureRevision !== undefined) {
      return false;
    }
    const boundary = resolveAISummaryCanonicalInteraction(candidateTask);
    const currentOwner = this.getCurrentOwnerKeyForOwner('post-call', 'post-call', state.ownerKey);
    if (
      boundary.kind !== 'valid' ||
      boundary.interactionId !== state.ownerKey.interactionId ||
      this.getAgentIdForTask(candidateTask) !== state.ownerKey.agentId ||
      !sameAISummaryOwnerKey(currentOwner, state.ownerKey)
    ) {
      return false;
    }

    this.finalizePostCallState(stateKey, state, wrapUpCode);
    return true;
  };

  private finalizePostCallState(stateKey: string, state: AISummaryPostCallOwnerState, wrapUpCode: string): void {
    Object.values(this.store.aiSummaryPendingRequests).forEach((request) => {
      if (request.ownerStateKey === stateKey) {
        this.closePendingAISummaryRequest(request.sequence);
      }
    });
    runInAction(() => {
      this.store.aiSummaryOwnerStates = {
        ...this.store.aiSummaryOwnerStates,
        [stateKey]: {
          ...state,
          postCallTerminalGeneration: state.postCallGeneration,
          postCallTerminalWrapUpCode: wrapUpCode,
          postCallFeedbackPending: false,
          postCallCaptureRevision: undefined,
          feedbackStatus: undefined,
        },
      };
    });
  }

  capturePostCallDraft = (wrapUpCode: string, task?: ITask): PostCallDraftCaptureToken | undefined => {
    const candidateTask = this.getAISummaryTask(task);
    const stateKey = this.getStateKey('post-call', 'post-call', candidateTask);
    if (!stateKey || !candidateTask || typeof wrapUpCode !== 'string' || wrapUpCode.length === 0) {
      return undefined;
    }
    const state = this.store.aiSummaryOwnerStates[stateKey] as AISummaryPostCallOwnerState | undefined;
    if (!state || state.kind !== 'post-call' || !state.content || isPostCallStateFrozen(state)) {
      return undefined;
    }
    const boundary = resolveAISummaryCanonicalInteraction(candidateTask);
    const currentOwner = this.getCurrentOwnerKeyForOwner('post-call', 'post-call', state.ownerKey);
    if (
      boundary.kind !== 'valid' ||
      boundary.interactionId !== state.ownerKey.interactionId ||
      this.getAgentIdForTask(candidateTask) !== state.ownerKey.agentId ||
      !sameAISummaryOwnerKey(currentOwner, state.ownerKey)
    ) {
      return undefined;
    }
    const response = composePostCallResponseWithWrapUpCode(state, wrapUpCode);
    if (!response) {
      return undefined;
    }
    const token = Symbol('post-call-ai-summary-capture') as PostCallDraftCaptureToken;
    const snapshot = {
      ownerStateKey: stateKey,
      ownerKey: state.ownerKey,
      revision: state.contentRevision,
      wrapUpCode,
      task: candidateTask,
      response,
      released: false,
    };
    this.postCallDraftCaptures.set(token, snapshot);
    runInAction(() => {
      this.store.aiSummaryOwnerStates = {
        ...this.store.aiSummaryOwnerStates,
        [stateKey]: {...state, postCallCaptureRevision: state.contentRevision},
      };
    });
    return token;
  };

  releasePostCallDraft = (token: PostCallDraftCaptureToken): boolean => {
    const snapshot = this.postCallDraftCaptures.get(token);
    if (!snapshot || snapshot.released) {
      return false;
    }
    const state = this.store.aiSummaryOwnerStates[snapshot.ownerStateKey] as AISummaryPostCallOwnerState | undefined;
    this.postCallDraftCaptures.delete(token);
    if (state?.kind === 'post-call' && state.postCallCaptureRevision === snapshot.revision) {
      runInAction(() => {
        this.store.aiSummaryOwnerStates = {
          ...this.store.aiSummaryOwnerStates,
          [snapshot.ownerStateKey]: {...state, postCallCaptureRevision: undefined},
        };
      });
    }
    return true;
  };

  private markPostCallResponseFailed(snapshot?: PostCallDraftSnapshot): PostCallSubmissionResult {
    if (snapshot) {
      const registryKey = aiSummaryOwnerRegistryKey(snapshot.ownerKey);
      if (this.aiSummaryWrappedUpObservedOwnerKeys.has(registryKey)) {
        this.evictAISummaryInteraction(snapshot.ownerKey.interactionId);
        this.appendAISummaryStatus('post-call', 'response-failed');
        return {wrapup: 'succeeded', response: 'response-failed'};
      }
      const state = this.store.aiSummaryOwnerStates[snapshot.ownerStateKey] as AISummaryPostCallOwnerState | undefined;
      if (this.isMatchingPostCallCapture(snapshot, state)) {
        Object.values(this.store.aiSummaryPendingRequests).forEach((request) => {
          if (request.ownerStateKey === snapshot.ownerStateKey) {
            this.closePendingAISummaryRequest(request.sequence);
          }
        });
        runInAction(() => {
          this.store.aiSummaryOwnerStates = {
            ...this.store.aiSummaryOwnerStates,
            [snapshot.ownerStateKey]: {
              ...state,
              feedbackStatus: 'not-confirmed',
              postCallFeedbackPending: false,
            },
          };
        });
      }
    }
    this.appendAISummaryStatus('post-call', 'response-failed');
    return {wrapup: 'succeeded', response: 'response-failed'};
  }

  freezeAndSendPostCallSummary = async (token: PostCallDraftCaptureToken): Promise<PostCallSubmissionResult> => {
    const snapshot = this.postCallDraftCaptures.get(token);
    if (!snapshot || snapshot.released) {
      return {wrapup: 'succeeded', response: 'response-failed'};
    }
    snapshot.released = true;
    try {
      await snapshot.task.sendPostCallSummaryResponse(snapshot.response);
      const state = this.store.aiSummaryOwnerStates[snapshot.ownerStateKey] as AISummaryPostCallOwnerState | undefined;
      if (this.isMatchingPostCallCapture(snapshot, state)) {
        this.finalizePostCallState(snapshot.ownerStateKey, state, snapshot.wrapUpCode);
      }
      const selectedInteractionId = this.getAISummaryInteractionIdForTask(this.currentTask ?? undefined);
      if (selectedInteractionId && selectedInteractionId !== snapshot.ownerKey.interactionId) {
        this.evictAISummaryInteraction(snapshot.ownerKey.interactionId);
      }
      this.appendAISummaryStatus('post-call', 'submitted');
      return {wrapup: 'succeeded', response: 'submitted'};
    } catch {
      const result = this.markPostCallResponseFailed(snapshot);
      this.observeAISummaryFailure('response-failed');
      return result;
    } finally {
      this.postCallDraftCaptures.delete(token);
    }
  };

  getPendingAISummaryStatusTransitions = (): readonly AISummaryStatusTransition[] => {
    return this.store.pendingAISummaryStatusTransitions;
  };

  acknowledgeAISummaryStatusTransition = (sequence: number): boolean => {
    const [head, ...tail] = this.store.pendingAISummaryStatusTransitions;
    if (!head || head.sequence !== sequence) {
      return false;
    }
    runInAction(() => {
      this.store.pendingAISummaryStatusTransitions = tail;
    });
    return true;
  };

  setCurrentTheme = (theme: string): void => {
    this.store.currentTheme = theme;
  };

  setShowMultipleLoginAlert = (value: boolean): void => {
    this.store.showMultipleLoginAlert = value;
  };

  setDeviceType = (option: string): void => {
    this.store.deviceType = option;
  };

  setTeamId = (id: string): void => {
    this.store.teamId = id;
  };

  setDialNumber = (input: string): void => {
    this.store.dialNumber = input;
  };

  setCurrentState = (state: string): void => {
    runInAction(() => {
      this.store.currentState = state;
    });
  };

  setLastStateChangeTimestamp = (timestamp: number): void => {
    runInAction(() => {
      this.store.lastStateChangeTimestamp = timestamp;
    });
  };

  setLastIdleCodeChangeTimestamp = (timestamp: number): void => {
    runInAction(() => {
      this.store.lastIdleCodeChangeTimestamp = timestamp;
    });
  };

  setIsAgentLoggedIn = (value: boolean): void => {
    this.store.isAgentLoggedIn = value;
  };

  private getCanonicalTask(task: ITask): ITask {
    const interactionId = task.data?.interactionId;
    if (!interactionId) {
      return task;
    }

    const tasks = this.store.cc?.taskManager?.getAllTasks?.();
    return tasks?.[interactionId] ?? task;
  }

  private isWxAppEngagedTelephonyTask(task: ITask): boolean {
    if (!this.store.enableWxBetterTogether) {
      return false;
    }

    const canonicalTask = this.getCanonicalTask(task) as ITask & {
      getWebexCallingCallId?: () => string | null | undefined;
    };

    return typeof canonicalTask.getWebexCallingCallId === 'function' && !!canonicalTask.getWebexCallingCallId();
  }

  private seedWxAppMuteFromTask(task: ITask): boolean {
    if (!this.isWxAppEngagedTelephonyTask(task)) {
      return false;
    }

    const interactionId = task.data?.interactionId;
    if (!interactionId) {
      return false;
    }

    const canonicalTask = this.getCanonicalTask(task) as ITask & {
      syncWxAppMuteFromCallDetails?: () => Promise<boolean | undefined>;
      getWxAppMuted?: () => boolean;
    };
    const sync = canonicalTask.syncWxAppMuteFromCallDetails?.bind(canonicalTask);
    if (typeof sync !== 'function') {
      return false;
    }

    void sync()
      .then(() => {
        if (this.currentTask?.data?.interactionId !== interactionId) {
          return;
        }

        const muted = canonicalTask.getWxAppMuted?.();
        if (typeof muted === 'boolean') {
          this.setIsMuted(muted);
        }
      })
      .catch(() => undefined);

    return true;
  }

  setCurrentTask = (task: ITask | null, isClicked: boolean = false): void => {
    // Don't assign the task as current task is incoming
    if (isIncomingTask(task, this.agentId)) return;

    const previousAISummaryInteractionId = this.getAISummaryInteractionIdForTask(this.currentTask ?? undefined);
    const nextAISummaryInteractionId = this.getAISummaryInteractionIdForTask(task ?? undefined);
    if (previousAISummaryInteractionId && previousAISummaryInteractionId !== nextAISummaryInteractionId) {
      this.evictAISummaryInteraction(previousAISummaryInteractionId, {
        retainPostCall: true,
        discardSubmitted: Boolean(nextAISummaryInteractionId),
        retainCaptures: true,
      });
    }
    if (nextAISummaryInteractionId && nextAISummaryInteractionId !== previousAISummaryInteractionId) {
      // Task removal can clear currentTask before the next interaction is selected.
      // Retired post-call data must not survive that later selection.
      this.retiredAISummaryInteractions.forEach((interactionId) => {
        if (interactionId !== nextAISummaryInteractionId) {
          this.evictAISummaryInteraction(interactionId, {
            retainPostCall: true,
            discardSubmitted: true,
            retainCaptures: true,
          });
        }
      });
    }

    // Don't promote a pending campaign preview as the current task.
    // The agent has joined the telephony reservation but hasn't accepted the
    // campaign preview yet (Accept/Skip/Remove buttons still showing).
    // CallControl should only render after the preview is explicitly accepted.
    // Allow accepted previews through even if the SDK hasn't transitioned the
    // state from 'new' yet — acceptedCampaignIds is the source of truth.
    // Clear currentTask so stale call-control state doesn't linger, but skip
    // the onTaskSelected callback to preserve its ITask contract.
    const isPendingPreview =
      task && this.isCampaignPreview(task) && !this.store.acceptedCampaignIds.has(task.data.interactionId);

    if (isPendingPreview) {
      runInAction(() => {
        this.store.currentTask = null;
      });

      return;
    }

    runInAction(() => {
      // Determine if the new task is the same as the current task.
      let isSameTask = false;
      if (task && this.currentTask) {
        isSameTask = this.getTaskInteractionId(task) === this.getTaskInteractionId(this.currentTask);
      }

      // Update the current task
      this.store.currentTask = task ? Object.assign(Object.create(Object.getPrototypeOf(task)), task) : null;

      if (task && !isSameTask) {
        this.setIsMutedForTaskSwitch(false);
        if (!this.seedWxAppMuteFromTask(task)) {
          this.restoreCachedMuteForTelephonyTask(task);
        }
      }

      if (this.onTaskSelected && !isSameTask && typeof isClicked !== 'undefined') {
        this.onTaskSelected(task, isClicked);
      }
    });
  };

  setOnError = (callback: (widgetName: string, error: Error) => void) => {
    this.onErrorCallback = (widgetName: string, error: Error) => {
      // @ts-expect-error - test error boundary
      this.store.cc.webex.internal.newMetrics.submitBehavioralEvent({
        product: 'wxcc-widgets',
        agent: 'browser',
        target: 'browser',
        verb: 'error',
        payload: {
          widgets: widgetName,
          name: error.name,
          message: error.message,
        },
      });
      callback(widgetName, error);
    };
  };

  refreshTaskList = (): void => {
    runInAction(() => {
      this.store.taskList = this.store.cc.taskManager.getAllTasks();
      const taskListKeys = Object.keys(this.store.taskList);

      if (taskListKeys.length === 0) {
        if (this.currentTask) {
          this.handleTaskRemove(this.currentTask);
        }
        this.setCurrentTask(null);
        this.setState({reset: true});
        // Ensure agent state is set to Available (auxCodeId '0') when no tasks remain
        // The backend should send AGENT_STATE_CHANGE, but in test environments it may not
        this.setCurrentState('0');
      } else if (this.currentTask && this.store.taskList[this.currentTask.data.interactionId]) {
        this.setCurrentTask(this.store.taskList[this.currentTask?.data?.interactionId]);
      } else if (taskListKeys.length > 0) {
        if (this.currentTask) {
          this.handleTaskRemove(this.currentTask);
        }
        this.setCurrentTask(this.store.taskList[taskListKeys[0]]);
      }
    });
  };

  /**
   * Terminal task events are emitted before the SDK removes the task from its collection.
   * Defer and coalesce that authoritative read so ended calls disappear without a page refresh.
   */
  private scheduleTaskListRefresh = (): void => {
    if (this.taskListRefreshScheduled) {
      return;
    }

    this.taskListRefreshScheduled = true;
    queueMicrotask(() => {
      this.taskListRefreshScheduled = false;
      this.refreshTaskList();
    });
  };

  setWrapupCodes = (wrapupCodes: IWrapupCode[]): void => {
    this.store.wrapupCodes = wrapupCodes;
  };

  setConsultStartTimeStamp = (timestamp: number): void => {
    this.store.consultStartTimeStamp = timestamp;
  };

  setCallControlAudio = (audio: MediaStream | null): void => {
    this.store.callControlAudio = audio;
  };

  setIsQueueConsultInProgress = (value: boolean): void => {
    runInAction(() => {
      this.store.isQueueConsultInProgress = value;
    });
  };

  setIsDeclineButtonEnabled = (value: boolean): void => {
    runInAction(() => {
      this.store.isDeclineButtonEnabled = value;
    });
  };

  setCurrentConsultQueueId = (queueId: string | null): void => {
    runInAction(() => {
      this.store.currentConsultQueueId = queueId;
    });
  };

  setLastConsultDestination = (destination: {to: string; destinationType: string} | null): void => {
    runInAction(() => {
      this.store.lastConsultDestination = destination;
    });
  };

  setState = (state: ICustomState | IdleCode): void => {
    if ('reset' in state) {
      runInAction(() => {
        this.store.customState = null;
      });
      return;
    }
    if ('id' in state) {
      runInAction(() => {
        this.setCurrentState(state.id);
      });
    } else {
      runInAction(() => {
        this.store.customState = state;
      });
    }
  };

  setIncomingTaskCb = (callback: ({task}: {task: ITask}) => void): void => {
    this.onIncomingTask = callback;
  };

  setTaskRejected = (callback: ((task: ITask, reason: string) => void) | undefined): void => {
    this.onTaskRejected = callback;
  };

  setOutdialFailed = (callback: ((reason: string) => void) | undefined): void => {
    this.onOutdialFailed = callback;
  };

  setTaskAssigned = (callback: ((task: ITask) => void) | undefined): void => {
    this.onTaskAssigned = callback;
  };

  setTaskSelected = (callback: ((task: ITask, isClicked?: boolean) => void) | undefined): void => {
    if (callback && this.currentTask) {
      callback(this.currentTask);
    }
    this.onTaskSelected = callback;
  };

  setCCCallback = (event: CC_EVENTS | TASK_EVENTS, callback) => {
    if (!callback) return;
    this.store.logger.info(`CC-Widgets: setCCCallback(): registering CC event '${event}'`, {
      module: 'storeEventsWrapper.ts',
      method: 'setCCCallback',
    });
    this.store.cc.on(event, callback);
  };

  setTaskCallback = (event: TASK_EVENTS, callback, taskId: string, task?: ITask) => {
    if (!callback) return;
    const taskToRegister = task ?? this.store.taskList[taskId];
    if (!taskToRegister) return;
    this.store.logger?.info(`CC-Widgets: setTaskCallback(): registering task event '${event}'`, {
      module: 'storeEventsWrapper.ts',
      method: 'setTaskCallback',
    });
    taskToRegister.on(event, callback);
  };

  setAgentProfile = (profile: AgentLoginProfile) => {
    runInAction(() => {
      this.store.agentProfile = {
        ...this.store.agentProfile,
        profileType: profile.profileType || undefined,
        mmProfile: profile.mmProfile || undefined,
        orgId: profile.orgId || undefined,
        roles: profile.roles || undefined,
        deviceType: profile.deviceType || undefined,
        agentProfileID: profile.agentProfileID || undefined,
        isTimeoutDesktopInactivityEnabled: profile.isTimeoutDesktopInactivityEnabled || undefined,
        timeoutDesktopInactivityMins: profile.timeoutDesktopInactivityMins || undefined,
      };
    });
  };

  removeCCCallback = (event: CC_EVENTS) => {
    this.store.logger.info(`CC-Widgets: removeCCCallback(): removing CC event '${event}'`, {
      module: 'storeEventsWrapper.ts',
      method: 'removeCCCallback',
    });
    this.store.cc.off(event);
  };

  removeTaskCallback = (event: TASK_EVENTS, callback, taskId: string, task?: ITask) => {
    if (!callback) return;
    const taskToDetach = task ?? this.store.taskList[taskId];
    if (!taskToDetach) return;
    this.store.logger?.info(`CC-Widgets: removeTaskCallback(): removing task event '${event}'`, {
      module: 'storeEventsWrapper.ts',
      method: 'removeTaskCallback',
    });
    taskToDetach.off(event, callback);
  };

  init(options: InitParams): Promise<void> {
    return this.store.init(options, this.setupIncomingTaskHandler).catch((error) => {
      const err = error instanceof Error ? error : new Error(`Store initialization failed: ${String(error)}`);

      if (this.onErrorCallback) {
        this.onErrorCallback('Store', err);
      }

      throw err;
    });
  }

  registerCC = (webex?: WithWebex['webex']) => {
    return this.store.registerCC(webex);
  };

  handleTaskRemove = (taskToRemove: ITask) => {
    if (taskToRemove) {
      const taskId = taskToRemove.data?.interactionId;
      this.clearTelephonyMuteCache(taskId);
      // Clean up accepted/dismissed campaign tracking now that the task is
      // fully removed (after wrapup).  This is safe because the task will
      // no longer render in any component.
      if (taskId && this.store.acceptedCampaignIds.has(taskId)) {
        this.removeAcceptedCampaign(taskId);
      }
      if (taskId && this.realtimeTranscriptionListeners[taskId]) {
        taskToRemove.off(CC_EVENTS.REAL_TIME_TRANSCRIPTION, this.realtimeTranscriptionListeners[taskId]);
        delete this.realtimeTranscriptionListeners[taskId];
      }
      taskToRemove.off(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
      if (taskId && this.taskEndListeners[taskId]) {
        const {task: endTask, listener: endListener} = this.taskEndListeners[taskId];
        (endTask ?? taskToRemove).off(TASK_EVENTS.TASK_END, endListener);
        delete this.taskEndListeners[taskId];
      }
      taskToRemove.off(TASK_EVENTS.TASK_REJECT, (reason) => this.handleTaskReject(taskToRemove, reason));
      taskToRemove.off(TASK_EVENTS.TASK_OUTDIAL_FAILED, (reason) => this.handleOutdialFailed(reason));
      taskToRemove.off(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, this.handleUIControlsUpdated);
      if (taskId && this.wxAppMuteStateListeners[taskId]) {
        const {task: muteTask, listener: muteListener} = this.wxAppMuteStateListeners[taskId];
        (muteTask ?? taskToRemove).off(TASK_EVENTS.TASK_WXAPP_MUTE_STATE_UPDATED, muteListener);
        delete this.wxAppMuteStateListeners[taskId];
      }
      taskToRemove.off(TASK_EVENTS.TASK_WRAPPEDUP, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_CREATED, this.handleConsultCreated);
      taskToRemove.off(TASK_EVENTS.TASK_OFFER_CONTACT, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_END, this.handleConsultEnd);
      taskToRemove.off(TASK_EVENTS.TASK_RECORDING_PAUSED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_RECORDING_RESUMED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULTING, this.handleConsulting);
      taskToRemove.off(TASK_EVENTS.TASK_OFFER_CONSULT, this.handleConsultOffer);
      taskToRemove.off(TASK_EVENTS.TASK_AUTO_ANSWERED, this.handleAutoAnswer);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_ACCEPTED, this.handleConsultAccepted);
      taskToRemove.off(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, this.handleConsultQueueCancelled);
      taskToRemove.off(TASK_EVENTS.TASK_SWITCH_CALL, this.handleSwitchCall);
      taskToRemove.off(TASK_EVENTS.TASK_HOLD, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_RESUME, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_ENDED, this.handleConferenceEnded);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_END_FAILED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_FAILED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_PARTICIPANT_JOINED, this.handleConferenceStarted);
      taskToRemove.off(TASK_EVENTS.TASK_PARTICIPANT_LEFT, this.handleConferenceEnded);
      taskToRemove.off(TASK_EVENTS.TASK_PARTICIPANT_LEFT_FAILED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_STARTED, this.handleConferenceStarted);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, this.handleConferenceTransferred);
      taskToRemove.off(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, this.refreshTaskList);
      taskToRemove.off(TASK_EVENTS.TASK_CAMPAIGN_PREVIEW_RESERVATION, this.handleCampaignPreviewReservation);
      taskToRemove.off(TASK_EVENTS.TASK_CAMPAIGN_CONTACT_UPDATED, this.refreshTaskList);
      if (this.deviceType === DEVICE_TYPE_BROWSER) {
        taskToRemove.off(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
        this.setCallControlAudio(null);
      }

      if (taskId && this.realTimeAssistListeners[taskId]) {
        const {task: listenerTask, listener} = this.realTimeAssistListeners[taskId];
        (listenerTask ?? taskToRemove).off(SUGGESTED_RESPONSE_EVENT, listener);
        delete this.realTimeAssistListeners[taskId];
      }
      if (taskId && this.aiSummaryFeatureEnablementListeners[taskId]) {
        const {task: listenerTask, listener} = this.aiSummaryFeatureEnablementListeners[taskId];
        (listenerTask ?? taskToRemove).off(TASK_EVENTS.TASK_FEATURE_ENABLEMENT, listener);
        delete this.aiSummaryFeatureEnablementListeners[taskId];
      }
      if (taskId && this.aiSummaryReceiverListeners[taskId]) {
        const {task: listenerTask, listener} = this.aiSummaryReceiverListeners[taskId];
        (listenerTask ?? taskToRemove).off(TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED, listener);
        delete this.aiSummaryReceiverListeners[taskId];
      }
      if (taskId && this.store.realTimeAssist && this.store.realTimeAssist[taskId]) {
        runInAction(() => {
          const next = {...this.store.realTimeAssist};
          delete next[taskId];
          this.store.realTimeAssist = next;
        });
      }
      this.evictAISummaryInteraction(this.getAISummaryInteractionIdForTask(taskToRemove), {retainPostCall: true});
    }

    runInAction(() => {
      if (taskToRemove) {
        const removedTaskId = taskToRemove.data?.interactionId;
        if (removedTaskId && this.store.currentTask?.data?.interactionId === removedTaskId) {
          this.store.realtimeTranscriptionData = [];
        }
      }
      if (taskToRemove && this.store.currentTask?.data.interactionId === taskToRemove.data.interactionId) {
        this.setCurrentTask(null);
        this.setIsMuted(false);
      }

      this.setState({
        reset: true,
      });
      this.refreshTaskList();
    });
  };

  handleTaskMuteState = (task: ITask): void => {
    const isTelephony = task?.data?.interaction?.mediaType === MEDIA_TYPE_TELEPHONY_LOWER;

    // Each new telephony offer starts unmuted on Webex App / WebRTC media.
    // Widgets track mute locally in store.isMuted — reset so a prior call's mute
    // state does not leak into the next interaction (WXCC-6026 wxApp thick-client).
    // Background offers must not clobber mute for the currently engaged call.
    if (!isTelephony) {
      return;
    }

    const incomingId = task.data?.interactionId;
    const currentId = this.currentTask?.data?.interactionId;

    if (!currentId || currentId === incomingId) {
      this.setIsMuted(false);
    }
  };

  /**
   * Checks if a task is a campaign preview interaction.
   * Matches agent desktop logic that checks both outboundType and campaignType.
   */
  private isCampaignPreview = (task: ITask): boolean => {
    const outboundType = task.data.interaction.outboundType ?? '';
    const cpd = task.data.interaction.callProcessingDetails as unknown as
      | Record<string, string | undefined>
      | undefined;
    const campaignType = cpd?.campaignType ?? '';

    return (
      CAMPAIGN_PREVIEW_OUTBOUND_TYPES.includes(outboundType) || CAMPAIGN_PREVIEW_CAMPAIGN_TYPES.includes(campaignType)
    );
  };

  /**
   * Handles the campaign preview reservation event (agent accepted the preview).
   * Transitions state from RESERVED to ENGAGED, matching agent desktop behavior.
   */
  addAcceptedCampaign = (interactionId: string): void => {
    runInAction(() => {
      this.store.acceptedCampaignIds = new Set(this.store.acceptedCampaignIds).add(interactionId);
    });
  };

  removeAcceptedCampaign = (interactionId: string): void => {
    runInAction(() => {
      const next = new Set(this.store.acceptedCampaignIds);
      next.delete(interactionId);
      this.store.acceptedCampaignIds = next;
    });
  };

  setShowE911Modal = (value: boolean): void => {
    runInAction(() => {
      this.store.showE911Modal = value;
    });
  };

  setIsEmergencyModalAlreadyDisplayed = (value: boolean): void => {
    runInAction(() => {
      this.store.isEmergencyModalAlreadyDisplayed = value;
    });
  };

  fetchUserPreferences = async (): Promise<void> => {
    try {
      if (!this.store.cc.userPreference) {
        this.store.logger.warn('CC-Widgets: fetchUserPreferences(): userPreference service not available', {
          module: 'storeEventsWrapper.ts',
          method: 'fetchUserPreferences',
        });
        throw new Error('userPreference service not available');
      }

      let response;
      try {
        response = await this.store.cc.userPreference.getUserPreference();
      } catch (getError) {
        if ((getError as {statusCode?: number})?.statusCode === 404) {
          // First-time user: no preference record has been created yet. This is not a failure -
          // treat it the same as "not yet acknowledged" so the E911 modal can still be shown.
          this.store.logger.info('CC-Widgets: fetchUserPreferences(): no user preference record exists yet', {
            module: 'storeEventsWrapper.ts',
            method: 'fetchUserPreferences',
          });
          runInAction(() => {
            this.store.isEmergencyModalAlreadyDisplayed = false;
          });

          return;
        }

        throw getError;
      }

      // The SDK returns the persisted desktopPreference JSON string nested under `preferences`,
      // not as a top-level field - see CAI-7906.
      const desktopPrefString = response?.preferences?.desktopPreference;

      let isEmergencyModalAlreadyDisplayed = false;

      if (desktopPrefString) {
        try {
          const desktopPref = JSON.parse(desktopPrefString) as DesktopPreference;
          isEmergencyModalAlreadyDisplayed = desktopPref.isEmergencyModalAlreadyDisplayed ?? false;
        } catch (parseError) {
          this.store.logger.error('CC-Widgets: fetchUserPreferences(): failed to parse desktopPreference', {
            module: 'storeEventsWrapper.ts',
            method: 'fetchUserPreferences',
            error: parseError,
          });
        }
      }

      runInAction(() => {
        this.store.isEmergencyModalAlreadyDisplayed = isEmergencyModalAlreadyDisplayed;
      });
    } catch (error) {
      this.store.logger.error('CC-Widgets: fetchUserPreferences(): failed to fetch user preferences', {
        module: 'storeEventsWrapper.ts',
        method: 'fetchUserPreferences',
        error,
      });
      throw error;
    }
  };

  updateEmergencyModalAcknowledgment = async (): Promise<void> => {
    try {
      if (!this.store.cc.userPreference) {
        this.store.logger.warn(
          'CC-Widgets: updateEmergencyModalAcknowledgment(): userPreference service not available',
          {
            module: 'storeEventsWrapper.ts',
            method: 'updateEmergencyModalAcknowledgment',
          }
        );
        throw new Error('userPreference service not available');
      }

      let response;
      let hasExistingRecord = true;
      try {
        response = await this.store.cc.userPreference.getUserPreference();
      } catch (getError) {
        if ((getError as {statusCode?: number})?.statusCode === 404) {
          // First-time user: no preference record exists yet, so there's nothing to merge and
          // no userId to reuse. Fall through and create the record below.
          hasExistingRecord = false;
        } else {
          throw getError;
        }
      }

      // The SDK returns the persisted desktopPreference JSON string nested under `preferences`,
      // not as a top-level field - see CAI-7906.
      const existingDesktopPrefString = response?.preferences?.desktopPreference;

      let existingDesktopPref: DesktopPreference = {};
      if (existingDesktopPrefString) {
        try {
          existingDesktopPref = JSON.parse(existingDesktopPrefString) as DesktopPreference;
        } catch (parseError) {
          this.store.logger.error(
            'CC-Widgets: updateEmergencyModalAcknowledgment(): failed to parse existing desktopPreference',
            {
              module: 'storeEventsWrapper.ts',
              method: 'updateEmergencyModalAcknowledgment',
              error: parseError,
            }
          );
        }
      }

      const desktopPreference = JSON.stringify({
        ...existingDesktopPref,
        isEmergencyModalAlreadyDisplayed: true,
      });

      if (hasExistingRecord) {
        await this.store.cc.userPreference.updateUserPreference(response?.userId, {
          desktopPreference,
        });
      } else {
        // createUserPreference's userId must be the CI user id, not the CC agentId - they can
        // differ (see the existing-record update path above, which uses response.userId for the
        // same reason). There's no existing preference record to read the CI id from here, so
        // pull it from the underlying webex SDK instead of guessing with store.agentId.
        // @ts-expect-error - webex internal device API not typed
        const ciUserId: string = this.store.cc.webex.internal.device.userId;

        await this.store.cc.userPreference.createUserPreference({
          userId: ciUserId,
          desktopPreference,
        });
      }

      runInAction(() => {
        this.store.isEmergencyModalAlreadyDisplayed = true;
        this.store.showE911Modal = false;
      });

      this.store.logger.info(
        'CC-Widgets: updateEmergencyModalAcknowledgment(): successfully updated emergency modal acknowledgment',
        {
          module: 'storeEventsWrapper.ts',
          method: 'updateEmergencyModalAcknowledgment',
        }
      );
    } catch (error) {
      this.store.logger.error('CC-Widgets: updateEmergencyModalAcknowledgment(): failed to update user preferences', {
        module: 'storeEventsWrapper.ts',
        method: 'updateEmergencyModalAcknowledgment',
        error,
      });
      throw error;
    }
  };

  handleCampaignPreviewReservation = (event: ITask) => {
    const isCampaignPreview = this.isCampaignPreview(event);

    runInAction(() => {
      if (isCampaignPreview) {
        this.setState({
          developerName: RESERVED_LABEL,
          name: RESERVED_USERNAME,
        });
      } else {
        this.setState({
          developerName: ENGAGED_LABEL,
          name: ENGAGED_USERNAME,
        });
      }
    });
    this.refreshTaskList();
  };

  handleTaskEnd = (endedTask: ITask) => {
    this.setIsDeclineButtonEnabled(false);
    if (this.currentTask?.data?.interactionId === endedTask?.data?.interactionId) {
      this.setIsMuted(false);
    }
    this.scheduleTaskListRefresh();
  };

  handleTaskAssigned = (event) => {
    const task = event;
    if (this.onTaskAssigned) {
      this.onTaskAssigned(task);
    }
    runInAction(() => {
      // For accepted campaign previews (state !== 'new'), record acceptance
      // before promoting to currentTask so setCurrentTask allows it through.
      if (this.isCampaignPreview(task) && task.data.interaction.state !== 'new') {
        this.addAcceptedCampaign(task.data.interactionId);
      }

      this.setCurrentTask(task);

      // Pending (state 'new') campaign previews keep agent in RESERVED
      if (this.isCampaignPreview(task) && task.data.interaction.state === 'new') {
        this.setState({
          developerName: RESERVED_LABEL,
          name: RESERVED_USERNAME,
        });
      } else {
        this.setState({
          developerName: ENGAGED_LABEL,
          name: ENGAGED_USERNAME,
        });
      }
    });
  };

  handleTaskMedia = (track) => {
    this.setCallControlAudio(new MediaStream([track]));
  };

  handleRealTimeAssist = (interactionId: string, payload: RealTimeAssistPayload) => {
    if (!interactionId || !payload?.data) return;
    runInAction(() => {
      const current = (this.store.realTimeAssist && this.store.realTimeAssist[interactionId]) || [];
      this.store.realTimeAssist = {
        ...(this.store.realTimeAssist || {}),
        [interactionId]: [...current, payload],
      };
    });
  };

  clearRealTimeAssist = (interactionId: string): void => {
    if (!interactionId) return;
    runInAction(() => {
      if (this.store.realTimeAssist?.[interactionId]) {
        const next = {...this.store.realTimeAssist};
        delete next[interactionId];
        this.store.realTimeAssist = next;
      }
    });
  };

  // Case to handle multi session
  handleConsultCreated = () => {
    this.refreshTaskList();
    this.setConsultStartTimeStamp(Date.now());
  };

  handleConsulting = () => {
    this.refreshTaskList();
    this.setConsultStartTimeStamp(Date.now());
  };

  handleConsultEnd = () => {
    this.setIsQueueConsultInProgress(false);
    this.setCurrentConsultQueueId(null);
    this.setLastConsultDestination(null);
    this.setConsultStartTimeStamp(null);
    this.scheduleTaskListRefresh();
  };

  handleConsultOffer = () => {
    this.refreshTaskList();
  };

  handleAutoAnswer = () => {
    this.setIsDeclineButtonEnabled(true);
    this.refreshTaskList();
  };

  handleConsultAccepted = (event) => {
    const task = event;
    runInAction(() => {
      this.refreshTaskList();
      this.setConsultStartTimeStamp(Date.now());
      this.setState({
        developerName: ENGAGED_LABEL,
        name: ENGAGED_USERNAME,
      });
      if (this.deviceType === DEVICE_TYPE_BROWSER) {
        task.on(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
      }
    });
  };

  handleConsultQueueCancelled = () => {
    this.setIsQueueConsultInProgress(false);
    this.setCurrentConsultQueueId(null);
    this.setLastConsultDestination(null);
    this.setConsultStartTimeStamp(null);
    this.refreshTaskList();
  };

  handleConferenceStarted = (event?: ITask) => {
    this.advanceAISummaryOwnershipFromTaskEvent(event, 'conference-established', {
      advanceWhenFirstObserved: true,
      resetWhenOwnerChanges: true,
    });
    runInAction(() => {
      this.setIsQueueConsultInProgress(false);
      this.setCurrentConsultQueueId(null);
      this.setLastConsultDestination(null);
      this.setConsultStartTimeStamp(null);
    });
    this.refreshTaskList();
  };

  handleConferenceEnded = () => {
    this.refreshTaskList();
  };

  handleConferenceTransferred = (event?: ITask) => {
    this.advanceAISummaryOwnershipFromTaskEvent(event, 'transfer-conference', {
      advanceWhenFirstObserved: true,
      resetWhenOwnerChanges: true,
    });
    this.refreshTaskList();
  };

  /**
   * Register all task event listeners
   * @param task - The task to register event listeners for
   */
  handleUIControlsUpdated = () => {
    this.refreshTaskList();
  };

  handleWxAppMuteStateUpdated = (payload: {muted: boolean}, task: ITask) => {
    if (this.currentTask?.data?.interactionId === task.data?.interactionId) {
      this.setIsMuted(payload.muted);
    }
  };

  handleSwitchCall = () => {
    this.refreshTaskList();
  };

  private handleReceiverAISummaryPayload(
    task: ITask,
    payload: unknown,
    boundContext = this.resolveReceiverAISummaryTaskContext(task)
  ): void {
    if (!boundContext || boundContext.agentId !== this.agentId) {
      return;
    }
    if (!this.isCurrentAISummaryTask(task)) {
      return;
    }
    const boundary = resolveAISummaryCanonicalInteraction(task);
    if (boundary.kind !== 'valid' || boundary.interactionId !== boundContext.interactionId) {
      return;
    }
    const actionType = boundContext.actionType;
    const arrivalOrder = this.aiSummaryPayloadArrivalOrder + 1;
    const normalized = normalizeAISummaryPayload({
      raw: payload,
      role: 'receiver',
      expectedInteractionId: boundary.interactionId,
      arrivalOrder,
    });
    if (normalized.kind === 'discarded-interaction-mismatch') {
      return;
    }
    const storedCapability = this.getCapability(boundary.interactionId);
    if (!storedCapability?.midCallEnabled && !task.aiSummaryCapabilities.midCallEnabled) {
      return;
    }
    if (!storedCapability?.midCallEnabled) {
      this.seedAISummaryCapabilityFromTask(task);
    }
    const capability = this.getCapability(boundary.interactionId);
    if (!capability?.midCallEnabled) {
      return;
    }
    this.aiSummaryPayloadArrivalOrder = arrivalOrder;
    const state = this.ensureOwnerState({kind: 'mid-call', role: 'receiver', task, actionType});
    if (!state) {
      return;
    }
    const stateKey = ownerKeyToString(state.ownerKey, 'receiver');
    const request: PendingAISummaryRequest = {
      sequence: ++this.aiSummaryRequestSequence,
      ownerStateKey: stateKey,
      ownerKey: state.ownerKey,
      kind: 'mid-call',
      role: 'receiver',
      actionType,
      deadlineAt: Date.now() + AI_SUMMARY_REQUEST_TIMEOUT_MS,
      settlementClosed: true,
    };
    this.applyAISummaryResult(request, normalized);
  }

  private handleAISummaryWrappedUp(task: ITask, ownerKey?: AISummaryOwnerKey): void {
    try {
      const boundary = resolveAISummaryCanonicalInteraction(task);
      const agentId = this.getAgentIdForTask(task);
      if (boundary.kind === 'valid') {
        if (ownerKey) {
          this.aiSummaryWrappedUpObservedOwnerKeys.add(aiSummaryOwnerRegistryKey(ownerKey));
        }
        const entries = Object.entries(this.store.aiSummaryOwnerStates ?? {});
        const nextStates = {...this.store.aiSummaryOwnerStates};
        let changed = false;
        for (const [stateKey, state] of entries) {
          const matchesOwner = ownerKey
            ? sameAISummaryOwnerKey(state.ownerKey, ownerKey)
            : state.ownerKey.interactionId === boundary.interactionId && state.ownerKey.agentId === agentId;
          if (state.kind === 'post-call' && matchesOwner) {
            this.aiSummaryWrappedUpObservedOwnerKeys.add(aiSummaryOwnerRegistryKey(state.ownerKey));
            nextStates[stateKey] = {
              ...state,
              agentWrappedUpObserved: true,
              postCallFeedbackPending: false,
            };
            changed = true;
          }
        }
        if (changed) {
          runInAction(() => {
            this.store.aiSummaryOwnerStates = nextStates;
          });
        }
        this.evictAISummaryInteraction(boundary.interactionId, {retainPostCall: true});
      }
    } finally {
      this.refreshTaskList();
    }
  }

  private registerTaskEventListeners = (task: ITask): void => {
    const taskId = task.data?.interactionId;
    this.seedAISummaryCapabilityFromTask(task);
    this.rememberAISummaryTopology(task);
    if (taskId) {
      const existingEnd = this.taskEndListeners[taskId];
      if (existingEnd?.task !== task) {
        existingEnd?.task?.off(TASK_EVENTS.TASK_END, existingEnd.listener);
        const endListener = () => this.handleTaskEnd(task);
        this.taskEndListeners[taskId] = {task, listener: endListener};
        task.on(TASK_EVENTS.TASK_END, endListener);
      }
    } else {
      task.on(TASK_EVENTS.TASK_END, () => this.handleTaskEnd(task));
    }
    task.on(TASK_EVENTS.TASK_ASSIGNED, this.handleTaskAssigned);
    task.on(TASK_EVENTS.TASK_REJECT, (reason) => this.handleTaskReject(task, reason));
    task.on(TASK_EVENTS.TASK_OUTDIAL_FAILED, (reason) => this.handleOutdialFailed(reason));

    // SDK-computed UI control updates
    task.on(TASK_EVENTS.TASK_UI_CONTROLS_UPDATED, this.handleUIControlsUpdated);

    // Renamed events (SDK names)
    const registeredWrappedUpBindings = this.ensureAISummaryWrappedUpBindingsForTask(task);
    if (registeredWrappedUpBindings === 0) {
      task.on(TASK_EVENTS.TASK_WRAPPEDUP, this.refreshTaskList);
    }
    task.on(TASK_EVENTS.TASK_CONSULT_CREATED, this.handleConsultCreated);
    task.on(TASK_EVENTS.TASK_OFFER_CONTACT, this.refreshTaskList);

    // Fix: wire handleConsultEnd (was dead code — previously wired to refreshTaskList)
    task.on(TASK_EVENTS.TASK_CONSULT_END, this.handleConsultEnd);

    // Fix: correct event names
    task.on(TASK_EVENTS.TASK_RECORDING_PAUSED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_RECORDING_RESUMED, this.refreshTaskList);

    task.on(TASK_EVENTS.TASK_AUTO_ANSWERED, this.handleAutoAnswer);
    task.on(TASK_EVENTS.TASK_CONSULTING, this.handleConsulting);
    task.on(TASK_EVENTS.TASK_CONSULT_ACCEPTED, this.handleConsultAccepted);
    task.on(TASK_EVENTS.TASK_CONSULT_QUEUE_CANCELLED, this.handleConsultQueueCancelled);
    task.on(TASK_EVENTS.TASK_PARTICIPANT_JOINED, this.handleConferenceStarted);
    task.on(TASK_EVENTS.TASK_CONFERENCE_STARTED, this.handleConferenceStarted);
    task.on(TASK_EVENTS.TASK_CONFERENCE_ENDED, this.handleConferenceEnded);
    task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT, this.handleConferenceEnded);
    task.on(TASK_EVENTS.TASK_OFFER_CONSULT, this.handleConsultOffer);

    task.on(TASK_EVENTS.TASK_SWITCH_CALL, this.handleSwitchCall);
    task.on(TASK_EVENTS.TASK_HOLD, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_RESUME, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_POST_CALL_ACTIVITY, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_ESTABLISHING, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_FAILED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_END_FAILED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_PARTICIPANT_LEFT_FAILED, this.refreshTaskList);
    task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFERRED, this.handleConferenceTransferred);
    task.on(TASK_EVENTS.TASK_CONFERENCE_TRANSFER_FAILED, this.refreshTaskList);

    // Campaign preview: transition RESERVED → ENGAGED when the agent accepts
    task.on(TASK_EVENTS.TASK_CAMPAIGN_PREVIEW_RESERVATION, this.handleCampaignPreviewReservation);
    task.on(TASK_EVENTS.TASK_CAMPAIGN_CONTACT_UPDATED, this.refreshTaskList);

    if (taskId) {
      const existingMute = this.wxAppMuteStateListeners[taskId];
      if (existingMute?.task !== task) {
        existingMute?.task?.off(TASK_EVENTS.TASK_WXAPP_MUTE_STATE_UPDATED, existingMute.listener);
        const wxAppMuteListener = (payload: {muted: boolean}) => this.handleWxAppMuteStateUpdated(payload, task);
        this.wxAppMuteStateListeners[taskId] = {task, listener: wxAppMuteListener};
        task.on(TASK_EVENTS.TASK_WXAPP_MUTE_STATE_UPDATED, wxAppMuteListener);
      }
    }
    if (taskId && !this.realtimeTranscriptionListeners[taskId]) {
      this.realtimeTranscriptionListeners[taskId] = (payload: RealTimeTranscriptionEventPayload) =>
        this.handleRealtimeTranscription(payload);
    }
    if (taskId && this.realtimeTranscriptionListeners[taskId]) {
      task.on(CC_EVENTS.REAL_TIME_TRANSCRIPTION, this.realtimeTranscriptionListeners[taskId]);
    }

    if (this.deviceType === DEVICE_TYPE_BROWSER) {
      task.on(TASK_EVENTS.TASK_MEDIA, this.handleTaskMedia);
    }

    // Avoid duplicate registration when this method is re-entered for the same
    // task, but do rebind when task:hydrate / task:merged supplies a
    // replacement object for the same interaction.
    if (taskId) {
      const existing = this.realTimeAssistListeners[taskId];
      if (existing?.task !== task) {
        existing?.task?.off(SUGGESTED_RESPONSE_EVENT, existing.listener);
        const listener = (payload: RealTimeAssistPayload) => this.handleRealTimeAssist(taskId, payload);
        this.realTimeAssistListeners[taskId] = {task, listener};
        task.on(SUGGESTED_RESPONSE_EVENT, listener);
      }
      const existingFeature = this.aiSummaryFeatureEnablementListeners[taskId];
      const existingReceiver = this.aiSummaryReceiverListeners[taskId];
      if (!isTelephonyTask(task)) {
        existingFeature?.task?.off(TASK_EVENTS.TASK_FEATURE_ENABLEMENT, existingFeature.listener);
        existingReceiver?.task?.off(TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED, existingReceiver.listener);
        delete this.aiSummaryFeatureEnablementListeners[taskId];
        delete this.aiSummaryReceiverListeners[taskId];
      } else {
        if (existingFeature?.task !== task) {
          existingFeature?.task?.off(TASK_EVENTS.TASK_FEATURE_ENABLEMENT, existingFeature.listener);
          const listener = (payload: unknown) => this.handleAISummaryFeatureEnablement(payload, task);
          this.aiSummaryFeatureEnablementListeners[taskId] = {task, listener};
          task.on(TASK_EVENTS.TASK_FEATURE_ENABLEMENT, listener);
        }
        const context = this.resolveReceiverAISummaryTaskContext(task);
        const receiverContextChanged =
          existingReceiver?.context.interactionId !== context?.interactionId ||
          existingReceiver?.context.agentId !== context?.agentId ||
          existingReceiver?.context.actionType !== context?.actionType;
        if (existingReceiver?.task !== task || receiverContextChanged) {
          existingReceiver?.task?.off(TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED, existingReceiver.listener);
          if (context) {
            const listener = (payload: unknown) => this.handleReceiverAISummaryPayload(task, payload, context);
            this.aiSummaryReceiverListeners[taskId] = {task, listener, context};
            task.on(TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED, listener);
          } else {
            delete this.aiSummaryReceiverListeners[taskId];
          }
        }
      }
    }
  };

  handleIncomingTask = (event) => {
    const task: ITask = event;

    // Register all task event listeners
    this.registerTaskEventListeners(task);

    // In case of consulting we check if the task is already in the task list
    // If it is, we dont have to send the incoming task callback
    if (this.onIncomingTask && !this.taskList[task.data.interactionId]) {
      this.onIncomingTask({task});
      this.handleTaskMuteState(task);
    }

    // We should update the task list in the store after sending the incoming task callback
    this.refreshTaskList();
  };

  /**
   * Handles the initial arrival of a campaign task.
   * The SDK emits TASK_CAMPAIGN_PREVIEW_RESERVATION for all campaign types.
   * Only standard and direct preview campaigns should enter RESERVED state
   * (the agent must explicitly accept/skip the preview contact).
   * Predictive and progressive campaigns go straight to the regular flow —
   * they will transition directly to ENGAGED via handleTaskAssigned.
   */
  handleIncomingCampaignPreview = (event: ITask) => {
    const task: ITask = event;

    this.registerTaskEventListeners(task);

    if (this.onIncomingTask && !this.taskList[task.data.interactionId]) {
      this.onIncomingTask({task});
      this.handleTaskMuteState(task);
    }

    // Only standard/direct preview campaigns enter RESERVED state.
    // Predictive and progressive campaigns skip RESERVED and will
    // transition to ENGAGED when handleTaskAssigned fires.
    if (this.isCampaignPreview(task)) {
      runInAction(() => {
        this.setState({
          developerName: RESERVED_LABEL,
          name: RESERVED_USERNAME,
        });
      });
    }

    this.refreshTaskList();
  };

  handleStateChange = (data) => {
    this.store.logger.info('CC-Widgets: handleStateChange(): agent state changed', {
      module: 'storeEventsWrapper.ts',
      method: 'handleStateChange',
    });
    if (data && typeof data === 'object' && data.type === 'AgentStateChangeSuccess') {
      const DEFAULT_CODE = '0'; // Default code when no aux code is present
      this.setCurrentState(data.auxCodeId?.trim() !== '' ? data.auxCodeId : DEFAULT_CODE);

      this.setLastStateChangeTimestamp(data.lastStateChangeTimestamp);
      this.setLastIdleCodeChangeTimestamp(data.lastIdleCodeChangeTimestamp);
    }
  };

  handleMultiLoginCloseSession = (data) => {
    this.store.logger.info('CC-Widgets: handleMultiLoginCloseSession(): multi-login alert', {
      module: 'storeEventsWrapper.ts',
      method: 'handleMultiLoginCloseSession',
    });
    if (data && typeof data === 'object' && data.type === 'AgentMultiLoginCloseSession') {
      // Don't show the multi-login modal if there's an active task
      // The modal blocks UI interactions and should not interfere with task handling
      if (this.currentTask) {
        this.store.logger.info('CC-Widgets: handleMultiLoginCloseSession(): skipping alert due to active task', {
          module: 'storeEventsWrapper.ts',
          method: 'handleMultiLoginCloseSession',
        });
        return;
      }
      this.setShowMultipleLoginAlert(true);
    }
  };

  handleTaskMerged = (event) => {
    const task = event;
    this.registerTaskEventListeners(task);
    this.advanceAISummaryOwnershipFromTaskEvent(task, 'topology-cycle', {resetWhenOwnerChanges: true});
    this.refreshTaskList();
  };

  private getTaskInteractionId = (task: ITask | null | undefined): string | undefined => {
    return (
      task?.data?.interactionId ??
      // SDK task-class mode compatibility
      (task as ITask & {getInteractionId?: () => string})?.getInteractionId?.() ??
      (task as ITask & {getInteraction?: () => {id?: string}})?.getInteraction?.()?.id
    );
  };

  private getTaskInteractionState = (task: ITask | null | undefined): string | undefined => {
    return (
      task?.data?.interaction?.state ??
      // SDK task-class mode compatibility
      (task as ITask & {getInteractionState?: () => string})?.getInteractionState?.() ??
      (task as ITask & {getInteraction?: () => {state?: string}})?.getInteraction?.()?.state
    );
  };

  handleMultiLoginHydrate = (event) => {
    const task = event as ITask;
    if (!task) {
      this.store.logger.warn('CC-Widgets: handleMultiLoginHydrate(): task payload missing', {
        module: 'storeEventsWrapper.ts',
        method: 'handleMultiLoginHydrate',
      });
      return;
    }

    const interactionId = this.getTaskInteractionId(task);
    const interactionState = this.getTaskInteractionState(task);

    if (interactionId && this.store.taskList[interactionId] && interactionState === 'new') {
      return;
    }

    this.registerTaskEventListeners(task);

    // Mark accepted campaign previews BEFORE refreshTaskList so that
    // setCurrentTask's isPendingPreview guard allows them through.
    if (this.isCampaignPreview(task) && task.data.interaction.state !== 'new') {
      this.addAcceptedCampaign(task.data.interactionId);
    }

    this.refreshTaskList();
    this.handleTaskAssigned(task);
  };

  handleTaskHydrate = (event) => {
    const task = event;

    // Register all task event listeners
    this.registerTaskEventListeners(task);
    this.advanceAISummaryOwnershipFromTaskEvent(task, 'topology-cycle', {resetWhenOwnerChanges: true});

    // Mark accepted campaign previews BEFORE refreshTaskList so that
    // setCurrentTask's isPendingPreview guard allows them through when
    // refreshTaskList internally promotes a task from the task list.
    if (this.isCampaignPreview(task) && task.data.interaction.state !== 'new') {
      this.addAcceptedCampaign(task.data.interactionId);
    }

    this.refreshTaskList();

    this.setCurrentTask(task);
    if (task.data.interaction.state === 'consulting') {
      if (task.data.isConsulted) {
        // this.setConsultAccepted(true);
      }
      this.setConsultStartTimeStamp(Date.now());
    }

    if (this.isCampaignPreview(task) && task.data.interaction.state === 'new') {
      this.setState({
        developerName: RESERVED_LABEL,
        name: RESERVED_USERNAME,
      });
    } else if (this.isCampaignPreview(task)) {
      this.setState({
        developerName: ENGAGED_LABEL,
        name: ENGAGED_USERNAME,
      });
    } else if (
      (['wrapUp', 'connected'].includes(task.data.interaction.state) && !task.data.isConsulted) ||
      task.data.wrapUpRequired
    ) {
      this.setState({
        developerName: ENGAGED_LABEL,
        name: ENGAGED_USERNAME,
      });
    }

    const {interaction} = task.data;
    const {isTerminated} = interaction;

    // Update call control states
    if (isTerminated) {
      if (!task.data.wrapUpRequired) {
        this.setState({reset: true});
      }

      return;
    }
  };

  handleTaskReject = (task: ITask, reason: string) => {
    if (this.onTaskRejected) {
      this.onTaskRejected(task, reason || 'No reason provided');
    }
    this.refreshTaskList();
  };

  handleOutdialFailed = (reason: string) => {
    if (this.onOutdialFailed) {
      this.onOutdialFailed(reason || 'No reason provided');
    }
  };

  handleRealtimeTranscription = (payload: RealTimeTranscriptionEventPayload) => {
    const transcriptData = payload.data;
    if (!transcriptData?.messageId) return;

    const content = transcriptData.content || '';
    if (!content) return;

    const role = transcriptData.role.toUpperCase();
    const publishTimestampRaw = transcriptData.publishTimestamp;
    const publishTimestamp =
      typeof publishTimestampRaw === 'number'
        ? publishTimestampRaw
        : Number.parseInt(`${publishTimestampRaw || Date.now()}`, 10);
    const normalizedPublishTimestamp = Number.isNaN(publishTimestamp) ? Date.now() : publishTimestamp;

    runInAction(() => {
      const transcriptLines = this.store.realtimeTranscriptionData || [];
      const newTranscriptData = {
        ...transcriptData,
        role,
        content,
        publishTimestamp: normalizedPublishTimestamp,
      };
      const hasExistingLine = transcriptLines.some((line) => line.messageId === transcriptData.messageId);

      this.store.realtimeTranscriptionData = hasExistingLine
        ? transcriptLines.map((line) =>
            line.messageId === transcriptData.messageId ? {...line, ...newTranscriptData} : line
          )
        : [...transcriptLines, newTranscriptData];
    });
  };

  getBuddyAgents = async (actionOrMediaType?: string): Promise<Array<BuddyDetails>> => {
    try {
      const isAction = actionOrMediaType === 'Consult' || actionOrMediaType === 'Transfer';
      const taskMediaType = getSupportedMediaType(this.currentTask?.data?.interaction?.mediaType);
      const mediaType = isAction ? taskMediaType : (getSupportedMediaType(actionOrMediaType) ?? taskMediaType);
      const response = await this.store.cc.getBuddyAgents(
        isAction
          ? {
              action: actionOrMediaType,
              ...(mediaType ? {mediaType} : {}),
            }
          : {
              mediaType: mediaType ?? MEDIA_TYPE_TELEPHONY_LOWER,
              state: AGENT_STATE_AVAILABLE,
            }
      );
      return 'data' in response ? response.data.agentList : [];
    } catch (error) {
      this.store.logger.error('Error fetching buddy agents:', error);
      throw error;
    }
  };

  getQueues = async (
    mediaTypeOrParams?: string | ContactServiceQueueSearchParams,
    legacyParams?: ContactServiceQueueSearchParams
  ): Promise<ContactServiceQueuesResponse> => {
    try {
      const usesLegacyMediaSignature = typeof mediaTypeOrParams === 'string' || legacyParams !== undefined;
      const params = typeof mediaTypeOrParams === 'string' ? legacyParams : (mediaTypeOrParams ?? legacyParams);
      const mediaType =
        typeof mediaTypeOrParams === 'string' ? mediaTypeOrParams : this.currentTask?.data?.interaction?.mediaType;
      const supportedMediaType = getSupportedMediaType(mediaType);
      const taskFilter =
        usesLegacyMediaSignature || (supportedMediaType && supportedMediaType !== 'telephony')
          ? getQueueChannelFilter(mediaType)
          : undefined;
      const filter = taskFilter && params?.filter ? `${taskFilter};${params.filter}` : (taskFilter ?? params?.filter);

      return await this.store.cc.getQueues({
        ...(params ?? {}),
        ...(filter !== undefined ? {filter} : {}),
      });
    } catch (error) {
      this.store.logger.error('Error fetching queues:', error);
      throw error;
    }
  };

  getEntryPoints = async (params?: EntryPointSearchParams): Promise<EntryPointListResponse> => {
    try {
      const response: EntryPointListResponse = await this.store.cc.getEntryPoints(params);
      return response;
    } catch (error) {
      this.store.logger.error('Error fetching entry points:', error);
      throw error;
    }
  };

  getAddressBookEntries = async (params?: AddressBookEntrySearchParams): Promise<AddressBookEntriesResponse> => {
    try {
      if (!this.store.isAddressBookEnabled) {
        return {data: [], meta: {page: 0, totalPages: 0}};
      }
      const response: AddressBookEntriesResponse = await this.store.cc.addressBook.getEntries(params ?? {});
      return response;
    } catch (error) {
      this.store.logger.error('Error fetching address book entries:', error);
      throw error;
    }
  };

  getAccessToken = async (): Promise<string> => {
    try {
      // @ts-expect-error - webex credentials API not typed
      const tokenInfo = await this.store.cc.webex.credentials.getUserToken();
      return tokenInfo.access_token;
    } catch (error) {
      this.store.logger.error('CC-Widgets: getAccessToken(): failed to get access token', {
        module: 'storeEventsWrapper.ts',
        method: 'getAccessToken',
        error,
      });
      throw error;
    }
  };

  cleanUpStore = () => {
    this.store.logger.info('CC-Widgets: cleanUpStore(): resetting store on logout', {
      module: 'storeEventsWrapper.ts',
      method: 'cleanUpStore',
    });
    runInAction(() => {
      this.setIsAgentLoggedIn(false);
      this.setDeviceType('AGENT_DN');
      this.setDialNumber('');
      this.setCurrentTask(null);
      this.refreshTaskList();
      this.setLastStateChangeTimestamp(undefined);
      this.setLastIdleCodeChangeTimestamp(undefined);
      this.setShowMultipleLoginAlert(false);
      this.setConsultStartTimeStamp(undefined);
      this.setTeamId('');
      this.setDigitalChannelsInitialized(false);
      this.store.realtimeTranscriptionData = [];
      this.store.acceptedCampaignIds = new Set();
      this.realtimeTranscriptionListeners = {};
      this.setLastConsultDestination(null);
      this.setShowE911Modal(false);
      this.setIsEmergencyModalAlreadyDisplayed(false);
      this.store.realTimeAssist = {};
      this.realTimeAssistListeners = {};
      Object.values(this.aiSummaryFeatureEnablementListeners).forEach(({task, listener}) => {
        task.off(TASK_EVENTS.TASK_FEATURE_ENABLEMENT, listener);
      });
      Object.values(this.aiSummaryReceiverListeners).forEach(({task, listener}) => {
        task.off(TASK_EVENTS.TASK_MID_CALL_SUMMARY_RECEIVED, listener);
      });
      Object.values(this.aiSummaryWrappedUpSubscriptions).forEach(({bindings}) => {
        bindings.forEach(({task, listener}) => {
          task.off(TASK_EVENTS.TASK_WRAPPEDUP, listener);
        });
      });
      this.aiSummaryFeatureEnablementListeners = {};
      this.aiSummaryReceiverListeners = {};
      this.aiSummaryWrappedUpSubscriptions = {};
      this.aiSummarySeededCapabilityTasks = new WeakSet<ITask>();
      this.aiSummaryLatestFreshness = {};
      this.aiSummaryLatestRequestSequences = {};
      this.aiSummaryOwnerTasks = {};
      this.aiSummaryPendingRequestTasks = {};
      this.aiSummaryPendingOwnershipCaptures = {};
      this.aiSummaryAppliedOwnershipCaptureIds = new Set<string>();
      this.aiSummaryObservedOwnershipBoundaries = new Set<string>();
      this.aiSummaryTopologySignatures = {};
      this.aiSummaryWrappedUpObservedOwnerKeys = new Set<string>();
      this.retiredAISummaryInteractions.clear();
      this.postCallDraftCaptures.clear();
      this.store.aiSummaryCapabilities = {};
      this.store.aiSummaryCurrentOwners = {};
      this.store.aiSummaryOwnerStates = {};
      this.store.aiSummaryPendingRequests = {};
      this.store.aiSummaryLastResults = {};
      this.store.pendingAISummaryStatusTransitions = [];
    });
  };

  setupIncomingTaskHandler = (ccSDK: IContactCenter) => {
    let listenersAdded = false;

    const handleLogOut = () => {
      this.store.logger.log('CC-Widgets: setupIncomingTaskHandler(): logging out agent', {
        module: 'storeEventsWrapper.ts',
        method: 'setupIncomingTaskHandler#handleLogOut',
      });
      this.setAgentProfile({});
      this.cleanUpStore();
      removeEventListeners();
      listenersAdded = false;
    };

    const addEventListeners = () => {
      this.store.logger.info('CC-Widgets: setupIncomingTaskHandler(): adding CC SDK listeners', {
        module: 'storeEventsWrapper.ts',
        method: 'setupIncomingTaskHandler#addEventListeners',
      });
      ccSDK.on(TASK_EVENTS.TASK_HYDRATE, this.handleTaskHydrate);
      ccSDK.on(TASK_MULTI_LOGIN_HYDRATE, this.handleMultiLoginHydrate);
      ccSDK.on(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
      ccSDK.on(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);
      ccSDK.on(TASK_EVENTS.TASK_CAMPAIGN_PREVIEW_RESERVATION, this.handleIncomingCampaignPreview);
      ccSDK.on(TASK_EVENTS.TASK_MERGED, this.handleTaskMerged);
      ccSDK.on(CC_EVENTS.AGENT_MULTI_LOGIN, this.handleMultiLoginCloseSession);
      ccSDK.on(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogOut);
    };

    const removeEventListeners = () => {
      this.store.logger.info('CC-Widgets: setupIncomingTaskHandler(): removing CC SDK listeners', {
        module: 'storeEventsWrapper.ts',
        method: 'setupIncomingTaskHandler#removeEventListeners',
      });
      ccSDK.off(TASK_EVENTS.TASK_HYDRATE, this.handleTaskHydrate);
      ccSDK.off(TASK_MULTI_LOGIN_HYDRATE, this.handleMultiLoginHydrate);
      ccSDK.off(CC_EVENTS.AGENT_STATE_CHANGE, this.handleStateChange);
      ccSDK.off(TASK_EVENTS.TASK_INCOMING, this.handleIncomingTask);
      ccSDK.off(TASK_EVENTS.TASK_CAMPAIGN_PREVIEW_RESERVATION, this.handleIncomingCampaignPreview);
      ccSDK.off(TASK_EVENTS.TASK_MERGED, this.handleTaskMerged);
      ccSDK.off(CC_EVENTS.AGENT_MULTI_LOGIN, this.handleMultiLoginCloseSession);
      ccSDK.off(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogOut);
    };

    // TODO: https://jira-eng-gpk2.cisco.com/jira/browse/SPARK-626777 Implement the de-register method and close the listener there

    const handleLogin = (payload: Profile) => {
      this.store.logger.log('CC-Widgets: logging in the agent', {
        module: 'storeEventsWrapper.ts',
        method: 'setupIncomingTaskHandler#handleLogin',
      });
      runInAction(() => {
        this.setAgentProfile(payload);
        this.setIsAgentLoggedIn(true);
        this.setDeviceType(payload.deviceType);
        this.setDialNumber(payload.dn);
        // @ts-expect-error To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        this.setCurrentState(payload.auxCodeId?.trim() !== '' ? payload.auxCodeId : '0');
        this.setLastStateChangeTimestamp(payload.lastStateChangeTimestamp);
        this.setLastIdleCodeChangeTimestamp(payload.lastIdleCodeChangeTimestamp);
        // @ts-expect-error To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
        this.setTeamId(payload.teamId);
      });
    };

    ccSDK.on(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, handleLogin);

    [CC_EVENTS.AGENT_DN_REGISTERED, CC_EVENTS.AGENT_RELOGIN_SUCCESS].forEach((event) => {
      ccSDK.on(`${event}`, (payload) => {
        this.store.logger.info(`CC-Widgets: setupIncomingTaskHandler(): event '${event}' received`, {
          module: 'storeEventsWrapper.ts',
          method: 'setupIncomingTaskHandler',
        });
        runInAction(() => {
          if (event === CC_EVENTS.AGENT_RELOGIN_SUCCESS) {
            this.setAgentProfile(payload);
            this.setTeamId(payload.teamId);
          }
        });
        if (!listenersAdded) {
          addEventListeners();
          listenersAdded = true;
        }
      });
    });
  };
}

// Create and export a single instance of the wrapper
const storeWrapper = new StoreWrapper();
export default storeWrapper;
