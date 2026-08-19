import {
  ILogger,
  ITask,
  IContactCenter,
  IWrapupCode,
  BuddyDetails,
  DestinationType,
  ContactServiceQueue,
  EntryPointRecord,
  ConsultTransferAction,
  ConsultTransferDestinationType,
  AddressBookEntry,
  FetchPaginatedList,
  Participant,
  AddressBookEntrySearchParams,
  AddressBookEntriesResponse,
  TaskUIControls,
} from '@webex/cc-store';
import {CampaignErrorType} from './CampaignErrorDialog/campaign-error-dialog.types';

type Enum<T extends Record<string, unknown>> = T[keyof T];

/**
 * Represents a single Call Associated Data (CAD) variable on an interaction.
 * Global variables have `global: true` and are set by flow control.
 */
export interface CADVariable {
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

/**
 * Record of CAD variables keyed by variable name.
 * This is the shape of `callAssociatedData` on the interaction at runtime.
 */
export type CallAssociatedDataMap = Record<string, CADVariable>;

/**
 * Target types for consult/transfer operations
 */
export const TARGET_TYPE = {
  AGENT: 'agent',
  QUEUE: 'queue',
  ENTRY_POINT: 'entryPoint',
  DIAL_NUMBER: 'dialNumber',
} as const;

export type TargetType = (typeof TARGET_TYPE)[keyof typeof TARGET_TYPE];

/**
 * Interface representing the TaskProps of a user.
 */
export interface TaskProps {
  /**
   * currentTask of the agent.
   */
  currentTask: ITask;

  /**
   * Incoming task on the incoming task widget
   */
  incomingTask: ITask;

  /**
   * CC SDK Instance.
   */
  cc: IContactCenter;

  /**
   * Handler for task accepted
   */
  onAccepted?: ({task}: {task: ITask}) => void;

  /**
   * Handler for task declined
   */
  onRejected?: ({task}: {task: ITask}) => void;

  /**
   * Handler for task accepted in TaskList
   * @param task - The accepted task
   */
  onTaskAccepted?: (task: ITask) => void;

  /**
   * Handler for task declined in TaskList
   * @param task - The declined task
   */
  onTaskDeclined?: (task: ITask, reason: string) => void;

  /**
   * Handler for task selected in TaskList
   * @param task - The selected task
   * @param isClicked - Indicates if the task was clicked
   * This is used to differentiate between selection via click and programmatic selection.
   * This is useful for handling selection logic differently based on user interaction.
   * For example, if the task is selected programmatically, you might not want to trigger
   * certain UI updates that are only relevant for user-initiated selections.
   */
  onTaskSelected?: ({task, isClicked}: {task: ITask; isClicked: boolean}) => void;

  /**
   * accept incoming task action
   */
  accept: (task: ITask) => void;

  /**
   * decline incoming task action
   */
  reject: (task: ITask) => void;

  /**
   * accept task from task list
   */
  acceptTask: (task: ITask) => void;

  /**
   * decline task from tasklist
   */
  declineTask: (task: ITask) => void;

  /**
   * Function to handle task selection
   */
  onTaskSelect: (task: ITask) => void;
  /**
   * Flag to determine if the task is answered
   */
  isAnswered: boolean;

  /**
   * Flag to determine if the task is ended
   */
  isEnded: boolean;

  /**
   * List of tasks
   */
  taskList: Record<string, ITask>;

  /**
   * The logger instance from SDK
   */
  logger: ILogger;

  /**
   * Agent ID of the logged-in user
   */
  agentId: string;
  /**
   * Flag to enable decline button on incoming task component
   */
  isDeclineButtonEnabled?: boolean;

  /**
   * Flag to enable campaign preview task rendering.
   * When true and the task is a campaign preview interaction,
   * the CampaignTask component is rendered instead of the normal Task.
   * Defaults to true.
   */
  hasCampaignPreviewEnabled?: boolean;

