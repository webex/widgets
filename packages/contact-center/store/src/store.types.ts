import {
  AgentLogin,
  Profile,
  BuddyDetails,
  ContactServiceQueue,
  ITask,
  BuddyAgents,
  BuddyAgentsResponse,
  StateChange,
  Logout,
  EntryPointRecord,
  EntryPointListResponse,
  EntryPointSearchParams,
  AddressBookEntry,
  AddressBookEntriesResponse,
  AddressBookEntrySearchParams,
  ContactServiceQueuesResponse,
  ContactServiceQueueSearchParams,
  AddressBook,
  TASK_EVENTS,
  TaskUIControls,
  TaskUIControlState,
  InteractionUIControls,
  TaskUILeg,
  getDefaultUIControls,
  TaskResponse,
} from '@webex/contact-center';
import type {AISummaryAction as SDKAISummaryAction} from '@webex/contact-center';
import type {RealTimeAssistanceParams} from 'node_modules/@webex/contact-center/dist/types/types';
import {
  OutdialAniEntriesResponse,
  OutdialAniParams,
} from 'node_modules/@webex/contact-center/dist/types/services/config/types';
import {
  DestinationType,
  PreviewContactPayload,
} from 'node_modules/@webex/contact-center/dist/types/services/task/types';
import {
  AgentProfileUpdate,
  LogContext,
  SetStateResponse,
  StationLoginResponse,
  StationLogoutResponse,
  Team,
  UpdateDeviceTypeResponse,
} from 'node_modules/@webex/contact-center/dist/types/types';

//  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
interface IContactCenter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (event: string, callback: (data: any) => void) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off: (event: string, callback?: (data: any) => void) => void;
  updateAgentProfile(data: AgentProfileUpdate): Promise<UpdateDeviceTypeResponse>;
  stationLogin(data: AgentLogin): Promise<StationLoginResponse>;
  deregister(): Promise<void>;
  stationLogout(data: Logout): Promise<StationLogoutResponse>;
  LoggerProxy: ILogger;
  register(): Promise<Profile>;
  taskManager: {
    getAllTasks: () => Record<string, ITask>;
  };
  getBuddyAgents(data: BuddyAgents): Promise<BuddyAgentsResponse>;
  getQueues(params?: ContactServiceQueueSearchParams): Promise<ContactServiceQueuesResponse>;
  getEntryPoints(params?: EntryPointSearchParams): Promise<EntryPointListResponse>;
  addressBook: AddressBook;
  agentConfig?: {
    regexUS: RegExp | string;
    agentId: string;
    outdialANIId: string;
  };
  setAgentState(data: StateChange): Promise<SetStateResponse>;
  getOutdialAniEntries(params: OutdialAniParams): Promise<OutdialAniEntriesResponse>;
  getAccessToken(): Promise<string>;
  startOutdial(destination: string, origin?: string): Promise<TaskResponse>;
  acceptPreviewContact(payload: PreviewContactPayload): Promise<TaskResponse>;
  skipPreviewContact(payload: PreviewContactPayload): Promise<TaskResponse>;
  removePreviewContact(payload: PreviewContactPayload): Promise<TaskResponse>;
  userPreference?: IUserPreferenceService;
  apiAIAssistant?: {
    getRealTimeAssistance(params: RealTimeAssistRequestParams & {actionTimeStamp?: number}): Promise<unknown>;
    sendRealTimeAssistanceUserAction(params: RealTimeAssistUserActionParams): Promise<unknown>;
  };
}

type RealTimeAssistRequestParams = RealTimeAssistanceParams;

type RealTimeAssistUserActionId = string;

type RealTimeAssistUserActionParams = {
  agentId: string;
  interactionId: string;
  adaptiveCardId: string;
  actionId: RealTimeAssistUserActionId;
  languageCode?: string;
};

type RealTimeAssistPayload = {
  agentId?: string;
  data: {
    adaptiveCard: unknown;
    adaptiveCardId?: string;
    title?: string;
    suggestion?: string;
    conversationId?: string;
    trackingId?: string;
    publishTimestamp?: number | string;
    [key: string]: unknown;
  };
  notifDetails?: {
    actionEvent?: string;
  };
  notifType?: string;
  orgId?: string;
};
//  To be fixed in SDK - https://jira-eng-sjc12.cisco.com/jira/browse/CAI-6762
type IWebex = {
  cc: IContactCenter;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once: (event: string, callback: (data: any) => void) => void;
};

