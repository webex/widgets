import type {
  AIAssistantRTDStatusEvent,
  IdleCode,
  ITask,
  RealTimeAssistPayload,
  WellnessBreakError,
  WellnessBreakEvent,
  WellnessBreakState,
} from '@webex/cc-store';
import type {WellnessBreakOverlayTarget} from '@webex/cc-components';
import type {AgentChannelStateDetail} from './wellness/wellness-internal.types';

export type {WellnessBreakError, WellnessBreakErrorCode, WellnessBreakPhase} from '@webex/cc-store';
export type {WellnessBreakOverlayTarget} from '@webex/cc-components';

/**
 * Public props for the `AIAssistant` widget.  All callbacks are optional —
 * the host can opt into any subset.
 */
export interface IAIAssistantProps {
  /** Fired when the launcher is clicked and the panel opens. */
  onOpen?: () => void;
  /** Fired when the agent minimizes the panel to its collapsed bar. */
  onMinimize?: () => void;
  /** Fired when the minimized bar is restored to the full panel. */
  onRestore?: () => void;
  /** Fired when the panel is closed back to the launcher. */
  onClose?: () => void;
  /** Fired when the fullscreen affordance is toggled.  Host owns layout. */
  onFullScreenToggle?: (isFullScreen: boolean) => void;
  /** Fired each time a fresh real-time assist response arrives for the active task. */
  onRealTimeAssistReceived?: (payload: RealTimeAssistPayload) => void;
  /** Optional extra class applied to the widget root. */
  className?: string;
  /** Fired for a valid backend-provided actionable offer. */
  onWellnessBreakOffered?: (event: WellnessBreakEvent) => void;
  /** Fired after the break request changes agent state and any required ACCEPTED action is delivered. */
  onWellnessBreakAccepted?: (event: WellnessBreakEvent) => void;
  /** Fired when the timed break begins playing. */
  onWellnessBreakStarted?: () => void;
  /** Fired after the timed break ends and state restoration succeeds. */
  onWellnessBreakEnded?: () => void;
  /** Fired with a stable, non-PII lifecycle error shape. */
  onWellnessBreakError?: (error: WellnessBreakError) => void;
  /** Optional host/CDN audio URL. Defaults to the packaged wellness audio asset. */
  wellnessAudioUrl?: string;
  /** Controls whether the break covers the viewport, assistant root, or a host element. */
  wellnessBreakOverlayTarget?: WellnessBreakOverlayTarget;
}

export interface UseAiAssistantInput extends IAIAssistantProps {
  interactionId?: string;
  agentId: string;
  isFeatureEnabled: boolean;
  realTimeAssist: RealTimeAssistPayload[];
}

export type UseAIAssistantChromeInput = Pick<
  UseAiAssistantInput,
  'onOpen' | 'onMinimize' | 'onRestore' | 'onClose' | 'onFullScreenToggle'
>;

export type UseRealTimeAssistInput = Pick<
  UseAiAssistantInput,
  'interactionId' | 'agentId' | 'isFeatureEnabled' | 'realTimeAssist' | 'onRealTimeAssistReceived'
>;

export type UserMessage = {id: string; text: string; sentAt: number};

/** @internal */
export interface UseWellnessBreakInput
  extends Pick<
    IAIAssistantProps,
    | 'onWellnessBreakOffered'
    | 'onWellnessBreakAccepted'
    | 'onWellnessBreakStarted'
    | 'onWellnessBreakEnded'
    | 'onWellnessBreakError'
    | 'wellnessAudioUrl'
  > {
  enabled: boolean;
  isLoggedIn: boolean;
  agentId: string;
  agentSessionId: string;
  wellbeingBreakIdleCode?: IdleCode;
  wellnessBreakState: WellnessBreakState;
  wellnessEventSequence: number;
  rtdStatus: AIAssistantRTDStatusEvent;
  isAgentStateControlEnabled: boolean;
  agentChannelTypes: string[];
  agentChannelStateDetails: Record<string, AgentChannelStateDetail>;
  agentChannelReloginSequence: number;
  legacyAgentState: string;
  legacyAuxCodeId: string;
  taskList: Record<string, ITask>;
  idleCodes: IdleCode[];
  theme: string;
}
