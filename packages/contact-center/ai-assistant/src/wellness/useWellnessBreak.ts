import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import store, {WELLNESS_BREAK_NOTIFICATION_ACTIONS, WELLNESS_BREAK_USER_ACTIONS} from '@webex/cc-store';
import type {WellnessBreakError, WellnessBreakErrorCode, WellnessBreakEvent, WellnessBreakPhase} from '@webex/cc-store';
import type {
  WellnessBreakHistoryEntry,
  WellnessBreakNotice,
  WellnessBreakResponseSource,
  WellnessBreakViewModel,
} from '@webex/cc-components';
import type {UseWellnessBreakInput} from '../ai-assistant.types';
import type {WellnessBreakRecoveryMarkerV1} from './wellness-internal.types';
import {
  areAllTasksSafeForWellness,
  createWellnessRecoveryMarker,
  getWellnessRecoveryDecision,
  normalizeWellnessState,
  parseWellnessRecoveryMarker,
} from './wellness.utils';
import {logWellnessMetric, WELLNESS_METRIC} from './wellness.metrics';

export const WELLNESS_OFFER_TIMEOUT_MS = 5 * 60 * 1000;
export const WELLNESS_STATE_SETTLE_MS = 2 * 1000;
export const WELLNESS_STARTING_MS = 5 * 1000;
export const WELLNESS_PLAYING_MS = 60 * 1000;
export const WELLNESS_ENDING_MS = 5 * 1000;
export const WELLNESS_RESTORE_RETRY_MS = 10 * 1000;
export const WELLNESS_RECOVERY_KEY = 'webex-cc-agent-wellness-break:v1';

const RESTORE_ATTEMPTS = 3;
const LEGACY_RECOVERY_ATTEMPTS = 5;
const LEGACY_RECOVERY_INTERVAL_MS = 20 * 1000;
const ACTIVE_PHASES = new Set<WellnessBreakPhase>([
  'changing-to-break',
  'waiting-for-safe-state',
  'starting',
  'playing',
  'ending',
  'restoring',
]);
const PRE_PLAY_PHASES = new Set<WellnessBreakPhase>(['changing-to-break', 'waiting-for-safe-state', 'starting']);
const MODULE = 'wellness/useWellnessBreak.ts';

type CapturedBreakState = {
  theme: string;
} & Pick<WellnessBreakRecoveryMarkerV1, 'preBreakLegacyState' | 'preBreakLegacyAuxCodeId'>;

type RestoreResult = 'restored' | 'not-owned' | 'failed' | 'cancelled';

const AVAILABLE_STATE = {state: 'Available' as const, auxCodeId: '0'};

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