type ILogger = {
  log: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  trace: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
};

type WithWebex = {
  webex: {cc: IContactCenter; logger: ILogger; config?: {cc?: WebexCcInitConfig}};
};

/** Host init config read from `webexConfig.cc` before `store.init()`. */
type WebexCcInitConfig = {
  enableWxBetterTogether?: boolean;
};

type WithWebexConfig = {
  webexConfig: {cc?: WebexCcInitConfig; [key: string]: unknown};
  access_token: string;
};

type InitParams = WithWebex | WithWebexConfig;

type OfferActionErrorDisplay = {
  message: string;
  isWxAppTelephonyError?: boolean;
  trackingId?: string;
  status?: number | string;
};

type IdleCode = {
  name: string;
  id: string;
  isSystem: boolean;
  isDefault: boolean;
};

type RealTimeTranscriptionData = {
  content: string;
  conversationId: string;
  isFinal: boolean;
  languageCode?: string;
  messageId: string;
  orgId: string;
  publishTimestamp: number | string;
  role: string;
  trackingId: string;
  utteranceId: string;
};

type RealTimeTranscriptionEventPayload = {
  agentId: string;
  data: RealTimeTranscriptionData;
  notifDetails: {
    actionEvent?: string;
  };
  notifType: string;
  orgId: string;
};

interface IStore {
  featureFlags: {[key: string]: boolean};
  teams: Team[];
  loginOptions: string[];
  cc: IContactCenter;
  idleCodes: IdleCode[];
  agentId: string;
  logger: ILogger;
  wrapupCodes: IWrapupCode[];
  currentTask: ITask;
  taskList: Record<string, ITask>;
  isAgentLoggedIn: boolean;
  deviceType: string;
  teamId: string;
  dialNumber: string;
  currentState: string;
  lastStateChangeTimestamp?: number;
  lastIdleCodeChangeTimestamp?: number;
  showMultipleLoginAlert: boolean;
  currentTheme: string;
  customState: ICustomState;
  isQueueConsultInProgress: boolean;
  isDeclineButtonEnabled: boolean;
  currentConsultQueueId: string;
  lastConsultDestination: {to: string; destinationType: DestinationType} | null;
  consultStartTimeStamp?: number;
  callControlAudio: MediaStream | null;
  isEndConsultEnabled: boolean;
  allowConsultToQueue: boolean;
  agentProfile: AgentLoginProfile;
  isMuted: boolean;
  /** Read-only host init flag — set at `webexConfig.cc.enableWxBetterTogether` before init. */
  enableWxBetterTogether: boolean;
  isAddressBookEnabled: boolean;
  isDigitalChannelsInitialized: boolean;
  dataCenter: string;
  realtimeTranscriptionData: Partial<RealTimeTranscriptionData>[];
  acceptedCampaignIds: Set<string>;
  showE911Modal: boolean;
  isEmergencyModalAlreadyDisplayed: boolean;
  realTimeAssist: Record<string, RealTimeAssistPayload[]>;
  offerActionErrors: Record<string, OfferActionErrorDisplay>;
  aiSummaryCapabilities: Record<string, AISummaryCapabilityRecord>;
  aiSummaryCurrentOwners: Record<string, AISummaryCurrentOwnerSlots>;
  aiSummaryOwnerStates: Record<string, AISummaryOwnerState>;
  aiSummaryPendingRequests: Record<number, AISummaryPendingRequest>;
  aiSummaryLastResults: Record<string, AISummaryLastResult>;
  pendingAISummaryStatusTransitions: readonly AISummaryStatusTransition[];
  init(params: InitParams, callback: (ccSDK: IContactCenter) => void): Promise<void>;
  registerCC(webex?: WithWebex['webex']): Promise<void>;
}

