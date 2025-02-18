import React, {useState, useRef} from 'react';
import {StationLogin, UserState, IncomingTask, TaskList, CallControl, store} from '@webex/cc-widgets';
import {observer} from 'mobx-react-lite';

window['store'] = store;

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
  const [isStationLoginReadOnly, setIsStationLoginReadOnly] = useState(false);

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

  const onWrapup = (params) => {
    console.log('onWrapup invoked', params);
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

  return (
    <>
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
          {selectedWidgets.stationLogin && (
            <>
              <br/><br/>
              <label>
                <input
                  type="checkbox"
                  checked={isStationLoginReadOnly}
                  onChange={(e) => setIsStationLoginReadOnly(e.target.checked)}
                />
                Read Only - Station Login
              </label>
              <StationLogin onLogin={onLogin} onLogout={onLogout} isReadOnly={isStationLoginReadOnly} />
            </>
          )}
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
    </>
  );
}

export default observer(App);
