import React, {useState, useRef} from 'react';
import {StationLogin, UserState, IncomingTask, TaskList, CallControl, store} from '@webex/cc-widgets';
import {ThemeProvider, IconProvider} from '@momentum-design/components/dist/react';

function App() {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const themeCheckboxRef = useRef(null);
  const [currentTheme, setCurrentTheme] = useState(store.currentTheme);
  const [isMultiLoginEnabled, setIsMultiLoginEnabled] = useState(false);

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
            <strong>Important:</strong> The "Enable Multi Login" option must be set before initializing the SDK. Changes
            to this setting after SDK initialization will not take effect. Please ensure you configure this option
            before clicking the "Init Widgets" button.
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
              <StationLogin onLogin={onLogin} onLogout={onLogout} />
              {isLoggedIn && (
                <>
                  <UserState />
                  <IncomingTask onAccepted={onAccepted} onDeclined={onDeclined} />
                  <TaskList onTaskAccepted={onTaskAccepted} onTaskDeclined={onTaskDeclined} />
                  <CallControl onHoldResume={onHoldResume} onEnd={onEnd} onWrapup={onWrapup} />
                </>
              )}
            </>
          )}
        </IconProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
