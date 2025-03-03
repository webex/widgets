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
}) => {
  const [isSettingAgentStatus, setIsSettingAgentStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  const prevStateRef = useRef(currentState);

  // Initialize the Web Worker using a Blob
  const workerScript = `
    let intervalId;
    const startTimer = (startTime) => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        self.postMessage(elapsedTime);
      }, 1000);
    };
    self.onmessage = (event) => {
      if (event.data.type === 'start' || event.data.type === 'reset') {
        const startTime = event.data.startTime;
        startTimer(startTime);
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
    workerRef.current.onmessage = (event) => {
      setElapsedTime(event.data);
    };

    return () => {
      logger.log(`Terminating worker`, {
        module: 'useUserState',
        method: 'cleanup',
      });
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (prevStateRef.current !== currentState) {
      logger.log(`State change detected: ${prevStateRef.current} -> ${currentState}`, {
        module: 'useUserState',
        method: 'useEffect - currentState',
      });

      // Call setAgentStatus and update prevStateRef after promise resolves
      setAgentState(currentState)
        .then(() => {
          prevStateRef.current = currentState;
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
    if (onStateChange) {
      if (customState?.developerName) {
        onStateChange(customState);
        return;
      }
      idleCodes.forEach((code) => {
        if (code.id === currentState) {
          onStateChange(code);
        }
      });
    }
  }, [customState, currentState]);

  useEffect(() => {
    if (workerRef.current && lastStateChangeTimestamp) {
      const timeNow = new Date();
      const elapsed = Math.floor(Math.abs(timeNow.getTime() - lastStateChangeTimestamp.getTime()) / 1000);
      setElapsedTime(elapsed);
      workerRef.current.postMessage({type: 'reset', startTime: lastStateChangeTimestamp.getTime()});
    }
  }, [lastStateChangeTimestamp]);

  const setAgentStatus = (selectedCode) => {
    store.setCurrentState(selectedCode);
  };

  const setAgentState = (selectedCode) => {
    selectedCode = idleCodes?.filter((code) => code.id === selectedCode)[0];

    logger.log(`Setting agent status`, {
      module: 'useUserState',
      method: 'setAgentStatus',
      auxCodeId: selectedCode.auxCodeId,
      state: selectedCode.state,
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
          method: 'setAgentStatus',
          response: response.data,
        });

        store.setLastStateChangeTimestamp(new Date(response.data.lastStateChangeTimestamp));
      })
      .catch((error) => {
        logger.error(`Error setting agent state: ${error.toString()}`, {
          module: 'useUserState',
          method: 'setAgentStatus',
        });
        setErrorMessage(error.toString());
        throw error; // Rethrow to handle it in the calling function
      })
      .finally(() => {
        setIsSettingAgentStatus(false);
      });
  };

  return {
    idleCodes,
    setAgentStatus,
    isSettingAgentStatus,
    errorMessage,
    elapsedTime,
    currentState,
  };
};