  /**
   * Set of interaction IDs for campaign previews that have been accepted.
   * Managed by the store — survives component remounts caused by
   * transient task-list updates during the accept transition.
   */
  acceptedCampaignIds?: Set<string>;
}

export type IncomingTaskComponentProps = Pick<TaskProps, 'accept' | 'reject' | 'logger'> &
  Partial<Pick<TaskProps, 'incomingTask'>> & {
    acceptControl?: {isVisible: boolean; isEnabled: boolean};
    declineControl?: {isVisible: boolean; isEnabled: boolean};
    isDeclineButtonEnabled?: boolean;
    isBrowser?: boolean;
  };

export type TaskListComponentProps = Pick<
  TaskProps,
  'acceptTask' | 'declineTask' | 'onTaskSelect' | 'logger' | 'agentId' | 'cc'
> &
  Partial<Pick<TaskProps, 'currentTask' | 'taskList' | 'hasCampaignPreviewEnabled' | 'acceptedCampaignIds'>> & {
    isDeclineButtonEnabled?: boolean;
    isBrowser?: boolean;
  };

export interface RealTimeTranscriptEntry {
  id: string;
  speaker: string;
  message: string;
  timestamp: number;
  displayTime?: string;
  event?: string;
  isCustomer?: boolean;
  avatarUrl?: string;
  initials?: string;
}

export interface RealTimeTranscriptComponentProps {
  liveTranscriptEntries?: RealTimeTranscriptEntry[];
  className?: string;
}

/**
 * Interface representing the properties for control actions on a task.
 */
export interface ControlProps {
  /**
   * The current task being handled.
   */
  currentTask: ITask;

  /**
   * Function to handle hold/resume actions.
   * @param isHeld - Boolean indicating whether the task is held.
   * @param task - The current task being handled.
   * @returns void
   */
  onHoldResume?: ({isHeld, task}: {isHeld: boolean; task: ITask}) => void;

  /**
   * Function to handle recording toggle actions.
   * @param isRecording - Boolean indicating whether the task is being recorded.
   * @param task - The current task being handled.
   * @return void
   */
  onRecordingToggle?: ({isRecording, task}: {isRecording: boolean; task: ITask}) => void;

  /**
   * Function to handle mute/unmute toggle actions.
   * @param isMuted - Boolean indicating whether the task is muted.
   * @param task - The current task being handled.
   * @returns void
   */
  onToggleMute?: ({isMuted, task}: {isMuted: boolean; task: ITask}) => void;

  /**
   * Function to handle ending the task.
   * @param task - The current task being handled.
   * @returns void
   */
  onEnd?: ({task}: {task: ITask}) => void;

  /**
   * Function to handle wrapping up the task.
   * @param task - The current task being handled.
   * @param wrapUpReason - The reason for wrapping up the task.
   * @returns void
   */
  onWrapUp?: ({task, wrapUpReason}: {task: ITask; wrapUpReason: string}) => void;

  /**
   * Logger instance for logging purposes.
   */
  logger: ILogger;

  /**
   * Array of wrap-up codes.
   * TODO: Expose this type from SDK.
   */
  wrapupCodes: IWrapupCode[];

  /**
   * Indicates if wrap-up is required.
   */
  wrapupRequired: boolean;

  /**
   * Function to handle hold/resume actions with a boolean parameter.
   * @param hold - Boolean indicating whether to hold (true) or resume (false).
   */
  toggleHold: (hold: boolean) => void;

  /**
   * Function to handle pause/resume recording actions.
   */
  toggleRecording: () => void;

  /**
   * Function to handle mute/unmute actions.
   */
  toggleMute: () => void;

  /**
   * Function to handle ending the call.
   */
  endCall: () => void;

  /**
   * Function to handle wrapping up the call with a reason and ID.
   * @param wrapupReason - The reason for wrapping up the call.
   * @param wrapupId - The ID associated with the wrap-up reason.
   */
  wrapupCall: (wrapupReason: string, wrapupId: string) => void;

  /**
   * Flag to determine if the task is held
   */
  isHeld: boolean;

  /**
   * Function to set the held status of the task.
   * @param isHeld - Boolean indicating whether the task is held.
   */
  setIsHeld: (isHeld: boolean) => void;

  /**
   * Flag to determine if the task is being recorded
   */
  isRecording: boolean;

