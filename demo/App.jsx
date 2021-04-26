import React, {useState} from 'react';
import ReactDOM from 'react-dom';
import {Button, Input, Sidebar, SidebarBody, SidebarNav, SidebarNavItem} from '@momentum-ui/react';

import WebexMeetingWidgetDemo from './WebexMeetingWidgetDemo';

import './App.scss';

export default function App() {
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState();

  const handleClearToken = (event) => {
    event.preventDefault();
    setTokenInput('');
    setToken();
  };

  const handleUpdateInputToken = (event) => {
    setTokenInput(event.target.value);
  };

  const handleSaveToken = (event) => {
    event.preventDefault();
    setToken(tokenInput);
  };

  return (
    <React.Fragment>
      <Sidebar withIcons={false}>
        <SidebarBody>
          <SidebarNav title="Webex Widgets">
            <SidebarNavItem title="Webex Meeting Widget" />
          </SidebarNav>
        </SidebarBody>
      </Sidebar>
      <div className="content">
        <section>
          <h3>Webex Widgets Access Token</h3>
          <h5>Webex Widgets require an access token to identify the current user.</h5>
          <h5>
            You can get an access token from{' '}
            <a href="https://developer.webex.com" target="_blank">
              developer.webex.com
            </a>
          </h5>
          <form>
            <Input
              htmlId="token"
              label="Access Token"
              name="token"
              onChange={handleUpdateInputToken}
              placeholder="Access Token"
              readOnly={!!token}
              type="password"
              value={tokenInput}
            />
            <Button color="blue" type="submit" onClick={handleSaveToken} disabled={!!token} ariaLabel="Save Token">
              Save Token
            </Button>
            <Button type="button" onClick={handleClearToken} disabled={!token} ariaLabel="Clear Token">
              Clear Token
            </Button>
          </form>
        </section>
        <section>
          <WebexMeetingWidgetDemo token={token} />
        </section>
      </div>
    </React.Fragment>
  );
}

ReactDOM.render(<App />, document.getElementById('widgets-demo'));
