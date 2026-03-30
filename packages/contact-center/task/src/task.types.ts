import {
  TaskProps,
  ControlProps,
  OutdialCallProps,
  RealtimeTranscriptComponentProps,
  RealtimeTranscriptEntry,
  TranscriptTab,
} from '@webex/cc-components';
import {RealtimeTranscriptLine} from '@webex/cc-store';

export type UseTaskProps = Pick<TaskProps, 'incomingTask' | 'deviceType' | 'logger'> &
  Partial<Pick<TaskProps, 'onAccepted' | 'onRejected'>>;

export type UseTaskListProps = Pick<TaskProps, 'cc' | 'taskList' | 'deviceType' | 'logger'> &
  Partial<Pick<TaskProps, 'onTaskAccepted' | 'onTaskDeclined' | 'onTaskSelected'>>;

export type IncomingTaskProps = Pick<TaskProps, 'incomingTask'> & Partial<Pick<TaskProps, 'onAccepted' | 'onRejected'>>;

export type TaskListProps = Partial<Pick<TaskProps, 'onTaskAccepted' | 'onTaskDeclined' | 'onTaskSelected'>>;

export type RealtimeTranscriptProps = Pick<
  RealtimeTranscriptComponentProps,
  'ivrTranscript' | 'liveTranscriptEntries'
> &
  Partial<Pick<RealtimeTranscriptComponentProps, 'activeTab' | 'onTabChange' | 'className'>>;

export type UseRealtimeTranscriptProps = RealtimeTranscriptProps;
export type UseRealtimeTranscriptInternalProps = UseRealtimeTranscriptProps & {
  currentTaskId?: string;
  realtimeTranscriptLines?: RealtimeTranscriptLine[];
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
  'currentTask' | 'logger' | 'deviceType' | 'featureFlags' | 'isMuted' | 'conferenceEnabled' | 'agentId'
> &
  Partial<Pick<ControlProps, 'onHoldResume' | 'onEnd' | 'onWrapUp' | 'onRecordingToggle' | 'onToggleMute'>>;

export type useOutdialCallProps = Pick<OutdialCallProps, 'cc' | 'logger'>;

export type {RealtimeTranscriptEntry, TranscriptTab};
export interface OutdialProps {
  /**
   * Flag to determine if the address book is enabled.
   * Defaults to true if not provided.
   */
  isAddressBookEnabled?: boolean;
}

/**
 * Helper interface for device type checks
 */
export interface DeviceTypeFlags {
  isBrowser: boolean;
  isAgentDN: boolean;
  isExtension: boolean;
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
