import {
  ILogger,
  ITask,
  IContactCenter,
  IWrapupCode,
  BuddyDetails,
  DestinationType,
  ContactServiceQueue,
} from '@webex/cc-store';

type Enum<T extends Record<string, unknown>> = T[keyof T];

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
   * Flag to determine if the user is logged in with a browser option
   */
  isBrowser: boolean;

  /**
   * Flag to determine if the task is answered
   */
  isAnswered: boolean;

  /**
   * Flag to determine if the task is ended
   */
  isEnded: boolean;

  /**
   * Selected login option
   */
  deviceType: string;

  /**
   * List of tasks
   */
  taskList: Record<string, ITask>;

  /**
   * The logger instance from SDK
   */
  logger: ILogger;
}

export type IncomingTaskComponentProps = Pick<TaskProps, 'isBrowser' | 'accept' | 'reject' | 'logger'> &
  Partial<Pick<TaskProps, 'incomingTask'>>;

export type TaskListComponentProps = Pick<
  TaskProps,
  'isBrowser' | 'acceptTask' | 'declineTask' | 'onTaskSelect' | 'logger'
> &
  Partial<Pick<TaskProps, 'currentTask' | 'taskList'>>;

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
   * Selected login option
   */
  deviceType: string;

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
   * Function to load buddy agents
   */
  loadBuddyAgents: () => Promise<void>;

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
  consultCall: (consultDestination: string, destinationType: DestinationType) => void;

  /**
   * Function to end the consult call.
   */
  endConsultCall: () => void;

  /**
   * Function to transfer the consult call to a already established consult.
   */
  consultTransfer: () => void;

  /**
   * Flag to determine if the consult call is connecting.
   */
  consultInitiated: boolean;

  /**
   * Flag to determine if the consult call is connecting.
   */
  consultCompleted: boolean;

  /**
   * Flag to determine if the consult call is accepted.
   */
  consultAccepted: boolean;

  /**
   * Timestamp when the consult call started.
   */
  consultStartTimeStamp?: number;

  /**
   * Audio stream for the call control.
   * This is used to play audio for the call control.
   */
  callControlAudio: MediaStream | null;

  /**
   * ID of the consulting agent
   */
  consultAgentId: string;

  /**
   * Function to set the consulting agent ID
   * @param agentId - The ID of the consulting agent.
   */
  setConsultAgentId: (agentId: string) => void;

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
   * Feature flags for the task.
   */
  featureFlags: {[key: string]: boolean};

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
   * Flag to determine if the consulting to queue is enabled for the agent
   */
  allowConsultToQueue: boolean;

  /**
   * Function to set the last target type
   */
  lastTargetType: 'queue' | 'agent';

  /**
   * Function to set the last target type
   */
  setLastTargetType: (targetType: 'queue' | 'agent') => void;

  controlVisibility: {
    accept: boolean;
    decline: boolean;
    end: boolean;
    muteUnmute: boolean;
    holdResume: boolean;
    consult: boolean;
    transfer: boolean;
    conference: boolean;
    wrapup: boolean;
    pauseResumeRecording: boolean;
    endConsult: boolean;
    recordingIndicator: boolean;
  };

  secondsUntilAutoWrapup?: number;

  /**
   * Function to cancel the auto wrap-up timer.
   */
  cancelAutoWrapup: () => void;
}

export type CallControlComponentProps = Pick<
  ControlProps,
  | 'currentTask'
  | 'wrapupCodes'
  | 'toggleHold'
  | 'toggleRecording'
  | 'toggleMute'
  | 'isMuted'
  | 'endCall'
  | 'wrapupCall'
  | 'isHeld'
  | 'setIsHeld'
  | 'isRecording'
  | 'setIsRecording'
  | 'buddyAgents'
  | 'loadBuddyAgents'
  | 'transferCall'
  | 'consultCall'
  | 'endConsultCall'
  | 'consultInitiated'
  | 'consultTransfer'
  | 'consultCompleted'
  | 'consultAccepted'
  | 'consultStartTimeStamp'
  | 'callControlAudio'
  | 'consultAgentName'
  | 'setConsultAgentName'
  | 'consultAgentId'
  | 'setConsultAgentId'
  | 'holdTime'
  | 'callControlClassName'
  | 'callControlConsultClassName'
  | 'startTimestamp'
  | 'queues'
  | 'loadQueues'
  | 'isEndConsultEnabled'
  | 'allowConsultToQueue'
  | 'lastTargetType'
  | 'setLastTargetType'
  | 'controlVisibility'
  | 'logger'
  | 'secondsUntilAutoWrapup'
  | 'cancelAutoWrapup'
>;

/**
 * Interface representing the properties for OutdialCall component.
 */
export interface OutdialCallProps {
  /**
   * Function to start outdial call.
   */
  startOutdial: (destination: string) => void;

  /**
   * CC SDK Instance.
   */
  cc: IContactCenter;

  /**
   * Logger instance for logging purpose.
   */
  logger: ILogger;
}

export type OutdialCallComponentProps = Pick<OutdialCallProps, 'startOutdial'>;

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
  queues?: ContactServiceQueue[];
  onAgentSelect?: (agentId: string, agentName: string) => void;
  onQueueSelect?: (queueId: string, queueName: string) => void;
  onDialNumberSelect?: (dialNumber: string) => void;
  allowConsultToQueue: boolean;
  logger: ILogger;
}

/**
 * Interface representing the properties for CallControlConsultComponents component.
 */
export interface CallControlConsultComponentsProps {
  agentName: string;
  startTimeStamp: number;
  onTransfer?: () => void;
  endConsultCall?: () => void;
  consultCompleted: boolean;
  isAgentBeingConsulted: boolean;
  isEndConsultEnabled: boolean;
  logger: ILogger;
  muteUnmute: boolean;
  isMuted: boolean;
  onToggleConsultMute?: () => void;
}

/**
 * Type representing the possible menu types in call control.
 */
export type CallControlMenuType = 'Consult' | 'Transfer';

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

export interface ControlVisibility {
  accept: boolean;
  decline: boolean;
  end: boolean;
  muteUnmute: boolean;
  holdResume: boolean;
  consult: boolean;
  transfer: boolean;
  conference: boolean;
  wrapup: boolean;
  pauseResumeRecording: boolean;
  endConsult: boolean;
  recordingIndicator: boolean;
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
  displayState: string;
}

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