  /**
   * Function to set the recording status of the task.
   * @param isRecording - Boolean indicating whether the task is being recorded.
   */
  setIsRecording: (isRecording: boolean) => void;

  /**
   * Flag to determine if the task is muted.
   */
  isMuted: boolean;

  /**
   * List of buddy agents available for consult
   */
  buddyAgents: BuddyDetails[];

  /**
   * Flag to indicate if buddy agents are being loaded
   */
  loadingBuddyAgents: boolean;

  /**
   * Function to load buddy agents
   */
  loadBuddyAgents: (action?: 'Consult' | 'Transfer') => Promise<void>;

  /**
   * Function to transfer the call to a destination.
   * @param destination - The destination to transfer the call to.
   * @param destinationType - The type of destination.
   */
  transferCall: (destination: string, destinationType: DestinationType) => void;

  /**
   *
   * @param consultDestination
   * @param destinationType
   * @returns
   */
  consultCall: (
    consultDestination: string,
    destinationType: DestinationType,
    allowParticipantsToInteract: boolean
  ) => void;

  /**
   * Function to merge the consult call in a conference.
   */
  consultConference: () => void;

  /**
   * Function to switch to conference call.
   */
  switchToMainCall: () => void;

  /**
   * Function to switch to consult call.
   */
  switchToConsult: () => void;

  /**
   * Function to exit Conference
   */
  exitConference: () => void;

  /**
   * Function to end the consult call.
   */
  endConsultCall: () => void;

  /**
   * Function to transfer the consult call to a already established consult.
   */
  consultTransfer: () => void;

  /**
   * Label for the state timer (e.g., "Wrap Up", "Post Call").
   */
  stateTimerLabel?: string | null;

  /**
   * Timestamp for the state timer.
   */
  stateTimerTimestamp?: number;

  /**
   * Label for the consult timer (e.g., "Consulting", "Consult on Hold").
   */
  consultTimerLabel?: string;

  /**
   * Timestamp for the consult timer.
   */
  consultTimerTimestamp?: number;

  /**
   * Audio stream for the call control.
   * This is used to play audio for the call control.
   */
  callControlAudio: MediaStream | null;

  /**
   * Name of the consulting agent.
   */
  consultAgentName: string;

  /**
   * Function to set the consulting agent name.
   * @param agentName - The name of the consulting agent.
   */
  setConsultAgentName: (agentName: string) => void;

  /**
   * Time since the task is in held state
   */
  holdTime: number;

  /**
   * Custom CSS ClassName for CallControlCAD component.
   */
  callControlClassName?: string;

  /**
   * Custom CSS ClassName for CallControlConsult component.
   */
  callControlConsultClassName?: string;

  /**
   * Start time of the call.
   */
  startTimestamp?: number;

  /**
   * List of contact queues available for consult
   */
  queues: ContactServiceQueue[];

  /**
   * Function to load contact service queues
   */
  loadQueues: () => Promise<void>;

  /**
   * Flag to determine if the end consult button is enabled
   */
  isEndConsultEnabled: boolean;

  /**
   * Flag to enable or disable conference feature
   */
  conferenceEnabled: boolean;

  /**
   * Function to set the last target type
   */
  lastTargetType: TargetType;

  /**
   * Function to set the last target type
   */
  setLastTargetType: (targetType: TargetType) => void;

  controls: TaskUIControls;

  secondsUntilAutoWrapup?: number;

  /**
   * Function to cancel the auto wrap-up timer.
   */
  cancelAutoWrapup: () => void;

  /**
   * List of participants in the conference excluding the agent themselves.
   */
  conferenceParticipants: Participant[];

  /** Fetch paginated address book entries for dial numbers */
  getAddressBookEntries?: FetchPaginatedList<AddressBookEntry>;

  /** Fetch paginated entry points */
  getEntryPoints?: FetchPaginatedList<EntryPointRecord>;

  /** Fetch paginated consult/transfer queues from the SDK-owned policy */
  getQueuesFetcher?: FetchPaginatedList<ContactServiceQueue>;

  /**
   * Options to configure consult/transfer popover behavior.
   */
  consultTransferOptions?: ConsultTransferOptions;