interface IStoreWrapper extends IStore {
  store: IStore;
  onErrorCallback?: (widgetName: string, error: Error) => void;
  setCurrentTask(task: ITask): void;
  refreshTaskList(): void;
  getBuddyAgents(action: 'Consult' | 'Transfer'): Promise<BuddyDetails[]>;
  getBuddyAgents(mediaType?: string): Promise<BuddyDetails[]>;
  getQueues(params?: ContactServiceQueueSearchParams): Promise<ContactServiceQueuesResponse>;
  getQueues(
    mediaType: string | undefined,
    params?: ContactServiceQueueSearchParams
  ): Promise<ContactServiceQueuesResponse>;
  getEntryPoints(params?: EntryPointSearchParams): Promise<EntryPointListResponse>;
  getAddressBookEntries(params?: AddressBookEntrySearchParams): Promise<AddressBookEntriesResponse>;
  setDeviceType(option: string): void;
  setDialNumber(input: string): void;
  setCurrentState(state: string): void;
  setLastStateChangeTimestamp(timestamp: number): void;
  setLastIdleCodeChangeTimestamp(timestamp: number): void;
  setShowMultipleLoginAlert(value: boolean): void;
  setCurrentTheme(theme: string): void;
  setIsAgentLoggedIn(value: boolean): void;
  setWrapupCodes(wrapupCodes: IWrapupCode[]): void;
  setState(state: IdleCode | ICustomState): void;
  setConsultStartTimeStamp(timestamp: number): void;
  setAgentProfile(profile: Profile): void;
  setTeamId(id: string): void;
  setIsMuted(value: boolean): void;
  setIsDeclineButtonEnabled(value: boolean): void;
  setDigitalChannelsInitialized(value: boolean): void;
  setOnError(callback: (widgetName: string, error: Error) => void): void;
  setDataCenter(value: string): void;
  getAccessToken(): Promise<string>;
  addAcceptedCampaign(interactionId: string): void;
  removeAcceptedCampaign(interactionId: string): void;
  setShowE911Modal(value: boolean): void;
  setIsEmergencyModalAlreadyDisplayed(value: boolean): void;
  fetchUserPreferences(): Promise<void>;
  updateEmergencyModalAcknowledgment(): Promise<void>;
  clearRealTimeAssist(interactionId: string): void;
  setOfferActionError(interactionId: string, error: OfferActionErrorDisplay | null): void;
  clearOfferActionError(interactionId: string): void;
  pruneOfferActionErrors(activeInteractionIds: Set<string>): void;
  handleAISummaryFeatureEnablement(payload: unknown, task?: ITask): void;
  getAISummaryViewModel(kind: AISummaryKind, role: AISummaryOwnershipRole, task?: ITask): AISummaryViewModel;
  requestMidCallSummary(
    actionType: AISummaryActionType,
    role?: AISummaryMidCallRole,
    task?: ITask
  ): Promise<AISummaryRequestResult>;
  requestPostCallSummary(trigger: AISummaryPostCallRequestTrigger, task?: ITask): Promise<AISummaryRequestResult>;
  getCurrentAISummaryOwnerKey(task?: ITask): AISummaryCurrentOwnerKey | undefined;
  advanceAISummaryOwnership(
    capturedOwnerKey: AISummaryCurrentOwnerKey | undefined,
    boundary: AISummaryOwnershipAdvanceBoundary,
    task?: ITask
  ): AISummaryOwnershipAdvanceResult;
  editAISummary(
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    field: AISummaryEditableField,
    expectedRevision: number,
    task?: ITask
  ): boolean;
  recordAISummaryViewed(
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    expectedRevision: number,
    task?: ITask
  ): boolean;
  recordAISummaryCopied(
    kind: AISummaryKind,
    role: AISummaryOwnershipRole,
    expectedRevision: number,
    task?: ITask
  ): boolean;
  setMidCallSummaryFeedback(
    role: AISummaryMidCallRole,
    feedback: Exclude<AISummaryFeedback, 'none'>,
    actionType: AISummaryActionType,
    expectedRevision: number,
    task?: ITask
  ): Promise<AISummaryFeedbackResult>;
  sendMidCallSummaryBeforeAction(
    role: AISummaryMidCallRole,
    actionType: AISummaryActionType,
    expectedRevision: number,
    task?: ITask
  ): Promise<AISummaryPreActionSendResult>;
  setPostCallSummaryFeedback(
    feedback: Exclude<AISummaryFeedback, 'none'>,
    expectedRevision: number,
    task?: ITask
  ): boolean;
  markPostCallWrapupCompleted(wrapUpCode: string, task?: ITask): boolean;
  capturePostCallDraft(wrapUpCode: string, task?: ITask): PostCallDraftCaptureToken | undefined;
  releasePostCallDraft(token: PostCallDraftCaptureToken): boolean;
  freezeAndSendPostCallSummary(token: PostCallDraftCaptureToken): Promise<PostCallSubmissionResult>;
  getPendingAISummaryStatusTransitions(): readonly AISummaryStatusTransition[];
  acknowledgeAISummaryStatusTransition(sequence: number): boolean;
}

