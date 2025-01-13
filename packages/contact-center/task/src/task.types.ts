import {ITask, IContactCenter} from '@webex/plugin-cc';
import {ILogger} from '@webex/cc-store';

/**
 * Interface representing the TaskProps of a user.
 */
export interface TaskProps {
  /**
   * currentTask of the agent.
   */
  currentTask: ITask;

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
   * Flag to determine if the task is missed
   */
  isMissed: boolean;

  /**
   * Selected login option
   */
  selectedLoginOption: string;

  /**
   * List of tasks
   */
  taskList: ITask[];

  /**
   * Audio reference
   */
  audioRef: React.RefObject<HTMLAudioElement>;

  /**
   * The logger instance from SDK
   */
  logger: ILogger;
}

export type UseTaskProps = Pick<TaskProps, 'cc' | 'onAccepted' | 'onDeclined' | 'selectedLoginOption' | 'logger'>;
export type UseTaskListProps = Pick<TaskProps, 'cc' | 'selectedLoginOption' | 'onTaskAccepted' | 'onTaskDeclined' | 'logger'>;
export type IncomingTaskPresentationalProps = Pick<
  TaskProps,
  'currentTask' | 'isBrowser' | 'isAnswered' | 'isEnded' | 'isMissed' | 'accept' | 'decline' | 'audioRef'
>;
export type IncomingTaskProps = Pick<TaskProps, 'onAccepted' | 'onDeclined'>;
export type TaskListProps = Pick<TaskProps, 'onTaskAccepted' | 'onTaskDeclined'>;

export type TaskListPresentationalProps = Pick<TaskProps, 'taskList' | 'isBrowser' | 'acceptTask' | 'declineTask'>;
export enum TASK_EVENTS {
  TASK_INCOMING = 'task:incoming',
  TASK_ASSIGNED = 'task:assigned',
  TASK_MEDIA = 'task:media',
  TASK_UNASSIGNED = 'task:unassigned',
  TASK_HOLD = 'task:hold',
  TASK_UNHOLD = 'task:unhold',
  TASK_CONSULT = 'task:consult',
  TASK_CONSULT_END = 'task:consultEnd',
  TASK_CONSULT_ACCEPT = 'task:consultAccepted',
  TASK_PAUSE = 'task:pause',
  TASK_RESUME = 'task:resume',
  TASK_END = 'task:end',
  TASK_WRAPUP = 'task:wrapup',
} // TODO: remove this once cc sdk exports this enum
