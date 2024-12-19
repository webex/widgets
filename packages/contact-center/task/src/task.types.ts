import {ITask, IContactCenter} from '@webex/plugin-cc';

/**
 * Interface representing the TaskProps of a user.
 */
export interface TaskProps {
  /**
   * The name of the user.
   */
  currentTask: ITask;

  /**
   * Webex instance.
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
   * accept incoming task action
   */
  accept: () => void;

  /**
   * decline incoming task action
   */
  decline: () => void;

  /**
   * Flag to determine if the user is logged in with a browser option
   */
  isBrowser: boolean;

  /**
   * Flag to determine if the task is answered
   */
  answered: boolean;

  /**
   * Flag to determine if the task is ended
   */
  ended: boolean;

  /**
   * Flag to determine if the task is missed
   */
  missed: boolean;

  /**
   * Selected login option
   */
  selectedLoginOption: string;

  /**
   * List of tasks
   */
  taskList: ITask[];
}

export type UseTaskProps = Pick<TaskProps, 'cc' | 'onAccepted' | 'onDeclined' | 'selectedLoginOption'>;
export type UseTaskListProps = Pick<TaskProps, 'cc'>;
export type IncomingTaskPresentationalProps = Pick<
  TaskProps,
  'currentTask' | 'isBrowser' | 'answered' | 'ended' | 'missed' | 'accept' | 'decline'
>;
export type TaskListPresentationalProps = Pick<TaskProps, 'taskList'>;
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
}
