import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import store from '@webex/cc-store';
import type {
  WellnessBreakError,
  WellnessBreakErrorCode,
  WellnessBreakEvent,
  WellnessBreakPhase,
  WellnessBreakRecoveryMarkerV1,
  WellnessStateModel,
} from '@webex/cc-store';
import type {WellnessBreakNotice, WellnessBreakResponseSource, WellnessBreakViewModel} from '@webex/cc-components';
import type {UseWellnessBreakInput} from '../ai-assistant.types';
import {
  areAllTasksSafeForWellness,
  areWellnessChannelsConfirmed,
  buildWellnessRestoreGroups,
  cloneWellnessChannelStates,
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
const REFERENCE_CHANNELS = ['telephony', 'chat', 'email', 'social'];
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
  stateModel: WellnessStateModel;
  theme: string;
  channelTypes: string[];
  preBreakChannelStates: WellnessBreakRecoveryMarkerV1['preBreakChannelStates'];
  preBreakLegacyState?: string;
  preBreakLegacyAuxCodeId?: string;
};

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

export const useWellnessBreak = (input: UseWellnessBreakInput): WellnessBreakViewModel => {
  const [requestAvailable, setRequestAvailable] = useState(false);
  const [notice, setNotice] = useState<WellnessBreakNotice | undefined>();
  const [error, setError] = useState<WellnessBreakError | undefined>();
  const [countdown, setCountdown] = useState<number | undefined>();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [animationData, setAnimationData] = useState<unknown>();
  const [reducedMotion, setReducedMotion] = useState(false);

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
  const ascReconnectAttemptedRef = useRef(false);
  const priorRtdGenerationRef = useRef(input.rtdStatus.generation);
  const reportedErrorCodeRef = useRef<WellnessBreakErrorCode>();

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

  const performRestore = useCallback(
    async (completedTimeline: boolean, attempts = RESTORE_ATTEMPTS): Promise<boolean> => {
      if (restoringRef.current) return false;
      restoringRef.current = true;
      const restoreSourcePhase = phaseRef.current;
      clearOfferTimer();
      clearTimeline();
      stopMedia();
      setPhase('restoring');
      const operation = ++operationRef.current;

      let lastFailure = false;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const latest = latestRef.current;
        if (!latest.agentSessionId || operation !== operationRef.current) {
          restoringRef.current = false;
          return false;
        }
        try {
          const captured = capturedRef.current;
          if (captured?.stateModel === 'agent-state-control') {
            const validIdleCodeIds = latest.idleCodes.filter((code) => !code.isSystem).map((code) => code.id);
            const defaultIdleCodeId = latest.idleCodes.find((code) => code.isDefault && !code.isSystem)?.id;
            const groups = buildWellnessRestoreGroups({
              channelTypes: captured.channelTypes.length ? captured.channelTypes : REFERENCE_CHANNELS,
              currentChannelStates: latest.agentChannelStateDetails,
              preBreakChannelStates: captured.preBreakChannelStates || {},
              wellnessAuxCodeId: latest.wellbeingBreakIdleCode?.id,
              validIdleCodeIds,
              defaultIdleCodeId,
              includeUnconfirmedChannels: restoreSourcePhase === 'changing-to-break',
            });
            let groupFailure = false;
            for (const group of groups) {
              try {
                await store.cc.setAgentChannelState({
                  channelTypes: group.channelTypes,
                  state: group.state,
                  ...(group.auxCodeId ? {auxCodeId: group.auxCodeId} : {}),
                  agentId: latest.agentId,
                  reason: 'Agent Wellness Break restoration',
                });
              } catch {
                groupFailure = true;
              }
            }
            if (groupFailure) throw new Error('One or more channel restore groups failed');
          } else if (
            latest.legacyAuxCodeId === latest.wellbeingBreakIdleCode?.id ||
            normalizeWellnessState(latest.legacyAgentState) === 'wellbeingbreak' ||
            (restoreSourcePhase === 'changing-to-break' && stateRequestResolvedRef.current)
          ) {
            await store.cc.setAgentState({state: 'Available', auxCodeId: '0', agentId: latest.agentId});
          }

          if (attempt > 1) {
            logWellnessMetric(WELLNESS_METRIC.RESTORE_STATE_RETRY_ATTEMPT, {attempt, success: true});
          }
          clearRecoveryMarker();
          capturedRef.current = undefined;
          stateRequestResolvedRef.current = false;
          restoringRef.current = false;
          setError(undefined);
          setRequestAvailable(false);
          setNotice(completedTimeline ? 'completed' : undefined);
          setPhase('idle');
          if (completedTimeline) {
            logWellnessMetric(WELLNESS_METRIC.BREAK_ENDED);
            invokeHost(callbackRef.current.onWellnessBreakEnded, 'onWellnessBreakEnded');
          }
          return true;
        } catch {
          lastFailure = true;
          store.logger?.warn(`CC-Widgets: Agent Wellness Break restore attempt ${attempt} failed`, {
            module: MODULE,
            method: 'performRestore',
          });
          logWellnessMetric(WELLNESS_METRIC.RESTORE_STATE_RETRY_ATTEMPT, {attempt, success: false});
          if (attempt < attempts) await wait(WELLNESS_RESTORE_RETRY_MS);
        }
      }

      restoringRef.current = false;
      if (lastFailure) reportError('RESTORE_FAILED', 'restoring', true);
      return false;
    },
    [clearOfferTimer, clearRecoveryMarker, clearTimeline, invokeHost, reportError, setPhase, stopMedia]
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
    setPhase('request-pending');
    logWellnessMetric(WELLNESS_METRIC.CTA_USER_REQUEST);
    try {
      await api.requestWellnessBreak({agentId: latest.agentId, agentSessionId: latest.agentSessionId});
    } catch {
      setPhase('idle');
      reportError('ACTION_REQUEST_FAILED', 'request-pending', true);
    }
  }, [reportError, setPhase]);

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

      if (!latest.agentSessionId || event.agentSessionId !== latest.agentSessionId) {
        reportError('INVALID_EVENT', 'offer-pending', false);
        return;
      }
      if (!latest.wellbeingBreakIdleCode) {
        reportError('SYSTEM_CODE_UNAVAILABLE', 'offer-pending', true);
        return;
      }

      const stateModel: WellnessStateModel = latest.isAgentStateControlEnabled ? 'agent-state-control' : 'legacy';
      if (stateModel === 'agent-state-control' && latest.agentChannelTypes.length === 0) {
        reportError('STATE_CHANGE_FAILED', 'changing-to-break', true);
        return;
      }

      const channelTypes = [...new Set(latest.agentChannelTypes)];
      const preBreakChannelStates = cloneWellnessChannelStates(channelTypes, latest.agentChannelStateDetails);
      const scheduledAfterWork = !areAllTasksSafeForWellness(latest.taskList);
      capturedRef.current = {
        stateModel,
        theme: latest.theme,
        channelTypes,
        preBreakChannelStates,
        preBreakLegacyState: latest.legacyAgentState,
        preBreakLegacyAuxCodeId: latest.legacyAuxCodeId,
      };
      saveRecoveryMarker(
        createWellnessRecoveryMarker({
          agentSessionId: latest.agentSessionId,
          stateModel,
          channelTypes,
          preBreakChannelStates,
        })
      );
      setPhase('changing-to-break', {event});

      try {
        if (stateModel === 'agent-state-control') {
          await store.cc.setAgentChannelState({
            channelTypes,
            state: 'Idle',
            auxCodeId: latest.wellbeingBreakIdleCode.id,
            reason: 'Agent Wellness Break',
            agentId: latest.agentId,
          });
        } else {
          await store.cc.setAgentState({
            state: 'Idle',
            auxCodeId: latest.wellbeingBreakIdleCode.id,
            agentId: latest.agentId,
            lastStateChangeReason: 'WellbeingBreak',
          });
        }
        stateRequestResolvedRef.current = true;
      } catch {
        clearRecoveryMarker();
        capturedRef.current = undefined;
        reportError('STATE_CHANGE_FAILED', 'changing-to-break', true);
        return;
      }

      if (sendAccepted) {
        try {
          const api = store.cc.apiAIAssistant;
          if (!api?.respondToWellnessBreak) throw new Error('Wellness response API unavailable');
          await api.respondToWellnessBreak({
            agentId: latest.agentId,
            agentSessionId: latest.agentSessionId,
            action: 'ACCEPTED',
          });
        } catch {
          reportError('ACTION_REQUEST_FAILED', 'changing-to-break', true, false);
          void performRestore(false);
          return;
        }
      }

      invokeHostWithEvent(callbackRef.current.onWellnessBreakAccepted, event, 'onWellnessBreakAccepted');
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
        const stateConfirmed = current.isAgentStateControlEnabled
          ? areWellnessChannelsConfirmed(
              current.agentChannelTypes,
              current.agentChannelStateDetails,
              current.wellbeingBreakIdleCode?.id
            )
          : current.legacyAuxCodeId === current.wellbeingBreakIdleCode?.id &&
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
      clearOfferTimer,
      clearRecoveryMarker,
      invokeHostWithEvent,
      performRestore,
      reportError,
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
      clearOfferTimer();
      setRequestAvailable(false);
      setPhase('idle');
      setNotice('declined');
      logWellnessMetric(
        responseSource === 'notification' ? WELLNESS_METRIC.NOTIFICATION_REJECTED : WELLNESS_METRIC.CARD_BREAK_REJECTED
      );
      try {
        const api = store.cc.apiAIAssistant;
        if (!api?.respondToWellnessBreak) throw new Error('Wellness response API unavailable');
        await api.respondToWellnessBreak({
          agentId: latest.agentId,
          agentSessionId: latest.agentSessionId,
          action: 'REJECTED',
        });
      } catch {
        reportError('ACTION_REQUEST_FAILED', 'offer-pending', true, false);
      }
    },
    [clearOfferTimer, reportError, setPhase]
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
    if (event.actionEvent === 'SUGGEST_WELLNESS_BREAK') {
      setRequestAvailable(true);
      if (!ACTIVE_PHASES.has(phaseRef.current)) setPhase('idle', {event});
      logWellnessMetric(WELLNESS_METRIC.DISPLAY_CTA);
    } else if (event.actionEvent === 'WELLNESS_BREAK_NOT_ALLOWED') {
      setRequestAvailable(false);
      if (phaseRef.current === 'request-pending') {
        setNotice('not-allowed');
        setPhase('idle', {event});
        logWellnessMetric(WELLNESS_METRIC.CTA_REJECTED);
      }
    } else if (event.actionEvent === 'PROVIDE_WELLNESS_BREAK') {
      setRequestAvailable(false);
      if (phaseRef.current === 'request-pending') {
        logWellnessMetric(WELLNESS_METRIC.PROVIDE_BREAK_EVENT_RECEIVED);
        void enterBreak(event, false);
      } else if (!ACTIVE_PHASES.has(phaseRef.current)) {
        setPhase('offer-pending', {event, responseDeadline: Date.now() + WELLNESS_OFFER_TIMEOUT_MS});
        invokeHostWithEvent(callbackRef.current.onWellnessBreakOffered, event, 'onWellnessBreakOffered');
        logWellnessMetric(WELLNESS_METRIC.PROVIDE_BREAK_EVENT_RECEIVED);
        logWellnessMetric(WELLNESS_METRIC.NOTIFICATION_FIRED);
        offerTimerRef.current = window.setTimeout(() => {
          const latest = latestRef.current;
          if (
            phaseRef.current !== 'offer-pending' ||
            event.agentSessionId !== latest.agentSessionId ||
            !latest.agentSessionId
          ) {
            return;
          }
          setRequestAvailable(false);
          setPhase('idle');
          setNotice('no-response');
          logWellnessMetric(WELLNESS_METRIC.NO_RESPONSE);
          logWellnessMetric(WELLNESS_METRIC.NOTIFICATION_TIMEOUT);
          const api = store.cc.apiAIAssistant;
          if (!api?.respondToWellnessBreak) {
            reportError('ACTION_REQUEST_FAILED', 'offer-pending', true, false);
            return;
          }
          void api
            .respondToWellnessBreak({
              agentId: latest.agentId,
              agentSessionId: latest.agentSessionId,
              action: 'NO_RESPONSE',
            })
            .catch(() => reportError('ACTION_REQUEST_FAILED', 'offer-pending', true, false));
        }, WELLNESS_OFFER_TIMEOUT_MS);
      }
    }
  }, [
    clearOfferTimer,
    enterBreak,
    input.wellnessBreakState,
    input.wellnessEventSequence,
    invokeHostWithEvent,
    reportError,
    setPhase,
  ]);

  // Continuously re-evaluate tasks and confirmed state. A new blocker during
  // the countdown returns the lifecycle to the safe-state wait.
  useEffect(() => {
    const phase = input.wellnessBreakState.phase;
    if (phase !== 'waiting-for-safe-state' && phase !== 'starting') return;
    const stateConfirmed = input.isAgentStateControlEnabled
      ? areWellnessChannelsConfirmed(
          input.agentChannelTypes,
          input.agentChannelStateDetails,
          input.wellbeingBreakIdleCode?.id
        )
      : input.legacyAuxCodeId === input.wellbeingBreakIdleCode?.id &&
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
    input.agentChannelStateDetails,
    input.agentChannelTypes,
    input.isAgentStateControlEnabled,
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
    let incompatible = false;
    if (captured.stateModel === 'agent-state-control') {
      incompatible = captured.channelTypes.some((channelType) => {
        const current = input.agentChannelStateDetails[channelType];
        const previous = captured.preBreakChannelStates?.[channelType];
        return Boolean(
          current &&
            current.pendingIdle !== true &&
            current.auxCodeId !== input.wellbeingBreakIdleCode?.id &&
            (current.auxCodeId !== previous?.auxCodeId || current.agentState !== previous?.agentState)
        );
      });
    } else {
      incompatible =
        input.legacyAuxCodeId !== input.wellbeingBreakIdleCode?.id &&
        (input.legacyAuxCodeId !== captured.preBreakLegacyAuxCodeId ||
          input.legacyAgentState !== captured.preBreakLegacyState);
    }
    if (incompatible) void performRestore(false);
  }, [
    input.agentChannelStateDetails,
    input.legacyAuxCodeId,
    input.wellbeingBreakIdleCode?.id,
    input.wellnessBreakState.phase,
    performRestore,
  ]);

  // RTD disconnect invalidates notification-owned state only. The store also
  // applies this rule, while this effect owns the response timer.
  useEffect(() => {
    if (input.rtdStatus.state === 'disconnected') {
      clearOfferTimer();
      if (phaseRef.current === 'offer-pending' || phaseRef.current === 'request-pending') {
        setRequestAvailable(false);
        setPhase('idle');
      }
    }
    if (input.rtdStatus.generation > priorRtdGenerationRef.current) {
      priorRtdGenerationRef.current = input.rtdStatus.generation;
      if (
        phaseRef.current === 'error' &&
        error?.code === 'RESTORE_FAILED' &&
        capturedRef.current?.stateModel === 'agent-state-control' &&
        !ascReconnectAttemptedRef.current
      ) {
        ascReconnectAttemptedRef.current = true;
        void performRestore(completionRef.current, 1).then((success) =>
          logWellnessMetric(WELLNESS_METRIC.RESTORE_STATE_RECONNECT_ATTEMPT, {success})
        );
      }
    }
  }, [clearOfferTimer, error?.code, input.rtdStatus, performRestore, setPhase]);

  useEffect(() => {
    if (
      input.agentChannelReloginSequence > 0 &&
      input.wellnessBreakState.phase === 'error' &&
      error?.code === 'RESTORE_FAILED' &&
      capturedRef.current?.stateModel === 'agent-state-control' &&
      !ascReconnectAttemptedRef.current
    ) {
      ascReconnectAttemptedRef.current = true;
      void performRestore(completionRef.current, 1).then((success) =>
        logWellnessMetric(WELLNESS_METRIC.RESTORE_STATE_RECONNECT_ATTEMPT, {success})
      );
    }
  }, [error?.code, input.agentChannelReloginSequence, input.wellnessBreakState.phase, performRestore]);

  // Session ownership is never derived from the wellness event.
  useEffect(() => {
    if (input.agentSessionId === previousSessionRef.current) return;
    previousSessionRef.current = input.agentSessionId;
    operationRef.current += 1;
    restoringRef.current = false;
    clearOfferTimer();
    clearTimeline();
    stopMedia();
    setRequestAvailable(false);
    setNotice(undefined);
    setError(undefined);
    capturedRef.current = undefined;
    clearRecoveryMarker();
  }, [clearOfferTimer, clearRecoveryMarker, clearTimeline, input.agentSessionId, stopMedia]);

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
      ascSnapshotKnown: Object.keys(input.agentChannelStateDetails).length > 0,
      currentChannelStates: input.agentChannelStateDetails,
    });
    if (decision === 'discard' || decision === 'clear') {
      clearRecoveryMarker();
    } else if (decision === 'restore' && marker && !capturedRef.current) {
      capturedRef.current = {
        stateModel: marker.stateModel,
        theme: input.theme,
        channelTypes: marker.channelTypes || [],
        preBreakChannelStates: marker.preBreakChannelStates || {},
      };
      void performRestore(false);
    }
  }, [
    clearRecoveryMarker,
    input.agentChannelStateDetails,
    input.agentSessionId,
    input.isLoggedIn,
    input.legacyAgentState,
    input.legacyAuxCodeId,
    input.wellbeingBreakIdleCode,
    performRestore,
  ]);

  // Legacy exhaustion recovery continues in the background while this host
  // still owns the wellness state, bounded to five additional attempts.
  useEffect(() => {
    if (
      input.wellnessBreakState.phase !== 'error' ||
      error?.code !== 'RESTORE_FAILED' ||
      capturedRef.current?.stateModel !== 'legacy'
    ) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      if (legacyRecoveryCountRef.current >= LEGACY_RECOVERY_ATTEMPTS) {
        window.clearInterval(timer);
        return;
      }
      const latest = latestRef.current;
      if (latest.legacyAuxCodeId !== latest.wellbeingBreakIdleCode?.id) {
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
      operationRef.current += 1;
      clearOfferTimer();
      clearTimeline();
      stopMedia();
      const latest = latestRef.current;
      const captured = capturedRef.current;
      if (phaseRef.current === 'offer-pending' || phaseRef.current === 'request-pending') {
        store.setWellnessBreakState({phase: 'idle'});
      }
      if (captured && latest.agentSessionId && ACTIVE_PHASES.has(phaseRef.current)) {
        if (captured.stateModel === 'legacy') {
          void store.cc.setAgentState({state: 'Available', auxCodeId: '0', agentId: latest.agentId}).catch(() => {});
        } else {
          const groups = buildWellnessRestoreGroups({
            channelTypes: captured.channelTypes,
            currentChannelStates: latest.agentChannelStateDetails,
            preBreakChannelStates: captured.preBreakChannelStates || {},
            wellnessAuxCodeId: latest.wellbeingBreakIdleCode?.id,
            validIdleCodeIds: latest.idleCodes.filter((code) => !code.isSystem).map((code) => code.id),
            defaultIdleCodeId: latest.idleCodes.find((code) => code.isDefault && !code.isSystem)?.id,
          });
          void groups.reduce(
            (sequence, group) =>
              sequence.then(() =>
                store.cc
                  .setAgentChannelState({
                    channelTypes: group.channelTypes,
                    state: group.state,
                    ...(group.auxCodeId ? {auxCodeId: group.auxCodeId} : {}),
                    agentId: latest.agentId,
                    reason: 'Agent Wellness Break unmount restoration',
                  })
                  .then(() => undefined)
              ),
            Promise.resolve()
          );
        }
      }
    },
    [clearOfferTimer, clearTimeline, stopMedia]
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
      hasBlockingTasks: !areAllTasksSafeForWellness(input.taskList),
      countdown,
      elapsedSeconds,
      animationData,
      reducedMotion,
      onRequest: requestBreak,
      onAccept: acceptOffer,
      onLater: later,
      onDismissNotification: dismissNotification,
      onMediaError: handleMediaError,
    }),
    [
      acceptOffer,
      animationData,
      countdown,
      dismissNotification,
      elapsedSeconds,
      error,
      handleMediaError,
      hasVisibleStoreError,
      input.wellnessBreakState.event,
      input.wellnessBreakState.phase,
      input.taskList,
      later,
      notice,
      reducedMotion,
      requestAvailable,
      requestBreak,
      uiEnabled,
    ]
  );
};
