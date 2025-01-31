import React, {useState, useRef} from 'react';
import {StationLogin, UserState, IncomingTask, TaskList, CallControl, store} from '@webex/cc-widgets';

function App() {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const themeCheckboxRef = useRef(null);

  const webexConfig = {
    fedramp: false,
    logger: {
      level: 'log',
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

  return (
    // @ts-ignore
    <md-theme theme="momentumv2">
      <h1>Contact Center widgets in a react app</h1>
      <input
        type="text"
        placeholder="Enter your access token"
        value={accessToken}
        onChange={(e) => setAccessToken(e.target.value)}
      />
      <br />
      <input
        type='checkbox'
        id='theme'
        name='theme'
        ref={themeCheckboxRef}
        onChange={() => {
          store.setCurrentTheme(themeCheckboxRef.current.checked ? 'DARK' : 'LIGHT');
        }}
      /> Dark Theme
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
      {/* @ts-ignore */}
    </md-theme>
  );
}

export default App;