  /**
   * Agent ID of the logged-in user
   */
  agentId: string;
}

export type CallControlComponentProps = Pick<
  ControlProps,
  | 'currentTask'
  | 'isHeld'
  | 'wrapupCodes'
  | 'toggleHold'
  | 'toggleRecording'
  | 'toggleMute'
  | 'isMuted'
  | 'endCall'
  | 'wrapupCall'
  | 'isRecording'
  | 'setIsRecording'
  | 'buddyAgents'
  | 'loadingBuddyAgents'
  | 'loadBuddyAgents'
  | 'transferCall'
  | 'consultCall'
  | 'consultConference'
  | 'switchToMainCall'
  | 'switchToConsult'
  | 'exitConference'
  | 'endConsultCall'
  | 'consultTransfer'
  | 'callControlAudio'
  | 'consultAgentName'
  | 'setConsultAgentName'
  | 'holdTime'
  | 'callControlClassName'
  | 'callControlConsultClassName'
  | 'startTimestamp'
  | 'stateTimerLabel'
  | 'stateTimerTimestamp'
  | 'consultTimerLabel'
  | 'consultTimerTimestamp'
  | 'lastTargetType'
  | 'setLastTargetType'
  | 'controls'
  | 'logger'
  | 'secondsUntilAutoWrapup'
  | 'cancelAutoWrapup'
  | 'conferenceParticipants'
  | 'getAddressBookEntries'
  | 'getEntryPoints'
  | 'getQueuesFetcher'
  | 'consultTransferOptions'
  | 'conferenceEnabled'
> & {
  /**
   * Whether the current task is an accepted campaign preview call.
   * When `true`, the header renders the campaign icon and
   * "Campaign call" label instead of the standard media type.
   */
  isCampaignCall?: boolean;
};

export type OutdialAniEntry = {
  /** Unique identifier for the ANI entry */
  id: string;
  /** Display name for the ANI entry */
  name: string;
  /** Phone number associated with this ANI entry */
  number: string;
  /** Related links for this ANI entry */
  links: string[];
  /** Timestamp when this entry was created (Unix timestamp in milliseconds) */
  createdTime: number;
  /** Timestamp when this entry was last updated (Unix timestamp in milliseconds) */
  lastUpdatedTime: number;
};

/**
 * Interface representing the properties for OutdialCall component.
 */
export interface OutdialCallProps {
  /**
   * Function to start outdial call.
   */
  startOutdial: (destination: string, origin?: string) => void;

  /**
   * Function to get a list of Outdial ANI entries.
   */
  getOutdialANIEntries: () => Promise<OutdialAniEntry[]>;

  /**
   * CC SDK Instance.
   */
  cc: IContactCenter;

  /**
   * Logger instance for logging purpose.
   */
  logger: ILogger;

  /**
   * Function to get a list of address book entries.
   */
  getAddressBookEntries: (params: AddressBookEntrySearchParams) => Promise<AddressBookEntriesResponse>;

  /**
   * Flag to determine if the address book is enabled.
   * Defaults to true if not provided.
   */
  isAddressBookEnabled?: boolean;

