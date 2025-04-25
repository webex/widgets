import {
  ILogger,
  ITask,
  IContactCenter,
  WrapupCodes,
  BuddyDetails,
  DestinationType,
  ContactServiceQueue,
} from '@webex/cc-store';

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
  onAccepted?: () => void;

  /**
   * Handler for task declined
   */
  onDeclined?: () => void;

  /**
   * Handler for task accepted in TaskList
   */
  onTaskAccepted?: (task: ITask) => void;

  /**
   * Handler for task declined in TaskList
   */
  onTaskDeclined?: (task: ITask) => void;

  /**
   * accept incoming task action
   */
  accept: () => void;

  /**
   * decline incoming task action
   */
  decline: () => void;

  /**
   * accept task from task list
   */
  acceptTask: (task: ITask) => void;

  /**
   * decline task from tasklist
   */
  declineTask: (task: ITask) => void;

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
  taskList: ITask[];

  /**
   * The logger instance from SDK
   */
  logger: ILogger;
}

export type IncomingTaskComponentProps = Pick<TaskProps, 'incomingTask' | 'isBrowser' | 'accept' | 'decline'>;

export type TaskListComponentProps = Pick<
  TaskProps,
  'currentTask' | 'taskList' | 'isBrowser' | 'acceptTask' | 'declineTask'
>;

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
   */
  onHoldResume?: () => void;

  /**
   * Function to handle ending the task.
   */
  onEnd?: () => void;

  /**
   * Function to handle wrapping up the task.
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
  wrapupCodes: WrapupCodes[];

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
   * Function to transfer the consult call to a destination.
   * @param destination - The destination to transfer the consult call to.
   * @param destinationType - The type of destination.
   */
  consultTransfer: (destination: string, destinationType: DestinationType) => void;

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
}

export type CallControlComponentProps = Pick<
  ControlProps,
  | 'currentTask'
  | 'wrapupCodes'
  | 'wrapupRequired'
  | 'toggleHold'
  | 'toggleRecording'
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
}

/**
 * Interface representing the properties for ConsultTransferPopover component.
 */
export interface ConsultTransferPopoverComponentProps {
  heading: string;
  buttonIcon: string;
  buddyAgents: BuddyDetails[];
  queues?: ContactServiceQueue[];
  onAgentSelect: (agentId: string, agentName: string) => void;
  onQueueSelect: (queueId: string, queueName: string) => void;
  allowConsultToQueue: boolean;
}

/**
 * Interface representing the properties for CallControlConsultComponents component.
 */
export interface CallControlConsultComponentsProps {
  agentName: string;
  startTimeStamp: number;
  onTransfer?: () => void;
  endConsultCall: () => void;
  consultCompleted: boolean;
  isAgentBeingConsulted: boolean;
  isEndConsultEnabled: boolean;
}

/**
 * Type representing the possible menu types in call control.
 */
export type CallControlMenuType = 'Consult' | 'Transfer';

export {DestinationType};
