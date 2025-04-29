import {TaskProps, ControlProps, OutdialCallProps} from '@webex/cc-components';

export type UseTaskProps = Pick<TaskProps, 'incomingTask' | 'onAccepted' | 'onDeclined' | 'deviceType' | 'logger'>;
export type UseTaskListProps = Pick<
  TaskProps,
  'cc' | 'taskList' | 'deviceType' | 'onTaskAccepted' | 'onTaskDeclined' | 'logger'
>;
export type IncomingTaskProps = Pick<TaskProps, 'onAccepted' | 'onDeclined'>;
export type TaskListProps = Pick<TaskProps, 'onTaskAccepted' | 'onTaskDeclined'>;

export type CallControlProps = Pick<
  ControlProps,
  'onHoldResume' | 'onEnd' | 'onWrapUp' | 'callControlClassName' | 'callControlConsultClassName'
>;

export type useCallControlProps = Pick<
  ControlProps,
  'currentTask' | 'onHoldResume' | 'onEnd' | 'onWrapUp' | 'logger' | 'consultInitiated'
>;

export type Participant = {
  id: string;
  pType: 'Customer' | 'Agent' | string;
  name?: string;
};

export type useOutdialCallProps = Pick<OutdialCallProps, 'cc' | 'logger'>;