interface IWrapupCode {
  id: string;
  name: string;
}

// TASK_EVENTS is now imported from @webex/contact-center SDK

// Events that are received on the contact center SDK
// TODO: Export & Import these constants from SDK
enum CC_EVENTS {
  AGENT_DN_REGISTERED = 'agent:dnRegistered',
  AGENT_LOGOUT_SUCCESS = 'agent:logoutSuccess',
  AGENT_STATION_LOGIN_SUCCESS = 'agent:stationLoginSuccess',
  AGENT_MULTI_LOGIN = 'agent:multiLogin',
  AGENT_STATE_CHANGE = 'agent:stateChange',
  AGENT_RELOGIN_SUCCESS = 'agent:reloginSuccess',
  AGENT_OFFER_CONSULT = 'AgentOfferConsult',
  REAL_TIME_TRANSCRIPTION = 'REAL_TIME_TRANSCRIPTION',
}

interface ICustomStateSet {
  name: string;
  developerName: string;
}
interface ICustomStateReset {
  reset: boolean;
}

type ICustomState = ICustomStateSet | ICustomStateReset;

const ENGAGED_LABEL = 'ENGAGED';
const ENGAGED_USERNAME = 'Engaged';

const RESERVED_LABEL = 'RESERVED';
const RESERVED_USERNAME = 'Reserved';

type AgentLoginProfile = {
  agentName?: string;
  orgId?: string;
  profileType?: string;
  deviceType?: string;
  roles?: Array<string>;
  mmProfile?: {
    chat: number;
    email: number;
    social: number;
    telephony: number;
  };
  agentProfileID?: string;
  isTimeoutDesktopInactivityEnabled?: boolean;
  timeoutDesktopInactivityMins?: number;
};

// Generic pagination params for list-fetching APIs
type PaginatedListParams = {
  page: number;
  pageSize: number;
  search?: string;
};

// Generic fetch helper for paginated APIs
type FetchPaginatedList<T> = (
  params: PaginatedListParams
) => Promise<{data: T[]; meta?: {page?: number; totalPages?: number}}>;

// Generic transform function for paginated APIs
type TransformPaginatedData<T, U> = (item: T, page: number, index: number) => U;

// Utility consts
const DIAL_NUMBER: string = 'AGENT_DN';
const EXTENSION: string = 'EXTENSION';
const DESKTOP: string = 'BROWSER';

// Common string constants used across the store wrapper
const MEDIA_TYPE_TELEPHONY_LOWER = 'telephony';
const MEDIA_TYPE_TELEPHONY_UPPER = 'TELEPHONY';
const DEVICE_TYPE_BROWSER = 'BROWSER';
const AGENT_STATE_AVAILABLE = 'Available';

const LoginOptions: {[key: string]: string} = {
  [DIAL_NUMBER]: 'Dial Number',
  [EXTENSION]: 'Extension',
  [DESKTOP]: 'Desktop',
};

const ERROR_TRIGGERING_IDLE_CODES = {
  INVALID_NUMBER: 'Invalid_Number',
  UNAVAILABLE: 'Agent_Unavailable',
  DECLINED: 'Agent_Declined',
  BUSY: 'Agent_Busy',
  CHANNEL_FAILURE: 'Channel_Failure',
  RONA: 'RONA',
};

export type {
  IContactCenter,
  ITask,
  Profile,
  Team,
  AgentLogin,
  WithWebex,
  WebexCcInitConfig,
  IdleCode,
  InitParams,
  IStore,
  ILogger,
  IWrapupCode,
  IStoreWrapper,
  ICustomState,
  DestinationType,
  BuddyDetails,
  ContactServiceQueue,
  AgentLoginProfile,
  EntryPointRecord,
  EntryPointListResponse,
  EntryPointSearchParams,
  AddressBookEntry,
  AddressBookEntriesResponse,
  AddressBookEntrySearchParams,
  ContactServiceQueuesResponse,
  ContactServiceQueueSearchParams,
  IWebex,
  PaginatedListParams,
  FetchPaginatedList,
  TransformPaginatedData,
  TaskUIControls,
  TaskUIControlState,
  InteractionUIControls,
  TaskUILeg,
  RealTimeTranscriptionData,
  RealTimeTranscriptionEventPayload,
  RealTimeAssistPayload,
  RealTimeAssistRequestParams,
  RealTimeAssistUserActionId,
  RealTimeAssistUserActionParams,
  OfferActionErrorDisplay,
};

