import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import store from '@webex/cc-store';
import type {RealTimeAssistPayload} from '@webex/cc-store';
import type {
  AIAssistantActionEvent,
  AIAssistantChatEntry,
  AIAssistantChromeState,
  AIAssistantRequestStatus,
} from '@webex/cc-components';
import {
  UseAIAssistantChromeInput,
  UseAiAssistantInput,
  UseRealTimeAssistInput,
  UserMessage,
} from './ai-assistant.types';

const MODULE = 'ai-assistant/helper.ts';
const REAL_TIME_ASSIST_FLAG = 'isSuggestedResponsesEnabled';
const GREETING_TEXT = "I'm here to help! I'll keep listening and suggest responses as the conversation evolves.";

export const useAIAssistantChrome = ({
  onOpen,
  onMinimize,
  onRestore,
  onClose,
  onFullScreenToggle,
}: UseAIAssistantChromeInput) => {
  const [chrome, setChrome] = useState<AIAssistantChromeState>('closed');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const open = useCallback(() => {
    setChrome('open');
    onOpen?.();
  }, [onOpen]);

  // Closing preserves chat state so reopening continues the session.
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

  return useMemo(
    () => ({
      chrome,
      isFullScreen,
      open,
      close,
      minimize,
      restore,
      toggleFullScreen,
    }),
    [chrome, isFullScreen, open, close, minimize, restore, toggleFullScreen]
  );
};

