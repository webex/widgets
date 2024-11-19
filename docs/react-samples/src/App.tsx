import React from 'react';
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';

function App() {
  return (
    <>
      <h1>Contact Center widgets in a react app</h1>
      <StationLogin />
      <UserState
        sdkConfig={{
          accessToken: 'YOUR_ACCESS',
        }}
      />
    </>
  );
}

export default App;
