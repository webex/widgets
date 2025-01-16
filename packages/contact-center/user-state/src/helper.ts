import { useState, useEffect } from "react";
// TODO: Export & Import this AGENT_STATE_CHANGE constant from SDK
import { AGENT_STATE_CHANGE } from './constants';

export const useUserState = ({ idleCodes, agentId, cc, currentTheme }) => {
  const [isSettingAgentStatus, setIsSettingAgentStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentState, setCurrentState] = useState({});
  let worker;

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
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    worker = new Worker(workerUrl);

    worker.postMessage({ type: 'start', startTime: Date.now() });
    worker.onmessage = (event) => {
      setElapsedTime(event.data);
    };

    const handleStateChange = (data) => {
      if (data && typeof data === 'object' && data.type === 'AgentStateChangeSuccess') {
        const DEFAULT_CODE = '0'; // Default code when no aux code is present
        setCurrentState({
          id: data.auxCodeId?.trim() !== '' ? data.auxCodeId : DEFAULT_CODE
        });

        const startTime = data.lastStateChangeTimestamp;
        setElapsedTime(0);
        worker.postMessage({ type: 'reset', startTime }); // Reset the worker timer with the new start time
      }
    };
    
    cc.on(AGENT_STATE_CHANGE, handleStateChange);

    return () => {
      worker.terminate();
      cc.off(AGENT_STATE_CHANGE, handleStateChange);
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
    cc.setAgentState({ state: chosenState, auxCodeId, agentId, lastStateChangeReason: state })
      .catch((error) => {
        setCurrentState(oldState);
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
    setCurrentState,
    currentTheme
  };
};