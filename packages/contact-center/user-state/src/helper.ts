import {useState, useEffect, useRef} from 'react';
import store from '@webex/cc-store';
import {VOICE_CONNECTION_EVENTS} from '@webex/cc-store';
import type {VoiceConnectionState, IContactCenter} from '@webex/cc-store';
import {VOICE_CONNECTION_STATUS, VoiceLineStatus, VoiceMobiusSocketStatus} from '@webex/cc-store';
import {UseUserStateProps} from './user-state.types';

const VOICE_CONNECTION_LOSS_TIMEOUT_MS = 2000;

const DEFAULT_VOICE_CONNECTION_STATE: VoiceConnectionState = {
  status: VOICE_CONNECTION_STATUS?.NOT_REQUIRED ?? ('not-required' as VoiceConnectionState['status']),
  lineStatus: VoiceLineStatus?.UNKNOWN ?? ('unknown' as VoiceConnectionState['lineStatus']),
  mobiusSocketStatus:
    VoiceMobiusSocketStatus?.NOT_IN_USE ?? ('not-in-use' as VoiceConnectionState['mobiusSocketStatus']),
};

const getVoiceConnectionSnapshot = (cc?: IContactCenter): VoiceConnectionState => {
  if (cc && typeof cc.getVoiceConnectionState === 'function') {
    try {
      return cc.getVoiceConnectionState();
    } catch {
      // Return safe default if snapshot read throws.
    }
  }
  return DEFAULT_VOICE_CONNECTION_STATE;
};