  /**
   * Boolean indicating if there's an active telephony task.
   * Used to disable the outdial button when a telephony task is in progress.
   */
  isTelephonyTaskActive?: boolean;
}

export type OutdialCallComponentProps = Pick<
  OutdialCallProps,
  | 'logger'
  | 'startOutdial'
  | 'getOutdialANIEntries'
  | 'isTelephonyTaskActive'
  | 'getAddressBookEntries'
  | 'isAddressBookEnabled'
>;

/**
 * Interface representing the properties for CallControlListItem component.
 */
export interface ConsultTransferListComponentProps {
  title: string;
  subtitle?: string;
  buttonIcon: string;
  onButtonPress: () => void;
  className?: string;
  logger: ILogger;
}

/**
 * Interface representing the properties for CallControlDialNumber component.
 */
export interface ConsultTransferDialNumberComponentProps {
  title: string;
  subtitle?: string;
  buttonIcon: string;
  onButtonPress: (dialNumber: string) => void;
  className?: string;
  logger: ILogger;
}

/**
 * Interface representing the properties for ConsultTransferPopover component.
 */
export interface ConsultTransferPopoverComponentProps {
  heading: string;
  buttonIcon: string;
  buddyAgents: BuddyDetails[];
  loadingBuddyAgents: boolean;
  loadBuddyAgents?: (action?: ConsultTransferAction) => Promise<void>;
  getAddressBookEntries?: FetchPaginatedList<AddressBookEntry>;
  getEntryPoints?: FetchPaginatedList<EntryPointRecord>;
  getQueues?: FetchPaginatedList<ContactServiceQueue>;
  onAgentSelect: (agentId: string, agentName: string, allowParticipantsToInteract: boolean) => void;
  onQueueSelect: (queueId: string, queueName: string, allowParticipantsToInteract: boolean) => void;
  onEntryPointSelect: (entryPointId: string, entryPointName: string, allowParticipantsToInteract: boolean) => void;
  onDialNumberSelect: (dialNumber: string, allowParticipantsToInteract: boolean) => void;
  action: ConsultTransferAction;
  availableDestinations: ConsultTransferDestinationType[];
  /** Options governing popover visibility/behavior */
  consultTransferOptions?: ConsultTransferOptions;
  isConferenceInProgress?: boolean;
  logger: ILogger;
}

/**
 * Interface representing the properties for CallControlConsultComponents component.
 */
export interface CallControlConsultComponentsProps {
  agentName: string;
  consultTimerLabel: string;
  consultTimerTimestamp: number;
  consultTransfer: () => void;
  endConsultCall: () => void;
  consultConference: () => void;
  switchToMainCall: () => void;
  logger: ILogger;
  isMuted: boolean;
  controls: TaskUIControls;
  toggleConsultMute: () => void;
  conferenceEnabled: boolean;
}

/**
 * Type representing the possible menu types in call control.
 */
export type CallControlMenuType = 'Consult' | 'Transfer' | 'ExitConference';

export const MEDIA_CHANNEL = {
  EMAIL: 'email',
  CHAT: 'chat',
  TELEPHONY: 'telephony',
  SOCIAL: 'social',
  SMS: 'sms',
  FACEBOOK: 'facebook',
  WHATSAPP: 'whatsapp',
  APPLE: 'applemessages',
} as const;

export type MEDIA_CHANNEL = Enum<typeof MEDIA_CHANNEL>;

export type MediaInfo = {
  iconName: string;
  className: string;
  labelName: string;
  isBrandVisual: boolean;
};

export interface AutoWrapupTimerProps {
  secondsUntilAutoWrapup: number;
  allowCancelAutoWrapup?: boolean;
  handleCancelWrapup: () => void;
  logger?: ILogger;
}

export interface CallControlButton {
  id: string;
  icon: string;
  onClick?: () => void;
  tooltip: string;
  className: string;
  disabled: boolean;
  isVisible: boolean;
  menuType?: CallControlMenuType;
  dataTestId?: string;
}

export type Visibility = {
  isVisible: boolean;
  isEnabled: boolean;
};
export interface ControlVisibility {
  accept: Visibility;
  decline: Visibility;
  end: Visibility;
  muteUnmute: Visibility;
  muteUnmuteConsult: Visibility;
  holdResume: Visibility;
  consult: Visibility;
  transfer: Visibility;
  conference: Visibility;
  wrapup: Visibility;
  pauseResumeRecording: Visibility;
  endConsult: Visibility;
  recordingIndicator: Visibility;
  exitConference: Visibility;
  mergeConference: Visibility;
  consultTransfer: Visibility;
  mergeConferenceConsult: Visibility;
  consultTransferConsult: Visibility;
  switchToMainCall: Visibility;
  switchToConsult: Visibility;
  isConferenceInProgress: boolean;
  isConsultInitiated: boolean;
  isConsultInitiatedAndAccepted: boolean;
  isConsultReceived: boolean;
  isConsultInitiatedOrAccepted: boolean;
  isHeld: boolean;
  consultCallHeld: boolean;
}

export interface MediaTypeInfo {
  labelName: string;
}
export interface TaskComponentData {
  currentMediaType: {
    labelName: string;
    iconName: string;
    className: string;
    isBrandVisual: boolean;
  };
  isNonVoiceMedia: boolean;
  tooltipTriggerId: string;
  tooltipId: string;
  titleClassName: string;
  shouldShowState: boolean;
  shouldShowQueue: boolean;
  shouldShowHandleTime: boolean;
  shouldShowTimeLeft: boolean;
  capitalizedState: string;
  capitalizedQueue: string;
}

export interface TaskListItemData {
  ani: string;
  customerName: string;
  virtualTeamName: string;
  ronaTimeout: number | null;
  taskState: string;
  startTimeStamp: number;
  isIncomingTask: boolean;
  mediaType: string;
  mediaChannel: string;
  isTelephony: boolean;
  isSocial: boolean;
  acceptText: string | undefined;
  declineText: string | undefined;
  title: string;
  disableAccept: boolean;
  disableDecline: boolean;
  displayState: string;
}

export enum OUTBOUND_TYPE {
  OUTDIAL = 'OUTDIAL',
  CALLBACK = 'CALLBACK',
}

/**
 * Returns the appropriate caller identifier based on outbound type.
 * For outdial calls, the customer's number is in `dn`; for all others it's in `ani`.
 */
export const getCallerIdentifier = (ani: string, dn: string, outboundType?: string): string => {
  return outboundType === OUTBOUND_TYPE.OUTDIAL ? dn || ani : ani;
};

export enum TaskState {
  NEW = 'new',
  ACTIVE = 'active',
  CONNECTED = 'connected',
  HOLD = 'hold',
  CONSULT = 'consult',
  CONFERENCE = 'conference',
  WRAP_UP = 'wrap_up',
  ENDED = 'ended',
  TRANSFERRED = 'transferred',
  DECLINED = 'declined',
}

export enum TaskQueue {
  SUPPORT = 'support',
  SALES = 'sales',
  TECHNICAL = 'technical',
  BILLING = 'billing',
  GENERAL = 'general',
  VIP = 'vip',
  ESCALATION = 'escalation',
}

export interface TimerUIState {
  isUrgent: boolean;
  containerClassName: string;
  iconClassName: string;
  iconName: string;
  formattedTime: string;
}

/**
 * Categories displayed in Consult/Transfer popover.
 */
export type CategoryType = 'Agents' | 'Queues' | 'Dial Number' | 'Entry Point';

/** Category string constants to avoid typos and ease reuse */
export const CATEGORY_DIAL_NUMBER: CategoryType = 'Dial Number';
export const CATEGORY_ENTRY_POINT: CategoryType = 'Entry Point';
export const CATEGORY_QUEUES: CategoryType = 'Queues';
export const CATEGORY_AGENTS: CategoryType = 'Agents';

/**
 * Parameters for `useConsultTransferPopover` hook.
 */
export type UseConsultTransferParams = {
  availableCategories: CategoryType[];
  getAddressBookEntries?: FetchPaginatedList<AddressBookEntry>;
  getEntryPoints?: FetchPaginatedList<EntryPointRecord>;
  getQueues?: FetchPaginatedList<ContactServiceQueue>;
  logger?: ILogger;
};

/**
 * Options to configure Consult/Transfer popover behavior and visibility.
 */
export interface ConsultTransferOptions {
  /** Show the Dial Number tab. Defaults to true. */
  showDialNumberTab?: boolean;
  /** Show the Entry Point tab. Defaults to true. */
  showEntryPointTab?: boolean;
}

/**
 * Interface for button configuration
 */
export interface ButtonConfig {
  key: string;
  icon: string;
  onClick: () => void;
  tooltip: string;
  className: string;
  disabled?: boolean;
  isVisible: boolean;
}

// ==================== GLOBAL VARIABLES PANEL TYPES ====================

/**
 * Properties for the GlobalVariablesPanel component.
 */
export interface GlobalVariablesPanelProps {
  /**
   * List of agent-viewable global variables to display.
   */
  variables: CADVariable[];

