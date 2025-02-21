import React, {useState, useRef, useEffect} from 'react';
import {StationLogin, UserState, IncomingTask, TaskList, CallControl, store} from '@webex/cc-widgets';
import {ThemeProvider, IconProvider} from '@momentum-design/components/dist/react';
import './App.scss';

function App() {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [selectedWidgets, setSelectedWidgets] = useState({
    stationLogin: false,
    userState: false,
    incomingTask: false,
    taskList: false,
    callControl: false,
  });
  const [accessToken, setAccessToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const themeCheckboxRef = useRef(null);
  const [currentTheme, setCurrentTheme] = useState(store.currentTheme);
  const [isMultiLoginEnabled, setIsMultiLoginEnabled] = useState(false);
  const [showRejectedPopup, setShowRejectedPopup] = useState(false);
  const [rejectedReason, setRejectedReason] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const webexConfig = {
    fedramp: false,
    logger: {
      level: 'log',
    },
    cc: {
      allowMultiLogin: isMultiLoginEnabled,
    },
  };

  const onLogin = () => {
    console.log('Agent login has been succesful');
    setIsLoggedIn(true);
  };

  const onLogout = () => {
    console.log('Agent logout has been succesful');
    setIsLoggedIn(false);
  };

  const onAccepted = () => {
    console.log('onAccepted Invoked');
  };

  const onDeclined = () => {
    console.log('onDeclined invoked');
  };

  const onTaskAccepted = () => {
    console.log('onTaskAccepted invoked');
  };

  const onTaskDeclined = () => {
    console.log('onTaskDeclined invoked');
  };

  const onHoldResume = () => {
    console.log('onHoldResume invoked');
  };

  const onEnd = () => {
    console.log('onEnd invoked');
  };

  const onWrapup = () => {
    console.log('onWrapup invoked');
  };

  const enableDisableMultiLogin = () => {
    if (isMultiLoginEnabled) {
      setIsMultiLoginEnabled(false);
    } else {
      setIsMultiLoginEnabled(true);
    }
  };

  const handleCheckboxChange = (e) => {
    const {name, checked} = e.target;
    setSelectedWidgets((prev) => ({...prev, [name]: checked}));
  };

  const changeAgentState = (newState: string) => {
    // In the idle codes, we need to search for the 'Idle' state with code name 'Meeting'.
    const lookupCodeName = newState === 'Available' ? 'Available' : 'Meeting';
    
    const idleCode = store.idleCodes?.find((code: any) => code.name === lookupCodeName);
    if (!idleCode) {
      console.error('No idle code found for selected state:', newState);
      return;
    }
    const agentId = store.agentId || '';
    store.cc
      .setAgentState({
        state: newState,
        auxCodeId: idleCode.id,
        agentId,
        lastStateChangeReason: newState,
      })
      .then((response) => {
        store.setCurrentState(response.data.auxCodeId);
        store.setLastStateChangeTimestamp(new Date(response.data.lastStateChangeTimestamp));
        console.log('Agent state updated to', newState);
      })
      .catch((error) => {
        console.error('Error updating agent state:', error);
      });
  };

  const handlePopoverSubmit = () => {
    if (selectedState) {
      changeAgentState(selectedState);
    }
    setShowRejectedPopup(false);
    setSelectedState('');
  };

  useEffect(() => {
    store.setTaskRejected((reason: string) => {
      setRejectedReason(reason);
      setShowRejectedPopup(true);
    });

    return () => {
      store.setTaskRejected(undefined);
    };
  }, []);

  return (
    <div className="mds-typography">
      <ThemeProvider
        themeclass={currentTheme === 'LIGHT' ? 'mds-theme-stable-lightWebex' : 'mds-theme-stable-darkWebex'}
      >
        <IconProvider>
          <h1>Contact Center widgets in a react app</h1>
          <input
            type="text"
            placeholder="Enter your access token"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
          <br />
          <>
            <div>
              <label>
                <input
                  type="checkbox"
                  name="stationLogin"
                  checked={selectedWidgets.stationLogin}
                  onChange={handleCheckboxChange}
                />
                Station Login
              </label>
              <label>
                <input
                  type="checkbox"
                  name="userState"
                  checked={selectedWidgets.userState}
                  onChange={handleCheckboxChange}
                />
                User State
              </label>
              <label>
                <input
                  type="checkbox"
                  name="incomingTask"
                  checked={selectedWidgets.incomingTask}
                  onChange={handleCheckboxChange}
                />
                Incoming Task
              </label>
              <label>
                <input
                  type="checkbox"
                  name="taskList"
                  checked={selectedWidgets.taskList}
                  onChange={handleCheckboxChange}
                />
                Task List
              </label>
              <label>
                <input
                  type="checkbox"
                  name="callControl"
                  checked={selectedWidgets.callControl}
                  onChange={handleCheckboxChange}
                />
                Call Control
              </label>
            </div>
          </>
          <input
            type="checkbox"
            id="theme"
            name="theme"
            ref={themeCheckboxRef}
            onChange={() => {
              setCurrentTheme(themeCheckboxRef.current.checked ? 'DARK' : 'LIGHT');
              store.setCurrentTheme(themeCheckboxRef.current.checked ? 'DARK' : 'LIGHT');
            }}
          />{' '}
          Dark Theme
          <br />
          <div className="warning-note" style={{color: 'red', marginBottom: '10px'}}>
            <strong>Note:</strong> The "Enable Multi Login" option must be set before initializing the SDK. Changes to
            this setting after SDK initialization will not take effect. Please ensure you configure this option before
            clicking the "Init Widgets" button.
          </div>
          <label>
            <input type="checkbox" id="multiLoginFlag" name="multiLoginFlag" onChange={enableDisableMultiLogin} />{' '}
            Enable Multi Login
          </label>
          <br />
          <button
            disabled={accessToken.trim() === ''}
            onClick={() => {
              store.init({webexConfig, access_token: accessToken}).then(() => {
                setIsSdkReady(true);
              });
            }}
          >
            Init Widgets
          </button>
          {isSdkReady && (
            <>
              {selectedWidgets.stationLogin && <StationLogin onLogin={onLogin} onLogout={onLogout} />}
              {store.isAgentLoggedIn && (
                <>
                  {selectedWidgets.userState && <UserState />}
                  {selectedWidgets.incomingTask && <IncomingTask onAccepted={onAccepted} onDeclined={onDeclined} />}
                  {selectedWidgets.taskList && (
                    <TaskList onTaskAccepted={onTaskAccepted} onTaskDeclined={onTaskDeclined} />
                  )}
                  {selectedWidgets.callControl && (
                    <CallControl onHoldResume={onHoldResume} onEnd={onEnd} onWrapup={onWrapup} />
                  )}
                </>
              )}
            </>
          )}  

          {showRejectedPopup && (
            <div className="task-rejected-popup">
              <h2>Task Rejected</h2>
              <p>Reason: {rejectedReason}</p>
              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                <option value="">Select a state</option>
                <option value="Available">Available</option>
                <option value="Idle">Idle</option>
              </select>
              <button onClick={handlePopoverSubmit}>Submit</button>
            </div>
          )}

      </IconProvider></ThemeProvider>
    </div>
  );
}

export default App;
