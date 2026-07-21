import type {RealTimeAssistPayload} from '@webex/cc-store';

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
  /** Fired when the chat is reset (suggestions, drafts, session flags wiped). */
  onClearChat?: () => void;
  /** Fired when the fullscreen affordance is toggled.  Host owns layout. */
  onFullScreenToggle?: (isFullScreen: boolean) => void;
  /** Fired each time a fresh real-time assist response arrives for the active task. */
  onRealTimeAssistReceived?: (payload: RealTimeAssistPayload) => void;
  /** @deprecated Use `onRealTimeAssistReceived` instead. */
  onSuggestionReceived?: (payload: RealTimeAssistPayload) => void;
  /** Optional extra class applied to the widget root. */
  className?: string;
}
