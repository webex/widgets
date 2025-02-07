import {useState, useEffect, useRef} from 'react';
// TODO: Export & Import this AGENT_STATE_CHANGE constant from SDK
import {AGENT_STATE_CHANGE} from './constants';
import store from '@webex/cc-store';
export const useUserState = ({idleCodes, agentId, cc, currentState, lastStateChangeTimestamp}) => {
  const [isSettingAgentStatus, setIsSettingAgentStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const workerRef = useRef<Worker | null>(null);

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
    workerRef.current.postMessage({type: 'start', startTime: Date.now()});
    workerRef.current.onmessage = (event) => {
      setElapsedTime(event.data);
    };

    const handleStateChange = (data) => {
      if (data && typeof data === 'object' && data.type === 'AgentStateChangeSuccess') {
        const DEFAULT_CODE = '0'; // Default code when no aux code is present
        store.setCurrentState(data.auxCodeId?.trim() !== '' ? data.auxCodeId : DEFAULT_CODE);

        const startTime = data.lastStateChangeTimestamp;
        store.setLastStateChangeTimestamp(new Date(startTime));
      }
    };

    cc.on(AGENT_STATE_CHANGE, handleStateChange);

    return () => {
      workerRef.current?.terminate();
      cc.off(AGENT_STATE_CHANGE, handleStateChange);
    };
  }, []);

  useEffect(() => {
    if (workerRef.current && lastStateChangeTimestamp) {
      const timeNow = new Date();
      const elapsed = Math.floor(Math.abs(timeNow.getTime() - lastStateChangeTimestamp.getTime()) / 1000);
      setElapsedTime(elapsed);
      workerRef.current.postMessage({type: 'reset', startTime: lastStateChangeTimestamp.getTime()});
    }
  }, [lastStateChangeTimestamp]);

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
  };
};
