import {TaskProps, ControlProps, OutdialCallProps} from '@webex/cc-components';

export type UseTaskProps = Pick<TaskProps, 'incomingTask' | 'onAccepted' | 'onDeclined' | 'deviceType' | 'logger'>;
export type UseTaskListProps = Pick<
  TaskProps,
  'cc' | 'taskList' | 'deviceType' | 'onTaskAccepted' | 'onTaskDeclined' | 'logger'
>;
export type IncomingTaskProps = Pick<TaskProps, 'onAccepted' | 'onDeclined'>;
export type TaskListProps = Pick<TaskProps, 'onTaskAccepted' | 'onTaskDeclined'>;

export type CallControlProps = Pick<ControlProps, 'onHoldResume' | 'onEnd' | 'onWrapUp'>;

export type useCallControlProps = Pick<ControlProps, 'currentTask' | 'onHoldResume' | 'onEnd' | 'onWrapUp' | 'logger'>;

export type useOutdialCallProps = Pick<OutdialCallProps, 'cc' | 'logger'>;