  /**
   * Optional CSS class name for additional styling.
   */
  className?: string;

  /**
   * Layout mode for the variables grid.
   * - `single-column`: one variable per row (used in the inline card)
   * - `two-column`: two variables per row (used in the popover)
   * @default 'single-column'
   */
  layout?: 'single-column' | 'two-column';

  /**
   * CSS background value for the panel container.
   * @default 'var(--mds-color-theme-background-glass-normal)'
   */
  panelBackground?: string;
}

// ==================== CAMPAIGN TYPES ====================

/**
 * Auto-action to perform when the campaign preview offer times out.
 * Matches the values from callProcessingDetails.campaignPreviewAutoAction.
 */
export type CampaignAutoAction = 'ACCEPT' | 'SKIP' | 'REMOVE';

/**
 * Indicates which campaign preview action is currently in progress.
 * Used to display contextual status text ("Connecting...", "Skipping...", "Removing...").
 */
export type CampaignPendingAction = CampaignAutoAction | null;

/**
 * Maps a CampaignAutoAction to the corresponding CampaignErrorType
 * used when the auto-action or manual action fails.
 */
export const CAMPAIGN_ACTION_ERROR_MAP: Record<CampaignAutoAction, CampaignErrorType> = {
  ACCEPT: 'ACCEPT_FAILED',
  SKIP: 'SKIP_FAILED',
  REMOVE: 'REMOVE_FAILED',
};

/**
 * Keys of CAMPAIGN_ACTION_ERROR_MAP — used to type the error handler in CampaignTask.
 */
export type CampaignErrorActionType = keyof typeof CAMPAIGN_ACTION_ERROR_MAP;

/**
 * Campaign-specific fields on `callProcessingDetails`.
 *
 * These fields are present at runtime on campaign preview reservation
 * events but are not yet part of the installed SDK type definitions.
 * This bridge type can be removed once the SDK package is updated.
 */
export interface CampaignCallProcessingDetails {
  /** Campaign name (not UUID) */
  campaignId?: string;
  /** Campaign type (e.g. 'preview_standard', 'preview_direct') */
  campaignType?: string;
  /** Indicates if the skip action is disabled for campaign preview contacts */
  campaignPreviewSkipDisabled?: string;
  /** Indicates if the remove action is disabled for campaign preview contacts */
  campaignPreviewRemoveDisabled?: string;
  /** Auto-action to perform when campaign preview offer times out (ACCEPT, SKIP, REMOVE) */
  campaignPreviewAutoAction?: string;
  /** Timestamp (ms) when the campaign preview offer expires */
  campaignPreviewOfferTimeout?: string;
}

/**
 * Properties for the CampaignTask component.
 *
 * The component renders campaign preview contact details, action buttons
 * (Accept / Skip / Remove), a countdown timer, and an error dialog.
 * When the countdown expires the configured auto-action is triggered.
 *
 * Following the pattern used by the Task component, SDK operations are
 * passed in as callback props rather than passing the cc instance directly.
 */
export interface CampaignTaskProps {
  /**
   * The campaign preview task (AgentOfferCampaignReservation).
   * Campaign metadata is read from `task.data.interaction.callProcessingDetails`.
   */
  task: ITask;

