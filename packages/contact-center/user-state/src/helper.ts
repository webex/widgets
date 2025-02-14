import {useState, useEffect, useRef} from 'react';
// TODO: Export & Import this AGENT_STATE_CHANGE constant from SDK
import store from '@webex/cc-store';
export const useUserState = ({idleCodes, agentId, cc, currentState, lastStateChangeTimestamp, customStatus, onStateChange}) => {
  const [isSettingAgentStatus, setIsSettingAgentStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const customStatusList = [
    { id: 'customWRAPUP', name: 'Wrap-Up' },
    { id: 'customENGAGED', name: 'Engaged' },
  ]

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
    const blob = new Blob([workerScript], {type: 'application/javascript'});
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    workerRef.current.onmessage = (event) => {
      workerRef.current.postMessage({type: 'start', startTime: Date.now()});
      setElapsedTime(event.data);
    };
  }, []);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      const blob = new Blob([workerScript], {type: 'application/javascript'});
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);
      workerRef.current.onmessage = (event) => {
        setElapsedTime(event.data);
      };
      if (lastStateChangeTimestamp) {
        const timeNow = new Date();
        const elapsed = Math.floor(Math.abs(timeNow.getTime() - lastStateChangeTimestamp.getTime()) / 1000);
        setElapsedTime(elapsed);
        workerRef.current.postMessage({type: 'reset', startTime: lastStateChangeTimestamp.getTime()});
      } else {
        workerRef.current.postMessage({type: 'start', startTime: Date.now()});
      }
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, [currentState]);

  useEffect(() => {
    if(onStateChange){
      if (customStatus !== '') {
        customStatusList.forEach((status) => {
          if (status.id.includes(customStatus)) {
            onStateChange(status);
          }
        });
        return;
      }
      idleCodes.forEach((code) => {
        if (code.id === currentState) {
          onStateChange(code);
        }
      });
    }
  }, [customStatus, currentState]);

  const setAgentStatus = (selectedCode) => {
    const {auxCodeId, state} = {
      auxCodeId: selectedCode.id,
      state: selectedCode.name,
    };
    setIsSettingAgentStatus(true);
    const chosenState = state === 'Available' ? 'Available' : 'Idle';
    cc.setAgentState({state: chosenState, auxCodeId, agentId, lastStateChangeReason: state})
      .then((response) => {
        store.setCurrentState(response.data.auxCodeId);
        store.setLastStateChangeTimestamp(new Date(response.data.lastStateChangeTimestamp));
      })
      .catch((error) => {
        setErrorMessage(error.toString());
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
    customStatus,
    customStatusList,
  };
};