export {
  CC_EVENTS,
  TASK_EVENTS,
  ENGAGED_LABEL,
  ENGAGED_USERNAME,
  RESERVED_LABEL,
  RESERVED_USERNAME,
  DIAL_NUMBER,
  EXTENSION,
  DESKTOP,
  MEDIA_TYPE_TELEPHONY_LOWER,
  MEDIA_TYPE_TELEPHONY_UPPER,
  DEVICE_TYPE_BROWSER,
  AGENT_STATE_AVAILABLE,
  LoginOptions,
  ERROR_TRIGGERING_IDLE_CODES,
  getDefaultUIControls,
};

// ConsultStatus enum removed — use task.data.consultStatus from SDK instead

export type Participant = {
  id: string;
  pType: 'Customer' | 'Agent' | string;
  name?: string;
};

export type ConferenceParticipantDropType = 'Customer' | 'Agent' | 'EP-DN' | 'Supervisor';

/**
 * Display and authorization data for one participant-drop roster row.
 * `dropTargetId` is passed to the SDK only when `isReadOnly` is false.
 */
export type ConferenceParticipantDropTarget = {
  participantType: ConferenceParticipantDropType;
  displayName: string;
  dropTargetId: string;
  isPrimary: boolean;
  isReadOnly: boolean;
  /** Target is visible with an action, but the conference Drop request is not valid yet. */
  isDropDisabled: boolean;
  requiresConfirmation: boolean;
};

/**
 * Participant-drop roster derived from the authoritative main-call media leg.
 */
export type ConferenceParticipantDropRoster = {
  customer: ConferenceParticipantDropTarget | null;
  participants: ConferenceParticipantDropTarget[];
  isDropDisabled: boolean;
};

/**
 * Desktop preference data structure containing E911 modal acknowledgment.
 * @public
 */
export type DesktopPreference = {
  isEmergencyModalAlreadyDisplayed?: boolean;
};

/**
 * User preference response from the SDK.
 * @public
 */
export type UserPreferenceResponse = {
  id: string;
  organizationId: string;
  userId: string;
  // The SDK returns the persisted desktopPreference JSON string nested under `preferences`,
  // not as a top-level field - see CAI-7906.
  preferences?: {
    desktopPreference?: string;
  };
  createdTime?: number;
  lastUpdatedTime?: number;
};

/**
 * Request payload for creating user preferences.
 * @public
 */
export type CreateUserPreferenceRequest = {
  userId: string;
  desktopPreference: string;
};

/**
 * Request payload for updating user preferences.
 * @public
 */
export type UpdateUserPreferenceRequest = {
  desktopPreference: string;
};

/**
 * Query parameters for fetching user preferences.
 * @public
 */
export type GetUserPreferenceParams = {
  userId?: string;
  page?: number;
  pageSize?: number;
};

/**
 * User Preference service interface.
 * TODO: Remove once SDK exposes this interface - CAI-7906
 * @public
 */
export interface IUserPreferenceService {
  getUserPreference(params?: GetUserPreferenceParams): Promise<UserPreferenceResponse>;
  createUserPreference(data: CreateUserPreferenceRequest): Promise<UserPreferenceResponse>;
  updateUserPreference(userId: string, data: UpdateUserPreferenceRequest): Promise<UserPreferenceResponse>;
}

/** Outbound type values that identify a campaign preview task. */
export const CAMPAIGN_PREVIEW_OUTBOUND_TYPES = ['STANDARD_PREVIEW_CAMPAIGN', 'DIRECT_PREVIEW_CAMPAIGN'];

/** Campaign type values (from callProcessingDetails) that identify a campaign preview task. */
export const CAMPAIGN_PREVIEW_CAMPAIGN_TYPES = ['preview_standard', 'preview_direct'];