export const useUserState = ({
  idleCodes,
  agentId,
  cc,
  currentState,
  customState,
  lastStateChangeTimestamp,
  logger,
  onStateChange,
  onVoiceReconnect,
  lastIdleCodeChangeTimestamp,
  isCurrentStateExternallyManaged = false,
  wellnessIdleCodeLookupPending = false,
  isBrowserVoiceSession = false,
  isAgentLoggedIn = false,
}: UseUserStateProps) => {
  const [isSettingAgentStatus, setIsSettingAgentStatus] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastIdleStateChangeElapsedTime, setLastIdleStateChangeElapsedTime] = useState(0);
  const [voiceConnectionState, setVoiceConnectionState] = useState<VoiceConnectionState>(() =>
    getVoiceConnectionSnapshot(cc)
  );
  const [stateChangeError, setStateChangeError] = useState<string>();
  const [voiceConnectionLossDialogOpen, setVoiceConnectionLossDialogOpen] = useState(false);
  const [voiceReconnectError, setVoiceReconnectError] = useState<string>();
  const workerRef = useRef<Worker | null>(null);

  const prevStateRef = useRef(currentState);
  const externallyManagedStateRef = useRef(isCurrentStateExternallyManaged);
  const pendingUserSelectionRef = useRef<string>();
  const pendingVoiceLossDialogRef = useRef<boolean>(false);
  const previousVoiceStatusRef = useRef(voiceConnectionState.status);
  const currentStateRef = useRef(currentState);
  currentStateRef.current = currentState;
  const voiceConnectionStateRef = useRef(voiceConnectionState);
  voiceConnectionStateRef.current = voiceConnectionState;
  const isAgentLoggedInRef = useRef(isAgentLoggedIn);
  isAgentLoggedInRef.current = isAgentLoggedIn;
  const isBrowserVoiceSessionRef = useRef(isBrowserVoiceSession);
  isBrowserVoiceSessionRef.current = isBrowserVoiceSession;

  useEffect(() => {
    if (!cc || typeof cc.on !== 'function') {
      return;
    }
    const updateVoiceConnectionState = (nextState?: VoiceConnectionState) => {
      if (!nextState) return;
      setVoiceConnectionState((currentState) => {
        const isUnchanged =
          currentState.status === nextState.status &&
          currentState.lineStatus === nextState.lineStatus &&
          currentState.mobiusSocketStatus === nextState.mobiusSocketStatus &&
          currentState.reason === nextState.reason &&
          currentState.retryable === nextState.retryable;
        return isUnchanged ? currentState : nextState;
      });
    };
    const handleVoiceConnectionStateChange = (state: VoiceConnectionState) => updateVoiceConnectionState(state);
    cc.on(VOICE_CONNECTION_EVENTS.STATE_CHANGE, handleVoiceConnectionStateChange);
    // Subscribe before reading the snapshot so a transition during mount cannot be missed.
    updateVoiceConnectionState(getVoiceConnectionSnapshot(cc));
    return () => {
      if (typeof cc.off === 'function') {
        cc.off(VOICE_CONNECTION_EVENTS.STATE_CHANGE, handleVoiceConnectionStateChange);
      }
    };
  }, [cc]);

  useEffect(() => {
    const previousStatus = previousVoiceStatusRef.current;
    previousVoiceStatusRef.current = voiceConnectionState.status;

    if (
      voiceConnectionState.status !== VOICE_CONNECTION_STATUS.UNAVAILABLE ||
      !isAgentLoggedIn ||
      !isBrowserVoiceSession
    ) {
      pendingVoiceLossDialogRef.current = false;
      setVoiceConnectionLossDialogOpen(false);
      setVoiceReconnectError(undefined);
    }

    if (
      !isAgentLoggedIn ||
      !isBrowserVoiceSession ||
      previousStatus !== VOICE_CONNECTION_STATUS.READY ||
      voiceConnectionState.status !== VOICE_CONNECTION_STATUS.UNAVAILABLE
    ) {
      return;
    }

    setVoiceReconnectError(undefined);
    const timeoutId = setTimeout(() => {
      try {
        const latestVoiceStatus = getVoiceConnectionSnapshot(cc).status;
        if (latestVoiceStatus !== VOICE_CONNECTION_STATUS.UNAVAILABLE || !isAgentLoggedIn || !isBrowserVoiceSession) {
          return;
        }

        const defaultIdleCode = idleCodes.find((idleCode) => idleCode.isDefault);
        if (defaultIdleCode && currentStateRef.current !== defaultIdleCode.id) {
          pendingVoiceLossDialogRef.current = true;
          setAgentStatus(defaultIdleCode.id);
        } else {
          setVoiceConnectionLossDialogOpen(true);
        }
      } catch (error) {
        logger.error('CC-Widgets: UserState failed to handle browser voice loss', {
          module: 'useUserState',
          method: 'voiceConnectionLossTimeout',
          error,
        });
      }
    }, VOICE_CONNECTION_LOSS_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [voiceConnectionState.status, isAgentLoggedIn, isBrowserVoiceSession, cc, idleCodes]);

  const handleVoiceReconnect = async () => {
    setVoiceReconnectError(undefined);
    try {
      if (!onVoiceReconnect) {
        setVoiceReconnectError('Reconnect is not configured by the host application.');
        return;
      }
      await onVoiceReconnect();
    } catch (error) {
      setVoiceReconnectError('Unable to reconnect browser calling. Please try again.');
      logger.error('CC-Widgets: UserState reconnect request failed', {
        module: 'useUserState',
        method: 'handleVoiceReconnect',
        error,
      });
    }
  };

  const dismissVoiceConnectionLossDialog = () => setVoiceConnectionLossDialogOpen(false);

  const callOnStateChange = () => {
    try {
      logger.info('CC-Widgets: useUserState callOnStateChange(): invoking onStateChange', {
        module: 'useUserState',
        method: 'callOnStateChange',
      });
      if (onStateChange) {
        if (customState && 'developerName' in customState && customState?.developerName) {
          onStateChange(customState);
          return;
        }
        for (const code of idleCodes) {
          if (code.id === currentState) {
            onStateChange(code);
            break;
          }
        }
      }
    } catch (error) {
      logger?.error(`CC-Widgets: UserState: Error in callOnStateChange - ${error.message}`, {
        module: 'useUserState',
        method: 'callOnStateChange',
      });
    }
  };

  // Initialize the Web Worker using a Blob
  const workerScript = `
    let intervalId;
    let intervalId2;
    const startTimer = (startTime) => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        self.postMessage({type: 'elapsedTime', elapsedTime});
      }, 1000);
    };
    const startIdleCodeTimer = (startTime) => {
      if (intervalId2) clearInterval(intervalId2);
      intervalId2 = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        self.postMessage({type: 'lastIdleStateChangeElapsedTime', elapsedTime});
      }, 1000);
    };
    const stopTimer = () => {
      if (intervalId) clearInterval(intervalId);
      self.postMessage({type: 'stop'});
    };
    const stopIdleCodeTimer = () => {
      if (intervalId2) clearInterval(intervalId2);
      self.postMessage({type: 'stopIdleCodeTimer'});
    };
    self.onmessage = (event) => {
      if (event.data.type === 'start') {
        const startTime = event.data.startTime;
        startTimer(startTime);
      }
      if (event.data.type === 'startIdleCode') {
        const startTime = event.data.startTime;
        startIdleCodeTimer(startTime);
      }
      if (event.data.type === 'reset') {
        const startTime = event.data.startTime;
        startTimer(startTime);
      }
      if (event.data.type === 'resetIdleCode') {
        const startTime = event.data.startTime;
        startIdleCodeTimer(startTime);
      }
      if (event.data.type === 'stop') {
        stopTimer();
      }
      if (event.data.type === 'stopIdleCode') {
        stopIdleCodeTimer();
      }
    };
  `;

  useEffect(() => {
    try {
      logger.info(`CC-Widgets: Initializing worker`, {
        module: 'useUserState',
        method: 'useEffect - initial',
      });

      const blob = new Blob([workerScript], {type: 'application/javascript'});
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);
      workerRef.current.postMessage({type: 'start', startTime: Date.now()});
      workerRef.current.postMessage({type: 'startIdleCode', startTime: Date.now()});
      workerRef.current.onmessage = (event) => {
        try {
          if (event.data.type === 'elapsedTime') {
            setElapsedTime(event.data.elapsedTime > 0 ? event.data.elapsedTime : 0);
          } else if (event.data.type === 'lastIdleStateChangeElapsedTime') {
            setLastIdleStateChangeElapsedTime(event.data.elapsedTime > 0 ? event.data.elapsedTime : 0);
          } else if (event.data.type === 'stopIdleCodeTimer') {
            setLastIdleStateChangeElapsedTime(-1);
          }
        } catch (error) {
          logger?.error(`CC-Widgets: UserState: Error in worker onmessage - ${error.message}`, {
            module: 'useUserState',
            method: 'useEffect - initial - onmessage',
          });
        }
      };
    } catch (error) {
      logger?.error(`CC-Widgets: UserState: Error initializing worker - ${error.message}`, {
        module: 'useUserState',
        method: 'useEffect - initial',
      });
    }

    return () => {
      try {
        logger.log('CC-Widgets: useUserState cleanup: terminating worker', {
          module: 'useUserState',
          method: 'useEffect - initial cleanup',
        });
        if (workerRef.current) {
          workerRef.current.postMessage({type: 'stop'});
          workerRef.current.postMessage({type: 'stopIdleCode'});
          workerRef.current.terminate();
          workerRef.current = null;
        }
      } catch (error) {
        logger?.error(`CC-Widgets: UserState: Error in cleanup - ${error.message}`, {
          module: 'useUserState',
          method: 'useEffect - initial cleanup',
        });
      }
    };
  }, []);

  useEffect(() => {
    try {
      if (isCurrentStateExternallyManaged) externallyManagedStateRef.current = true;
      if (!wellnessIdleCodeLookupPending && pendingUserSelectionRef.current !== currentState) {
        pendingUserSelectionRef.current = undefined;
      }
      if (prevStateRef.current !== currentState) {
        if (wellnessIdleCodeLookupPending) {
          if (pendingUserSelectionRef.current !== currentState) {
            pendingUserSelectionRef.current = undefined;
            prevStateRef.current = currentState;
          }
          return;
        }
        pendingUserSelectionRef.current = undefined;
        logger.info(`CC-Widgets: State change action started: ${prevStateRef.current} -> ${currentState}`, {
          module: 'useUserState',
          method: 'useEffect - currentState',
        });

        // Wellness state is changed by the AI Assistant lifecycle. Reflect its
        // SDK event (and the following restore event) without echoing either
        // transition back through setAgentState.
        if (isCurrentStateExternallyManaged || externallyManagedStateRef.current) {
          prevStateRef.current = currentState;
          externallyManagedStateRef.current = isCurrentStateExternallyManaged;
          callOnStateChange();
          return;
        }

        // Call setAgentStatus and update prevStateRef after promise resolves
        updateAgentState(currentState)
          .then(() => {
            logger.log(`CC-Widgets: State change updated: ${prevStateRef.current} -> ${currentState}`, {
              module: 'useUserState',
              method: 'useEffect - currentState',
            });
            prevStateRef.current = currentState;
            externallyManagedStateRef.current = false;
            callOnStateChange();

            if (pendingVoiceLossDialogRef.current) {
              pendingVoiceLossDialogRef.current = false;
              if (
                voiceConnectionStateRef.current?.status === VOICE_CONNECTION_STATUS.UNAVAILABLE &&
                isAgentLoggedInRef.current &&
                isBrowserVoiceSessionRef.current
              ) {
                setVoiceConnectionLossDialogOpen(true);
              }
            }
          })
          .catch((error) => {
            if (pendingVoiceLossDialogRef.current) {
              pendingVoiceLossDialogRef.current = false;
              setVoiceConnectionLossDialogOpen(false);
            }
            logger.error(`Failed to update state: ${error.toString()}`, {
              module: 'useUserState',
              method: 'useEffect - currentState',
            });
          });
      }
    } catch (error) {
      logger?.error(`CC-Widgets: UserState: Error in currentState useEffect - ${error.message}`, {
        module: 'useUserState',
        method: 'useEffect - currentState',
      });
    }
  }, [currentState, isCurrentStateExternallyManaged, wellnessIdleCodeLookupPending]);

  useEffect(() => {
    try {
      callOnStateChange();
    } catch (error) {
      logger?.error(`CC-Widgets: UserState: Error in customState useEffect - ${error.message}`, {
        module: 'useUserState',
        method: 'useEffect - customState',
      });
    }
  }, [customState]);

  useEffect(() => {
    try {
      if (workerRef.current && lastStateChangeTimestamp) {
        logger.info('CC-Widgets: useUserState timers reset', {
          module: 'useUserState',
          method: 'useEffect - reset timers',
        });
        workerRef.current.postMessage({type: 'reset', startTime: lastStateChangeTimestamp});

        if (lastIdleCodeChangeTimestamp && lastIdleCodeChangeTimestamp !== lastStateChangeTimestamp) {
          workerRef.current.postMessage({type: 'resetIdleCode', startTime: lastIdleCodeChangeTimestamp});
        } else {
          workerRef.current.postMessage({type: 'stopIdleCode', startTime: lastIdleCodeChangeTimestamp});
        }
      }
    } catch (error) {
      logger?.error(`CC-Widgets: UserState: Error in timestamp useEffect - ${error.message}`, {
        module: 'useUserState',
        method: 'useEffect - reset timers',
      });
    }
  }, [lastStateChangeTimestamp, lastIdleCodeChangeTimestamp]);

  // UI change calls this method and gets the store updated
  const setAgentStatus = (selectedCode) => {
    try {
      setStateChangeError(undefined);
      logger.info('CC-Widgets: useUserState setAgentStatus(): updating currentState', {
        module: 'useUserState',
        method: 'setAgentStatus',
      });
      if (wellnessIdleCodeLookupPending) pendingUserSelectionRef.current = selectedCode;
      store.setCurrentState(selectedCode);
    } catch (error) {
      pendingVoiceLossDialogRef.current = false;
      pendingUserSelectionRef.current = undefined;
      logger?.error(`CC-Widgets: UserState: Error in setAgentStatus - ${error.message}`, {
        module: 'useUserState',
        method: 'setAgentStatus',
      });
    }
  };

  // Store change calls the useEffect above which calls this method
  // This method updates the agent state in the backend
  const updateAgentState = (selectedCode) => {
    try {
      selectedCode = idleCodes?.filter((code) => code.id === selectedCode)[0];

      const {auxCodeId, state} = {
        auxCodeId: selectedCode.id,
        state: selectedCode.name,
      };
      setIsSettingAgentStatus(true);
      const chosenState = state === 'Available' ? 'Available' : 'Idle';

      return cc
        .setAgentState({state: chosenState, auxCodeId, agentId, lastStateChangeReason: state})
        .then((response) => {
          logger.log(`CC-Widgets: Agent state set successfully to ${chosenState}`, {
            module: 'useUserState',
            method: 'updateAgentState',
          });
          if ('data' in response) {
            store.setLastStateChangeTimestamp(response.data.lastStateChangeTimestamp);
            store.setLastIdleCodeChangeTimestamp(response.data.lastIdleCodeChangeTimestamp);
          }
        })
        .catch((error) => {
          setStateChangeError('Unable to update agent state.');
          logger.error(`Error setting agent state: ${error.toString()}`, {
            module: 'useUserState',
            method: 'updateAgentState',
          });
          store.setCurrentState(prevStateRef.current);
          throw error;
        })
        .finally(() => {
          setIsSettingAgentStatus(false);
        });
    } catch (error) {
      logger?.error(`CC-Widgets: UserState: Error in updateAgentState - ${error.message}`, {
        module: 'useUserState',
        method: 'updateAgentState',
      });
      setIsSettingAgentStatus(false);
      throw error;
    }
  };

  return {
    idleCodes,
    setAgentStatus,
    isSettingAgentStatus,
    elapsedTime,
    lastIdleStateChangeElapsedTime,
    currentState,
    onStateChange,
    voiceConnectionState,
    stateChangeError,
    voiceConnectionLossDialogOpen,
    onVoiceReconnect: onVoiceReconnect ? handleVoiceReconnect : undefined,
    onVoiceConnectionLossDialogClose: dismissVoiceConnectionLossDialog,
    voiceReconnectError,
  };
};
