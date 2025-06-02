import {useState, useEffect, useRef} from 'react';
import store from '@webex/cc-store';

export const useUserState = ({
  idleCodes,
  agentId,
  cc,
  currentState,
  customState,
  lastStateChangeTimestamp,
  logger,
  onStateChange,
  lastIdleCodeChangeTimestamp,
}) => {
  const [isSettingAgentStatus, setIsSettingAgentStatus] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastIdleStateChangeElapsedTime, setLastIdleStateChangeElapsedTime] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  const prevStateRef = useRef(currentState);

  const callOnStateChange = () => {
    logger.log('useUserState callOnStateChange(): invoking onStateChange', {
      module: 'useUserState',
      method: 'callOnStateChange',
    });
    if (onStateChange) {
      if (customState?.developerName) {
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
    logger.log(`Initializing worker`, {
      module: 'useUserState',
      method: 'useEffect - initial',
    });

    const blob = new Blob([workerScript], {type: 'application/javascript'});
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    workerRef.current.postMessage({type: 'start', startTime: Date.now()});
    workerRef.current.postMessage({type: 'startIdleCode', startTime: Date.now()});
    workerRef.current.onmessage = (event) => {
      logger.log(`useUserState worker.onmessage: ${event.data.type}`, {
        module: 'useUserState',
        method: 'worker.onmessage',
      });
      if (event.data.type === 'elapsedTime') {
        setElapsedTime(event.data.elapsedTime > 0 ? event.data.elapsedTime : 0);
      } else if (event.data.type === 'lastIdleStateChangeElapsedTime') {
        setLastIdleStateChangeElapsedTime(event.data.elapsedTime > 0 ? event.data.elapsedTime : 0);
      } else if (event.data.type === 'stopIdleCodeTimer') {
        setLastIdleStateChangeElapsedTime(-1);
      }
    };

    return () => {
      logger.log('useUserState cleanup: terminating worker', {
        module: 'useUserState',
        method: 'useEffect - initial cleanup',
      });
      if (workerRef.current) {
        workerRef.current.postMessage({type: 'stop'});
        workerRef.current.postMessage({type: 'stopIdleCode'});
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (prevStateRef.current !== currentState) {
      logger.log(`State change detected: ${prevStateRef.current} -> ${currentState}`, {
        module: 'useUserState',
        method: 'useEffect - currentState',
      });

      // Call setAgentStatus and update prevStateRef after promise resolves
      updateAgentState(currentState)
        .then(() => {
          prevStateRef.current = currentState;
          callOnStateChange();
        })
        .catch((error) => {
          logger.error(`Failed to update state: ${error.toString()}`, {
            module: 'useUserState',
            method: 'useEffect - currentState',
          });
        });
    }
  }, [currentState]);

  useEffect(() => {
    callOnStateChange();
  }, [customState]);

  useEffect(() => {
    if (workerRef.current && lastStateChangeTimestamp) {
      logger.log('useUserState timers reset', {
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
  }, [lastStateChangeTimestamp, lastIdleCodeChangeTimestamp]);

  // UI change calls this method and gets the store updated
  const setAgentStatus = (selectedCode) => {
    logger.log('useUserState setAgentStatus(): updating currentState', {
      module: 'useUserState',
      method: 'setAgentStatus',
    });
    store.setCurrentState(selectedCode);
  };

  // Store change calls the useEffect above which calls this method
  // This method updates the agent state in the backend
  const updateAgentState = (selectedCode) => {
    selectedCode = idleCodes?.filter((code) => code.id === selectedCode)[0];

    logger.log(`Setting agent status`, {
      module: 'useUserState',
      method: 'setAgentStatus',
    });

    const {auxCodeId, state} = {
      auxCodeId: selectedCode.id,
      state: selectedCode.name,
    };
    setIsSettingAgentStatus(true);
    const chosenState = state === 'Available' ? 'Available' : 'Idle';

    return cc
      .setAgentState({state: chosenState, auxCodeId, agentId, lastStateChangeReason: state})
      .then((response) => {
        logger.log(`Agent state set successfully`, {
          module: 'useUserState',
          method: 'updateAgentState',
        });

        store.setLastStateChangeTimestamp(response.data.lastStateChangeTimestamp);
        store.setLastIdleCodeChangeTimestamp(response.data.lastIdleCodeChangeTimestamp);
      })
      .catch((error) => {
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
  };

  return {
    idleCodes,
    setAgentStatus,
    isSettingAgentStatus,
    elapsedTime,
    lastIdleStateChangeElapsedTime,
    currentState,
  };
};
