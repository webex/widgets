import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {Button, Input, Select, SelectOption} from '@momentum-ui/react';
import './WebexMeetingWidgetDemo.scss';

import {WebexMeetingWidget} from '../src';

export default function WebexMeetingWidgetDemo({token}) {
  const [destination, setDestination] = useState('');
  const [displayWidget, setDisplayWidget] = useState(false);
  const [theme, setTheme] = useState('dark');

  const displayButtonEnabled = token && destination && !displayWidget;

  const handleDisplayMeetingWidget = (event) => {
    event.preventDefault();
    setDisplayWidget(true);
  };

  const handleHideMeetingWidget = (event) => {
    event.preventDefault();
    setDisplayWidget(false);
  };

  const handleChangeTheme = (selectedOptions) => {
    const selectedTheme = selectedOptions[0].value;
    setTheme(selectedTheme);
  };

  return (
    <React.Fragment>
      <h3>Webex Meeting Widget</h3>
      <h5>The Webex Meeting Widget allows you to create and join Webex meetings in your browser.</h5>
      <form>
        <Input
          htmlId="destination"
          label="Widget Destination (email, person ID, room ID, SIP)"
          name="destination"
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Widget Destination"
          readOnly={displayWidget}
          type="text"
          value={destination}
        />
        <Button
          type="submit"
          disabled={!displayButtonEnabled}
          onClick={handleDisplayMeetingWidget}
          ariaLabel="Display Meeting Widget"
        >
          Display Meeting Widget
        </Button>
        <Button disabled={!displayWidget} onClick={handleHideMeetingWidget} ariaLabel="Remove Meeting Widget">
          Remove Meeting Widget
        </Button>
        <div className="webex-theme-selector">Theme</div>
        <Select defaultValue="Dark" onSelect={handleChangeTheme}>
          <SelectOption value="dark" label="Dark" />
          <SelectOption value="light" label="Light" />
        </Select>
      </form>
      {token && destination && displayWidget && (
        <WebexMeetingWidget
          accessToken={token}
          meetingDestination={destination}
          className={`webex-meeting-widget-demo fluid-height wxc-theme-${theme}`}
        />
      )}
    </React.Fragment>
  );
}

WebexMeetingWidgetDemo.propTypes = {
  token: PropTypes.string,
};

WebexMeetingWidgetDemo.defaultProps = {
  token: '',
};
