import {StationLogin, store} from '@webex/cc-widgets'
import React, { useState } from 'react';

function App() {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // @ts-ignore
  window.React3 = React;
  // @ts-ignore
  console.log('react-samples react react 3 react1', window.React3 === window.React1);
  // @ts-ignore
  console.log('react-samples react, react 2 react 3', window.React2 === window.React3);

  const webexConfig = {
      fedramp: false,
      logger: {
        level: 'log'
      }
  }

  const onLogin = () => {
    console.log('Agent login has been succesful');
    setIsLoggedIn(true);
  }

  const onLogout = () => {
    console.log('Agent logout has been succesful');
    setIsLoggedIn(false);
  }

  return (
    <>
      <h1>Contact Center widgets in a react app</h1>
      <input
        type="text"
        placeholder="Enter your access token"
        value={accessToken}
        onChange={(e) => setAccessToken(e.target.value)}
      />
      <button
        disabled={accessToken.trim() === ""}
        onClick={() => {
          store.init({webexConfig, access_token: accessToken}).then(() => {
            setIsSdkReady(true);
          });
        }}
      >Init Widgets</button>
      {
        isSdkReady && (
          <>
            <StationLogin  onLogin={onLogin} onLogout={onLogout} />
          </>
        )
      }
    </>
  );
}

export default App;
