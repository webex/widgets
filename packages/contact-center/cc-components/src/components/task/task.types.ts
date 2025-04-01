import {ILogger, ITask, IContactCenter, WrapupCodes, BuddyDetails, DestinationType} from '@webex/cc-store';

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
   * Audio reference
   */
  audioRef: React.RefObject<HTMLAudioElement>;
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
   * Function to consult with a buddy agent.
   */
  consultCall: () => void;
}

export type CallControlComponentProps = Pick<
  ControlProps,
  | 'currentTask'
  | 'audioRef'
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
  buddyAgents: Array<{agentId: string; agentName: string; dn: string}>;
  onAgentSelect: (agentId: string) => void;
}