export const useRealTimeAssist = ({
  interactionId,
  agentId,
  isFeatureEnabled,
  realTimeAssist,
  onRealTimeAssistReceived,
}: UseRealTimeAssistInput) => {
  const [requestStatus, setRequestStatus] = useState<AIAssistantRequestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [contextDraft, setContextDraft] = useState('');
  const [pendingRequest, setPendingRequest] = useState(false);
  // ADD_SUGGESTIONS_EXTRA_CONTEXT only makes sense once a GET_SUGGESTIONS has succeeded.
  const [hasInitialRequestSucceeded, setHasInitialRequestSucceeded] = useState(false);
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);

  const lastSeenCountRef = useRef(0);
  // Blocks overlapping SDK calls when the agent double-clicks a request control.
  const inFlightRef = useRef(false);
  // Stash these in refs so the response effect can read the latest values
  // without re-running on every change (it only reacts to `realTimeAssist`).
  const pendingRequestRef = useRef(pendingRequest);
  const requestStatusRef = useRef(requestStatus);
  const onRealTimeAssistReceivedRef = useRef(onRealTimeAssistReceived);
  useEffect(() => {
    pendingRequestRef.current = pendingRequest;
    requestStatusRef.current = requestStatus;
    onRealTimeAssistReceivedRef.current = onRealTimeAssistReceived;
  });

  // A new interaction starts a fresh session; nothing from the previous
  // customer may leak into it.
  useEffect(() => {
    lastSeenCountRef.current = 0;
    inFlightRef.current = false;
    setRequestStatus('idle');
    setErrorMessage(undefined);
    setContextDraft('');
    setPendingRequest(false);
    setHasInitialRequestSucceeded(false);
    setUserMessages([]);
  }, [interactionId]);

  useEffect(() => {
    const len = realTimeAssist.length;
    if (len === 0) {
      lastSeenCountRef.current = 0;
      return;
    }
    if (len <= lastSeenCountRef.current) return;
    const firstUnseen = lastSeenCountRef.current;
    lastSeenCountRef.current = len;

    if (pendingRequestRef.current) {
      setPendingRequest(false);
      setRequestStatus('ready');
    } else if (requestStatusRef.current !== 'ready') {
      setRequestStatus('ready');
    }
    // Several payloads can land before React commits; the host hears about each.
    for (let i = firstUnseen; i < len; i += 1) {
      onRealTimeAssistReceivedRef.current?.(realTimeAssist[i]);
    }
  }, [realTimeAssist]);

  const requestRealTimeAssist = useCallback(
    async (context?: string) => {
      if (!isFeatureEnabled || !interactionId || !agentId) {
        setRequestStatus('idle');
        setErrorMessage(undefined);
        return;
      }
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      setRequestStatus('listening');
      setErrorMessage(undefined);
      setPendingRequest(true);
      const sentAt = Date.now();
      if (context) {
        setUserMessages((prev) => [...prev, {id: `${sentAt}-${prev.length}`, text: context, sentAt}]);
      }
      try {
        await store.cc?.apiAIAssistant.getRealTimeAssistance({
          agentId,
          interactionId,
          actionTimeStamp: sentAt,
          ...(context ? {context} : {}),
        });
        setHasInitialRequestSucceeded(true);
      } catch (err) {
        setPendingRequest(false);
        setRequestStatus('error');
        setErrorMessage((err as Error)?.message || 'Failed to request real-time assist.');
      } finally {
        inFlightRef.current = false;
      }
    },
    [agentId, interactionId, isFeatureEnabled]
  );

  const submitContext = useCallback(() => {
    const draft = contextDraft.trim();
    if (!draft) return;
    requestRealTimeAssist(draft);
    setContextDraft('');
  }, [contextDraft, requestRealTimeAssist]);

  // Returns the SDK promise so the card can undo its optimistic like/dislike
  // state when the action fails to reach the backend.
  const handleRealTimeAssistAction = useCallback(
    (event: AIAssistantActionEvent, assist: RealTimeAssistPayload) => {
      const api = store.cc?.apiAIAssistant;
      const adaptiveCardId = assist?.data?.adaptiveCardId;
      if (!interactionId || !agentId || !adaptiveCardId || !api?.sendRealTimeAssistanceUserAction) {
        store.logger?.warn(
          `CC-Widgets: skipping ${event.type} action - missing ${
            !adaptiveCardId ? 'adaptiveCardId' : !interactionId ? 'interactionId' : !agentId ? 'agentId' : 'SDK API'
          }`,
          {module: MODULE, method: 'handleRealTimeAssistAction'}
        );
        return Promise.reject(new Error('Unable to send real-time assist action.'));
      }

      return api
        .sendRealTimeAssistanceUserAction({
          agentId,
          interactionId,
          adaptiveCardId,
          actionId: event.actionId,
          languageCode: typeof assist?.data?.languageCode === 'string' ? assist.data.languageCode : undefined,
        })
        .catch((error) => {
          store.logger?.error(`CC-Widgets: sendRealTimeAssistanceUserAction failed - ${error}`, {
            module: MODULE,
            method: 'handleRealTimeAssistAction',
          });
          throw error;
        });
    },
    [agentId, interactionId]
  );

  // Chronological transcript: optional greeting, then interleaved user/assistant entries.
  const chatEntries = useMemo<AIAssistantChatEntry[]>(() => {
    const assistantEntries: Array<{ts: number; order: number; entry: AIAssistantChatEntry}> = realTimeAssist.map(
      (suggestion, index) => {
        const publishTimestamp = suggestion?.data?.publishTimestamp;
        const ts =
          typeof publishTimestamp === 'number'
            ? publishTimestamp
            : typeof publishTimestamp === 'string'
              ? Number.parseInt(publishTimestamp, 10) || 0
              : 0;
        const id = suggestion?.data?.adaptiveCardId ?? suggestion?.data?.trackingId ?? `assistant-${index}`;
        return {ts, order: 2, entry: {type: 'assistant', id, realTimeAssist: suggestion}};
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

    if (!hasInitialRequestSucceeded) return sorted;

    return [{type: 'assistant-greeting', id: 'greeting-assistant', text: GREETING_TEXT}, ...sorted];
  }, [realTimeAssist, userMessages, hasInitialRequestSucceeded]);

  return useMemo(
    () => ({
      requestStatus,
      errorMessage,
      contextDraft,
      hasInitialRequestSucceeded,
      chatEntries,
      requestRealTimeAssist,
      setContextDraft,
      submitContext,
      onRealTimeAssistAction: handleRealTimeAssistAction,
    }),
    [
      requestStatus,
      errorMessage,
      contextDraft,
      hasInitialRequestSucceeded,
      chatEntries,
      requestRealTimeAssist,
      submitContext,
      handleRealTimeAssistAction,
    ]
  );
};

export const useAiAssistant = (input: UseAiAssistantInput) => {
  const chrome = useAIAssistantChrome(input);
  const realTimeAssist = useRealTimeAssist(input);

  return useMemo(() => ({...chrome, ...realTimeAssist}), [chrome, realTimeAssist]);
};

export {REAL_TIME_ASSIST_FLAG};
