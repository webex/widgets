import {TaskProps, ControlProps, OutdialCallProps} from '@webex/cc-components';

export type UseTaskProps = Pick<TaskProps, 'incomingTask' | 'onAccepted' | 'onRejected' | 'deviceType' | 'logger'>;
export type UseTaskListProps = Pick<
  TaskProps,
  'cc' | 'taskList' | 'deviceType' | 'onTaskAccepted' | 'onTaskDeclined' | 'logger'
>;
export type IncomingTaskProps = Pick<TaskProps, 'incomingTask' | 'onAccepted' | 'onRejected'>;
export type TaskListProps = Pick<TaskProps, 'onTaskAccepted' | 'onTaskDeclined'>;

export type CallControlProps = Pick<
  ControlProps,
  'onHoldResume' | 'onEnd' | 'onWrapUp' | 'callControlClassName' | 'callControlConsultClassName'
>;

export type useCallControlProps = Pick<
  ControlProps,
  'currentTask' | 'onHoldResume' | 'onEnd' | 'onWrapUp' | 'logger' | 'consultInitiated' | 'deviceType' | 'featureFlags'
>;

export type Participant = {
  id: string;
  pType: 'Customer' | 'Agent' | string;
  name?: string;
};

export type useOutdialCallProps = Pick<OutdialCallProps, 'cc' | 'logger'>;

export enum MediaType {
  Telephony = 'telephony',
  Email = 'email',
  Chat = 'chat',
}

export type MediaInfo = {
  iconName: string;
  className: string;
};
