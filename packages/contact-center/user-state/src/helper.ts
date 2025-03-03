import {useState, useEffect, useRef} from 'react';
// TODO: Export & Import this AGENT_STATE_CHANGE constant from SDK
import store from '@webex/cc-store';

export const useUserState = ({
  idleCodes,
  agentId,
  cc,
  currentState,
  lastStateChangeTimestamp,
  lastIdleCodeChangeTimestamp,
}) => {
  const [isSettingAgentStatus, setIsSettingAgentStatus] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastIdleStateChangeElapsedTime, setLastIdleStateChangeElapsedTime] = useState(0);
  const workerRef = useRef<Worker | null>(null);

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
    const blob = new Blob([workerScript], {type: 'application/javascript'});
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    workerRef.current.postMessage({type: 'start', startTime: Date.now()});
    workerRef.current.postMessage({type: 'startIdleCode', startTime: Date.now()});
    workerRef.current.onmessage = (event) => {
      if (event.data.type === 'elapsedTime') {
        setElapsedTime(event.data.elapsedTime > 0 ? event.data.elapsedTime : 0);
      } else if (event.data.type === 'lastIdleStateChangeElapsedTime') {
        setLastIdleStateChangeElapsedTime(event.data.elapsedTime > 0 ? event.data.elapsedTime : 0);
      } else if (event.data.type === 'stopIdleCodeTimer') {
        setLastIdleStateChangeElapsedTime(-1);
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({type: 'stop'});
        workerRef.current.postMessage({type: 'stopIdleCode'});
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (workerRef.current && lastStateChangeTimestamp) {
      workerRef.current.postMessage({type: 'reset', startTime: lastStateChangeTimestamp});

      if (lastIdleCodeChangeTimestamp && lastIdleCodeChangeTimestamp !== lastStateChangeTimestamp) {
        workerRef.current.postMessage({type: 'resetIdleCode', startTime: lastIdleCodeChangeTimestamp});
      } else {
        workerRef.current.postMessage({type: 'stopIdleCode', startTime: lastIdleCodeChangeTimestamp});
      }
    }
  }, [lastStateChangeTimestamp, lastIdleCodeChangeTimestamp]);

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
        store.setLastStateChangeTimestamp(response.data.lastStateChangeTimestamp);
        store.setLastIdleCodeChangeTimestamp(response.data.lastIdleCodeChangeTimestamp);
      })
      .catch((error) => {
        console.error(error.toString());
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
