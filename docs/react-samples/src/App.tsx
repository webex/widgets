import React from 'react';
import {StationLogin} from '@webex/widget-cc-station-login';
import {UserState} from '@webex/widget-cc-user-state';

function App() {
  return (
    <>
      <h1>Contact Center widgets in a react app</h1>
      <StationLogin />
      <UserState />
    </>
  );
}

export default App;
