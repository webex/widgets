import React, { useEffect } from 'react';
import store from '@webex/cc-store'
import {StationLogin} from '@webex/cc-station-login';
import {UserState} from '@webex/cc-user-state';

function App() {
  const token = '';

  const webexConfig = {
      fedramp: false,
      logger: {
      level: 'log'  // TODO: We will add more logging levels later and set the righ levels
      },
  }

  useEffect(() => {
    const init = async () => {
      await store.init(webexConfig, token);
    }

    init();
  }, []) 

  const onLogin = () => {
    console.log('Agent login has been succesful');
  }

  const onLogout = () => {
    console.log('Agent logout has been succesful');
  }

  return (
    <>
      <h1>Contact Center widgets in a react app</h1>
      <StationLogin  onLogin={onLogin} onLogout={onLogout} />
      <UserState />
    </>
  );
}

export default App;
