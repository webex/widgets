import type {
  ILogger,
  RealTimeAssistPayload,
  WellnessBreakError,
  WellnessBreakEvent,
  WellnessBreakPhase,
} from '@webex/cc-store';

/** Visual state of the AI Assistant panel chrome. */
export type AIAssistantChromeState = 'closed' | 'open' | 'minimized';

/** Lifecycle state of a real-time assist request. */
export type AIAssistantRequestStatus = 'idle' | 'listening' | 'ready' | 'error';

export type WellnessBreakNotice = 'declined' | 'not-allowed' | 'no-response' | 'completed';
export type WellnessBreakResponseSource = 'card' | 'notification';
/** Where the active wellness-break overlay is rendered. */
export type WellnessBreakOverlayTarget = 'viewport' | 'assistant' | HTMLElement;

export interface WellnessAnimationController {
  totalFrames: number;
  goToAndPlay(frame: number, isFrame: boolean): void;
  goToAndStop(frame: number, isFrame: boolean): void;
  destroy(): void;
}

export type WellnessAnimationLoader = (
  container: HTMLElement,
  animationData: unknown
) => Promise<WellnessAnimationController>;

interface WellnessBreakHistoryEntryBase {
  id: string;
  createdAt: number;
}

/** One persisted message in the Desktop-style wellness transcript. */
export type WellnessBreakHistoryEntry =
  | (WellnessBreakHistoryEntryBase & {
      type: 'offer';
      event: WellnessBreakEvent;
      actionable: boolean;
    })
  | (WellnessBreakHistoryEntryBase & {
      type: 'user-action';
      action: 'take-break' | 'later';
    })
  | (WellnessBreakHistoryEntryBase & {
      type: 'acknowledgement';
      hasBlockingTasks: boolean;
    })
  | (WellnessBreakHistoryEntryBase & {
      type: 'notice';
      notice: WellnessBreakNotice;
      actionText?: string;
    });

/** Presentational contract supplied by the AI Assistant wellness orchestrator. */
export interface WellnessBreakViewModel {
  enabled: boolean;
  phase: WellnessBreakPhase;
  event?: WellnessBreakEvent;
  error?: WellnessBreakError;
  notice?: WellnessBreakNotice;
  requestAvailable: boolean;
  /** Chronological wellness messages retained until the agent presses Clear. */
  history?: WellnessBreakHistoryEntry[];
  /** Whether current notification content was explicitly cleared from the panel. */
  contentCleared?: boolean;
  /** Whether an active task is currently delaying an accepted break. */
  hasBlockingTasks: boolean;
  countdown?: number;
  elapsedSeconds: number;
  animationData?: unknown;
  reducedMotion: boolean;
  onRequest: () => void;
  onAccept: (source?: WellnessBreakResponseSource) => void;
  onLater: (source?: WellnessBreakResponseSource) => void;
  onClearHistory?: () => void;
  onDismissNotification?: () => void;
  onMediaError: () => void;
}

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
  /** Whether a real-time assist request is awaiting a response. */
  isRequesting: boolean;
  /** Chronological list of chat entries to render. */
  chatEntries: AIAssistantChatEntry[];
  /** Whether `aiFeature.suggestedResponses.enable` is true on the agent profile. */
  isFeatureEnabled: boolean;
  /** Whether an interaction is currently active. */
  hasActiveInteraction: boolean;
  /** Display name used in the AI Assistant landing greeting. */
  agentName?: string;
  /** Whether the first real-time assist request has completed successfully. */
  hasInitialRequestSucceeded: boolean;
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
  /** Clear the displayed assistant and wellness transcript. */
  clearContent?: () => void;
  /** Whether the Clear control has displayed content to remove. */
  hasClearableContent?: boolean;
  /** Fire a no-context `GET_SUGGESTIONS` request. */
  requestRealTimeAssist: () => void;
  /** Update the context input value. */
  setContextDraft: (value: string) => void;
  /** Fire an `ADD_SUGGESTIONS_EXTRA_CONTEXT` request using the current draft. */
  submitContext: () => void;
  /** Notify the host when the agent acts on a real-time assist card. */
  onRealTimeAssistAction?: (event: AIAssistantActionEvent, assist: RealTimeAssistPayload) => void | Promise<void>;
  /** Store logger, used to report failures this package cannot surface itself. */
  logger?: ILogger;
  /** Extra class applied to the widget root. */
  className?: string;
  /** Viewport by default; may be scoped to the assistant or portalled into a host element. */
  wellnessBreakOverlayTarget?: WellnessBreakOverlayTarget;
  /** Independent Agent Wellness Break cards and overlay. */
  wellness?: WellnessBreakViewModel;
  /** Optional renderer supplied by the AI Assistant widget. */
  loadWellnessAnimation?: WellnessAnimationLoader;
}

