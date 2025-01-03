import {useState, useEffect} from "react";

export const useUserState = ({idleCodes, agentId, cc}) => {

  const [isSettingAgentStatus, setIsSettingAgentStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentState, setCurrentState] = useState({});
  let worker;

  // Initialize the Web Worker using a Blob
  const workerScript = `
    let startTime = Date.now();

    self.onmessage = (event) => {
      if (event.data === 'start') {
        startTime = Date.now();
        setInterval(() => {
          const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
          self.postMessage(elapsedTime);
        }, 1000);
      } else if (event.data === 'reset') {
        startTime = Date.now();
      }
    };
  `;

  const blob = new Blob([workerScript], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  worker = new Worker(workerUrl);

  useEffect(() => {
    worker.postMessage('start');
    worker.onmessage = (event) => {
      setElapsedTime(event.data);
    };

    return () => {
      worker.terminate();
    };
  }, [currentState]);

  const setAgentStatus = (selectedCode) => {
    const {
      auxCodeId,
      state
    } = {
      auxCodeId: selectedCode.id,
      state: selectedCode.name
    }
    setIsSettingAgentStatus(true);
    let oldState = {
      ...currentState
    };
    setCurrentState(selectedCode);
    const chosenState = state === 'Available' ? 'Available' : 'Idle';
    cc.setAgentState({state: chosenState, auxCodeId, agentId, lastStateChangeReason: state}).then((response) => {
      setErrorMessage('');
      setElapsedTime(0);
      worker.postMessage('reset'); // Reset the worker timer
    }).catch(error => {
      setCurrentState(oldState);
      setErrorMessage(error.toString());
    }).finally(() => {
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
    setCurrentState
  };
};