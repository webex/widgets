import type {
  AISummaryActionType,
  AISummaryContent,
  AISummaryFeedback,
  AISummaryFeedbackResult,
  RealTimeAssistPayload,
} from '@webex/cc-store';

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
}

export interface UseAiAssistantInput extends IAIAssistantProps {
  interactionId?: string;
  agentId: string;
  isFeatureEnabled: boolean;
  realTimeAssist: RealTimeAssistPayload[];
  receiverSummary?: AIAssistantReceiverSummary;
}

export type AIAssistantReceiverSummary =
  | {
      surface: 'content';
      branchKey: string;
      content: Extract<AISummaryContent, {type: 'card'}>;
      contentRevision: number;
      actionType: AISummaryActionType;
      selectedFeedback: AISummaryFeedback;
      midCallFeedbackPending: boolean;
      controlsDisabled: boolean;
      openReceiverSummary: () => boolean;
      recordReceiverSummaryCopied: (expectedRevision: number) => boolean;
      setReceiverSummaryFeedback: (
        feedback: Exclude<AISummaryFeedback, 'none'>,
        actionType: AISummaryActionType,
        expectedRevision: number
      ) => Promise<AISummaryFeedbackResult>;
    }
  | {
      surface: 'unavailable' | 'generic-error';
      branchKey: string;
      content?: never;
      contentRevision?: never;
      actionType?: never;
      selectedFeedback?: never;
      midCallFeedbackPending?: never;
      controlsDisabled?: never;
      recordReceiverSummaryCopied?: never;
      setReceiverSummaryFeedback?: never;
      openReceiverSummary: () => boolean;
    };

export type UseAIAssistantChromeInput = Pick<
  UseAiAssistantInput,
  'onOpen' | 'onMinimize' | 'onRestore' | 'onClose' | 'onFullScreenToggle'
>;

export type UseRealTimeAssistInput = Pick<
  UseAiAssistantInput,
  'interactionId' | 'agentId' | 'isFeatureEnabled' | 'realTimeAssist' | 'onRealTimeAssistReceived'
>;

export type UserMessage = {id: string; text: string; sentAt: number};
