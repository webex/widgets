import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import store from '@webex/cc-store';
import type {SuggestedResponsePayload} from '@webex/cc-store';
import type {AIAssistantChatEntry, AIAssistantChromeState, AIAssistantRequestStatus} from '@webex/cc-components';
import {IAIAssistantProps} from './ai-assistant.types';

const SUGGESTED_RESPONSES_FLAG = 'isSuggestedResponsesEnabled';
const GREETING_TEXT = "I'm here to help! I'll keep listening and suggest responses as the conversation evolves.";

interface UseAiAssistantInput extends IAIAssistantProps {
  interactionId?: string;
  agentId: string;
  isFeatureEnabled: boolean;
  suggestions: SuggestedResponsePayload[];
}

type UserMessage = {id: string; text: string; sentAt: number};

export const useAiAssistant = ({
  interactionId,
  agentId,
  isFeatureEnabled,
  suggestions,
  onOpen,
  onMinimize,
  onRestore,
  onClose,
  onClearChat,
  onFullScreenToggle,
  onSuggestionReceived,
}: UseAiAssistantInput) => {
  const [chrome, setChrome] = useState<AIAssistantChromeState>('closed');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<AIAssistantRequestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [contextDraft, setContextDraft] = useState('');
  const [pendingRequest, setPendingRequest] = useState(false);
  // ADD_SUGGESTIONS_EXTRA_CONTEXT only makes sense after a GET_SUGGESTIONS has fired.
  const [hasFiredInitialRequest, setHasFiredInitialRequest] = useState(false);
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);

  const lastSeenCountRef = useRef(0);
  // Stash these in refs so the suggestion effect can read the latest values
  // without re-running on every change (it only reacts to `suggestions`).
  const pendingRequestRef = useRef(pendingRequest);
  const requestStatusRef = useRef(requestStatus);
  const onSuggestionReceivedRef = useRef(onSuggestionReceived);
  useEffect(() => {
    pendingRequestRef.current = pendingRequest;
    requestStatusRef.current = requestStatus;
    onSuggestionReceivedRef.current = onSuggestionReceived;
  });

  useEffect(() => {
    const len = suggestions.length;
    if (len === 0) {
      lastSeenCountRef.current = 0;
      return;
    }
    if (len <= lastSeenCountRef.current) return;
    lastSeenCountRef.current = len;

    const latest = suggestions[len - 1];
    if (pendingRequestRef.current) {
      setPendingRequest(false);
      setRequestStatus('ready');
    } else if (requestStatusRef.current !== 'ready') {
      setRequestStatus('ready');
    }
    onSuggestionReceivedRef.current?.(latest);
  }, [suggestions]);

  const open = useCallback(() => {
    setChrome('open');
    onOpen?.();
  }, [onOpen]);

  // close preserves chat state so reopening continues the session; clearChat resets it.
  const close = useCallback(() => {
    setChrome('closed');
    setIsFullScreen(false);
    onClose?.();
  }, [onClose]);

  const minimize = useCallback(() => {
    setChrome('minimized');
    onMinimize?.();
  }, [onMinimize]);

  const restore = useCallback(() => {
    setChrome('open');
    onRestore?.();
  }, [onRestore]);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => {
      const next = !prev;
      onFullScreenToggle?.(next);
      return next;
    });
  }, [onFullScreenToggle]);

  const clearChat = useCallback(() => {
    setRequestStatus('idle');
    setErrorMessage(undefined);
    setContextDraft('');
    setPendingRequest(false);
    setHasFiredInitialRequest(false);
    setUserMessages([]);
    lastSeenCountRef.current = 0;
    if (interactionId) {
      store.clearSuggestedResponse?.(interactionId);
    }
    onClearChat?.();
  }, [interactionId, onClearChat]);

  const requestSuggestion = useCallback(
    async (context?: string) => {
      if (!isFeatureEnabled) {
        setRequestStatus('error');
        setErrorMessage('AI suggested responses are not enabled for your profile.');
        return;
      }
      if (!interactionId || !agentId) {
        setRequestStatus('error');
        setErrorMessage('No active interaction to request a suggestion for.');
        return;
      }
      const api = store.cc?.apiAIAssistant;
      if (!api?.getSuggestedResponse) {
        setRequestStatus('error');
        setErrorMessage(
          'AI assistant API is not available in the loaded SDK build. Update @webex/contact-center to a build that exposes apiAIAssistant.getSuggestedResponse.'
        );
        return;
      }
      setRequestStatus('listening');
      setErrorMessage(undefined);
      setPendingRequest(true);
      setHasFiredInitialRequest(true);
      const sentAt = Date.now();
      if (context) {
        setUserMessages((prev) => [...prev, {id: `${sentAt}-${prev.length}`, text: context, sentAt}]);
      }
      try {
        await api.getSuggestedResponse({
          agentId,
          interactionId,
          actionTimeStamp: sentAt,
          ...(context ? {context} : {}),
        });
      } catch (err) {
        setPendingRequest(false);
        setRequestStatus('error');
        setErrorMessage((err as Error)?.message || 'Failed to request a suggestion.');
      }
    },
    [agentId, interactionId, isFeatureEnabled]
  );

  const submitContext = useCallback(() => {
    const draft = contextDraft.trim();
    if (!draft) return;
    requestSuggestion(draft);
    setContextDraft('');
  }, [contextDraft, requestSuggestion]);

  // Chronological transcript: optional greeting, then interleaved user/assistant entries.
  const chatEntries = useMemo<AIAssistantChatEntry[]>(() => {
    const assistantEntries: Array<{ts: number; order: number; entry: AIAssistantChatEntry}> = suggestions.map(
      (suggestion, index) => {
        const publishTimestamp = suggestion?.data?.publishTimestamp;
        const ts =
          typeof publishTimestamp === 'number'
            ? publishTimestamp
            : typeof publishTimestamp === 'string'
              ? Number.parseInt(publishTimestamp, 10) || 0
              : 0;
        const id =
          (suggestion?.data?.adaptiveCardId as string | undefined) ??
          (suggestion?.data?.trackingId as string | undefined) ??
          `assistant-${index}`;
        return {ts, order: 2, entry: {type: 'assistant', id, suggestion}};
      }
    );

    const userEntries: Array<{ts: number; order: number; entry: AIAssistantChatEntry}> = userMessages.map(
      (message) => ({
        ts: message.sentAt,
        order: 1,
        entry: {type: 'user', id: message.id, text: message.text},
      })
    );

    const sorted = [...userEntries, ...assistantEntries]
      .sort((a, b) => (a.ts === b.ts ? a.order - b.order : a.ts - b.ts))
      .map(({entry}) => entry);

    if (!hasFiredInitialRequest) return sorted;

    return [{type: 'assistant-greeting', id: 'greeting-assistant', text: GREETING_TEXT}, ...sorted];
  }, [suggestions, userMessages, hasFiredInitialRequest]);

  return useMemo(
    () => ({
      chrome,
      isFullScreen,
      requestStatus,
      errorMessage,
      contextDraft,
      hasFiredInitialRequest,
      chatEntries,
      open,
      close,
      minimize,
      restore,
      toggleFullScreen,
      clearChat,
      requestSuggestion: () => requestSuggestion(),
      setContextDraft,
      submitContext,
    }),
    [
      chrome,
      isFullScreen,
      requestStatus,
      errorMessage,
      contextDraft,
      hasFiredInitialRequest,
      chatEntries,
      open,
      close,
      minimize,
      restore,
      toggleFullScreen,
      clearChat,
      requestSuggestion,
      submitContext,
    ]
  );
};

export {SUGGESTED_RESPONSES_FLAG};