  /**
   * Accepts the campaign preview contact and initiates the outbound call.
   * Wraps `cc.acceptPreviewContact({ interactionId, campaignId })`.
   */
  acceptPreviewContact: () => Promise<void>;

  /**
   * Skips the campaign preview contact and moves to the next one.
   * Wraps `cc.skipPreviewContact({ interactionId, campaignId })`.
   */
  skipPreviewContact: () => Promise<void>;

  /**
   * Removes the campaign preview contact from the campaign list.
   * Wraps `cc.removePreviewContact({ interactionId, campaignId })`.
   */
  removePreviewContact: () => Promise<void>;

  /**
   * Cancels the campaign preview call by ending the task.
   * Wraps `task.end()`.
   */
  cancelPreviewContact: () => Promise<void>;

  /**
   * Whether the agent is logged in with a Browser (WebRTC) device.
   * When true the Cancel button is rendered so the agent can end the
   * WebRTC call.  For AGENT_DN the phone handles hangup, so the Cancel
   * button is hidden — consistent with Agent Desktop behaviour.
   */
  isBrowser?: boolean;

  /**
   * Logger instance for logging purposes.
   */
  logger?: ILogger;

  /**
   * Whether this campaign preview has been accepted.
   * Driven by the store's `acceptedCampaignIds` set — survives component
   * remounts caused by transient task-list updates during the accept
   * transition.  When `true`, action buttons and countdown are hidden
   * and the handle-time timer is shown instead.
   */
  isAccepted?: boolean;

