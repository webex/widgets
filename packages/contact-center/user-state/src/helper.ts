import {useState, useEffect} from "react";

export const useUserState = ({idleCodes, agentId, cc}) => {

  const [isSettingAgentStatus, setIsSettingAgentStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentState, setCurrentState] = useState({});

  useEffect(() => {
    // Reset the timer whenever the component mounts or the state changes
    setElapsedTime(0);
    const timer = setInterval(() => {
      setElapsedTime(prevTime => prevTime + 1);
    }, 1000);

    // Cleanup the timer on component unmount
    return () => clearInterval(timer);
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
      setIsSettingAgentStatus(false);
      setErrorMessage('');
      setElapsedTime(0);
    }).catch(error => {
      setCurrentState(oldState);
      setErrorMessage(error.toString());
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