/** @internal */
export const useWellnessBreak = (input: UseWellnessBreakInput): WellnessBreakViewModel => {
  const [requestAvailable, setRequestAvailable] = useState(false);
  const [notice, setNotice] = useState<WellnessBreakNotice | undefined>();
  const [error, setError] = useState<WellnessBreakError | undefined>();
  const [countdown, setCountdown] = useState<number | undefined>();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [animationData, setAnimationData] = useState<unknown>();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [history, setHistory] = useState<WellnessBreakHistoryEntry[]>([]);
  const [contentCleared, setContentCleared] = useState(false);

  const latestRef = useRef(input);
  const phaseRef = useRef<WellnessBreakPhase>(input.wellnessBreakState.phase);
  const callbackRef = useRef(input);
  const previousSessionRef = useRef(input.agentSessionId);
  const lastEventSequenceRef = useRef(0);
  const offerTimerRef = useRef<number>();
  const settleTimerRef = useRef<number>();
  const timelineIntervalRef = useRef<number>();
  const timelineTimerRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement>();
  const audioLoadPromiseRef = useRef<Promise<HTMLAudioElement | undefined>>();
  const mediaOperationRef = useRef(0);
  const capturedRef = useRef<CapturedBreakState>();
  const stateRequestResolvedRef = useRef(false);
  const restoringRef = useRef(false);
  const operationRef = useRef(0);
  const acceptedEventRef = useRef<WellnessBreakEvent>();
  const completionRef = useRef(false);
  const legacyRecoveryCountRef = useRef(0);
  const pendingStateRequestRef = useRef<Promise<boolean>>();
  const reportedErrorCodeRef = useRef<WellnessBreakErrorCode>();
  const historySequenceRef = useRef(0);
  const activeOfferHistoryIdRef = useRef<string>();

  latestRef.current = input;
  callbackRef.current = input;
  phaseRef.current = input.wellnessBreakState.phase;

  const invokeHost = useCallback((callback: (() => void) | undefined, name: string) => {
    try {
      callback?.();
    } catch {
      store.logger?.warn('CC-Widgets: Agent Wellness Break host callback failed', {module: MODULE, method: name});
    }
  }, []);

  const invokeHostWithEvent = useCallback(
    (callback: ((event: WellnessBreakEvent) => void) | undefined, event: WellnessBreakEvent, name: string) => {
      try {
        callback?.(event);
      } catch {
        store.logger?.warn('CC-Widgets: Agent Wellness Break host callback failed', {module: MODULE, method: name});
      }
    },
    []
  );

  const createHistoryMetadata = useCallback((type: WellnessBreakHistoryEntry['type']) => {
    historySequenceRef.current += 1;
    return {id: `${type}-${Date.now()}-${historySequenceRef.current}`, createdAt: Date.now()};
  }, []);

  const appendHistory = useCallback((entry: WellnessBreakHistoryEntry) => {
    setHistory((current) => [...current, entry]);
    setContentCleared(false);
  }, []);

  const appendUserAction = useCallback(
    (action: Extract<WellnessBreakHistoryEntry, {type: 'user-action'}>['action']) => {
      appendHistory({type: 'user-action', action, ...createHistoryMetadata('user-action')});
    },
    [appendHistory, createHistoryMetadata]
  );

  const appendAcknowledgement = useCallback(
    (hasBlockingTasks: boolean) => {
      appendHistory({type: 'acknowledgement', hasBlockingTasks, ...createHistoryMetadata('acknowledgement')});
    },
    [appendHistory, createHistoryMetadata]
  );

  const appendNotice = useCallback(
    (nextNotice: WellnessBreakNotice, actionText?: string) => {
      appendHistory({type: 'notice', notice: nextNotice, actionText, ...createHistoryMetadata('notice')});
    },
    [appendHistory, createHistoryMetadata]
  );

  const appendOffer = useCallback(
    (event: WellnessBreakEvent) => {
      const metadata = createHistoryMetadata('offer');
      activeOfferHistoryIdRef.current = metadata.id;
      appendHistory({type: 'offer', event, actionable: true, ...metadata});
    },
    [appendHistory, createHistoryMetadata]
  );

  const resolveActiveOffer = useCallback(() => {
    const offerId = activeOfferHistoryIdRef.current;
    if (!offerId) return;
    setHistory((current) =>
      current.map((entry) => (entry.type === 'offer' && entry.id === offerId ? {...entry, actionable: false} : entry))
    );
    activeOfferHistoryIdRef.current = undefined;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setContentCleared(true);
    setRequestAvailable(false);
    setNotice(undefined);
    setError(undefined);
    activeOfferHistoryIdRef.current = undefined;
  }, []);

  const setPhase = useCallback(
    (
      phase: WellnessBreakPhase,
      patch: Partial<{
        event: WellnessBreakEvent;
        responseDeadline: number;
        errorCode: WellnessBreakErrorCode;
      }> = {}
    ) => {
      phaseRef.current = phase;
      store.setWellnessBreakState({phase, ...patch});
    },
    []
  );

  const reportError = useCallback(
    (code: WellnessBreakErrorCode, phase: WellnessBreakPhase, recoverable: boolean, showError = true) => {
      const wellnessError: WellnessBreakError = {code, phase, recoverable};
      reportedErrorCodeRef.current = code;
      if (showError) {
        setError(wellnessError);
        setPhase('error', {errorCode: code});
      }
      try {
        callbackRef.current.onWellnessBreakError?.(wellnessError);
      } catch {
        store.logger?.warn('CC-Widgets: Agent Wellness Break host callback failed', {
          module: MODULE,
          method: 'onWellnessBreakError',
        });
      }
      store.logger?.error(`CC-Widgets: Agent Wellness Break ${code}`, {module: MODULE, method: 'reportError'});
      logWellnessMetric(
        code === 'STATE_CHANGE_FAILED' ? WELLNESS_METRIC.ERROR_CHANGE_STATE : WELLNESS_METRIC.GENERIC_ERROR,
        code === 'MEDIA_UNAVAILABLE' ? {degradedMedia: true} : {recoverable}
      );
    },
    [setPhase]
  );

  const clearOfferTimer = useCallback(() => {
    if (offerTimerRef.current !== undefined) window.clearTimeout(offerTimerRef.current);
    offerTimerRef.current = undefined;
  }, []);

  const clearTimeline = useCallback(() => {
    if (settleTimerRef.current !== undefined) window.clearTimeout(settleTimerRef.current);
    if (timelineIntervalRef.current !== undefined) window.clearInterval(timelineIntervalRef.current);
    if (timelineTimerRef.current !== undefined) window.clearTimeout(timelineTimerRef.current);
    settleTimerRef.current = undefined;
    timelineIntervalRef.current = undefined;
    timelineTimerRef.current = undefined;
    setCountdown(undefined);
  }, []);

  const stopMedia = useCallback(() => {
    mediaOperationRef.current += 1;
    audioLoadPromiseRef.current = undefined;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    audioRef.current = undefined;
    setAnimationData(undefined);
  }, []);

  const clearRecoveryMarker = useCallback(() => {
    try {
      window.sessionStorage.removeItem(WELLNESS_RECOVERY_KEY);
    } catch {
      // Browser storage may be unavailable in privacy-restricted embeds.
    }
  }, []);

  const saveRecoveryMarker = useCallback((marker: WellnessBreakRecoveryMarkerV1) => {
    try {
      window.sessionStorage.setItem(WELLNESS_RECOVERY_KEY, JSON.stringify(marker));
    } catch {
      store.logger?.warn('CC-Widgets: wellness refresh recovery storage unavailable', {
        module: MODULE,
        method: 'saveRecoveryMarker',
      });
    }
  }, []);

  const requestAvailableState = useCallback(
    async (
      captured: CapturedBreakState,
      sessionId: string,
      agentId: string,
      wellnessCodeId: string | undefined,
      ownStateRequestSucceeded: boolean,
      completedTimeline: boolean,
      operation: number,
      attempts: number
    ): Promise<RestoreResult> => {
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        if (
          operation !== operationRef.current ||
          latestRef.current.agentSessionId !== sessionId ||
          ('wellnessAgentSessionId' in store && store.wellnessAgentSessionId !== sessionId)
        ) {
          return 'cancelled';
        }

        const currentState = store.legacyAgentState || latestRef.current.legacyAgentState;
        const currentCode = store.legacyAuxCodeId || latestRef.current.legacyAuxCodeId;
        const ownsCurrentState =
          currentCode === wellnessCodeId || normalizeWellnessState(currentState) === 'wellbeingbreak';
        const unchangedPreBreakState =
          currentCode === captured.preBreakLegacyAuxCodeId &&
          normalizeWellnessState(currentState) === normalizeWellnessState(captured.preBreakLegacyState);
        if (completedTimeline && currentCode === '0' && normalizeWellnessState(currentState) === 'available') {
          return 'not-owned';
        }
        if (!completedTimeline && !ownsCurrentState && !(ownStateRequestSucceeded && unchangedPreBreakState)) {
          return 'not-owned';
        }

        try {
          await store.cc.setAgentState({
            ...AVAILABLE_STATE,
            agentId,
            lastStateChangeReason: 'wellness-break-complete',
          });
          if (
            operation !== operationRef.current ||
            latestRef.current.agentSessionId !== sessionId ||
            ('wellnessAgentSessionId' in store && store.wellnessAgentSessionId !== sessionId)
          ) {
            return 'cancelled';
          }
          if (attempt > 1) logWellnessMetric(WELLNESS_METRIC.RESTORE_STATE_RETRY_ATTEMPT, {attempt, success: true});
          return 'restored';
        } catch {
          store.logger?.warn(`CC-Widgets: Agent Wellness Break restore attempt ${attempt} failed`, {
            module: MODULE,
            method: 'requestAvailableState',
          });
          logWellnessMetric(WELLNESS_METRIC.RESTORE_STATE_RETRY_ATTEMPT, {attempt, success: false});
          if (attempt < attempts) await wait(WELLNESS_RESTORE_RETRY_MS);
        }
      }
      return 'failed';
    },
    []
  );

  const performRestore = useCallback(
    async (completedTimeline: boolean, attempts = RESTORE_ATTEMPTS): Promise<boolean> => {
      if (restoringRef.current) return false;
      restoringRef.current = true;
      clearOfferTimer();
      clearTimeline();
      stopMedia();
      setPhase('restoring');
      const operation = ++operationRef.current;
      const latest = latestRef.current;
      const captured = capturedRef.current;
      const pendingStateRequest = pendingStateRequestRef.current;
      const ownStateRequestSucceeded = pendingStateRequest
        ? await pendingStateRequest
        : stateRequestResolvedRef.current;
      const result =
        latest.agentSessionId && captured
          ? await requestAvailableState(
              captured,
              latest.agentSessionId,
              latest.agentId,
              latest.wellbeingBreakIdleCode?.id,
              ownStateRequestSucceeded,
              completedTimeline,
              operation,
              attempts
            )
          : 'cancelled';
      restoringRef.current = false;
      if (result === 'cancelled') return false;
      if (result === 'failed') {
        reportError('RESTORE_FAILED', 'restoring', true);
        return false;
      }
      clearRecoveryMarker();
      capturedRef.current = undefined;
      stateRequestResolvedRef.current = false;
      setError(undefined);
      setRequestAvailable(false);
      setNotice(completedTimeline ? 'completed' : undefined);
      setPhase('idle');
      if (completedTimeline) {
        appendNotice('completed');
        logWellnessMetric(WELLNESS_METRIC.BREAK_ENDED);
        invokeHost(callbackRef.current.onWellnessBreakEnded, 'onWellnessBreakEnded');
      }
      return true;
    },
    [
      appendNotice,
      clearOfferTimer,
      clearRecoveryMarker,
      clearTimeline,
      invokeHost,
      reportError,
      requestAvailableState,
      setPhase,
      stopMedia,
    ]
  );

  const prepareAudio = useCallback((): Promise<HTMLAudioElement | undefined> => {
    if (audioRef.current) return Promise.resolve(audioRef.current);
    if (audioLoadPromiseRef.current) return audioLoadPromiseRef.current;

    const latest = latestRef.current;
    const mediaOperation = mediaOperationRef.current;
    const audioUrlPromise = latest.wellnessAudioUrl
      ? Promise.resolve(latest.wellnessAudioUrl)
      : import('./assets/WellnessBreakSound.mp3').then((asset) => asset.default);
    const audioLoadPromise = audioUrlPromise
      .then((audioUrl) => {
        if (mediaOperation !== mediaOperationRef.current) return undefined;
        const audio = new Audio(audioUrl);
        audio.preload = 'auto';
        audio.load();
        audioRef.current = audio;
        return audio;
      })
      .catch(() => {
        reportError('MEDIA_UNAVAILABLE', phaseRef.current, true, false);
        return undefined;
      });

    audioLoadPromiseRef.current = audioLoadPromise;
    void audioLoadPromise.then(() => {
      if (audioLoadPromiseRef.current === audioLoadPromise) audioLoadPromiseRef.current = undefined;
    });
    return audioLoadPromise;
  }, [reportError]);

  const loadAnimation = useCallback(async (): Promise<void> => {
    const latest = latestRef.current;
    const mediaOperation = mediaOperationRef.current;
    try {
      const animation = normalizeWellnessState(capturedRef.current?.theme || latest.theme).includes('dark')
        ? await import('./assets/WellnessBreakAnimationDark.json')
        : await import('./assets/WellnessBreakAnimationLight.json');
      if (mediaOperation === mediaOperationRef.current) setAnimationData(animation.default);
    } catch {
      reportError('MEDIA_UNAVAILABLE', phaseRef.current, true, false);
    }
  }, [reportError]);

  const startAudio = useCallback(async (): Promise<void> => {
    const mediaOperation = mediaOperationRef.current;
    const audio = await prepareAudio();
    if (!audio || mediaOperation !== mediaOperationRef.current || phaseRef.current !== 'playing') return;
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = 1;
    try {
      await audio.play();
    } catch {
      reportError('MEDIA_UNAVAILABLE', 'playing', true, false);
    }
  }, [prepareAudio, reportError]);

  const beginPlayback = useCallback(() => {
    clearTimeline();
    setPhase('playing');
    setElapsedSeconds(0);
    invokeHost(callbackRef.current.onWellnessBreakStarted, 'onWellnessBreakStarted');
    logWellnessMetric(WELLNESS_METRIC.BREAK_STARTED);
    void startAudio();
    timelineIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((value) => Math.min(value + 1, 60));
    }, 1000);
    timelineTimerRef.current = window.setTimeout(() => {
      if (timelineIntervalRef.current !== undefined) window.clearInterval(timelineIntervalRef.current);
      setPhase('ending');
      setCountdown(5);
      timelineIntervalRef.current = window.setInterval(() => {
        setCountdown((value) => (value && value > 1 ? value - 1 : 1));
      }, 1000);
      timelineTimerRef.current = window.setTimeout(() => {
        completionRef.current = true;
        void performRestore(true);
      }, WELLNESS_ENDING_MS);
    }, WELLNESS_PLAYING_MS);
  }, [clearTimeline, invokeHost, performRestore, setPhase, startAudio]);

  const beginStartingCountdown = useCallback(() => {
    if (phaseRef.current !== 'waiting-for-safe-state') return;
    clearTimeline();
    setPhase('starting');
    setCountdown(5);
    void loadAnimation();
    void prepareAudio();
    timelineIntervalRef.current = window.setInterval(() => {
      setCountdown((value) => (value && value > 1 ? value - 1 : 1));
    }, 1000);
    timelineTimerRef.current = window.setTimeout(beginPlayback, WELLNESS_STARTING_MS);
  }, [beginPlayback, clearTimeline, loadAnimation, prepareAudio, setPhase]);

  const requestBreak = useCallback(async () => {
    const latest = latestRef.current;
    const api = store.cc?.apiAIAssistant;
    if (!latest.enabled || !latest.agentId || !latest.agentSessionId || !latest.wellbeingBreakIdleCode) {
      reportError(
        !latest.enabled
          ? 'FEATURE_DISABLED'
          : !latest.agentSessionId || !latest.agentId
            ? 'SESSION_UNAVAILABLE'
            : 'SYSTEM_CODE_UNAVAILABLE',
        'idle',
        true
      );
      return;
    }
    if (!api?.requestWellnessBreak) {
      reportError('ACTION_REQUEST_FAILED', 'idle', true);
      return;
    }

    setNotice(undefined);
    setError(undefined);
    setRequestAvailable(false);
    appendUserAction('take-break');
    setPhase('request-pending');
    logWellnessMetric(WELLNESS_METRIC.CTA_USER_REQUEST);
    const operation = ++operationRef.current;
    const sessionId = latest.agentSessionId;
    try {
      await api.requestWellnessBreak();
    } catch {
      if (operation !== operationRef.current || latestRef.current.agentSessionId !== sessionId) return;
      setPhase('idle');
      reportError('ACTION_REQUEST_FAILED', 'request-pending', true);
    }
  }, [appendUserAction, reportError, setPhase]);

  const enterBreak = useCallback(
    async (event: WellnessBreakEvent, sendAccepted: boolean, responseSource: WellnessBreakResponseSource = 'card') => {
      const latest = latestRef.current;
      clearOfferTimer();
      setRequestAvailable(false);
      setNotice(undefined);
      setError(undefined);
      completionRef.current = false;
      stateRequestResolvedRef.current = false;
      acceptedEventRef.current = event;

      if (!latest.agentSessionId) {
        reportError('INVALID_EVENT', 'offer-pending', false);
        return;
      }
      if (!latest.wellbeingBreakIdleCode) {
        reportError('SYSTEM_CODE_UNAVAILABLE', 'offer-pending', true);
        return;
      }

      legacyRecoveryCountRef.current = 0;

      const operation = ++operationRef.current;
      const sessionId = latest.agentSessionId;
      const scheduledAfterWork = !areAllTasksSafeForWellness(latest.taskList);
      if (sendAccepted) {
        resolveActiveOffer();
        appendUserAction('take-break');
      }
      capturedRef.current = {
        theme: latest.theme,
        preBreakLegacyState: latest.legacyAgentState,
        preBreakLegacyAuxCodeId: latest.legacyAuxCodeId,
      };
      saveRecoveryMarker(
        createWellnessRecoveryMarker({
          agentSessionId: sessionId,
          preBreakLegacyState: latest.legacyAgentState,
          preBreakLegacyAuxCodeId: latest.legacyAuxCodeId,
        })
      );
      setPhase('changing-to-break', {event});

      const stateRequest = Promise.resolve()
        .then(() =>
          store.cc.setAgentState({
            state: 'Idle',
            auxCodeId: latest.wellbeingBreakIdleCode.id,
            agentId: latest.agentId,
            lastStateChangeReason: 'wellness-break',
          })
        )
        .then(
          () => true,
          () => false
        );
      pendingStateRequestRef.current = stateRequest;
      const stateChanged = await stateRequest;
      if (pendingStateRequestRef.current === stateRequest) pendingStateRequestRef.current = undefined;
      if (operation !== operationRef.current || latestRef.current.agentSessionId !== sessionId) return;
      if (!stateChanged) {
        if (operation !== operationRef.current || latestRef.current.agentSessionId !== sessionId) return;
        clearRecoveryMarker();
        capturedRef.current = undefined;
        reportError('STATE_CHANGE_FAILED', 'changing-to-break', true);
        return;
      }
      stateRequestResolvedRef.current = true;

      if (sendAccepted) {
        try {
          const api = store.cc.apiAIAssistant;
          if (!api?.respondToWellnessBreak) throw new Error('Wellness response API unavailable');
          await api.respondToWellnessBreak({
            action: WELLNESS_BREAK_USER_ACTIONS.ACCEPTED,
          });
          if (operation !== operationRef.current || latestRef.current.agentSessionId !== sessionId) return;
        } catch {
          if (operation !== operationRef.current || latestRef.current.agentSessionId !== sessionId) return;
          reportError('ACTION_REQUEST_FAILED', 'changing-to-break', true, false);
          void performRestore(false);
          return;
        }
      }

      invokeHostWithEvent(callbackRef.current.onWellnessBreakAccepted, event, 'onWellnessBreakAccepted');
      appendAcknowledgement(scheduledAfterWork);
      logWellnessMetric(
        sendAccepted
          ? responseSource === 'notification'
            ? WELLNESS_METRIC.NOTIFICATION_ACCEPTED
            : WELLNESS_METRIC.CARD_BREAK_ACCEPTED
          : WELLNESS_METRIC.CTA_APPROVED,
        scheduledAfterWork ? {scheduledAfterWork: true} : {}
      );
      setPhase('waiting-for-safe-state', {event});
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = undefined;
        const current = latestRef.current;
        const stateConfirmed =
          current.legacyAuxCodeId === current.wellbeingBreakIdleCode?.id &&
          normalizeWellnessState(current.legacyAgentState) === 'idle';
        if (
          phaseRef.current === 'waiting-for-safe-state' &&
          stateConfirmed &&
          areAllTasksSafeForWellness(current.taskList)
        ) {
          beginStartingCountdown();
        }
      }, WELLNESS_STATE_SETTLE_MS);
    },
    [
      beginStartingCountdown,
      appendAcknowledgement,
      appendUserAction,
      clearOfferTimer,
      clearRecoveryMarker,
      invokeHostWithEvent,
      performRestore,
      reportError,
      resolveActiveOffer,
      saveRecoveryMarker,
      setPhase,
    ]
  );

  const acceptOffer = useCallback(
    (responseSource: WellnessBreakResponseSource = 'card') => {
      const event = latestRef.current.wellnessBreakState.event;
      if (event && phaseRef.current === 'offer-pending') void enterBreak(event, true, responseSource);
    },
    [enterBreak]
  );

  const later = useCallback(
    async (responseSource: WellnessBreakResponseSource = 'card') => {
      const latest = latestRef.current;
      const event = latest.wellnessBreakState.event;
      if (!event || phaseRef.current !== 'offer-pending') return;
      const operation = ++operationRef.current;
      const sessionId = latest.agentSessionId;
      clearOfferTimer();
      setRequestAvailable(false);
      setPhase('idle');
      setNotice('declined');
      resolveActiveOffer();
      appendUserAction('later');
      appendNotice('declined');
      logWellnessMetric(
        responseSource === 'notification' ? WELLNESS_METRIC.NOTIFICATION_REJECTED : WELLNESS_METRIC.CARD_BREAK_REJECTED
      );
      try {
        const api = store.cc.apiAIAssistant;
        if (!api?.respondToWellnessBreak) throw new Error('Wellness response API unavailable');
        await api.respondToWellnessBreak({
          action: WELLNESS_BREAK_USER_ACTIONS.REJECTED,
        });
      } catch {
        if (operation !== operationRef.current || latestRef.current.agentSessionId !== sessionId) return;
        reportError('ACTION_REQUEST_FAILED', 'offer-pending', true, false);
      }
    },
    [appendNotice, appendUserAction, clearOfferTimer, reportError, resolveActiveOffer, setPhase]
  );

  const dismissNotification = useCallback(() => {
    if (phaseRef.current === 'offer-pending') {
      logWellnessMetric(WELLNESS_METRIC.NOTIFICATION_DISMISSED);
    }
  }, []);

  const handleMediaError = useCallback(() => {
    reportError('MEDIA_UNAVAILABLE', phaseRef.current, true, false);
  }, [reportError]);

  // The store can originate configuration errors while resolving the system
  // code, before the orchestrator has a user action from which to report them.
  useEffect(() => {
    const {errorCode, phase} = input.wellnessBreakState;
    if (phase !== 'error') {
      reportedErrorCodeRef.current = undefined;
      return;
    }
    if (errorCode && reportedErrorCodeRef.current !== errorCode) {
      reportError(errorCode, 'idle', true);
    }
  }, [input.wellnessBreakState, reportError]);

  // A notification sequence is the only source of offer/request decisions.
  useEffect(() => {
    const {wellnessEventSequence, wellnessBreakState} = input;
    if (!wellnessEventSequence || wellnessEventSequence === lastEventSequenceRef.current) return;
    lastEventSequenceRef.current = wellnessEventSequence;
    const event = wellnessBreakState.event;
    if (!event) return;

    clearOfferTimer();
    setNotice(undefined);
    setContentCleared(false);
    if (event.actionEvent === WELLNESS_BREAK_NOTIFICATION_ACTIONS.SUGGEST_WELLNESS_BREAK) {
      setRequestAvailable(true);
      if (!ACTIVE_PHASES.has(phaseRef.current)) setPhase('idle', {event});
      logWellnessMetric(WELLNESS_METRIC.DISPLAY_CTA);
    } else if (event.actionEvent === WELLNESS_BREAK_NOTIFICATION_ACTIONS.WELLNESS_BREAK_NOT_ALLOWED) {
      setRequestAvailable(false);
      if (phaseRef.current === 'request-pending') {
        setNotice('not-allowed');
        appendNotice('not-allowed', event.actionText);
        setPhase('idle', {event});
        logWellnessMetric(WELLNESS_METRIC.CTA_REJECTED);
      }
    } else if (event.actionEvent === WELLNESS_BREAK_NOTIFICATION_ACTIONS.PROVIDE_WELLNESS_BREAK) {
      setRequestAvailable(false);
      if (phaseRef.current === 'request-pending') {
        logWellnessMetric(WELLNESS_METRIC.PROVIDE_BREAK_EVENT_RECEIVED);
        void enterBreak(event, false);
      } else if (!ACTIVE_PHASES.has(phaseRef.current)) {
        appendOffer(event);
        setPhase('offer-pending', {event, responseDeadline: Date.now() + WELLNESS_OFFER_TIMEOUT_MS});
        invokeHostWithEvent(callbackRef.current.onWellnessBreakOffered, event, 'onWellnessBreakOffered');
        logWellnessMetric(WELLNESS_METRIC.PROVIDE_BREAK_EVENT_RECEIVED);
        logWellnessMetric(WELLNESS_METRIC.NOTIFICATION_FIRED);
        offerTimerRef.current = window.setTimeout(() => {
          const latest = latestRef.current;
          if (phaseRef.current !== 'offer-pending' || !latest.agentSessionId) {
            return;
          }
          setRequestAvailable(false);
          setPhase('idle');
          setNotice('no-response');
          resolveActiveOffer();
          appendNotice('no-response');
          logWellnessMetric(WELLNESS_METRIC.NO_RESPONSE);
          logWellnessMetric(WELLNESS_METRIC.NOTIFICATION_TIMEOUT);
          const api = store.cc.apiAIAssistant;
          if (!api?.respondToWellnessBreak) {
            reportError('ACTION_REQUEST_FAILED', 'offer-pending', true, false);
            return;
          }
          const operation = ++operationRef.current;
          const sessionId = latest.agentSessionId;
          void api
            .respondToWellnessBreak({
              action: WELLNESS_BREAK_USER_ACTIONS.NO_RESPONSE,
            })
            .catch(() => {
              if (operation !== operationRef.current || latestRef.current.agentSessionId !== sessionId) return;
              reportError('ACTION_REQUEST_FAILED', 'offer-pending', true, false);
            });
        }, WELLNESS_OFFER_TIMEOUT_MS);
      }
    }
  }, [
    appendNotice,
    appendOffer,
    clearOfferTimer,
    enterBreak,
    input.wellnessBreakState,
    input.wellnessEventSequence,
    invokeHostWithEvent,
    reportError,
    resolveActiveOffer,
    setPhase,
  ]);

  // Continuously re-evaluate tasks and confirmed state. A new blocker during
  // the countdown returns the lifecycle to the safe-state wait.
  useEffect(() => {
    const phase = input.wellnessBreakState.phase;
    if (phase !== 'waiting-for-safe-state' && phase !== 'starting') return;
    const stateConfirmed =
      input.legacyAuxCodeId === input.wellbeingBreakIdleCode?.id &&
      normalizeWellnessState(input.legacyAgentState) === 'idle';
    const safe = stateConfirmed && areAllTasksSafeForWellness(input.taskList);
    if (!safe && phase === 'starting') {
      clearTimeline();
      setPhase('waiting-for-safe-state', acceptedEventRef.current ? {event: acceptedEventRef.current} : {});
    } else if (safe && phase === 'waiting-for-safe-state' && stateRequestResolvedRef.current) {
      if (settleTimerRef.current === undefined) {
        settleTimerRef.current = window.setTimeout(() => {
          settleTimerRef.current = undefined;
          beginStartingCountdown();
        }, WELLNESS_STATE_SETTLE_MS);
      }
    }
  }, [
    beginStartingCountdown,
    clearTimeline,
    input.legacyAgentState,
    input.legacyAuxCodeId,
    input.taskList,
    input.wellbeingBreakIdleCode?.id,
    input.wellnessBreakState.phase,
    setPhase,
  ]);

  // Detect an externally-owned state transition (including RONA) before media
  // begins. Unchanged pre-break state is ignored while the state API settles.
  useEffect(() => {
    const phase = input.wellnessBreakState.phase;
    const captured = capturedRef.current;
    if (!captured || !PRE_PLAY_PHASES.has(phase) || !stateRequestResolvedRef.current) return;
    const incompatible =
      input.legacyAuxCodeId !== input.wellbeingBreakIdleCode?.id &&
      (input.legacyAuxCodeId !== captured.preBreakLegacyAuxCodeId ||
        input.legacyAgentState !== captured.preBreakLegacyState);
    if (incompatible) void performRestore(false);
  }, [
    input.legacyAgentState,
    input.legacyAuxCodeId,
    input.wellbeingBreakIdleCode?.id,
    input.wellnessBreakState.phase,
    performRestore,
  ]);

  // Session ownership is never derived from the wellness event.
  useEffect(() => {
    if (input.agentSessionId === previousSessionRef.current) return;
    const previousSessionId = previousSessionRef.current;
    previousSessionRef.current = input.agentSessionId;
    operationRef.current += 1;
    restoringRef.current = false;
    clearOfferTimer();
    clearTimeline();
    stopMedia();
    setRequestAvailable(false);
    setNotice(undefined);
    setError(undefined);
    resolveActiveOffer();
    capturedRef.current = undefined;
    legacyRecoveryCountRef.current = 0;
    if (previousSessionId) clearRecoveryMarker();
  }, [clearOfferTimer, clearRecoveryMarker, clearTimeline, input.agentSessionId, resolveActiveOffer, stopMedia]);

  // Feature revocation hides new controls only after state-owned work restores.
  useEffect(() => {
    if (!input.enabled && ACTIVE_PHASES.has(input.wellnessBreakState.phase)) {
      void performRestore(false);
    } else if (!input.enabled) {
      clearOfferTimer();
      if (phaseRef.current === 'offer-pending' || phaseRef.current === 'request-pending') setPhase('idle');
      setRequestAvailable(false);
      setNotice(undefined);
    }
  }, [clearOfferTimer, input.enabled, input.wellnessBreakState.phase, performRestore, setPhase]);

  // Refresh recovery never replays notification actions or media.
  useEffect(() => {
    // A marker created by this mounted lifecycle is not a refresh-recovery
    // candidate. Wait for its confirmed state/restoration path to own it.
    if (capturedRef.current) return;
    if (!input.isLoggedIn || !input.agentSessionId || !input.wellbeingBreakIdleCode) return;
    let serialized: string | null = null;
    try {
      serialized = window.sessionStorage.getItem(WELLNESS_RECOVERY_KEY);
    } catch {
      return;
    }
    const marker = parseWellnessRecoveryMarker(serialized);
    const decision = getWellnessRecoveryDecision({
      marker,
      agentSessionId: input.agentSessionId,
      wellnessAuxCodeId: input.wellbeingBreakIdleCode.id,
      legacyStateKnown: Boolean(input.legacyAgentState || input.legacyAuxCodeId),
      legacyAuxCodeId: input.legacyAuxCodeId,
    });
    if (decision === 'discard' || decision === 'clear') {
      clearRecoveryMarker();
    } else if (decision === 'restore' && marker && !capturedRef.current) {
      capturedRef.current = {
        theme: input.theme,
        preBreakLegacyState: marker.preBreakLegacyState,
        preBreakLegacyAuxCodeId: marker.preBreakLegacyAuxCodeId,
      };
      void performRestore(false);
    }
  }, [
    clearRecoveryMarker,
    input.agentSessionId,
    input.isLoggedIn,
    input.legacyAgentState,
    input.legacyAuxCodeId,
    input.wellbeingBreakIdleCode,
    performRestore,
  ]);

  // After a completed break, keep trying Available. For an early exit,
  // continue only while this host still owns the wellness state.
  useEffect(() => {
    if (input.wellnessBreakState.phase !== 'error' || error?.code !== 'RESTORE_FAILED' || !capturedRef.current) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      if (legacyRecoveryCountRef.current >= LEGACY_RECOVERY_ATTEMPTS) {
        window.clearInterval(timer);
        return;
      }
      const latest = latestRef.current;
      if (!completionRef.current && latest.legacyAuxCodeId !== latest.wellbeingBreakIdleCode?.id) {
        clearRecoveryMarker();
        window.clearInterval(timer);
        return;
      }
      legacyRecoveryCountRef.current += 1;
      void performRestore(completionRef.current, 1);
    }, LEGACY_RECOVERY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [clearRecoveryMarker, error?.code, input.wellnessBreakState.phase, performRestore]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) return undefined;
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener?.('change', update);
    return () => mediaQuery.removeEventListener?.('change', update);
  }, []);

  useEffect(
    () => () => {
      const restoring = restoringRef.current;
      if (!restoring) operationRef.current += 1;
      clearOfferTimer();
      clearTimeline();
      stopMedia();
      const latest = latestRef.current;
      const captured = capturedRef.current;
      if (!captured && (phaseRef.current === 'offer-pending' || phaseRef.current === 'request-pending')) {
        store.setWellnessBreakState({phase: 'idle'});
      }
      if (!restoring && captured && latest.agentSessionId) {
        const operation = operationRef.current;
        const pendingStateRequest = pendingStateRequestRef.current;
        void (async () => {
          const ownStateRequestSucceeded = pendingStateRequest
            ? await pendingStateRequest
            : stateRequestResolvedRef.current;
          if (pendingStateRequest && !ownStateRequestSucceeded) {
            clearRecoveryMarker();
            return;
          }
          const result = await requestAvailableState(
            captured,
            latest.agentSessionId,
            latest.agentId,
            latest.wellbeingBreakIdleCode?.id,
            ownStateRequestSucceeded,
            false,
            operation,
            RESTORE_ATTEMPTS
          );
          if (result === 'restored' || result === 'not-owned') {
            clearRecoveryMarker();
          } else if (result === 'failed') {
            if ('wellnessAgentSessionId' in store && store.wellnessAgentSessionId !== latest.agentSessionId) return;
            store.logger?.error('CC-Widgets: Agent Wellness Break unmount restore failed', {
              module: MODULE,
              method: 'restoreOnUnmount',
            });
            store.setWellnessBreakState({phase: 'error', errorCode: 'RESTORE_FAILED'});
          }
        })();
      }
    },
    [clearOfferTimer, clearRecoveryMarker, clearTimeline, requestAvailableState, stopMedia]
  );

  const uiEnabled = Boolean(
    input.enabled && input.isLoggedIn && input.agentId && input.agentSessionId && input.wellbeingBreakIdleCode
  );
  const hasVisibleStoreError = Boolean(
    input.enabled && input.isLoggedIn && input.agentSessionId && input.wellnessBreakState.phase === 'error'
  );

  return useMemo(
    () => ({
      enabled: uiEnabled || hasVisibleStoreError || ACTIVE_PHASES.has(input.wellnessBreakState.phase),
      phase: input.wellnessBreakState.phase,
      event: input.wellnessBreakState.event,
      error,
      notice,
      requestAvailable: uiEnabled && requestAvailable,
      history,
      contentCleared,
      hasBlockingTasks: !areAllTasksSafeForWellness(input.taskList),
      countdown,
      elapsedSeconds,
      animationData,
      reducedMotion,
      onRequest: requestBreak,
      onAccept: acceptOffer,
      onLater: later,
      onClearHistory: clearHistory,
      onDismissNotification: dismissNotification,
      onMediaError: handleMediaError,
    }),
    [
      acceptOffer,
      animationData,
      countdown,
      clearHistory,
      contentCleared,
      dismissNotification,
      elapsedSeconds,
      error,
      handleMediaError,
      hasVisibleStoreError,
      input.wellnessBreakState.event,
      input.wellnessBreakState.phase,
      input.taskList,
      history,
      later,
      notice,
      reducedMotion,
      requestAvailable,
      requestBreak,
      uiEnabled,
    ]
  );
};