  /**
   * The logged-in agent's ID.  Used to look up the agent's participant
   * entry when reading `joinTimestamp` for the handle-time timer.
   */
  agentId?: string;
}

/**
 * Properties for the CampaignTaskPopover component.
 *
 * Displays a hover popover over the campaign preview task with the
 * ListItem row (avatar, title, phone, countdown, action buttons)
 * and a two-column scrollable data panel of global variables.
 */
export interface CampaignTaskPopoverProps {
  /** The campaign preview task. */
  task: ITask;

  /** Logger instance for logging purposes. */
  logger?: ILogger;

  /** ID of the trigger element that opens the popover on hover. */
  triggerId: string;

  /** Whether the Accept button has been clicked (shows "Connecting..." state). */
  isAcceptClicked: boolean;

  /** Which campaign action is currently in progress, or null if none. */
  pendingAction?: CampaignPendingAction;

  /** Whether the campaign preview has been accepted by the backend (call controls visible). */
  isAccepted: boolean;

  /** Whether the Accept button is disabled. */
  isAcceptDisabled: boolean;

  /** Whether the Skip button is disabled. */
  isSkipDisabled: boolean;

  /** Whether the Remove button is disabled. */
  isRemoveDisabled: boolean;

  /** Handler for Accept button click. */
  onAccept: () => void;

  /** Handler for Skip button click. */
  onSkip: () => void;

  /** Handler for Remove button click. */
  onRemove: () => void;

  /** Handler for countdown timeout. */
  onTimeout: () => void;

  /** Timestamp (ms) when the campaign call was accepted — used for the handle time timer. */
  handleTimestamp?: number;
}

/**
 * Properties for the CampaignTaskListItem component.
 *
 * Renders the ListItem row shared between the CampaignTask card
 * and CampaignTaskPopover: avatar, title, phone, countdown, and
 * Accept / Skip / Remove action buttons.
 */
export interface CampaignTaskListItemProps {
  /** Display title (customer name or caller identifier). */
  title: string;

  /** Phone number to show as secondary label. */
  phoneNumber?: string;

  /** Customer name — used to decide whether to show phone as secondary label. */
  customerName?: string;

  /** Campaign preview offer timeout timestamp (ms string). */
  timeoutTimestamp?: string;

  /** Whether the Accept button has been clicked (shows "Connecting..." state). */
  isAcceptClicked: boolean;

  /** Which campaign action is currently in progress, or null if none. */
  pendingAction?: CampaignPendingAction;

  /** Whether the campaign preview has been accepted by the backend (call controls visible). */
  isAccepted: boolean;

  /** Whether the Accept button is disabled. */
  isAcceptDisabled: boolean;

  /** Whether the Skip button is disabled. */
  isSkipDisabled: boolean;

  /** Whether the Remove button is disabled. */
  isRemoveDisabled: boolean;

  /** Handler for Accept button click. */
  onAccept: () => void;

  /** Handler for Skip button click. */
  onSkip: () => void;

  /** Handler for Remove button click. */
  onRemove: () => void;

  /** Handler for countdown timeout. */
  onTimeout: () => void;

  /** Timestamp (ms) when the campaign call was accepted — used for the handle time timer. */
  handleTimestamp?: number;

  /**
   * Controls which timer is rendered in the list item.
   * - `auto`: countdown before accept, handle time after accept
   * - `handle-time`: always render handle time when a timestamp is available
   */
  timerDisplayMode?: 'auto' | 'handle-time';

  /** Logger instance. */
  logger?: ILogger;

  /** Optional CSS class name applied to the ListItem. */
  className?: string;

  /** Optional test ID prefix for data-testid attributes. */
  testIdPrefix?: string;
}