export type AISummaryKind = 'mid-call' | 'post-call';
export type AISummaryActionType = SDKAISummaryAction;
export type AISummaryOwnershipRole = 'initiator' | 'receiver' | 'post-call';
export type AISummaryMidCallRole = Extract<AISummaryOwnershipRole, 'initiator' | 'receiver'>;
export type AISummaryViewKey = `mid-call:${AISummaryMidCallRole}` | 'post-call:post-call';
export type AISummaryViewSelector =
  | {
      kind: 'mid-call';
      role: AISummaryMidCallRole;
    }
  | {
      kind: 'post-call';
      role: 'post-call';
    };
export type AISummaryCurrentOwnerSlots = Partial<Record<AISummaryViewKey, AISummaryOwnerKey>>;

export type AISummaryOwnerKey = {
  interactionId: string;
  agentId: string;
  ownershipGeneration: number;
};

export type AISummaryCurrentOwnerKey = {
  captureId: string;
  interactionId: string;
  agentId: string;
  ownerKeys: AISummaryCurrentOwnerSlots;
};

export type AISummaryOwnershipBoundaryType =
  | 'direct-transfer'
  | 'consult-transfer'
  | 'transfer-conference'
  | 'consult-conference'
  | 'conference-established'
  | 'topology-cycle';

export type AISummaryOwnershipAdvanceMode = 'carry-forward' | 'reset';

export type AISummaryOwnershipAdvanceBoundary = {
  type: AISummaryOwnershipBoundaryType;
  mode: AISummaryOwnershipAdvanceMode;
  successorAgentId?: string;
  observationId?: string;
};

export type AISummaryOwnershipAdvanceResult =
  | {outcome: 'advanced'}
  | {outcome: 'duplicate'}
  | {outcome: 'stale'}
  | {outcome: 'blocked'};

export type AISummaryPendingRequest = {
  sequence: number;
  ownerStateKey: string;
  ownerKey: AISummaryOwnerKey;
  kind: AISummaryKind;
  role: AISummaryOwnershipRole;
  actionType?: AISummaryActionType;
  postCallGeneration?: number;
  deadlineAt: number;
  settlementClosed: boolean;
};

export type AISummaryNormalizedTimestamp =
  | {
      present: true;
      value: number;
    }
  | {
      present: false;
    };

export type AISummaryCapabilityRecord = {
  interactionId: string;
  midCallEnabled: boolean;
  postCallEnabled: boolean;
  timestamp: AISummaryNormalizedTimestamp;
  arrivalOrder: number;
};

export type AISummaryOwnershipBoundary =
  | {
      kind: 'valid';
      interactionId: string;
    }
  | {
      kind: 'invalid';
      reason: 'missing-stable-identity' | 'conflicting-stable-identity';
    };

export type AISummarySectionKey =
  | 'initialContactReason'
  | 'additionalContactReasons'
  | 'additionalContext'
  | 'keyActionsTaken'
  | 'nextSteps'
  | 'reasonForTransferOrConsult';

export type AISummaryPostCallSectionKey = Extract<
  AISummarySectionKey,
  'initialContactReason' | 'additionalContactReasons' | 'additionalContext' | 'keyActionsTaken' | 'nextSteps'
>;

export type AISummaryResolutionDisplayKey = 'resolution';
export type AISummaryPostCallDisplaySectionKey = AISummaryPostCallSectionKey | AISummaryResolutionDisplayKey;
export type AISummaryDisplaySectionKey = AISummarySectionKey | AISummaryResolutionDisplayKey;

export type AISummarySection = {
  key: AISummarySectionKey;
  value: string;
  editable: true;
};

export type AISummaryDisplaySection =
  | AISummarySection
  | {
      key: AISummaryResolutionDisplayKey;
      value: string;
      editable: false;
    };

export type AISummaryEditableField = {
  key: AISummarySectionKey | 'summaryText';
  value: string;
};

export type AISummaryContent =
  | {
      type: 'sections';
      sections: AISummarySection[];
      resolution?: string;
    }
  | {
      type: 'text';
      summaryText: string;
    }
  | {
      type: 'card';
      adaptiveCard: unknown;
    };

export type AISummaryFeedback = 'none' | 'like' | 'dislike';
export type AISummaryFeedbackStatus = 'pending' | 'not-confirmed';

export type AISummaryCounters = {
  viewed: number;
  copied: number;
  edited: number;
  liked: number;
  disliked: number;
};

export type AISummaryFeedbackResult =
  | {outcome: 'confirmed'}
  | {outcome: 'failed'}
  | {outcome: 'blocked'}
  | {outcome: 'stale'};

