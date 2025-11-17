import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button, Input, Sidebar, SidebarBody, SidebarNav, SidebarNavItem, Checkbox} from '@momentum-ui/react';

import WebexMeetingsWidgetDemo from './WebexMeetingsWidgetDemo';

import '@momentum-ui/core/css/momentum-ui.min.css';
import './App.scss';

// App component for the Webex Widgets Demo
export default function App() {
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState();
  const [fedramp, setFedramp] = useState(false);

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

  function handleFedrampChange() {
    setFedramp(!fedramp);
  }

  return (
    <>
      <Sidebar withIcons={false}>
        <SidebarBody>
          <SidebarNav title="Webex Widgets">
            <SidebarNavItem title="Webex Meetings Widget" />
          </SidebarNav>
        </SidebarBody>
      </Sidebar>
      <div className="content flex-column">
        <section className="webex-section">
          <h3>Webex Widgets Access Token</h3>
          <h5>Webex Widgets require an access token to identify the current user.</h5>
          <h5>
            You can get an access token from{' '}
            <a href={`https://developer${fedramp ? '-usgov' : ''}.webex.com`} target="_blank">
              {`developer${fedramp ? '-usgov' : ''}.webex.com`}
            </a>
          </h5>
          <form className="webex-form">
            <Checkbox
              checked={fedramp}
              htmlId="fedrampCheckbox"
              label="FedRAMP"
              onChange={handleFedrampChange}
              value="FedRAMP"
              disabled={!!token}
            />
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
        <section className="webex-section fluid-height flex-column">
          <WebexMeetingsWidgetDemo token={token} fedramp={fedramp} />
        </section>
      </div>
    </>
  );
}

const root = createRoot(document.getElementById('widgets-demo'));

root.render(<App />);
