import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {Button, Input, Select, SelectOption} from '@momentum-ui/react';
import './WebexMeetingsWidgetDemo.scss';

import {WebexMeetingsWidget} from '../src';

export default function WebexMeetingsWidgetDemo({token}) {
  const [destination, setDestination] = useState('');
  const [displayWidget, setDisplayWidget] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [layout, setLayout] = useState('Grid');

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

  const handleChangeLayout = (selectedOptions) => {
    const selectedLayout = selectedOptions[0].value;
    setLayout(selectedLayout);
  }

  return (
    <React.Fragment>
      <h3>Webex Meetings Widget</h3>
      <h5>The Webex Meetings Widget allows you to create and join Webex meetings in your browser.</h5>
      <form className="webex-form">
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
        <div className="webex-select-control">Theme</div>
        <Select defaultValue="Dark" onSelect={handleChangeTheme}>
          <SelectOption value="dark" label="Dark" />
          <SelectOption value="light" label="Light" />
        </Select>
        <div className="webex-select-control">Layout</div>
        <Select defaultValue="Grid" onSelect={handleChangeLayout}>
          <SelectOption value="Overlay" label="Overlay" />
          <SelectOption value="Grid" label="Grid" />
          <SelectOption value="Stack" label="Stack" />
          <SelectOption value="Prominent" label="Prominent" />
          <SelectOption value="Focus" label="Focus" />
        </Select>
      </form>
      {token && destination && displayWidget && (
        <WebexMeetingsWidget
          accessToken={token}
          meetingDestination={destination}
          className={`webex-meeting-widget-demo wxc-theme-${theme}`}
          layout={layout}
        />
      )}
    </React.Fragment>
  );
}

WebexMeetingsWidgetDemo.propTypes = {
  token: PropTypes.string,
};

WebexMeetingsWidgetDemo.defaultProps = {
  token: '',
};