export type AISummaryRequestResult =
  | {outcome: 'accepted'}
  | {outcome: 'failed'}
  | {outcome: 'blocked'}
  | {outcome: 'stale'};

export type AISummaryPreActionSendResult =
  | {outcome: 'sent'}
  | {outcome: 'failed'}
  | {outcome: 'blocked'}
  | {outcome: 'stale'};

export type PostCallSubmissionResult =
  | {wrapup: 'failed'}
  | {wrapup: 'succeeded'; response: 'not-required' | 'submitted' | 'response-failed'};

export type AISummaryStoreActionResult =
  | AISummaryRequestResult
  | AISummaryPreActionSendResult
  | AISummaryFeedbackResult
  | PostCallSubmissionResult;

export type AISummaryPostCallRequestTrigger =
  | {type: 'reason-commit'; reasonId: string; selectionRevision: number}
  | {type: 'retry'};

export type AISummarySurface = 'omitted' | 'generating' | 'unavailable' | 'generic-error' | 'content';

export type AISummaryErrorCategory =
  | 'unauthorized'
  | 'initialization'
  | 'offline'
  | 'unavailable'
  | 'empty'
  | 'disabled'
  | 'timeout'
  | 'generic';

export type AISummaryLastResult =
  | {
      kind: 'success';
      interactionId: string;
      role: AISummaryOwnershipRole;
      content: AISummaryContent;
      timestamp: AISummaryNormalizedTimestamp;
      arrivalOrder: number;
    }
  | {
      kind: 'unsupported';
      interactionId: string;
      role: AISummaryOwnershipRole;
      timestamp: AISummaryNormalizedTimestamp;
      arrivalOrder: number;
    }
  | {
      kind: 'error';
      category: AISummaryErrorCategory;
      role: AISummaryOwnershipRole;
      interactionId?: string;
    }
  | {
      kind: 'discarded-interaction-mismatch';
      interactionId?: string;
      expectedInteractionId: string;
    };

export type AISummaryViewModel = {
  key: AISummaryViewKey;
  eligible: boolean;
  surface: AISummarySurface;
  requestPending: boolean;
  completionEscape?: boolean;
  content?: AISummaryContent;
  contentRevision?: number;
  counters: AISummaryCounters;
  feedback: AISummaryFeedback;
  midCallFeedbackPending?: boolean;
  feedbackStatus?: AISummaryFeedbackStatus;
  controlsDisabled?: boolean;
  actionType?: AISummaryActionType;
  ownerKey?: AISummaryOwnerKey;
};

export type AISummaryOwnerStateBase = {
  ownerKey: AISummaryOwnerKey;
  content?: AISummaryContent;
  contentRevision: number;
  counters: AISummaryCounters;
  feedback: AISummaryFeedback;
  viewedRevision?: number;
};

export type AISummaryMidCallOwnerState = AISummaryOwnerStateBase & {
  kind: 'mid-call';
  role: AISummaryMidCallRole;
  actionType: AISummaryActionType;
  midCallFeedbackPending: boolean;
  postCallGeneration?: never;
  postCallTerminalGeneration?: never;
  postCallTerminalWrapUpCode?: never;
  postCallFeedbackPending?: never;
  feedbackStatus?: never;
  postCallCaptureRevision?: never;
  agentWrappedUpObserved?: never;
};

export type AISummaryPostCallOwnerState = AISummaryOwnerStateBase & {
  kind: 'post-call';
  role: 'post-call';
  actionType?: never;
  midCallFeedbackPending?: never;
  postCallGeneration?: number;
  postCallCompletionEscapeGeneration?: number;
  postCallTerminalGeneration?: number;
  postCallTerminalWrapUpCode?: string;
  postCallFeedbackPending: boolean;
  feedbackStatus?: AISummaryFeedbackStatus;
  postCallCaptureRevision?: number;
  agentWrappedUpObserved: boolean;
};

export type AISummaryOwnerState = AISummaryMidCallOwnerState | AISummaryPostCallOwnerState;

export type PostCallDraftCaptureToken = symbol & {
  readonly __postCallDraftCaptureToken: unique symbol;
};

export type AISummaryStatusTransition =
  | {
      sequence: number;
      kind: 'mid-call';
      state: 'available' | 'unavailable';
    }
  | {
      sequence: number;
      kind: 'post-call';
      state: 'available' | 'unavailable' | 'submitted' | 'response-failed';
    };