export interface WellnessBreakRequestCardProps {
  phase: WellnessBreakPhase;
  notice?: WellnessBreakNotice;
  disabled: boolean;
  actionText?: string;
  onRequest: () => void;
}

export interface WellnessBreakOfferCardProps {
  event?: WellnessBreakEvent;
  disabled: boolean;
  showActions?: boolean;
  onAccept: () => void;
  onLater: () => void;
}

export interface WellnessBreakHistoryProps {
  entries: WellnessBreakHistoryEntry[];
  onAccept: () => void;
  onLater: () => void;
}

export interface WellnessBreakOfferToastProps extends WellnessBreakOfferCardProps {
  visible: boolean;
  onDismiss?: () => void;
}

export interface WellnessBreakModalProps {
  phase: Extract<WellnessBreakPhase, 'starting' | 'playing' | 'ending'>;
  countdown?: number;
  elapsedSeconds: number;
  animationData?: unknown;
  reducedMotion: boolean;
  onMediaError: () => void;
  overlayTarget?: WellnessBreakOverlayTarget;
  loadAnimation?: WellnessAnimationLoader;
}

export interface WellnessBreakErrorProps {
  error?: WellnessBreakError;
}

export interface RealTimeAssistProps {
  status: AIAssistantRequestStatus;
  errorMessage?: string;
  chatEntries: AIAssistantChatEntry[];
  contextDraft: string;
  isRequesting: boolean;
  onRequestRealTimeAssist: () => void;
  onContextDraftChange: (value: string) => void;
  onSubmitContext: () => void;
  hasInitialRequestSucceeded: boolean;
  /** Fires when the agent clicks the like / dislike / copy buttons on a card. */
  onRealTimeAssistAction?: (event: AIAssistantActionEvent, assist: RealTimeAssistPayload) => void | Promise<void>;
  logger?: ILogger;
}

/** Kind of action the agent can take on a suggestion card. */
export type AIAssistantActionKind = 'like' | 'dislike' | 'copy';

/** Payload emitted by like / dislike / copy clicks inside a card. */
export interface AIAssistantActionEvent {
  type: AIAssistantActionKind;
  /** The id of the underlying card action that fired this event. */
  actionId: string;
}

export interface AdaptiveCardRendererProps {
  card: unknown;
  /** Title already rendered by RealTimeAssist; removes the matching header embedded in backend cards. */
  assistantTitle?: string;
  /** Plain-text fallback rendered when the Adaptive Card cannot be parsed/rendered. */
  fallbackText?: string;
  /** Source timestamp (epoch ms, or stringified epoch) used to fill in any
   * `SOURCE_TIMESTAMP_PLACEHOLDER` markers the backend ships in the card. */
  publishTimestamp?: number | string;
  /** Plain-text version of the suggestion, copied to the clipboard when the
   * user activates the card's copy action. */
  suggestionText?: string;
  /** Fires when the user clicks the like / dislike / copy controls inside the
   * card.  Like/dislike is only painted as selected once the returned promise
   * resolves; a rejection leaves the control untouched. */
  onUserAction?: (event: AIAssistantActionEvent) => void | Promise<void>;
  onAction?: (action: unknown) => void;
  logger?: ILogger;
}
