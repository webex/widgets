import React, { useEffect, useState } from 'react';
import store from '@webex/cc-store'
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';

function App() {
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  const webexConfig = {
      fedramp: false,
      logger: {
        level: 'log'
      }
  }

  const onLogin = () => {
    console.log('Agent login has been succesful');
  }

  const onLogout = () => {
    console.log('Agent logout has been succesful');
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
      {/* write code to check if sdk is ready and load components */}
      {
        isSdkReady && (
          <>
            <StationLogin  onLogin={onLogin} onLogout={onLogout} />
            <UserState />
          </>
        )
      }
    </>
  );
}

export default App;
