import {
  TaskProps,
  ControlProps,
  OutdialCallProps,
  RealTimeTranscriptComponentProps,
  RealTimeTranscriptEntry,
} from '@webex/cc-components';
import {RealTimeTranscriptionData} from '@webex/cc-store';

export type UseTaskProps = Pick<TaskProps, 'incomingTask' | 'logger'> &
  Partial<Pick<TaskProps, 'onAccepted' | 'onRejected'>>;

export type UseTaskListProps = Pick<TaskProps, 'cc' | 'taskList' | 'logger'> &
  Partial<Pick<TaskProps, 'onTaskAccepted' | 'onTaskDeclined' | 'onTaskSelected'>>;

export type IncomingTaskProps = Pick<TaskProps, 'incomingTask'> & Partial<Pick<TaskProps, 'onAccepted' | 'onRejected'>>;

export type TaskListProps = Partial<Pick<TaskProps, 'onTaskAccepted' | 'onTaskDeclined' | 'onTaskSelected'>>;

export type RealTimeTranscriptProps = Pick<RealTimeTranscriptComponentProps, 'liveTranscriptEntries' | 'className'>;

export type UseRealTimeTranscriptInternalProps = RealTimeTranscriptProps & {
  currentTaskId?: string;
  realtimeTranscriptionData?: Partial<RealTimeTranscriptionData>[];
};

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
  'currentTask' | 'logger' | 'isMuted' | 'conferenceEnabled' | 'agentId'
> &
  Partial<Pick<ControlProps, 'onHoldResume' | 'onEnd' | 'onWrapUp' | 'onRecordingToggle' | 'onToggleMute'>>;

export type useOutdialCallProps = Pick<OutdialCallProps, 'cc' | 'logger'>;

export type {RealTimeTranscriptEntry};
export interface OutdialProps {
  /**
   * Flag to determine if the address book is enabled.
   * Defaults to true if not provided.
   */
  isAddressBookEnabled?: boolean;
}

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
