import type {RealTimeAssistPayload} from '@webex/cc-store';

/** Visual state of the AI Assistant panel chrome. */
export type AIAssistantChromeState = 'closed' | 'open' | 'minimized';

/** Lifecycle state of a real-time assist request. */
export type AIAssistantRequestStatus = 'idle' | 'listening' | 'ready' | 'error';

/**
 * A single entry rendered in the chat transcript.  User entries are agent
 * input, assistant entries wrap a `RealTimeAssistPayload` from the SDK,
 * and `assistant-greeting` is the seeded intro line.
 */
export type AIAssistantChatEntry =
  | {type: 'user'; id: string; text: string}
  | {type: 'assistant-greeting'; id: string; text: string}
  | {
      type: 'assistant';
      id: string;
      realTimeAssist?: RealTimeAssistPayload;
    };

/** Props for the top-level AIAssistant presentational component. */
export interface AIAssistantComponentProps {
  /** Current chrome visibility state. */
  chrome: AIAssistantChromeState;
  /** Whether the host has the widget mounted in fullscreen layout. */
  isFullScreen: boolean;
  /** Status of the in-flight real-time assist request. */
  requestStatus: AIAssistantRequestStatus;
  /** Latest error message when `requestStatus === 'error'`. */
  errorMessage?: string;
  /** Current value of the context input. */
  contextDraft: string;
  /** Chronological list of chat entries to render. */
  chatEntries: AIAssistantChatEntry[];
  /** Whether `aiFeature.suggestedResponses.enable` is true on the agent profile. */
  isFeatureEnabled: boolean;
  /** Whether `Get Suggestions` has been clicked at least once this session. */
  hasFiredInitialRequest: boolean;
  /** Transition the chrome to `open`. */
  open: () => void;
  /** Transition the chrome to `closed`; preserves chat state. */
  close: () => void;
  /** Collapse the panel to its minimized bar. */
  minimize: () => void;
  /** Restore the panel from minimized to open. */
  restore: () => void;
  /** Toggle the fullscreen affordance; layout is host-owned. */
  toggleFullScreen: () => void;
  /** Fire a no-context `GET_SUGGESTIONS` request. */
  requestSuggestion: () => void;
  /** Update the context input value. */
  setContextDraft: (value: string) => void;
  /** Fire an `ADD_SUGGESTIONS_EXTRA_CONTEXT` request using the current draft. */
  submitContext: () => void;
  /** Notify the host when the agent acts on a real-time assist card. */
  onRealTimeAssistAction?: (event: AIAssistantFeedbackEvent, assist: RealTimeAssistPayload) => void;
  /** Extra class applied to the widget root. */
  className?: string;
}

export interface AIAssistantHeaderProps {
  onMinimize: () => void;
  onToggleFullScreen: () => void;
  onClose: () => void;
  isFullScreen: boolean;
}

export interface MinimizedBarProps {
  onRestore: () => void;
  onClose: () => void;
}

export interface RealTimeAssistProps {
  status: AIAssistantRequestStatus;
  errorMessage?: string;
  chatEntries: AIAssistantChatEntry[];
  contextDraft: string;
  onRequestSuggestion: () => void;
  onContextDraftChange: (value: string) => void;
  onSubmitContext: () => void;
  isFeatureEnabled: boolean;
  hasFiredInitialRequest: boolean;
  /** Fires when the agent clicks the like / dislike / copy buttons on a card. */
  onRealTimeAssistAction?: (event: AIAssistantFeedbackEvent, assist: RealTimeAssistPayload) => void;
}

/** Kind of feedback the agent gave on a suggestion card. */
export type AIAssistantFeedbackKind = 'like' | 'dislike' | 'copy';

/** Payload emitted by like / dislike / copy clicks inside a card. */
export interface AIAssistantFeedbackEvent {
  type: AIAssistantFeedbackKind;
  /** The id of the underlying card action that fired this event. */
  actionId: string;
}

export interface AdaptiveCardRendererProps {
  card: unknown;
  /** Plain-text fallback rendered when the Adaptive Card cannot be parsed/rendered. */
  fallbackText?: string;
  /** Source timestamp (epoch ms, or stringified epoch) used to fill in any
   * `SOURCE_TIMESTAMP_PLACEHOLDER` markers the backend ships in the card. */
  publishTimestamp?: number | string;
  /** Plain-text version of the suggestion, copied to the clipboard when the
   * user activates the card's copy action. */
  suggestionText?: string;
  /** Fires when the user clicks the like / dislike / copy controls inside the card. */
  onFeedback?: (event: AIAssistantFeedbackEvent) => void;
  onAction?: (action: unknown) => void;
}
