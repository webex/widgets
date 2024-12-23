import {useState, useEffect} from "react";
// TODO: Export & Import this AGENT_STATE_CHANGE constant from SDK
import {AGENT_STATE_CHANGE} from './constants';

export const useUserState = ({idleCodes, agentId, cc}) => {

  const [isSettingAgentStatus, setIsSettingAgentStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentState, setCurrentState] = useState({});

  useEffect(() => {
    // Reset the timer whenever the component mounts or the state changes
    setElapsedTime(0);
    let timer = setInterval(() => {
      setElapsedTime(prevTime => prevTime + 1);
    }, 1000);

    const handleStateChange = (data) => {
      if (data && typeof data === 'object' && data.type === 'AgentStateChangeSuccess') {
        const DEFAULT_CODE = '0'; // Default code when no aux code is present
        setCurrentState({
          id: data.auxCodeId?.trim() !== '' ? data.auxCodeId : DEFAULT_CODE
        });
        setElapsedTime(0);
      }
    };
    
    cc.on(AGENT_STATE_CHANGE, handleStateChange);

    // Cleanup the timer on component unmount
    return () => {
      clearInterval(timer);
      timer = null;
      cc.off(AGENT_STATE_CHANGE, handleStateChange);
    }
  }, []);

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
  }
};
