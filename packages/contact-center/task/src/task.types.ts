import {TaskProps, ControlProps, OutdialCallProps} from '@webex/cc-components';

export type UseTaskProps = Pick<TaskProps, 'incomingTask' | 'deviceType' | 'logger'> &
  Partial<Pick<TaskProps, 'onAccepted' | 'onRejected'>>;

export type UseTaskListProps = Pick<TaskProps, 'cc' | 'taskList' | 'deviceType' | 'logger'> &
  Partial<Pick<TaskProps, 'onTaskAccepted' | 'onTaskDeclined' | 'onTaskSelected'>>;

export type IncomingTaskProps = Pick<TaskProps, 'incomingTask'> & Partial<Pick<TaskProps, 'onAccepted' | 'onRejected'>>;

export type TaskListProps = Partial<Pick<TaskProps, 'onTaskAccepted' | 'onTaskDeclined' | 'onTaskSelected'>>;

export type CallControlProps = Partial<
  Pick<
    ControlProps,
    | 'onHoldResume'
    | 'onEnd'
    | 'onWrapUp'
    | 'onRecordingToggle'
    | 'callControlClassName'
    | 'callControlConsultClassName'
    | 'onToggleMute'
    | 'conferenceEnabled'
    | 'consultTransferOptions'
  >
>;

export type useCallControlProps = Pick<
  ControlProps,
  'currentTask' | 'logger' | 'deviceType' | 'featureFlags' | 'isMuted' | 'conferenceEnabled' | 'agentId'
> &
  Partial<Pick<ControlProps, 'onHoldResume' | 'onEnd' | 'onWrapUp' | 'onRecordingToggle' | 'onToggleMute'>>;

export type useOutdialCallProps = Pick<OutdialCallProps, 'cc' | 'logger'>;

/**
 * Helper interface for device type checks
 */
export interface DeviceTypeFlags {
  isBrowser: boolean;
  isAgentDN: boolean;
  isExtension: boolean;
}
